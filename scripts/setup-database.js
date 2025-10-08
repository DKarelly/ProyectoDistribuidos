const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: '../config.env' });

// Configuración de conexión para setup (sin especificar base de datos)
const setupPool = new Pool({
    host: process.env.DB_HOST,
    database: 'postgres', // Conectar a la BD por defecto
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Pool para la base de datos del proyecto
const projectPool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
    const client = await setupPool.connect();
    
    try {
        console.log('🔄 Configurando base de datos...');
        
        // Verificar si la base de datos existe
        const dbCheck = await client.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [process.env.DB_DATABASE]
        );
        
        if (dbCheck.rows.length === 0) {
            console.log(`📦 Creando base de datos: ${process.env.DB_DATABASE}`);
            await client.query(`CREATE DATABASE "${process.env.DB_DATABASE}"`);
            console.log('✅ Base de datos creada exitosamente');
        } else {
            console.log('✅ Base de datos ya existe');
        }
        
    } catch (error) {
        console.error('❌ Error configurando base de datos:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

async function runSQLScript() {
    const client = await projectPool.connect();
    
    try {
        console.log('🔄 Ejecutando script SQL...');
        
        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, '../bd_source.txt');
        const sqlScript = fs.readFileSync(sqlPath, 'utf8');
        
        // Dividir el script en comandos individuales
        const commands = sqlScript
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
        
        console.log(`📝 Ejecutando ${commands.length} comandos SQL...`);
        
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            if (command.trim()) {
                try {
                    await client.query(command);
                    console.log(`✅ Comando ${i + 1}/${commands.length} ejecutado`);
                } catch (error) {
                    // Algunos errores son esperados (como tablas que ya existen)
                    if (error.message.includes('already exists') || 
                        error.message.includes('ya existe')) {
                        console.log(`⚠️  Comando ${i + 1}/${commands.length} - Elemento ya existe`);
                    } else {
                        console.error(`❌ Error en comando ${i + 1}:`, error.message);
                        throw error;
                    }
                }
            }
        }
        
        console.log('✅ Script SQL ejecutado exitosamente');
        
    } catch (error) {
        console.error('❌ Error ejecutando script SQL:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

async function verifySetup() {
    const client = await projectPool.connect();
    
    try {
        console.log('🔄 Verificando configuración...');
        
        // Verificar tablas principales
        const tables = ['rol', 'usuario', 'especie', 'raza', 'animal', 'adopcion', 'donacion'];
        
        for (const table of tables) {
            const result = await client.query(
                'SELECT COUNT(*) FROM information_schema.tables WHERE table_name = $1',
                [table]
            );
            
            if (result.rows[0].count === '1') {
                console.log(`✅ Tabla '${table}' existe`);
            } else {
                console.log(`❌ Tabla '${table}' no encontrada`);
            }
        }
        
        // Verificar datos de prueba
        const rolCount = await client.query('SELECT COUNT(*) FROM rol');
        const usuarioCount = await client.query('SELECT COUNT(*) FROM usuario');
        const animalCount = await client.query('SELECT COUNT(*) FROM animal');
        
        console.log(`📊 Datos de prueba:`);
        console.log(`   - Roles: ${rolCount.rows[0].count}`);
        console.log(`   - Usuarios: ${usuarioCount.rows[0].count}`);
        console.log(`   - Animales: ${animalCount.rows[0].count}`);
        
        console.log('✅ Verificación completada');
        
    } catch (error) {
        console.error('❌ Error verificando configuración:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

async function main() {
    try {
        console.log('🚀 Iniciando configuración de base de datos...\n');
        
        await setupDatabase();
        console.log('');
        
        await runSQLScript();
        console.log('');
        
        await verifySetup();
        console.log('');
        
        console.log('🎉 ¡Configuración completada exitosamente!');
        console.log('📋 Próximos pasos:');
        console.log('   1. Ajusta la configuración en config.env si es necesario');
        console.log('   2. Ejecuta: npm install');
        console.log('   3. Ejecuta: npm run dev');
        console.log('   4. Abre: http://localhost:3000');
        
    } catch (error) {
        console.error('\n💥 Error en la configuración:', error.message);
        process.exit(1);
    } finally {
        await setupPool.end();
        await projectPool.end();
    }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
    main();
}

module.exports = { setupDatabase, runSQLScript, verifySetup };

