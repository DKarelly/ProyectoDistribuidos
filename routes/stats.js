const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET /api/stats/animals - Estadísticas de animales
router.get('/animals', async (req, res) => {
    try {
        // Total de animales
        const totalResult = await query('SELECT COUNT(*) as total FROM animal');
        const total = parseInt(totalResult.rows[0].total);

        // Animales disponibles (no adoptados)
        const availableResult = await query(`
            SELECT COUNT(*) as available 
            FROM animal a 
            WHERE a.idanimal NOT IN (
                SELECT idanimal FROM adopcion WHERE estadoadopcion = 'Aprobada'
            )
        `);
        const available = parseInt(availableResult.rows[0].available);

        // Animales por especie
        const speciesResult = await query(`
            SELECT e.especieanimal, COUNT(*) as count
            FROM animal a
            JOIN raza r ON a.idraza = r.idraza
            JOIN especie e ON r.idespecie = e.idespecie
            GROUP BY e.especieanimal
            ORDER BY count DESC
        `);

        res.json({
            message: 'Estadísticas de animales obtenidas exitosamente',
            data: {
                total,
                available,
                bySpecies: speciesResult.rows
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de animales:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/stats/users - Estadísticas de usuarios
router.get('/users', async (req, res) => {
    try {
        // Total de usuarios
        const totalResult = await query('SELECT COUNT(*) as total FROM usuario');
        const total = parseInt(totalResult.rows[0].total);

        // Usuarios por rol
        const rolesResult = await query(`
            SELECT r.rolusuario, COUNT(*) as count
            FROM usuario u
            JOIN rol_usuario r ON u.idrol = r.idrol
            GROUP BY r.rolusuario
            ORDER BY count DESC
        `);

        res.json({
            message: 'Estadísticas de usuarios obtenidas exitosamente',
            data: {
                total,
                byRole: rolesResult.rows
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de usuarios:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/stats/adoptions - Estadísticas de adopciones
router.get('/adoptions', async (req, res) => {
    try {
        // Total de adopciones
        const totalResult = await query('SELECT COUNT(*) as total FROM adopcion');
        const total = parseInt(totalResult.rows[0].total);

        // Adopciones por estado
        const statusResult = await query(`
            SELECT estadoadopcion, COUNT(*) as count
            FROM adopcion
            GROUP BY estadoadopcion
            ORDER BY count DESC
        `);

        // Adopciones pendientes
        const pendingResult = await query(`
            SELECT COUNT(*) as pending 
            FROM adopcion 
            WHERE estadoadopcion = 'Pendiente'
        `);
        const pending = parseInt(pendingResult.rows[0].pending);

        res.json({
            message: 'Estadísticas de adopciones obtenidas exitosamente',
            data: {
                total,
                pending,
                byStatus: statusResult.rows
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de adopciones:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/stats/donations - Estadísticas de donaciones
router.get('/donations', async (req, res) => {
    try {
        // Total de donaciones
        const totalResult = await query('SELECT COUNT(*) as total FROM donacion');
        const total = parseInt(totalResult.rows[0].total);

        // Total de dinero donado
        const amountResult = await query(`
            SELECT SUM(cantidaddonacion) as totalAmount 
            FROM donacion 
            WHERE cantidaddonacion IS NOT NULL
        `);
        const totalAmount = parseFloat(amountResult.rows[0].totalAmount) || 0;

        res.json({
            message: 'Estadísticas de donaciones obtenidas exitosamente',
            data: {
                total,
                totalAmount
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de donaciones:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;
