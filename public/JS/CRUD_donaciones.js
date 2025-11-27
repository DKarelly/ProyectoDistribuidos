// Variables globales
let donacionesData = [];
let currentDonacionesPage = 1;
const itemsPerPage = 10;
const authToken = localStorage.getItem('authToken');

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function () {
    cargarCategorias();
    cargarDonaciones();
    configurarEventos();
    // Set fecha y hora actuales en registrar modal
    setFechaHoraActual('fechaDonacion', 'horaDonacion');
});

// Configurar eventos
function configurarEventos() {
    // Filtros visibles en la UI
    ['filtroIdDonacion', 'filtroFecha', 'filtroAliasNombre', 'filtroCategoria'].forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        const eventName = input.tagName === 'SELECT' || input.type === 'date' ? 'change' : 'input';
        input.addEventListener(eventName, filtrarDonaciones);
    });

    // Formulario registrar
    document.getElementById('formRegistrarDonacion').addEventListener('submit', registrarDonacion);

    // Formulario modificar
    document.getElementById('formModificarDonacion').addEventListener('submit', modificarDonacion);

    // Autocompletado para alias de usuario registrar/modificar
    setupAutocomplete('aliasUsuario', 'idUsuario');
    setupAutocomplete('modAliasUsuario', 'modIdUsuario');
}

// Set fecha y hora actual para inputs readonly
function setFechaHoraActual(idFecha, idHora) {
    const now = new Date();
    const f = now.toISOString().split('T')[0];
    const h = now.toTimeString().slice(0, 5);
    const fechaInput = document.getElementById(idFecha);
    const horaInput = document.getElementById(idHora);
    if(fechaInput) fechaInput.value = f;
    if(horaInput) horaInput.value = h;
}

// Cargar categorias para combo box
async function cargarCategorias() {
    try {
        const response = await fetch('/api/donations/categorias');
        const data = await response.json();
        if (response.ok) {
            const categorias = data.data;
            llenarComboCategorias('categoriaDonacion', categorias);
            llenarComboCategorias('modCategoriaDonacion', categorias);
        } else {
            console.error('Error al cargar categorías:', data.message);
        }
    } catch (error) {
        console.error('Error al conectar al servidor para categorías:', error);
    }
}

// Llenar select con categorías
function llenarComboCategorias(selectId, categorias) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Selecciona una categoría</option>';
    categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.idcategoria;
        option.textContent = cat.nombcategoria;
        select.appendChild(option);
    });
}

// Cargar donaciones con paginación
async function cargarDonaciones(page = 1) {
    try {
        const response = await fetch(`${window.location.origin}/api/donations/historial`);
        const data = await response.json();

        if (response.ok) {
            donacionesData = data.data;
            console.log('Donaciones data loaded:', donacionesData); // DEBUG LOG
            mostrarDonacionesPaginadas(page);
            renderDonacionesPagination(page);
        } else {
            alert('Error al cargar donaciones: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}

// Mostrar donaciones paginadas y filtradas
function mostrarDonacionesPaginadas(page) {
    let filtradas = aplicarFiltro();
    const tbody = document.getElementById('donacionesBody');
    tbody.innerHTML = '';

    currentDonacionesPage = page;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filtradas.slice(start, end);

    pageItems.forEach(donacion => {
        const row = document.createElement('tr');
        const idUsuario = donacion.idusuario ?? 'Sin registro';
        const alias = donacion.aliasusuario || 'Donante anónimo';
        row.innerHTML = `
            <td>${donacion.iddetalledonacion || ''}</td>
            <td>${formatDate(donacion.f_donacion)}</td>
            <td>${formatTime(donacion.h_donacion)}</td>
            <td>${idUsuario}</td>
            <td>${alias}</td>
            <td>${donacion.nombcategoria || ''}</td>
            <td>${donacion.cantidaddonacion}</td>
            <td>${donacion.detalledonacion}</td>
            <td>
                <button class="btn btn-success btn-sm rounded-circle btn-editar" data-id="${donacion.iddetalledonacion}" title="Editar">
                    <i class="bi bi-pencil-square"></i>
                </button>
            </td>
            <td>
                <button class="btn btn-info btn-sm rounded-circle btn-ver" data-id="${donacion.iddetalledonacion}" title="Ver Detalles">
                    <i class="bi bi-eye-fill"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Eventos para botones editar
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', () => editarDonacion(btn.dataset.id));
    });

    // Eventos para botones ver detalles
    document.querySelectorAll('.btn-ver').forEach(btn => {
        btn.addEventListener('click', () => verDonacion(btn.dataset.id));
    });

    // Actualizar info paginacion
    const info = document.getElementById('donacionesInfo');
    info.textContent = `Mostrando ${start + 1} a ${Math.min(end, filtradas.length)} de ${filtradas.length} donaciones`;
}

// Formatear fecha dd/mm/yyyy
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString();
}

// Formatear hora hh:mm:ss a hh:mm
function formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.slice(0,5);
}

// Render paginación
function renderDonacionesPagination(currentPage) {
    const pagContainer = document.getElementById('donacionesPaginationControls');
    const filtradas = aplicarFiltro();
    const totalPages = Math.ceil(filtradas.length / itemsPerPage);

    pagContainer.innerHTML = '';

    if (totalPages <= 1) return;

    // Boton anterior
    const prev = document.createElement('li');
    prev.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prev.innerHTML = `<a class="page-link" href="#" aria-label="Anterior">Anterior</a>`;
    prev.addEventListener('click', e => {
        e.preventDefault();
        if(currentPage > 1) {
            mostrarDonacionesPaginadas(currentPage - 1);
            renderDonacionesPagination(currentPage - 1);
        }
    });
    pagContainer.appendChild(prev);

    // Paginas
    for(let i=1; i<=totalPages; i++) {
        const page = document.createElement('li');
        page.className = `page-item ${i === currentPage ? 'active' : ''}`;
        page.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        page.addEventListener('click', e => {
            e.preventDefault();
            mostrarDonacionesPaginadas(i);
            renderDonacionesPagination(i);
        });
        pagContainer.appendChild(page);
    }

    // Boton siguiente
    const next = document.createElement('li');
    next.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    next.innerHTML = `<a class="page-link" href="#" aria-label="Siguiente">Siguiente</a>`;
    next.addEventListener('click', e => {
        e.preventDefault();
        if(currentPage < totalPages) {
            mostrarDonacionesPaginadas(currentPage + 1);
            renderDonacionesPagination(currentPage + 1);
        }
    });
    pagContainer.appendChild(next);
}

// Filtrar donaciones
function filtrarDonaciones() {
    mostrarDonacionesPaginadas(1);
    renderDonacionesPagination(1);
}

// Aplicar filtro
function aplicarFiltro() {
    const filtroId = document.getElementById('filtroIdDonacion').value.toLowerCase();
    const filtroFecha = document.getElementById('filtroFecha').value;
    const filtroAliasNombre = document.getElementById('filtroAliasNombre').value.toLowerCase();
    const filtroCategoria = document.getElementById('filtroCategoria').value.toLowerCase();

    return donacionesData.filter(donacion => {
        const matchId = donacion.iddetalledonacion.toString().toLowerCase().includes(filtroId);
        const matchFecha = filtroFecha ? donacion.f_donacion === filtroFecha : true;
        const aliasLower = (donacion.aliasusuario || '').toLowerCase();
        const nombreLower = (donacion.nombre_completo || '').toLowerCase();
        const matchAliasNombre = filtroAliasNombre ? (aliasLower.includes(filtroAliasNombre) || nombreLower.includes(filtroAliasNombre)) : true;
        const categoriaLower = (donacion.nombcategoria || '').toLowerCase();
        const matchCategoria = filtroCategoria ? categoriaLower.includes(filtroCategoria) : true;
        return matchId && matchFecha && matchAliasNombre && matchCategoria;
    });
}

// Abrir modal modificar y cargar datos
function editarDonacion(id) {
    const donacion = donacionesData.find(d => d.iddetalledonacion == id);
    if(!donacion) return;

    document.getElementById('modIdDonacion').value = donacion.iddetalledonacion || '';
    document.getElementById('modAliasUsuario').value = donacion.aliasusuario || '';
    document.getElementById('modIdUsuario').value = donacion.idusuario || '';
    document.getElementById('modNombreUsuario').value = donacion.nombre_completo || '';
    document.getElementById('modFechaDonacion').value = donacion.f_donacion || '';
    document.getElementById('modHoraDonacion').value = donacion.h_donacion ? donacion.h_donacion.slice(0,5) : '';
    document.getElementById('modCategoriaDonacion').value = donacion.idcategoria || '';
    document.getElementById('modCantidadDonacion').value = donacion.cantidaddonacion || '';
    document.getElementById('modDetalleDonacion').value = donacion.detalledonacion || '';

    const modal = new bootstrap.Modal(document.getElementById('modalModificarDonacion'));
    modal.show();
}

// Abrir modal ver detalles con datos
function verDonacion(id) {
    const donacion = donacionesData.find(d => d.iddetalledonacion == id);
    if(!donacion) return;

    document.getElementById('verIdDonacion').value = donacion.iddetalledonacion || '';
    document.getElementById('verFechaDonacion').value = formatDate(donacion.f_donacion);
    document.getElementById('verHoraDonacion').value = formatTime(donacion.h_donacion);
    document.getElementById('verIdUsuario').value = donacion.idusuario ?? 'Sin registro';
    document.getElementById('verAliasUsuario').value = donacion.aliasusuario || 'Donante anónimo';
    document.getElementById('verNombreUsuario').value = donacion.nombre_completo || 'No disponible';
    document.getElementById('verCategoriaDonacion').value = donacion.nombcategoria || '';
    document.getElementById('verCantidadDonacion').value = donacion.cantidaddonacion || '';
    document.getElementById('verDetalleDonacion').value = donacion.detalledonacion || '';

    const modal = new bootstrap.Modal(document.getElementById('modalVerDonacion'));
    modal.show();
}

// Registrar donación
async function registrarDonacion(event) {
    event.preventDefault();
    const form = event.target;

    const alias = form.aliasUsuario.value.trim();
    const nombre = form.nombreUsuario.value.trim();
    const idUsuario = form.idUsuario.value;
    const categoria = form.categoriaDonacion.value;
    const cantidad = form.cantidadDonacion.value;
    const detalle = form.detalleDonacion.value.trim();

    if(!alias || !nombre || !categoria || !cantidad || !detalle) {
        alert('Por favor, complete todos los campos requeridos.');
        return;
    }

    if(!authToken) {
        alert('Necesitas iniciar sesión nuevamente para registrar donaciones.');
        return;
    }

    // Crear payload para backend: Donations array with one object as per backend expectation
    const donacion = {
        idcategoria: parseInt(categoria),
        cantidaddonacion: parseFloat(cantidad),
        detalledonacion: detalle
    };

    try {
        const response = await fetch('/api/donations/crear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ donaciones: [donacion] })
        });
        const data = await response.json();
        if(response.ok) {
            alert('Donación registrada exitosamente');
            form.reset();
            setFechaHoraActual('fechaDonacion', 'horaDonacion');
            bootstrap.Modal.getInstance(document.getElementById('modalRegistrarDonacion')).hide();
            cargarDonaciones();
        } else {
            alert('Error al registrar donación: ' + data.message);
        }
    } catch(error) {
        console.error('Error al registrar donación:', error);
        alert('Error al conectar con el servidor');
    }
}

// Modificar donación
async function modificarDonacion(event) {
    event.preventDefault();
    const form = event.target;

    const idDonacion = form.modIdDonacion.value;
    const alias = form.aliasUsuario.value.trim();
    const nombre = form.nombreUsuario.value.trim();
    const idUsuario = form.idUsuario.value;
    const categoria = form.categoriaDonacion.value;
    const cantidad = form.cantidadDonacion.value;
    const detalle = form.detalleDonacion.value.trim();

    if(!idDonacion || !alias || !nombre || !categoria || !cantidad || !detalle) {
        alert('Por favor, complete todos los campos requeridos.');
        return;
    }

    // Payload for update - Assuming the backend allows updating only details via PUT
    // Since backend doesn't have explicit update, consider this a placeholder for future integration

    alert('La funcionalidad de modificación está pendiente de implementación en backend.');
    bootstrap.Modal.getInstance(document.getElementById('modalModificarDonacion')).hide();
}

// Autocomplete setup for aliasUsuario fields
function setupAutocomplete(inputId, hiddenId) {
    const input = document.getElementById(inputId);
    const hiddenInput = document.getElementById(hiddenId);

    if(!input || !hiddenInput) return;

    // Determinar el campo de nombre correspondiente
    let nombreInputId;
    if(inputId === 'aliasUsuario') {
        nombreInputId = 'nombreUsuario';
    } else if(inputId === 'modAliasUsuario') {
        nombreInputId = 'modNombreUsuario';
    }

    input.addEventListener('input', async () => {
        const query = input.value;
        if(query.length < 2) {
            hideSuggestions(input);
            return;
        }
        try {
            const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`, {
                headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
            });
            const data = await response.json();
            if(response.ok && data.data.length > 0) {
                showSuggestions(input, hiddenInput, nombreInputId, data.data);
            } else {
                hideSuggestions(input);
            }
        } catch (error) {
            console.error('Error buscando usuarios:', error);
            hideSuggestions(input);
        }
    });
}

// Mostrar sugerencias autocomplete
function showSuggestions(input, hiddenInput, nombreInputId, users) {
    let list = input.parentNode.querySelector('.sugerencias-list');
    if(!list) {
        list = document.createElement('ul');
        list.className = 'sugerencias-list list-group position-absolute w-100';
        list.style.zIndex = '1000';
        input.parentNode.appendChild(list);
    }
    list.style.display = 'block';
    list.innerHTML = '';
    users.forEach(user => {
        let li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action';
        li.textContent = `${user.aliasusuario} - ${user.nombre_completo || ''}`;
        li.addEventListener('click', () => {
            input.value = user.aliasusuario;
            hiddenInput.value = user.idusuario;
            
            // Rellenar automáticamente el campo de nombre
            if(nombreInputId) {
                const nombreInput = document.getElementById(nombreInputId);
                if(nombreInput) {
                    nombreInput.value = user.nombre_completo || '';
                }
            }
            
            hideSuggestions(input);
        });
        list.appendChild(li);
    });
}

// Ocultar sugerencias
function hideSuggestions(input) {
    const list = input.parentNode.querySelector('.sugerencias-list');
    if(list) {
        list.style.display = 'none';
    }
}
