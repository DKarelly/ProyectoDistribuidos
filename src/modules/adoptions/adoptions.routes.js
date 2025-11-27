const express = require('express');
const { query } = require('../../config/database');
const { authenticateToken } = require('../auth/auth.routes');
const router = express.Router();

/* ========================================================
   1. MIS SOLICITUDES / ADOPCIONES DEL USUARIO LOGUEADO
======================================================== */
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const idUsuario = req.user.idusuario;

    const result = await query(`
      SELECT 
        sa.idSolicitudAdopcion,
        sa.f_solicitud AS fechaSolicitud,
        sa.estadoSolicitud,
        sa.motivoSolicitud,
        sa.observaciones,

        an.idAnimal,
        an.nombreAnimal,

        ad.idAdopcion,
        ad.f_adopcion AS fechaAdopcion,
        ad.contratoAdopcion,
        ad.condiciones

      FROM solicitud_adopcion sa
      INNER JOIN animal an ON an.idAnimal = sa.idAnimal
      LEFT JOIN adopcion ad ON ad.idSolicitudAdopcion = sa.idSolicitudAdopcion
      WHERE sa.idUsuario = $1
      ORDER BY sa.f_solicitud DESC, sa.idSolicitudAdopcion DESC
    `, [idUsuario]);

    res.json({ message: "Mis solicitudes y adopciones", data: result.rows });

  } catch (error) {
    console.error("Error obteniendo mis solicitudes:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/* ========================================================
   2. REGISTRAR UNA SOLICITUD DE ADOPCIÓN
======================================================== */
router.post('/registrar_solicitud', authenticateToken, async (req, res) => {
  try {
    const idUsuario = req.user.idusuario;
    const { motivoSolicitud, observaciones, idAnimal } = req.body;

    if (!motivoSolicitud || !idAnimal) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    const result = await query(`
      INSERT INTO solicitud_adopcion 
        (f_solicitud, motivoSolicitud, observaciones, idAnimal, idUsuario)
      VALUES (CURRENT_DATE, $1, $2, $3, $4)
      RETURNING *;
    `, [motivoSolicitud, observaciones || null, idAnimal, idUsuario]);

    res.status(201).json({
      message: "Solicitud registrada",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Error registrando solicitud:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/* ========================================================
   3. CAMBIAR ESTADO DE UNA SOLICITUD
======================================================== */
router.put('/estado_solicitud/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { estadoSolicitud } = req.body;

    const estadosValidos = ["PENDIENTE", "ACEPTADA", "RECHAZADA"];

    if (!estadoSolicitud || !estadosValidos.includes(estadoSolicitud)) {
      return res.status(400).json({
        message: `Estado inválido. Permitidos: ${estadosValidos.join(', ')}`
      });
    }

    const result = await query(`
      UPDATE solicitud_adopcion
      SET estadoSolicitud = $1
      WHERE idSolicitudAdopcion = $2
      RETURNING *;
    `, [estadoSolicitud, id]);

    if (!result.rows.length) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    // Si la solicitud fue ACEPTADA, inactivar apadrinamientos activos del animal
    if (estadoSolicitud === "ACEPTADA") {
      const idAnimal = result.rows[0].idanimal;
      
      const updateApadrinamientos = await query(`
        UPDATE apadrinamiento
        SET estado = 'Inactivo'
        WHERE idanimal = $1 AND estado = 'Activo'
        RETURNING idapadrinamiento;
      `, [idAnimal]);

      if (updateApadrinamientos.rows.length > 0) {
        console.log(`Se inactivaron ${updateApadrinamientos.rows.length} apadrinamiento(s) del animal ${idAnimal}`);
      }
    }

    res.json({
      message: `Estado actualizado a ${estadoSolicitud}`,
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Error cambiando estado:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/* ========================================================
   4. REGISTRAR UNA ADOPCIÓN (A partir de solicitud)
======================================================== */
router.post('/registrar_adopcion/:idSolicitud', authenticateToken, async (req, res) => {
  try {
    const { idSolicitud } = req.params;
    const {contratoAdopcion, condiciones } = req.body;

    const result = await query(`
      INSERT INTO adopcion (
        f_adopcion, contratoAdopcion, condiciones, idSolicitudAdopcion
      )
      VALUES (CURRENT_DATE, $1, $2, $3)
      RETURNING *;
    `, [
      contratoAdopcion || null,
      condiciones || null,
      idSolicitud
    ]);

    res.json({
      message: "Adopción registrada",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Error registrando adopción:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/* ========================================================
   5. LISTAR TODAS LAS SOLICITUDES
======================================================== */
router.get('/solicitud', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        sa.*, 
        an.nombreAnimal
      FROM solicitud_adopcion sa
      INNER JOIN animal an ON an.idAnimal = sa.idAnimal
      ORDER BY sa.f_solicitud DESC;
    `);

    res.json({ message: "Solicitudes obtenidas", data: result.rows });

  } catch (error) {
    console.error("Error obteniendo solicitudes:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/* ========================================================
   6. LISTAR ADOPCIONES
======================================================== */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        ad.*, 
        sa.idUsuario,
        an.nombreAnimal
      FROM adopcion ad
      INNER JOIN solicitud_adopcion sa ON sa.idSolicitudAdopcion = ad.idSolicitudAdopcion
      INNER JOIN animal an ON an.idAnimal = sa.idAnimal
      ORDER BY ad.f_adopcion DESC;
    `);

    res.json({ message: "Adopciones obtenidas", data: result.rows });

  } catch (error) {
    console.error("Error obteniendo adopciones:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/* ========================================================
   7. ELIMINAR SOLICITUD (si no tiene adopción)
======================================================== */
router.delete('/solicitud/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const tieneAdopcion = await query(`
      SELECT * FROM adopcion WHERE idSolicitudAdopcion = $1
    `, [id]);

    if (tieneAdopcion.rows.length) {
      return res.status(400).json({
        message: "No se puede eliminar: ya tiene adopción."
      });
    }

    const result = await query(`
      DELETE FROM solicitud_adopcion 
      WHERE idSolicitudAdopcion = $1
      RETURNING *;
    `, [id]);

    if (!result.rows.length)
      return res.status(404).json({ message: "Solicitud no encontrada." });

    res.json({ message: "Solicitud eliminada", data: result.rows[0] });

  } catch (error) {
    console.error("Error eliminando solicitud:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/* ========================================================
   8. BÚSQUEDA DE ANIMAL Y PERSONA POR NOMBRE (ADMIN)
   GET /api/adopciones/buscar?animalName=...&personName=...
======================================================== */
router.get('/buscar', authenticateToken, async (req, res) => {
    try {
        const { animalName, personName } = req.query;

        if (!animalName && !personName) {
            return res.status(400).json({
                message: "Debe proporcionar al menos 'animalName' o 'personName' para la búsqueda."
            });
        }

        let animalData = [];
        let personData = [];

        // 1. Búsqueda de Animal por nombre
        if (animalName) {
            const animalSearch = `%${animalName.toLowerCase()}%`;
            const resultAnimal = await query(`
                SELECT
                    a.idAnimal,
                    a.nombreAnimal,
                    a.generoAnimal,
                    a.edadMesesAnimal,
                    r.razaAnimal,
                    e.especieAnimal
                FROM animal a
                INNER JOIN raza r ON a.idRaza = r.idRaza
                INNER JOIN especie e ON r.idEspecie = e.idEspecie
                WHERE LOWER(a.nombreAnimal) LIKE $1
                LIMIT 10;
            `, [animalSearch]);
            animalData = resultAnimal.rows;
        }

        // 2. Búsqueda de Persona por nombre, apellido, nombre completo o DNI
        if (personName) {
            const personSearch = `%${personName.toLowerCase()}%`;
            const resultPerson = await query(`
                SELECT
                    p.idPersona,
                    p.nombres,
                    p.apePaterno,
                    p.apeMaterno,
                    p.dni,
                    u.idUsuario,
                    u.correoUsuario,
                    u.numeroUsuario,
                    u.direccionUsuario
                FROM persona p
                INNER JOIN usuario u ON p.idUsuario = u.idUsuario
                WHERE 
                        -- Búsqueda consolidada por nombre completo (PostgreSQL || para concatenar)
                    LOWER(p.nombres || ' ' || p.apePaterno || ' ' || p.apeMaterno) LIKE $1 OR
                        -- Búsqueda por DNI (si el usuario ingresó un número)
                        p.dni LIKE $1
                LIMIT 10;
            `, [personSearch]);
            personData = resultPerson.rows;
        }

        // 3. Devolver resultados
        res.json({
            message: "Resultados de búsqueda",
            data: {
                animales: animalData,
                personas: personData
            }
        });

    } catch (error) {
        console.error("Error en la búsqueda de recursos:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

module.exports = router;
