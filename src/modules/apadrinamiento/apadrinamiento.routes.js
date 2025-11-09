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
        const { alias, nombre, animal } = req.query;

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
            whereConditions.push(`(p.nombrepersona ILIKE $${paramCount} OR e.nombreempresa ILIKE $${paramCount})`);
            params.push(`%${nombre}%`);
        }

        if (animal) {
            paramCount++;
            whereConditions.push(`a.nombreanimal ILIKE $${paramCount}`);
            params.push(`%${animal}%`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const sql = `
            SELECT
                ap.idapadrinamiento,
                ap.f_inicio,
                ap.frecuencia,
                ap.f_fin,
                a.idanimal,
                a.nombreanimal,
                u.idusuario,
                u.aliasusuario,
                COALESCE(p.nombrepersona, e.nombreempresa) as nombre_completo,
                d.iddonacion,
                dd.cantidaddonacion as monto
            FROM apadrinamiento ap
            JOIN animal a ON ap.idanimal = a.idanimal
            JOIN donacion d ON ap.iddonacion = d.iddonacion
            JOIN usuario u ON d.idusuario = u.idusuario
            LEFT JOIN persona p ON u.idusuario = p.idusuario
            LEFT JOIN empresa e ON u.idusuario = e.idusuario
            JOIN detalle_donacion dd ON d.iddonacion = dd.iddonacion
            ${whereClause}
            ORDER BY ap.f_inicio DESC
        `;

        const result = await query(sql, params);

        res.json({
            message: 'Apadrinamientos obtenidos exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo apadrinamientos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/apadrinamiento - Crear nuevo apadrinamiento (solo admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { idAnimal, nombreAnimal, idUsuario, aliasUsuario, frecuencia } = req.body;

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

        // Buscar o crear categoría "Apadrinamiento"
        let categoriaResult = await query(
            "SELECT idcategoria FROM categoria_donacion WHERE nombcategoria = 'Apadrinamiento'"
        );

        let idCategoria;
        if (categoriaResult.rows.length === 0) {
            const newCategoriaResult = await query(
                "INSERT INTO categoria_donacion (nombcategoria) VALUES ('Apadrinamiento') RETURNING idcategoria"
            );
            idCategoria = newCategoriaResult.rows[0].idcategoria;
        } else {
            idCategoria = categoriaResult.rows[0].idcategoria;
        }

        // Crear donación
        const donacionResult = await query(`
            INSERT INTO donacion (f_donacion, h_donacion, idusuario)
            VALUES (CURRENT_DATE, CURRENT_TIME, $1)
            RETURNING iddonacion
        `, [idUsuario]);

        const idDonacion = donacionResult.rows[0].iddonacion;

        // Crear detalle donación (cantidad 0 para apadrinamiento simbólico)
        await query(`
            INSERT INTO detalle_donacion (cantidaddonacion, iddonacion, idcategoria)
            VALUES (0, $1, $2)
        `, [idDonacion, idCategoria]);

        // Crear apadrinamiento
        const apadrinamientoResult = await query(`
            INSERT INTO apadrinamiento (f_inicio, frecuencia, iddonacion, idanimal)
            VALUES (CURRENT_DATE, $1, $2, $3)
            RETURNING idapadrinamiento
        `, [frecuencia, idDonacion, idAnimal]);

        res.status(201).json({
            message: 'Apadrinamiento creado exitosamente',
            data: {
                idApadrinamiento: apadrinamientoResult.rows[0].idapadrinamiento,
                idDonacion,
                animal: animalResult.rows[0].nombreanimal,
                usuario: usuarioResult.rows[0].aliasusuario,
                frecuencia
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
        const { idAnimal, nombreAnimal, idUsuario, aliasUsuario, frecuencia } = req.body;

        if (!idAnimal || !idUsuario || !frecuencia) {
            return res.status(400).json({
                message: 'Los campos idAnimal, idUsuario y frecuencia son requeridos'
            });
        }

        // Verificar que el apadrinamiento existe
        const apadrinamientoResult = await query(
            'SELECT idapadrinamiento FROM apadrinamiento WHERE idapadrinamiento = $1',
            [id]
        );

        if (!apadrinamientoResult.rows.length) {
            return res.status(404).json({ message: 'Apadrinamiento no encontrado' });
        }

        // Verificar que el animal existe
        const animalResult = await query(
            'SELECT idanimal FROM animal WHERE idanimal = $1',
            [idAnimal]
        );

        if (!animalResult.rows.length) {
            return res.status(400).json({ message: 'Animal no encontrado' });
        }

        // Verificar que el usuario existe
        const usuarioResult = await query(
            'SELECT idusuario FROM usuario WHERE idusuario = $1',
            [idUsuario]
        );

        if (!usuarioResult.rows.length) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }

        // Actualizar apadrinamiento
        await query(`
            UPDATE apadrinamiento
            SET frecuencia = $1
            WHERE idapadrinamiento = $2
        `, [frecuencia, id]);

        res.json({
            message: 'Apadrinamiento actualizado exitosamente',
            data: { idApadrinamiento: id }
        });

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
            whereClause = 'WHERE u.aliasusuario ILIKE $1 OR p.nombrepersona ILIKE $1 OR e.nombreempresa ILIKE $1';
            params.push(`%${search}%`);
        }

        const sql = `
            SELECT
                u.idusuario,
                u.aliasusuario,
                COALESCE(p.nombrepersona, e.nombreempresa) as nombre_completo
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
