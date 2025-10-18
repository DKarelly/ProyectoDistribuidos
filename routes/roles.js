const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

/* ============================================================
   🔹 ROLES (ROL_USUARIO)
============================================================ */
// Listar roles
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await query('SELECT * FROM rol_usuario ORDER BY idrol ASC');
        res.json({ message: 'Roles obtenidos', data: result.rows });
    } catch (error) {
        console.error('❌ Error obteniendo roles:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Registrar rol
router.post('/', authenticateToken, async (req, res) => {
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
router.put('/:id', authenticateToken, async (req, res) => {
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
router.delete('/:id', authenticateToken, async (req, res) => {
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

module.exports = router; // ← no olvides esto
