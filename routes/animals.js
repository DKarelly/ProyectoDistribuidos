const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('./auth');
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

// GET /api/animals - Obtener todos los animales
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT a.*, e.especieanimal, r.razaanimal,
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

// GET /api/animals/disponibles
router.get('/disponibles', async (req, res) => {
    try {
        const { especie, pelaje, tamaño, genero, edad } = req.query;
        let whereConditions = [];
        let params = [];
        let paramCount = 0;

        if (especie) { paramCount++; whereConditions.push(`e.especieanimal = $${paramCount}`); params.push(especie); }
        if (pelaje) { paramCount++; whereConditions.push(`a.pelaje = $${paramCount}`); params.push(pelaje); }
        if (tamaño) { paramCount++; whereConditions.push(`a.tamaño = $${paramCount}`); params.push(tamaño); }
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
                   a.pesoanimal, a.pelaje, a.tamaño, r.razaanimal, e.especieanimal,
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
        const result = await query('SELECT * FROM tipo_enfermedad ORDER BY tipoEnfermedad');
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
                   a.pesoanimal, a.pelaje, a.tamaño, r.razaanimal, e.especieanimal,
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

        const { nombreAnimal, especie, raza, edadMeses, genero, peso, pelaje, tamaño, descripcion, enfermedadId, gravedad, medicinas } = req.body;

        console.log('Datos procesados:', {
            nombreAnimal, especie, raza, edadMeses, genero, peso, pelaje, tamaño, descripcion
        });

        console.log('=== DEBUG TAMAÑO BACKEND ===');
        console.log('Tamaño recibido:', tamaño);
        console.log('Tipo de tamaño:', typeof tamaño);
        console.log('Tamaño es null/undefined:', tamaño === null || tamaño === undefined);
        console.log('Tamaño es string vacío:', tamaño === '');

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

        console.log('Insertando animal con datos:', {
            nombreAnimal, edadMeses: parseInt(edadMeses), genero, peso: peso ? parseFloat(peso) : null,
            pelaje: pelaje || null, tamaño: tamaño || null, idRaza
        });

        const animalResult = await query(`
            INSERT INTO animal (nombreanimal, edadmesesanimal, generoanimal, pesoanimal, pelaje, tamaño, idraza)
            VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING idanimal
        `, [nombreAnimal, parseInt(edadMeses), genero, peso ? parseFloat(peso) : null, pelaje || null, tamaño || null, idRaza]);

        const idAnimal = animalResult.rows[0].idanimal;
        console.log('Animal insertado con ID:', idAnimal);

        const historialResult = await query(`
            INSERT INTO historial_animal (idanimal, pesohistorial, f_historial, h_historial, descripcionhistorial)
            VALUES ($1,$2,CURRENT_DATE,CURRENT_TIME,$3) RETURNING idhistorial
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
        if (!nombreanimal || !especieanimal || !razaanimal || !edadmesesanimal || !generoanimal) {
            return res.status(400).json({ message: 'Los campos obligatorios son: nombre, especie, raza, edad y género' });
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
                pesoanimal = $4, pelaje = $5, tamaño = $6, idraza = $7
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
            SELECT DISTINCT tamaño
            FROM animal
            WHERE tamaño IS NOT NULL AND tamaño != ''
            AND idanimal NOT IN (SELECT idanimal FROM adopcion WHERE estadoadopcion = 'Aprobada')
            ORDER BY tamaño
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
            tamaños: tamañosResult.rows.map(row => row.tamaño),
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

