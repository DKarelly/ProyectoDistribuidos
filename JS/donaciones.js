// Función para cargar categorías desde la API
async function cargarCategorias() {
    try {
        const response = await fetch('/api/donations/categorias');
        const data = await response.json();

        if (data.message === 'Categorías obtenidas exitosamente') {
            const categoriaSelect = document.getElementById('categoriaSelect');

            // Limpiar opciones existentes excepto "Todas las categorías"
            categoriaSelect.innerHTML = '<option value="">Todas las categorías</option>';

            // Agregar categorías desde la BD
            data.data.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria.nombcategoria;
                option.textContent = categoria.nombcategoria;
                categoriaSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

// Función para cargar historial de donaciones
async function cargarDonaciones(filtros = {}) {
    try {
        const params = new URLSearchParams();

        if (filtros.categoria) params.append('categoria', filtros.categoria);
        if (filtros.fecha) params.append('fecha', filtros.fecha);
        if (filtros.usuario) params.append('usuario', filtros.usuario);

        const response = await fetch(`/api/donations/historial?${params}`);
        const data = await response.json();

        if (data.message === 'Historial de donaciones obtenido exitosamente') {
            mostrarDonaciones(data.data);
        }
    } catch (error) {
        console.error('Error cargando donaciones:', error);
    }
}

// Función para mostrar donaciones en la tabla
function mostrarDonaciones(donaciones) {
    const tbody = document.getElementById('donacionesBody');
    tbody.innerHTML = '';

    donaciones.forEach(donacion => {
        const row = document.createElement('tr');

        // Formatear fecha a YYYY-MM-DD
        const fecha = new Date(donacion.f_donacion).toISOString().split('T')[0];
        // Formatear hora a HH:MM
        const hora = donacion.h_donacion.substring(0, 5);

        row.innerHTML = `
            <td>${donacion.nombcategoria}</td>
            <td>${fecha}</td>
            <td>${hora}</td>
            <td>${donacion.cantidaddonacion}</td>
            <td>${donacion.aliasusuario}</td>
        `;

        tbody.appendChild(row);
    });
}

// Función para aplicar filtros
function aplicarFiltros() {
    const categoria = document.getElementById('categoriaSelect').value;
    const fecha = document.getElementById('fechaInput').value;
    const usuario = document.getElementById('usuarioInput').value;

    const filtros = {};
    if (categoria) filtros.categoria = categoria;
    if (fecha) filtros.fecha = fecha;
    if (usuario) filtros.usuario = usuario;

    cargarDonaciones(filtros);
}

// Event listeners para filtrado automático
document.getElementById('categoriaSelect').addEventListener('change', aplicarFiltros);
document.getElementById('fechaInput').addEventListener('change', aplicarFiltros);
document.getElementById('fechaInput').addEventListener('blur', aplicarFiltros);
document.getElementById('usuarioInput').addEventListener('input', aplicarFiltros);

// Event listener para el botón de filtrar (opcional, por si quieren filtrar manualmente)
document.getElementById('filtrarBtn').addEventListener('click', aplicarFiltros);

// Event listener para el botón de limpiar
document.getElementById('limpiarBtn').addEventListener('click', () => {
    document.getElementById('categoriaSelect').value = '';
    document.getElementById('fechaInput').value = '';
    document.getElementById('usuarioInput').value = '';
    cargarDonaciones();
});

// Cargar categorías y donaciones iniciales al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    cargarCategorias();
    cargarDonaciones();
});
