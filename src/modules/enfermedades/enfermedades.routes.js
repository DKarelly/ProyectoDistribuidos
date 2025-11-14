const express = require('express');
const { query } = require('../../config/database');
const { authenticateToken } = require('../auth/auth.routes');

const router = express.Router();

// =========================
// CRUD Tipo Enfermedad
// =========================

// GET /api/enfermedades/tipos - Obtener todos los tipos de enfermedad con paginación
router.get('/tipos', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Obtener total de registros
        const totalResult = await query('SELECT COUNT(*) as total FROM tipo_enfermedad');
        const total = parseInt(totalResult.rows[0].total);

        // Obtener registros paginados
        const result = await query('SELECT * FROM tipo_enfermedad ORDER BY idtipoenfermedad LIMIT $1 OFFSET $2', [limit, offset]);

        res.json({
            message: 'Tipos de enfermedad obtenidos exitosamente',
            data: result.rows,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Error obteniendo tipos de enfermedad:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/enfermedades/tipos - Crear nuevo tipo de enfermedad
router.post('/tipos', authenticateToken, async (req, res) => {
    try {
        const { tipoenfermedad } = req.body;

        if (!tipoenfermedad || !tipoenfermedad.trim()) {
            return res.status(400).json({ message: 'El nombre del tipo de enfermedad es requerido' });
        }

        // Validar unicidad case insensitive
        const existing = await query('SELECT idtipoenfermedad FROM tipo_enfermedad WHERE LOWER(tipoenfermedad) = LOWER($1)', [tipoenfermedad.trim()]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Ya existe un tipo de enfermedad con ese nombre' });
        }

        const result = await query('INSERT INTO tipo_enfermedad (tipoenfermedad) VALUES ($1) RETURNING *', [tipoenfermedad.trim()]);
        res.status(201).json({ message: 'Tipo de enfermedad creado exitosamente', data: result.rows[0] });
    } catch (error) {
        console.error('Error creando tipo de enfermedad:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/enfermedades/tipos/:id - Actualizar tipo de enfermedad
router.put('/tipos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tipoenfermedad } = req.body;

        if (!tipoenfermedad || !tipoenfermedad.trim()) {
            return res.status(400).json({ message: 'El nombre del tipo de enfermedad es requerido' });
        }

        // Validar unicidad case insensitive, excluyendo el actual
        const existing = await query('SELECT idtipoenfermedad FROM tipo_enfermedad WHERE LOWER(tipoenfermedad) = LOWER($1) AND idtipoenfermedad != $2', [tipoenfermedad.trim(), id]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Ya existe un tipo de enfermedad con ese nombre' });
        }

        const result = await query('UPDATE tipo_enfermedad SET tipoenfermedad = $1 WHERE idtipoenfermedad = $2 RETURNING *', [tipoenfermedad.trim(), id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Tipo de enfermedad no encontrado' });
        }
        res.json({ message: 'Tipo de enfermedad actualizado exitosamente', data: result.rows[0] });
    } catch (error) {
        console.error('Error actualizando tipo de enfermedad:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// DELETE /api/enfermedades/tipos/:id - Eliminar tipo de enfermedad
router.delete('/tipos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si hay enfermedades asociadas
        const enfermedadesAsociadas = await query('SELECT COUNT(*) as count FROM enfermedad WHERE idtipoenfermedad = $1', [id]);
        if (parseInt(enfermedadesAsociadas.rows[0].count) > 0) {
            return res.status(400).json({ message: 'No se puede eliminar el tipo de enfermedad porque tiene enfermedades asociadas' });
        }

        const result = await query('DELETE FROM tipo_enfermedad WHERE idtipoenfermedad = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Tipo de enfermedad no encontrado' });
        }
        res.json({ message: 'Tipo de enfermedad eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando tipo de enfermedad:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/enfermedades/tipos/validar - Validar unicidad de tipo
router.get('/tipos/validar', authenticateToken, async (req, res) => {
    try {
        const { nombre, exclude } = req.query;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ message: 'El nombre es requerido' });
        }

        let queryStr = 'SELECT idtipoenfermedad FROM tipo_enfermedad WHERE LOWER(tipoenfermedad) = LOWER($1)';
        let params = [nombre.trim()];

        if (exclude) {
            queryStr += ' AND idtipoenfermedad != $2';
            params.push(exclude);
        }

        const result = await query(queryStr, params);
        res.json({ valido: result.rows.length === 0 });
    } catch (error) {
        console.error('Error validando tipo:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// =========================
// CRUD Enfermedad
// =========================

// GET /api/enfermedades - Obtener todas las enfermedades con su tipo con paginación
router.get('/', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Obtener total de registros
        const totalResult = await query('SELECT COUNT(*) as total FROM enfermedad');
        const total = parseInt(totalResult.rows[0].total);

        // Obtener registros paginados
        const result = await query(`
            SELECT e.idenfermedad, e.nombenfermedad, e.idtipoenfermedad, t.tipoenfermedad
            FROM enfermedad e
            JOIN tipo_enfermedad t ON e.idtipoenfermedad = t.idtipoenfermedad
            ORDER BY e.idenfermedad
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        res.json({
            message: 'Enfermedades obtenidas exitosamente',
            data: result.rows,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Error obteniendo enfermedades:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/enfermedades - Crear nueva enfermedad
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { nombenfermedad, idtipoenfermedad } = req.body;

        if (!nombenfermedad || !nombenfermedad.trim()) {
            return res.status(400).json({ message: 'El nombre de la enfermedad es requerido' });
        }

        if (!idtipoenfermedad) {
            return res.status(400).json({ message: 'El tipo de enfermedad es requerido' });
        }

        // Validar unicidad case insensitive
        const existing = await query('SELECT idenfermedad FROM enfermedad WHERE LOWER(nombenfermedad) = LOWER($1)', [nombenfermedad.trim()]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Ya existe una enfermedad con ese nombre' });
        }

        // Verificar que el tipo existe
        const tipoExists = await query('SELECT idtipoenfermedad FROM tipo_enfermedad WHERE idtipoenfermedad = $1', [idtipoenfermedad]);
        if (tipoExists.rows.length === 0) {
            return res.status(400).json({ message: 'El tipo de enfermedad seleccionado no existe' });
        }

        const result = await query('INSERT INTO enfermedad (nombenfermedad, idtipoenfermedad) VALUES ($1, $2) RETURNING *', [nombenfermedad.trim(), idtipoenfermedad]);
        res.status(201).json({ message: 'Enfermedad creada exitosamente', data: result.rows[0] });
    } catch (error) {
        console.error('Error creando enfermedad:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/enfermedades/:id - Actualizar enfermedad
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombenfermedad, idtipoenfermedad } = req.body;

        if (!nombenfermedad || !nombenfermedad.trim()) {
            return res.status(400).json({ message: 'El nombre de la enfermedad es requerido' });
        }

        if (!idtipoenfermedad) {
            return res.status(400).json({ message: 'El tipo de enfermedad es requerido' });
        }

        // Validar unicidad case insensitive, excluyendo el actual
        const existing = await query('SELECT idenfermedad FROM enfermedad WHERE LOWER(nombenfermedad) = LOWER($1) AND idenfermedad != $2', [nombenfermedad.trim(), id]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Ya existe una enfermedad con ese nombre' });
        }

        // Verificar que el tipo existe
        const tipoExists = await query('SELECT idtipoenfermedad FROM tipo_enfermedad WHERE idtipoenfermedad = $1', [idtipoenfermedad]);
        if (tipoExists.rows.length === 0) {
            return res.status(400).json({ message: 'El tipo de enfermedad seleccionado no existe' });
        }

        const result = await query('UPDATE enfermedad SET nombenfermedad = $1, idtipoenfermedad = $2 WHERE idenfermedad = $3 RETURNING *', [nombenfermedad.trim(), idtipoenfermedad, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Enfermedad no encontrada' });
        }
        res.json({ message: 'Enfermedad actualizada exitosamente', data: result.rows[0] });
    } catch (error) {
        console.error('Error actualizando enfermedad:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// DELETE /api/enfermedades/:id - Eliminar enfermedad
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si la enfermedad está siendo usada en detalle_enfermedad
        const usada = await query('SELECT COUNT(*) as count FROM detalle_enfermedad WHERE idenfermedad = $1', [id]);
        if (parseInt(usada.rows[0].count) > 0) {
            return res.status(400).json({ message: 'No se puede eliminar la enfermedad porque está asociada a historiales médicos' });
        }

        const result = await query('DELETE FROM enfermedad WHERE idenfermedad = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Enfermedad no encontrada' });
        }
        res.json({ message: 'Enfermedad eliminada exitosamente' });
    } catch (error) {
        console.error('Error eliminando enfermedad:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/enfermedades/validar - Validar unicidad de enfermedad
router.get('/validar', authenticateToken, async (req, res) => {
    try {
        const { nombre, exclude } = req.query;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ message: 'El nombre es requerido' });
        }

        let queryStr = 'SELECT idenfermedad FROM enfermedad WHERE LOWER(nombenfermedad) = LOWER($1)';
        let params = [nombre.trim()];

        if (exclude) {
            queryStr += ' AND idenfermedad != $2';
            params.push(exclude);
        }

        const result = await query(queryStr, params);
        res.json({ valido: result.rows.length === 0 });
    } catch (error) {
        console.error('Error validando enfermedad:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;
