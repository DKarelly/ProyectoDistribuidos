const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const router = express.Router();

/* ------------------ MIDDLEWARE DE TOKEN ------------------ */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token de acceso requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

/* ------------------ REGISTRO ------------------ */
router.post('/registro', [
    body('aliasUsuario').notEmpty().withMessage('Alias es requerido'),
    body('correoUsuario').isEmail().withMessage('Email válido requerido'),
    body('contrasenaUsuario').isLength({ min: 4 }).withMessage('Contraseña mínimo 4 caracteres'),
    body('numUsuario').notEmpty().withMessage('Número es requerido'),
    body('direccionUsuario').notEmpty().withMessage('Dirección es requerida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Datos inválidos',
                errors: errors.array()
            });
        }

        const {
            aliasUsuario,
            correoUsuario,
            contrasenaUsuario,
            numUsuario,
            direccionUsuario
        } = req.body;

        // Normalizar correo (minúsculas + trim)
        const correoNormalizado = correoUsuario.trim().toLowerCase();

        // Verificar si el usuario ya existe
        const existingUser = await query(
            'SELECT idUsuario FROM usuario WHERE LOWER(correoUsuario) = $1 OR LOWER(aliasUsuario) = $2',
            [correoNormalizado, aliasUsuario.trim().toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Usuario o email ya registrado' });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(contrasenaUsuario, 10);

        // Insertar usuario (por defecto rol 2 = Adoptante)
        const result = await query(
            `INSERT INTO usuario (aliasUsuario, correoUsuario, claveUsuario, numUsuario, direccionUsuario, idRol)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING idUsuario, aliasUsuario, correoUsuario, idRol`,
            [aliasUsuario, correoNormalizado, hashedPassword, numUsuario, direccionUsuario, 2]
        );

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            data: { usuario: result.rows[0] }
        });

    } catch (error) {
        console.error('❌ Error en registro:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/* ------------------ LOGIN ------------------ */
router.post('/login', [
    body('correoUsuario').isEmail().withMessage('Email válido requerido'),
    body('contrasenaUsuario').notEmpty().withMessage('Contraseña requerida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Datos inválidos',
                errors: errors.array()
            });
        }

        let { correoUsuario, contrasenaUsuario } = req.body;
        correoUsuario = correoUsuario.trim().toLowerCase();

        console.log('🟢 Intentando login con:', correoUsuario);

        // Buscar usuario ignorando mayúsculas
        const userResult = await query(
            `SELECT u.*, r.rolUsuario 
             FROM usuario u 
             JOIN ROL_USUARIO r ON u.idRol = r.idRol
             WHERE LOWER(u.correoUsuario) = $1`,
            [correoUsuario]
        );

        console.log('⏱️ Query ejecutada:', {
            text: 'SELECT u.*, r.rolUsuario FROM usuario u JOIN ROL_USUARIO r ON u.idRol = r.idRol WHERE LOWER(u.correoUsuario) = $1',
            rows: userResult.rowCount
        });

        if (userResult.rows.length === 0) {
            console.log('⚠️ Usuario no encontrado.');
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const user = userResult.rows[0];
        console.log('✅ Usuario encontrado:', user.correousuario);

        // Verificar contraseña
        //const validPassword = await bcrypt.compare(contrasenaUsuario, user.claveusuario);
        // Verificar contraseña
        let validPassword = false;

        // Si la contraseña guardada parece un hash bcrypt (empieza con "$2")
        if (user.claveusuario.startsWith('$2')) {
            validPassword = await bcrypt.compare(contrasenaUsuario, user.claveusuario);
        } else {
            // Comparación directa si la contraseña está en texto plano (modo local)
            validPassword = contrasenaUsuario === user.claveusuario;
        }

        console.log('🔑 Contraseña válida:', validPassword);

        if (!validPassword) {
            console.log('❌ Contraseña incorrecta.');
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Generar token JWT
        const token = jwt.sign(
            {
                idUsuario: user.idusuario,
                aliasUsuario: user.aliasusuario,
                rolUsuario: user.rolusuario
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login exitoso',
            data: {
                token,
                usuario: {
                    idUsuario: user.idusuario,
                    aliasUsuario: user.aliasusuario,
                    correoUsuario: user.correousuario,
                    numUsuario: user.numusuario,
                    direccionUsuario: user.direccionusuario,
                    rolUsuario: user.rolusuario
                }
            }
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/* ------------------ VERIFY TOKEN ------------------ */
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        const userResult = await query(
            `SELECT u.*, r.rolUsuario 
             FROM usuario u 
             JOIN ROL_USUARIO r ON u.idRol = r.idRol
             WHERE u.idUsuario = $1`,
            [req.user.idUsuario]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const user = userResult.rows[0];
        res.json({
            message: 'Token válido',
            data: {
                usuario: {
                    idUsuario: user.idusuario,
                    aliasUsuario: user.aliasusuario,
                    correoUsuario: user.correousuario,
                    numUsuario: user.numusuario,
                    direccionUsuario: user.direccionusuario,
                    rolUsuario: user.rolusuario
                }
            }
        });

    } catch (error) {
        console.error('❌ Error verificando token:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = { router, authenticateToken };
