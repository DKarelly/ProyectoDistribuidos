const express = require('express');
const { query } = require('../../config/database');
const { authenticateToken } = require('../auth/auth.routes');
const router = express.Router();

// GET /api/reporteAdmin/donaciones/categorias
router.get('/donaciones/categorias', authenticateToken, async (req, res) => {
    try {
        const { fechaDesde, fechaHasta } = req.query;

        let whereClause = '';
        let params = [];
        let paramCount = 0;

        if (fechaDesde && fechaHasta) {
            paramCount += 2;
            whereClause = `WHERE d.f_donacion BETWEEN $${paramCount - 1} AND $${paramCount}`;
            params.push(fechaDesde, fechaHasta);
        } else if (fechaDesde) {
            paramCount++;
            whereClause = `WHERE d.f_donacion >= $${paramCount}`;
            params.push(fechaDesde);
        } else if (fechaHasta) {
            paramCount++;
            whereClause = `WHERE d.f_donacion <= $${paramCount}`;
            params.push(fechaHasta);
        }

        const sql = `
            SELECT
                cd.nombcategoria as categoria,
                COUNT(dd.iddetalledonacion) as cantidad,
                SUM(dd.cantidaddonacion) as total_monto
            FROM detalle_donacion dd
            JOIN donacion d ON dd.iddonacion = d.iddonacion
            JOIN categoria_donacion cd ON dd.idcategoria = cd.idcategoria
            ${whereClause}
            GROUP BY cd.nombcategoria
            ORDER BY cantidad DESC
        `;

        const result = await query(sql, params);

        res.json({
            message: 'Datos de donaciones por categoría obtenidos exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo donaciones por categoría:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/reporteAdmin/donaciones/meses
router.get('/donaciones/meses', authenticateToken, async (req, res) => {
    try {
        const { fechaDesde, fechaHasta } = req.query;

        let whereClause = '';
        let params = [];
        let paramCount = 0;

        if (fechaDesde && fechaHasta) {
            paramCount += 2;
            whereClause = `WHERE d.f_donacion BETWEEN $${paramCount - 1} AND $${paramCount}`;
            params.push(fechaDesde, fechaHasta);
        } else if (fechaDesde) {
            paramCount++;
            whereClause = `WHERE d.f_donacion >= $${paramCount}`;
            params.push(fechaDesde);
        } else if (fechaHasta) {
            paramCount++;
            whereClause = `WHERE d.f_donacion <= $${paramCount}`;
            params.push(fechaHasta);
        }

        const sql = `
            SELECT
                TO_CHAR(d.f_donacion, 'YYYY-MM') as mes,
                SUM(dd.cantidaddonacion) as total
            FROM detalle_donacion dd
            JOIN donacion d ON dd.iddonacion = d.iddonacion
            ${whereClause}
            GROUP BY TO_CHAR(d.f_donacion, 'YYYY-MM')
            ORDER BY mes
        `;

        const result = await query(sql, params);

        res.json({
            message: 'Datos de donaciones por mes obtenidos exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo donaciones por mes:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/reporteAdmin/donaciones/cantidad-por-categoria - Nueva ruta para cantidad de donaciones
router.get('/donaciones/cantidad-por-categoria', authenticateToken, async (req, res) => {
    try {
        const { mes } = req.query;

        let whereClause = '';
        let params = [];

        if (mes) {
            whereClause = `WHERE TO_CHAR(d.f_donacion, 'MM') = $1`;
            params.push(mes);
        }

        const sql = `
            SELECT
                cd.nombcategoria as categoria,
                COUNT(dd.iddetalledonacion) as cantidad
            FROM detalle_donacion dd
            JOIN donacion d ON dd.iddonacion = d.iddonacion
            JOIN categoria_donacion cd ON dd.idcategoria = cd.idcategoria
            ${whereClause}
            GROUP BY cd.nombcategoria
            ORDER BY cantidad DESC
        `;

        const result = await query(sql, params);

        res.json({
            message: 'Cantidad de donaciones por categoría obtenida exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo cantidad de donaciones por categoría:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});
// Serie mensual multi-categoría
router.get('/donaciones/categorias-meses', authenticateToken, async (req, res) => {
    try {
        const { fechaDesde, fechaHasta } = req.query;
        let whereClause = '';
        let params = [];
        let paramCount = 0;
        if (fechaDesde && fechaHasta) {
            paramCount += 2;
            whereClause = `WHERE d.f_donacion BETWEEN $${paramCount - 1} AND $${paramCount}`;
            params.push(fechaDesde, fechaHasta);
        } else if (fechaDesde) {
            paramCount++;
            whereClause = `WHERE d.f_donacion >= $${paramCount}`;
            params.push(fechaDesde);
        } else if (fechaHasta) {
            paramCount++;
            whereClause = `WHERE d.f_donacion <= $${paramCount}`;
            params.push(fechaHasta);
        }
        const sql = `
            SELECT TO_CHAR(d.f_donacion,'YYYY-MM') AS mes,
                   cd.nombcategoria AS categoria,
                   COUNT(dd.iddetalledonacion) AS cantidad
            FROM detalle_donacion dd
            JOIN donacion d ON dd.iddonacion = d.iddonacion
            JOIN categoria_donacion cd ON dd.idcategoria = cd.idcategoria
            ${whereClause}
            GROUP BY mes, categoria
            ORDER BY mes ASC, categoria ASC`;
        const result = await query(sql, params);
        res.json({ message:'Serie mensual categorías obtenida', data: result.rows });
    } catch (err) {
        console.error('Error serie mensual categorías:', err);
        res.status(500).json({ message:'Error interno del servidor' });
    }
});

// GET /api/reporteAdmin/adopciones/estado
router.get('/adopciones/estado', authenticateToken, async (req, res) => {
    try {
        const { fechaDesde, fechaHasta } = req.query;

        let whereClause = '';
        let params = [];
        let paramCount = 0;

        if (fechaDesde && fechaHasta) {
            paramCount += 2;
            whereClause = `WHERE a.f_adopcion BETWEEN $${paramCount - 1} AND $${paramCount}`;
            params.push(fechaDesde, fechaHasta);
        } else if (fechaDesde) {
            paramCount++;
            whereClause = `WHERE a.f_adopcion >= $${paramCount}`;
            params.push(fechaDesde);
        } else if (fechaHasta) {
            paramCount++;
            whereClause = `WHERE a.f_adopcion <= $${paramCount}`;
            params.push(fechaHasta);
        }

        // Total de animales adoptados
        const adoptadosResult = await query(`
            SELECT COUNT(*) as total
            FROM adopcion a
            ${whereClause}
        `, params);

        // Total de animales disponibles (no adoptados)
        const disponiblesResult = await query(`
            SELECT COUNT(*) as total
            FROM animal an
            WHERE an.idanimal NOT IN (
                SELECT idanimal FROM adopcion WHERE idanimal IS NOT NULL
            )
        `);

        const adoptados = parseInt(adoptadosResult.rows[0].total) || 0;
        const disponibles = parseInt(disponiblesResult.rows[0].total) || 0;

        res.json({
            message: 'Datos de adopciones obtenidos exitosamente',
            data: {
                adoptados,
                disponibles,
                total: adoptados + disponibles
            }
        });

    } catch (error) {
        console.error('Error obteniendo datos de adopciones:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/reporteAdmin/adopciones/meses
router.get('/adopciones/meses', authenticateToken, async (req, res) => {
    try {
        const { fechaDesde, fechaHasta } = req.query;

        let whereClause = '';
        let params = [];
        let paramCount = 0;

        if (fechaDesde && fechaHasta) {
            paramCount += 2;
            whereClause = `WHERE a.f_adopcion BETWEEN $${paramCount - 1} AND $${paramCount}`;
            params.push(fechaDesde, fechaHasta);
        } else if (fechaDesde) {
            paramCount++;
            whereClause = `WHERE a.f_adopcion >= $${paramCount}`;
            params.push(fechaDesde);
        } else if (fechaHasta) {
            paramCount++;
            whereClause = `WHERE a.f_adopcion <= $${paramCount}`;
            params.push(fechaHasta);
        }

        const sql = `
            SELECT
                TO_CHAR(a.f_adopcion, 'YYYY-MM') as mes,
                COUNT(*) as total
            FROM adopcion a
            ${whereClause}
            GROUP BY TO_CHAR(a.f_adopcion, 'YYYY-MM')
            ORDER BY mes
        `;

        const result = await query(sql, params);

        res.json({
            message: 'Datos de adopciones por mes obtenidos exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo adopciones por mes:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/reporteAdmin/ahijados/estado
router.get('/ahijados/estado', authenticateToken, async (req, res) => {
    try {
        const { fechaDesde, fechaHasta } = req.query;

        const conditions = [];
        const params = [];
        if (fechaDesde) {
            params.push(fechaDesde);
            conditions.push(`ap.f_inicio >= $${params.length}`);
        }
        if (fechaHasta) {
            params.push(fechaHasta);
            conditions.push(`ap.f_inicio <= $${params.length}`);
        }
        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const sql = `
            SELECT 
                SUM(CASE WHEN ap.f_fin IS NULL OR ap.f_fin > CURRENT_DATE THEN 1 ELSE 0 END) AS activos,
                SUM(CASE WHEN ap.f_fin IS NOT NULL AND ap.f_fin <= CURRENT_DATE THEN 1 ELSE 0 END) AS inactivos
            FROM apadrinamiento ap
            ${whereClause}
        `;
        const result = await query(sql, params);

        const activos = parseInt(result.rows[0].activos) || 0;
        const inactivos = parseInt(result.rows[0].inactivos) || 0;

        res.json({
            message: 'Datos de ahijados obtenidos exitosamente',
            data: {
                activos,
                inactivos,
                total: activos + inactivos
            }
        });

    } catch (error) {
        console.error('Error obteniendo datos de ahijados:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/reporteAdmin/ahijados/meses
router.get('/ahijados/meses', authenticateToken, async (req, res) => {
    try {
        const { fechaDesde, fechaHasta } = req.query;

        let whereClause = '';
        let params = [];
        let paramCount = 0;

        if (fechaDesde && fechaHasta) {
            paramCount += 2;
            whereClause = `WHERE ap.f_inicio BETWEEN $${paramCount - 1} AND $${paramCount}`;
            params.push(fechaDesde, fechaHasta);
        } else if (fechaDesde) {
            paramCount++;
            whereClause = `WHERE ap.f_inicio >= $${paramCount}`;
            params.push(fechaDesde);
        } else if (fechaHasta) {
            paramCount++;
            whereClause = `WHERE ap.f_inicio <= $${paramCount}`;
            params.push(fechaHasta);
        }

        const sql = `
            SELECT
                TO_CHAR(ap.f_inicio, 'YYYY-MM') as mes,
                COUNT(*) as total
            FROM apadrinamiento ap
            ${whereClause}
            GROUP BY TO_CHAR(ap.f_inicio, 'YYYY-MM')
            ORDER BY mes
        `;

        const result = await query(sql, params);

        res.json({
            message: 'Datos de ahijados por mes obtenidos exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo ahijados por mes:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;
