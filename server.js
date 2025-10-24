const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: './config.env' });

const { testConnection } = require('./config/database');

// Importar rutas
const { router: authRouter } = require('./routes/auth');
const animalsRouter = require('./routes/animals');
const blogRouter = require('./routes/blog');
const donationsRouter = require('./routes/donations');
const reportsRouter = require('./routes/reports');
const usersRouter = require('./routes/users');
const rolesRouter = require('./routes/roles');
const adoptionsRouter = require('./routes/adoptions');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'file://'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));

// Rutas API
app.use('/api/auth', authRouter);
app.use('/api/animals', animalsRouter);
app.use('/api/blog', blogRouter);
app.use('/api/donations', donationsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/adoptions', adoptionsRouter);

// Ruta para servir el archivo principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'HUELLA FELIZ.html'));
});

// Ruta de salud del servidor
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error('Error del servidor:', err);
    res.status(500).json({ 
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
    });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({ 
        message: 'Ruta no encontrada',
        path: req.originalUrl 
    });
});

// Función para iniciar el servidor
async function startServer() {
    try {
        // Probar conexión a la base de datos
        console.log('Probando conexión a la base de datos...');
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('No se pudo conectar a la base de datos. Verifica tu configuración en config.env');
            process.exit(1);
        }

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log('Servidor iniciado exitosamente!');
            console.log(`Puerto: ${PORT}`);
            console.log(`URL: http://localhost:${PORT}`);
            console.log(`Base de datos: ${process.env.DB_DATABASE}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
            console.log(`Modo: ${process.env.NODE_ENV}`);
            console.log('Rutas disponibles:');
            console.log('   - GET  /api/auth/verify');
            console.log('   - POST /api/auth/login');
            console.log('   - POST /api/auth/registro');
            console.log('   - GET  /api/animals/disponibles');
            console.log('   - GET  /api/animals/:id');
            console.log('   - POST /api/animals/adoptar');
            console.log('   - POST /api/blog/apadrinar');
            console.log('   - GET  /api/donations/historial');
            console.log('   - POST /api/donations/economica');
            console.log('   - POST /api/reports/crear');
            console.log('   - GET  /api/users/perfil');
            console.log('   - POST /api/adoption/solicitud');
            console.log('   - PUT  /api/adoption/:id');
            console.log('   - PUT  /api/adoption/estado_solicitud/:id');
            console.log('   - PUT  /api/adoption/estado_adop/:id');
            console.log('   - DELETE /api/adoption/:id');
        });

    } catch (error) {
        console.error('Error iniciando servidor:', error);
        process.exit(1);
    }
}

// Manejar cierre graceful del servidor
process.on('SIGINT', () => {
    console.log('\nCerrando servidor...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nCerrando servidor...');
    process.exit(0);
});

// Iniciar servidor
startServer();

