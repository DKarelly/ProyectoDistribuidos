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

    if (donaciones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">No hay donaciones registradas aún</td>
            </tr>
        `;
        return;
    }

    donaciones.forEach(donacion => {
        const row = document.createElement('tr');

        // Formatear fecha a YYYY-MM-DD
        const fecha = new Date(donacion.f_donacion).toISOString().split('T')[0];
        // Formatear hora a HH:MM
        const hora = donacion.h_donacion ? donacion.h_donacion.substring(0, 5) : 'N/A';

        row.innerHTML = `
            <td>${donacion.nombcategoria}</td>
            <td>${fecha}</td>
            <td>${hora}</td>
            <td>
                ${donacion.cantidaddonacion || 'N/A'}
                ${donacion.detalledonacion ? `<br><small class="text-muted">${donacion.detalledonacion}</small>` : ''}
            </td>
            <td>${donacion.aliasusuario || 'Donante anónimo'}</td>
        `;

        tbody.appendChild(row);
    });
}

// Función para registrar donación (Alimentos, Medicinas, Otros)
async function registrarDonacion(event, tipo) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const descripcion = formData.get('descripcion');
    const cantidad = parseFloat(formData.get('cantidad'));
    const unidadMedida = formData.get('unidadMedida') || '';

    // Validar datos según el tipo
    if (tipo === 'alimentos' || tipo === 'medicinas') {
        if (!descripcion || !cantidad || cantidad <= 0) {
            alert('Por favor completa todos los campos requeridos');
            return;
        }
    } else if (tipo === 'otros') {
        if (!descripcion) {
            alert('Por favor completa la descripción');
            return;
        }
    }

    // Obtener token si el usuario está logueado
    const token = localStorage.getItem('authToken');
    console.log('Token obtenido:', token ? 'Sí' : 'No');
    const idUsuario = token ? await obtenerIdUsuario(token) : null;
    console.log('ID Usuario obtenido:', idUsuario);

    const data = {
        descripcion: descripcion,
        cantidad: cantidad || 1,
        unidadMedida: unidadMedida
    };

    // Preparar headers con token si existe
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`/api/donations/${tipo}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(form.closest('.modal'));
            modal.hide();

            // Mostrar mensaje de éxito
            alert(`¡${result.message}! Gracias por tu donación.`);

            // Limpiar formulario
            form.reset();

            // Recargar historial
            cargarDonaciones();
        } else {
            alert(`Error: ${result.message || 'No se pudo registrar la donación'}`);
        }
    } catch (error) {
        console.error('Error registrando donación:', error);
        alert('Error al registrar la donación. Por favor intenta nuevamente.');
    }
}

// Función auxiliar para obtener ID de usuario desde el token
async function obtenerIdUsuario(token) {
    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.error('Error en respuesta de verify:', response.status);
            return null;
        }
        
        const data = await response.json();
        console.log('Datos de verify:', data);
        
        // El token JWT contiene idusuario directamente
        if (data.data && data.data.idusuario) {
            return data.data.idusuario;
        }
        
        // Si no está en data.data, intentar decodificar el token directamente
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.idusuario || null;
        } catch (e) {
            console.error('Error decodificando token:', e);
            return null;
        }
    } catch (error) {
        console.error('Error obteniendo ID de usuario:', error);
        return null;
    }
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

// Función para cargar métodos de pago desde la API
async function cargarMetodosPago() {
    try {
        const response = await fetch('/api/donations/metodos-pago');
        const data = await response.json();

        if (data.message === 'Métodos de pago obtenidos exitosamente' && data.data && data.data.length > 0) {
            const contenedorMetodos = document.getElementById('metodos-pago-container');
            if (!contenedorMetodos) return;

            contenedorMetodos.innerHTML = '';

            data.data.forEach(metodo => {
                if (!metodo || !metodo.nombremetodo) return; // Skip invalid entries
                
                const col = document.createElement('div');
                col.className = 'col-6 col-sm-4 col-md-3';

                const nombreMetodo = metodo.nombremetodo || '';
                const numeroCuenta = metodo.numerocuenta || '';
                
                const texto = numeroCuenta 
                    ? `${nombreMetodo}: ${numeroCuenta}`
                    : nombreMetodo;

                const idTexto = nombreMetodo.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/ñ/g, 'n')
                    .replace(/[áàäâ]/g, 'a')
                    .replace(/[éèëê]/g, 'e')
                    .replace(/[íìïî]/g, 'i')
                    .replace(/[óòöô]/g, 'o')
                    .replace(/[úùüû]/g, 'u');

                col.innerHTML = `
                    <div class="logo-card p-3 text-center">
                        <img src="${metodo.imagenqr || ''}" alt="${nombreMetodo}" 
                             class="img-fluid mb-3" 
                             style="max-height: 250px; width: auto; object-fit: contain;" 
                             id="img-${idTexto}"
                             onerror="this.style.display='none'">
                        <div class="small text-muted" id="texto-${idTexto}">${texto}</div>
                    </div>
                `;

                contenedorMetodos.appendChild(col);
            });
        }
    } catch (error) {
        console.error('Error cargando métodos de pago:', error);
        // Si falla, se mantienen los valores estáticos del HTML
    }
}

// Cargar categorías y donaciones iniciales al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    cargarCategorias();
    cargarDonaciones();
    cargarMetodosPago();
});

// Hacer funciones globales para que los formularios puedan llamarlas
window.registrarDonacion = registrarDonacion;
