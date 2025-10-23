const express = require('express');
const bcrypt = require('bcryptjs');
//const { query } = require('../config/database');
const { query, getClient } = require('../config/database');
const { authenticateToken } = require('./auth');
const router = express.Router();

/* ------------------ MIDDLEWARE DE ADMIN ------------------ */
const isAdmin = (req, res, next) => {
    if (req.user.idrol !== 1) return res.status(403).json({ message: 'Solo administradores' });
    next();
};

/* ============================================================
   PERFIL DEL USUARIO AUTENTICADO
============================================================ */
router.get('/perfil', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idusuario;

        const result = await query(`
            SELECT u.idusuario, u.aliasusuario, u.correousuario, 
                   u.numerousuario, u.direccionusuario, r.rolusuario, ur.idrol
            FROM usuario u
            LEFT JOIN usuario_roles ur ON u.idusuario = ur.idusuario
            LEFT JOIN rol_usuario r ON ur.idrol = r.idrol
            WHERE u.idusuario = $1
        `, [idUsuario]);

        if (!result.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });

        const user = result.rows[0];
        delete user.claveusuario;

        res.json({ message: 'Perfil obtenido exitosamente', data: { usuario: user } });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
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
                numerousuario = COALESCE($3, numerousuario),
                direccionusuario = COALESCE($4, direccionusuario)
            WHERE idusuario = $1
            RETURNING idusuario, aliasusuario, correousuario, numerousuario, direccionusuario
        `, [idUsuario, aliasusuario, numusuario, direccionusuario]);

        if (!result.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });

        res.json({ message: 'Perfil actualizado exitosamente', data: { usuario: result.rows[0] } });
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/* ============================================================
   ADOPCIONES Y DONACIONES DEL USUARIO
============================================================ */
router.get('/adopciones', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idusuario;
        const result = await query(`
            SELECT a.idadopcion, a.f_adopcion, a.estadoadopcion,
                   an.nombreanimal, an.edadmesesanimal, an.generoanimal,
                   r.razaanimal, e.especieanimal
            FROM adopcion a
            JOIN animal an ON a.idanimal = an.idanimal
            JOIN raza r ON an.idraza = r.idraza
            JOIN especie e ON r.idespecie = e.idespecie
            WHERE a.idpersona = $1
            ORDER BY a.f_adopcion DESC
        `, [idUsuario]);

        res.json({ message: 'Adopciones obtenidas exitosamente', data: result.rows });
    } catch (error) {
        console.error('Error obteniendo adopciones:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

router.get('/donaciones', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idusuario;
        const result = await query(`
            SELECT dd.iddetalledonacion, dd.cantidaddonacion, dd.detalledonacion,
                   cd.categoria, d.fechadonacion, d.horadonacion
            FROM detalle_donacion dd
            JOIN donacion d ON dd.iddonacion = d.iddonacion
            JOIN categoria_donacion cd ON dd.idcategoria = cd.idcategoria
            WHERE d.idusuario = $1
            ORDER BY d.fechadonacion DESC, d.horadonacion DESC
        `, [idUsuario]);

        res.json({ message: 'Donaciones obtenidas exitosamente', data: result.rows });
    } catch (error) {
        console.error('Error obteniendo donaciones:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/* ============================================================
   USUARIOS (ADMIN)
============================================================ */
// Listar todos los usuarios
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT u.idusuario, u.aliasusuario, u.correousuario, u.numerousuario, 
                   u.direccionusuario, r.rolusuario, ur.idrol
            FROM usuario u
            LEFT JOIN usuario_roles ur ON u.idusuario = ur.idusuario
            LEFT JOIN rol_usuario r ON ur.idrol = r.idrol
            ORDER BY u.idusuario ASC
        `);
        console.log(result.rows);  // <--- VERIFICA
        res.json({ message: 'Usuarios obtenidos correctamente', data: result.rows });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});


// Registrar nuevo usuario con persona o empresa
router.post('/', authenticateToken, isAdmin, async (req, res) => {
    const client = await getClient(); // obtenemos el client para la transacción
    try {
        await client.query('BEGIN'); // inicio de transacción

        const { aliasusuario, correousuario, claveusuario, numerousuario, direccionusuario, idrol, tipoPersona, persona, empresa } = req.body;

        const hashedPassword = await bcrypt.hash(claveusuario, 10);

        // Insertar usuario
        const resultUser = await client.query(`
            INSERT INTO usuario(aliasusuario, correousuario, claveusuario, numerousuario, direccionusuario)
            VALUES ($1,$2,$3,$4,$5) RETURNING idusuario
        `, [aliasusuario, correousuario, hashedPassword, numerousuario, direccionusuario]);

        const idusuario = resultUser.rows[0].idusuario;

        // Asignar rol al usuario
        await client.query(`
            INSERT INTO usuario_roles(idusuario, idrol)
            VALUES ($1, $2)
        `, [idusuario, idrol]);

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

        await client.query('COMMIT'); // confirmamos transacción
        res.status(201).json({ message: 'Usuario registrado correctamente', idusuario });

    } catch (error) {
        await client.query('ROLLBACK'); // revertimos en caso de error
        console.error('Error registrando usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        client.release(); // liberamos el client
    }
});


// Editar cualquier usuario
router.put('/:id', authenticateToken, async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { aliasusuario, correousuario, claveusuario, numerousuario, direccionusuario, idrol, persona, empresa } = req.body;

        // Obtener datos actuales
        const resultUser = await client.query(`SELECT * FROM usuario WHERE idusuario = $1`, [id]);
        if (!resultUser.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        const usuarioActual = resultUser.rows[0];

        const hashedPassword = claveusuario ? await bcrypt.hash(claveusuario, 10) : usuarioActual.claveusuario;

        // Actualizar usuario
        const updatedUser = await client.query(`
            UPDATE usuario
            SET aliasusuario = COALESCE($2, aliasusuario),
                correousuario = COALESCE($3, correousuario),
                claveusuario = $4,
                numerousuario = COALESCE($5, numerousuario),
                direccionusuario = COALESCE($6, direccionusuario)
            WHERE idusuario = $1
            RETURNING *
        `, [
            id,
            aliasusuario || usuarioActual.aliasusuario,
            correousuario || usuarioActual.correousuario,
            hashedPassword,
            numerousuario || usuarioActual.numerousuario,
            direccionusuario || usuarioActual.direccionusuario
        ]);

        // Actualizar rol si se proporciona
        if (idrol) {
            await client.query(`
                UPDATE usuario_roles 
                SET idrol = $2 
                WHERE idusuario = $1
            `, [id, idrol]);
        }

        // Actualizar persona si existe
        if (persona) {
            const resultPersona = await client.query(`SELECT * FROM persona WHERE idpersona = $1`, [persona.idpersona]);
            if (resultPersona.rows.length) {
                const personaActual = resultPersona.rows[0];
                await client.query(`
                    UPDATE persona
                    SET nombres = COALESCE($2, nombres),
                        apepaterno = COALESCE($3, apepaterno),
                        apematerno = COALESCE($4, apematerno),
                        dni = COALESCE($5, dni),
                        sexo = COALESCE($6, sexo)
                    WHERE idpersona = $1
                `, [
                    persona.idpersona,
                    persona.nombres || personaActual.nombres,
                    persona.apepaterno || personaActual.apepaterno,
                    persona.apematerno || personaActual.apematerno,
                    persona.dni || personaActual.dni,
                    persona.sexo || personaActual.sexo
                ]);
            }
        }

        // Actualizar empresa si existe
        if (empresa) {
            const resultEmpresa = await client.query(`SELECT * FROM empresa WHERE idempresa = $1`, [empresa.idempresa]);
            if (resultEmpresa.rows.length) {
                const empresaActual = resultEmpresa.rows[0];
                await client.query(`
                    UPDATE empresa
                    SET nombreempresa = COALESCE($2, nombreempresa),
                        ruc = COALESCE($3, ruc),
                        f_creacion = COALESCE($4, f_creacion),
                        tipopersona = COALESCE($5, tipopersona)
                    WHERE idempresa = $1
                `, [
                    empresa.idempresa,
                    empresa.nombreempresa || empresaActual.nombreempresa,
                    empresa.ruc || empresaActual.ruc,
                    empresa.f_creacion || empresaActual.f_creacion,
                    empresa.tipopersona || empresaActual.tipopersona
                ]);
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Usuario actualizado correctamente', data: updatedUser.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error editando usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        client.release();
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
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});


// Obtener usuario por ID (con persona o empresa)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Usuario
        const resultUser = await query(`
            SELECT u.idusuario, u.aliasusuario, u.correousuario, u.numerousuario, u.direccionusuario, ur.idrol, r.rolusuario
            FROM usuario u
            LEFT JOIN usuario_roles ur ON u.idusuario = ur.idusuario
            LEFT JOIN rol_usuario r ON ur.idrol = r.idrol
            WHERE u.idusuario = $1
        `, [id]);

        if (!resultUser.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
        const usuario = resultUser.rows[0];

        // Persona
        const resultPersona = await query(`SELECT * FROM persona WHERE idusuario = $1`, [id]);
        const persona = resultPersona.rows[0] || null;

        // Empresa
        const resultEmpresa = await query(`SELECT * FROM empresa WHERE idusuario = $1`, [id]);
        const empresa = resultEmpresa.rows[0] || null;

        res.json({ usuario, persona, empresa });
    } catch (error) {
        console.error('Error obteniendo usuario completo:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;