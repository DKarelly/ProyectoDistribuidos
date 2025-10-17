const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('./auth');
const router = express.Router();

/* ============================================================
   🔹 GET /api/users/perfil
   Obtiene el perfil del usuario autenticado
============================================================ */
router.get('/perfil', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idusuario;

        const result = await query(`
            SELECT 
                u.idusuario,
                u.aliasusuario,
                u.correousuario,
                u.numusuario,
                u.direccionusuario,
                r.rolusuario
            FROM usuario u
            JOIN rol_usuario r ON u.idrol = r.idrol
            WHERE u.idusuario = $1
        `, [idUsuario]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const user = result.rows[0];
        delete user.claveusuario; // 🧹 no devolver contraseña

        res.json({
            message: 'Perfil obtenido exitosamente',
            data: { usuario: user }
        });

    } catch (error) {
        console.error('❌ Error obteniendo perfil:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/* ============================================================
   🔹 PUT /api/users/perfil
   Actualiza datos del usuario autenticado
============================================================ */
router.put('/perfil', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idusuario;
        const {
            aliasusuario,
            numusuario,
            direccionusuario
        } = req.body;

        const result = await query(`
            UPDATE usuario 
            SET 
                aliasusuario = COALESCE($2, aliasusuario),
                numusuario = COALESCE($3, numusuario),
                direccionusuario = COALESCE($4, direccionusuario)
            WHERE idusuario = $1
            RETURNING idusuario, aliasusuario, correousuario, numusuario, direccionusuario
        `, [idUsuario, aliasusuario, numusuario, direccionusuario]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({
            message: 'Perfil actualizado exitosamente',
            data: { usuario: result.rows[0] }
        });

    } catch (error) {
        console.error('❌ Error actualizando perfil:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/* ============================================================
   🔹 GET /api/users/adopciones
   Lista de adopciones del usuario autenticado
============================================================ */
router.get('/adopciones', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idusuario;

        const result = await query(`
            SELECT 
                a.idadopcion,
                a.fechaadopcion,
                a.horaadopcion,
                a.estadoadopcion,
                an.nombreaminal,
                an.edadmesesanimal,
                an.generoanimal,
                r.razaanimal,
                e.especieanimal
            FROM adopcion a
            JOIN animal an ON a.idanimal = an.idanimal
            JOIN raza r ON an.idraza = r.idraza
            JOIN especie e ON r.idespecie = e.idespecie
            WHERE a.idusuario = $1
            ORDER BY a.fechaadopcion DESC, a.horaadopcion DESC
        `, [idUsuario]);

        res.json({
            message: 'Adopciones obtenidas exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('❌ Error obteniendo adopciones:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/* ============================================================
   🔹 GET /api/users/donaciones
   Lista de donaciones del usuario autenticado
============================================================ */
router.get('/donaciones', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idusuario;

        const result = await query(`
            SELECT 
                dd.iddetalledonacion,
                dd.cantidaddonacion,
                dd.detalledonacion,
                cd.categoria,
                d.fechadonacion,
                d.horadonacion
            FROM detalle_donacion dd
            JOIN donacion d ON dd.iddonacion = d.iddonacion
            JOIN categoria_donacion cd ON dd.idcategoria = cd.idcategoria
            WHERE d.idusuario = $1
            ORDER BY d.fechadonacion DESC, d.horadonacion DESC
        `, [idUsuario]);

        res.json({
            message: 'Donaciones obtenidas exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('❌ Error obteniendo donaciones:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/* ============================================================
   🔹 GET /api/users
   Lista todos los usuarios (solo administradores)
============================================================ */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                u.idusuario,
                u.aliasusuario,
                u.correousuario,
                u.numusuario,
                u.direccionusuario,
                r.rolusuario
            FROM usuario u
            JOIN rol_usuario r ON u.idrol = r.idrol
            ORDER BY u.idusuario ASC
        `);

        res.json({
            message: 'Usuarios obtenidos correctamente',
            data: result.rows
        });

    } catch (error) {
        console.error('❌ Error obteniendo usuarios:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});



module.exports = router;
