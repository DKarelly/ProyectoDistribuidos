const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('./auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configuración de multer para subir imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../files');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, 'animal-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Solo se permiten archivos de imagen'), false);
    }
});

// GET /api/animals/disponibles
router.get('/disponibles', async (req, res) => {
    try {
        const { especie, pelaje, tamaño, genero, edad } = req.query;
        let whereConditions = [];
        let params = [];
        let paramCount = 0;

        if (especie) { paramCount++; whereConditions.push(`e.especieAnimal = $${paramCount}`); params.push(especie); }
        if (pelaje) { paramCount++; whereConditions.push(`a.pelaje = $${paramCount}`); params.push(pelaje); }
        if (tamaño) { paramCount++; whereConditions.push(`a.tamaño = $${paramCount}`); params.push(tamaño); }
        if (genero) { paramCount++; whereConditions.push(`a.generoAnimal = $${paramCount}`); params.push(genero); }
        if (edad) { paramCount++; whereConditions.push(`a.edadMesesAnimal <= $${paramCount}`); params.push(parseInt(edad)); }

        // Excluir animales ya adoptados
        whereConditions.push(`a.idAnimal NOT IN (SELECT idAnimal FROM adopcion WHERE estadoAdopcion = 'Aprobada')`);
        const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const sql = `
            SELECT a.idAnimal, a.nombreAnimal, a.edadMesesAnimal, a.generoAnimal,
                   a.pesoAnimal, a.pelaje, a.tamaño, r.razaAnimal, e.especieAnimal, g.imagen as imagenAnimal
            FROM animal a
            JOIN raza r ON a.idRaza = r.idRaza
            JOIN especie e ON r.idEspecie = e.idEspecie
            LEFT JOIN historial_animal ha ON a.idAnimal = ha.idAnimal
            LEFT JOIN galeria g ON ha.idHistorial = g.idHistorial
            ${whereClause}
            ORDER BY a.idAnimal DESC
        `;
        const result = await query(sql, params);
        res.json({ message: 'Animales disponibles obtenidos exitosamente', data: result.rows });
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
            SELECT a.idAnimal, a.nombreAnimal, a.edadMesesAnimal, a.generoAnimal,
                   a.pesoAnimal, a.pelaje, a.tamaño, r.razaAnimal, e.especieAnimal, g.imagen as imagenAnimal
            FROM animal a
            JOIN raza r ON a.idRaza = r.idRaza
            JOIN especie e ON r.idEspecie = e.idEspecie
            LEFT JOIN historial_animal ha ON a.idAnimal = ha.idAnimal
            LEFT JOIN galeria g ON ha.idHistorial = g.idHistorial
            WHERE a.idAnimal = $1
            LIMIT 1
        `, [id]);

        if (!animalResult.rows.length) return res.status(404).json({ message: 'Animal no encontrado' });

        const animal = animalResult.rows[0];
        const historialResult = await query(`
            SELECT idHistorial, pesoHistorial, fechaHistorial, horaHistorial, descripcionHistorial
            FROM historial_animal
            WHERE idAnimal = $1
            ORDER BY fechaHistorial DESC, horaHistorial DESC
        `, [id]);

        animal.historial = historialResult.rows;
        res.json({ message: 'Animal obtenido exitosamente', data: animal });
    } catch (error) {
        console.error('Error obteniendo animal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/animals/adoptar
router.post('/adoptar', authenticateToken, async (req, res) => {
    try {
        const { idAnimal } = req.body;
        const idUsuario = req.user.idusuario; // Coincide con el JWT

        if (!idAnimal) return res.status(400).json({ message: 'ID del animal es requerido' });

        const animalResult = await query(`
            SELECT idAnimal, nombreAnimal
            FROM animal
            WHERE idAnimal = $1
              AND idAnimal NOT IN (SELECT idAnimal FROM adopcion WHERE estadoAdopcion = 'Aprobada')
        `, [idAnimal]);

        if (!animalResult.rows.length) return res.status(400).json({ message: 'Animal no disponible para adopción' });

        const existingAdoption = await query(`
            SELECT idAdopcion FROM adopcion
            WHERE idUsuario = $1 AND idAnimal = $2 AND estadoAdopcion = 'Pendiente'
        `, [idUsuario, idAnimal]);

        if (existingAdoption.rows.length) return res.status(400).json({ message: 'Ya tienes una solicitud pendiente para este animal' });

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

// POST /api/animals/agregar
router.post('/agregar', upload.single('imagenAnimal'), async (req, res) => {
    try {
        const { nombreAnimal, especie, raza, edadMeses, genero, peso, pelaje, tamaño, descripcion } = req.body;
        if (!nombreAnimal || !especie || !raza || !edadMeses || !genero)
            return res.status(400).json({ message: 'Los campos obligatorios son: nombre, especie, raza, edad y género' });
        if (!req.file) return res.status(400).json({ message: 'La imagen es obligatoria' });

        let especieResult = await query('SELECT idEspecie FROM especie WHERE especieAnimal = $1', [especie]);
        let idEspecie = especieResult.rows.length ? especieResult.rows[0].idespecie :
            (await query('INSERT INTO especie (especieAnimal) VALUES ($1) RETURNING idEspecie', [especie])).rows[0].idespecie;

        let razaResult = await query('SELECT idRaza FROM raza WHERE razaAnimal = $1 AND idEspecie = $2', [raza, idEspecie]);
        let idRaza = razaResult.rows.length ? razaResult.rows[0].idraza :
            (await query('INSERT INTO raza (idEspecie, razaAnimal) VALUES ($1, $2) RETURNING idRaza', [idEspecie, raza])).rows[0].idraza;

        const animalResult = await query(`
            INSERT INTO animal (nombreAnimal, edadMesesAnimal, generoAnimal, pesoAnimal, pelaje, tamaño, idRaza)
            VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING idAnimal
        `, [nombreAnimal, parseInt(edadMeses), genero, peso ? parseFloat(peso) : null, pelaje || null, tamaño || null, idRaza]);

        const idAnimal = animalResult.rows[0].idanimal;

        const historialResult = await query(`
            INSERT INTO historial_animal (idAnimal, pesoHistorial, fechaHistorial, horaHistorial, descripcionHistorial)
            VALUES ($1,$2,CURRENT_DATE,CURRENT_TIME,$3) RETURNING idHistorial
        `, [idAnimal, peso ? parseFloat(peso) : null, descripcion || 'Registro inicial del animal']);

        await query('INSERT INTO galeria (idHistorial, imagen) VALUES ($1,$2)', [historialResult.rows[0].idhistorial, req.file.filename]);

        res.status(201).json({ message: 'Animal agregado exitosamente', data: { idAnimal, nombreAnimal, imagen: req.file.filename } });

    } catch (error) {
        console.error('Error agregando animal:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;

