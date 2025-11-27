require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
    console.log('Probando conexión a la base de datos...');

    const dbConnected = await testConnection();
    if (!dbConnected) {
        console.error('❌ No se pudo conectar a la base de datos. Verifica tu configuración en config.env');
        process.exit(1);
    }

    console.log('✅ Servidor iniciado exitosamente!');
    console.log(`Puerto: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Base de datos: ${process.env.DB_DATABASE}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
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
    console.log('   - GET  /api/adoptions/mine');
    console.log('   - POST /api/adoptions/registrar_solicitud');
    console.log('   - PUT  /api/adoptions/estado_solicitud/:id');
    console.log('   - POST /api/adoptions/registrar_adopcion/:id');
    console.log('   - GET  /api/adoptions/solicitud');
    console.log('   - GET  /api/adoptions/');
    console.log('   - DELETE /api/adoptions/solicitud/:id');
    console.log('   - GET  /api/adoptions/buscar');
    console.log('   - GET  /api/especieRaza/especies');
    console.log('   - POST /api/especieRaza/especies');
    console.log('   - PUT  /api/especieRaza/especies/:id');
    console.log('   - DELETE /api/especieRaza/especies/:id');
    console.log('   - GET  /api/especieRaza/razas');
    console.log('   - POST /api/especieRaza/razas');
    console.log('   - PUT  /api/especieRaza/razas/:id');
    console.log('   - DELETE /api/especieRaza/razas/:id');
    console.log('   - GET  /api/apadrinamiento');
    console.log('   - POST /api/apadrinamiento');
    console.log('   - PUT  /api/apadrinamiento/:id');
    console.log('   - DELETE /api/apadrinamiento/:id');
    console.log('   - GET  /api/apadrinamiento/usuarios');
    console.log('   - GET  /api/apadrinamiento/animales');

    app.listen(PORT, () => {
        // Server is listening
    });
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
