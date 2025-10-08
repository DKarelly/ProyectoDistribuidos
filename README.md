# HUELLA FELIZ - Sistema de Adopción de Animales

Sistema web completo para la gestión de adopciones, donaciones y reportes de animales en situación de abandono.

## Características

- **Sistema de Adopciones**: Búsqueda y filtrado de animales disponibles
- **Gestión de Donaciones**: Registro de donaciones económicas y en especie
- **Reportes de Animales**: Sistema para reportar animales en riesgo
- **Autenticación de Usuarios**: Registro y login con JWT
- **Panel de Usuario**: Historial de adopciones y donaciones
- **Base de Datos SQL Server**: Integración completa con base de datos

##Tecnologías Utilizadas

### Frontend
- HTML5 + CSS3
- Bootstrap 5.3.3
- JavaScript (ES6+)
- Bootstrap Icons

### Backend
- Node.js + Express.js
- PostgreSQL (pg)
- JWT para autenticación
- bcryptjs para encriptación
- express-validator para validaciones

## Requisitos Previos

1. **Node.js** (versión 16 o superior)
2. **PostgreSQL** (AWS RDS o local)
3. **Git** (opcional)

##  Configuración del Proyecto

### 1. Clonar o descargar el proyecto

```bash
# Si tienes Git
git clone <repository-url>
cd ProyectoDistribuidos-main

# O simplemente descarga y extrae el ZIP
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Base de Datos

#### A. Base de datos PostgreSQL

El proyecto utiliza PostgreSQL. Puedes usar una base de datos local o en la nube (AWS RDS).

#### B. Configurar conexión

1. Crea un archivo `config.env` basado en el ejemplo:

```env
# Configuración de Base de Datos PostgreSQL
DB_HOST=localhost
DB_DATABASE=adopciones
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_PORT=5432
DB_SSL=false

# JWT Secret (cambia por uno único)
JWT_SECRET=tu_jwt_secret_muy_seguro

# Puerto del servidor
PORT=3000

# Modo de desarrollo
NODE_ENV=development
```

#### C. Configurar la base de datos

Ejecuta el script de configuración:

```bash
npm run setup-db
```

Esto creará las tablas necesarias y datos de prueba.

### 4. Iniciar el servidor

```bash
# Modo desarrollo (con reinicio automático)
npm run dev

# Modo producción
npm start
```

El servidor estará disponible en: http://localhost:3000

## Estructura del Proyecto

```
ProyectoHuellaFeliz/
├── config/
│   └── database.js          # Configuración de base de datos
├── routes/
│   ├── auth.js             # Rutas de autenticación
│   ├── animals.js          # Rutas de animales y adopciones
│   ├── donations.js        # Rutas de donaciones
│   ├── reports.js          # Rutas de reportes
│   └── users.js            # Rutas de usuarios
├── scripts/
│   ├── setup-database.js   # Script de configuración inicial
│   ├── add-image-column.sql # Script para agregar columna de imágenes
│   └── setup-images.js     # Script para configurar imágenes
├── CSS/
│   └── estilos.css         # Estilos personalizados
├── JS/
│   └── codigo.js           # JavaScript del frontend
├── files/                  # Imágenes de animales y recursos
├── *.html                  # Páginas web
├── server.js              # Servidor principal
├── package.json           # Dependencias del proyecto
├── .gitignore             # Archivos a ignorar en Git
└── config.env             # Variables de entorno (crear manualmente)
```

## API Endpoints

### Autenticación
- `POST /api/auth/registro` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/verify` - Verificar token

### Animales
- `GET /api/animals/disponibles` - Obtener animales disponibles
- `GET /api/animals/:id` - Obtener detalles de animal
- `POST /api/animals/adoptar` - Solicitar adopción
- `GET /api/animals/filtros/opciones` - Opciones para filtros

### Donaciones
- `GET /api/donations/historial` - Historial de donaciones
- `POST /api/donations/crear` - Crear donación
- `POST /api/donations/economica` - Donación económica rápida
- `GET /api/donations/categorias` - Categorías de donación

### Reportes
- `POST /api/reports/crear` - Crear reporte de animal
- `GET /api/reports/lista` - Lista de reportes
- `GET /api/reports/:id` - Detalles de reporte

### Usuarios
- `GET /api/users/perfil` - Obtener perfil del usuario
- `PUT /api/users/perfil` - Actualizar perfil
- `GET /api/users/adopciones` - Adopciones del usuario
- `GET /api/users/donaciones` - Donaciones del usuario

##  Funcionalidades Principales

### Para Usuarios Anónimos
- Ver animales disponibles para adopción
- Filtrar animales por especie, edad, sexo, etc.
- Ver historial de adopciones exitosas
- Crear reportes de animales en riesgo
- Registrarse e iniciar sesión

### Para Usuarios Autenticados
- Solicitar adopción de animales
- Realizar donaciones económicas
- Ver historial personal de adopciones y donaciones
- Actualizar perfil personal

### Para Administradores
- Gestión completa de animales
- Aprobar/rechazar solicitudes de adopción
- Gestión de reportes
- Estadísticas del sistema

## Desarrollo

### Ejecutar en modo desarrollo

```bash
npm run dev
```

Esto iniciará el servidor con nodemon para reinicio automático en cambios.

### Variables de Entorno Importantes

- `DB_HOST`: Servidor de PostgreSQL AWS
- `DB_DATABASE`: Nombre de la base de datos
- `DB_USER`: Usuario de PostgreSQL
- `DB_PASSWORD`: Contraseña de PostgreSQL
- `JWT_SECRET`: Clave secreta para JWT (¡debe ser única!)
- `PORT`: Puerto del servidor (por defecto 3000)

## 🐛 Solución de Problemas

### Error de conexión a base de datos
1. Verifica que AWS RDS esté disponible
2. Confirma las credenciales en `config.env`
3. Asegúrate de que el puerto 5432 esté abierto en AWS
4. Verifica la configuración SSL

### Error de dependencias
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Error de CORS
El servidor ya incluye configuración CORS, pero si hay problemas:
1. Verifica que el frontend haga peticiones a `http://localhost:3000`
2. Comprueba la configuración en `server.js`

## Soporte

Para reportar bugs o solicitar características:
1. Revisa la documentación
2. Verifica los logs del servidor
3. Contacta al equipo de desarrollo

## Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo LICENSE para más detalles.

---

**¡Gracias por contribuir a salvar vidas de animales! 🐕🐱**
