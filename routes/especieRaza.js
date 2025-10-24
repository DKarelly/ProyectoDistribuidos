const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Middleware para verificar rol de administrador
function requireAdmin(req, res, next) {
    if (!req.user || req.user.idrol !== 1) {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    next();
}

// GET /api/especieRaza/especies - Obtener todas las especies (público para cargar combos)
router.get('/especies', async (req, res) => {
    try {
        const result = await query('SELECT idEspecie, especieAnimal FROM especie ORDER BY especieAnimal');
        res.json({ message: 'Especies obtenidas exitosamente', data: result.rows });
    } catch (error) {
        console.error('Error obteniendo especies:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/especieRaza/especies - Crear nueva especie
router.post('/especies', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { especieAnimal } = req.body;

        if (!especieAnimal || especieAnimal.trim() === '') {
            return res.status(400).json({ message: 'El nombre de la especie es requerido' });
        }

        // Verificar si ya existe
        const existing = await query('SELECT idEspecie FROM especie WHERE LOWER(especieAnimal) = LOWER($1)', [especieAnimal.trim()]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Esta especie ya existe' });
        }

        const result = await query(
            'INSERT INTO especie (especieAnimal) VALUES ($1) RETURNING idEspecie, especieAnimal',
            [especieAnimal.trim()]
        );

        res.status(201).json({
            message: 'Especie creada exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creando especie:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/especieRaza/especies/:id - Actualizar especie
router.put('/especies/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { especieAnimal } = req.body;

        if (!especieAnimal || especieAnimal.trim() === '') {
            return res.status(400).json({ message: 'El nombre de la especie es requerido' });
        }

        // Verificar si ya existe otra especie con el mismo nombre
        const existing = await query(
            'SELECT idEspecie FROM especie WHERE LOWER(especieAnimal) = LOWER($1) AND idEspecie != $2',
            [especieAnimal.trim(), id]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Ya existe otra especie con este nombre' });
        }

        const result = await query(
            'UPDATE especie SET especieAnimal = $1 WHERE idEspecie = $2 RETURNING idEspecie, especieAnimal',
            [especieAnimal.trim(), id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Especie no encontrada' });
        }

        res.json({
            message: 'Especie actualizada exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando especie:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// DELETE /api/especieRaza/especies/:id - Eliminar especie
router.delete('/especies/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si tiene razas asociadas
        const razasAsociadas = await query('SELECT COUNT(*) as count FROM raza WHERE idEspecie = $1', [id]);
        if (razasAsociadas.rows[0].count > 0) {
            return res.status(400).json({ message: 'No se puede eliminar la especie porque tiene razas asociadas' });
        }

        const result = await query('DELETE FROM especie WHERE idEspecie = $1 RETURNING idEspecie', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Especie no encontrada' });
        }

        res.json({ message: 'Especie eliminada exitosamente' });
    } catch (error) {
        console.error('Error eliminando especie:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/especieRaza/razas - Obtener todas las razas con sus especies (público para cargar combos)
router.get('/razas', async (req, res) => {
    try {
        const result = await query(`
            SELECT r.idRaza, r.razaAnimal, r.idEspecie, e.especieAnimal
            FROM raza r
            JOIN especie e ON r.idEspecie = e.idEspecie
            ORDER BY e.especieAnimal, r.razaAnimal
        `);
        res.json({ message: 'Razas obtenidas exitosamente', data: result.rows });
    } catch (error) {
        console.error('Error obteniendo razas:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/especieRaza/razas - Crear nueva raza
router.post('/razas', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { razaAnimal, idEspecie } = req.body;

        if (!razaAnimal || razaAnimal.trim() === '') {
            return res.status(400).json({ message: 'El nombre de la raza es requerido' });
        }

        if (!idEspecie) {
            return res.status(400).json({ message: 'La especie es requerida' });
        }

        // Verificar que la especie existe
        const especieExists = await query('SELECT idEspecie FROM especie WHERE idEspecie = $1', [idEspecie]);
        if (especieExists.rows.length === 0) {
            return res.status(400).json({ message: 'La especie seleccionada no existe' });
        }

        // Verificar si ya existe la raza para esta especie
        const existing = await query(
            'SELECT idRaza FROM raza WHERE LOWER(razaAnimal) = LOWER($1) AND idEspecie = $2',
            [razaAnimal.trim(), idEspecie]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Esta raza ya existe para la especie seleccionada' });
        }

        const result = await query(
            'INSERT INTO raza (razaAnimal, idEspecie) VALUES ($1, $2) RETURNING idRaza, razaAnimal, idEspecie',
            [razaAnimal.trim(), idEspecie]
        );

        res.status(201).json({
            message: 'Raza creada exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creando raza:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/especieRaza/razas/:id - Actualizar raza
router.put('/razas/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { razaAnimal, idEspecie } = req.body;

        if (!razaAnimal || razaAnimal.trim() === '') {
            return res.status(400).json({ message: 'El nombre de la raza es requerido' });
        }

        if (!idEspecie) {
            return res.status(400).json({ message: 'La especie es requerida' });
        }

        // Verificar que la especie existe
        const especieExists = await query('SELECT idEspecie FROM especie WHERE idEspecie = $1', [idEspecie]);
        if (especieExists.rows.length === 0) {
            return res.status(400).json({ message: 'La especie seleccionada no existe' });
        }

        // Verificar si ya existe otra raza con el mismo nombre para esta especie
        const existing = await query(
            'SELECT idRaza FROM raza WHERE LOWER(razaAnimal) = LOWER($1) AND idEspecie = $2 AND idRaza != $3',
            [razaAnimal.trim(), idEspecie, id]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Ya existe otra raza con este nombre para la especie seleccionada' });
        }

        const result = await query(
            'UPDATE raza SET razaAnimal = $1, idEspecie = $2 WHERE idRaza = $3 RETURNING idRaza, razaAnimal, idEspecie',
            [razaAnimal.trim(), idEspecie, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Raza no encontrada' });
        }

        res.json({
            message: 'Raza actualizada exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando raza:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// DELETE /api/especieRaza/razas/:id - Eliminar raza
router.delete('/razas/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si tiene animales asociados
        const animalesAsociados = await query('SELECT COUNT(*) as count FROM animal WHERE idRaza = $1', [id]);
        if (animalesAsociados.rows[0].count > 0) {
            return res.status(400).json({ message: 'No se puede eliminar la raza porque tiene animales asociados' });
        }

        const result = await query('DELETE FROM raza WHERE idRaza = $1 RETURNING idRaza', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Raza no encontrada' });
        }

        res.json({ message: 'Raza eliminada exitosamente' });
    } catch (error) {
        console.error('Error eliminando raza:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/especieRaza/opciones - Obtener opciones para selects
router.get('/opciones', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const especiesResult = await query('SELECT idEspecie, especieAnimal FROM especie ORDER BY especieAnimal');
        const especies = especiesResult.rows;

        res.json({
            message: 'Opciones obtenidas exitosamente',
            data: { especies }
        });
    } catch (error) {
        console.error('Error obteniendo opciones:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;
