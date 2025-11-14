document.addEventListener('DOMContentLoaded', function() {
    loadTipos();
    loadEnfermedades();
    setupEventListeners();
});

// Variables para paginación
let currentTiposPage = 1;
let currentEnfermedadesPage = 1;
const itemsPerPage = 10;

function setupEventListeners() {
    // Formulario registrar tipo
    document.getElementById('formRegistrarTipo').addEventListener('submit', function(e) {
        e.preventDefault();
        registrarTipo();
    });

    // Formulario editar tipo
    document.getElementById('formEditarTipo').addEventListener('submit', function(e) {
        e.preventDefault();
        editarTipo();
    });

    // Formulario registrar enfermedad
    document.getElementById('formRegistrarEnfermedad').addEventListener('submit', function(e) {
        e.preventDefault();
        registrarEnfermedad();
    });

    // Formulario editar enfermedad
    document.getElementById('formEditarEnfermedad').addEventListener('submit', function(e) {
        e.preventDefault();
        editarEnfermedad();
    });

    // Búsqueda
    document.getElementById('buscarEnfermedad').addEventListener('input', function() {
        filtrarTablas(this.value);
    });

    // Validación en tiempo real para tipo
    document.getElementById('tipoNombre').addEventListener('input', function() {
        validarTipoUnico(this.value, 'tipoError');
    });

    document.getElementById('tipoNombreEdit').addEventListener('input', function() {
        validarTipoUnico(this.value, 'tipoErrorEdit', document.getElementById('tipoId').value);
    });

    // Validación en tiempo real para enfermedad
    document.getElementById('enfermedadNombre').addEventListener('input', function() {
        validarEnfermedadUnico(this.value, 'enfermedadError');
    });

    document.getElementById('enfermedadNombreEdit').addEventListener('input', function() {
        validarEnfermedadUnico(this.value, 'enfermedadErrorEdit', document.getElementById('enfermedadId').value);
    });
}

async function loadTipos(page = 1) {
    try {
        const response = await fetch(`/api/enfermedades/tipos?page=${page}&limit=${itemsPerPage}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        const result = await response.json();
        renderTipos(result.data);
        renderTiposPagination(result.pagination);
        populateTipoSelects(result.data);
    } catch (error) {
        console.error('Error loading tipos:', error);
        Swal.fire('Error', 'No se pudieron cargar los tipos de enfermedad', 'error');
    }
}

async function loadEnfermedades(page = 1) {
    try {
        const response = await fetch(`/api/enfermedades?page=${page}&limit=${itemsPerPage}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        const result = await response.json();
        renderEnfermedades(result.data);
        renderEnfermedadesPagination(result.pagination);
    } catch (error) {
        console.error('Error loading enfermedades:', error);
        Swal.fire('Error', 'No se pudieron cargar las enfermedades', 'error');
    }
}

function renderTipos(tipos) {
    const tbody = document.getElementById('tiposBody');
    tbody.innerHTML = '';

    tipos.forEach(tipo => {
        const row = `
            <tr>
                <td>${tipo.idtipoenfermedad}</td>
                <td>${tipo.tipoenfermedad}</td>
                <td><button class="btn btn-sm btn-outline-primary" onclick="abrirEditarTipo(${tipo.idtipoenfermedad}, '${tipo.tipoenfermedad}')"><i class="bi bi-pencil"></i></button></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function renderEnfermedades(enfermedades) {
    const tbody = document.getElementById('enfermedadesBody');
    tbody.innerHTML = '';

    enfermedades.forEach(enfermedad => {
        const row = `
            <tr>
                <td>${enfermedad.idenfermedad}</td>
                <td>${enfermedad.nombenfermedad}</td>
                <td>${enfermedad.tipoenfermedad}</td>
                <td><button class="btn btn-sm btn-outline-primary" onclick="abrirEditarEnfermedad(${enfermedad.idenfermedad}, '${enfermedad.nombenfermedad}', ${enfermedad.idtipoenfermedad})"><i class="bi bi-pencil"></i></button></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function populateTipoSelects(tipos) {
    const selects = ['enfermedadTipo', 'enfermedadTipoEdit'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Seleccione un tipo</option>';
        tipos.forEach(tipo => {
            select.innerHTML += `<option value="${tipo.idtipoenfermedad}">${tipo.tipoenfermedad}</option>`;
        });
    });
}

async function registrarTipo() {
    const nombre = document.getElementById('tipoNombre').value.trim();

    if (!nombre) {
        Swal.fire('Error', 'El nombre del tipo es requerido', 'error');
        return;
    }

    try {
        const response = await fetch('/api/enfermedades/tipos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ tipoenfermedad: nombre })
        });

        if (response.ok) {
            Swal.fire('Éxito', 'Tipo de enfermedad registrado correctamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalRegistrarTipo')).hide();
            document.getElementById('formRegistrarTipo').reset();
            loadTipos();
        } else {
            const error = await response.json();
            Swal.fire('Error', error.message || 'Error al registrar el tipo', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'Error de conexión', 'error');
    }
}

async function editarTipo() {
    const id = document.getElementById('tipoId').value;
    const nombre = document.getElementById('tipoNombreEdit').value.trim();

    if (!nombre) {
        Swal.fire('Error', 'El nombre del tipo es requerido', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/enfermedades/tipos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ tipoenfermedad: nombre })
        });

        if (response.ok) {
            Swal.fire('Éxito', 'Tipo de enfermedad actualizado correctamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalEditarTipo')).hide();
            loadTipos();
        } else {
            const error = await response.json();
            Swal.fire('Error', error.message || 'Error al actualizar el tipo', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'Error de conexión', 'error');
    }
}

async function eliminarTipo(id) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/api/enfermedades/tipos/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                Swal.fire('Eliminado', 'Tipo de enfermedad eliminado correctamente', 'success');
                loadTipos();
            } else {
                const error = await response.json();
                Swal.fire('Error', error.message || 'Error al eliminar el tipo', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'Error de conexión', 'error');
        }
    }
}

async function registrarEnfermedad() {
    const nombre = document.getElementById('enfermedadNombre').value.trim();
    const tipo_id = document.getElementById('enfermedadTipo').value;

    if (!nombre || !tipo_id) {
        Swal.fire('Error', 'Todos los campos son requeridos', 'error');
        return;
    }

    try {
        const response = await fetch('/api/enfermedades', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ nombenfermedad: nombre, idtipoenfermedad: parseInt(tipo_id) })
        });

        if (response.ok) {
            Swal.fire('Éxito', 'Enfermedad registrada correctamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalRegistrarEnfermedad')).hide();
            document.getElementById('formRegistrarEnfermedad').reset();
            loadEnfermedades();
        } else {
            const error = await response.json();
            Swal.fire('Error', error.message || 'Error al registrar la enfermedad', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'Error de conexión', 'error');
    }
}

async function editarEnfermedad() {
    const id = document.getElementById('enfermedadId').value;
    const nombre = document.getElementById('enfermedadNombreEdit').value.trim();
    const tipo_id = document.getElementById('enfermedadTipoEdit').value;

    if (!nombre || !tipo_id) {
        Swal.fire('Error', 'Todos los campos son requeridos', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/enfermedades/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ nombenfermedad: nombre, idtipoenfermedad: parseInt(tipo_id) })
        });

        if (response.ok) {
            Swal.fire('Éxito', 'Enfermedad actualizada correctamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalEditarEnfermedad')).hide();
            loadEnfermedades();
        } else {
            const error = await response.json();
            Swal.fire('Error', error.message || 'Error al actualizar la enfermedad', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'Error de conexión', 'error');
    }
}

async function eliminarEnfermedad(id) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/api/enfermedades/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                Swal.fire('Eliminado', 'Enfermedad eliminada correctamente', 'success');
                loadEnfermedades();
            } else {
                const error = await response.json();
                Swal.fire('Error', error.message || 'Error al eliminar la enfermedad', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'Error de conexión', 'error');
        }
    }
}

function abrirEditarTipo(id, nombre) {
    document.getElementById('tipoId').value = id;
    document.getElementById('tipoNombreEdit').value = nombre;
    new bootstrap.Modal(document.getElementById('modalEditarTipo')).show();
}

function abrirEditarEnfermedad(id, nombre, tipo_id) {
    document.getElementById('enfermedadId').value = id;
    document.getElementById('enfermedadNombreEdit').value = nombre;
    document.getElementById('enfermedadTipoEdit').value = tipo_id;
    new bootstrap.Modal(document.getElementById('modalEditarEnfermedad')).show();
}

async function validarTipoUnico(nombre, errorId, excludeId = null) {
    if (!nombre.trim()) return;

    try {
        const response = await fetch(`/api/enfermedades/tipos/validar?nombre=${encodeURIComponent(nombre)}${excludeId ? `&exclude=${excludeId}` : ''}`);
        const result = await response.json();

        const errorElement = document.getElementById(errorId);
        if (!result.valido) {
            errorElement.textContent = 'Este tipo de enfermedad ya existe';
            errorElement.style.display = 'block';
        } else {
            errorElement.style.display = 'none';
        }
    } catch (error) {
        console.error('Error validating tipo:', error);
    }
}

async function validarEnfermedadUnico(nombre, errorId, excludeId = null) {
    if (!nombre.trim()) return;

    try {
        const response = await fetch(`/api/enfermedades/validar?nombre=${encodeURIComponent(nombre)}${excludeId ? `&exclude=${excludeId}` : ''}`);
        const result = await response.json();

        const errorElement = document.getElementById(errorId);
        if (!result.valido) {
            errorElement.textContent = 'Esta enfermedad ya existe';
            errorElement.style.display = 'block';
        } else {
            errorElement.style.display = 'none';
        }
    } catch (error) {
        console.error('Error validating enfermedad:', error);
    }
}

function filtrarTablas(query) {
    const filter = query.toLowerCase();

    // Filtrar tipos
    const tiposRows = document.querySelectorAll('#tiposBody tr');
    tiposRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
    });

    // Filtrar enfermedades
    const enfermedadesRows = document.querySelectorAll('#enfermedadesBody tr');
    enfermedadesRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
    });
}

// Funciones de paginación
function renderTiposPagination(pagination) {
    const { currentPage, totalPages, totalItems } = pagination;
    const infoElement = document.getElementById('tiposInfo');
    const paginationElement = document.getElementById('tiposPaginationControls');

    // Actualizar información
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    infoElement.textContent = `Mostrando ${start} a ${end} de ${totalItems} tipos`;

    // Generar controles de paginación
    paginationElement.innerHTML = '';

    // Botón anterior
    if (currentPage > 1) {
        const prevBtn = document.createElement('li');
        prevBtn.className = 'page-item';
        prevBtn.innerHTML = `<a class="page-link" href="#" onclick="changeTiposPage(${currentPage - 1})">Anterior</a>`;
        paginationElement.appendChild(prevBtn);
    }

    // Páginas
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        const pageBtn = document.createElement('li');
        pageBtn.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageBtn.innerHTML = `<a class="page-link" href="#" onclick="changeTiposPage(${i})">${i}</a>`;
        paginationElement.appendChild(pageBtn);
    }

    // Botón siguiente
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('li');
        nextBtn.className = 'page-item';
        nextBtn.innerHTML = `<a class="page-link" href="#" onclick="changeTiposPage(${currentPage + 1})">Siguiente</a>`;
        paginationElement.appendChild(nextBtn);
    }
}

function renderEnfermedadesPagination(pagination) {
    const { currentPage, totalPages, totalItems } = pagination;
    const infoElement = document.getElementById('enfermedadesInfo');
    const paginationElement = document.getElementById('enfermedadesPaginationControls');

    // Actualizar información
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    infoElement.textContent = `Mostrando ${start} a ${end} de ${totalItems} enfermedades`;

    // Generar controles de paginación
    paginationElement.innerHTML = '';

    // Botón anterior
    if (currentPage > 1) {
        const prevBtn = document.createElement('li');
        prevBtn.className = 'page-item';
        prevBtn.innerHTML = `<a class="page-link" href="#" onclick="changeEnfermedadesPage(${currentPage - 1})">Anterior</a>`;
        paginationElement.appendChild(prevBtn);
    }

    // Páginas
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        const pageBtn = document.createElement('li');
        pageBtn.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageBtn.innerHTML = `<a class="page-link" href="#" onclick="changeEnfermedadesPage(${i})">${i}</a>`;
        paginationElement.appendChild(pageBtn);
    }

    // Botón siguiente
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('li');
        nextBtn.className = 'page-item';
        nextBtn.innerHTML = `<a class="page-link" href="#" onclick="changeEnfermedadesPage(${currentPage + 1})">Siguiente</a>`;
        paginationElement.appendChild(nextBtn);
    }
}

function changeTiposPage(page) {
    currentTiposPage = page;
    loadTipos(page);
}

function changeEnfermedadesPage(page) {
    currentEnfermedadesPage = page;
    loadEnfermedades(page);
}
