# HUELLA FELIZ — Sistema de Adopción de Animales

Sistema web para gestión de adopciones, donaciones, reportes y administración de animales en situación de abandono. Backend en Node.js/Express con PostgreSQL y arquitectura modular (SOA). Sirve también el frontend estático desde `public/`.

## Características

- **Adopciones**: búsquedas, solicitudes y flujo de adopción.
- **Donaciones**: historial y donación económica rápida.
- **Reportes**: registro y consulta de reportes.
- **Autenticación**: registro, login y verificación por JWT.
- **Gestión**: especies, razas, roles, usuarios y estadísticas.
- **Chat IA (opcional)**: integra OpenAI o Google Gemini si configuras API keys.

## Requisitos

- Node.js 16+ (recomendado 18+)
- PostgreSQL (local o en la nube, p. ej. AWS RDS)

## Instalación rápida

```powershell
# 1) Instalar dependencias
npm install

# 2) Crear el archivo de variables de entorno
Copy-Item .\config.env.example .\config.env

# 3) Editar .\config.env con tus credenciales PostgreSQL
# 4) Crear BD/tablas (lee “Base de datos”)

# 5) Ejecutar en desarrollo
npm run dev
```

Servidor en: http://localhost:3000

## Configuración (config.env)

El proyecto lee variables desde `config.env` en la raíz (ver `src/config/database.js`).

Claves principales (ver `config.env.example`):

- `DB_HOST`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`, `DB_SSL`.
- `JWT_SECRET`, `PORT`, `NODE_ENV`.
- IA opcional:
	- OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL` (por defecto `gpt-4o-mini`).
	- Google Gemini: `GOOGLE_API_KEY`, `GOOGLE_MODEL` (permitidos: `gemini-1.5-flash`, `gemini-1.5-pro`).

Notas:
- Si usas RDS u otro servicio gestionado, pon `DB_SSL=true` (acepta certificados no autorizados por defecto).
- `server.js` hace una prueba de conexión al iniciar; si falla, el proceso termina con código 1.

## Base de datos

Puedes inicializar la base y ejecutar el script SQL desde el archivo `CREATE bd` con:

```powershell
npm run setup-db
```

El script:
- Crea la base si no existe.
- Ejecuta el contenido de `CREATE bd` por lotes.
- Verifica tablas y algunos datos de prueba.

## Scripts disponibles

- `npm start`: inicia en modo producción (Node).
- `npm run dev`: inicia en desarrollo con recarga (nodemon).
- `npm run setup-db`: crea la BD y ejecuta el SQL de `CREATE bd`.

## Estructura del proyecto

```
ProyectoDistribuidos/
├─ server.js
├─ package.json
├─ README.md
├─ CHAT_README.md
├─ README.md.patch.txt
├─ SEGURIDAD_SSL.md
├─ DEPLOYMENT.md
├─ CREATE bd
├─ config.env
├─ config.env.example
├─ "config env .txt"
├─ ejecutar
├─ generarHashes.js
├─ public/
│  ├─ CSS/
│  │  ├─ chatWidget.css
│  │  ├─ estilos.css
│  │  ├─ estilosAdop.css
│  │  ├─ EstilosEspecieRaza.css
│  │  └─ EstilosUsuarios.css
│  ├─ files/
│  ├─ html/
│  │  ├─ acercaDe.html
│  │  ├─ adopciones.html
│  │  ├─ agregarMascota.html
│  │  ├─ animales.html
│  │  ├─ apadrinamiento.html
│  │  ├─ blog.html
│  │  ├─ CRUDadopcion.html
│  │  ├─ dashboard.html
│  │  ├─ donaciones.html
│  │  ├─ enfermedades.html
│  │  ├─ especieRaza.html
│  │  ├─ HUELLA FELIZ.html
│  │  ├─ iniciarSesion.html
│  │  ├─ registrate.html
│  │  ├─ reportar.html
│  │  ├─ roles.html
│  │  └─ usuarios.html
│  └─ JS/
│     ├─ adop.js
│     ├─ animales.js
│     ├─ apadrinamiento.js
│     ├─ blog.js
│     ├─ chatWidget.js
│     ├─ codigo.js
│     ├─ dashboard.js
│     ├─ donaciones.js
│     ├─ enfermedades.js
│     ├─ especieRaza.js
│     ├─ pagination.js
│     ├─ paraVerModificarUsuario.js
│     ├─ registrar.js
│     └─ rol.js
├─ scripts/
│  ├─ setup-database.js
│  └─ setup-images.js
└─ src/
	├─ app.js
	├─ config/
	│  └─ database.js
	└─ modules/
		├─ adoptions/
		│  └─ adoptions.routes.js
		├─ animals/
		│  └─ animals.routes.js
		├─ apadrinamiento/
		│  ├─ apadrinamiento.routes.js
		│  └─ solicitudes.routes.js
		├─ auth/
		│  └─ auth.routes.js
		├─ blog/
		│  └─ blog.routes.js
		├─ chat/
		│  ├─ chat.controller.js
		│  ├─ chat.routes.js
		│  └─ chat.service.js
		├─ donations/
		│  └─ donations.routes.js
		├─ enfermedades/
		│  └─ enfermedades.routes.js
		├─ especieRaza/
		│  └─ especieRaza.routes.js
		├─ reports/
		│  └─ reports.routes.js
		├─ roles/
		│  └─ roles.routes.js
		├─ stats/
		│  └─ stats.routes.js
		└─ users/
			└─ users.routes.js
```

Frontend estático:
- Ruta raíz `/` sirve `public/html/HUELLA FELIZ.html`.
- Otras páginas: `/adopciones.html`, `/donaciones.html`, `/blog.html`, `/reportar.html`, etc.

## API (resumen)

Rutas base registradas en `src/app.js`:

- `/api/auth`: registro, login, verify.
- `/api/animals`: animales disponibles, detalle, acciones relacionadas.
- `/api/adoptions`: listar, solicitudes, registro de adopción, actualizar estados, eliminar, búsquedas.
- `/api/apadrinamiento` y `/api/solicitudes-apadrinamiento`.
- `/api/donations`, `/api/reports`, `/api/blog`, `/api/users`, `/api/roles`, `/api/stats`, `/api/especieRaza`, `/api/enfermedades`.

Revisa cada archivo `*.routes.js` para el detalle exacto de endpoints y payloads.

## Solución de problemas

- `npm start` termina con código 1:
	- La prueba de conexión falló. Verifica `config.env` (host, usuario, contraseña, puerto, `DB_SSL`).
	- Asegura que la BD acepte conexiones y que la IP del cliente tenga permiso.
- Error SSL en PostgreSQL:
	- Si es local, usa `DB_SSL=false`.
	- En servicios gestionados, deja `DB_SSL=true` o configura certificados según tu proveedor.
- Puerto ocupado (EADDRINUSE: 3000):
	- Cambia `PORT` en `config.env` o libera el puerto.
- Chat IA no responde:
	- Debes configurar al menos una API: `OPENAI_API_KEY` (empieza con `sk-`) o `GOOGLE_API_KEY`.
	- Modelos válidos Gemini: `gemini-1.5-flash`, `gemini-1.5-pro`.

## Notas de desarrollo

- Express sirve `public/` como estático. Coloca CSS/JS/imagenes dentro de esa carpeta.
- Muchas rutas requieren token JWT (ver `auth.routes.js`).

---

¡Gracias por apoyar a Huella Feliz! 🐾
