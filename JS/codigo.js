// ===================================================
// CONFIGURACIÓN Y UTILIDADES GENERALES
// ===================================================

const API_BASE_URL = 'http://localhost:3000/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// Utilidad para hacer peticiones HTTP
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (authToken) {
        defaultOptions.headers.Authorization = `Bearer ${authToken}`;
    }

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, finalOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error en la petición');
        }

        return data;
    } catch (error) {
        console.error('Error en petición API:', error);
        throw error;
    }
}

// Utilidad para mostrar mensajes
function showMessage(message, type = 'info') {
    // Crear elemento de mensaje
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    messageDiv.style.cssText = 'top: 100px; right: 20px; z-index: 9999; min-width: 300px;';
    
    messageDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(messageDiv);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// Verificar si el usuario está autenticado
function isAuthenticated() {
    return authToken && currentUser;
}

// ===================================================
// PARA EL DASHBOARD
// ===================================================

// Verificar si el usuario tiene un rol específico
function hasRole(allowedRoleIds) {
    if (!isAuthenticated()) return false;
    return allowedRoleIds.includes(currentUser.idRol);
}

// Verificar acceso al dashboard (solo Administrador y trabajador)
function checkDashboardAccess() {
    const allowedRoleIds = [1, 2]; // 1=Administrador, 2=Trabajador
    if (!hasRole(allowedRoleIds)) {
        showMessage('Acceso denegado. Solo administradores y trabajadores pueden acceder al dashboard.', 'danger');
        setTimeout(() => {
            window.location.href = 'HUELLA FELIZ.html';
        }, 3000);
        return false;
    }
    return true;
}

// Actualizar interfaz según estado de autenticación
function updateAuthUI() {
    const loginLink = document.getElementById('iniciarSesion');
    const dashboardLink = document.getElementById('boton');

    if (loginLink) {
        if (isAuthenticated()) {
            loginLink.textContent = `Hola, ${currentUser.aliasUsuario}`;
            loginLink.href = '#';
            loginLink.onclick = showUserMenu;
        } else {
            loginLink.textContent = 'Iniciar Sesión';
            loginLink.href = 'iniciarSesion.html';
            loginLink.onclick = null;
        }
    }

    // Mostrar/ocultar dashboard según el rol
    if (dashboardLink) {
        // Mostrar dash solo para admin (1) o trabajador (2)
        if (hasRole([1, 2])) {
            dashboardLink.style.display = 'block';
        } else {
            dashboardLink.style.display = 'none';
        }
    }
}

// Mostrar menú de usuario
function showUserMenu(e) {
    e.preventDefault();
    // Aquí podrías implementar un dropdown con opciones como:
    // - Ver perfil
    // - Mis adopciones
    // - Mis donaciones
    // - Cerrar sesión
    if (confirm('¿Deseas cerrar sesión?')) {
        logout();
    }
}

// Cerrar sesión
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    updateAuthUI();
    showMessage('Sesión cerrada exitosamente', 'success');
    window.location.href = 'HUELLA FELIZ.html';
}

// ===================================================
// AUTENTICACIÓN
// ===================================================

// Manejo del formulario de registro
async function handleRegistration(formData) {
    try {
        const data = await apiRequest('/auth/registro', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        showMessage('Registro exitoso. Ya puedes iniciar sesión', 'success');
        setTimeout(() => {
            window.location.href = 'iniciarSesion.html';
        }, 2000);

    } catch (error) {
        showMessage(error.message, 'danger');
    }
}


async function handleLogin(email, password) {
    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                correoUsuario: email,
                contrasenaUsuario: password
            })
        });

        authToken = data.data.token;

        // Normalizar usuario y roles
        const u = data.data.usuario;
        currentUser = {
            idUsuario: u.idusuario || u.idUsuario,
            aliasUsuario: u.aliasusuario || u.aliasUsuario,
            idRol: Number(u.idrol), // ahora usamos idRol directamente
            correoUsuario: u.correousuario || u.correoUsuario
        };

        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        showMessage(`¡Bienvenido, ${currentUser.aliasUsuario}!`, 'success');
        
        // Redirigir según rol
        setTimeout(() => {
            if (hasRole([1, 2])) {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'HUELLA FELIZ.html';
            }
        }, 1500);

    } catch (error) {
        showMessage(error.message, 'danger');
    }
}










// ===================================================
// ADOPCIONES
// ===================================================

// Cargar animales disponibles
async function loadAvailableAnimals(filters = {}) {
    try {
        const queryParams = new URLSearchParams(filters);
        const data = await apiRequest(`/animals/disponibles?${queryParams}`);
        
        displayAnimals(data.data);
        
    } catch (error) {
        showMessage('Error cargando animales: ' + error.message, 'danger');
    }
}

// Mostrar animales en la interfaz
function displayAnimals(animals) {
    const container = document.querySelector('.row.row-cols-2');
    if (!container) {
        console.error('No se encontró el contenedor .row.row-cols-2');
        return;
    }

    console.log('Mostrando animales:', animals);
    container.innerHTML = '';

    if (animals.length === 0) {
        container.innerHTML = '<div class="col-12 text-center"><p>No se encontraron animales con los filtros seleccionados.</p></div>';
        return;
    }

    animals.forEach(animal => {
        console.log('Procesando animal:', animal);
        const animalCard = createAnimalCard(animal);
        container.appendChild(animalCard);
    });
}

// Crear tarjeta de animal
function createAnimalCard(animal) {
    const col = document.createElement('div');
    col.className = 'col';
    
    // Mapear los nombres de propiedades de la base de datos a los nombres esperados
    const nombre = animal.nombreanimal || animal.nombreAnimal || 'Sin nombre';
    const especie = animal.especieanimal || animal.especieAnimal || 'Sin especie';
    const raza = animal.razaanimal || animal.razaAnimal || 'Sin raza';
    const edad = animal.edadmesesanimal || animal.edadMesesAnimal || 0;
    const genero = animal.generoanimal || animal.generoAnimal || 'N';
    const id = animal.idanimal || animal.idAnimal || 0;
    const imagen = animal.imagenanimal || animal.imagenAnimal;
    
    // Determinar la URL de la imagen
    const imagenUrl = imagen ? 
        (imagen.startsWith('http') ? imagen : `files/${imagen}`) : 
        `https://placehold.co/300x300?text=${nombre}`;
    
    console.log(`Imagen para ${nombre}: ${imagen} -> ${imagenUrl}`);
    
    col.innerHTML = `
        <div class="card shadow-sm card-animal" onclick="viewAnimalDetails(${id})">
            <img src="${imagenUrl}" class="card-img-top" alt="${nombre}" style="height: 200px; object-fit: cover;" 
                 onerror="console.error('Error cargando imagen:', this.src); this.src='https://placehold.co/300x300?text=${nombre}'">
            <div class="card-body p-2">
                <h6 class="card-title mb-1">${nombre}</h6>
                <small class="text-muted">${especie} - ${raza}</small><br>
                <small class="text-muted">${edad} meses - ${genero === 'M' ? 'Macho' : 'Hembra'}</small>
            </div>
        </div>
    `;
    
    return col;
}

// Ver detalles de un animal
async function viewAnimalDetails(animalId) {
    try {
        const data = await apiRequest(`/animals/${animalId}`);
        showAnimalModal(data.data);
    } catch (error) {
        showMessage('Error cargando detalles: ' + error.message, 'danger');
    }
}

// Mostrar modal con detalles del animal
function showAnimalModal(animal) {
    // Mapear los nombres de propiedades de la base de datos a los nombres esperados
    const nombre = animal.nombreanimal || animal.nombreAnimal || 'Sin nombre';
    const especie = animal.especieanimal || animal.especieAnimal || 'Sin especie';
    const raza = animal.razaanimal || animal.razaAnimal || 'Sin raza';
    const edad = animal.edadmesesanimal || animal.edadMesesAnimal || 0;
    const genero = animal.generoanimal || animal.generoAnimal || 'N';
    const peso = animal.pesoanimal || animal.pesoAnimal || 'No especificado';
    const pelaje = animal.pelaje || 'No especificado';
    const tamaño = animal.tamaño || 'No especificado';
    const id = animal.idanimal || animal.idAnimal || 0;
    const imagen = animal.imagenanimal || animal.imagenAnimal;
    
    // Determinar la URL de la imagen
    const imagenUrl = imagen ? 
        (imagen.startsWith('http') ? imagen : `files/${imagen}`) : 
        `https://placehold.co/400x400?text=${nombre}`;
    
    const modalHtml = `
        <div class="modal fade" id="animalModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${nombre}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <img src="${imagenUrl}" class="img-fluid rounded" alt="${nombre}" style="height: 300px; object-fit: cover;">
                            </div>
                            <div class="col-md-6">
                                <h6>Información básica:</h6>
                                <p><strong>Especie:</strong> ${especie}</p>
                                <p><strong>Raza:</strong> ${raza}</p>
                                <p><strong>Edad:</strong> ${edad} meses</p>
                                <p><strong>Género:</strong> ${genero === 'M' ? 'Macho' : 'Hembra'}</p>
                                <p><strong>Peso:</strong> ${peso} kg</p>
                                <p><strong>Pelaje:</strong> ${pelaje}</p>
                                <p><strong>Tamaño:</strong> ${tamaño}</p>
                            </div>
                        </div>
                        ${animal.historial && animal.historial.length > 0 ? `
                            <div class="mt-3">
                                <h6>Historial médico:</h6>
                                <div class="accordion" id="historialAccordion">
                                    ${animal.historial.map((h, index) => `
                                        <div class="accordion-item">
                                            <h2 class="accordion-header">
                                                <button class="accordion-button ${index > 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#historial${index}">
                                                    ${h.fechaHistorial} - ${h.horaHistorial}
                                                </button>
                                            </h2>
                                            <div id="historial${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#historialAccordion">
                                                <div class="accordion-body">
                                                    ${h.descripcionHistorial}
                                                    ${h.pesoHistorial ? `<br><strong>Peso:</strong> ${h.pesoHistorial} kg` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        ${isAuthenticated() ? `<button type="button" class="btn btn-pink" onclick="adoptAnimal(${id})">Solicitar Adopción</button>` : `<button type="button" class="btn btn-pink" onclick="showMessage('Debes iniciar sesión para adoptar', 'warning')">Iniciar Sesión para Adoptar</button>`}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remover modal anterior si existe
    const existingModal = document.getElementById('animalModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Agregar nuevo modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('animalModal'));
    modal.show();
}

// Solicitar adopción
async function adoptAnimal(animalId) {
    if (!isAuthenticated()) {
        showMessage('Debes iniciar sesión para adoptar', 'warning');
        return;
    }

    try {
        const data = await apiRequest('/animals/adoptar', {
            method: 'POST',
            body: JSON.stringify({ idAnimal: animalId })
        });

        showMessage('Solicitud de adopción enviada exitosamente', 'success');
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('animalModal'));
        if (modal) modal.hide();

    } catch (error) {
        showMessage(error.message, 'danger');
    }
}

// Cargar opciones para filtros
async function loadFilterOptions() {
    try {
        const data = await apiRequest('/animals/filtros/opciones');
        populateFilters(data.data);
    } catch (error) {
        console.error('Error cargando opciones de filtros:', error);
    }
}

// Poblar filtros con opciones
function populateFilters(options) {
    const selects = {
        especie: options.especies,
        pelaje: options.pelajes,
        tamaño: options.tamaños,
        genero: options.generos,
        edad: options.edades
    };

    Object.keys(selects).forEach(filterId => {
        const select = document.querySelector(`select[data-filter="${filterId}"]`);
        if (select && selects[filterId]) {
            select.innerHTML = `<option value="">${select.options[0].text}</option>`;
            
            selects[filterId].forEach(option => {
                const optionElement = document.createElement('option');
                if (typeof option === 'string') {
                    optionElement.value = option;
                    optionElement.textContent = option;
                } else {
                    optionElement.value = option.valor;
                    optionElement.textContent = option.nombre;
                }
                select.appendChild(optionElement);
            });
        }
    });
}

// ===================================================
// DONACIONES
// ===================================================

// Cargar historial de donaciones
async function loadDonationHistory(filters = {}) {
    try {
        const queryParams = new URLSearchParams(filters);
        const data = await apiRequest(`/donations/historial?${queryParams}`);
        
        displayDonationHistory(data.data);
        
    } catch (error) {
        showMessage('Error cargando historial: ' + error.message, 'danger');
    }
}

// Mostrar historial de donaciones
function displayDonationHistory(donations) {
    const tbody = document.getElementById('donacionesBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (donations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No se encontraron donaciones</td></tr>';
        return;
    }

    donations.forEach(donation => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${donation.detalleDonacion}</td>
            <td>${donation.categoria}</td>
            <td>${new Date(donation.fechaDonacion).toLocaleDateString()}</td>
            <td>${donation.cantidadDonacion} ${donation.categoria === 'Efectivo' ? 'S/.' : ''}</td>
        `;
        tbody.appendChild(row);
    });
}

// Realizar donación económica
async function makeDonation(amount, method, message = '') {
    if (!isAuthenticated()) {
        showMessage('Debes iniciar sesión para donar', 'warning');
        return;
    }

    try {
        const data = await apiRequest('/donations/economica', {
            method: 'POST',
            body: JSON.stringify({
                monto: parseFloat(amount),
                metodoPago: method,
                mensaje: message
            })
        });

        showMessage('¡Donación realizada exitosamente! Gracias por tu apoyo', 'success');
        
        // Recargar historial si estamos en la página de donaciones
        if (window.location.pathname.includes('donaciones')) {
            loadDonationHistory();
        }

    } catch (error) {
        showMessage(error.message, 'danger');
    }
}

// ===================================================
// REPORTES
// ===================================================

// Enviar reporte de animal
async function sendAnimalReport(reportData) {
    try {
        const data = await apiRequest('/reports/crear', {
            method: 'POST',
            body: JSON.stringify(reportData)
        });

        showMessage(`Reporte enviado exitosamente. Código: ${data.data.codigoReporte}`, 'success');
        
        // Limpiar formulario
        const form = document.querySelector('#reporte form');
        if (form) form.reset();

    } catch (error) {
        showMessage(error.message, 'danger');
    }
}


// ===================================================
// INICIALIZACIÓN Y EVENT LISTENERS
// ===================================================

document.addEventListener('DOMContentLoaded', function() {
    // Verificar acceso al dashboard si estamos en esa página
    if (window.location.pathname.includes('dashboard')) {
        if (!checkDashboardAccess()) {
            return; // No continuar si no tiene acceso
        }
    }

    // Actualizar UI de autenticación
    updateAuthUI();

    // Página específica: Iniciar Sesión
    if (window.location.pathname.includes('iniciarSesion')) {
        const loginForm = document.querySelector('form');
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                handleLogin(email, password);
            });
        }
    }

    // Página específica: Registro
    if (window.location.pathname.includes('registrate')) {
        const registerForm = document.querySelector('form');
        if (registerForm) {
            registerForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const formData = {
                    aliasUsuario: document.getElementById('alias').value,
                    nombreUsuario: document.getElementById('nombre').value,
                    apellidoPaternoUsuario: document.getElementById('apellidoP').value,
                    apellidoMaternoUsuario: document.getElementById('apellidoM').value || null,
                    correoUsuario: document.getElementById('correo').value,
                    contrasenaUsuario: document.getElementById('password').value,
                    numeroUsuario: document.getElementById('numero').value,
                    direccionUsuario: document.getElementById('direccion').value || null
                };

                // Validar que las contraseñas coincidan
                const password2 = document.getElementById('password2').value;
                if (formData.contrasenaUsuario !== password2) {
                    showMessage('Las contraseñas no coinciden', 'danger');
                    return;
                }

                handleRegistration(formData);
            });
        }
    }

    // Página específica: Adopciones
    if (window.location.pathname.includes('adopciones')) {
        loadAvailableAnimals();
        loadFilterOptions();

        // Event listeners para filtros
        const filterSelects = document.querySelectorAll('.form-select');
        filterSelects.forEach(select => {
            select.addEventListener('change', function() {
                const filters = {};
                filterSelects.forEach(s => {
                    if (s.value && s.dataset.filter) {
                        filters[s.dataset.filter] = s.value;
                    }
                });
                loadAvailableAnimals(filters);
            });
        });
    }

    // Página específica: Donaciones
    if (window.location.pathname.includes('donaciones')) {
        loadDonationHistory();

        // Event listener para filtro de donaciones
        const filtrarBtn = document.getElementById('filtrarBtn');
        if (filtrarBtn) {
            filtrarBtn.addEventListener('click', function() {
                const categoria = document.querySelector('select').value;
                const fecha = document.querySelector('input[type="date"]').value;
                
                const filters = {};
                if (categoria) filters.categoria = categoria;
                if (fecha) filters.fecha = fecha;
                
                loadDonationHistory(filters);
            });
        }
    }

    // Página específica: Reportar
    if (window.location.pathname.includes('reportar')) {
        const reportForm = document.querySelector('#reporte form');
        if (reportForm) {
            reportForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const formData = new FormData(this);
                const reportData = {
                    direccion: formData.get('direccion') || document.querySelector('input[placeholder="Ingresar dirección"]').value,
                    generoAnimal: document.querySelector('select').value,
                    gravedad: document.querySelectorAll('select')[1].value,
                    especieAnimal: document.querySelectorAll('select')[2].value,
                    situacion: document.querySelector('input[placeholder="Ingresar situación"]').value
                };

                // Mapear valores de género
                const generoMap = {
                    'Macho': 'M',
                    'Hembra': 'H',
                    'No definido': 'N'
                };
                reportData.generoAnimal = generoMap[reportData.generoAnimal] || 'N';

                sendAnimalReport(reportData);
            });
        }
    }

    // Toggle password visibility
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const password = document.getElementById('password');
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            icon.classList.toggle('bi-eye');
            icon.classList.toggle('bi-eye-slash');
        });
    }
});

// Función global para donar (llamada desde botones)
window.donar = function(amount, method) {
    if (!isAuthenticated()) {
        showMessage('Debes iniciar sesión para donar', 'warning');
        setTimeout(() => {
            window.location.href = 'iniciarSesion.html';
        }, 2000);
        return;
    }
    
    const message = prompt('¿Quieres agregar un mensaje a tu donación? (opcional)');
    makeDonation(amount, method, message || '');
};


// Exponer funciones globales necesarias
window.viewAnimalDetails = viewAnimalDetails;
window.adoptAnimal = adoptAnimal;
window.showUserMenu = showUserMenu;
