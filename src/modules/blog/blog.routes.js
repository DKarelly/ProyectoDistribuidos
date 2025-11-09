const express = require('express');
const { query } = require('../../config/database');
const { authenticateToken } = require('../auth/auth.routes');

const router = express.Router();

/* ===============================
   🐾 RUTA 1: Obtener todos los animales
   =============================== */
router.get('/animales', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                idanimal,
                nombreanimal AS nombre,
                especie,
                genero,
                edadmeses,
                imagen1,
                imagen2
            FROM animal
            ORDER BY idanimal
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener animales:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/* ===============================
   🐾 RUTA 2: Obtener detalle de un animal
   =============================== */
router.get('/animales/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT 
                a.idanimal,
                a.nombreanimal AS nombre,
                a.especie,
                a.genero,
                a.edadmeses,
                a.imagen1,
                a.imagen2,
                d.medicinas,
                d.gravedadenfermedad AS gravedad,
                d.estadoenfermedad AS estado,
                e.nombreenfermedad AS enfermedad
            FROM animal a
            LEFT JOIN detalle_enfermedad d ON a.idhistorial = d.idhistorial
            LEFT JOIN enfermedad e ON d.idenfermedad = e.idenfermedad
            WHERE a.idanimal = $1
        `, [id]);

        if (!result.rows.length) {
            return res.status(404).json({ message: 'Animal no encontrado' });
        }

        const animal = result.rows[0];

        // En caso de no tener imágenes, usar placeholders
        animal.imagen1 = animal.imagen1 || `https://placehold.co/400x300?text=${animal.nombre}+1`;
        animal.imagen2 = animal.imagen2 || `https://placehold.co/400x300?text=${animal.nombre}+2`;

        res.json(animal);
    } catch (error) {
        console.error('Error al obtener detalle del animal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

/* ===============================
   🐾 RUTA 3: Apadrinar animal (ya existente)
   =============================== */
router.post('/apadrinar', authenticateToken, async (req, res) => {
    try {
        const { animal } = req.body;
        const idUsuario = req.user.idusuario;

        if (!animal) return res.status(400).json({ message: 'Nombre del animal es requerido' });

        // Buscar el animal por nombre
        const animalResult = await query(`
            SELECT idanimal, nombreanimal
            FROM animal
            WHERE nombreanimal = $1
        `, [animal]);

        if (!animalResult.rows.length) return res.status(400).json({ message: 'Animal no encontrado' });

        const idAnimal = animalResult.rows[0].idanimal;

        // Verificar si ya existe un apadrinamiento activo
        const existingApadrinamiento = await query(`
            SELECT idapadrinamiento FROM apadrinamiento
            WHERE idanimal = $1
        `, [idAnimal]);

        if (existingApadrinamiento.rows.length)
            return res.status(400).json({ message: 'Este animal ya está apadrinado' });

        // Crear donación
        const donacionResult = await query(`
            INSERT INTO donacion (f_donacion, h_donacion, idusuario)
            VALUES (CURRENT_DATE, CURRENT_TIME, $1)
            RETURNING iddonacion
        `, [idUsuario]);

        const idDonacion = donacionResult.rows[0].iddonacion;

        // Crear apadrinamiento
        const apadrinamientoResult = await query(`
            INSERT INTO apadrinamiento (f_inicio, frecuencia, iddonacion, idanimal)
            VALUES (CURRENT_DATE, 'Mensual', $1, $2)
            RETURNING idapadrinamiento
        `, [idDonacion, idAnimal]);

        res.status(201).json({
            success: true,
            message: 'Apadrinamiento registrado exitosamente',
            data: {
                idApadrinamiento: apadrinamientoResult.rows[0].idapadrinamiento,
                animal: animalResult.rows[0].nombreanimal,
                frecuencia: 'Mensual'
            }
        });
    } catch (error) {
        console.error('Error creando apadrinamiento:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;
