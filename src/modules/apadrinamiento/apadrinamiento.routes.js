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

// GET /api/apadrinamiento - Obtener todos los apadrinamientos (solo admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { alias, nombre, animal, page = 1, limit = 10 } = req.query;

        let whereConditions = [];
        let params = [];
        let paramCount = 0;

        if (alias) {
            paramCount++;
            whereConditions.push(`u.aliasusuario ILIKE $${paramCount}`);
            params.push(`%${alias}%`);
        }

        if (nombre) {
            paramCount++;
            whereConditions.push(`(p.nombres ILIKE $${paramCount} OR e.nombreempresa ILIKE $${paramCount})`);
            params.push(`%${nombre}%`);
        }

        if (animal) {
            paramCount++;
            whereConditions.push(`a.nombreanimal ILIKE $${paramCount}`);
            params.push(`%${animal}%`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Obtener total de registros
        const countSql = `
            SELECT COUNT(*) as total
            FROM apadrinamiento ap
            JOIN animal a ON ap.idanimal = a.idanimal
            JOIN donacion d ON ap.iddonacion = d.iddonacion
            JOIN usuario u ON d.idusuario = u.idusuario
            LEFT JOIN persona p ON u.idusuario = p.idusuario
            LEFT JOIN empresa e ON u.idusuario = e.idusuario
            ${whereClause}
        `;

        const countResult = await query(countSql, params);
        const totalItems = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalItems / limit);
        const offset = (page - 1) * limit;

        // Obtener registros paginados
        const sql = `
            SELECT
                    ap.idapadrinamiento, ap.f_inicio, ap.frecuencia,
                    d.iddonacion,
                a.idanimal,
                    a.nombreanimal,
                    u.idusuario,
                    u.aliasusuario,
                    COALESCE(p.nombres, e.nombreempresa) as nombre_completo,
                    ap.idsolicitudapadrinamiento,
                    ap.estado
            FROM apadrinamiento ap
            JOIN animal a ON ap.idanimal = a.idanimal
            JOIN donacion d ON ap.iddonacion = d.iddonacion
            JOIN usuario u ON d.idusuario = u.idusuario
            LEFT JOIN persona p ON u.idusuario = p.idusuario
            LEFT JOIN empresa e ON u.idusuario = e.idusuario
            ${whereClause}
            ORDER BY ap.f_inicio DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;

        params.push(limit, offset);

        const result = await query(sql, params);

        res.json({
            message: 'Apadrinamientos obtenidos exitosamente',
            data: result.rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error obteniendo apadrinamientos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/apadrinamiento/:id/anular - Cambiar estado a Inactivo (solo admin)
router.post('/:id/anular', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        console.log('POST /api/apadrinamiento/:id/anular called - id=', id);

        // Verificar que el apadrinamiento existe
        const apadrinamientoResult = await query('SELECT * FROM apadrinamiento WHERE idapadrinamiento = $1', [id]);
        if (!apadrinamientoResult.rows.length) {
            return res.status(404).json({ message: 'Apadrinamiento no encontrado' });
        }

        // Actualizar solo el estado a Inactivo
        const sql = `UPDATE apadrinamiento SET estado = 'Inactivo' WHERE idapadrinamiento = $1`;
        await query(sql, [id]);

        const updatedRow = await query('SELECT * FROM apadrinamiento WHERE idapadrinamiento = $1', [id]);
        return res.json({ message: 'Apadrinamiento anulado', data: updatedRow.rows[0] });
    } catch (error) {
        console.error('Error anulando apadrinamiento:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/apadrinamiento - Crear nuevo apadrinamiento (solo admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { idAnimal, nombreAnimal, idUsuario, aliasUsuario, frecuencia, idSolicitudApadrinamiento } = req.body;

        if (!idAnimal || !idUsuario || !frecuencia) {
            return res.status(400).json({
                message: 'Los campos idAnimal, idUsuario y frecuencia son requeridos'
            });
        }

        // Verificar que el animal existe
        const animalResult = await query(
            'SELECT idanimal, nombreanimal FROM animal WHERE idanimal = $1',
            [idAnimal]
        );

        if (!animalResult.rows.length) {
            return res.status(400).json({ message: 'Animal no encontrado' });
        }

        // Verificar que el usuario existe
        const usuarioResult = await query(
            'SELECT idusuario, aliasusuario FROM usuario WHERE idusuario = $1',
            [idUsuario]
        );

        if (!usuarioResult.rows.length) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }

        // Crear donación
        const donacionResult = await query(`
            INSERT INTO donacion (f_donacion, h_donacion, idusuario)
            VALUES (CURRENT_DATE, CURRENT_TIME, $1)
            RETURNING iddonacion
        `, [idUsuario]);

        const idDonacion = donacionResult.rows[0].iddonacion;

        // Crear apadrinamiento con o sin idsolicitudapadrinamiento
        const idSolicitud = idSolicitudApadrinamiento || null;
        const apadrinamientoResult = await query(`
            INSERT INTO apadrinamiento (f_inicio, frecuencia, iddonacion, idanimal, idsolicitudapadrinamiento, estado)
            VALUES (CURRENT_DATE, $1, $2, $3, $4, 'Activo')
            RETURNING idapadrinamiento
        `, [frecuencia, idDonacion, idAnimal, idSolicitud]);

        // Si viene de una solicitud, actualizar su estado a 'Aceptada'
        if (idSolicitud) {
            await query(
                'UPDATE solicitud_apadrinamiento SET estado = $1 WHERE idsolicitudapadrinamiento = $2',
                ['Aceptada', idSolicitud]
            );
        }

        res.status(201).json({
            message: 'Apadrinamiento creado exitosamente',
            data: {
                idApadrinamiento: apadrinamientoResult.rows[0].idapadrinamiento,
                idDonacion,
                animal: animalResult.rows[0].nombreanimal,
                usuario: usuarioResult.rows[0].aliasusuario,
                frecuencia,
                idSolicitud
            }
        });

    } catch (error) {
        console.error('Error creando apadrinamiento:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/apadrinamiento/:id - Actualizar apadrinamiento (solo admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('PUT /api/apadrinamiento/:id called - id=', id, 'method=', req.method);
        console.log('Request body:', req.body);
        const body = req.body || {};
        // Aceptar varias formas de nombrar campos (camelCase / lowercase)
        const idAnimalFromBody = body.idAnimal ?? body.idanimal ?? body.id_animal;
        // Compatibilidad: algunas rutas/llamadas antiguas pueden usar `idAnimal`
        const idAnimal = idAnimalFromBody;
        const frecuenciaFromBody = body.frecuencia ?? body.Frecuencia ?? body.freq;
        const idDonacionFromBody = body.iddonacion ?? body.idDonacion ?? body.id_donacion;
        const idSolicitudFromBody = body.idsolicitudapadrinamiento ?? body.idSolicitud ?? body.id_solicitudapadrinamiento;
        const estadoFromBody = body.estado ?? body.Estado;

        // Verificar que el apadrinamiento existe y obtener valores actuales
        const apadrinamientoResult = await query(
            'SELECT * FROM apadrinamiento WHERE idapadrinamiento = $1',
            [id]
        );

        if (!apadrinamientoResult.rows.length) {
            return res.status(404).json({ message: 'Apadrinamiento no encontrado' });
        }

        const current = apadrinamientoResult.rows[0];

        // Verificar que el animal existe si se pide actualizar (usar la variante capturada)
        if (idAnimalFromBody) {
            const animalCheck = await query(
                'SELECT idanimal FROM animal WHERE idanimal = $1',
                [idAnimalFromBody]
            );

            if (!animalCheck.rows.length) {
                return res.status(400).json({ message: 'Animal no encontrado' });
            }
        }

        // Preparar valores: usar los del body (en cualquiera de las variantes) o los actuales si no se proporcionan
        const newFInicio = body.f_inicio ?? body.fInicio ?? current.f_inicio;
        const newFrecuencia = frecuenciaFromBody ?? current.frecuencia;
        const newIdDonacion = idDonacionFromBody ?? current.iddonacion;
        const newIdAnimal = idAnimalFromBody ?? current.idanimal;
        const newIdSolicitud = idSolicitudFromBody ?? current.idsolicitudapadrinamiento;
        const newEstado = estadoFromBody ?? current.estado;

        // Validar que el animal exista (si se cambiará)
        const animalResult = await query('SELECT idanimal FROM animal WHERE idanimal = $1', [newIdAnimal]);
        if (!animalResult.rows.length) {
            return res.status(400).json({ message: 'Animal no encontrado' });
        }

        // Ejecutar UPDATE con los seis campos
        const sqlUpdate = `
            UPDATE apadrinamiento
            SET f_inicio = $1,
                frecuencia = $2,
                iddonacion = $3,
                idanimal = $4,
                idsolicitudapadrinamiento = $5,
                estado = $6
            WHERE idapadrinamiento = $7
        `;

        const params = [newFInicio, newFrecuencia, newIdDonacion, newIdAnimal, newIdSolicitud, newEstado, id];

        console.log('Executing SQL (full update):', sqlUpdate);
        console.log('With params:', params);

        await query(sqlUpdate, params);

        // Devolver fila actualizada
        const updatedRow = await query('SELECT * FROM apadrinamiento WHERE idapadrinamiento = $1', [id]);

        return res.json({ message: 'Apadrinamiento actualizado', data: updatedRow.rows[0] });

    } catch (error) {
        console.error('Error actualizando apadrinamiento:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// DELETE /api/apadrinamiento/:id - Eliminar apadrinamiento (solo admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el apadrinamiento existe
        const apadrinamientoResult = await query(
            'SELECT idapadrinamiento, iddonacion FROM apadrinamiento WHERE idapadrinamiento = $1',
            [id]
        );

        if (!apadrinamientoResult.rows.length) {
            return res.status(404).json({ message: 'Apadrinamiento no encontrado' });
        }

        const idDonacion = apadrinamientoResult.rows[0].iddonacion;

        // Eliminar en orden: detalle_donacion, apadrinamiento, donacion
        await query('DELETE FROM detalle_donacion WHERE iddonacion = $1', [idDonacion]);
        await query('DELETE FROM apadrinamiento WHERE idapadrinamiento = $1', [id]);
        await query('DELETE FROM donacion WHERE iddonacion = $1', [idDonacion]);

        res.json({
            message: 'Apadrinamiento eliminado exitosamente',
            data: { idApadrinamiento: id }
        });

    } catch (error) {
        console.error('Error eliminando apadrinamiento:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/apadrinamiento/usuarios - Obtener lista de usuarios para autocompletado
router.get('/usuarios', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { search } = req.query;

        let whereClause = '';
        let params = [];

        if (search) {
            whereClause = 'WHERE u.aliasusuario ILIKE $1 OR p.nombres ILIKE $1 OR e.nombreempresa ILIKE $1';
            params.push(`%${search}%`);
        }

        const sql = `
            SELECT
                u.idusuario,
                u.aliasusuario,
                COALESCE(p.nombres, e.nombreempresa) as nombre_completo
            FROM usuario u
            LEFT JOIN persona p ON u.idusuario = p.idusuario
            LEFT JOIN empresa e ON u.idusuario = e.idusuario
            ${whereClause}
            ORDER BY u.aliasusuario
            LIMIT 50
        `;

        const result = await query(sql, params);

        res.json({
            message: 'Usuarios obtenidos exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/apadrinamiento/animales - Obtener lista de animales para autocompletado
router.get('/animales', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { search } = req.query;

        let whereClause = '';
        let params = [];

        if (search) {
            whereClause = 'WHERE a.nombreanimal ILIKE $1';
            params.push(`%${search}%`);
        }

        const sql = `
            SELECT
                a.idanimal,
                a.nombreanimal,
                r.razaanimal,
                e.especieanimal
            FROM animal a
            JOIN raza r ON a.idraza = r.idraza
            JOIN especie e ON r.idespecie = e.idespecie
            ${whereClause}
            ORDER BY a.nombreanimal
            LIMIT 50
        `;

        const result = await query(sql, params);

        res.json({
            message: 'Animales obtenidos exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo animales:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;
