const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('./auth');
const router = express.Router();

/* ============================================================
   🔹 PERFIL DEL USUARIO AUTENTICADO
============================================================ */
router.get('/perfil', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idusuario;

        const result = await query(`
            SELECT u.idusuario, u.aliasusuario, u.correousuario, 
                   u.numusuario, u.direccionusuario, r.rolusuario
            FROM usuario u
            JOIN rol_usuario r ON u.idrol = r.idrol
            WHERE u.idusuario = $1
        `, [idUsuario]);

        if (!result.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });

        const user = result.rows[0];
        delete user.claveusuario;

        res.json({ message: 'Perfil obtenido exitosamente', data: { usuario: user } });
    } catch (error) {
        console.error('❌ Error obteniendo perfil:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

router.put('/perfil', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idusuario;
        const { aliasusuario, numusuario, direccionusuario } = req.body;

        const result = await query(`
            UPDATE usuario
            SET aliasusuario = COALESCE($2, aliasusuario),
                numusuario = COALESCE($3, numusuario),
                direccionusuario = COALESCE($4, direccionusuario)
            WHERE idusuario = $1
            RETURNING idusuario, aliasusuario, correousuario, numusuario, direccionusuario
        `, [idUsuario, aliasusuario, numusuario, direccionusuario]);

        if (!result.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });

        res.json({ message: 'Perfil actualizado exitosamente', data: { usuario: result.rows[0] } });
    } catch (error) {
        console.error('❌ Error actualizando perfil:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/* ============================================================
   🔹 ADOPCIONES Y DONACIONES DEL USUARIO
============================================================ */
router.get('/adopciones', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idusuario;
        const result = await query(`
            SELECT a.idadopcion, a.fechaadopcion, a.horaadopcion, a.estadoadopcion,
                   an.nombreanimal, an.edadmesesanimal, an.generoanimal,
                   r.razaanimal, e.especieanimal
            FROM adopcion a
            JOIN animal an ON a.idanimal = an.idanimal
            JOIN raza r ON an.idraza = r.idraza
            JOIN especie e ON r.idespecie = e.idespecie
            WHERE a.idusuario = $1
            ORDER BY a.fechaadopcion DESC, a.horaadopcion DESC
        `, [idUsuario]);

        res.json({ message: 'Adopciones obtenidas exitosamente', data: result.rows });
    } catch (error) {
        console.error('❌ Error obteniendo adopciones:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

router.get('/donaciones', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idusuario;
        const result = await query(`
            SELECT dd.iddetalledonacion, dd.cantidaddonacion, dd.detalledonacion,
                   cd.nombcategoria, d.f_donacion, d.h_donacion
            FROM detalle_donacion dd
            JOIN donacion d ON dd.iddonacion = d.iddonacion
            JOIN categoria_donacion cd ON dd.idcategoria = cd.idcategoria
            WHERE d.idusuario = $1
            ORDER BY d.f_donacion DESC, d.h_donacion DESC
        `, [idUsuario]);

        res.json({ message: 'Donaciones obtenidas exitosamente', data: result.rows });
    } catch (error) {
        console.error('❌ Error obteniendo donaciones:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/* ============================================================
   🔹 USUARIOS (ADMIN)
============================================================ */
// Listar todos los usuarios
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT u.idusuario, u.aliasusuario, u.correousuario, u.numusuario, 
                   u.direccionusuario, r.rolusuario, u.idrol
            FROM usuario u
            JOIN rol_usuario r ON u.idrol = r.idrol
            ORDER BY u.idusuario ASC
        `);
        res.json({ message: 'Usuarios obtenidos correctamente', data: result.rows });
    } catch (error) {
        console.error('❌ Error obteniendo usuarios:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Registrar nuevo usuario
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { aliasusuario, correousuario, claveusuario, numusuario, direccionusuario, idrol } = req.body;
        const result = await query(`
            INSERT INTO usuario(aliasusuario, correousuario, claveusuario, numusuario, direccionusuario, idrol)
            VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
        `, [aliasusuario, correousuario, claveusuario, numusuario, direccionusuario, idrol]);
        res.status(201).json({ message: 'Usuario creado', data: result.rows[0] });
    } catch (error) {
        console.error('❌ Error creando usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Editar cualquier usuario
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { aliasusuario, correousuario, claveusuario, numusuario, direccionusuario, idrol } = req.body;

        const result = await query(`
            UPDATE usuario
            SET aliasusuario = COALESCE($2, aliasusuario),
                correousuario = COALESCE($3, correousuario),
                claveusuario = COALESCE($4, claveusuario),
                numusuario = COALESCE($5, numusuario),
                direccionusuario = COALESCE($6, direccionusuario),
                idrol = COALESCE($7, idrol)
            WHERE idusuario = $1
            RETURNING *
        `, [id, aliasusuario, correousuario, claveusuario, numusuario, direccionusuario, idrol]);

        if (!result.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });

        res.json({ message: 'Usuario actualizado', data: result.rows[0] });
    } catch (error) {
        console.error('❌ Error editando usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Eliminar usuario
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM usuario WHERE idusuario = $1 RETURNING *', [id]);
        if (!result.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json({ message: 'Usuario eliminado', data: result.rows[0] });
    } catch (error) {
        console.error('❌ Error eliminando usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/* ============================================================
   🔹 ROLES (ROL_USUARIO)
============================================================ */
// Listar roles
router.get('/roles', authenticateToken, async (req, res) => {
    try {
        const result = await query('SELECT * FROM rol_usuario ORDER BY idrol ASC');
        res.json({ message: 'Roles obtenidos', data: result.rows });
    } catch (error) {
        console.error('❌ Error obteniendo roles:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Registrar rol
router.post('/roles', authenticateToken, async (req, res) => {
    try {
        const { rolusuario } = req.body;
        const result = await query('INSERT INTO rol_usuario(rolusuario) VALUES ($1) RETURNING *', [rolusuario]);
        res.status(201).json({ message: 'Rol creado', data: result.rows[0] });
    } catch (error) {
        console.error('❌ Error creando rol:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Editar rol
router.put('/roles/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { rolusuario } = req.body;
        const result = await query(`
            UPDATE rol_usuario
            SET rolusuario = COALESCE($2, rolusuario)
            WHERE idrol = $1
            RETURNING *
        `, [id, rolusuario]);
        if (!result.rows.length) return res.status(404).json({ message: 'Rol no encontrado' });
        res.json({ message: 'Rol actualizado', data: result.rows[0] });
    } catch (error) {
        console.error('❌ Error editando rol:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Eliminar rol
router.delete('/roles/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM rol_usuario WHERE idrol = $1 RETURNING *', [id]);
        if (!result.rows.length) return res.status(404).json({ message: 'Rol no encontrado' });
        res.json({ message: 'Rol eliminado', data: result.rows[0] });
    } catch (error) {
        console.error('❌ Error eliminando rol:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;