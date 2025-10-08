const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('./auth');
const router = express.Router();

// GET /api/users/perfil
router.get('/perfil', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idUsuario;

        const result = await query(`
            SELECT 
                u.idUsuario,
                u.aliasUsuario,
                u.nombreUsuario,
                u.apellidoPaternoUsuario,
                u.apellidoMaternoUsuario,
                u.correoUsuario,
                u.numeroUsuario,
                u.direccionUsuario,
                r.rolUsuario
            FROM usuario u
            JOIN rol r ON u.idRol = r.idRol
            WHERE u.idUsuario = $1
        `, [idUsuario]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const user = result.rows[0];
        // Remover contraseña del resultado
        delete user.contrasenausuario;

        res.json({
            message: 'Perfil obtenido exitosamente',
            data: { usuario: user }
        });

    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/users/perfil
router.put('/perfil', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idUsuario;
        const { 
            aliasUsuario, 
            nombreUsuario, 
            apellidoPaternoUsuario, 
            apellidoMaternoUsuario,
            numeroUsuario, 
            direccionUsuario 
        } = req.body;

        const result = await query(`
            UPDATE usuario 
            SET 
                aliasUsuario = COALESCE($2, aliasUsuario),
                nombreUsuario = COALESCE($3, nombreUsuario),
                apellidoPaternoUsuario = COALESCE($4, apellidoPaternoUsuario),
                apellidoMaternoUsuario = COALESCE($5, apellidoMaternoUsuario),
                numeroUsuario = COALESCE($6, numeroUsuario),
                direccionUsuario = COALESCE($7, direccionUsuario)
            WHERE idUsuario = $1
            RETURNING idUsuario, aliasUsuario, nombreUsuario, apellidoPaternoUsuario, 
                     apellidoMaternoUsuario, numeroUsuario, direccionUsuario
        `, [idUsuario, aliasUsuario, nombreUsuario, apellidoPaternoUsuario, 
            apellidoMaternoUsuario, numeroUsuario, direccionUsuario]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({
            message: 'Perfil actualizado exitosamente',
            data: { usuario: result.rows[0] }
        });

    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/users/adopciones
router.get('/adopciones', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idUsuario;

        const result = await query(`
            SELECT 
                a.idAdopcion,
                a.fechaAdopcion,
                a.horaAdopcion,
                a.estadoAdopcion,
                an.nombreAnimal,
                an.edadMesesAnimal,
                an.generoAnimal,
                r.razaAnimal,
                e.especieAnimal
            FROM adopcion a
            JOIN animal an ON a.idAnimal = an.idAnimal
            JOIN raza r ON an.idRaza = r.idRaza
            JOIN especie e ON r.idEspecie = e.idEspecie
            WHERE a.idUsuario = $1
            ORDER BY a.fechaAdopcion DESC, a.horaAdopcion DESC
        `, [idUsuario]);

        res.json({
            message: 'Adopciones obtenidas exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo adopciones:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/users/donaciones
router.get('/donaciones', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idUsuario;

        const result = await query(`
            SELECT 
                dd.idDetalleDonacion,
                dd.cantidadDonacion,
                dd.detalleDonacion,
                cd.categoria,
                d.fechaDonacion,
                d.horaDonacion
            FROM detalle_donacion dd
            JOIN donacion d ON dd.idDonacion = d.idDonacion
            JOIN categoria_donacion cd ON dd.idCategoria = cd.idCategoria
            WHERE d.idUsuario = $1
            ORDER BY d.fechaDonacion DESC, d.horaDonacion DESC
        `, [idUsuario]);

        res.json({
            message: 'Donaciones obtenidas exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo donaciones:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;

