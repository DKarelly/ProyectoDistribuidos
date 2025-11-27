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
        sa.idsolicitudadopcion,
        sa.f_solicitud AS fechasolicitud,
        sa.estadosolicitud,
        sa.motivosolicitud,
        sa.observaciones,

        an.idanimal,
        an.nombreanimal,
        an.edadmesesanimal,
        an.generoanimal,
        an.pesoanimal,
        an.pelaje,
        an.tamano,
        
        r.razaanimal,
        e.especieanimal,
        
        (SELECT g.imagen FROM galeria g WHERE g.idanimal = an.idanimal LIMIT 1) AS imagenanimal,
        
        (SELECT ad.idadopcion FROM adopcion ad WHERE ad.idsolicitudadopcion = sa.idsolicitudadopcion LIMIT 1) AS idadopcion,
        (SELECT ad.f_adopcion FROM adopcion ad WHERE ad.idsolicitudadopcion = sa.idsolicitudadopcion LIMIT 1) AS fechaadopcion,
        (SELECT ad.contratoadopcion FROM adopcion ad WHERE ad.idsolicitudadopcion = sa.idsolicitudadopcion LIMIT 1) AS contratoadopcion,
        (SELECT ad.condiciones FROM adopcion ad WHERE ad.idsolicitudadopcion = sa.idsolicitudadopcion LIMIT 1) AS condiciones

      FROM solicitud_adopcion sa
      INNER JOIN animal an ON an.idanimal = sa.idanimal
      INNER JOIN raza r ON r.idraza = an.idraza
      INNER JOIN especie e ON e.idespecie = r.idespecie
      WHERE sa.idusuario = $1
      ORDER BY sa.f_solicitud DESC, sa.idsolicitudadopcion DESC
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
    const { motivoSolicitud, observaciones, idAnimal, idUsuario } = req.body;

    console.log("📝 Datos recibidos:", { motivoSolicitud, idAnimal, idUsuario });
    console.log("🔐 Usuario logueado:", req.user.idusuario);

    // Validaciones básicas
    if (!motivoSolicitud || !idAnimal) {
      return res.status(400).json({ message: "Faltan datos obligatorios (motivo y animal)" });
    }

    // CRÍTICO: Si viene idUsuario en el body, usarlo (admin registrando para alguien)
    // Si NO viene, usar el del token (usuario registrando para sí mismo)
    const idUsuarioFinal = idUsuario ? parseInt(idUsuario) : req.user.idusuario;

    console.log("👤 Usuario final para la solicitud:", idUsuarioFinal);

    if (!idUsuarioFinal) {
      return res.status(400).json({ message: "Debe especificar el usuario solicitante" });
    }

    // IMPORTANTE: Verificar que el usuario existe Y tiene datos de persona
    const personaExiste = await query(
      'SELECT p.idpersona, p.nombres, p.apepaterno FROM persona p WHERE p.idusuario = $1',
      [idUsuarioFinal]
    );

    if (!personaExiste.rows.length) {
      return res.status(400).json({ 
        message: "El usuario seleccionado no tiene datos de persona registrados. Solo usuarios con perfil de persona pueden adoptar." 
      });
    }

    console.log("👤 Persona encontrada:", personaExiste.rows[0]);

    // Verificar si ya existe una solicitud PENDIENTE o EN_REVISION para este animal por este usuario
    const solicitudExistente = await query(`
      SELECT idsolicitudadopcion, estadosolicitud 
      FROM solicitud_adopcion 
      WHERE idusuario = $1 AND idanimal = $2 AND estadosolicitud IN ('PENDIENTE', 'EN_REVISION')
    `, [idUsuarioFinal, idAnimal]);

    if (solicitudExistente.rows.length > 0) {
      return res.status(400).json({ 
        message: `Ya tienes una solicitud ${solicitudExistente.rows[0].estadosolicitud === 'PENDIENTE' ? 'pendiente' : 'en revisión'} para este animal. Debes esperar a que sea procesada.` 
      });
    }

    // Verificar si el animal ya fue adoptado
    const animalAdoptado = await query(`
      SELECT ad.idadopcion 
      FROM adopcion ad
      INNER JOIN solicitud_adopcion sa ON sa.idsolicitudadopcion = ad.idsolicitudadopcion
      WHERE sa.idanimal = $1
    `, [idAnimal]);

    if (animalAdoptado.rows.length > 0) {
      return res.status(400).json({ 
        message: "Este animal ya fue adoptado. Te invitamos a conocer otros animalitos que buscan un hogar." 
      });
    }

    const result = await query(`
      INSERT INTO solicitud_adopcion 
        (f_solicitud, motivosolicitud, observaciones, idanimal, idusuario, estadosolicitud)
      VALUES (CURRENT_DATE, $1, $2, $3, $4, 'PENDIENTE')
      RETURNING *;
    `, [motivoSolicitud, observaciones || null, idAnimal, idUsuarioFinal]);

    console.log("✅ Solicitud creada con ID:", result.rows[0].idsolicitudadopcion);

    res.status(201).json({
      message: "Solicitud registrada",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("❌ Error registrando solicitud:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
});

/* ========================================================
   3. CAMBIAR ESTADO DE UNA SOLICITUD
   - PENDIENTE → EN_REVISION (al ver)
   - EN_REVISION → APROBADO (al aceptar, registra adopción automáticamente)
   - EN_REVISION → RECHAZADO (al rechazar con observación)
======================================================== */
router.put('/estado_solicitud/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { estadoSolicitud, observaciones } = req.body;

    console.log("\n🔄 === CAMBIO DE ESTADO ===");
    console.log("ID Solicitud:", id);
    console.log("Estado recibido:", estadoSolicitud);
    console.log("Observaciones:", observaciones);
    console.log("Usuario que modifica:", req.user.idusuario);

    const estadoNormalizado = estadoSolicitud?.toUpperCase();
    console.log("Estado normalizado:", estadoNormalizado);
    const estadosValidos = ["PENDIENTE", "EN_REVISION", "APROBADO", "RECHAZADO"];

    if (!estadoNormalizado || !estadosValidos.includes(estadoNormalizado)) {
      return res.status(400).json({
        message: `Estado inválido. Permitidos: ${estadosValidos.join(', ')}`
      });
    }

    // Verificar que la solicitud existe y obtener su estado actual
    const solicitudActual = await query(`
      SELECT * FROM solicitud_adopcion WHERE idsolicitudadopcion = $1
    `, [id]);

    if (!solicitudActual.rows.length) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    // Si se va a RECHAZAR, verificar que tenga observación
    if (estadoNormalizado === 'RECHAZADO' && (!observaciones || observaciones.trim() === '')) {
      return res.status(400).json({
        message: "Debe proporcionar un motivo (observaciones) para rechazar la solicitud"
      });
    }

    // Actualizar el estado de la solicitud
    let result;
    if (observaciones && observaciones.trim() !== '') {
      // Si hay observaciones, actualizar ambos campos
      result = await query(`
        UPDATE solicitud_adopcion
        SET estadosolicitud = $1, observaciones = $3
        WHERE idsolicitudadopcion = $2
        RETURNING *;
      `, [estadoNormalizado, id, observaciones.trim()]);
    } else {
      // Si no hay observaciones, solo actualizar el estado
      result = await query(`
        UPDATE solicitud_adopcion
        SET estadosolicitud = $1
        WHERE idsolicitudadopcion = $2
        RETURNING *;
      `, [estadoNormalizado, id]);
    }

    console.log("✅ Estado actualizado correctamente");

    let adopcionCreada = null;

    // Si la solicitud fue APROBADO, crear la adopción automáticamente
    if (estadoNormalizado === "APROBADO") {
      const idAnimal = result.rows[0].idanimal;
      
      // Inactivar apadrinamientos activos del animal
      const updateApadrinamientos = await query(`
        UPDATE apadrinamiento
        SET estado = 'Inactivo'
        WHERE idanimal = $1 AND estado = 'Activo'
        RETURNING idapadrinamiento;
      `, [idAnimal]);

      if (updateApadrinamientos.rows.length > 0) {
        console.log(`Se inactivaron ${updateApadrinamientos.rows.length} apadrinamiento(s) del animal ${idAnimal}`);
      }

      // Verificar si ya existe una adopción para esta solicitud
      const adopcionExistente = await query(`
        SELECT * FROM adopcion WHERE idsolicitudadopcion = $1
      `, [id]);

      if (!adopcionExistente.rows.length) {
        // Crear la adopción automáticamente
        const nuevaAdopcion = await query(`
          INSERT INTO adopcion (
            f_adopcion, contratoadopcion, condiciones, idsolicitudadopcion
          )
          VALUES (CURRENT_DATE, 'Contrato de adopción estándar', 'Seguimiento mensual durante 6 meses', $1)
          RETURNING *;
        `, [id]);

        adopcionCreada = nuevaAdopcion.rows[0];
        console.log("💚 Adopción registrada automáticamente:", adopcionCreada.idadopcion);

        // RECHAZAR automáticamente las demás solicitudes del mismo animal
        const mensajeRechazo = `¡Gracias por tu interés! Lamentablemente este animalito ya encontró un hogar. Te invitamos a conocer a otros peluditos que también buscan una familia.`;
        
        const otrasRechazadas = await query(`
          UPDATE solicitud_adopcion
          SET estadosolicitud = 'RECHAZADO',
              observaciones = $1
          WHERE idanimal = $2 
            AND idsolicitudadopcion != $3
            AND estadosolicitud NOT IN ('APROBADO', 'RECHAZADO')
          RETURNING idsolicitudadopcion;
        `, [mensajeRechazo, idAnimal, id]);

        if (otrasRechazadas.rows.length > 0) {
          console.log(`🔄 Se rechazaron automáticamente ${otrasRechazadas.rows.length} solicitud(es) del mismo animal`);
        }
      }
    }

    res.json({
      message: estadoNormalizado === "APROBADO" 
        ? `Solicitud APROBADA y adopción registrada exitosamente` 
        : `Estado actualizado a ${estadoNormalizado}`,
      data: result.rows[0],
      adopcion: adopcionCreada
    });

  } catch (error) {
    console.error("❌ Error cambiando estado:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
});

/* ========================================================
   4. REGISTRAR UNA ADOPCIÓN (A partir de solicitud - usado por el flujo automático)
======================================================== */
router.post('/registrar_adopcion/:idSolicitud', authenticateToken, async (req, res) => {
  try {
    const { idSolicitud } = req.params;
    const {contratoAdopcion, condiciones } = req.body;

    // Verificar que la solicitud esté APROBADO
    const solicitud = await query(`
      SELECT estadosolicitud FROM solicitud_adopcion WHERE idsolicitudadopcion = $1
    `, [idSolicitud]);

    if (!solicitud.rows.length) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    if (solicitud.rows[0].estadosolicitud !== 'APROBADO') {
      return res.status(400).json({ 
        message: "Solo se pueden registrar adopciones de solicitudes APROBADAS" 
      });
    }

    const result = await query(`
      INSERT INTO adopcion (
        f_adopcion, contratoadopcion, condiciones, idsolicitudadopcion
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
    const { persona, animal, fecha } = req.query;
    
    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    // Filtro por persona (nombre o DNI)
    if (persona) {
      paramCount++;
      whereConditions.push(`(
        LOWER(CONCAT(p.nombres, ' ', p.apepaterno, ' ', p.apematerno)) LIKE $${paramCount}
        OR p.dni LIKE $${paramCount}
      )`);
      params.push(`%${persona.toLowerCase()}%`);
    }

    // Filtro por animal
    if (animal) {
      paramCount++;
      whereConditions.push(`LOWER(an.nombreanimal) LIKE $${paramCount}`);
      params.push(`%${animal.toLowerCase()}%`);
    }

    // Filtro por fecha
    if (fecha) {
      paramCount++;
      whereConditions.push(`sa.f_solicitud = $${paramCount}`);
      params.push(fecha);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const result = await query(`
      SELECT 
        sa.idsolicitudadopcion,
        sa.f_solicitud,
        sa.estadosolicitud,
        sa.motivosolicitud,
        sa.observaciones,
        sa.idusuario,
        an.nombreanimal,
        an.idanimal,
        p.nombres,
        p.apepaterno,
        p.apematerno,
        p.dni,
        u.correousuario,
        u.aliasusuario,
        COALESCE(
          CONCAT(p.nombres, ' ', p.apepaterno, ' ', p.apematerno),
          u.aliasusuario,
          u.correousuario,
          'Usuario #' || sa.idusuario
        ) as nombreusuario
      FROM solicitud_adopcion sa
      INNER JOIN animal an ON an.idanimal = sa.idanimal
      INNER JOIN usuario u ON u.idusuario = sa.idusuario
      LEFT JOIN persona p ON p.idusuario = u.idusuario
      ${whereClause}
      ORDER BY sa.f_solicitud DESC;
    `, params);

    console.log("📊 Solicitudes encontradas:", result.rows.length);
    if (result.rows.length > 0) {
      console.log("📋 Primera solicitud:", {
        id: result.rows[0].idsolicitudadopcion,
        idusuario: result.rows[0].idusuario,
        nombreusuario: result.rows[0].nombreusuario,
        nombreanimal: result.rows[0].nombreanimal,
        estado: result.rows[0].estadosolicitud
      });
    }

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
        ad.idadopcion,
        ad.f_adopcion,
        ad.contratoadopcion,
        ad.condiciones,
        ad.idsolicitudadopcion,
        sa.idusuario,
        an.nombreanimal,
        an.idanimal,
        p.nombres,
        p.apepaterno,
        p.apematerno,
        p.dni,
        u.correousuario,
        u.aliasusuario,
        COALESCE(
          CONCAT(p.nombres, ' ', p.apepaterno, ' ', p.apematerno),
          u.aliasusuario,
          u.correousuario,
          'Usuario #' || sa.idusuario
        ) as nombreusuario
      FROM adopcion ad
      INNER JOIN solicitud_adopcion sa ON sa.idsolicitudadopcion = ad.idsolicitudadopcion
      INNER JOIN animal an ON an.idanimal = sa.idanimal
      INNER JOIN usuario u ON u.idusuario = sa.idusuario
      LEFT JOIN persona p ON p.idusuario = u.idusuario
      ORDER BY ad.f_adopcion DESC;
    `);

    console.log("💚 Adopciones encontradas:", result.rows.length);
    if (result.rows.length > 0) {
      console.log("📋 Primera adopción:", {
        id: result.rows[0].idadopcion,
        nombreusuario: result.rows[0].nombreusuario,
        nombreanimal: result.rows[0].nombreanimal
      });
    }

    res.json({ message: "Adopciones obtenidas", data: result.rows });

  } catch (error) {
    console.error("Error obteniendo adopciones:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/* ========================================================
   7. VER DETALLE DE SOLICITUD (cambia estado a EN_REVISION si está PENDIENTE)
======================================================== */
router.get('/solicitud/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Primero obtener la solicitud actual
    const solicitudActual = await query(`
      SELECT estadosolicitud FROM solicitud_adopcion WHERE idsolicitudadopcion = $1
    `, [id]);

    if (!solicitudActual.rows.length) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    // Si está en PENDIENTE, cambiar a EN_REVISION automáticamente
    if (solicitudActual.rows[0].estadosolicitud === 'PENDIENTE') {
      await query(`
        UPDATE solicitud_adopcion
        SET estadosolicitud = 'EN_REVISION'
        WHERE idsolicitudadopcion = $1
      `, [id]);
      console.log(`📋 Solicitud #${id} cambió de PENDIENTE a EN_REVISION`);
    }

    // Obtener el detalle completo de la solicitud
    const result = await query(`
      SELECT 
        sa.idsolicitudadopcion,
        sa.f_solicitud,
        sa.estadosolicitud,
        sa.motivosolicitud,
        sa.observaciones,
        sa.idusuario,
        an.nombreanimal,
        an.idanimal,
        an.generoanimal,
        an.edadmesesanimal,
        r.razaanimal,
        e.especieanimal,
        p.nombres,
        p.apepaterno,
        p.apematerno,
        p.dni,
        u.correousuario,
        u.numerousuario,
        u.direccionusuario,
        COALESCE(
          CONCAT(p.nombres, ' ', p.apepaterno, ' ', p.apematerno),
          u.aliasusuario,
          u.correousuario,
          'Usuario #' || sa.idusuario
        ) as nombreusuario
      FROM solicitud_adopcion sa
      INNER JOIN animal an ON an.idanimal = sa.idanimal
      INNER JOIN raza r ON r.idraza = an.idraza
      INNER JOIN especie e ON e.idespecie = r.idespecie
      INNER JOIN usuario u ON u.idusuario = sa.idusuario
      LEFT JOIN persona p ON p.idusuario = u.idusuario
      WHERE sa.idsolicitudadopcion = $1
    `, [id]);

    if (!result.rows.length) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    // Si cambió de estado, actualizar el dato devuelto
    if (solicitudActual.rows[0].estadosolicitud === 'PENDIENTE') {
      result.rows[0].estadosolicitud = 'EN_REVISION';
    }

    res.json({ 
      message: "Detalle de solicitud",
      estadoCambiado: solicitudActual.rows[0].estadosolicitud === 'PENDIENTE',
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Error obteniendo detalle de solicitud:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/* ========================================================
   8. ELIMINAR SOLICITUD (si no tiene adopción)
======================================================== */
router.delete('/solicitud/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const tieneAdopcion = await query(`
      SELECT * FROM adopcion WHERE idsolicitudadopcion = $1
    `, [id]);

    if (tieneAdopcion.rows.length) {
      return res.status(400).json({
        message: "No se puede eliminar: ya tiene adopción."
      });
    }

    const result = await query(`
      DELETE FROM solicitud_adopcion 
      WHERE idsolicitudadopcion = $1
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
   9. BÚSQUEDA DE ANIMAL Y PERSONA POR NOMBRE (ADMIN)
   GET /api/adoptions/buscar?animalName=...&personName=...
   - Personas: Solo con rol ADOPTANTE
   - Animales: Solo los que NO están adoptados
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

        // 1. Búsqueda de Animal por nombre - SOLO animales NO adoptados
        if (animalName) {
            const animalSearch = `%${animalName.toLowerCase()}%`;
            const resultAnimal = await query(`
                SELECT
                    a.idanimal,
                    a.nombreanimal,
                    a.generoanimal,
                    a.edadmesesanimal,
                    r.razaanimal,
                    e.especieanimal
                FROM animal a
                INNER JOIN raza r ON a.idraza = r.idraza
                INNER JOIN especie e ON r.idespecie = e.idespecie
                WHERE LOWER(a.nombreanimal) LIKE $1
                  AND a.idanimal NOT IN (
                    SELECT sa.idanimal 
                    FROM solicitud_adopcion sa
                    INNER JOIN adopcion ad ON ad.idsolicitudadopcion = sa.idsolicitudadopcion
                  )
                LIMIT 10;
            `, [animalSearch]);
            animalData = resultAnimal.rows;
        }

        // 2. Búsqueda de Persona - SOLO usuarios con rol ADOPTANTE (idRol = 2)
        if (personName) {
            const personSearch = `%${personName.toLowerCase()}%`;
            const resultPerson = await query(`
                SELECT
                    p.idpersona,
                    p.nombres,
                    p.apepaterno,
                    p.apematerno,
                    p.dni,
                    u.idusuario,
                    u.correousuario,
                    u.numerousuario,
                    u.direccionusuario
                FROM persona p
                INNER JOIN usuario u ON p.idusuario = u.idusuario
                INNER JOIN usuario_roles ur ON ur.idusuario = u.idusuario
                WHERE 
                    (LOWER(p.nombres || ' ' || p.apepaterno || ' ' || p.apematerno) LIKE $1 OR p.dni LIKE $1)
                    AND ur.idrol = 2
                    AND ur.activo = true
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
