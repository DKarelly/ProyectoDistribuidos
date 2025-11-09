# HUELLA FELIZ - Sistema de Adopción de Animales

Sistema web completo para la gestión de adopciones, donaciones y reportes de animales en situación de abandono, implementado con arquitectura orientada a servicios (SOA).

## Características

- **Sistema de Adopciones**: Búsqueda, filtrado y solicitud de adopción de animales disponibles
- **Gestión de Donaciones**: Múltiples tipos de donaciones (económicas, alimentos, medicinas, otros, apadrinamiento, generales)
- **Reportes de Animales**: Sistema para reportar animales en riesgo o abandono
- **Autenticación de Usuarios**: Registro y login con JWT
- **Panel de Usuario**: Historial de adopciones, donaciones y perfil personal
- **Base de Datos PostgreSQL**: Integración completa con base de datos en AWS RDS
- **Arquitectura SOA**: Modularización completa de servicios
- **Apadrinamiento**: Sistema de apadrinamiento simbólico de animales
- **Dashboard Administrativo**: Panel completo para gestión del sistema
- **Gestión de Especies y Razas**: CRUD completo para especies y razas
- **Sistema de Roles**: Control de permisos y roles de usuario
- **Sistema de Solicitudes**: Usuarios pueden enviar solicitudes para agregar animales con archivos
- **Galería Multimedia**: Soporte para imágenes y videos de animales
- **Historial Médico**: Seguimiento del historial veterinario y enfermedades
- **Estadísticas del Sistema**: Métricas y reportes administrativos

## Tecnologías Utilizadas

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
- Multer para subida de archivos
- Cors para manejo de CORS
- Helmet para seguridad
- Morgan para logging de requests
- Dotenv para variables de entorno
- Nodemon para desarrollo
- Arquitectura Orientada a Servicios (SOA)

## Requisitos Previos

1. **Node.js** (versión 16 o superior)
2. **PostgreSQL** (AWS RDS o local)
3. **Git** (opcional)

## Configuración del Proyecto

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
DB_HOST=adopciones-db.c9c84k8mqfv2.us-east-2.rds.amazonaws.com
DB_DATABASE=adopciones
DB_USER=adopciones
DB_PASSWORD=tu_password_aqui
DB_PORT=5432
DB_SSL=true

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

## Estructura del Proyecto (SOA)

```
ProyectoDistribuidos/
├── src/
│   ├── app.js              # Configuración principal de Express
│   ├── server.js           # Punto de entrada del servidor
│   ├── config/
│   │   └── database.js     # Configuración de base de datos PostgreSQL
│   ├── modules/            # Arquitectura SOA - Servicios modulares
│   │   ├── auth/
│   │   │   └── auth.routes.js
│   │   ├── animals/
│   │   │   └── animals.routes.js
│   │   ├── adoptions/
│   │   │   └── adoptions.routes.js
│   │   ├── apadrinamiento/
│   │   │   └── apadrinamiento.routes.js
│   │   ├── blog/
│   │   │   └── blog.routes.js
│   │   ├── donations/
│   │   │   └── donations.routes.js
│   │   ├── especieRaza/
│   │   │   └── especieRaza.routes.js
│   │   ├── reports/
│   │   │   └── reports.routes.js
│   │   ├── roles/
│   │   │   └── roles.routes.js
│   │   ├── stats/
│   │   │   └── stats.routes.js
│   │   └── users/
│   │       └── users.routes.js
│   ├── middlewares/        # Middlewares compartidos
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   ├── files/              # Directorio para archivos subidos (imágenes/videos)
│   └── utils/              # Utilidades comunes
│       ├── logger.js
│       └── response.js
├── public/                 # Archivos estáticos (HTML, CSS, JS, imágenes)
│   ├── html/               # Páginas HTML
│   ├── CSS/                # Hojas de estilo
│   ├── JS/                 # Scripts del frontend
│   └── files/              # Imágenes y archivos subidos (simlink)
├── scripts/                # Scripts de configuración y utilidades
│   ├── setup-database.js
│   └── setup-images.js
├── config.env              # Variables de entorno (crear manualmente)
├── config.env.example      # Ejemplo de configuración
├── package.json            # Dependencias del proyecto
├── README.md               # Este archivo
└── SEGURIDAD_SSL.md        # Documentación de seguridad
```

## Arquitectura SOA (Service-Oriented Architecture)

El proyecto está organizado siguiendo principios de Arquitectura Orientada a Servicios:

### Servicios Principales
- **Auth Service**: Gestión de autenticación y autorización JWT
- **Animals Service**: Gestión completa de animales (CRUD, galería, historial médico, solicitudes)
- **Adoptions Service**: Procesos de adopción y gestión de solicitudes
- **Apadrinamiento Service**: Sistema de apadrinamiento simbólico de animales
- **Blog Service**: Gestión de contenido del blog y visualización pública
- **Donations Service**: Gestión de múltiples tipos de donaciones
- **EspecieRaza Service**: CRUD de especies y razas con validaciones
- **Reports Service**: Sistema de reportes de animales en riesgo
- **Roles Service**: Control de roles y permisos de usuario
- **Stats Service**: Estadísticas y métricas del sistema
- **Users Service**: Gestión de usuarios, perfiles y operaciones administrativas

### Beneficios de la Arquitectura SOA
- **Modularidad**: Cada servicio es independiente y autocontenido
- **Mantenibilidad**: Fácil modificación de servicios individuales
- **Escalabilidad**: Servicios pueden escalar independientemente
- **Reutilización**: Servicios pueden ser reutilizados en otros contextos
- **Separación de responsabilidades**: Cada módulo tiene una función específica
- **Facilita el testing**: Cada servicio puede probarse de forma aislada

## API Endpoints

### Autenticación (`/api/auth`)
- `POST /api/auth/registro` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/verify` - Verificar token

### Animales (`/api/animals`)
- `GET /api/animals/disponibles` - Obtener animales disponibles
- `GET /api/animals/:id` - Obtener detalles de animal
- `POST /api/animals/adoptar` - Solicitar adopción
- `POST /api/animals/solicitar` - Enviar solicitud con archivos

### Adopciones (`/api/adoptions`)
- `GET /api/adoptions` - Listar adopciones
- `GET /api/adoptions/solicitud` - Listar solicitudes
- `PUT /api/adoption/:id` - Actualizar adopción
- `PUT /api/adoption/estado_solicitud/:id` - Cambiar estado solicitud
- `PUT /api/adoption/estado_adop/:id` - Cambiar estado adopción
- `DELETE /api/adoption/:id` - Eliminar adopción

### Donaciones (`/api/donations`)
- `GET /api/donations/historial` - Historial de donaciones
- `POST /api/donations/crear` - Crear donación
- `POST /api/donations/economica` - Donación económica rápida
- `GET /api/donations/generales` - Donaciones generales del usuario

### Apadrinamiento (`/api/apadrinamiento`)
- `GET /api/apadrinamiento` - Obtener apadrinamientos (admin)
- `POST /api/apadrinamiento` - Crear apadrinamiento
- `PUT /api/apadrinamiento/:id` - Actualizar apadrinamiento
- `DELETE /api/apadrinamiento/:id` - Eliminar apadrinamiento
- `GET /api/apadrinamiento/usuarios` - Lista de usuarios
- `GET /api/apadrinamiento/animales` - Lista de animales

### Especies y Razas (`/api/especieRaza`)
- `GET /api/especieRaza/especies` - Obtener especies
- `POST /api/especieRaza/especies` - Crear especie
- `PUT /api/especieRaza/especies/:id` - Actualizar especie
- `DELETE /api/especieRaza/especies/:id` - Eliminar especie
- `GET /api/especieRaza/razas` - Obtener razas
- `POST /api/especieRaza/razas` - Crear raza
- `PUT /api/especieRaza/razas/:id` - Actualizar raza
- `DELETE /api/especieRaza/razas/:id` - Eliminar raza

### Reportes (`/api/reports`)
- `POST /api/reports/crear` - Crear reporte de animal
- `GET /api/reports/lista` - Lista de reportes
- `GET /api/reports/:id` - Detalles de reporte

### Usuarios (`/api/users`)
- `GET /api/users/perfil` - Obtener perfil del usuario
- `PUT /api/users/perfil` - Actualizar perfil
- `GET /api/users/adopciones` - Adopciones del usuario
- `GET /api/users/donaciones` - Donaciones del usuario

### Roles (`/api/roles`)
- `GET /api/roles` - Listar roles
- `POST /api/roles` - Crear rol
- `PUT /api/roles/:id` - Actualizar rol
- `DELETE /api/roles/:id` - Eliminar rol

### Estadísticas (`/api/stats`)
- `GET /api/stats/dashboard` - Estadísticas del dashboard
- `GET /api/stats/animales` - Estadísticas de animales
- `GET /api/stats/adopciones` - Estadísticas de adopciones

## Funcionalidades Principales

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
- Apadrinar animales

### Para Administradores
- Gestión completa de animales
- Aprobar/rechazar solicitudes de adopción
- Gestión de reportes
- Gestión de especies y razas
- Gestión de usuarios y roles
- Gestión de apadrinamientos
- Estadísticas del sistema
- Dashboard administrativo completo

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

### Error de rutas en SOA
Si hay errores de rutas después de la reorganización:
1. Verifica que todos los `require()` apunten a las rutas correctas
2. Asegúrate de que los archivos estén en `src/modules/<servicio>/<servicio>.routes.js`
3. Confirma que `src/app.js` tenga todas las rutas registradas

## Soporte

Para reportar bugs o solicitar características:
1. Revisa la documentación
2. Verifica los logs del servidor
3. Contacta al equipo de desarrollo

## Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo LICENSE para más detalles.

---

**¡Gracias por contribuir a salvar vidas de animales! 🐕🐱**
