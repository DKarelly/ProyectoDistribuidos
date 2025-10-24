const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('./auth');
const router = express.Router();
module.exports = router;
//Listar adopciones
router.get('/', authenticateToken, async (req,res)=>{
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
        FROM
            adopcion ad
        INNER JOIN
            animal an ON an.idAnimal = ad.idAnimal
        INNER JOIN
            persona p_adoptante ON p_adoptante.idPersona = ad.idPersona
        INNER JOIN
            usuario us_entregante ON us_entregante.idUsuario = ad.idEntregante
        LEFT JOIN
            empresa e ON e.idUsuario = us_entregante.idUsuario 
            AND e.rubro = 'Refugio Animal'
        LEFT JOIN
            persona p_entregante ON p_entregante.idUsuario = us_entregante.idUsuario
        ORDER BY
            ad.f_adopcion DESC;
        `);
        res.json({message:'Adopciones obtenidas',data:result.rows});
    } catch (error) {
        console.error('Error obteniendo adopciones:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
})
//Listar solicitudes
router.get('/solicitud',authenticateToken ,async (req, res) => {
    try {
              const result = await query(`
                SELECT
                    ad.f_solicitud AS fechaSolicitud,
                    ad.comentario AS comentario,
                    ad.estadoSolicitud AS estadoSolic,
                    an.nombreAnimal AS animal,
                    (p_adoptante.nombres || ' ' || p_adoptante.apePaterno || ' ' || p_adoptante.apeMaterno) AS Solicitante,
                    COALESCE(
                        e.nombreEmpresa,
                        (p_entregante.nombres || ' ' || p_entregante.apePaterno || ' ' || p_entregante.apeMaterno)
                    ) AS Entregante
                FROM
                    adopcion ad
                INNER JOIN
                    animal an ON an.idAnimal = ad.idAnimal
                INNER JOIN
                    persona p_adoptante ON p_adoptante.idPersona = ad.idPersona
                INNER JOIN
                    usuario us_entregante ON us_entregante.idUsuario = ad.idEntregante
                LEFT JOIN
                    empresa e ON e.idUsuario = us_entregante.idUsuario 
                    AND e.rubro = 'Refugio Animal'
                LEFT JOIN
                    persona p_entregante ON p_entregante.idUsuario = us_entregante.idUsuario
                ORDER BY
                    ad.f_adopcion DESC;
        `);
        res.json({message:'Solicitudes obtenidas',data:result.rows});
    } catch (error) {
        console.error('Error obteniendo solicitudes: ',error);
        res.status(500).json({message:'Error interno del servidor'});
    }
})

//Registrar solicitud:
router.post('/',authenticateToken,async (req,res)=>{
   try {
    const {comentario,idAnimal,idPersona,idEntregante}=req.body
    const result= await query("INSERT INTO adopcion (f_solicitud,estadoSolicitud,comentario,idAnimal,idPersona,idEntregante) VALUES (CURRENT_DATE,'Pendiente',$1,$2,$3,$4) RETURNING *",[comentario,idAnimal,idPersona,idEntregante]);
    res.status(201).json({message:'Solicitud registrada',data:result.rows[0]});
   } catch (error) {
    console.error('Error creando rol:',error);
    res.status(500).json({message:'Error interno del servidor'});
   }
})

//Registrar adopcion:
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { fechaAdopcion, contrato, condiciones, direccionAdoptante } = req.body;
        
        // 1. Define el estado por defecto para una adopción 'registrada' (firmada/entregada)
        const estadoFinal = 'Completada'; 

        const result = await query(`
            UPDATE adopcion
            SET 
                f_adopcion = COALESCE($1, f_adopcion), -- Corregido a f_adopcion (según tu diagrama)
                contrato = COALESCE($2, contrato),
                condiciones = COALESCE($3, condiciones),
                direccionAdoptante = COALESCE($4, direccionAdoptante),
                estadoAdopcion = $5  -- Se establece el estado a 'Completada' (o el que definas)
            WHERE idAdopcion = $6
            RETURNING *
        `, [fechaAdopcion, contrato, condiciones, direccionAdoptante, estadoFinal, id]);
        //                     ^ $1             ^ $2          ^ $3               ^ $4               ^ $5          ^ $6

        if (!result.rows.length) {
            return res.status(404).json({ message: 'Adopcion no encontrada' });
        }
        
        // Asumiendo que esta ruta solo registra la adopción final y la completa:
        res.json({ message: 'Adopción registrada y completada', data: result.rows[0] });

    } catch (error) {
        console.error('Error registrando la adopcion: ', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

//Cambiar de estado de la solicitud:
router.put('/estado_solicitud/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Esperamos que el body contenga el nuevo estado: 'PENDIENTE', 'EN REVISION', 'ACEPTADO', 'RECHAZADO'
        const { estadoSolicitud } = req.body; 

        // 1. Validar el estado ingresado (opcional, pero muy recomendable)
        const estadosValidos = ['PENDIENTE', 'EN REVISION', 'ACEPTADO', 'RECHAZADO', 'CANCELADA'];
        if (estadoSolicitud && !estadosValidos.includes(estadoSolicitud.toUpperCase())) {
            return res.status(400).json({ message: `Estado inválido: ${estadoSolicitud}. Los valores permitidos son: ${estadosValidos.join(', ')}` });
        }

        // 2. Actualizar el estado en la base de datos
        const result = await query(`
            UPDATE adopcion
            SET estadoSolicitud = COALESCE($1, estadoSolicitud)
            WHERE idAdopcion = $2
            RETURNING *
        `, [estadoSolicitud, id]);

        if (!result.rows.length) {
            return res.status(404).json({ message: 'Solicitud de adopción no encontrada.' });
        }

        const estadoActualizado = result.rows[0].estadosolicitud;
        let mensaje;

        // 3. Lógica condicional para el mensaje de respuesta dinámico
        switch (estadoActualizado.toUpperCase()) {
            case 'ACEPTADO':
                mensaje = '¡Solicitud ACEPTADA! 🎉 El proceso avanza a la siguiente etapa.';
                break;
            case 'RECHAZADO':
                mensaje = 'Solicitud RECHAZADA. 😔 El proceso de adopción ha sido denegado.';
                break;
            case 'CANCELADA':
                mensaje = 'Solicitud CANCELADA. El registro ha sido anulado.';
                break;
            case 'EN REVISION':
                mensaje = 'Estado de solicitud actualizado a "En Revisión".';
                break;
            default:
                mensaje = `Estado de la solicitud actualizado a: ${estadoActualizado}.`;
        }

        // 4. Enviar la respuesta
        res.json({ message: mensaje, data: result.rows[0] });

    } catch (error) {
        console.error('Error al cambiar el estado de la solicitud: ', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

//Cambiar de estado de la adopcion:
router.put('/estado_adop/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Obtenemos el nuevo estado del cuerpo de la solicitud
        const { estadoAdop } = req.body; 

        const result = await query(`
            UPDATE adopcion
            SET estadoAdopcion = COALESCE($1, estadoAdopcion) -- Asegúrate de que el nombre de la columna sea 'estadoAdopcion'
            WHERE idAdopcion = $2
            RETURNING *
        `, [estadoAdop, id]);

        if (!result.rows.length) {
            return res.status(404).json({ message: 'Adopción no encontrada' });
        }

        // Obtener el estado actualizado de la base de datos
        const estadoActualizado = result.rows[0].estadoadopcion;
        let mensaje;

        switch (estadoActualizado.toLowerCase()) {
            case 'completada':
                mensaje = 'Adopción completada y registrada con éxito.';
                break;
            case 'cancelada':
                mensaje = 'Adopción cancelada por el usuario o el refugio.';
                break;
            default:
                mensaje = `Estado de adopción actualizado a: ${estadoActualizado}.`;
        }
        res.json({ message: mensaje, data: result.rows[0] });
    } catch (error) {
        console.error('Error al cambiar el estado de la adopción: ', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

//Eliminar solicitud o adopcion:
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            DELETE FROM adopcion
            WHERE idAdopcion = $1
            RETURNING idAdopcion;
        `, [id]);

        if (!result.rows.length) {
            return res.status(404).json({ message: 'Adopción/Solicitud no encontrada.' });
        }

        res.json({ message: `Registro de adopción/solicitud con ID ${id} eliminado correctamente.`, data: result.rows[0] });

    } catch (error) {
        console.error('Error eliminando la adopción/solicitud: ', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});
