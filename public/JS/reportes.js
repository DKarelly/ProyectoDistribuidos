// reportes.js - Manejo de reportes públicos y administrativos

let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está autenticado
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const isAuthenticated = token && token !== 'null' && token !== 'undefined' && currentUser;

    console.log('=== REPORTES PAGE DEBUG ===');
    console.log('Token:', token ? 'present' : 'missing');
    console.log('Current user:', currentUser);
    console.log('Is authenticated:', isAuthenticated);

    if (isAuthenticated) {
        // Usuario autenticado: verificar acceso al dashboard
        console.log('User authenticated, checking dashboard access...');
        if (!checkDashboardAccess()) {
            console.log('Dashboard access denied');
            return;
        }
        console.log('Dashboard access granted, initializing reports...');
        // Inicializar reportes administrativos
        initializeReportes();
        // Configurar filtros de fecha
        setupDateFilters();
    } else {
        // Usuario no autenticado: mostrar mensaje público
        console.log('User not authenticated, showing public message...');
        initializePublicReportes();
    }
});

function initializePublicReportes() {
    // Página pública: mostrar mensaje de que los datos no están disponibles
    showPublicMessage();

    // Configurar pestañas
    setupTabs();
}

function initializeReportes() {
    // Cargar datos iniciales para todas las pestañas
    loadDonacionesData();
    loadAdopcionesData();
    loadAhijadosData();

    // Configurar pestañas
    setupTabs();
}

function setupTabs() {
    const token = localStorage.getItem('authToken');
    const isAuthenticated = token && token !== 'null' && token !== 'undefined';
    const tabButtons = document.querySelectorAll('.nav-link[data-bs-toggle="tab"]');
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const targetTab = e.target.getAttribute('data-bs-target');
            // Recargar datos cuando se cambia de pestaña (solo si está autenticado)
            if (isAuthenticated) {
                switch(targetTab) {
                    case '#donaciones':
                        loadDonacionesData();
                        break;
                    case '#adopciones':
                        loadAdopcionesData();
                        break;
                    case '#ahijados':
                        loadAhijadosData();
                        break;
                }
            }
        });
    });
}

function setupDateFilters() {
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            const activeTab = document.querySelector('.tab-pane.show');
            if (activeTab.id === 'donaciones') {
                loadDonacionesData();
            } else if (activeTab.id === 'adopciones') {
                loadAdopcionesData();
            } else if (activeTab.id === 'ahijados') {
                loadAhijadosData();
            }
        });
    }

    // Botón para limpiar filtros
    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            document.getElementById('fechaDesde').value = '';
            document.getElementById('fechaHasta').value = '';
            const activeTab = document.querySelector('.tab-pane.show');
            if (activeTab.id === 'donaciones') {
                loadDonacionesData();
            } else if (activeTab.id === 'adopciones')
                 {
                loadAdopcionesData();
            } else if (activeTab.id === 'ahijados') {
                loadAhijadosData();
            }
        });
    }
}

// Función para mostrar mensaje en página pública
function showPublicMessage() {
    const reportesContent = document.getElementById('reportesContent');
    if (!reportesContent) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'text-center mb-4';
    messageDiv.style.padding = '20px';
    messageDiv.style.backgroundColor = '#f8f9fa';
    messageDiv.style.border = '1px solid #dee2e6';
    messageDiv.style.borderRadius = '5px';
    messageDiv.innerHTML = `
        <h5 class="text-muted mb-2">Información de Reportes</h5>
        <p class="mb-2">Los datos detallados de reportes están disponibles únicamente en el panel administrativo.</p>
        <p><a href="login.html" class="btn btn-primary btn-sm">Iniciar Sesión como Administrador</a></p>
    `;

    // Insertar el mensaje al inicio del contenido de reportes
    reportesContent.insertBefore(messageDiv, reportesContent.firstChild);
}

async function loadDonacionesData() {
    try {
        const fechaDesde = document.getElementById('fechaDesde')?.value || '';
        const fechaHasta = document.getElementById('fechaHasta')?.value || '';
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');

        console.log('Loading donaciones data with token:', token ? 'present' : 'missing');
        console.log('Current user:', currentUser);

        const params = new URLSearchParams();
        if (fechaDesde) params.append('fechaDesde', fechaDesde);
        if (fechaHasta) params.append('fechaHasta', fechaHasta);

        // Cargar datos para gráfico de categorías
        console.log('Fetching categorias:', `/api/reporteAdmin/donaciones/categorias?${params}`);
        const categoriasResponse = await fetch(`/api/reporteAdmin/donaciones/categorias?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Categorias response status:', categoriasResponse.status);
        console.log('Categorias response ok:', categoriasResponse.ok);

        if (categoriasResponse.ok) {
            const categoriasData = await categoriasResponse.json();
            console.log('Categorias data:', categoriasData);
            updateDonacionesChart(categoriasData.data);
            updateDonacionesTable(categoriasData.data);
        } else {
            const errorText = await categoriasResponse.text();
            console.error('Categorias error response:', errorText);
            showError('Error al cargar datos de categorías: ' + categoriasResponse.status);
        }

        // Cargar datos para gráfico de meses
        console.log('Fetching meses:', `/api/reporteAdmin/donaciones/meses?${params}`);
        const mesesResponse = await fetch(`/api/reporteAdmin/donaciones/meses?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Meses response status:', mesesResponse.status);
        console.log('Meses response ok:', mesesResponse.ok);

        if (mesesResponse.ok) {
            const mesesData = await mesesResponse.json();
            console.log('Meses data:', mesesData);
            updateDonacionesMesesChart(mesesData.data);
        } else {
            const errorText = await mesesResponse.text();
            console.error('Meses error response:', errorText);
            showError('Error al cargar datos de meses: ' + mesesResponse.status);
        }

    } catch (error) {
        console.error('Error cargando datos de donaciones:', error);
        showError('Error al cargar los datos de donaciones: ' + error.message);
    }
}

async function loadAdopcionesData() {
    try {
        const fechaDesde = document.getElementById('fechaDesde')?.value || '';
        const fechaHasta = document.getElementById('fechaHasta')?.value || '';
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');

        console.log('Loading adopciones data with token:', token ? 'present' : 'missing');

        const params = new URLSearchParams();
        if (fechaDesde) params.append('fechaDesde', fechaDesde);
        if (fechaHasta) params.append('fechaHasta', fechaHasta);

        // Cargar datos de estado de adopciones
        console.log('Fetching adopciones estado:', `/api/reporteAdmin/adopciones/estado?${params}`);
        const estadoResponse = await fetch(`/api/reporteAdmin/adopciones/estado?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Adopciones estado response status:', estadoResponse.status);
        console.log('Adopciones estado response ok:', estadoResponse.ok);

        if (estadoResponse.ok) {
            const estadoData = await estadoResponse.json();
            console.log('Adopciones estado data:', estadoData);
            updateAdopcionesChart(estadoData.data);
        } else {
            const errorText = await estadoResponse.text();
            console.error('Adopciones estado error response:', errorText);
            showError('Error al cargar datos de estado de adopciones: ' + estadoResponse.status);
        }

        // Cargar datos por meses
        console.log('Fetching adopciones meses:', `/api/reporteAdmin/adopciones/meses?${params}`);
        const mesesResponse = await fetch(`/api/reporteAdmin/adopciones/meses?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Adopciones meses response status:', mesesResponse.status);
        console.log('Adopciones meses response ok:', mesesResponse.ok);

        if (mesesResponse.ok) {
            const mesesData = await mesesResponse.json();
            console.log('Adopciones meses data:', mesesData);
            updateAdopcionesMesesChart(mesesData.data);
        } else {
            const errorText = await mesesResponse.text();
            console.error('Adopciones meses error response:', errorText);
            showError('Error al cargar datos de meses de adopciones: ' + mesesResponse.status);
        }

    } catch (error) {
        console.error('Error cargando datos de adopciones:', error);
        showError('Error al cargar los datos de adopciones: ' + error.message);
    }
}

async function loadAhijadosData() {
    try {
        const fechaDesde = document.getElementById('fechaDesde')?.value || '';
        const fechaHasta = document.getElementById('fechaHasta')?.value || '';

        const params = new URLSearchParams();
        if (fechaDesde) params.append('fechaDesde', fechaDesde);
        if (fechaHasta) params.append('fechaHasta', fechaHasta);

        // Cargar datos de estado de ahijados
        const estadoResponse = await fetch(`/api/reporteAdmin/ahijados/estado?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (estadoResponse.ok) {
            const estadoData = await estadoResponse.json();
            updateAhijadosChart(estadoData.data);
        }

        // Cargar datos por meses
        const mesesResponse = await fetch(`/api/reporteAdmin/ahijados/meses?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (mesesResponse.ok) {
            const mesesData = await mesesResponse.json();
            updateAhijadosMesesChart(mesesData.data);
        }

    } catch (error) {
        console.error('Error cargando datos de ahijados:', error);
        showError('Error al cargar los datos de ahijados');
    }
}

// Funciones para actualizar gráficos
function updateDonacionesChart(data) {
    const ctx = document.getElementById('donacionesChart');
    if (!ctx) return;

    // Destruir gráfico anterior si existe
    if (window.donacionesChartInstance) {
        window.donacionesChartInstance.destroy();
    }

    const labels = data.map(item => item.categoria);
    const values = data.map(item => parseFloat(item.total));

    window.donacionesChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: 'Donaciones por Categoría'
                }
            }
        }
    });
}

function updateDonacionesMesesChart(data) {
    const ctx = document.getElementById('donacionesMesesChart');
    if (!ctx) return;

    if (window.donacionesMesesChartInstance) {
        window.donacionesMesesChartInstance.destroy();
    }

    const labels = data.map(item => {
        const [year, month] = item.mes.split('-');
        return `${year}-${month}`;
    });
    const values = data.map(item => parseFloat(item.total));

    window.donacionesMesesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Donaciones',
                data: values,
                borderColor: '#36A2EB',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Donaciones por Mes'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateAdopcionesChart(data) {
    const ctx = document.getElementById('adopcionesChart');
    if (!ctx) return;

    if (window.adopcionesChartInstance) {
        window.adopcionesChartInstance.destroy();
    }

    window.adopcionesChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Adoptados', 'Disponibles'],
            datasets: [{
                data: [data.adoptados, data.disponibles],
                backgroundColor: ['#FF6384', '#36A2EB']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: 'Estado de Adopciones'
                }
            }
        }
    });
}

function updateAdopcionesMesesChart(data) {
    const ctx = document.getElementById('adopcionesMesesChart');
    if (!ctx) return;

    if (window.adopcionesMesesChartInstance) {
        window.adopcionesMesesChartInstance.destroy();
    }

    const labels = data.map(item => {
        const [year, month] = item.mes.split('-');
        return `${year}-${month}`;
    });
    const values = data.map(item => parseInt(item.total));

    window.adopcionesMesesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Adopciones',
                data: values,
                backgroundColor: '#FF6384',
                borderColor: '#FF6384',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Adopciones por Mes'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateAhijadosChart(data) {
    const ctx = document.getElementById('ahijadosChart');
    if (!ctx) return;

    if (window.ahijadosChartInstance) {
        window.ahijadosChartInstance.destroy();
    }

    window.ahijadosChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Activos', 'Inactivos'],
            datasets: [{
                data: [data.activos, data.inactivos],
                backgroundColor: ['#4BC0C0', '#FFCE56']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: 'Estado de Ahijados'
                }
            }
        }
    });
}

function updateAhijadosMesesChart(data) {
    const ctx = document.getElementById('ahijadosMesesChart');
    if (!ctx) return;

    if (window.ahijadosMesesChartInstance) {
        window.ahijadosMesesChartInstance.destroy();
    }

    const labels = data.map(item => {
        const [year, month] = item.mes.split('-');
        return `${year}-${month}`;
    });
    const values = data.map(item => parseInt(item.total));

    window.ahijadosMesesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ahijados',
                data: values,
                backgroundColor: '#4BC0C0',
                borderColor: '#4BC0C0',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Ahijados por Mes'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Funciones para actualizar tablas
function updateDonacionesTable(data) {
    const tbody = document.getElementById('donacionesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.categoria}</td>
            <td class="text-end">${parseFloat(item.total).toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
}

// Funciones de utilidad
function showError(message) {
    // Mostrar mensaje de error al usuario
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
    }

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Función para exportar PDF
function exportToPDF() {
    const element = document.getElementById('reportesContent');
    if (!element) {
        showError('No se encontró el contenido para exportar');
        return;
    }

    // Verificar si es página pública o administrativa
    const isPublicPage = !window.location.pathname.includes('dashboard');
    const reportType = isPublicPage ? 'Reportes Públicos' : 'Reportes Administrativos';

    // Configuración para html2pdf
    const opt = {
        margin: 1,
        filename: `reportes-huella-feliz-${isPublicPage ? 'publicos' : 'administrativos'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Agregar header con logo
    const header = document.createElement('div');
    header.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="files/iconomain.jpg" alt="HUELLA FELIZ" style="width: 100px; height: auto;">
            <h2 style="color: #dc3545; margin-top: 10px;">HUELLA FELIZ</h2>
            <h4>${reportType}</h4>
            <p>Fecha de generación: ${new Date().toLocaleDateString()}</p>
        </div>
    `;

    const contentToExport = document.createElement('div');
    contentToExport.appendChild(header);
    contentToExport.appendChild(element.cloneNode(true));

    html2pdf().set(opt).from(contentToExport).save();
}

// Hacer función global para el botón de exportar
window.exportToPDF = exportToPDF;
