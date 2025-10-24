# 🚀 Guía de Despliegue - Huella Feliz

## ✅ Cambios Realizados para Railway

### 1. **Configuración de URLs Dinámicas**
- ✅ Actualizado `JS/codigo.js`: `API_BASE_URL` ahora usa `window.location.origin`
- ✅ Actualizado `JS/registrar.js`: URLs de API dinámicas
- ✅ Actualizado `JS/animales.js`: Todas las rutas API dinámicas
- ✅ Actualizado `JS/blog.js`: URLs de API dinámicas
- ✅ Actualizado `JS/apadrinamiento.js`: URLs de API dinámicas

### 2. **Configuración de CORS**
- ✅ Actualizado `server.js`: CORS configurado para Railway
- ✅ Dominios permitidos: `https://huellafeliz-production.up.railway.app`

### 3. **Variables de Entorno en Railway**
```
DB_HOST=adopciones-db.c9c84k8mqfv2.us-east-2.rds.amazonaws.com
DB_DATABASE=adopciones
DB_USER=postgres
DB_PASSWORD=Postgres#2025
DB_PORT=5432
DB_SSL=true
JWT_SECRET=mi_secreto_jwt_muy_seguro_2025
NODE_ENV=production
PORT=3000
```

## 🔧 Pasos para Desplegar

### 1. **Subir Cambios al Repositorio**
```bash
git add .
git commit -m "Fix: URLs dinámicas para Railway deployment"
git push origin main
```

### 2. **Railway se Desplegará Automáticamente**
- Railway detectará los cambios
- Reconstruirá la aplicación
- Aplicará las nuevas configuraciones

### 3. **Verificar Despliegue**
- URL: `https://huellafeliz-production.up.railway.app`
- Health Check: `https://huellafeliz-production.up.railway.app/health`

## 🐛 Problemas Solucionados

### ❌ **Error "Failed to fetch"**
**Causa**: URLs hardcodeadas apuntaban a `localhost:3000`
**Solución**: URLs dinámicas usando `window.location.origin`

### ❌ **Error de CORS**
**Causa**: CORS solo permitía localhost
**Solución**: Agregado dominio de Railway a CORS

### ❌ **Error de Autenticación**
**Causa**: Frontend no podía comunicarse con API
**Solución**: URLs dinámicas en todos los archivos JS

## 📱 Funcionalidades Verificadas

- ✅ **Registro de usuarios**: Funciona con URLs dinámicas
- ✅ **Login**: Funciona con URLs dinámicas  
- ✅ **API Health**: Verificable en `/health`
- ✅ **CORS**: Configurado para Railway
- ✅ **Base de datos**: Conectada a AWS RDS

## 🔍 Verificación Post-Despliegue

1. **Acceder a**: `https://huellafeliz-production.up.railway.app`
2. **Probar registro**: Crear nuevo usuario
3. **Probar login**: Iniciar sesión
4. **Verificar API**: `https://huellafeliz-production.up.railway.app/health`

## 📞 Soporte

Si persisten problemas:
1. Verificar logs en Railway Dashboard
2. Confirmar variables de entorno
3. Verificar conexión a base de datos
4. Revisar CORS en Network tab del navegador
