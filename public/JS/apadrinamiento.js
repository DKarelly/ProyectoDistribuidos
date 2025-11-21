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
            <td>${apadrinamiento.estado || 'Activo'}</td>
            <td>${apadrinamiento.iddonacion}</td>
            <td>${apadrinamiento.idsolicitudapadrinamiento ? apadrinamiento.idsolicitudapadrinamiento : 'Registrado por el admin'}</td>
            <td>
                <button class="btn btn-info btn-sm rounded-circle btn-ver me-1" data-id="${apadrinamiento.idapadrinamiento}" title="Ver">
                    <i class="bi bi-eye-fill"></i>
                </button>
                <button class="btn btn-success btn-sm rounded-circle btn-editar" data-id="${apadrinamiento.idapadrinamiento}" title="Editar">
                    <i class="bi bi-pencil-square"></i>
                </button>
            </td>
            <td>
                <button class="btn btn-danger btn-sm rounded-circle btn-eliminar" data-id="${apadrinamiento.idapadrinamiento}">
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

    // Botones ver detalles
    document.querySelectorAll('.btn-ver').forEach(btn => {
        btn.addEventListener('click', () => verApadrinamiento(btn.dataset.id));
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
    // Rellenar estado en el modal de edición
    if (document.getElementById('modEstado')) {
        document.getElementById('modEstado').value = apadrinamiento.estado || 'Activo';
    }

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalModificarApadrinamiento'));
    modal.show();

    // Guardar ID para modificación
    document.getElementById('formModificarApadrinamiento').dataset.id = id;
}

// Ver detalles de apadrinamiento
function verApadrinamiento(id) {
    const apadrinamiento = apadrinamientosData.find(a => a.idapadrinamiento == id);
    if (!apadrinamiento) return;

    // Rellenar modal con los datos disponibles (usar fallback si no existen propiedades)
    document.getElementById('verIdApadrinamiento').value = apadrinamiento.idapadrinamiento || '';
    document.getElementById('verAliasUsuario').value = apadrinamiento.aliasusuario || '';
    document.getElementById('verNombreUsuario').value = apadrinamiento.nombre_completo || '';
    document.getElementById('verIdAnimal').value = apadrinamiento.idanimal || '';
    document.getElementById('verNombreAnimal').value = apadrinamiento.nombreanimal || '';
    document.getElementById('verFechaInicio').value = apadrinamiento.f_inicio ? new Date(apadrinamiento.f_inicio).toLocaleDateString() : '';
    document.getElementById('verFrecuencia').value = apadrinamiento.frecuencia || '';
    document.getElementById('verIdDonacion').value = apadrinamiento.iddonacion || '';
    document.getElementById('verIdSolicitud').value = apadrinamiento.idsolicitudapadrinamiento ? apadrinamiento.idsolicitudapadrinamiento : 'Registrado por el admin';
    document.getElementById('verEstado').value = apadrinamiento.estado || '';

    const modal = new bootstrap.Modal(document.getElementById('modalVerApadrinamiento'));
    modal.show();
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

// Eliminar (anular) apadrinamiento — abre modal de confirmación y guarda el id
function eliminarApadrinamiento(id) {
    // Guardar id en el input hidden del modal y mostrar el modal de confirmación
    const input = document.getElementById('anularIdApadrinamiento');
    if (input) input.value = id;
    const modalEl = document.getElementById('modalAnularApadrinamiento');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } else {
        // Fallback: si el modal no existe, pedir confirmación nativa y realizar PUT
        if (!confirm('¿Está seguro que desea anular este apadrinamiento? Esto cambiará su estado a Inactivo.')) return;
        (async () => {
            try {
                const response = await fetch(`${window.location.origin}/api/apadrinamiento/${encodeURIComponent(id)}/anular`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
                const result = await response.json();
                if (response.ok) {
                    alert('Apadrinamiento anulado correctamente');
                    cargarApadrinamientos();
                } else {
                    alert('Error al anular apadrinamiento: ' + result.message);
                }
            } catch (error) {
                console.error('Error anular apadrinamiento (fallback):', error);
                alert('Error al conectar con el servidor');
            }
        })();
    }
}

// Acción confirmada de anular: cambia estado a 'Inactivo' usando PUT
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('confirmarAnularBtn');
    if (btn) {
        btn.addEventListener('click', async (event) => {
            // Evitar cualquier submit accidental o propagación
            if (event && typeof event.preventDefault === 'function') event.preventDefault();
            if (event && typeof event.stopPropagation === 'function') event.stopPropagation();

            const id = document.getElementById('anularIdApadrinamiento').value;
            const payload = { estado: 'Inactivo' };

            console.log('Anular apadrinamiento - enviar POST /anular', id);

            try {
                const response = await fetch(`${window.location.origin}/api/apadrinamiento/${encodeURIComponent(id)}/anular`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });

                // Debug info
                console.log('Response status:', response.status, 'for anular PUT');

                // Leer el cuerpo como texto (evita leer el stream dos veces)
                let result;
                const text = await response.text();
                try {
                    result = JSON.parse(text);
                    console.log('Response JSON (anular):', result);
                } catch (err) {
                    console.log('Response text (anular) - not JSON:', text);
                    result = { message: text };
                }

                if (response.ok) {
                    bootstrap.Modal.getInstance(document.getElementById('modalAnularApadrinamiento')).hide();
                    alert('Apadrinamiento anulado correctamente');
                    cargarApadrinamientos();
                } else {
                    alert('Error al anular apadrinamiento: ' + result.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error al conectar con el servidor');
            }
        });
    }
});

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
                <button class="btn btn-success btn-sm rounded-circle btn-aprobar" style="background-color: #90EE90; border-color: #90EE90;" data-id="${solicitud.idsolicitudapadrinamiento}" data-animal="${solicitud.idanimal}" data-usuario="${solicitud.idusuario}" data-nombre="${solicitud.nombreanimal}">
                    <i class="bi bi-check-circle"></i>
                </button>
            </td>
            <td>
                <button class="btn btn-danger btn-sm rounded-circle btn-rechazar" style="background-color: #FFB6C1; border-color: #FFB6C1;" data-id="${solicitud.idsolicitudapadrinamiento}">
                    <i class="bi bi-x-circle"></i>
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
            // Update the status locally to 'Rechazada'
            const row = document.querySelector(`[data-id="${idSolicitud}"].btn-rechazar`).closest('tr');
            if (row) {
                const statusCell = row.cells[4]; // Estado column
                statusCell.textContent = 'Rechazada';
                // Optionally disable buttons
                const approveBtn = row.querySelector('.btn-aprobar');
                const rejectBtn = row.querySelector('.btn-rechazar');
                if (approveBtn) approveBtn.disabled = true;
                if (rejectBtn) rejectBtn.disabled = true;
            }
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
