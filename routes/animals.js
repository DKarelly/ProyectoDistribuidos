const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('./auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../files');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generar nombre único para el archivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'animal-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'), false);
        }
    }
});

// GET /api/animals/disponibles
router.get('/disponibles', async (req, res) => {
    try {
        const { especie, pelaje, tamaño, genero, edad } = req.query;
        
        let whereConditions = [];
        let params = [];
        let paramCount = 0;

        // Construir condiciones WHERE dinámicamente
        if (especie) {
            paramCount++;
            whereConditions.push(`e.especieAnimal = $${paramCount}`);
            params.push(especie);
        }

        if (pelaje) {
            paramCount++;
            whereConditions.push(`a.pelaje = $${paramCount}`);
            params.push(pelaje);
        }

        if (tamaño) {
            paramCount++;
            whereConditions.push(`a.tamaño = $${paramCount}`);
            params.push(tamaño);
        }

        if (genero) {
            paramCount++;
            whereConditions.push(`a.generoAnimal = $${paramCount}`);
            params.push(genero);
        }

        if (edad) {
            paramCount++;
            whereConditions.push(`a.edadMesesAnimal <= $${paramCount}`);
            params.push(parseInt(edad));
        }

        // Verificar que no esté ya adoptado
        whereConditions.push(`a.idAnimal NOT IN (SELECT idAnimal FROM adopcion WHERE estadoAdopcion = 'Aprobada')`);

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const sql = `
            SELECT 
                a.idAnimal,
                a.nombreAnimal,
                a.edadMesesAnimal,
                a.generoAnimal,
                a.pesoAnimal,
                a.pelaje,
                a.tamaño,
                r.razaAnimal,
                e.especieAnimal,
                g.imagen as imagenAnimal
            FROM animal a
            JOIN raza r ON a.idRaza = r.idRaza
            JOIN especie e ON r.idEspecie = e.idEspecie
            LEFT JOIN historial_animal ha ON a.idAnimal = ha.idAnimal
            LEFT JOIN galeria g ON ha.idHistorial = g.idHistorial
            ${whereClause}
            ORDER BY a.idAnimal DESC
        `;

        const result = await query(sql, params);

        res.json({
            message: 'Animales disponibles obtenidos exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo animales:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/animals/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const animalResult = await query(`
            SELECT 
                a.idAnimal,
                a.nombreAnimal,
                a.edadMesesAnimal,
                a.generoAnimal,
                a.pesoAnimal,
                a.pelaje,
                a.tamaño,
                r.razaAnimal,
                e.especieAnimal,
                g.imagen as imagenAnimal
            FROM animal a
            JOIN raza r ON a.idRaza = r.idRaza
            JOIN especie e ON r.idEspecie = e.idEspecie
            LEFT JOIN historial_animal ha ON a.idAnimal = ha.idAnimal
            LEFT JOIN galeria g ON ha.idHistorial = g.idHistorial
            WHERE a.idAnimal = $1
            LIMIT 1
        `, [id]);

        if (animalResult.rows.length === 0) {
            return res.status(404).json({ message: 'Animal no encontrado' });
        }

        const animal = animalResult.rows[0];

        // Obtener historial médico
        const historialResult = await query(`
            SELECT 
                ha.idHistorial,
                ha.pesoHistorial,
                ha.fechaHistorial,
                ha.horaHistorial,
                ha.descripcionHistorial
            FROM historial_animal ha
            WHERE ha.idAnimal = $1
            ORDER BY ha.fechaHistorial DESC, ha.horaHistorial DESC
        `, [id]);

        animal.historial = historialResult.rows;

        res.json({
            message: 'Animal obtenido exitosamente',
            data: animal
        });

    } catch (error) {
        console.error('Error obteniendo animal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/animals/adoptar
router.post('/adoptar', authenticateToken, async (req, res) => {
    try {
        const { idAnimal } = req.body;
        const idUsuario = req.user.idUsuario;

        if (!idAnimal) {
            return res.status(400).json({ message: 'ID del animal es requerido' });
        }

        // Verificar que el animal existe y está disponible
        const animalResult = await query(`
            SELECT a.idAnimal, a.nombreAnimal
            FROM animal a
            WHERE a.idAnimal = $1 
            AND a.idAnimal NOT IN (SELECT idAnimal FROM adopcion WHERE estadoAdopcion = 'Aprobada')
        `, [idAnimal]);

        if (animalResult.rows.length === 0) {
            return res.status(400).json({ message: 'Animal no disponible para adopción' });
        }

        // Verificar que el usuario no tenga ya una solicitud pendiente para este animal
        const existingAdoption = await query(`
            SELECT idAdopcion FROM adopcion 
            WHERE idUsuario = $1 AND idAnimal = $2 AND estadoAdopcion = 'Pendiente'
        `, [idUsuario, idAnimal]);

        if (existingAdoption.rows.length > 0) {
            return res.status(400).json({ message: 'Ya tienes una solicitud pendiente para este animal' });
        }

        // Crear solicitud de adopción
        const result = await query(`
            INSERT INTO adopcion (idUsuario, idAnimal, fechaAdopcion, horaAdopcion, estadoAdopcion)
            VALUES ($1, $2, CURRENT_DATE, CURRENT_TIME, 'Pendiente')
            RETURNING idAdopcion
        `, [idUsuario, idAnimal]);

        res.status(201).json({
            message: 'Solicitud de adopción creada exitosamente',
            data: {
                idAdopcion: result.rows[0].idadopcion,
                animal: animalResult.rows[0].nombreanimal,
                estado: 'Pendiente'
            }
        });

    } catch (error) {
        console.error('Error creando adopción:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/animals/filtros/opciones
router.get('/filtros/opciones', async (req, res) => {
    try {
        // Obtener especies
        const especiesResult = await query('SELECT DISTINCT especieAnimal FROM especie ORDER BY especieAnimal');
        
        // Obtener pelajes únicos
        const pelajesResult = await query('SELECT DISTINCT pelaje FROM animal WHERE pelaje IS NOT NULL ORDER BY pelaje');
        
        // Obtener tamaños únicos
        const tamañosResult = await query('SELECT DISTINCT tamaño FROM animal WHERE tamaño IS NOT NULL ORDER BY tamaño');
        
        // Obtener géneros únicos
        const generosResult = await query('SELECT DISTINCT generoAnimal FROM animal WHERE generoAnimal IS NOT NULL');
        
        // Obtener rangos de edad
        const edadesResult = await query('SELECT MIN(edadMesesAnimal) as min, MAX(edadMesesAnimal) as max FROM animal WHERE edadMesesAnimal IS NOT NULL');

        const generos = generosResult.rows.map(row => ({
            valor: row.generoanimal,
            nombre: row.generoanimal === 'M' ? 'Macho' : 'Hembra'
        }));

        // Crear rangos de edad
        const edades = [];
        if (edadesResult.rows[0].min !== null) {
            const min = edadesResult.rows[0].min;
            const max = edadesResult.rows[0].max;
            
            if (max <= 6) edades.push({ valor: '6', nombre: '6 meses o menos' });
            if (max > 6) edades.push({ valor: '12', nombre: '1 año o menos' });
            if (max > 12) edades.push({ valor: '24', nombre: '2 años o menos' });
            if (max > 24) edades.push({ valor: max.toString(), nombre: `${Math.ceil(max/12)} años o menos` });
        }

        res.json({
            message: 'Opciones de filtros obtenidas exitosamente',
            data: {
                especies: especiesResult.rows.map(row => row.especieanimal),
                pelajes: pelajesResult.rows.map(row => row.pelaje),
                tamaños: tamañosResult.rows.map(row => row.tamaño),
                generos,
                edades
            }
        });

    } catch (error) {
        console.error('Error obteniendo opciones de filtros:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/animals/agregar
router.post('/agregar', upload.single('imagenAnimal'), async (req, res) => {
    try {
        const {
            nombreAnimal,
            especie,
            raza,
            edadMeses,
            genero,
            peso,
            pelaje,
            tamaño,
            descripcion
        } = req.body;

        // Validaciones básicas
        if (!nombreAnimal || !especie || !raza || !edadMeses || !genero) {
            return res.status(400).json({ message: 'Los campos obligatorios son: nombre, especie, raza, edad y género' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'La imagen es obligatoria' });
        }

        // Verificar si la especie existe, si no, crearla
        let especieResult = await query('SELECT idEspecie FROM especie WHERE especieAnimal = $1', [especie]);
        let idEspecie;

        if (especieResult.rows.length === 0) {
            const nuevaEspecie = await query('INSERT INTO especie (especieAnimal) VALUES ($1) RETURNING idEspecie', [especie]);
            idEspecie = nuevaEspecie.rows[0].idespecie;
        } else {
            idEspecie = especieResult.rows[0].idespecie;
        }

        // Verificar si la raza existe, si no, crearla
        let razaResult = await query('SELECT idRaza FROM raza WHERE razaAnimal = $1 AND idEspecie = $2', [raza, idEspecie]);
        let idRaza;

        if (razaResult.rows.length === 0) {
            const nuevaRaza = await query('INSERT INTO raza (idEspecie, razaAnimal) VALUES ($1, $2) RETURNING idRaza', [idEspecie, raza]);
            idRaza = nuevaRaza.rows[0].idraza;
        } else {
            idRaza = razaResult.rows[0].idraza;
        }

        // Insertar el animal
        const animalResult = await query(`
            INSERT INTO animal (nombreAnimal, edadMesesAnimal, generoAnimal, pesoAnimal, pelaje, tamaño, idRaza)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING idAnimal
        `, [
            nombreAnimal,
            parseInt(edadMeses),
            genero,
            peso ? parseFloat(peso) : null,
            pelaje || null,
            tamaño || null,
            idRaza
        ]);

        const idAnimal = animalResult.rows[0].idanimal;

        // Crear registro de historial inicial
        const historialResult = await query(`
            INSERT INTO historial_animal (idAnimal, pesoHistorial, fechaHistorial, horaHistorial, descripcionHistorial)
            VALUES ($1, $2, CURRENT_DATE, CURRENT_TIME, $3)
            RETURNING idHistorial
        `, [
            idAnimal,
            peso ? parseFloat(peso) : null,
            descripcion || 'Registro inicial del animal'
        ]);

        const idHistorial = historialResult.rows[0].idhistorial;

        // Insertar la imagen en la galería
        await query(`
            INSERT INTO galeria (idHistorial, imagen)
            VALUES ($1, $2)
        `, [idHistorial, req.file.filename]);

        res.status(201).json({
            message: 'Animal agregado exitosamente',
            data: {
                idAnimal,
                nombreAnimal,
                imagen: req.file.filename
            }
        });

    } catch (error) {
        console.error('Error agregando animal:', error);
        
        // Si hay error, eliminar archivo subido
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error eliminando archivo:', unlinkError);
            }
        }

        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;

