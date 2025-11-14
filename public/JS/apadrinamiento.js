// Variables globales
let apadrinamientosData = [];
let solicitudesData = [];

// Variables para paginación
let currentApadrinamientosPage = 1;
let currentSolicitudesPage = 1;
const itemsPerPage = 10;

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function () {
    // Verificar acceso al módulo de apadrinamiento (solo admin)
    if (!checkDashboardAccess()) {
        return; // Si no tiene acceso, la función ya redirige
    }
    cargarApadrinamientos();
    cargarSolicitudes();
    configurarEventos();
    updateAuthUI();
});

// Configurar eventos
function configurarEventos() {
    // Filtros
    document.getElementById('filtroAlias').addEventListener('input', filtrarApadrinamientos);
    document.getElementById('filtroNombrePersona').addEventListener('input', filtrarApadrinamientos);
    document.getElementById('filtroAnimal').addEventListener('input', filtrarApadrinamientos);

    // Formulario registrar
    document.getElementById('formRegistrarApadrinamiento').addEventListener('submit', registrarApadrinamiento);

    // Formulario modificar
    document.getElementById('formModificarApadrinamiento').addEventListener('submit', modificarApadrinamiento);

    // Autocompletado para alias de usuario
    document.getElementById('aliasUsuario').addEventListener('input', buscarUsuarios);
    document.getElementById('modAliasUsuario').addEventListener('input', buscarUsuarios);

    // Autocompletado para nombre de animal
    document.getElementById('nombreAnimal').addEventListener('input', buscarAnimales);
    document.getElementById('modNombreAnimal').addEventListener('input', buscarAnimales);
}

// Cargar apadrinamientos con paginación
async function cargarApadrinamientos(page = 1) {
    try {
        const response = await fetch(`${window.location.origin}/api/apadrinamiento?page=${page}&limit=${itemsPerPage}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        const data = await response.json();

        if (response.ok) {
            apadrinamientosData = data.data;
            mostrarApadrinamientos(apadrinamientosData);
            renderApadrinamientosPagination(data.pagination);
        } else {
            alert('Error al cargar apadrinamientos: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}

// Mostrar apadrinamientos en la tabla
function mostrarApadrinamientos(apadrinamientos) {
    const tbody = document.getElementById('apadrinamientoBody');
    tbody.innerHTML = '';

    apadrinamientos.forEach(apadrinamiento => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${apadrinamiento.idapadrinamiento}</td>
            <td>${apadrinamiento.aliasusuario}</td>
            <td>${apadrinamiento.nombre_completo || 'N/A'}</td>
            <td>${apadrinamiento.idanimal}</td>
            <td>${apadrinamiento.nombreanimal}</td>
            <td>${new Date(apadrinamiento.f_inicio).toLocaleDateString()}</td>
            <td>${apadrinamiento.frecuencia}</td>
            <td>${apadrinamiento.iddonacion}</td>
            <td>
                <button class="btn btn-warning btn-sm btn-editar" data-id="${apadrinamiento.idapadrinamiento}">
                    <i class="bi bi-pencil-square"></i>
                </button>
            </td>
            <td>
                <button class="btn btn-danger btn-sm btn-eliminar" data-id="${apadrinamiento.idapadrinamiento}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });

    // Agregar eventos a los botones
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', () => editarApadrinamiento(btn.dataset.id));
    });

    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', () => eliminarApadrinamiento(btn.dataset.id));
    });
}

// Filtrar apadrinamientos
function filtrarApadrinamientos() {
    const filtroAlias = document.getElementById('filtroAlias').value.toLowerCase();
    const filtroNombre = document.getElementById('filtroNombrePersona').value.toLowerCase();
    const filtroAnimal = document.getElementById('filtroAnimal').value.toLowerCase();

    const filtrados = apadrinamientosData.filter(apadrinamiento => {
        return (
            apadrinamiento.aliasusuario.toLowerCase().includes(filtroAlias) &&
            (apadrinamiento.nombre_completo || '').toLowerCase().includes(filtroNombre) &&
            apadrinamiento.nombreanimal.toLowerCase().includes(filtroAnimal)
        );
    });

    mostrarApadrinamientos(filtrados);
}

// Buscar usuarios para autocompletado
async function buscarUsuarios(event) {
    const input = event.target;
    const query = input.value;

    if (query.length < 2) return;

    try {
        const response = await fetch(`${window.location.origin}/api/apadrinamiento/usuarios?search=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        const data = await response.json();

        if (response.ok) {
            mostrarSugerenciasUsuarios(input, data.data);
        }
    } catch (error) {
        console.error('Error buscando usuarios:', error);
    }
}

// Buscar animales para autocompletado
async function buscarAnimales(event) {
    const input = event.target;
    const query = input.value;

    if (query.length < 2) return;

    try {
        const response = await fetch(`${window.location.origin}/api/apadrinamiento/animales?search=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        const data = await response.json();

        if (response.ok) {
            mostrarSugerenciasAnimales(input, data.data);
        }
    } catch (error) {
        console.error('Error buscando animales:', error);
    }
}

// Mostrar sugerencias de usuarios
function mostrarSugerenciasUsuarios(input, usuarios) {
    // Remover sugerencias anteriores
    const existingList = input.parentNode.querySelector('.sugerencias-list');
    if (existingList) existingList.remove();

    if (usuarios.length === 0) return;

    const list = document.createElement('ul');
    list.className = 'sugerencias-list list-group position-absolute w-100';
    list.style.zIndex = '1000';

    usuarios.forEach(usuario => {
        const item = document.createElement('li');
        item.className = 'list-group-item list-group-item-action';
        item.textContent = `${usuario.aliasusuario} - ${usuario.nombre_completo || 'N/A'}`;
        item.addEventListener('click', () => {
            input.value = usuario.aliasusuario;
            document.getElementById('idUsuario').value = usuario.idusuario;
            list.remove();
        });
        list.appendChild(item);
    });

    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(list);
}

// Mostrar sugerencias de animales
function mostrarSugerenciasAnimales(input, animales) {
    // Remover sugerencias anteriores
    const existingList = input.parentNode.querySelector('.sugerencias-list');
    if (existingList) existingList.remove();

    if (animales.length === 0) return;

    const list = document.createElement('ul');
    list.className = 'sugerencias-list list-group position-absolute w-100';
    list.style.zIndex = '1000';

    animales.forEach(animal => {
        const item = document.createElement('li');
        item.className = 'list-group-item list-group-item-action';
        item.textContent = `${animal.nombreanimal} - ${animal.razaanimal} ${animal.especieanimal}`;
        item.addEventListener('click', () => {
            input.value = animal.nombreanimal;
            document.getElementById('idAnimal').value = animal.idanimal;
            list.remove();
        });
        list.appendChild(item);
    });

    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(list);
}

// Registrar apadrinamiento
async function registrarApadrinamiento(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch(window.location.origin + '/api/apadrinamiento', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            alert('Apadrinamiento registrado exitosamente');
            bootstrap.Modal.getInstance(document.getElementById('modalRegistrarApadrinamiento')).hide();
            event.target.reset();
            cargarApadrinamientos();
        } else {
            alert('Error al registrar apadrinamiento: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}

// Editar apadrinamiento
function editarApadrinamiento(id) {
    const apadrinamiento = apadrinamientosData.find(a => a.idapadrinamiento == id);
    if (!apadrinamiento) return;

    // Llenar formulario de modificación
    document.getElementById('modIdAnimal').value = apadrinamiento.idanimal;
    document.getElementById('modNombreAnimal').value = apadrinamiento.nombreanimal;
    document.getElementById('modIdUsuario').value = apadrinamiento.idusuario;
    document.getElementById('modAliasUsuario').value = apadrinamiento.aliasusuario;
    document.getElementById('modFrecuencia').value = apadrinamiento.frecuencia;

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalModificarApadrinamiento'));
    modal.show();

    // Guardar ID para modificación
    document.getElementById('formModificarApadrinamiento').dataset.id = id;
}

// Modificar apadrinamiento
async function modificarApadrinamiento(event) {
    event.preventDefault();

    const id = event.target.dataset.id;
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch(`${window.location.origin}/api/apadrinamiento/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            alert('Apadrinamiento modificado exitosamente');
            bootstrap.Modal.getInstance(document.getElementById('modalModificarApadrinamiento')).hide();
            cargarApadrinamientos();
        } else {
            alert('Error al modificar apadrinamiento: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}

// Eliminar apadrinamiento
async function eliminarApadrinamiento(id) {
    if (!confirm('¿Está seguro de que desea eliminar este apadrinamiento?')) return;

    try {
        const response = await fetch(`${window.location.origin}/api/apadrinamiento/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            alert('Apadrinamiento eliminado exitosamente');
            cargarApadrinamientos();
        } else {
            alert('Error al eliminar apadrinamiento: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}

// Cargar solicitudes de apadrinamiento con paginación
async function cargarSolicitudes(page = 1) {
    try {
        const response = await fetch(`${window.location.origin}/api/solicitudes-apadrinamiento?page=${page}&limit=${itemsPerPage}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        const data = await response.json();

        if (response.ok) {
            solicitudesData = data.data;
            mostrarSolicitudes(solicitudesData);
            renderSolicitudesPagination(data.pagination);
            actualizarBadgeSolicitudes();
        } else {
            console.error('Error al cargar solicitudes:', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Mostrar solicitudes en la tabla
function mostrarSolicitudes(solicitudes) {
    const tbody = document.getElementById('solicitudesTableBody');
    tbody.innerHTML = '';

    solicitudes.forEach(solicitud => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${solicitud.idsolicitudapadrinamiento}</td>
            <td>${solicitud.nombreusuario}</td>
            <td>${solicitud.idanimal}</td>
            <td>${solicitud.nombreanimal}</td>
            <td>${solicitud.estado}</td>
            <td>
                <button class="btn btn-success btn-sm btn-aprobar" data-id="${solicitud.idsolicitudapadrinamiento}" data-animal="${solicitud.idanimal}" data-usuario="${solicitud.idusuario}" data-nombre="${solicitud.nombreanimal}">
                    <i class="bi bi-check-circle"></i> Aprobar
                </button>
                <button class="btn btn-danger btn-sm btn-rechazar" data-id="${solicitud.idsolicitudapadrinamiento}">
                    <i class="bi bi-x-circle"></i> Rechazar
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });

    // Agregar eventos a los botones
    document.querySelectorAll('.btn-aprobar').forEach(btn => {
        btn.addEventListener('click', () => aprobarSolicitud(btn.dataset.id, btn.dataset.animal, btn.dataset.usuario, btn.dataset.nombre));
    });

    document.querySelectorAll('.btn-rechazar').forEach(btn => {
        btn.addEventListener('click', () => rechazarSolicitud(btn.dataset.id));
    });
}

// Actualizar badge de solicitudes
function actualizarBadgeSolicitudes() {
    const badge = document.getElementById('badgeSolicitudes');
    const count = solicitudesData.length;

    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// Aprobar solicitud de apadrinamiento
async function aprobarSolicitud(idSolicitud, idAnimal, idUsuario, nombreAnimal) {
    if (!confirm(`¿Está seguro de que desea aprobar la solicitud de apadrinamiento para ${nombreAnimal}?`)) return;

    try {
        const response = await fetch(`${window.location.origin}/api/solicitudes-apadrinamiento/${idSolicitud}/aprobar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                idanimal: idAnimal,
                idusuario: idUsuario
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Solicitud aprobada exitosamente. El apadrinamiento ha sido registrado.');
            cargarSolicitudes();
            cargarApadrinamientos();
        } else {
            alert('Error al aprobar solicitud: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}

// Rechazar solicitud de apadrinamiento
async function rechazarSolicitud(idSolicitud) {
    if (!confirm('¿Está seguro de que desea rechazar esta solicitud de apadrinamiento?')) return;

    try {
        const response = await fetch(`${window.location.origin}/api/solicitudes-apadrinamiento/${idSolicitud}/rechazar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            alert('Solicitud rechazada exitosamente.');
            cargarSolicitudes();
        } else {
            alert('Error al rechazar solicitud: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}

// Funciones de paginación para apadrinamientos
function renderApadrinamientosPagination(pagination) {
    const { currentPage, totalPages, totalItems } = pagination;
    const infoElement = document.getElementById('apadrinamientosInfo');
    const paginationElement = document.getElementById('apadrinamientosPaginationControls');

    // Actualizar información
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    infoElement.textContent = `Mostrando ${start} a ${end} de ${totalItems} apadrinamientos`;

    // Generar controles de paginación
    paginationElement.innerHTML = '';

    // Botón anterior
    if (currentPage > 1) {
        const prevBtn = document.createElement('li');
        prevBtn.className = 'page-item';
        prevBtn.innerHTML = `<a class="page-link" href="#" onclick="changeApadrinamientosPage(${currentPage - 1})">Anterior</a>`;
        paginationElement.appendChild(prevBtn);
    }

    // Páginas
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        const pageBtn = document.createElement('li');
        pageBtn.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageBtn.innerHTML = `<a class="page-link" href="#" onclick="changeApadrinamientosPage(${i})">${i}</a>`;
        paginationElement.appendChild(pageBtn);
    }

    // Botón siguiente
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('li');
        nextBtn.className = 'page-item';
        nextBtn.innerHTML = `<a class="page-link" href="#" onclick="changeApadrinamientosPage(${currentPage + 1})">Siguiente</a>`;
        paginationElement.appendChild(nextBtn);
    }
}

function renderSolicitudesPagination(pagination) {
    const { currentPage, totalPages, totalItems } = pagination;
    const infoElement = document.getElementById('solicitudesInfo');
    const paginationElement = document.getElementById('solicitudesPaginationControls');

    // Actualizar información
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    infoElement.textContent = `Mostrando ${start} a ${end} de ${totalItems} solicitudes`;

    // Generar controles de paginación
    paginationElement.innerHTML = '';

    // Botón anterior
    if (currentPage > 1) {
        const prevBtn = document.createElement('li');
        prevBtn.className = 'page-item';
        prevBtn.innerHTML = `<a class="page-link" href="#" onclick="changeSolicitudesPage(${currentPage - 1})">Anterior</a>`;
        paginationElement.appendChild(prevBtn);
    }

    // Páginas
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        const pageBtn = document.createElement('li');
        pageBtn.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageBtn.innerHTML = `<a class="page-link" href="#" onclick="changeSolicitudesPage(${i})">${i}</a>`;
        paginationElement.appendChild(pageBtn);
    }

    // Botón siguiente
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('li');
        nextBtn.className = 'page-item';
        nextBtn.innerHTML = `<a class="page-link" href="#" onclick="changeSolicitudesPage(${currentPage + 1})">Siguiente</a>`;
        paginationElement.appendChild(nextBtn);
    }
}

function changeApadrinamientosPage(page) {
    currentApadrinamientosPage = page;
    cargarApadrinamientos(page);
}

function changeSolicitudesPage(page) {
    currentSolicitudesPage = page;
    cargarSolicitudes(page);
}
