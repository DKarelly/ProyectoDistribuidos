const express = require('express');
const { query } = require('../../config/database');
const { authenticateToken } = require('../auth/auth.routes');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configuración de multer para subir imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../files');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, 'animal-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Aumentado a 10MB para videos
    fileFilter: (req, file, cb) => {
        // Permitir imágenes y videos
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen y video'), false);
        }
    }
});

// =========================
// Solicitudes de animales
// =========================

// Crear tabla para solicitudes si no existe
(async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS solicitud_animal (
                idSolicitud SERIAL PRIMARY KEY,
                idUsuario INT REFERENCES usuario(idUsuario),
                payload JSONB NOT NULL,
                imagenes TEXT[],
                videos TEXT[],
                estado VARCHAR(20) DEFAULT 'Pendiente',
                mensaje_admin VARCHAR(255),
                comentario_usuario VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Tabla solicitud_animal verificada/creada');
    } catch (e) {
        console.error('Error creando/verificando solicitud_animal:', e.message);
    }
})();

// POST /api/animals/solicitar - Usuario envía solicitud con archivos
router.post('/solicitar', authenticateToken, upload.fields([
    { name: 'imagenAnimal', maxCount: 5 },
    { name: 'videoAnimal', maxCount: 2 }
]), async (req, res) => {
    try {
        const idUsuario = req.user.idusuario;

        // Capturar archivos subidos
        const imagenes = (req.files?.imagenAnimal || []).map(f => f.filename);
        const videos = (req.files?.videoAnimal || []).map(f => f.filename);

        // Debug: ver qué está llegando en el body
        console.log('=== DEBUG SOLICITAR ===');
        console.log('Body recibido completo:', JSON.stringify(req.body, null, 2));
        console.log('Tamaño recibido (con ñ):', req.body.tamaño);
        console.log('Tamano recibido (sin ñ):', req.body.tamano);
        console.log('Tipo de tamano:', typeof req.body.tamano);
        console.log('Tipo de tamaño:', typeof req.body.tamaño);
        console.log('Keys del body:', Object.keys(req.body));

        // Priorizar 'tamano' (sin ñ) para evitar problemas de encoding con multer
        let tamañoParaPayload = null;
        if (req.body.tamano && typeof req.body.tamano === 'string' && req.body.tamano.trim() !== '') {
            tamañoParaPayload = req.body.tamano.trim();
            console.log('Usando tamano (sin ñ):', tamañoParaPayload);
        } else if (req.body.tamaño && typeof req.body.tamaño === 'string' && req.body.tamaño.trim() !== '') {
            tamañoParaPayload = req.body.tamaño.trim();
            console.log('Usando tamaño (con ñ):', tamañoParaPayload);
        } else {
            console.log('Tamaño no encontrado o vacío');
        }

        console.log('Tamaño normalizado para payload:', tamañoParaPayload);

        const payload = {
            body: req.body,
            tamañoNormalizado: tamañoParaPayload
        };

        const result = await query(`
            INSERT INTO solicitud_animal (idUsuario, payload, imagenes, videos)
            VALUES ($1, $2::jsonb, $3, $4)
            RETURNING idSolicitud
        `, [idUsuario, JSON.stringify(payload), imagenes, videos]);

        res.status(201).json({
            message: 'Solicitud registrada. Un administrador la revisará pronto.',
            data: { idSolicitud: result.rows[0].idsolicitud }
        });
    } catch (error) {
        console.error('Error registrando solicitud:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/animals/solicitudes - Listado para admin (solo conteo o detalle)
router.get('/solicitudes', authenticateToken, async (req, res) => {
    try {
        if (req.user.idrol !== 1) return res.status(403).json({ message: 'Acceso denegado' });
        const result = await query(`
            SELECT idSolicitud, idUsuario, estado, created_at FROM solicitud_animal
            WHERE estado = 'Pendiente'
            ORDER BY idSolicitud DESC
        `);
        res.json({ message: 'Solicitudes pendientes', data: result.rows });
    } catch (error) {
        console.error('Error obteniendo solicitudes:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/animals/solicitudes/:id - detalle para visualizar (admin)
router.get('/solicitudes/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.idrol !== 1) return res.status(403).json({ message: 'Acceso denegado' });
        const { id } = req.params;
        const result = await query(`
            SELECT idSolicitud, idUsuario, payload, imagenes, videos, estado, mensaje_admin, created_at
            FROM solicitud_animal
            WHERE idSolicitud = $1
        `, [id]);
        if (!result.rows.length) return res.status(404).json({ message: 'Solicitud no encontrada' });
        res.json({ message: 'Detalle de solicitud', data: result.rows[0] });
    } catch (error) {
        console.error('Error obteniendo detalle de solicitud:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/animals/solicitudes/mias - para usuario ver estado y mensajes
router.get('/solicitudes/mias', async (req, res) => {
    try {
        // Intentar obtener id desde token
        let idUsuario = null;
        const authHeader = req.headers['authorization'];

        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const jwt = require('jsonwebtoken');
                const user = jwt.verify(token, process.env.JWT_SECRET);
                idUsuario = user.idusuario || user.idUsuario;
                console.log('Token verificado exitosamente para usuario:', idUsuario);
            } catch (err) {
                // Token inválido o expirado
                console.error('Error verificando token:', err.message);
                return res.status(401).json({ message: 'Token inválido o expirado. Por favor, inicia sesión nuevamente.' });
            }
        } else {
            // Si no hay header de autorización, retornar sin solicitudes (no es un error crítico)
            return res.status(200).json({ message: 'No autenticado', data: [] });
        }

        // Si no se pudo obtener idUsuario del token, retornar error
        if (!idUsuario) {
            console.error('No se pudo obtener idUsuario del token');
            return res.status(401).json({ message: 'Error al obtener información del usuario del token' });
        }

        const result = await query(`
            SELECT "idSolicitud", estado, mensaje_admin, comentario_usuario, created_at
            FROM solicitud_animal
            WHERE "idUsuario" = $1
            ORDER BY "idSolicitud" DESC
        `, [idUsuario]);

        res.json({ message: 'Mis solicitudes', data: result.rows });
    } catch (error) {
        console.error('Error obteniendo mis solicitudes:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/animals/solicitudes/mias-public - pública con idUsuario (solo lectura)
router.get('/solicitudes/mias-public', async (req, res) => {
    try {
        const idUsuario = parseInt(req.query.idUsuario);
        if (!idUsuario) return res.status(400).json({ message: 'idUsuario requerido' });
        const result = await query(`
            SELECT idSolicitud, estado, mensaje_admin, comentario_usuario, created_at
            FROM solicitud_animal
            WHERE idUsuario = $1
            ORDER BY idSolicitud DESC
        `, [idUsuario]);
        res.json({ message: 'Mis solicitudes', data: result.rows });
    } catch (error) {
        console.error('Error obteniendo mis solicitudes (public):', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/animals/solicitudes/:id/apelar - usuario agrega comentario
router.put('/solicitudes/:id/apelar', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { comentario } = req.body;
        await query('UPDATE solicitud_animal SET comentario_usuario = $1 WHERE idSolicitud = $2', [comentario || null, id]);
        res.json({ message: 'Comentario enviado' });
    } catch (error) {
        console.error('Error en apelación:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/animals/solicitudes/:id/aprobar - admin crea animal real
router.put('/solicitudes/:id/aprobar', authenticateToken, async (req, res) => {
    try {
        if (req.user.idrol !== 1) return res.status(403).json({ message: 'Acceso denegado' });
        const { id } = req.params;
        const solRes = await query('SELECT * FROM solicitud_animal WHERE idSolicitud = $1', [id]);
        if (!solRes.rows.length) return res.status(404).json({ message: 'Solicitud no encontrada' });

        const sol = solRes.rows[0];

        // Debug: mostrar el payload completo
        console.log('=== DEBUG APROBAR SOLICITUD ===');
        console.log('Solicitud ID:', id);
        console.log('Payload completo:', JSON.stringify(sol.payload, null, 2));

        // Manejar el payload según su tipo
        let payloadParsed = {};
        if (typeof sol.payload === 'string') {
            try {
                payloadParsed = JSON.parse(sol.payload);
            } catch (e) {
                console.error('Error parseando payload JSON:', e);
                payloadParsed = {};
            }
        } else if (typeof sol.payload === 'object') {
            payloadParsed = sol.payload;
        }

        // Extraer body del payload
        const body = payloadParsed.body || payloadParsed || {};

        // Reusar la lógica del alta real (parcial del /agregar)
        const nombreAnimal = body.nombreAnimal;
        const especie = body.especie;
        const raza = body.raza;
        const edadMeses = body.edadMeses;
        const genero = body.genero;
        const peso = body.peso || null;
        const pelaje = body.pelaje || null;

        // Normalizar tamaño: buscar en múltiples ubicaciones posibles
        let tamañoNormalizado = null;

        // Primero intentar desde body
        if (body.tamaño !== undefined && body.tamaño !== null) {
            tamañoNormalizado = (typeof body.tamaño === 'string' && body.tamaño.trim() !== '') ? body.tamaño.trim() : null;
        } else if (body.tamano !== undefined && body.tamano !== null) {
            tamañoNormalizado = (typeof body.tamano === 'string' && body.tamano.trim() !== '') ? body.tamano.trim() : null;
        }

        // Si no está en body, buscar en el payload raíz
        if (!tamañoNormalizado) {
            if (payloadParsed.tamañoNormalizado !== undefined && payloadParsed.tamañoNormalizado !== null) {
                tamañoNormalizado = (typeof payloadParsed.tamañoNormalizado === 'string' && payloadParsed.tamañoNormalizado.trim() !== '')
                    ? payloadParsed.tamañoNormalizado.trim()
                    : null;
            } else if (payloadParsed.tamaño !== undefined && payloadParsed.tamaño !== null) {
                tamañoNormalizado = (typeof payloadParsed.tamaño === 'string' && payloadParsed.tamaño.trim() !== '')
                    ? payloadParsed.tamaño.trim()
                    : null;
            } else if (payloadParsed.tamano !== undefined && payloadParsed.tamano !== null) {
                tamañoNormalizado = (typeof payloadParsed.tamano === 'string' && payloadParsed.tamano.trim() !== '')
                    ? payloadParsed.tamano.trim()
                    : null;
            }
        }

        console.log('=== DEBUG TAMAÑO ===');
        console.log('Tamaño desde body.tamaño:', body.tamaño);
        console.log('Tamaño desde body.tamano:', body.tamano);
        console.log('Tamaño desde payload.tamaño:', payloadParsed.tamaño);
        console.log('Tamaño desde payload.tamano:', payloadParsed.tamano);
        console.log('Tamaño desde payload.tamañoNormalizado:', payloadParsed.tamañoNormalizado);
        console.log('Tamaño normalizado final:', tamañoNormalizado);

        if (!nombreAnimal || !especie || !raza || !edadMeses || !genero) {
            return res.status(400).json({ message: 'Solicitud incompleta. Faltan campos requeridos: nombreAnimal, especie, raza, edadMeses o genero' });
        }

        // Especie
        let especieResult = await query('SELECT idespecie FROM especie WHERE especieanimal = $1', [especie]);
        let idEspecie = especieResult.rows.length ? especieResult.rows[0].idespecie :
            (await query('INSERT INTO especie (especieanimal) VALUES ($1) RETURNING idespecie', [especie])).rows[0].idespecie;

        // Raza
        let razaResult = await query('SELECT idraza FROM raza WHERE razaanimal = $1 AND idespecie = $2', [raza, idEspecie]);
        let idRaza = razaResult.rows.length ? razaResult.rows[0].idraza :
            (await query('INSERT INTO raza (idespecie, razaanimal) VALUES ($1, $2) RETURNING idraza', [idEspecie, raza])).rows[0].idraza;

        console.log('=== DEBUG INSERTAR ANIMAL (APROBAR) ===');
        console.log('Datos a insertar:', {
            nombreAnimal, edadMeses, genero, peso, pelaje, tamañoNormalizado, idRaza
        });
        console.log('Tamaño normalizado:', tamañoNormalizado);
        console.log('Tipo de tamaño normalizado:', typeof tamañoNormalizado);

        const animalRes = await query(`
            INSERT INTO animal (nombreanimal, edadmesesanimal, generoanimal, pesoanimal, pelaje, tamano, idraza)
            VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING idanimal
        `, [nombreAnimal, parseInt(edadMeses), genero, peso ? parseFloat(peso) : null, pelaje, tamañoNormalizado, idRaza]);
        const idAnimal = animalRes.rows[0].idanimal;

        // Verificar que se insertó correctamente
        const verificarAnimal = await query('SELECT idanimal, nombreanimal, tamano FROM animal WHERE idanimal = $1', [idAnimal]);
        console.log('=== ANIMAL INSERTADO (APROBAR) ===');
        console.log('Animal verificado completo:', verificarAnimal.rows[0]);
        console.log('Tamano en BD:', verificarAnimal.rows[0].tamano);

        await query(`
            INSERT INTO historial_animal (idanimal, pesohistorial, f_historial, h_historial, descripcionhistorial)
            VALUES ($1,$2,(now() at time zone 'America/Lima')::date,(now() at time zone 'America/Lima')::time,$3)
        `, [idAnimal, peso ? parseFloat(peso) : null, body.descripcion || 'Registro inicial del animal']);

        // Galería desde archivos guardados en la solicitud (OPCIONAL - solo si existen)
        if (sol.imagenes && Array.isArray(sol.imagenes) && sol.imagenes.length > 0) {
            for (const img of sol.imagenes) {
                if (img && img.trim() !== '') {
                    await query('INSERT INTO galeria (idanimal, imagen) VALUES ($1, $2)', [idAnimal, img]);
                }
            }
        }
        if (sol.videos && Array.isArray(sol.videos) && sol.videos.length > 0) {
            for (const vid of sol.videos) {
                if (vid && vid.trim() !== '') {
                    await query('INSERT INTO galeria (idanimal, video) VALUES ($1, $2)', [idAnimal, vid]);
                }
            }
        }

        await query('UPDATE solicitud_animal SET estado = ' + "'Aprobada'" + ', mensaje_admin = $1 WHERE idSolicitud = $2', [req.body?.mensaje || null, id]);

        res.json({ message: 'Solicitud aprobada y animal publicado', data: { idAnimal } });
    } catch (error) {
        console.error('Error aprobando solicitud:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/animals/solicitudes/:id/rechazar - admin rechaza con mensaje
router.put('/solicitudes/:id/rechazar', authenticateToken, async (req, res) => {
    try {
        if (req.user.idrol !== 1) return res.status(403).json({ message: 'Acceso denegado' });
        const { id } = req.params;
        const { mensaje } = req.body;
        await query('UPDATE solicitud_animal SET estado = $1, mensaje_admin = $2 WHERE idSolicitud = $3', ['Rechazada', mensaje || null, id]);
        res.json({ message: 'Solicitud rechazada' });
    } catch (error) {
        console.error('Error rechazando solicitud:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/animals - Obtener todos los animales
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT a.idanimal, a.nombreanimal, a.edadmesesanimal, a.generoanimal, 
                   a.pesoanimal, a.pelaje, 
                   a.tamano,
                   a.idraza, e.especieanimal, r.razaanimal,
                   CASE 
                       WHEN ad.estadoadopcion = 'Aprobada' THEN 'adoptado'
                       WHEN ad.estadoadopcion = 'En proceso' THEN 'en_proceso'
                       WHEN ad.estadoadopcion = 'Pendiente' THEN 'pendiente'
                       ELSE 'disponible'
                   END as estadoanimal
            FROM animal a
            LEFT JOIN raza r ON a.idraza = r.idraza
            LEFT JOIN especie e ON r.idespecie = e.idespecie
            LEFT JOIN adopcion ad ON a.idanimal = ad.idanimal
            ORDER BY a.idanimal DESC
        `);
        res.json({ message: 'Animales obtenidos exitosamente', data: result.rows });
    } catch (error) {
        console.error('Error obteniendo animales:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/animals/perfil/:id - Perfil enriquecido para blog/modal
router.get('/perfil/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `
            SELECT
              a.idanimal, a.nombreanimal, a.edadmesesanimal, a.generoanimal, a.pesoanimal, a.pelaje, 
              a.tamano,
              r.razaanimal, e.especieanimal,
              (SELECT g.imagen FROM galeria g WHERE g.idanimal = a.idanimal AND g.imagen IS NOT NULL LIMIT 1) AS imagen,
              h.idhistorial, h.f_historial, h.h_historial, h.descripcionhistorial, h.nombveterinario,
              en.nombenfermedad, te.tipoenfermedad, de.gravedadenfermedad, de.medicinas,
              COALESCE((CURRENT_DATE - ca.f_entrada), (CURRENT_DATE - h.f_historial)) AS dias_en_refugio,
              CASE
                WHEN EXISTS (SELECT 1 FROM adopcion ad2 WHERE ad2.idanimal = a.idanimal AND ad2.estadoadopcion = 'Aprobada') THEN 'adoptado'
                WHEN EXISTS (SELECT 1 FROM adopcion ad2 WHERE ad2.idanimal = a.idanimal AND ad2.estadoadopcion IN ('Pendiente','En proceso')) THEN 'en_proceso'
                ELSE 'disponible'
              END AS estado
            FROM animal a
            JOIN raza r ON a.idraza = r.idraza
            JOIN especie e ON r.idespecie = e.idespecie
            LEFT JOIN LATERAL (
              SELECT * FROM historial_animal h1 WHERE h1.idanimal = a.idanimal ORDER BY h1.f_historial DESC, h1.h_historial DESC LIMIT 1
            ) h ON TRUE
            LEFT JOIN detalle_enfermedad de ON de.idhistorial = h.idhistorial
            LEFT JOIN enfermedad en ON en.idenfermedad = de.idenfermedad
            LEFT JOIN tipo_enfermedad te ON te.idtipoenfermedad = en.idtipoenfermedad
            LEFT JOIN LATERAL (
              SELECT f_entrada FROM caso_animal ca1 WHERE ca1.idanimal = a.idanimal ORDER BY f_entrada ASC LIMIT 1
            ) ca ON TRUE
            WHERE a.idanimal = $1
            LIMIT 1
        `;
        const result = await query(sql, [id]);
        if (!result.rows.length) return res.status(404).json({ message: 'Animal no encontrado' });
        res.json({ message: 'Perfil obtenido', data: result.rows[0] });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/animals/:id/assign-vet - Asignar/editar veterinario en el último historial
router.post('/:id/assign-vet', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombVeterinario } = req.body;
        if (!nombVeterinario || !nombVeterinario.trim()) {
            return res.status(400).json({ message: 'Nombre de veterinario requerido' });
        }

        // Buscar último historial; si no existe, crear uno básico
        const lastHist = await query(
            `SELECT idhistorial FROM historial_animal WHERE idanimal = $1 ORDER BY f_historial DESC, h_historial DESC LIMIT 1`,
            [id]
        );

        if (lastHist.rows.length) {
            await query(`UPDATE historial_animal SET nombveterinario = $1 WHERE idhistorial = $2`, [nombVeterinario, lastHist.rows[0].idhistorial]);
        } else {
            await query(`
                INSERT INTO historial_animal (idanimal, pesohistorial, f_historial, h_historial, descripcionhistorial, nombveterinario)
                VALUES ($1, NULL, (now() at time zone 'America/Lima')::date, (now() at time zone 'America/Lima')::time, 'Veterinario asignado', $2)
            `, [id, nombVeterinario]);
        }

        res.json({ message: 'Veterinario asignado/actualizado correctamente' });
    } catch (error) {
        console.error('Error asignando veterinario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/animals/disponibles
router.get('/disponibles', async (req, res) => {
    try {
        const { especie, pelaje, tamaño, genero, edad } = req.query;
        let whereConditions = [];
        let params = [];
        let paramCount = 0;

        if (especie) { paramCount++; whereConditions.push(`e.especieanimal = $${paramCount}`); params.push(especie); }
        if (pelaje) { paramCount++; whereConditions.push(`a.pelaje = $${paramCount}`); params.push(pelaje); }
        if (tamaño) { paramCount++; whereConditions.push(`a.tamano = $${paramCount}`); params.push(tamaño); }
        if (genero) { paramCount++; whereConditions.push(`a.generoanimal = $${paramCount}`); params.push(genero); }
        if (edad) {
            // Convertir rango de edad a condiciones de meses
            let edadCondition = '';
            switch (edad) {
                case '0-6 meses':
                    edadCondition = `a.edadmesesanimal <= 6`;
                    break;
                case '7-12 meses':
                    edadCondition = `a.edadmesesanimal > 6 AND a.edadmesesanimal <= 12`;
                    break;
                case '1-2 años':
                    edadCondition = `a.edadmesesanimal > 12 AND a.edadmesesanimal <= 24`;
                    break;
                case '3-5 años':
                    edadCondition = `a.edadmesesanimal > 24 AND a.edadmesesanimal <= 60`;
                    break;
                case '5+ años':
                    edadCondition = `a.edadmesesanimal > 60`;
                    break;
                default:
                    // Si es un número directo, usar como máximo
                    const maxMeses = parseInt(edad);
                    if (!isNaN(maxMeses)) {
                        edadCondition = `a.edadmesesanimal <= ${maxMeses}`;
                    }
            }
            if (edadCondition) {
                whereConditions.push(edadCondition);
            }
        }

        // Excluir animales ya adoptados
        whereConditions.push(`a.idanimal NOT IN (SELECT idanimal FROM adopcion WHERE estadoadopcion = 'Aprobada')`);
        const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const sql = `
            SELECT DISTINCT a.idanimal, a.nombreanimal, a.edadmesesanimal, a.generoanimal,
                   a.pesoanimal, a.pelaje, a.tamano, r.razaanimal, e.especieanimal,
                   (SELECT g.imagen FROM galeria g WHERE g.idanimal = a.idanimal AND g.imagen IS NOT NULL LIMIT 1) as imagenAnimal,
                   CASE 
                       WHEN ad.estadoadopcion = 'Aprobada' THEN 'adoptado'
                       WHEN ad.estadoadopcion = 'En proceso' THEN 'en_proceso'
                       WHEN ad.estadoadopcion = 'Pendiente' THEN 'pendiente'
                       ELSE 'disponible'
                   END as estadoanimal
            FROM animal a
            JOIN raza r ON a.idraza = r.idraza
            JOIN especie e ON r.idespecie = e.idespecie
            LEFT JOIN adopcion ad ON a.idanimal = ad.idanimal
            ${whereClause}
            ORDER BY a.idanimal DESC
        `;
        const result = await query(sql, params);
        console.log('Animales disponibles encontrados:', result.rows.length);
        console.log('Primer animal:', result.rows[0]);
        res.json({ message: 'Animales disponibles obtenidos exitosamente', data: result.rows });
    } catch (error) {
        console.error('Error obteniendo animales:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/animals/tipos-enfermedad - DEBE IR ANTES DE /:id
router.get('/tipos-enfermedad', async (req, res) => {
    try {
        console.log('Solicitud de tipos de enfermedad recibida');
        const result = await query('SELECT * FROM tipo_enfermedad ORDER BY idTipoEnfermedad');
        console.log('Tipos de enfermedad encontrados en BD:', result.rows);
        res.json({ message: 'Tipos de enfermedad obtenidos exitosamente', data: result.rows });
    } catch (error) {
        console.error('Error obteniendo tipos de enfermedad:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/animals/enfermedades-por-tipo/:tipoId - DEBE IR ANTES DE /:id
router.get('/enfermedades-por-tipo/:tipoId', async (req, res) => {
    try {
        const { tipoId } = req.params;
        console.log('Solicitud de enfermedades para tipo ID:', tipoId);
        const result = await query(`
            SELECT * FROM enfermedad 
            WHERE idTipoEnfermedad = $1 
            ORDER BY nombEnfermedad
        `, [tipoId]);
        console.log('Enfermedades encontradas en BD:', result.rows);
        res.json({ message: 'Enfermedades por tipo obtenidas exitosamente', data: result.rows });
    } catch (error) {
        console.error('Error obteniendo enfermedades por tipo:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/animals/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const animalResult = await query(`
            SELECT a.idanimal, a.nombreanimal, a.edadmesesanimal, a.generoanimal,
                   a.pesoanimal, a.pelaje, 
                   a.tamano, 
                   r.razaanimal, e.especieanimal,
                   (SELECT g.imagen FROM galeria g WHERE g.idanimal = a.idanimal AND g.imagen IS NOT NULL LIMIT 1) as imagenAnimal,
                   CASE 
                       WHEN ad.estadoadopcion = 'Aprobada' THEN 'adoptado'
                       WHEN ad.estadoadopcion = 'En proceso' THEN 'en_proceso'
                       WHEN ad.estadoadopcion = 'Pendiente' THEN 'pendiente'
                       ELSE 'disponible'
                   END as estadoanimal
            FROM animal a
            JOIN raza r ON a.idraza = r.idraza
            JOIN especie e ON r.idespecie = e.idespecie
            LEFT JOIN adopcion ad ON a.idanimal = ad.idanimal
            WHERE a.idanimal = $1
            LIMIT 1
        `, [id]);

        if (!animalResult.rows.length) return res.status(404).json({ message: 'Animal no encontrado' });

        const animal = animalResult.rows[0];

        // Debug: ver qué tamaño tiene el animal
        console.log('=== DEBUG GET ANIMAL BY ID ===');
        console.log('Animal completo:', animal);
        console.log('Tamaño (tamano alias):', animal.tamano);
        console.log('Keys del animal:', Object.keys(animal));

        const historialResult = await query(`
            SELECT h.idhistorial, h.pesohistorial, h.f_historial, h.h_historial, h.descripcionhistorial, h.nombveterinario,
                   e.nombEnfermedad, d.gravedadEnfermedad, d.medicinas
            FROM historial_animal h
            LEFT JOIN detalle_enfermedad d ON h.idhistorial = d.idhistorial
            LEFT JOIN enfermedad e ON d.idEnfermedad = e.idEnfermedad
            WHERE h.idanimal = $1
            ORDER BY h.f_historial DESC, h.h_historial DESC
        `, [id]);

        // Obtener galería completa (imágenes y videos)
        const galeriaResult = await query(`
            SELECT g.idgaleria, g.imagen, g.video
            FROM galeria g
            WHERE g.idanimal = $1
            ORDER BY g.idgaleria
        `, [id]);

        animal.historial = historialResult.rows;
        animal.galeria = galeriaResult.rows;
        res.json({ message: 'Animal obtenido exitosamente', data: animal });
    } catch (error) {
        console.error('Error obteniendo animal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/animals/adoptar
router.post('/adoptar', authenticateToken, async (req, res) => {
    try {
        const { idAnimal } = req.body;
        const idUsuario = req.user.idusuario; // Coincide con el JWT

        if (!idAnimal) return res.status(400).json({ message: 'ID del animal es requerido' });

        const animalResult = await query(`
            SELECT idanimal, nombreanimal
            FROM animal
            WHERE idanimal = $1
              AND idanimal NOT IN (SELECT idanimal FROM adopcion WHERE estadoadopcion = 'Aprobada')
        `, [idAnimal]);

        if (!animalResult.rows.length) return res.status(400).json({ message: 'Animal no disponible para adopción' });

        const existingAdoption = await query(`
            SELECT idadopcion FROM adopcion
            WHERE idpersona = $1 AND idanimal = $2 AND estadoadopcion = 'Pendiente'
        `, [idUsuario, idAnimal]);

        if (existingAdoption.rows.length) return res.status(400).json({ message: 'Ya tienes una solicitud pendiente para este animal' });

        const result = await query(`
            INSERT INTO adopcion (idpersona, idanimal, f_adopcion, estadoadopcion)
            VALUES ($1, $2, CURRENT_DATE, 'Pendiente')
            RETURNING idadopcion
        `, [idUsuario, idAnimal]);

        res.status(201).json({
            message: 'Solicitud de adopción creada exitosamente',
            data: {
                idAdopcion: result.rows[0].idadopcion,
                animal: animalResult.rows[0].nombreanimal,
                estado: 'Pendiente'
            }
        });
    } catch (error) {
        console.error('Error creando adopción:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/animals/agregar
router.post('/agregar', upload.fields([
    { name: 'imagenAnimal', maxCount: 5 }, // Máximo 5 imágenes
    { name: 'videoAnimal', maxCount: 2 }   // Máximo 2 videos
]), async (req, res) => {
    try {
        console.log('=== AGREGANDO ANIMAL ===');
        console.log('Body recibido:', req.body);
        console.log('Archivos recibidos:', req.files);

        // Verificar que al menos haya una imagen
        if (!req.files || !req.files.imagenAnimal || req.files.imagenAnimal.length === 0) {
            return res.status(400).json({ message: 'Al menos una imagen es obligatoria' });
        }

        const { nombreAnimal, especie, raza, edadMeses, genero, peso, pelaje, tamaño, tamano, descripcion, enfermedadId, gravedad, medicinas } = req.body;

        // Normalizar tamaño: Priorizar 'tamano' (sin ñ) para evitar problemas de encoding con multer
        // También aceptar valores vacíos o strings vacíos y convertirlos a null
        let tamañoNormalizado = null;
        // Priorizar 'tamano' (sin ñ) primero
        if (tamano && typeof tamano === 'string' && tamano.trim() !== '') {
            tamañoNormalizado = tamano.trim();
        } else if (tamaño && typeof tamaño === 'string' && tamaño.trim() !== '') {
            tamañoNormalizado = tamaño.trim();
        }

        console.log('=== DEBUG TAMAÑO AGREGAR ===');
        console.log('Tamaño recibido (con ñ):', tamaño);
        console.log('Tamano recibido (sin ñ):', tamano);
        console.log('Tamaño normalizado:', tamañoNormalizado);

        console.log('Datos procesados:', {
            nombreAnimal, especie, raza, edadMeses, genero, peso, pelaje, tamaño: tamañoNormalizado, descripcion
        });

        console.log('=== DEBUG TAMAÑO BACKEND ===');
        console.log('Tamaño recibido (raw):', tamaño);
        console.log('Tamaño recibido (alt):', tamano);
        console.log('Tamaño normalizado:', tamañoNormalizado);

        if (!nombreAnimal || !especie || !raza || !edadMeses || !genero)
            return res.status(400).json({ message: 'Los campos obligatorios son: nombre, especie, raza, edad y género' });

        console.log('Buscando especie:', especie);
        let especieResult = await query('SELECT idespecie FROM especie WHERE especieanimal = $1', [especie]);
        let idEspecie = especieResult.rows.length ? especieResult.rows[0].idespecie :
            (await query('INSERT INTO especie (especieanimal) VALUES ($1) RETURNING idespecie', [especie])).rows[0].idespecie;
        console.log('ID Especie:', idEspecie);

        console.log('Buscando raza:', raza, 'para especie:', idEspecie);
        let razaResult = await query('SELECT idraza FROM raza WHERE razaanimal = $1 AND idespecie = $2', [raza, idEspecie]);
        let idRaza = razaResult.rows.length ? razaResult.rows[0].idraza :
            (await query('INSERT INTO raza (idespecie, razaanimal) VALUES ($1, $2) RETURNING idraza', [idEspecie, raza])).rows[0].idraza;
        console.log('ID Raza:', idRaza);

        // Validaciones numéricas
        if (isNaN(parseInt(edadMeses)) || parseInt(edadMeses) < 0) {
            return res.status(400).json({ message: 'La edad en meses debe ser >= 0' });
        }
        if (peso !== undefined && peso !== null && peso !== '' && (isNaN(parseFloat(peso)) || parseFloat(peso) < 0)) {
            return res.status(400).json({ message: 'El peso debe ser >= 0' });
        }

        console.log('=== DEBUG INSERTAR ANIMAL DIRECTO ===');
        console.log('Datos a insertar:', {
            nombreAnimal, edadMeses: parseInt(edadMeses), genero, peso: peso ? parseFloat(peso) : null,
            pelaje: pelaje || null, tamaño: tamañoNormalizado || null, idRaza
        });
        console.log('Tamaño normalizado:', tamañoNormalizado);
        console.log('Tipo de tamaño normalizado:', typeof tamañoNormalizado);

        const animalResult = await query(`
            INSERT INTO animal (nombreanimal, edadmesesanimal, generoanimal, pesoanimal, pelaje, tamano, idraza)
            VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING idanimal
        `, [nombreAnimal, parseInt(edadMeses), genero, peso ? parseFloat(peso) : null, pelaje || null, tamañoNormalizado || null, idRaza]);

        // Verificar que se insertó correctamente
        const verificarAnimalDirecto = await query('SELECT idanimal, nombreanimal, tamano FROM animal WHERE idanimal = $1', [animalResult.rows[0].idanimal]);
        console.log('=== ANIMAL DIRECTO INSERTADO ===');
        console.log('Animal verificado completo:', verificarAnimalDirecto.rows[0]);
        console.log('Tamaño en BD (con ñ):', verificarAnimalDirecto.rows[0].tamaño);
        console.log('Tamano en BD (alias):', verificarAnimalDirecto.rows[0].tamano);

        const idAnimal = animalResult.rows[0].idanimal;
        console.log('Animal insertado con ID:', idAnimal);

        const historialResult = await query(`
            INSERT INTO historial_animal (idanimal, pesohistorial, f_historial, h_historial, descripcionhistorial)
            VALUES ($1,$2,(now() at time zone 'America/Lima')::date,(now() at time zone 'America/Lima')::time,$3) RETURNING idhistorial
        `, [idAnimal, peso ? parseFloat(peso) : null, descripcion || 'Registro inicial del animal']);

        const idHistorial = historialResult.rows[0].idhistorial;
        console.log('Historial insertado con ID:', idHistorial);

        // Insertar detalle de enfermedad si se proporcionó
        if (enfermedadId && enfermedadId !== '') {
            console.log('Insertando detalle de enfermedad...');
            await query(`
                INSERT INTO detalle_enfermedad (idhistorial, idEnfermedad, gravedadEnfermedad, medicinas)
                VALUES ($1,$2,$3,$4)
            `, [idHistorial, parseInt(enfermedadId), gravedad || null, medicinas || null]);
            console.log('Detalle de enfermedad insertado');
        }

        // Insertar imágenes en galería
        console.log('Insertando archivos en galería...');
        const archivosInsertados = [];

        // Insertar imágenes
        if (req.files.imagenAnimal) {
            for (const imagen of req.files.imagenAnimal) {
                await query('INSERT INTO galeria (idanimal, imagen) VALUES ($1,$2)', [idAnimal, imagen.filename]);
                archivosInsertados.push({ tipo: 'imagen', archivo: imagen.filename });
                console.log('Imagen insertada:', imagen.filename);
            }
        }

        // Insertar videos
        if (req.files.videoAnimal) {
            for (const video of req.files.videoAnimal) {
                await query('INSERT INTO galeria (idanimal, video) VALUES ($1,$2)', [idAnimal, video.filename]);
                archivosInsertados.push({ tipo: 'video', archivo: video.filename });
                console.log('Video insertado:', video.filename);
            }
        }

        console.log('✅ Animal agregado exitosamente');
        res.status(201).json({
            message: 'Animal agregado exitosamente',
            data: {
                idAnimal,
                nombreAnimal,
                archivos: archivosInsertados
            }
        });

    } catch (error) {
        console.error('Error agregando animal:', error);

        // Limpiar archivos subidos en caso de error
        if (req.files) {
            const allFiles = [...(req.files.imagenAnimal || []), ...(req.files.videoAnimal || [])];
            allFiles.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }

        // Manejar errores específicos
        if (error.code === '22001') { // value too long for type
            res.status(400).json({ message: 'Uno de los campos excede la longitud máxima permitida' });
        } else if (error.code === '23503') { // foreign key violation
            res.status(400).json({ message: 'La raza seleccionada no existe' });
        } else {
            res.status(500).json({ message: 'Error interno del servidor' });
        }
    }
});



// GET /api/animals/enfermedades
router.get('/enfermedades', async (req, res) => {
    try {
        const result = await query('SELECT * FROM enfermedad ORDER BY nombEnfermedad');
        res.json({ message: 'Enfermedades obtenidas exitosamente', data: result.rows });
    } catch (error) {
        console.error('Error obteniendo enfermedades:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});



// PUT /api/animals/:id - Actualizar animal
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombreanimal, especieanimal, razaanimal, edadmesesanimal, generoanimal, pesoanimal, pelaje, tamaño, descripcion } = req.body;

        console.log('Actualizando animal ID:', id);
        console.log('Datos recibidos:', req.body);

        // Validaciones
        if (!nombreanimal || !especieanimal || !razaanimal || edadmesesanimal === undefined || edadmesesanimal === null || !generoanimal) {
            return res.status(400).json({ message: 'Los campos obligatorios son: nombre, especie, raza, edad y género' });
        }

        // Validaciones anti-negativos
        if (isNaN(parseInt(edadmesesanimal)) || parseInt(edadmesesanimal) < 0) {
            return res.status(400).json({ message: 'La edad en meses debe ser >= 0' });
        }
        if (pesoanimal !== undefined && pesoanimal !== null && pesoanimal !== '' && (isNaN(parseFloat(pesoanimal)) || parseFloat(pesoanimal) < 0)) {
            return res.status(400).json({ message: 'El peso debe ser >= 0' });
        }

        // Buscar/crear especie
        let especieResult = await query('SELECT idespecie FROM especie WHERE especieanimal = $1', [especieanimal]);
        let idEspecie = especieResult.rows.length ? especieResult.rows[0].idespecie :
            (await query('INSERT INTO especie (especieanimal) VALUES ($1) RETURNING idespecie', [especieanimal])).rows[0].idespecie;

        // Buscar/crear raza
        let razaResult = await query('SELECT idraza FROM raza WHERE razaanimal = $1 AND idespecie = $2', [razaanimal, idEspecie]);
        let idRaza = razaResult.rows.length ? razaResult.rows[0].idraza :
            (await query('INSERT INTO raza (idespecie, razaanimal) VALUES ($1, $2) RETURNING idraza', [idEspecie, razaanimal])).rows[0].idraza;

        // Actualizar animal
        await query(`
            UPDATE animal 
            SET nombreanimal = $1, edadmesesanimal = $2, generoanimal = $3, 
                pesoanimal = $4, pelaje = $5, tamano = $6, idraza = $7
            WHERE idanimal = $8
        `, [nombreanimal, parseInt(edadmesesanimal), generoanimal,
            pesoanimal ? parseFloat(pesoanimal) : null, pelaje || null, tamaño || null, idRaza, id]);

        // Actualizar descripción en historial más reciente
        if (descripcion) {
            await query(`
                UPDATE historial_animal 
                SET descripcionhistorial = $1 
                WHERE idanimal = $2 
                ORDER BY f_historial DESC, h_historial DESC 
                LIMIT 1
            `, [descripcion, id]);
        }

        console.log('✅ Animal actualizado exitosamente');
        res.json({ message: 'Animal actualizado exitosamente' });

    } catch (error) {
        console.error('Error actualizando animal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// DELETE /api/animals/:id/media/:mediaId - Eliminar medio específico
router.delete('/:id/media/:mediaId', authenticateToken, async (req, res) => {
    try {
        const { id, mediaId } = req.params;

        console.log('Eliminando medio ID:', mediaId, 'del animal ID:', id);

        // Obtener información del archivo antes de eliminarlo
        const mediaResult = await query(`
            SELECT imagen, video FROM galeria WHERE idgaleria = $1 AND idanimal = $2
        `, [mediaId, id]);

        if (mediaResult.rows.length === 0) {
            return res.status(404).json({ message: 'Medio no encontrado' });
        }

        const media = mediaResult.rows[0];

        // Eliminar de la base de datos
        await query('DELETE FROM galeria WHERE idgaleria = $1', [mediaId]);

        // Eliminar archivo físico
        const fs = require('fs');
        const path = require('path');
        const filesDir = path.join(__dirname, '../files');

        if (media.imagen) {
            const imagePath = path.join(filesDir, media.imagen);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log('Imagen eliminada:', media.imagen);
            }
        }

        if (media.video) {
            const videoPath = path.join(filesDir, media.video);
            if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath);
                console.log('Video eliminado:', media.video);
            }
        }

        console.log('✅ Medio eliminado exitosamente');
        res.json({ message: 'Medio eliminado exitosamente' });

    } catch (error) {
        console.error('Error eliminando medio:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/animals/:id/media - Agregar nuevos medios a un animal existente
router.post('/:id/media', authenticateToken, upload.fields([{ name: 'imagenAnimal', maxCount: 5 }, { name: 'videoAnimal', maxCount: 2 }]), async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Agregando nuevos medios al animal ID:', id);

        // Verificar que el animal existe
        const animalResult = await query('SELECT idanimal FROM animal WHERE idanimal = $1', [id]);
        if (animalResult.rows.length === 0) {
            return res.status(404).json({ message: 'Animal no encontrado' });
        }

        // Verificar que hay archivos
        if (!req.files || (!req.files.imagenAnimal && !req.files.videoAnimal)) {
            return res.status(400).json({ message: 'No se proporcionaron archivos' });
        }

        const archivosSubidos = [];

        // Procesar imágenes
        if (req.files.imagenAnimal) {
            for (const archivo of req.files.imagenAnimal) {
                console.log('Procesando imagen:', archivo.filename);
                await query('INSERT INTO galeria (idanimal, imagen) VALUES ($1, $2)', [id, archivo.filename]);
                archivosSubidos.push(archivo.filename);
            }
        }

        // Procesar videos
        if (req.files.videoAnimal) {
            for (const archivo of req.files.videoAnimal) {
                console.log('Procesando video:', archivo.filename);
                await query('INSERT INTO galeria (idanimal, video) VALUES ($1, $2)', [id, archivo.filename]);
                archivosSubidos.push(archivo.filename);
            }
        }

        console.log('✅ Nuevos medios agregados exitosamente:', archivosSubidos);
        res.json({
            message: 'Medios agregados exitosamente',
            archivos: archivosSubidos
        });

    } catch (error) {
        console.error('Error agregando medios:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// DELETE /api/animals/:id - Eliminar animal con verificación de adopciones
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        console.log('Verificando eliminación del animal ID:', id);

        // Verificar si el animal está en proceso de adopción
        const adopcionResult = await query(`
            SELECT estadoadopcion FROM adopcion 
            WHERE idanimal = $1 AND estadoadopcion IN ('Pendiente', 'En proceso', 'Aprobada')
        `, [id]);

        if (adopcionResult.rows.length > 0) {
            const estado = adopcionResult.rows[0].estadoadopcion;
            return res.status(400).json({
                message: `No se puede eliminar el animal porque está en proceso de adopción (${estado})`
            });
        }

        // Obtener archivos de galería para eliminarlos físicamente
        const galeriaResult = await query(`
            SELECT imagen, video FROM galeria WHERE idanimal = $1
        `, [id]);

        // Eliminar archivos físicos
        const fs = require('fs');
        const path = require('path');
        const filesDir = path.join(__dirname, '../files');

        galeriaResult.rows.forEach(media => {
            if (media.imagen) {
                const imagePath = path.join(filesDir, media.imagen);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                    console.log('Imagen eliminada:', media.imagen);
                }
            }
            if (media.video) {
                const videoPath = path.join(filesDir, media.video);
                if (fs.existsSync(videoPath)) {
                    fs.unlinkSync(videoPath);
                    console.log('Video eliminado:', media.video);
                }
            }
        });

        // Eliminar en cascada (las restricciones de FK deberían manejar esto)
        // Pero lo hacemos manualmente para asegurar el orden correcto

        // 1. Eliminar detalle_enfermedad
        await query(`
            DELETE FROM detalle_enfermedad 
            WHERE idhistorial IN (
                SELECT idhistorial FROM historial_animal WHERE idanimal = $1
            )
        `, [id]);

        // 2. Eliminar galeria
        await query('DELETE FROM galeria WHERE idanimal = $1', [id]);

        // 3. Eliminar historial_animal
        await query('DELETE FROM historial_animal WHERE idanimal = $1', [id]);

        // 4. Eliminar adopcion (si existe)
        await query('DELETE FROM adopcion WHERE idanimal = $1', [id]);

        // 5. Finalmente eliminar el animal
        await query('DELETE FROM animal WHERE idanimal = $1', [id]);

        console.log('✅ Animal eliminado exitosamente con todos sus datos relacionados');
        res.json({ message: 'Animal eliminado exitosamente' });

    } catch (error) {
        console.error('Error eliminando animal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/animals/filtros/opciones
router.get('/filtros/opciones', async (req, res) => {
    try {
        // Obtener especies únicas
        const especiesResult = await query(`
            SELECT DISTINCT e.especieanimal
            FROM especie e
            JOIN raza r ON e.idespecie = r.idespecie
            JOIN animal a ON r.idraza = a.idraza
            WHERE a.idanimal NOT IN (SELECT idanimal FROM adopcion WHERE estadoadopcion = 'Aprobada')
            ORDER BY e.especieanimal
        `);

        // Obtener pelajes únicos
        const pelajesResult = await query(`
            SELECT DISTINCT pelaje
            FROM animal
            WHERE pelaje IS NOT NULL AND pelaje != ''
            AND idanimal NOT IN (SELECT idanimal FROM adopcion WHERE estadoadopcion = 'Aprobada')
            ORDER BY pelaje
        `);

        // Obtener tamaños únicos
        const tamañosResult = await query(`
            SELECT DISTINCT tamano
            FROM animal
            WHERE tamano IS NOT NULL AND tamano != ''
            AND idanimal NOT IN (SELECT idanimal FROM adopcion WHERE estadoadopcion = 'Aprobada')
            ORDER BY tamano
        `);

        // Obtener géneros únicos
        const generosResult = await query(`
            SELECT DISTINCT
                CASE 
                    WHEN generoanimal = 'M' THEN 'Macho'
                    WHEN generoanimal = 'H' THEN 'Hembra'
                    ELSE generoanimal
                END as genero_display,
                generoanimal
            FROM animal
            WHERE generoanimal IS NOT NULL AND generoanimal != ''
            AND idanimal NOT IN (SELECT idanimal FROM adopcion WHERE estadoadopcion = 'Aprobada')
            ORDER BY generoanimal
        `);

        // Obtener edades únicas (agrupadas por rangos)
        const edadesResult = await query(`
            SELECT DISTINCT
                CASE
                    WHEN edadmesesanimal <= 6 THEN '0-6 meses'
                    WHEN edadmesesanimal <= 12 THEN '7-12 meses'
                    WHEN edadmesesanimal <= 24 THEN '1-2 años'
                    WHEN edadmesesanimal <= 60 THEN '3-5 años'
                    ELSE '5+ años'
                END as rango_edad
            FROM animal
            WHERE edadmesesanimal IS NOT NULL
            AND idanimal NOT IN (SELECT idanimal FROM adopcion WHERE estadoadopcion = 'Aprobada')
            ORDER BY rango_edad
        `);

        const opciones = {
            especies: especiesResult.rows.map(row => row.especieanimal),
            pelajes: pelajesResult.rows.map(row => row.pelaje),
            tamaños: tamañosResult.rows.map(row => row.tamano),
            generos: generosResult.rows.map(row => ({
                valor: row.generoanimal,
                display: row.genero_display
            })),
            edades: edadesResult.rows.map(row => row.rango_edad)
        };

        res.json({
            message: 'Opciones de filtros obtenidas exitosamente',
            data: opciones
        });

    } catch (error) {
        console.error('Error obteniendo opciones de filtros:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/animals/apadrinar
router.post('/apadrinar', authenticateToken, async (req, res) => {
    try {
        const { idAnimal } = req.body;
        const idUsuario = req.user.idusuario;

        if (!idAnimal) return res.status(400).json({ message: 'ID del animal es requerido' });

        // Verificar que el animal existe
        const animalResult = await query('SELECT idanimal FROM animal WHERE idanimal = $1', [idAnimal]);
        if (!animalResult.rows.length) return res.status(404).json({ message: 'Animal no encontrado' });

        // Obtener o crear categoría para apadrinamiento
        let categoriaResult = await query("SELECT idcategoria FROM categoria_donacion WHERE nombcategoria = 'Apadrinamiento'");
        let idCategoria;
        if (categoriaResult.rows.length) {
            idCategoria = categoriaResult.rows[0].idcategoria;
        } else {
            // Insertar categoría si no existe
            const insertCategoria = await query("INSERT INTO categoria_donacion (nombcategoria) VALUES ('Apadrinamiento') RETURNING idcategoria");
            idCategoria = insertCategoria.rows[0].idcategoria;
        }

        // Insertar donación
        const donacionResult = await query(`
            INSERT INTO donacion (f_donacion, h_donacion, idusuario)
            VALUES (CURRENT_DATE, CURRENT_TIME, $1)
            RETURNING iddonacion
        `, [idUsuario]);
        const idDonacion = donacionResult.rows[0].iddonacion;

        // Insertar detalle donación (cantidad 0 para apadrinamiento simbólico)
        await query(`
            INSERT INTO detalle_donacion (cantidaddonacion, iddonacion, idcategoria)
            VALUES (0, $1, $2)
        `, [idDonacion, idCategoria]);

        // Insertar apadrinamiento
        const apadrinamientoResult = await query(`
            INSERT INTO apadrinamiento (f_inicio, frecuencia, iddonacion, idanimal)
            VALUES (CURRENT_DATE, 'Mensual', $1, $2)
            RETURNING idapadrinamiento
        `, [idDonacion, idAnimal]);

        res.status(201).json({
            message: 'Apadrinamiento registrado exitosamente',
            data: {
                idApadrinamiento: apadrinamientoResult.rows[0].idapadrinamiento,
                animal: idAnimal,
                frecuencia: 'Mensual'
            }
        });
    } catch (error) {
        console.error('Error registrando apadrinamiento:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;

