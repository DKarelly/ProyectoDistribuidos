const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('./auth');
const router = express.Router();

// GET /api/donations/historial
router.get('/historial', async (req, res) => {
    try {
        const { categoria, fecha } = req.query;
        
        let whereConditions = [];
        let params = [];
        let paramCount = 0;

        if (categoria) {
            paramCount++;
            whereConditions.push(`cd.categoria = $${paramCount}`);
            params.push(categoria);
        }

        if (fecha) {
            paramCount++;
            whereConditions.push(`d.fechaDonacion = $${paramCount}`);
            params.push(fecha);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const sql = `
            SELECT 
                dd.idDetalleDonacion,
                dd.cantidadDonacion,
                dd.detalleDonacion,
                cd.categoria,
                d.fechaDonacion,
                u.aliasUsuario
            FROM detalle_donacion dd
            JOIN donacion d ON dd.idDonacion = d.idDonacion
            JOIN categoria_donacion cd ON dd.idCategoria = cd.idCategoria
            JOIN usuario u ON d.idUsuario = u.idUsuario
            ${whereClause}
            ORDER BY d.fechaDonacion DESC, d.horaDonacion DESC
        `;

        const result = await query(sql, params);

        res.json({
            message: 'Historial de donaciones obtenido exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo historial de donaciones:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/donations/crear
router.post('/crear', authenticateToken, async (req, res) => {
    try {
        const { donaciones } = req.body;
        const idUsuario = req.user.idUsuario;

        if (!donaciones || !Array.isArray(donaciones) || donaciones.length === 0) {
            return res.status(400).json({ message: 'Se requiere al menos una donación' });
        }

        // Verificar que todas las categorías existen
        for (const donacion of donaciones) {
            const categoriaResult = await query(
                'SELECT idCategoria FROM categoria_donacion WHERE idCategoria = $1',
                [donacion.idCategoria]
            );
            
            if (categoriaResult.rows.length === 0) {
                return res.status(400).json({ 
                    message: `Categoría con ID ${donacion.idCategoria} no encontrada` 
                });
            }
        }

        // Crear donación principal
        const donacionResult = await query(`
            INSERT INTO donacion (idUsuario, fechaDonacion, horaDonacion)
            VALUES ($1, CURRENT_DATE, CURRENT_TIME)
            RETURNING idDonacion
        `, [idUsuario]);

        const idDonacion = donacionResult.rows[0].iddonacion;

        // Crear detalles de donación
        const detallesPromises = donaciones.map(donacion => 
            query(`
                INSERT INTO detalle_donacion (idDonacion, idCategoria, cantidadDonacion, detalleDonacion)
                VALUES ($1, $2, $3, $4)
                RETURNING idDetalleDonacion
            `, [idDonacion, donacion.idCategoria, donacion.cantidadDonacion, donacion.detalleDonacion])
        );

        await Promise.all(detallesPromises);

        res.status(201).json({
            message: 'Donación creada exitosamente',
            data: {
                idDonacion,
                fechaDonacion: new Date().toISOString().split('T')[0],
                cantidadDetalles: donaciones.length
            }
        });

    } catch (error) {
        console.error('Error creando donación:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/donations/economica
router.post('/economica', authenticateToken, async (req, res) => {
    try {
        const { monto, metodoPago, mensaje } = req.body;
        const idUsuario = req.user.idUsuario;

        if (!monto || monto <= 0) {
            return res.status(400).json({ message: 'Monto válido requerido' });
        }

        // Buscar o crear categoría "Efectivo"
        let categoriaResult = await query(
            'SELECT idCategoria FROM categoria_donacion WHERE categoria = $1',
            ['Efectivo']
        );

        let idCategoria;
        if (categoriaResult.rows.length === 0) {
            const newCategoriaResult = await query(
                'INSERT INTO categoria_donacion (categoria) VALUES ($1) RETURNING idCategoria',
                ['Efectivo']
            );
            idCategoria = newCategoriaResult.rows[0].idcategoria;
        } else {
            idCategoria = categoriaResult.rows[0].idcategoria;
        }

        // Crear donación económica
        const donacionResult = await query(`
            INSERT INTO donacion (idUsuario, fechaDonacion, horaDonacion)
            VALUES ($1, CURRENT_DATE, CURRENT_TIME)
            RETURNING idDonacion
        `, [idUsuario]);

        const idDonacion = donacionResult.rows[0].iddonacion;

        const detalleResult = await query(`
            INSERT INTO detalle_donacion (idDonacion, idCategoria, cantidadDonacion, detalleDonacion)
            VALUES ($1, $2, $3, $4)
            RETURNING idDetalleDonacion
        `, [idDonacion, idCategoria, monto, mensaje || `Donación económica vía ${metodoPago || 'transferencia'}`]);

        res.status(201).json({
            message: 'Donación económica registrada exitosamente',
            data: {
                idDonacion,
                idDetalleDonacion: detalleResult.rows[0].iddetalledonacion,
                monto,
                fechaDonacion: new Date().toISOString().split('T')[0]
            }
        });

    } catch (error) {
        console.error('Error creando donación económica:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/donations/categorias
router.get('/categorias', async (req, res) => {
    try {
        const result = await query('SELECT * FROM categoria_donacion ORDER BY categoria');
        
        res.json({
            message: 'Categorías obtenidas exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo categorías:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;

