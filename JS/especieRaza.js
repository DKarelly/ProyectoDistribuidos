// ===================================================
// ADMINISTRACIÓN DE ESPECIES Y RAZAS
// ===================================================

// Variables globales
let especiesData = [];
let razasData = [];

// Cargar datos iniciales
async function loadEspeciesYRazas() {
    try {
        // Cargar especies
        const especiesResponse = await apiRequest('/especieRaza/especies');
        especiesData = especiesResponse.data;
        displayEspecies();

        // Cargar razas
        const razasResponse = await apiRequest('/especieRaza/razas');
        razasData = razasResponse.data;
        displayRazas();

    } catch (error) {
        console.error('Error cargando datos:', error);
        showMessage('Error cargando datos: ' + error.message, 'danger');
    }
}

// Mostrar especies en la tabla
function displayEspecies() {
    const tbody = document.getElementById('especiesBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (especiesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay especies registradas</td></tr>';
        return;
    }

    especiesData.forEach(especie => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${especie.idespecie}</td>
            <td>${especie.especieanimal}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editEspecie(${especie.idespecie})">
                    <i class="bi bi-pencil"></i>
                </button>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteEspecie(${especie.idespecie})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Mostrar razas en la tabla general
function displayRazas() {
    const tbody = document.getElementById('generalBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (razasData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay razas registradas</td></tr>';
        return;
    }

    razasData.forEach(raza => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${raza.idraza}</td>
            <td>${raza.razaanimal}</td>
            <td>${raza.especieanimal}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editRaza(${raza.idraza})">
                    <i class="bi bi-pencil"></i>
                </button>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteRaza(${raza.idraza})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Filtrar especies
function filterEspecies() {
    const searchTerm = document.getElementById('buscarEspecie').value.toLowerCase();
    const filtered = especiesData.filter(especie =>
        especie.especieanimal.toLowerCase().includes(searchTerm)
    );

    const tbody = document.getElementById('especiesBody');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No se encontraron especies</td></tr>';
        return;
    }

    filtered.forEach(especie => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${especie.idespecie}</td>
            <td>${especie.especieanimal}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editEspecie(${especie.idespecie})">
                    <i class="bi bi-pencil"></i>
                </button>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteEspecie(${especie.idespecie})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Filtrar razas
function filterRazas() {
    const searchTerm = document.getElementById('buscarRaza').value.toLowerCase();
    const filtered = razasData.filter(raza =>
        raza.razaanimal.toLowerCase().includes(searchTerm) ||
        raza.especieanimal.toLowerCase().includes(searchTerm)
    );

    const tbody = document.getElementById('generalBody');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No se encontraron razas</td></tr>';
        return;
    }

    filtered.forEach(raza => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${raza.idraza}</td>
            <td>${raza.razaanimal}</td>
            <td>${raza.especieanimal}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editRaza(${raza.idraza})">
                    <i class="bi bi-pencil"></i>
                </button>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteRaza(${raza.idraza})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Modal para registrar especie
function showModalRegistrarEspecie(especie = null) {
    const modalHtml = `
        <div class="modal fade" id="modalRegistrarEspecie" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-pink text-white">
                        <h5 class="modal-title">${especie ? 'Editar' : 'Registrar'} Especie</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="especieForm">
                            <div class="mb-3">
                                <label for="especieAnimal" class="form-label">Nombre de la Especie *</label>
                                <input type="text" class="form-control" id="especieAnimal" required
                                       value="${especie ? especie.especieanimal : ''}">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-pink" onclick="${especie ? `updateEspecie(${especie.idespecie})` : 'createEspecie()'}">
                            ${especie ? 'Actualizar' : 'Crear'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remover modal anterior si existe
    const existingModal = document.getElementById('modalRegistrarEspecie');
    if (existingModal) {
        existingModal.remove();
    }

    // Agregar nuevo modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalRegistrarEspecie'));
    modal.show();
}

// Crear especie
async function createEspecie() {
    const especieAnimal = document.getElementById('especieAnimal').value.trim();

    if (!especieAnimal) {
        showMessage('El nombre de la especie es requerido', 'warning');
        return;
    }

    try {
        const response = await apiRequest('/especieRaza/especies', {
            method: 'POST',
            body: JSON.stringify({ especieAnimal })
        });

        showMessage('Especie creada exitosamente', 'success');

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalRegistrarEspecie'));
        modal.hide();

        // Recargar datos
        loadEspeciesYRazas();

    } catch (error) {
        showMessage(error.message, 'danger');
    }
}

// Editar especie
function editEspecie(id) {
    const especie = especiesData.find(e => e.idespecie === id);
    if (especie) {
        showModalRegistrarEspecie(especie);
    }
}

// Actualizar especie
async function updateEspecie(id) {
    const especieAnimal = document.getElementById('especieAnimal').value.trim();

    if (!especieAnimal) {
        showMessage('El nombre de la especie es requerido', 'warning');
        return;
    }

    try {
        const response = await apiRequest(`/especieRaza/especies/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ especieAnimal })
        });

        showMessage('Especie actualizada exitosamente', 'success');

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalRegistrarEspecie'));
        modal.hide();

        // Recargar datos
        loadEspeciesYRazas();

    } catch (error) {
        showMessage(error.message, 'danger');
    }
}

// Eliminar especie
async function deleteEspecie(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta especie?')) {
        return;
    }

    try {
        await apiRequest(`/especieRaza/especies/${id}`, {
            method: 'DELETE'
        });

        showMessage('Especie eliminada exitosamente', 'success');
        loadEspeciesYRazas();

    } catch (error) {
        showMessage(error.message, 'danger');
    }
}

// Modal para registrar raza
function showModalRegistrarRaza(raza = null) {
    // Cargar opciones de especies
    let especiesOptions = especiesData.map(especie =>
        `<option value="${especie.idespecie}" ${raza && raza.idespecie === especie.idespecie ? 'selected' : ''}>${especie.especieanimal}</option>`
    ).join('');

    const modalHtml = `
        <div class="modal fade" id="modalRegistrarRaza" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-pink text-white">
                        <h5 class="modal-title">${raza ? 'Editar' : 'Registrar'} Raza</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="razaForm">
                            <div class="mb-3">
                                <label for="razaAnimal" class="form-label">Nombre de la Raza *</label>
                                <input type="text" class="form-control" id="razaAnimal" required
                                       value="${raza ? raza.razaanimal : ''}">
                            </div>
                            <div class="mb-3">
                                <label for="idEspecie" class="form-label">Especie *</label>
                                <select class="form-control" id="idEspecie" required>
                                    <option value="">Seleccionar especie</option>
                                    ${especiesOptions}
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-pink" onclick="${raza ? `updateRaza(${raza.idraza})` : 'createRaza()'}">
                            ${raza ? 'Actualizar' : 'Crear'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remover modal anterior si existe
    const existingModal = document.getElementById('modalRegistrarRaza');
    if (existingModal) {
        existingModal.remove();
    }

    // Agregar nuevo modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalRegistrarRaza'));
    modal.show();
}

// Crear raza
async function createRaza() {
    const razaAnimal = document.getElementById('razaAnimal').value.trim();
    const idEspecie = document.getElementById('idEspecie').value;

    if (!razaAnimal) {
        showMessage('El nombre de la raza es requerido', 'warning');
        return;
    }

    if (!idEspecie) {
        showMessage('Debes seleccionar una especie', 'warning');
        return;
    }

    try {
        const response = await apiRequest('/especieRaza/razas', {
            method: 'POST',
            body: JSON.stringify({ razaAnimal, idEspecie: parseInt(idEspecie) })
        });

        showMessage('Raza creada exitosamente', 'success');

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalRegistrarRaza'));
        modal.hide();

        // Recargar datos
        loadEspeciesYRazas();

    } catch (error) {
        showMessage(error.message, 'danger');
    }
}

// Editar raza
function editRaza(id) {
    const raza = razasData.find(r => r.idraza === id);
    if (raza) {
        showModalRegistrarRaza(raza);
    }
}

// Actualizar raza
async function updateRaza(id) {
    const razaAnimal = document.getElementById('razaAnimal').value.trim();
    const idEspecie = document.getElementById('idEspecie').value;

    if (!razaAnimal) {
        showMessage('El nombre de la raza es requerido', 'warning');
        return;
    }

    if (!idEspecie) {
        showMessage('Debes seleccionar una especie', 'warning');
        return;
    }

    try {
        const response = await apiRequest(`/especieRaza/razas/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ razaAnimal, idEspecie: parseInt(idEspecie) })
        });

        showMessage('Raza actualizada exitosamente', 'success');

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalRegistrarRaza'));
        modal.hide();

        // Recargar datos
        loadEspeciesYRazas();

    } catch (error) {
        showMessage(error.message, 'danger');
    }
}

// Eliminar raza
async function deleteRaza(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta raza?')) {
        return;
    }

    try {
        await apiRequest(`/especieRaza/razas/${id}`, {
            method: 'DELETE'
        });

        showMessage('Raza eliminada exitosamente', 'success');
        loadEspeciesYRazas();

    } catch (error) {
        showMessage(error.message, 'danger');
    }
}

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Verificar acceso al dashboard
    if (!checkDashboardAccess()) {
        return;
    }

    // Actualizar UI de autenticación
    updateAuthUI();

    // Cargar datos iniciales
    loadEspeciesYRazas();

    // Event listeners para filtros
    const buscarEspecie = document.getElementById('buscarEspecie');
    const buscarRaza = document.getElementById('buscarRaza');

    if (buscarEspecie) {
        buscarEspecie.addEventListener('input', filterEspecies);
    }

    if (buscarRaza) {
        buscarRaza.addEventListener('input', filterRazas);
    }
});

// Exponer funciones globales
window.showModalRegistrarEspecie = showModalRegistrarEspecie;
window.showModalRegistrarRaza = showModalRegistrarRaza;
window.editEspecie = editEspecie;
window.editRaza = editRaza;
window.deleteEspecie = deleteEspecie;
window.deleteRaza = deleteRaza;
window.createEspecie = createEspecie;
window.createRaza = createRaza;
window.updateEspecie = updateEspecie;
window.updateRaza = updateRaza;
