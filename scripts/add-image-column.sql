-- Script para usar la tabla galeria existente para imágenes de animales
-- Ejecutar este script en tu base de datos PostgreSQL

-- Primero, insertar registros de historial para los animales existentes
-- (Esto es necesario porque galeria está relacionada con historial_animal)
INSERT INTO historial_animal (idAnimal, pesoHistorial, fechaHistorial, horaHistorial, descripcionHistorial)
VALUES 
    ((SELECT idAnimal FROM animal WHERE nombreAnimal = 'Firulais'), 12.5, CURRENT_DATE, CURRENT_TIME, 'Registro inicial'),
    ((SELECT idAnimal FROM animal WHERE nombreAnimal = 'Michi'), 4.3, CURRENT_DATE, CURRENT_TIME, 'Registro inicial'),
    ((SELECT idAnimal FROM animal WHERE nombreAnimal = 'Zero'), 12.5, CURRENT_DATE, CURRENT_TIME, 'Registro inicial'),
    ((SELECT idAnimal FROM animal WHERE nombreAnimal = 'Jeff'), 12.5, CURRENT_DATE, CURRENT_TIME, 'Registro inicial');

-- Ahora insertar las imágenes en la galería
INSERT INTO galeria (idHistorial, imagen)
VALUES 
    ((SELECT idHistorial FROM historial_animal WHERE idAnimal = (SELECT idAnimal FROM animal WHERE nombreAnimal = 'Firulais') LIMIT 1), 'firulais.jpg'),
    ((SELECT idHistorial FROM historial_animal WHERE idAnimal = (SELECT idAnimal FROM animal WHERE nombreAnimal = 'Michi') LIMIT 1), 'michi.jpg'),
    ((SELECT idHistorial FROM historial_animal WHERE idAnimal = (SELECT idAnimal FROM animal WHERE nombreAnimal = 'Zero') LIMIT 1), 'zero.jpg'),
    ((SELECT idHistorial FROM historial_animal WHERE idAnimal = (SELECT idAnimal FROM animal WHERE nombreAnimal = 'Jeff') LIMIT 1), 'jeff.jpg');

-- Verificar que los datos se insertaron correctamente
SELECT 
    a.nombreAnimal,
    ha.descripcionHistorial,
    g.imagen
FROM animal a
LEFT JOIN historial_animal ha ON a.idAnimal = ha.idAnimal
LEFT JOIN galeria g ON ha.idHistorial = g.idHistorial
ORDER BY a.nombreAnimal;
