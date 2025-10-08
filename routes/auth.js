const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const router = express.Router();

// Middleware para verificar token JWT
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

// POST /api/auth/registro
router.post('/registro', [
    body('aliasUsuario').notEmpty().withMessage('Alias es requerido'),
    body('nombreUsuario').notEmpty().withMessage('Nombre es requerido'),
    body('apellidoPaternoUsuario').notEmpty().withMessage('Apellido paterno es requerido'),
    body('correoUsuario').isEmail().withMessage('Email válido requerido'),
    body('contrasenaUsuario').isLength({ min: 4 }).withMessage('Contraseña mínimo 4 caracteres')
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
            nombreUsuario, 
            apellidoPaternoUsuario, 
            apellidoMaternoUsuario,
            correoUsuario, 
            contrasenaUsuario,
            numeroUsuario,
            direccionUsuario
        } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await query(
            'SELECT idUsuario FROM usuario WHERE correoUsuario = $1 OR aliasUsuario = $2',
            [correoUsuario, aliasUsuario]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Usuario o email ya registrado' });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(contrasenaUsuario, 10);

        // Insertar usuario (por defecto rol 2 = Adoptante)
        const result = await query(
            `INSERT INTO usuario (idRol, aliasUsuario, nombreUsuario, apellidoPaternoUsuario, 
             apellidoMaternoUsuario, correoUsuario, contrasenaUsuario, numeroUsuario, direccionUsuario)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING idUsuario, aliasUsuario, correoUsuario`,
            [2, aliasUsuario, nombreUsuario, apellidoPaternoUsuario, apellidoMaternoUsuario,
             correoUsuario, hashedPassword, numeroUsuario, direccionUsuario]
        );

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            data: {
                usuario: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/auth/login
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

        const { correoUsuario, contrasenaUsuario } = req.body;

        // Buscar usuario
        const userResult = await query(
            `SELECT u.*, r.rolUsuario FROM usuario u 
             JOIN rol r ON u.idRol = r.idRol 
             WHERE u.correoUsuario = $1`,
            [correoUsuario]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const user = userResult.rows[0];

        // Verificar contraseña
        const validPassword = await bcrypt.compare(contrasenaUsuario, user.contrasenausuario);
        if (!validPassword) {
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
                    nombreUsuario: user.nombreusuario,
                    apellidoPaternoUsuario: user.apellidopaternousuario,
                    apellidoMaternoUsuario: user.apellidomaternousuario,
                    correoUsuario: user.correousuario,
                    rolUsuario: user.rolusuario
                }
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/auth/verify
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        const userResult = await query(
            `SELECT u.*, r.rolUsuario FROM usuario u 
             JOIN rol r ON u.idRol = r.idRol 
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
                    nombreUsuario: user.nombreusuario,
                    apellidoPaternoUsuario: user.apellidopaternousuario,
                    apellidoMaternoUsuario: user.apellidomaternousuario,
                    correoUsuario: user.correousuario,
                    rolUsuario: user.rolusuario
                }
            }
        });

    } catch (error) {
        console.error('Error verificando token:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = { router, authenticateToken };

