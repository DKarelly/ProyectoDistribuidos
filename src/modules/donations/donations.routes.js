const express = require('express');
const { query } = require('../../config/database');
const { authenticateToken } = require('../auth/auth.routes');
const router = express.Router();

// GET /api/donations/historial
router.get('/historial', async (req, res) => {
    try {
        const { categoria, fecha, usuario } = req.query;

        let whereConditions = [];
        let params = [];
        let paramCount = 0;

        if (categoria) {
            paramCount++;
            whereConditions.push(`cd.nombcategoria ILIKE $${paramCount}`);
            params.push(`%${categoria}%`);
        }

        if (fecha) {
            paramCount++;
            whereConditions.push(`d.f_donacion = $${paramCount}::date`);
            params.push(fecha);
        }

        if (usuario) {
            paramCount++;
            whereConditions.push(`u.aliasusuario ILIKE $${paramCount}`);
            params.push(`%${usuario}%`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const sql = `
            SELECT
                dd.iddetalledonacion,
                dd.cantidaddonacion,
                dd.detalledonacion,
                cd.nombcategoria,
                d.f_donacion,
                d.h_donacion,
                COALESCE(u.aliasusuario, 'Donante anónimo') as aliasusuario
            FROM detalle_donacion dd
            JOIN donacion d ON dd.iddonacion = d.iddonacion
            JOIN categoria_donacion cd ON dd.idcategoria = cd.idcategoria
            LEFT JOIN usuario u ON d.idusuario = u.idusuario
            ${whereClause}
            ORDER BY d.f_donacion DESC, d.h_donacion DESC
        `;

        const result = await query(sql, params);

        res.json({
            message: 'Historial de donaciones obtenido exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo historial de donaciones:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/donations/crear
router.post('/crear', authenticateToken, async (req, res) => {
    try {
        const { donaciones } = req.body;
        const idUsuario = req.user.idusuario;

        if (!donaciones || !Array.isArray(donaciones) || donaciones.length === 0) {
            return res.status(400).json({ message: 'Se requiere al menos una donación' });
        }

        // Verificar que todas las categorías existen
        for (const donacion of donaciones) {
            const categoriaResult = await query(
                'SELECT idcategoria FROM categoria_donacion WHERE idcategoria = $1',
                [donacion.idcategoria]
            );

            if (categoriaResult.rows.length === 0) {
                return res.status(400).json({
                    message: `Categoría con ID ${donacion.idcategoria} no encontrada`
                });
            }
        }

        // Crear donación principal
        const donacionResult = await query(`
            INSERT INTO donacion (idusuario, f_donacion, h_donacion)
            VALUES ($1, CURRENT_DATE, CURRENT_TIME)
            RETURNING iddonacion
        `, [idUsuario]);

        const idDonacion = donacionResult.rows[0].iddonacion;

        // Crear detalles de donación
        const detallesPromises = donaciones.map(donacion =>
            query(`
                INSERT INTO detalle_donacion (iddonacion, idcategoria, cantidaddonacion, detalledonacion)
                VALUES ($1, $2, $3, $4)
                RETURNING iddetalledonacion
            `, [idDonacion, donacion.idcategoria, donacion.cantidaddonacion, donacion.detalledonacion])
        );

        await Promise.all(detallesPromises);

        res.status(201).json({
            message: 'Donación creada exitosamente',
            data: {
                idDonacion,
                fechadonacion: new Date().toISOString().split('T')[0],
                cantidadDetalles: donaciones.length
            }
        });

    } catch (error) {
        console.error('Error creando donación:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/donations/economica
router.post('/economica', authenticateToken, async (req, res) => {
    try {
        const { monto, metodoPago, mensaje } = req.body;
        const idUsuario = req.user.idusuario;

        if (!monto || monto <= 0) {
            return res.status(400).json({ message: 'Monto válido requerido' });
        }

        // Buscar o crear categoría "Efectivo"
        let categoriaResult = await query(
            'SELECT idcategoria FROM categoria_donacion WHERE categoria = $1',
            ['Efectivo']
        );

        let idCategoria;
        if (categoriaResult.rows.length === 0) {
            const newCategoriaResult = await query(
                'INSERT INTO categoria_donacion (categoria) VALUES ($1) RETURNING idcategoria',
                ['Efectivo']
            );
            idCategoria = newCategoriaResult.rows[0].idcategoria;
        } else {
            idCategoria = categoriaResult.rows[0].idcategoria;
        }

        // Crear donación económica
        const donacionResult = await query(`
            INSERT INTO donacion (idusuario, f_donacion, h_donacion)
            VALUES ($1, CURRENT_DATE, CURRENT_TIME)
            RETURNING iddonacion
        `, [idUsuario]);

        const idDonacion = donacionResult.rows[0].iddonacion;

        const detalleResult = await query(`
            INSERT INTO detalle_donacion (iddonacion, idcategoria, cantidaddonacion, detalledonacion)
            VALUES ($1, $2, $3, $4)
            RETURNING iddetalledonacion
        `, [idDonacion, idCategoria, monto, mensaje || `Donación económica vía ${metodoPago || 'transferencia'}`]);

        res.status(201).json({
            message: 'Donación económica registrada exitosamente',
            data: {
                idDonacion,
                idDetalleDonacion: detalleResult.rows[0].iddetalledonacion,
                monto,
                fechadonacion: new Date().toISOString().split('T')[0]
            }
        });

    } catch (error) {
        console.error('Error creando donación económica:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/donations/categorias
router.get('/categorias', async (req, res) => {
    try {
        const result = await query('SELECT * FROM categoria_donacion ORDER BY nombcategoria');

        res.json({
            message: 'Categorías obtenidas exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo categorías:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/donations/metodos-pago
router.get('/metodos-pago', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                idMetodoPago,
                nombreMetodo,
                numeroCuenta,
                imagenQR,
                ordenVisual
            FROM metodo_pago 
            WHERE activo = true
            ORDER BY ordenVisual
        `);

        res.json({
            message: 'Métodos de pago obtenidos exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo métodos de pago:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/donations/alimentos
router.post('/alimentos', async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next();
}, async (req, res) => {
    try {
        const { descripcion, cantidad, unidadMedida } = req.body;
        const idUsuario = req.user ? req.user.idusuario : null;

        console.log('Donación alimentos recibida:', { descripcion, cantidad, unidadMedida, idUsuario, token: req.user ? 'Sí' : 'No' });

        if (!descripcion || !cantidad || cantidad <= 0) {
            return res.status(400).json({
                message: 'Los campos descripción y cantidad son requeridos'
            });
        }

        // Obtener ID de categoría "Alimentos"
        const categoriaResult = await query(
            'SELECT idcategoria FROM categoria_donacion WHERE nombcategoria = $1',
            ['Alimentos']
        );

        if (categoriaResult.rows.length === 0) {
            return res.status(500).json({
                message: 'Categoría "Alimentos" no encontrada'
            });
        }

        const idCategoria = categoriaResult.rows[0].idcategoria;

        // Crear donación
        console.log('Insertando donación con idUsuario:', idUsuario);
        const donacionResult = await query(`
            INSERT INTO donacion (idusuario, f_donacion, h_donacion)
            VALUES ($1, (now() at time zone 'America/Lima')::date, (now() at time zone 'America/Lima')::time)
            RETURNING iddonacion, idusuario
        `, [idUsuario || null]);
        console.log('Donación creada:', donacionResult.rows[0]);

        const idDonacion = donacionResult.rows[0].iddonacion;

        // Crear detalle de donación
        const detalleDescripcion = unidadMedida
            ? `${descripcion} - ${cantidad} ${unidadMedida}`
            : `${descripcion} - ${cantidad}`;

        await query(`
            INSERT INTO detalle_donacion (iddonacion, idcategoria, cantidaddonacion, detalledonacion)
            VALUES ($1, $2, $3, $4)
            RETURNING iddetalledonacion
        `, [idDonacion, idCategoria, cantidad, detalleDescripcion]);

        res.status(201).json({
            message: 'Donación de alimentos registrada exitosamente',
            data: { iddonacion: idDonacion }
        });

    } catch (error) {
        console.error('Error registrando donación de alimentos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/donations/medicinas
router.post('/medicinas', async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next();
}, async (req, res) => {
    try {
        const { descripcion, cantidad, unidadMedida } = req.body;
        const idUsuario = req.user ? req.user.idusuario : null;

        console.log('Donación medicinas recibida:', { descripcion, cantidad, unidadMedida, idUsuario, token: req.user ? 'Sí' : 'No' });

        if (!descripcion || !cantidad || cantidad <= 0) {
            return res.status(400).json({
                message: 'Los campos descripción y cantidad son requeridos'
            });
        }

        // Obtener ID de categoría "Medicinas"
        const categoriaResult = await query(
            'SELECT idcategoria FROM categoria_donacion WHERE nombcategoria = $1',
            ['Medicinas']
        );

        if (categoriaResult.rows.length === 0) {
            return res.status(500).json({
                message: 'Categoría "Medicinas" no encontrada'
            });
        }

        const idCategoria = categoriaResult.rows[0].idcategoria;

        // Crear donación
        console.log('Insertando donación con idUsuario:', idUsuario);
        const donacionResult = await query(`
            INSERT INTO donacion (idusuario, f_donacion, h_donacion)
            VALUES ($1, (now() at time zone 'America/Lima')::date, (now() at time zone 'America/Lima')::time)
            RETURNING iddonacion, idusuario
        `, [idUsuario || null]);
        console.log('Donación creada:', donacionResult.rows[0]);

        const idDonacion = donacionResult.rows[0].iddonacion;

        // Crear detalle de donación
        const detalleDescripcion = unidadMedida
            ? `${descripcion} - ${cantidad} ${unidadMedida}`
            : `${descripcion} - ${cantidad}`;

        await query(`
            INSERT INTO detalle_donacion (iddonacion, idcategoria, cantidaddonacion, detalledonacion)
            VALUES ($1, $2, $3, $4)
            RETURNING iddetalledonacion
        `, [idDonacion, idCategoria, cantidad, detalleDescripcion]);

        res.status(201).json({
            message: 'Donación de medicinas registrada exitosamente',
            data: { iddonacion: idDonacion }
        });

    } catch (error) {
        console.error('Error registrando donación de medicinas:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/donations/otros
router.post('/otros', async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next();
}, async (req, res) => {
    try {
        const { descripcion, cantidad, unidadMedida } = req.body;
        const idUsuario = req.user ? req.user.idusuario : null;

        console.log('Donación otros recibida:', { descripcion, cantidad, unidadMedida, idUsuario, token: req.user ? 'Sí' : 'No' });

        if (!descripcion) {
            return res.status(400).json({
                message: 'El campo descripción es requerido'
            });
        }

        // Obtener ID de categoría "Otros"
        const categoriaResult = await query(
            'SELECT idcategoria FROM categoria_donacion WHERE nombcategoria = $1',
            ['Otros']
        );

        if (categoriaResult.rows.length === 0) {
            return res.status(500).json({
                message: 'Categoría "Otros" no encontrada'
            });
        }

        const idCategoria = categoriaResult.rows[0].idcategoria;

        // Crear donación
        console.log('Insertando donación con idUsuario:', idUsuario);
        const donacionResult = await query(`
            INSERT INTO donacion (idusuario, f_donacion, h_donacion)
            VALUES ($1, (now() at time zone 'America/Lima')::date, (now() at time zone 'America/Lima')::time)
            RETURNING iddonacion, idusuario
        `, [idUsuario || null]);
        console.log('Donación creada:', donacionResult.rows[0]);

        const idDonacion = donacionResult.rows[0].iddonacion;

        // Crear detalle de donación
        const detalleDescripcion = cantidad && unidadMedida
            ? `${descripcion} - ${cantidad} ${unidadMedida}`
            : cantidad
                ? `${descripcion} - ${cantidad}`
                : descripcion;

        await query(`
            INSERT INTO detalle_donacion (iddonacion, idcategoria, cantidaddonacion, detalledonacion)
            VALUES ($1, $2, $3, $4)
            RETURNING iddetalledonacion
        `, [idDonacion, idCategoria, cantidad || 1, detalleDescripcion]);

        res.status(201).json({
            message: 'Donación de otros artículos registrada exitosamente',
            data: { iddonacion: idDonacion }
        });

    } catch (error) {
        console.error('Error registrando donación de otros:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/donations/apadrinamiento
router.post('/apadrinamiento', authenticateToken, async (req, res) => {
    try {
        const { idanimal, monto, frecuencia, f_fin, mensaje } = req.body;
        const idUsuario = req.user.idusuario;

        if (!idanimal || !monto || !frecuencia) {
            return res.status(400).json({
                message: 'Los campos animal, monto y frecuencia son requeridos'
            });
        }

        // Verificar que el animal existe
        const animalResult = await query(
            'SELECT idanimal, nombreanimal FROM animal WHERE idanimal = $1',
            [idanimal]
        );

        if (!animalResult.rows.length) {
            return res.status(400).json({ message: 'Animal no encontrado' });
        }

        // Buscar o crear categoría "Apadrinamiento"
        let categoriaResult = await query(
            'SELECT idcategoria FROM categoria_donacion WHERE categoria = $1',
            ['Apadrinamiento']
        );

        let idCategoria;
        if (categoriaResult.rows.length === 0) {
            const newCategoriaResult = await query(
                'INSERT INTO categoria_donacion (categoria) VALUES ($1) RETURNING idcategoria',
                ['Apadrinamiento']
            );
            idCategoria = newCategoriaResult.rows[0].idcategoria;
        } else {
            idCategoria = categoriaResult.rows[0].idcategoria;
        }

        // Crear donación
        const donacionResult = await query(`
            INSERT INTO donacion (idusuario, f_donacion, h_donacion)
            VALUES ($1, CURRENT_DATE, CURRENT_TIME)
            RETURNING iddonacion
        `, [idUsuario]);

        const idDonacion = donacionResult.rows[0].iddonacion;

        // Crear detalle de donación
        const detalleResult = await query(`
            INSERT INTO detalle_donacion (iddonacion, idcategoria, cantidaddonacion, detalledonacion)
            VALUES ($1, $2, $3, $4)
            RETURNING iddetalledonacion
        `, [idDonacion, idCategoria, monto, mensaje || `Apadrinamiento para ${animalResult.rows[0].nombreanimal}`]);

        // Crear registro de apadrinamiento
        const apadrinamientoResult = await query(`
            INSERT INTO apadrinamiento (f_inicio, frecuencia, idanimal, iddonacion)
            VALUES (CURRENT_DATE, $1, $2, $3)
            RETURNING idapadrinamiento
        `, [frecuencia, idanimal, idDonacion]);

        res.status(201).json({
            message: 'Apadrinamiento creado exitosamente',
            data: {
                idApadrinamiento: apadrinamientoResult.rows[0].idapadrinamiento,
                idDonacion,
                animal: animalResult.rows[0].nombreanimal,
                monto,
                frecuencia,
                fechaInicio: new Date().toISOString().split('T')[0]
            }
        });

    } catch (error) {
        console.error('Error creando apadrinamiento:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/donations/apadrinamientos
router.get('/apadrinamientos', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idusuario;

        const result = await query(`
            SELECT 
                ap.idapadrinamiento,
                ap.f_inicio,
                ap.frecuencia,
                ap.f_fin,
                a.nombreanimal,
                a.edadmesesanimal,
                a.generoanimal,
                r.razaanimal,
                e.especieanimal,
                dd.cantidaddonacion as monto,
                dd.detalledonacion
            FROM apadrinamiento ap
            JOIN animal a ON ap.idanimal = a.idanimal
            JOIN raza r ON a.idraza = r.idraza
            JOIN especie e ON r.idespecie = e.idespecie
            JOIN donacion d ON ap.iddonacion = d.iddonacion
            JOIN detalle_donacion dd ON d.iddonacion = dd.iddonacion
            WHERE d.idusuario = $1
            ORDER BY ap.f_inicio DESC
        `, [idUsuario]);

        res.json({
            message: 'Apadrinamientos obtenidos exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo apadrinamientos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/donations/general
router.post('/general', authenticateToken, async (req, res) => {
    try {
        const { proposito, notadonante, monto, mensaje } = req.body;
        const idUsuario = req.user.idusuario;

        if (!proposito || !monto) {
            return res.status(400).json({
                message: 'Los campos propósito y monto son requeridos'
            });
        }

        // Buscar o crear categoría "General"
        let categoriaResult = await query(
            'SELECT idcategoria FROM categoria_donacion WHERE categoria = $1',
            ['General']
        );

        let idCategoria;
        if (categoriaResult.rows.length === 0) {
            const newCategoriaResult = await query(
                'INSERT INTO categoria_donacion (categoria) VALUES ($1) RETURNING idcategoria',
                ['General']
            );
            idCategoria = newCategoriaResult.rows[0].idcategoria;
        } else {
            idCategoria = categoriaResult.rows[0].idcategoria;
        }

        // Crear donación
        const donacionResult = await query(`
            INSERT INTO donacion (idusuario, f_donacion, h_donacion)
            VALUES ($1, CURRENT_DATE, CURRENT_TIME)
            RETURNING iddonacion
        `, [idUsuario]);

        const idDonacion = donacionResult.rows[0].iddonacion;

        // Crear detalle de donación
        const detalleResult = await query(`
            INSERT INTO detalle_donacion (iddonacion, idcategoria, cantidaddonacion, detalledonacion)
            VALUES ($1, $2, $3, $4)
            RETURNING iddetalledonacion
        `, [idDonacion, idCategoria, monto, mensaje || `Donación general: ${proposito}`]);

        // Crear registro de donación general
        const generalResult = await query(`
            INSERT INTO donaciongeneral (proposito, notadonante, iddonacion)
            VALUES ($1, $2, $3)
            RETURNING idgeneral
        `, [proposito, notadonante || null, idDonacion]);

        res.status(201).json({
            message: 'Donación general creada exitosamente',
            data: {
                idGeneral: generalResult.rows[0].idgeneral,
                idDonacion,
                proposito,
                monto,
                fechaDonacion: new Date().toISOString().split('T')[0]
            }
        });

    } catch (error) {
        console.error('Error creando donación general:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/donations/generales
router.get('/generales', authenticateToken, async (req, res) => {
    try {
        const idUsuario = req.user.idusuario;

        const result = await query(`
            SELECT
                dg.idgeneral,
                dg.proposito,
                dg.notadonante,
                dd.cantidaddonacion as monto,
                dd.detalledonacion,
                d.f_donacion
            FROM donaciongeneral dg
            JOIN donacion d ON dg.iddonacion = d.iddonacion
            JOIN detalle_donacion dd ON d.iddonacion = dd.iddonacion
            WHERE d.idusuario = $1
            ORDER BY d.f_donacion DESC
        `, [idUsuario]);

        res.json({
            message: 'Donaciones generales obtenidas exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error obteniendo donaciones generales:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;

