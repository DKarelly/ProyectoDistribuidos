const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { authenticateToken } = require('./auth');
const router = express.Router();

/* ------------------ MIDDLEWARE DE ADMIN ------------------ */
const isAdmin = (req, res, next) => {
    if (req.user.idrol !== 1) return res.status(403).json({ message: 'Solo administradores' });
    next();
};

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
        console.log(result.rows);  // <--- VERIFICA
        res.json({ message: 'Usuarios obtenidos correctamente', data: result.rows });
    } catch (error) {
        console.error('❌ Error obteniendo usuarios:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});


// Registrar nuevo usuario con persona o empresa
router.post('/', authenticateToken, isAdmin, async (req, res) => {
    const client = await getClient();
    try {
        const { aliasusuario, correousuario, claveusuario, numusuario, direccionusuario, idrol, tipoPersona, persona, empresa } = req.body;

        await client.query('BEGIN');

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(claveusuario, 10);

        // Insertar usuario
        const resultUser = await client.query(`
            INSERT INTO usuario(aliasusuario, correousuario, claveusuario, numusuario, direccionusuario, idrol)
            VALUES ($1,$2,$3,$4,$5,$6) RETURNING idusuario
        `, [aliasusuario, correousuario, hashedPassword, numusuario, direccionusuario, idrol]);

        const idusuario = resultUser.rows[0].idusuario;

        // Insertar persona o empresa
        if (tipoPersona === 'persona' && persona) {
            await client.query(`
                INSERT INTO persona(nombres, apepaterno, apematerno, dni, sexo, idusuario)
                VALUES ($1,$2,$3,$4,$5,$6)
            `, [persona.nombres, persona.apepaterno, persona.apematerno, persona.dni, persona.sexo, idusuario]);
        } else if (tipoPersona === 'empresa' && empresa) {
            await client.query(`
                INSERT INTO empresa(nombreempresa, tipopersona, ruc, f_creacion, idusuario)
                VALUES ($1,$2,$3,$4,$5)
            `, [empresa.nombreempresa, empresa.tipopersona, empresa.ruc, empresa.f_creacion, idusuario]);
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Usuario interno registrado correctamente', idusuario });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error registrando usuario interno:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        client.release();
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



module.exports = router;