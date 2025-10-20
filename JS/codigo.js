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

// Verificar acceso al dashboard (solo Administrador)
function checkDashboardAccess() {
    const allowedRoleIds = [1]; // 1=Administrador únicamente
    if (!hasRole(allowedRoleIds)) {
        showMessage('Acceso denegado. Solo administradores pueden acceder al dashboard.', 'danger');
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
            // Crear el menú de usuario dinámicamente
            const userMenuHtml = `
                <div class="position-relative">
                    <button class="profile-btn" onclick="showUserMenu(event)">
                        <div class="profile-avatar">${getUserInitials(currentUser.aliasUsuario)}</div>
                        <span>${currentUser.aliasUsuario}</span>
                        <i class="bi bi-chevron-down"></i>
                    </button>
                    
                    <div class="user-dropdown" id="userDropdown">
                        <div class="user-menu-header">
                            <div class="user-avatar">${getUserInitials(currentUser.aliasUsuario)}</div>
                            <h6 class="user-name">${currentUser.aliasUsuario}</h6>
                            <p class="user-role">${getRoleName(currentUser.idRol)}</p>
                        </div>
                        
                        <div class="user-menu-items">
                            <a href="#" class="user-menu-item" onclick="showEditProfileModal()">
                                <i class="bi bi-person-gear"></i>
                                Editar Perfil
                            </a>
                            <a href="#" class="user-menu-item" onclick="showMyAdoptions()">
                                <i class="bi bi-heart"></i>
                                Mis Adopciones
                            </a>
                            <a href="#" class="user-menu-item" onclick="showMyDonations()">
                                <i class="bi bi-gift"></i>
                                Mis Donaciones
                            </a>
                            
                            ${hasRole([1]) ? `
                                <div class="user-menu-divider"></div>
                                <a href="dashboard.html" class="user-menu-item">
                                    <i class="bi bi-speedometer2"></i>
                                    Dashboard
                                </a>
                            ` : ''}
                            
                            <div class="user-menu-divider"></div>
                            <a href="#" class="user-menu-item danger" onclick="logout()">
                                <i class="bi bi-box-arrow-right"></i>
                                Cerrar Sesión
                            </a>
                        </div>
                    </div>
                </div>
            `;
            
            loginLink.innerHTML = userMenuHtml;
            loginLink.href = '#';
            loginLink.onclick = null;
        } else {
            loginLink.innerHTML = 'Iniciar Sesión';
            loginLink.href = 'iniciarSesion.html';
            loginLink.onclick = null;
        }
    }

    // El dashboard ahora solo está disponible desde el menú de usuario
}

// Mostrar menú de usuario
function showUserMenu(e) {
    e.preventDefault();
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Cerrar menú de usuario al hacer clic fuera
function closeUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// Obtener iniciales del usuario para el avatar
function getUserInitials(name) {
    if (!name) return 'U';
    const words = name.split(' ');
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
}

// Obtener nombre del rol
function getRoleName(roleId) {
    const roles = {
        1: 'Administrador',
        2: 'Adoptante', 
        3: 'Donante'
    };
    return roles[roleId] || 'Usuario';
}

// Mostrar modal de edición de perfil
function showEditProfileModal() {
    // Recargar currentUser desde localStorage para asegurar datos actualizados
    currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser) return;
    
    // Crear modal dinámicamente
    const modalHtml = `
        <div class="modal fade" id="editProfileModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Editar Perfil</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editProfileForm">
                            <div class="mb-3">
                                <label class="form-label">Alias</label>
                                <input type="text" class="form-control" id="editAlias" value="${currentUser.aliasUsuario || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Correo</label>
                                <input type="email" class="form-control" id="editEmail" value="${currentUser.correoUsuario || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Número de teléfono</label>
                                <input type="tel" class="form-control" id="editPhone" value="${currentUser.numeroUsuario || ''}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Dirección</label>
                                <input type="text" class="form-control" id="editAddress" value="${currentUser.direccionUsuario || ''}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Nueva contraseña (opcional)</label>
                                <input type="password" class="form-control" id="editPassword" placeholder="Dejar vacío para no cambiar">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-pink" onclick="saveProfile()">Guardar Cambios</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remover modal existente si existe
    const existingModal = document.getElementById('editProfileModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Agregar modal al body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
    modal.show();
    
    // Cerrar menú de usuario
    closeUserMenu();
}

// Guardar cambios del perfil
async function saveProfile() {
    try {
        const formData = {
            aliasusuario: document.getElementById('editAlias').value,
            correousuario: document.getElementById('editEmail').value,
            numerousuario: document.getElementById('editPhone').value,
            direccionusuario: document.getElementById('editAddress').value
        };
        
        const newPassword = document.getElementById('editPassword').value;
        if (newPassword) {
            formData.claveusuario = newPassword;
        }
        
        const response = await apiRequest(`/users/${currentUser.idUsuario}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        
        showMessage('Perfil actualizado exitosamente', 'success');
        
        // Actualizar usuario actual con los nombres correctos
        currentUser.aliasUsuario = formData.aliasusuario;
        currentUser.correoUsuario = formData.correousuario;
        currentUser.numeroUsuario = formData.numerousuario;
        currentUser.direccionUsuario = formData.direccionusuario;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Actualizar UI
        updateAuthUI();
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
        modal.hide();
        
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        showMessage('Error al actualizar el perfil', 'danger');
    }
}

// Mostrar mis adopciones
function showMyAdoptions() {
    closeUserMenu();
    // Aquí podrías implementar la lógica para mostrar las adopciones del usuario
    showMessage('Funcionalidad de "Mis Adopciones" próximamente', 'info');
}

// Mostrar mis donaciones
function showMyDonations() {
    closeUserMenu();
    // Aquí podrías implementar la lógica para mostrar las donaciones del usuario
    showMessage('Funcionalidad de "Mis Donaciones" próximamente', 'info');
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
            correoUsuario: u.correousuario || u.correoUsuario,
            numeroUsuario: u.numerousuario || u.numeroUsuario,
            direccionUsuario: u.direccionusuario || u.direccionUsuario
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

    // Cerrar menú de usuario al hacer clic fuera
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('userDropdown');
        const profileBtn = event.target.closest('.profile-btn');
        
        if (dropdown && !dropdown.contains(event.target) && !profileBtn) {
            dropdown.classList.remove('show');
        }
    });

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


// ===================================================
// FUNCIONALIDAD DE CONTACTO POR WHATSAPP
// ===================================================

// Función para validar email
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Función para manejar el envío del formulario de contacto
function manejarContacto(event) {
    event.preventDefault();
    
    // Obtener valores del formulario
    const email = document.getElementById('emailContacto').value.trim();
    const numero = document.getElementById('numeroContacto').value.trim();
    const titulo = document.getElementById('tituloContacto').value.trim();
    const mensaje = document.getElementById('mensajeContacto').value.trim();
    
    // Ocultar errores previos
    document.getElementById('emailError').style.display = 'none';
    document.getElementById('tituloError').style.display = 'none';
    document.getElementById('mensajeError').style.display = 'none';
    
    // Validaciones
    let hayErrores = false;
    
    if (!email || !validarEmail(email)) {
        document.getElementById('emailError').style.display = 'block';
        hayErrores = true;
    }
    
    if (!titulo) {
        document.getElementById('tituloError').style.display = 'block';
        hayErrores = true;
    }
    
    if (!mensaje) {
        document.getElementById('mensajeError').style.display = 'block';
        hayErrores = true;
    }
    
    if (hayErrores) {
        return;
    }
    
    // Crear mensaje para WhatsApp
    const numeroWhatsApp = '51952225506'; // Tu número sin el + y sin espacios
    let mensajeWhatsApp = `*Nuevo mensaje desde Huella Feliz*\n\n`;
    mensajeWhatsApp += `*Email:* ${email}\n`;
    if (numero) {
        mensajeWhatsApp += `*Teléfono:* ${numero}\n`;
    }
    mensajeWhatsApp += `*Título:* ${titulo}\n\n`;
    mensajeWhatsApp += `*Mensaje:*\n${mensaje}`;
    
    // Codificar el mensaje para URL
    const mensajeCodificado = encodeURIComponent(mensajeWhatsApp);
    
    // Crear URL de WhatsApp
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;
    
    // Abrir WhatsApp
    window.open(urlWhatsApp, '_blank');
    
    // Mostrar mensaje de confirmación
    showMessage('Redirigiendo a WhatsApp... ¡Tu mensaje será enviado!', 'success');
    
    // Limpiar formulario después de un breve delay
    setTimeout(() => {
        document.getElementById('contactoForm').reset();
    }, 2000);
}

// Inicializar funcionalidad de contacto cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    const contactoForm = document.getElementById('contactoForm');
    if (contactoForm) {
        contactoForm.addEventListener('submit', manejarContacto);
    }
});

// Exponer funciones globales necesarias
window.viewAnimalDetails = viewAnimalDetails;
window.adoptAnimal = adoptAnimal;
window.showUserMenu = showUserMenu;
