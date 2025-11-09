const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query, getClient } = require('../../config/database');

/* ------------------ MIDDLEWARE DE TOKEN ------------------ */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token requerido' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido' });
        req.user = user;
        next();
    });
}

/* ------------------ REGISTRO CLIENTE ------------------ */
router.post('/registro', [
    body('aliasUsuario').notEmpty().isLength({ max: 30 }),
    body('correoUsuario').isEmail().isLength({ max: 50 }),
    body('claveusuario').isLength({ min: 4, max: 100 }),
    body('numUsuario').notEmpty().isLength({ max: 9 }),
    body('direccionUsuario').notEmpty().isLength({ max: 100 }),
    body('tipoPersona').isIn(['persona', 'empresa']), // ahora depende de tipoPersona
    // Persona
    body('nombreUsuario').if(body('tipoPersona').equals('persona')).notEmpty().isLength({ max: 30 }),
    body('apellidoPaternoUsuario').if(body('tipoPersona').equals('persona')).notEmpty().isLength({ max: 30 }),
    body('apellidoMaternoUsuario').if(body('tipoPersona').equals('persona')).notEmpty().isLength({ max: 30 }),
    body('dni').if(body('tipoPersona').equals('persona')).isLength({ min: 8, max: 8 }),
    body('sexo').if(body('tipoPersona').equals('persona')).isIn(['M', 'F']),
    // Empresa
    body('nombreEmpresa').if(body('tipoPersona').equals('empresa')).notEmpty().isLength({ max: 50 }),
    body('tipoPersonaEmpresa').if(body('tipoPersona').equals('empresa')).notEmpty().isLength({ max: 30 }),
    body('ruc').if(body('tipoPersona').equals('empresa')).notEmpty().isLength({ max: 20 }),
    body('fechaCreacion').if(body('tipoPersona').equals('empresa')).isDate()
], async (req, res) => {
    const client = await getClient();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ message: 'Datos inválidos', errors: errors.array() });

        const {
            aliasUsuario, correoUsuario, claveusuario,
            numUsuario, direccionUsuario, tipoPersona,
            nombreUsuario, apellidoPaternoUsuario, apellidoMaternoUsuario, dni, sexo,
            nombreEmpresa, tipoPersonaEmpresa, ruc, fechaCreacion
        } = req.body;

        const esEmpresa = tipoPersona === "empresa";
        const idRolCliente = 3; // Cliente por defecto
        const correoNormalizado = correoUsuario.trim().toLowerCase();
        const aliasNormalizado = aliasUsuario.trim().toLowerCase();

        // Verificar duplicados
        const existingUser = await client.query(
            'SELECT idusuario FROM usuario WHERE LOWER(correousuario) = $1 OR LOWER(aliasusuario) = $2',
            [correoNormalizado, aliasNormalizado]
        );
        if (existingUser.rows.length > 0) return res.status(400).json({ message: 'Usuario o email ya registrado' });

        await client.query('BEGIN');

        const hashedPassword = await bcrypt.hash(claveusuario, 10);
        const resultUser = await client.query(`
            INSERT INTO usuario(aliasusuario, correousuario, claveusuario, numerousuario, direccionusuario)
            VALUES ($1,$2,$3,$4,$5) RETURNING idusuario
        `, [aliasUsuario, correoNormalizado, hashedPassword, numUsuario, direccionUsuario]);

        const idUsuario = resultUser.rows[0].idusuario;

        // Asignar rol por defecto (Adoptante = idrol 2)
        await client.query(`
            INSERT INTO usuario_roles(idusuario, idrol)
            VALUES ($1, $2)
        `, [idUsuario, 2]);

        if (!esEmpresa) {
            await client.query(`
                INSERT INTO persona(nombres, apepaterno, apematerno, dni, sexo, idusuario)
                VALUES ($1,$2,$3,$4,$5,$6)
            `, [nombreUsuario, apellidoPaternoUsuario, apellidoMaternoUsuario, dni, sexo, idUsuario]);
        } else {
            await client.query(`
                INSERT INTO empresa(nombreempresa, tipopersona, ruc, f_creacion, idusuario)
                VALUES ($1,$2,$3,$4,$5)
            `, [nombreEmpresa, tipoPersonaEmpresa, ruc, fechaCreacion, idUsuario]);
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
        const { correoUsuario, claveusuario } = req.body;

        if (!correoUsuario || !claveusuario) {
            return res.status(400).json({ message: 'Correo y contraseña son requeridos' });
        }

        const correoNormalizado = correoUsuario.trim().toLowerCase();

        const userResult = await query(`
            SELECT u.*, ur.idrol 
            FROM usuario u 
            LEFT JOIN usuario_roles ur ON u.idusuario = ur.idusuario 
            WHERE LOWER(u.correousuario) = $1
        `, [correoNormalizado]);
        if (!userResult.rows.length) return res.status(400).json({ message: 'Usuario no encontrado' });

        const user = userResult.rows[0];
        console.log('Usuario logeado:', user.aliasusuario, 'Rol:', user.idrol);

        // Verificar si la contraseña existe en la base de datos
        if (!user.claveusuario) {
            return res.status(400).json({ message: 'Usuario no tiene contraseña configurada. Contacta al administrador.' });
        }

        const passwordMatch = await bcrypt.compare(claveusuario, user.claveusuario);
        if (!passwordMatch) return res.status(400).json({ message: 'Contraseña incorrecta' });

        const token = jwt.sign(
            { idusuario: user.idusuario, idrol: user.idrol },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        // Solo enviar campos necesarios
        const usuarioData = {
            idusuario: user.idusuario,
            aliasusuario: user.aliasusuario,
            correousuario: user.correousuario,
            numerousuario: user.numerousuario,
            direccionusuario: user.direccionusuario,
            idrol: user.idrol
        };

        res.json({
            message: 'Login exitoso',
            data: { usuario: usuarioData, token }
        });

    } catch (error) {
        console.error('Error login:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/* ------------------ VERIFY TOKEN ------------------ */
router.get('/verify', authenticateToken, (req, res) => {
    // Devuelve los datos básicos del usuario extraídos del token
    res.json({ message: 'Token válido', data: req.user });
});

module.exports = { router, authenticateToken };