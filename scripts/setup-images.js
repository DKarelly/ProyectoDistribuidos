const { query } = require('../config/database');

async function setupImages() {
    try {
        console.log('🖼️ Configurando imágenes para animales...');

        // Primero, verificar si ya existen registros de historial
        const existingHistorial = await query('SELECT COUNT(*) as count FROM historial_animal');
        console.log(`📊 Registros de historial existentes: ${existingHistorial.rows[0].count}`);

        if (existingHistorial.rows[0].count === '0') {
            console.log('📝 Insertando registros de historial...');

            // Insertar registros de historial para los animales existentes
            await query(`
                INSERT INTO historial_animal (idAnimal, pesoHistorial, f_historial, h_historial, descripcionHistorial)
                VALUES 
                    ((SELECT idAnimal FROM animal WHERE nombreAnimal = 'Firulais'), 12.5, CURRENT_DATE, CURRENT_TIME, 'Registro inicial'),
                    ((SELECT idAnimal FROM animal WHERE nombreAnimal = 'Michi'), 4.3, CURRENT_DATE, CURRENT_TIME, 'Registro inicial'),
                    ((SELECT idAnimal FROM animal WHERE nombreAnimal = 'Zero'), 12.5, CURRENT_DATE, CURRENT_TIME, 'Registro inicial'),
                    ((SELECT idAnimal FROM animal WHERE nombreAnimal = 'Jeff'), 12.5, CURRENT_DATE, CURRENT_TIME, 'Registro inicial')
            `);
            console.log('✅ Registros de historial insertados');
        }

        // Verificar si ya existen imágenes en galería
        const existingImages = await query('SELECT COUNT(*) as count FROM galeria');
        console.log(`🖼️ Imágenes en galería existentes: ${existingImages.rows[0].count}`);

        if (existingImages.rows[0].count === '0') {
            console.log('📸 Insertando imágenes en galería...');

            // Insertar las imágenes en la galería
            await query(`
                INSERT INTO galeria (idAnimal, imagen)
                VALUES 
                    ((SELECT idAnimal FROM animal WHERE nombreAnimal = 'Firulais'), 'firulais.jpeg'),
                    ((SELECT idAnimal FROM animal WHERE nombreAnimal = 'Michi'), 'michi.jpeg'),
                    ((SELECT idAnimal FROM animal WHERE nombreAnimal = 'Zero'), 'zero.jpg'),
                    ((SELECT idAnimal FROM animal WHERE nombreAnimal = 'Jeff'), 'jeff.jpeg')
            `);
            console.log('✅ Imágenes insertadas en galería');
        }

        // Verificar que todo se configuró correctamente
        console.log('🔍 Verificando configuración...');
        const result = await query(`
            SELECT 
                a.nombreAnimal,
                a.edadMesesAnimal,
                a.generoAnimal,
                r.razaAnimal,
                e.especieAnimal,
                g.imagen
            FROM animal a
            LEFT JOIN raza r ON a.idRaza = r.idRaza
            LEFT JOIN especie e ON r.idEspecie = e.idEspecie
            LEFT JOIN historial_animal ha ON a.idAnimal = ha.idAnimal
            LEFT JOIN galeria g ON a.idAnimal = g.idAnimal
            ORDER BY a.nombreAnimal
        `);

        console.log('📋 Animales configurados:');
        result.rows.forEach(animal => {
            console.log(`  🐾 ${animal.nombreanimal} - ${animal.especieanimal} - ${animal.razaanimal} - Imagen: ${animal.imagen || 'Sin imagen'}`);
        });

        console.log('🎉 ¡Configuración de imágenes completada!');

    } catch (error) {
        console.error('💥 Error configurando imágenes:', error);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    setupImages().then(() => {
        console.log('✅ Script completado');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
}

module.exports = setupImages;

