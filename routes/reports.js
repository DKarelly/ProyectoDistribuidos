const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// POST /api/reports/crear
router.post('/crear', async (req, res) => {
    try {
        const { direccion, generoAnimal, gravedad, especieAnimal, situacion } = req.body;

        if (!direccion || !generoAnimal || !gravedad || !especieAnimal || !situacion) {
            return res.status(400).json({ 
                message: 'Todos los campos son requeridos' 
            });
        }

        // Generar código único para el reporte
        const codigoReporte = `REP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        // Por ahora guardamos en una tabla temporal o en una nueva tabla
        // Como no tenemos una tabla específica para reportes, usaremos una tabla temporal
        // En una implementación real, deberías crear una tabla 'reportes' en tu base de datos
        
        // Simulamos el guardado del reporte
        console.log('Reporte recibido:', {
            codigoReporte,
            direccion,
            generoAnimal,
            gravedad,
            especieAnimal,
            situacion,
            fechaReporte: new Date()
        });

        res.status(201).json({
            message: 'Reporte enviado exitosamente',
            data: {
                codigoReporte,
                fechaReporte: new Date().toISOString(),
                estado: 'Recibido'
            }
        });

    } catch (error) {
        console.error('Error creando reporte:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/reports/lista
router.get('/lista', async (req, res) => {
    try {
        // En una implementación real, esto consultaría la tabla de reportes
        // Por ahora devolvemos una lista vacía
        res.json({
            message: 'Lista de reportes obtenida exitosamente',
            data: []
        });

    } catch (error) {
        console.error('Error obteniendo lista de reportes:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/reports/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // En una implementación real, esto consultaría la tabla de reportes por ID
        res.status(404).json({ 
            message: 'Reporte no encontrado',
            data: null
        });

    } catch (error) {
        console.error('Error obteniendo reporte:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;

