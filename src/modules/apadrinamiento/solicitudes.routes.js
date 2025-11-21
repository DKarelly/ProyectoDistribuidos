const express = require('express');
const { query } = require('../../config/database');
const { authenticateToken } = require('../auth/auth.routes');

// Middleware para verificar admin
function requireAdmin(req, res, next) {
    if (!req.user || req.user.idrol !== 1) {
        return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next();
}

const router = express.Router();

// GET /api/solicitudes-apadrinamiento - Obtener todas las solicitudes de apadrinamiento (solo admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        // Obtener total de registros
        const countSql = `
            SELECT COUNT(*) as total
            FROM solicitud_apadrinamiento sa
            JOIN usuario u ON sa.idusuario = u.idusuario
            JOIN animal a ON sa.idanimal = a.idanimal
        `;

        const countResult = await query(countSql);
        const totalItems = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalItems / limit);
        const offset = (page - 1) * limit;

        // Obtener registros paginados
        const sql = `
            SELECT
                sa.idsolicitudapadrinamiento,
                sa.idusuario,
                sa.idanimal,
                sa.estado,
                u.aliasusuario as nombreusuario,
                a.nombreanimal
            FROM solicitud_apadrinamiento sa
            JOIN usuario u ON sa.idusuario = u.idusuario
            JOIN animal a ON sa.idanimal = a.idanimal
            ORDER BY sa.idsolicitudapadrinamiento DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await query(sql, [limit, offset]);

        res.json({
            message: 'Solicitudes de apadrinamiento obtenidas exitosamente',
            data: result.rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error obteniendo solicitudes de apadrinamiento:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/solicitudes-apadrinamiento/:id/aprobar - Aprobar solicitud de apadrinamiento (solo admin)
router.post('/:id/aprobar', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la solicitud existe y está pendiente
        const solicitudResult = await query(
            'SELECT * FROM solicitud_apadrinamiento WHERE idsolicitudapadrinamiento = $1 AND estado = $2',
            [id, 'Pendiente']
        );

        if (!solicitudResult.rows.length) {
            return res.status(404).json({ message: 'Solicitud no encontrada o no está pendiente' });
        }

        const solicitud = solicitudResult.rows[0];

        // Crear donación
        const donacionResult = await query(`
            INSERT INTO donacion (f_donacion, h_donacion, idusuario)
            VALUES (CURRENT_DATE, CURRENT_TIME, $1)
            RETURNING iddonacion
        `, [solicitud.idusuario]);

        const idDonacion = donacionResult.rows[0].iddonacion;

        // NOTA: Para el flujo de apadrinamiento, solo insertamos en `donacion` y `apadrinamiento`.
        // Crear apadrinamiento vinculando la solicitud aprobada.
        const apadrinamientoResult = await query(`
            INSERT INTO apadrinamiento (f_inicio, frecuencia, iddonacion, idanimal, idsolicitudapadrinamiento, estado)
            VALUES (CURRENT_DATE, 'Mensual', $1, $2, $3, 'Activo')
            RETURNING idapadrinamiento
        `, [idDonacion, solicitud.idanimal, id]);

        // Actualizar estado de la solicitud
        await query(
            'UPDATE solicitud_apadrinamiento SET estado = $1 WHERE idsolicitudapadrinamiento = $2',
            ['Aprobada', id]
        );

        res.json({
            message: 'Solicitud de apadrinamiento aprobada exitosamente',
            data: {
                idApadrinamiento: apadrinamientoResult.rows[0].idapadrinamiento,
                idSolicitud: id
            }
        });

    } catch (error) {
        console.error('Error aprobando solicitud de apadrinamiento:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/solicitudes-apadrinamiento/:id/rechazar - Rechazar solicitud de apadrinamiento (solo admin)
router.post('/:id/rechazar', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la solicitud existe y está pendiente
        const solicitudResult = await query(
            'SELECT * FROM solicitud_apadrinamiento WHERE idsolicitudapadrinamiento = $1 AND estado = $2',
            [id, 'Pendiente']
        );

        if (!solicitudResult.rows.length) {
            return res.status(404).json({ message: 'Solicitud no encontrada o no está pendiente' });
        }

        // Actualizar estado de la solicitud
        await query(
            'UPDATE solicitud_apadrinamiento SET estado = $1 WHERE idsolicitudapadrinamiento = $2',
            ['Rechazada', id]
        );

        res.json({
            message: 'Solicitud de apadrinamiento rechazada exitosamente',
            data: { idSolicitud: id }
        });

    } catch (error) {
        console.error('Error rechazando solicitud de apadrinamiento:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;
