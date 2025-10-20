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

        if (especie) { paramCount++; whereConditions.push(`e.especieanimal = $${paramCount}`); params.push(especie); }
        if (pelaje) { paramCount++; whereConditions.push(`a.pelaje = $${paramCount}`); params.push(pelaje); }
        if (tamaño) { paramCount++; whereConditions.push(`a.tamaño = $${paramCount}`); params.push(tamaño); }
        if (genero) { paramCount++; whereConditions.push(`a.generoanimal = $${paramCount}`); params.push(genero); }
        if (edad) { paramCount++; whereConditions.push(`a.edadmesesanimal <= $${paramCount}`); params.push(parseInt(edad)); }

        // Excluir animales ya adoptados
        whereConditions.push(`a.idanimal NOT IN (SELECT idanimal FROM adopcion WHERE estadoadopcion = 'Aprobada')`);
        const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const sql = `
            SELECT a.idanimal, a.nombreanimal, a.edadmesesanimal, a.generoanimal,
                   a.pesoanimal, a.pelaje, a.tamaño, r.razaanimal, e.especieanimal, g.imagen as imagenAnimal
            FROM animal a
            JOIN raza r ON a.idraza = r.idraza
            JOIN especie e ON r.idespecie = e.idespecie
            LEFT JOIN galeria g ON a.idanimal = g.idanimal
            ${whereClause}
            ORDER BY a.idanimal DESC
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
            SELECT a.idanimal, a.nombreanimal, a.edadmesesanimal, a.generoanimal,
                   a.pesoanimal, a.pelaje, a.tamaño, r.razaanimal, e.especieanimal, g.imagen as imagenAnimal
            FROM animal a
            JOIN raza r ON a.idraza = r.idraza
            JOIN especie e ON r.idespecie = e.idespecie
            LEFT JOIN galeria g ON a.idanimal = g.idanimal
            WHERE a.idanimal = $1
            LIMIT 1
        `, [id]);

        if (!animalResult.rows.length) return res.status(404).json({ message: 'Animal no encontrado' });

        const animal = animalResult.rows[0];
        const historialResult = await query(`
            SELECT idhistorial, pesohistorial, fechahistorial, horahistorial, descripcionhisto
            FROM historial_animal
            WHERE idanimal = $1
            ORDER BY fechahistorial DESC, horahistorial DESC
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
            SELECT idanimal, nombreanimal
            FROM animal
            WHERE idanimal = $1
              AND idanimal NOT IN (SELECT idanimal FROM adopcion WHERE estadoadopcion = 'Aprobada')
        `, [idAnimal]);

        if (!animalResult.rows.length) return res.status(400).json({ message: 'Animal no disponible para adopción' });

        const existingAdoption = await query(`
            SELECT idadopcion FROM adopcion
            WHERE idpersona = $1 AND idanimal = $2 AND estadoadopcion = 'Pendiente'
        `, [idUsuario, idAnimal]);

        if (existingAdoption.rows.length) return res.status(400).json({ message: 'Ya tienes una solicitud pendiente para este animal' });

        const result = await query(`
            INSERT INTO adopcion (idpersona, idanimal, f_adopcion, estadoadopcion)
            VALUES ($1, $2, CURRENT_DATE, 'Pendiente')
            RETURNING idadopcion
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

        let especieResult = await query('SELECT idespecie FROM especie WHERE especieanimal = $1', [especie]);
        let idEspecie = especieResult.rows.length ? especieResult.rows[0].idespecie :
            (await query('INSERT INTO especie (especieanimal) VALUES ($1) RETURNING idespecie', [especie])).rows[0].idespecie;

        let razaResult = await query('SELECT idraza FROM raza WHERE razaanimal = $1 AND idespecie = $2', [raza, idEspecie]);
        let idRaza = razaResult.rows.length ? razaResult.rows[0].idraza :
            (await query('INSERT INTO raza (idespecie, razaanimal) VALUES ($1, $2) RETURNING idraza', [idEspecie, raza])).rows[0].idraza;

        const animalResult = await query(`
            INSERT INTO animal (nombreanimal, edadmesesanimal, generoanimal, pesoanimal, pelaje, tamaño, idraza)
            VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING idanimal
        `, [nombreAnimal, parseInt(edadMeses), genero, peso ? parseFloat(peso) : null, pelaje || null, tamaño || null, idRaza]);

        const idAnimal = animalResult.rows[0].idanimal;

        const historialResult = await query(`
            INSERT INTO historial_animal (idanimal, pesohistorial, fechahistorial, horahistorial, descripcionhisto)
            VALUES ($1,$2,CURRENT_DATE,CURRENT_TIME,$3) RETURNING idhistorial
        `, [idAnimal, peso ? parseFloat(peso) : null, descripcion || 'Registro inicial del animal']);

        await query('INSERT INTO galeria (idanimal, imagen) VALUES ($1,$2)', [idAnimal, req.file.filename]);

        res.status(201).json({ message: 'Animal agregado exitosamente', data: { idAnimal, nombreAnimal, imagen: req.file.filename } });

    } catch (error) {
        console.error('Error agregando animal:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;

