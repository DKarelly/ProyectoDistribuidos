const express = require('express');
const { query } = require('../../config/database');
const { authenticateToken } = require('../auth/auth.routes');
const router = express.Router();

// ==========================
// LISTAR ADOPCIONES
// ==========================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT
          ad.f_adopcion AS fechaAdopcion,
          ad.direccionAdoptante AS dirAdoptante,
          ad.estadoAdopcion AS estadoAdop,
          an.nombreAnimal AS animal,
          (p_adoptante.nombres || ' ' || p_adoptante.apePaterno || ' ' || p_adoptante.apeMaterno) AS Adoptante,
          COALESCE(
              e.nombreEmpresa,
              (p_entregante.nombres || ' ' || p_entregante.apePaterno || ' ' || p_entregante.apeMaterno)
          ) AS Entregante
      FROM adopcion ad
      INNER JOIN animal an ON an.idAnimal = ad.idAnimal
      INNER JOIN persona p_adoptante ON p_adoptante.idPersona = ad.idPersona
      INNER JOIN usuario us_entregante ON us_entregante.idUsuario = ad.idEntregante
      LEFT JOIN empresa e ON e.idUsuario = us_entregante.idUsuario 
      LEFT JOIN persona p_entregante ON p_entregante.idUsuario = us_entregante.idUsuario
      ORDER BY ad.f_adopcion DESC;
    `);
    res.json({ message: 'Adopciones obtenidas', data: result.rows });
  } catch (error) {
    console.error('Error obteniendo adopciones:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==========================
// LISTAR SOLICITUDES
// ==========================
router.get('/solicitud', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT
          ad.f_solicitud AS fechaSolicitud,
          ad.motivoAdopcion AS comentario,
          ad.estadoAdopcion AS estadoSolic,
          an.nombreAnimal AS animal,
          (p_adoptante.nombres || ' ' || p_adoptante.apePaterno || ' ' || p_adoptante.apeMaterno) AS Solicitante,
          COALESCE(
              e.nombreEmpresa,
              (p_entregante.nombres || ' ' || p_entregante.apePaterno || ' ' || p_entregante.apeMaterno)
          ) AS Entregante
      FROM adopcion ad
      INNER JOIN animal an ON an.idAnimal = ad.idAnimal
      INNER JOIN persona p_adoptante ON p_adoptante.idPersona = ad.idPersona
      INNER JOIN usuario us_entregante ON us_entregante.idUsuario = ad.idEntregante
      LEFT JOIN empresa e ON e.idUsuario = us_entregante.idUsuario 
      LEFT JOIN persona p_entregante ON p_entregante.idUsuario = us_entregante.idUsuario
      ORDER BY ad.f_solicitud DESC;
    `);
    res.json({ message: 'Solicitudes obtenidas', data: result.rows });
  } catch (error) {
    console.error('Error obteniendo solicitudes:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==========================
// REGISTRAR SOLICITUD
// ==========================
router.post('/registrar_solicitud', authenticateToken, async (req, res) => {
  try {
    const { motivo, idAnimal, idPersona, idEntregante } = req.body;

    if (!motivo || !idAnimal || !idPersona || !idEntregante) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    const result = await query(`
      INSERT INTO adopcion (f_solicitud, estadoAdopcion, motivoAdopcion, idAnimal, idPersona, idEntregante)
      VALUES (CURRENT_DATE, 'Pendiente', $1, $2, $3, $4)
      RETURNING *;
    `, [motivo, idAnimal, idPersona, idEntregante]);

    res.status(201).json({ message: 'Solicitud registrada', data: result.rows[0] });
  } catch (error) {
    console.error('Error registrando solicitud:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==========================
// REGISTRAR ADOPCIÓN
// ==========================
router.put('/registrar_adopcion/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fechaAdopcion, contrato, condiciones, direccionAdoptante } = req.body;

    const estadoFinal = (!fechaAdopcion || !contrato || !condiciones || !direccionAdoptante)
      ? 'En proceso'
      : 'Completada';

    const result = await query(`
      UPDATE adopcion
      SET 
        f_adopcion = COALESCE($1, f_adopcion),
        contrato = COALESCE($2, contrato),
        condiciones = COALESCE($3, condiciones),
        direccionAdoptante = COALESCE($4, direccionAdoptante),
        estadoAdopcion = $5
      WHERE idAdopcion = $6
      RETURNING *;
    `, [fechaAdopcion, contrato, condiciones, direccionAdoptante, estadoFinal, id]);

    if (!result.rows.length)
      return res.status(404).json({ message: 'Adopción no encontrada' });

    const mensaje = estadoFinal === 'Completada'
      ? 'Adopción registrada y completada'
      : 'Adopción registrada pero pendiente de completar documentos';

    res.json({ message: mensaje, data: result.rows[0] });
  } catch (error) {
    console.error('Error registrando adopción:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==========================
// CAMBIAR ESTADO DE SOLICITUD
// ==========================
router.put('/estado_solicitud/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { estadoAdopcion } = req.body;

    const estadosValidos = ['EN PROCESO', 'RECHAZADO'];
    if (!estadoAdopcion || !estadosValidos.includes(estadoAdopcion.toUpperCase())) {
      return res.status(400).json({
        message: `Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}`
      });
    }

    const result = await query(`
      UPDATE adopcion
      SET estadoAdopcion = $1
      WHERE idAdopcion = $2
      RETURNING *;
    `, [estadoAdopcion.toUpperCase(), id]);

    if (!result.rows.length)
      return res.status(404).json({ message: 'Adopción no encontrada.' });

    const mensaje = estadoAdopcion.toUpperCase() === 'EN PROCESO'
      ? 'Adopción en proceso 🐾'
      : 'Adopción rechazada ❌';

    res.json({ message: mensaje, data: result.rows[0] });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// ==========================
// CANCELAR ADOPCIÓN
// ==========================
router.put('/cancelar_adopcion/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      UPDATE adopcion
      SET estadoAdopcion = 'Cancelada'
      WHERE idAdopcion = $1
      RETURNING *;
    `, [id]);

    if (!result.rows.length)
      return res.status(404).json({ message: 'Adopción no encontrada.' });

    res.json({
      message: 'Adopción cancelada correctamente.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error cancelando adopción:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==========================
// ELIMINAR SOLICITUD / ADOPCIÓN
// ==========================
router.delete('/eliminar/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      DELETE FROM adopcion
      WHERE idAdopcion = $1
      RETURNING idAdopcion;
    `, [id]);

    if (!result.rows.length)
      return res.status(404).json({ message: 'Registro no encontrado.' });

    res.json({ message: `Registro con ID ${id} eliminado.`, data: result.rows[0] });
  } catch (error) {
    console.error('Error eliminando registro:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// ==========================
// BÚSQUEDA DE ANIMAL
// ==========================
router.get('/busqueda_animal/:nombreAnimal', authenticateToken, async (req, res) => {
  try {
    const { nombreAnimal } = req.params;

    const result = await query(`
      SELECT
        a.idanimal,
        us.idusuario,
        a.nombreanimal,
        a.edadmesesanimal,
        a.generoanimal,
        a.pesoanimal,
        a.pelaje,
        a.tamano,
        r.razaanimal,
        e.especieanimal,
        (
          SELECT g.imagen
          FROM galeria g
          WHERE g.idanimal = a.idanimal
          AND g.imagen IS NOT NULL
          LIMIT 1
        ) AS imagen,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM adopcion ad2
            WHERE ad2.idanimal = a.idanimal
            AND ad2.estadoadopcion = 'Aprobada'
          ) THEN 'adoptado'
          WHEN EXISTS (
            SELECT 1 FROM adopcion ad2
            WHERE ad2.idanimal = a.idanimal
            AND ad2.estadoadopcion = 'En proceso'
          ) THEN 'en_proceso'
          ELSE 'disponible'
        END AS estado
      FROM animal a
      JOIN caso_animal ca ON a.idanimal = ca.idanimal
      JOIN usuario us ON ca.idusuario = us.idusuario
      JOIN raza r ON a.idraza = r.idraza
      JOIN especie e ON r.idespecie = e.idespecie
      WHERE LOWER(a.nombreanimal) LIKE LOWER($1);
    `, [`%${nombreAnimal}%`]);

    if (!result.rows.length)
      return res.status(404).json({ message: 'Animal no encontrado.' });

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error en búsqueda de animal:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// ==========================
// BÚSQUEDA DE PERSONA
// ==========================
router.get('/busqueda_persona/:nombrePersona', authenticateToken, async (req, res) => {
  try {
    const { nombrePersona } = req.params;

    const result = await query(`
      SELECT
        pe.idPersona,
        (pe.nombres || ' ' || pe.apepaterno || ' ' || pe.apematerno) AS nombrecompleto,
        pe.dni, 
        pe.sexo, 
        us.direccionusuario, 
        us.numerousuario, 
        us.correousuario
      FROM usuario us
      INNER JOIN persona pe ON us.idusuario = pe.idusuario
      INNER JOIN usuario_roles ur ON us.idusuario = ur.idusuario
      INNER JOIN rol_usuario ru ON ur.idrol = ru.idrol
      WHERE ru.rolusuario = 'Adoptante'
      AND LOWER(pe.nombres || ' ' || pe.apepaterno || ' ' || pe.apematerno) LIKE LOWER($1)
      LIMIT 1;
    `, [`%${nombrePersona}%`]);

    if (!result.rows.length)
      return res.status(404).json({ message: 'Adoptante no encontrado.' });

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error en búsqueda de adoptante:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

module.exports = router;
