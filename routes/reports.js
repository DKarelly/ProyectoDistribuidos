const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('./auth');
const router = express.Router();

// POST /api/reports/crear
router.post('/crear', authenticateToken, async (req, res) => {
    try {
        const { tipocaso, descripcioncom, direccion, idanimal } = req.body;
        const idUsuario = req.user.idusuario;

        if (!tipocaso || !descripcioncom || !direccion) {
            return res.status(400).json({ 
                message: 'Los campos tipo de caso, descripción y dirección son requeridos' 
            });
        }

        // Crear el caso animal en la base de datos
        const result = await query(`
            INSERT INTO caso_animal (tipocaso, descripcioncom, direccion, f_entrada, idanimal, idusuario)
            VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)
            RETURNING idcaso
        `, [tipocaso, descripcioncom, direccion, idanimal || null, idUsuario]);

        const idCaso = result.rows[0].idcaso;

        res.status(201).json({
            message: 'Reporte creado exitosamente',
            data: {
                idCaso,
                codigoReporte: `REP-${idCaso}-${Date.now()}`,
                fechaReporte: new Date().toISOString(),
                estado: 'Recibido'
            }
        });

    } catch (error) {
        console.error('Error creando reporte:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/reports/lista
router.get('/lista', authenticateToken, async (req, res) => {
    try {
        const { tipocaso, fecha } = req.query;
        
        let whereConditions = [];
        let params = [];
        let paramCount = 0;

        if (tipocaso) {
            paramCount++;
            whereConditions.push(`ca.tipocaso = $${paramCount}`);
            params.push(tipocaso);
        }

        if (fecha) {
            paramCount++;
            whereConditions.push(`ca.f_entrada = $${paramCount}`);
            params.push(fecha);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const sql = `
            SELECT 
                ca.idcaso,
                ca.tipocaso,
                ca.descripcioncom,
                ca.direccion,
                ca.f_entrada,
                u.aliasusuario,
                a.nombreanimal,
                r.razaanimal,
                e.especieanimal
            FROM caso_animal ca
            LEFT JOIN usuario u ON ca.idusuario = u.idusuario
            LEFT JOIN animal a ON ca.idanimal = a.idanimal
            LEFT JOIN raza r ON a.idraza = r.idraza
            LEFT JOIN especie e ON r.idespecie = e.idespecie
            ${whereClause}
            ORDER BY ca.f_entrada DESC
        `;

        const result = await query(sql, params);

        res.json({
            message: 'Lista de reportes obtenida exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo lista de reportes:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/reports/:id
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT 
                ca.idcaso,
                ca.tipocaso,
                ca.descripcioncom,
                ca.direccion,
                ca.f_entrada,
                u.aliasusuario,
                u.correousuario,
                a.nombreanimal,
                a.edadmesesanimal,
                a.generoanimal,
                r.razaanimal,
                e.especieanimal
            FROM caso_animal ca
            LEFT JOIN usuario u ON ca.idusuario = u.idusuario
            LEFT JOIN animal a ON ca.idanimal = a.idanimal
            LEFT JOIN raza r ON a.idraza = r.idraza
            LEFT JOIN especie e ON r.idespecie = e.idespecie
            WHERE ca.idcaso = $1
        `, [id]);

        if (!result.rows.length) {
            return res.status(404).json({ 
                message: 'Reporte no encontrado',
                data: null
            });
        }

        res.json({
            message: 'Reporte obtenido exitosamente',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error obteniendo reporte:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;

