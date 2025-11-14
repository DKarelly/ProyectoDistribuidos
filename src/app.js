const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Ruta raíz para servir la página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'HUELLA FELIZ.html'));
});

// Ruta para HUELLA FELIZ.html con espacios en URL
app.get('/HUELLA%20FELIZ.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'HUELLA FELIZ.html'));
});

// Rutas para servir páginas HTML directamente
app.get('/adopciones.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'adopciones.html'));
});

app.get('/donaciones.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'donaciones.html'));
});

app.get('/blog.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'blog.html'));
});

app.get('/reportar.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'reportar.html'));
});

app.get('/acercaDe.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'acercaDe.html'));
});

app.get('/iniciarSesion.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'iniciarSesion.html'));
});

app.get('/registrate.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'registrate.html'));
});

app.get('/animales.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'animales.html'));
});

app.get('/apadrinamiento.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'apadrinamiento.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'dashboard.html'));
});

app.get('/especieRaza.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'especieRaza.html'));
});

app.get('/roles.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'roles.html'));
});

app.get('/usuarios.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'usuarios.html'));
});

app.get('/agregarMascota.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'agregarMascota.html'));
});

app.get('/CRUDadopcion.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'CRUDadopcion.html'));
});

app.get('/enfermedades.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'enfermedades.html'));
});

// Rutas base
app.use('/api/auth', require('./modules/auth/auth.routes').router);
app.use('/api/animals', require('./modules/animals/animals.routes'));
app.use('/api/adoptions', require('./modules/adoptions/adoptions.routes'));
app.use('/api/apadrinamiento', require('./modules/apadrinamiento/apadrinamiento.routes'));
app.use('/api/solicitudes-apadrinamiento', require('./modules/apadrinamiento/solicitudes.routes'));
app.use('/api/donations', require('./modules/donations/donations.routes'));
app.use('/api/reports', require('./modules/reports/reports.routes'));
app.use('/api/blog', require('./modules/blog/blog.routes'));
app.use('/api/users', require('./modules/users/users.routes'));
app.use('/api/roles', require('./modules/roles/roles.routes'));
app.use('/api/stats', require('./modules/stats/stats.routes'));
app.use('/api/especieRaza', require('./modules/especieRaza/especieRaza.routes'));
app.use('/api/enfermedades', require('./modules/enfermedades/enfermedades.routes'));
module.exports = app;
