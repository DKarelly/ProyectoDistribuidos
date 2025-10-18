const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');
const router = express.Router();

/* ------------------ MIDDLEWARE DE TOKEN ------------------ */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token requerido' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido' });
        req.user = user;
        next();
    });
};

/* ------------------ REGISTRO CLIENTE ------------------ */
router.post('/registro', [
    body('aliasUsuario').notEmpty(),
    body('correoUsuario').isEmail(),
    body('contrasenaUsuario').isLength({ min: 4 }),
    body('numUsuario').notEmpty(),
    body('direccionUsuario').notEmpty(),
    body('esEmpresa').isBoolean(),
    // Persona
    body('nombreUsuario').if(body('esEmpresa').equals(false)).notEmpty(),
    body('apellidoPaternoUsuario').if(body('esEmpresa').equals(false)).notEmpty(),
    body('apellidoMaternoUsuario').if(body('esEmpresa').equals(false)).notEmpty(),
    body('dni').if(body('esEmpresa').equals(false)).isLength({ min: 8, max: 8 }),
    body('sexo').if(body('esEmpresa').equals(false)).isIn(['M','F']),
    // Empresa
    body('nombreEmpresa').if(body('esEmpresa').equals(true)).notEmpty(),
    body('tipoPersona').if(body('esEmpresa').equals(true)).notEmpty(),
    body('ruc').if(body('esEmpresa').equals(true)).notEmpty(),
    body('f_creacion').if(body('esEmpresa').equals(true)).isDate()
], async (req, res) => {
    const client = await getClient();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ message: 'Datos inválidos', errors: errors.array() });

        const {
            aliasUsuario, correoUsuario, contrasenaUsuario,
            numUsuario, direccionUsuario, esEmpresa,
            nombreUsuario, apellidoPaternoUsuario, apellidoMaternoUsuario, dni, sexo,
            nombreEmpresa, tipoPersona, ruc, f_creacion
        } = req.body;

        // Solo clientes
        const idRolCliente = 3; // ejemplo: Cliente = 3

        const correoNormalizado = correoUsuario.trim().toLowerCase();

        // Verificar duplicados
        const existingUser = await client.query(
            'SELECT idusuario FROM usuario WHERE LOWER(correousuario) = $1 OR LOWER(aliasusuario) = $2',
            [correoNormalizado, aliasUsuario.trim().toLowerCase()]
        );
        if (existingUser.rows.length > 0) return res.status(400).json({ message: 'Usuario o email ya registrado' });

        await client.query('BEGIN');

        const hashedPassword = await bcrypt.hash(contrasenaUsuario, 10);
        const resultUser = await client.query(`
            INSERT INTO usuario(aliasusuario, correousuario, claveusuario, numusuario, direccionusuario, idrol)
            VALUES ($1,$2,$3,$4,$5,$6) RETURNING idusuario
        `, [aliasUsuario, correoNormalizado, hashedPassword, numUsuario, direccionUsuario, idRolCliente]);

        const idUsuario = resultUser.rows[0].idusuario;

        if (!esEmpresa) {
            await client.query(`
                INSERT INTO persona(nombres, apepaterno, apematerno, dni, sexo, idusuario)
                VALUES ($1,$2,$3,$4,$5,$6)
            `, [nombreUsuario, apellidoPaternoUsuario, apellidoMaternoUsuario, dni, sexo, idUsuario]);
        } else {
            await client.query(`
                INSERT INTO empresa(nombreempresa, tipopersona, ruc, f_creacion, idusuario)
                VALUES ($1,$2,$3,$4,$5)
            `, [nombreEmpresa, tipoPersona, ruc, f_creacion, idUsuario]);
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Cliente registrado exitosamente', idUsuario });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        client.release();
    }
});

/* ------------------ LOGIN ------------------ */
router.post('/login', async (req, res) => {
    try {
        const { correoUsuario, contrasenaUsuario } = req.body;
        const userResult = await query('SELECT * FROM usuario WHERE correousuario = $1', [correoUsuario]);
        if (!userResult.rows.length) return res.status(400).json({ message: 'Usuario no encontrado' });

        const user = userResult.rows[0];
        const passwordMatch = await bcrypt.compare(contrasenaUsuario, user.claveusuario);
        if (!passwordMatch) return res.status(400).json({ message: 'Contraseña incorrecta' });

        const token = jwt.sign({ idusuario: user.idusuario, idrol: user.idrol }, process.env.JWT_SECRET, { expiresIn: '12h' });
        res.json({ message: 'Login exitoso', data: { usuario: user, token } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = { router, authenticateToken };
