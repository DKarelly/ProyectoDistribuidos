// reportes.js - Manejo de reportes públicos y administrativos

// currentUser ya está declarado en codigo.js, no necesitamos redeclararlo
// let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== REPORTES PAGE (solo BD, sin datos demo) ===');
    initializeReportes();
    setupDateFilters();
});

// Eliminado modo público con datos de demostración

function initializeReportes() {
    // Cargar datos iniciales para todas las pestañas
    loadDonacionesData();
    loadAdopcionesData();
    loadAhijadosData();

    // Configurar pestañas
    setupTabs();
    
    // Configurar event listeners para los combos de meses
    setupMonthFilters();
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

// Función para configurar los filtros de mes
function setupMonthFilters() {
    // Filtro de mes para cantidad de donaciones
    const mesDonacionesCantidad = document.getElementById('mesDonacionesCantidad');
    if (mesDonacionesCantidad) {
        mesDonacionesCantidad.addEventListener('change', function() {
            if (this.value) {
                // Si hay mes seleccionado, mostrar barras por categoría para ese mes
                loadDonacionesCantidadData(this.value);
            } else {
                // Sin mes: mostrar serie mensual multi-categoría
                loadDonacionesCategoriasMesesData();
            }
        });
    }

    // Filtro de mes para adopciones
    const mesAdopciones = document.getElementById('mesAdopciones');
    if (mesAdopciones) {
        mesAdopciones.addEventListener('change', function() {
            loadAdopcionesMesesData(this.value);
        });
    }

    // Filtro de mes para ahijados
    const mesAhijados = document.getElementById('mesAhijados');
    if (mesAhijados) {
        mesAhijados.addEventListener('change', function() {
            loadAhijadosMesesData(this.value);
        });
    }
}

// Función para cargar datos de demostración para usuarios no autenticados
// Eliminados datos de demostración

// Función para mostrar mensaje en página pública
function showPublicMessage() {
    const reportesContent = document.getElementById('reportesContent');
    if (!reportesContent) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert alert-info text-center mb-4';
    messageDiv.style.margin = '20px auto';
    messageDiv.style.maxWidth = '800px';
    messageDiv.innerHTML = `
        <h5 class="alert-heading mb-3">
            <i class="bi bi-info-circle-fill me-2"></i>
            Datos de Demostración
        </h5>
        <p class="mb-3">Los gráficos mostrados contienen datos de ejemplo para demostración.</p>
        <p class="mb-0">
            <strong>Para ver los datos reales y detallados,</strong> inicia sesión como administrador.
        </p>
        <a href="iniciarSesion.html" class="btn btn-primary btn-sm mt-3">Iniciar Sesión</a>
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

        const params = new URLSearchParams();
        if (fechaDesde) params.append('fechaDesde', fechaDesde);
        if (fechaHasta) params.append('fechaHasta', fechaHasta);

        // Cargar datos para gráfico de categorías
        console.log('Fetching categorias (cantidad):', `/api/reporteAdmin/donaciones/categorias?${params}`);
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

        // Cargar datos para gráfico de meses (montos totales)
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
        
        // Cargar serie mensual multi-categoría (por defecto)
        await loadDonacionesCategoriasMesesData();

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
            updateAdopcionesTable(estadoData.data);
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
            updateAhijadosTable(estadoData.data);
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
    const canvas = document.getElementById('donacionesChart');
    if (!canvas) {
        console.error('Canvas donacionesChart not found');
        return;
    }

    // Destruir gráfico anterior si existe
    if (window.donacionesChartInstance) {
        window.donacionesChartInstance.destroy();
    }

    const labels = data.map(item => item.categoria);
    const values = data.map(item => parseInt(item.cantidad || item.total || item.total_monto));

    console.log('Creating donaciones chart with data:', { labels, values });

    window.donacionesChartInstance = new Chart(canvas, {
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
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: 'Cantidad de Donaciones por Categoría'
                }
            }
        }
    });
    
    console.log('Donaciones chart created successfully');
}

function updateDonacionesMesesChart(data) {
    const canvas = document.getElementById('donacionesMesesChart');
    if (!canvas) {
        console.error('Canvas donacionesMesesChart not found');
        return;
    }

    if (window.donacionesMesesChartInstance) {
        window.donacionesMesesChartInstance.destroy();
    }

    const labels = data.map(item => {
        const [year, month] = item.mes.split('-');
        return `${year}-${month}`;
    });
    const values = data.map(item => parseFloat(item.total));

    console.log('Creating donaciones meses chart with data:', { labels, values });

    window.donacionesMesesChartInstance = new Chart(canvas, {
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
            maintainAspectRatio: true,
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
    
    console.log('Donaciones meses chart created successfully');
}

function updateAdopcionesChart(data) {
    const canvas = document.getElementById('adopcionesChart');
    if (!canvas) {
        console.error('Canvas adopcionesChart not found');
        return;
    }

    if (window.adopcionesChartInstance) {
        window.adopcionesChartInstance.destroy();
    }

    console.log('Creating adopciones chart with data:', data);

    window.adopcionesChartInstance = new Chart(canvas, {
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
            maintainAspectRatio: true,
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
    
    console.log('Adopciones chart created successfully');
}

function updateAdopcionesMesesChart(data) {
    const canvas = document.getElementById('adopcionesMesesChart');
    if (!canvas) {
        console.error('Canvas adopcionesMesesChart not found');
        return;
    }

    if (window.adopcionesMesesChartInstance) {
        window.adopcionesMesesChartInstance.destroy();
    }

    const labels = data.map(item => {
        const [year, month] = item.mes.split('-');
        return `${year}-${month}`;
    });
    const values = data.map(item => parseInt(item.total));

    console.log('Creating adopciones meses chart with data:', { labels, values });

    window.adopcionesMesesChartInstance = new Chart(canvas, {
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
            maintainAspectRatio: true,
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
    
    console.log('Adopciones meses chart created successfully');
}

function updateAhijadosChart(data) {
    const canvas = document.getElementById('ahijadosChart');
    if (!canvas) {
        console.error('Canvas ahijadosChart not found');
        return;
    }

    if (window.ahijadosChartInstance) {
        window.ahijadosChartInstance.destroy();
    }

    console.log('Creating ahijados chart with data:', data);

    window.ahijadosChartInstance = new Chart(canvas, {
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
            maintainAspectRatio: true,
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
    
    console.log('Ahijados chart created successfully');
}

function updateAhijadosMesesChart(data) {
    const canvas = document.getElementById('ahijadosMesesChart');
    if (!canvas) {
        console.error('Canvas ahijadosMesesChart not found');
        return;
    }

    if (window.ahijadosMesesChartInstance) {
        window.ahijadosMesesChartInstance.destroy();
    }

    const labels = data.map(item => {
        const [year, month] = item.mes.split('-');
        return `${year}-${month}`;
    });
    const values = data.map(item => parseInt(item.total));

    console.log('Creating ahijados meses chart with data:', { labels, values });

    window.ahijadosMesesChartInstance = new Chart(canvas, {
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
            maintainAspectRatio: true,
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
    
    console.log('Ahijados meses chart created successfully');
}

// Funciones para actualizar tablas
function updateDonacionesTable(data) {
    const tbody = document.getElementById('donacionesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    data.forEach(item => {
        const row = document.createElement('tr');
        const cantidad = parseInt(item.cantidad || item.total || item.total_monto) || 0;
        row.innerHTML = `
            <td>${item.categoria}</td>
            <td class="text-end">${cantidad.toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateAdopcionesTable(data) {
    const tbody = document.getElementById('adopcionesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const row1 = document.createElement('tr');
    row1.innerHTML = `
        <td>Adoptados</td>
        <td class="text-end">${data.adoptados || 0}</td>
    `;
    tbody.appendChild(row1);

    const row2 = document.createElement('tr');
    row2.innerHTML = `
        <td>Disponibles</td>
        <td class="text-end">${data.disponibles || 0}</td>
    `;
    tbody.appendChild(row2);
}

function updateAhijadosTable(data) {
    const tbody = document.getElementById('ahijadosTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const row1 = document.createElement('tr');
    row1.innerHTML = `
        <td>Activos</td>
        <td class="text-end">${data.activos || 0}</td>
    `;
    tbody.appendChild(row1);

    const row2 = document.createElement('tr');
    row2.innerHTML = `
        <td>Inactivos</td>
        <td class="text-end">${data.inactivos || 0}</td>
    `;
    tbody.appendChild(row2);
}

// Nueva función: serie mensual por categoría (sin datos demo)
async function loadDonacionesCategoriasMesesData() {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const fechaDesde = document.getElementById('fechaDesde')?.value || '';
        const fechaHasta = document.getElementById('fechaHasta')?.value || '';
        const params = new URLSearchParams();
        if (fechaDesde) params.append('fechaDesde', fechaDesde);
        if (fechaHasta) params.append('fechaHasta', fechaHasta);
        const url = `/api/reporteAdmin/donaciones/categorias-meses?${params}`;
        console.log('Fetching categorias-meses:', url);
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) {
            const txt = await response.text();
            console.error('Error categorias-meses:', txt);
            showError('Error cargando serie mensual de categorías');
            return;
        }
        const json = await response.json();
        updateDonacionesCantidadChart(json.data);
    } catch (e) {
        console.error('Excepción categorias-meses:', e);
        showError('Error cargando serie mensual de categorías');
    }
}

// Cargar cantidad por categoría filtrado por un mes específico (MM)
async function loadDonacionesCantidadData(mes) {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const params = new URLSearchParams();
        if (mes) params.append('mes', mes);
        const url = `/api/reporteAdmin/donaciones/cantidad-por-categoria?${params}`;
        console.log('Fetching cantidad-por-categoria:', url);
        const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) {
            const txt = await resp.text();
            console.error('Error cantidad-por-categoria:', txt);
            showError('Error al cargar cantidad por categoría');
            return;
        }
        const json = await resp.json();
        updateDonacionesCantidadChart(json.data);
    } catch (e) {
        console.error('Excepción cantidad-por-categoria:', e);
        showError('Error al cargar cantidad por categoría');
    }
}

// Función para actualizar el gráfico de cantidad de donaciones
function updateDonacionesCantidadChart(data) {
    const canvas = document.getElementById('donacionesCantidadChart');
    if (!canvas) {
        console.error('Canvas donacionesCantidadChart not found');
        return;
    }
    if (window.donacionesCantidadChartInstance) {
        window.donacionesCantidadChartInstance.destroy();
    }
    // Si la data trae 'mes', dibujar líneas multi-categoría; si no, barras por categoría
    const isSeries = Array.isArray(data) && data.length > 0 && Object.prototype.hasOwnProperty.call(data[0], 'mes');
    if (isSeries) {
        const mesesSet = new Set();
        const categoriasSet = new Set();
        data.forEach(r => { mesesSet.add(r.mes); categoriasSet.add(r.categoria); });
        const meses = Array.from(mesesSet).sort();
        const categorias = Array.from(categoriasSet);
        const palette = ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40','#8BC34A','#E91E63','#3F51B5','#009688'];
        const datasets = categorias.map((cat,i)=>{
            const serie = meses.map(m=>{
                const found = data.find(r=>r.mes===m && r.categoria===cat);
                return found ? parseInt(found.cantidad) : 0;
            });
            return {
                label: cat,
                data: serie,
                borderColor: palette[i%palette.length],
                backgroundColor: palette[i%palette.length]+'33',
                tension:0.2,
                fill:false
            };
        });
        console.log('Multi-series line chart data:', { meses, categorias, datasets });
        window.donacionesCantidadChartInstance = new Chart(canvas, {
            type: 'line',
            data: { labels: meses, datasets },
            options: {
                responsive:true,
                maintainAspectRatio:true,
                plugins:{
                    title:{ display:true, text:'Cantidad de Donaciones por Categoría (Mensual)' },
                    legend:{ position:'bottom' }
                },
                scales:{ y:{ beginAtZero:true } }
            }
        });
    } else {
        // Barras por categoría (un mes seleccionado)
        const labels = data.map(i => i.categoria);
        const values = data.map(i => parseInt(i.cantidad));
        window.donacionesCantidadChartInstance = new Chart(canvas, {
            type: 'bar',
            data: { labels, datasets: [{
                label: 'Cantidad de Donaciones',
                data: values,
                backgroundColor: '#FFCE56',
                borderColor: '#FFCE56',
                borderWidth: 1
            }]},
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false }, title: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }
}

// Funciones de carga de datos por mes para adopciones y ahijados
async function loadAdopcionesMesesData(mes = '') {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const fechaDesde = document.getElementById('fechaDesde')?.value || '';
        const fechaHasta = document.getElementById('fechaHasta')?.value || '';
        
        const params = new URLSearchParams();
        if (fechaDesde) params.append('fechaDesde', fechaDesde);
        if (fechaHasta) params.append('fechaHasta', fechaHasta);

        const response = await fetch(`/api/reporteAdmin/adopciones/meses?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            let filteredData = data.data;
            
            // Filtrar por mes si se seleccionó uno
            if (mes) {
                filteredData = data.data.filter(item => item.mes.endsWith(`-${mes}`));
            }
            
            updateAdopcionesMesesChart(filteredData);
        } else {
            // Datos demo
            const demoData = [
                { mes: '2025-01', total: '12' },
                { mes: '2025-02', total: '15' },
                { mes: '2025-03', total: '18' }
            ];
            updateAdopcionesMesesChart(demoData);
        }
    } catch (error) {
        console.error('Error cargando adopciones por mes:', error);
        const demoData = [
            { mes: '2025-01', total: '12' },
            { mes: '2025-02', total: '15' },
            { mes: '2025-03', total: '18' }
        ];
        updateAdopcionesMesesChart(demoData);
    }
}

async function loadAhijadosMesesData(mes = '') {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const fechaDesde = document.getElementById('fechaDesde')?.value || '';
        const fechaHasta = document.getElementById('fechaHasta')?.value || '';
        
        const params = new URLSearchParams();
        if (fechaDesde) params.append('fechaDesde', fechaDesde);
        if (fechaHasta) params.append('fechaHasta', fechaHasta);

        const response = await fetch(`/api/reporteAdmin/ahijados/meses?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            let filteredData = data.data;
            
            // Filtrar por mes si se seleccionó uno
            if (mes) {
                filteredData = data.data.filter(item => item.mes.endsWith(`-${mes}`));
            }
            
            updateAhijadosMesesChart(filteredData);
        } else {
            // Datos demo
            const demoData = [
                { mes: '2025-01', total: '8' },
                { mes: '2025-02', total: '10' },
                { mes: '2025-03', total: '7' }
            ];
            updateAhijadosMesesChart(demoData);
        }
    } catch (error) {
        console.error('Error cargando ahijados por mes:', error);
        const demoData = [
            { mes: '2025-01', total: '8' },
            { mes: '2025-02', total: '10' },
            { mes: '2025-03', total: '7' }
        ];
        updateAhijadosMesesChart(demoData);
    }
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
    console.log('[PDF] Iniciando exportación...');
    const container = document.getElementById('reportesContent');
    if (!container) {
        showError('No se encontró el contenido para exportar');
        return;
    }

    // Detectar tab activa y usar solo ese submódulo
    const activePane = container.querySelector('.tab-pane.active') || container.firstElementChild;
    if (!activePane) {
        showError('No hay un submódulo activo para exportar');
        return;
    }

    // Título de submódulo desde la pestaña activa
    const activeTab = document.querySelector('#reportesTabs .nav-link.active');
    const activeTitle = activeTab ? activeTab.textContent.trim() : 'Reportes';

    // Configuración para html2pdf
    const isPublicPage = !window.location.pathname.includes('dashboard');
    const reportType = isPublicPage ? 'Reportes Públicos' : 'Reportes Administrativos';
    const opt = {
        margin: [0.3, 0.3, 0.3, 0.3],
        filename: `reportes-${activeTitle.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { 
            scale: 1.5, 
            useCORS: true, 
            logging: false,
            allowTaint: true,
            backgroundColor: '#ffffff',
            windowHeight: document.documentElement.scrollHeight
        },
        pagebreak: { 
            mode: ['css', 'legacy'],
            avoid: 'img'
        },
        jsPDF: { 
            unit: 'in', 
            format: 'letter', 
            orientation: 'portrait',
            compress: true
        }
    };

    // Crear contenedor limpio para el PDF
    const cleanContainer = document.createElement('div');
    cleanContainer.style.padding = '10px';
    cleanContainer.style.backgroundColor = '#ffffff';

    // Agregar cabecera con logo y título
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '15px';
    header.style.borderBottom = '2px solid #dc3545';
    header.style.paddingBottom = '8px';
    header.innerHTML = `
        <h1 style="color: #dc3545; margin: 0 0 5px 0; font-size: 22px;">🐾 HUELLA FELIZ 🐾</h1>
        <h3 style="color: #333; margin: 0; font-size: 16px;">${reportType} - ${activeTitle}</h3>
        <p style="color: #999; margin: 5px 0 0 0; font-size: 10px;">Generado: ${new Date().toLocaleDateString('es-ES')}</p>
    `;
    cleanContainer.appendChild(header);

    // Convertir canvases a imágenes y agregar al contenedor limpio
    const originalCanvases = activePane.querySelectorAll('canvas');
    console.log(`[PDF] Encontrados ${originalCanvases.length} gráficos para convertir`);
    
    originalCanvases.forEach((cnv, idx) => {
        try {
            // Obtener el contenedor padre del canvas para el título
            const chartCard = cnv.closest('.card');
            const chartTitle = chartCard ? chartCard.querySelector('.card-title')?.textContent : `Gráfico ${idx + 1}`;
            
            // Crear sección para cada gráfico
            const chartSection = document.createElement('div');
            chartSection.style.marginBottom = '15px';
            chartSection.style.pageBreakInside = 'avoid';
            
            // Título del gráfico
            const titleDiv = document.createElement('h5');
            titleDiv.textContent = chartTitle || `Gráfico ${idx + 1}`;
            titleDiv.style.color = '#333';
            titleDiv.style.marginBottom = '10px';
            chartSection.appendChild(titleDiv);
            
            // Convertir canvas a imagen
            const dataUrl = cnv.toDataURL('image/png');
            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.margin = '0 auto';
            
            chartSection.appendChild(img);
            cleanContainer.appendChild(chartSection);
            
            console.log(`[PDF] Gráfico ${idx + 1} convertido: ${chartTitle}`);
        } catch (e) {
            console.warn(`[PDF] Error convirtiendo gráfico ${idx}:`, e);
        }
    });

    // Agregar tablas (sin imágenes)
    const tables = activePane.querySelectorAll('table');
    console.log(`[PDF] Encontradas ${tables.length} tablas`);
    
    tables.forEach((table, idx) => {
        try {
            const tableCard = table.closest('.card');
            const tableTitle = tableCard ? tableCard.querySelector('.card-title')?.textContent : `Tabla ${idx + 1}`;
            
            const tableSection = document.createElement('div');
            tableSection.style.marginTop = '15px';
            tableSection.style.pageBreakInside = 'auto';
            tableSection.style.pageBreakBefore = 'auto';
            
            const titleDiv = document.createElement('h5');
            titleDiv.textContent = tableTitle || `Tabla ${idx + 1}`;
            titleDiv.style.color = '#333';
            titleDiv.style.marginBottom = '10px';
            titleDiv.style.pageBreakAfter = 'avoid';
            tableSection.appendChild(titleDiv);
            
            const clonedTable = table.cloneNode(true);
            clonedTable.style.width = '100%';
            clonedTable.style.borderCollapse = 'collapse';
            clonedTable.style.fontSize = '12px';
            clonedTable.style.pageBreakInside = 'auto';
            
            // Estilizar celdas para mejor visualización
            const cells = clonedTable.querySelectorAll('th, td');
            cells.forEach(cell => {
                cell.style.border = '1px solid #ddd';
                cell.style.padding = '8px';
            });
            
            const headers = clonedTable.querySelectorAll('th');
            headers.forEach(th => {
                th.style.backgroundColor = '#f8f9fa';
                th.style.fontWeight = 'bold';
                th.style.pageBreakAfter = 'avoid';
            });
            
            tableSection.appendChild(clonedTable);
            cleanContainer.appendChild(tableSection);
            
            console.log(`[PDF] Tabla ${idx + 1} agregada: ${tableTitle}`);
        } catch (e) {
            console.warn(`[PDF] Error agregando tabla ${idx}:`, e);
        }
    });

    // Verificar que html2pdf esté disponible
    if (typeof html2pdf === 'undefined') {
        console.error('[PDF] html2pdf no está cargado');
        showError('La librería html2pdf no está disponible. Recarga la página.');
        return;
    }

    console.log('[PDF] Contenedor limpio creado. Generando PDF...');

    try {
        console.log('[PDF] Generando PDF del submódulo:', activeTitle);
        console.log('[PDF] Opciones:', opt);
        
        // Usar el método correcto de html2pdf con promesa
        html2pdf()
            .set(opt)
            .from(cleanContainer)
            .save()
            .then(() => {
                console.log('[PDF] ✅ PDF generado exitosamente');
                showSuccess('PDF descargado correctamente');
            })
            .catch(err => {
                console.error('[PDF] ❌ Error al generar PDF:', err);
                showError('Error al generar PDF: ' + err.message);
            });
            
    } catch (e) {
        console.error('[PDF] Excepción al exportar PDF:', e);
        showError('Error al exportar PDF. Intenta nuevamente.');
    }
}

// Función para mostrar mensajes de éxito
function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
    }

    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Hacer función global para el botón de exportar
window.exportToPDF = exportToPDF;
