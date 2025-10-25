// ===================================================
// DASHBOARD - ESTADÍSTICAS EN TIEMPO REAL
// ===================================================

// Variables globales
const API_BASE_URL = window.location.origin + '/api';

// Función para hacer peticiones API
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        }
    };

    const authToken = localStorage.getItem('authToken');
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

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard cargado - Cargando estadísticas...');

    // Verificar que el usuario esté autenticado
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        console.error('No hay token de autenticación');
        return;
    }

    try {
        await loadDashboardStats();
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        // Mostrar error en la consola en lugar de usar showMessage
        console.error('Error cargando estadísticas del dashboard');
    }
});

// Cargar estadísticas del dashboard
async function loadDashboardStats() {
    try {
        // Cargar estadísticas en paralelo
        const [usersStats, animalsStats, adoptionsStats, donationsStats] = await Promise.all([
            loadUsersStats(),
            loadAnimalsStats(),
            loadAdoptionsStats(),
            loadDonationsStats()
        ]);

        // Mostrar estadísticas en el dashboard
        displayStats({
            users: usersStats,
            animals: animalsStats,
            adoptions: adoptionsStats,
            donations: donationsStats
        });

    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        throw error;
    }
}

// Estadísticas de usuarios
async function loadUsersStats() {
    try {
        const response = await fetch(window.location.origin + '/api/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) throw new Error('Error cargando usuarios');

        const data = await response.json();
        const users = data.data || [];

        // Contar por roles
        const roleCounts = users.reduce((acc, user) => {
            const role = user.rolusuario || 'Sin rol';
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {});

        return {
            total: users.length,
            byRole: roleCounts,
            recent: users.slice(-5) // Últimos 5 usuarios
        };
    } catch (error) {
        console.error('Error cargando estadísticas de usuarios:', error);
        return { total: 0, byRole: {}, recent: [] };
    }
}

// Estadísticas de animales
async function loadAnimalsStats() {
    try {
        const response = await fetch(window.location.origin + '/api/animals');
        const data = await response.json();
        const animals = data.data || [];

        // Contar por especie
        const speciesCounts = animals.reduce((acc, animal) => {
            const species = animal.especieanimal || 'Sin especie';
            acc[species] = (acc[species] || 0) + 1;
            return acc;
        }, {});

        return {
            total: animals.length,
            bySpecies: speciesCounts,
            available: animals.filter(a => !a.adopted).length
        };
    } catch (error) {
        console.error('Error cargando estadísticas de animales:', error);
        return { total: 0, bySpecies: {}, available: 0 };
    }
}

// Estadísticas de adopciones
async function loadAdoptionsStats() {
    try {
        const response = await fetch(window.location.origin + '/api/adoptions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) throw new Error('Error cargando adopciones');

        const data = await response.json();
        const adoptions = data.data || [];

        // Contar por estado
        const statusCounts = adoptions.reduce((acc, adoption) => {
            const status = adoption.estadoadopcion || 'Sin estado';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        return {
            total: adoptions.length,
            byStatus: statusCounts,
            pending: adoptions.filter(a => a.estadoadopcion === 'Pendiente').length
        };
    } catch (error) {
        console.error('Error cargando estadísticas de adopciones:', error);
        return { total: 0, byStatus: {}, pending: 0 };
    }
}

// Estadísticas de donaciones
async function loadDonationsStats() {
    try {
        const response = await fetch(window.location.origin + '/api/donations/historial', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) throw new Error('Error cargando donaciones');

        const data = await response.json();
        const donations = data.data || [];

        // Calcular totales
        const totalAmount = donations.reduce((sum, donation) => {
            return sum + (parseFloat(donation.cantidaddonacion) || 0);
        }, 0);

        return {
            total: donations.length,
            totalAmount: totalAmount,
            recent: donations.slice(-5) // Últimas 5 donaciones
        };
    } catch (error) {
        console.error('Error cargando estadísticas de donaciones:', error);
        return { total: 0, totalAmount: 0, recent: [] };
    }
}

// Mostrar estadísticas en el dashboard
function displayStats(stats) {
    // Crear sección de estadísticas si no existe
    let statsSection = document.getElementById('dashboard-stats');
    if (!statsSection) {
        statsSection = document.createElement('div');
        statsSection.id = 'dashboard-stats';
        statsSection.className = 'container py-4';

        // Insertar después del título
        const title = document.querySelector('.titulo-dashboard').parentElement;
        title.parentNode.insertBefore(statsSection, title.nextSibling);
    }

    statsSection.innerHTML = `
        <div class="row g-4 mb-5">
            <!-- Estadísticas de Usuarios -->
            <div class="col-12 col-md-6 col-lg-3">
                <div class="card bg-primary text-white">
                    <div class="card-body text-center">
                        <h3 class="card-title">${stats.users.total}</h3>
                        <p class="card-text">Usuarios Registrados</p>
                    </div>
                </div>
            </div>
            
            <!-- Estadísticas de Animales -->
            <div class="col-12 col-md-6 col-lg-3">
                <div class="card bg-success text-white">
                    <div class="card-body text-center">
                        <h3 class="card-title">${stats.animals.total}</h3>
                        <p class="card-text">Animales Registrados</p>
                        <small>${stats.animals.available} disponibles</small>
                    </div>
                </div>
            </div>
            
            <!-- Estadísticas de Adopciones -->
            <div class="col-12 col-md-6 col-lg-3">
                <div class="card bg-warning text-white">
                    <div class="card-body text-center">
                        <h3 class="card-title">${stats.adoptions.total}</h3>
                        <p class="card-text">Solicitudes de Adopción</p>
                        <small>${stats.adoptions.pending} pendientes</small>
                    </div>
                </div>
            </div>
            
            <!-- Estadísticas de Donaciones -->
            <div class="col-12 col-md-6 col-lg-3">
                <div class="card bg-info text-white">
                    <div class="card-body text-center">
                        <h3 class="card-title">$${stats.donations.totalAmount.toFixed(2)}</h3>
                        <p class="card-text">Total Donado</p>
                        <small>${stats.donations.total} donaciones</small>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Gráficos de distribución -->
        <div class="row g-4">
            <div class="col-12 col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5>Usuarios por Rol</h5>
                    </div>
                    <div class="card-body">
                        ${Object.entries(stats.users.byRole).map(([role, count]) =>
        `<div class="d-flex justify-content-between">
                                <span>${role}</span>
                                <span class="badge bg-primary">${count}</span>
                            </div>`
    ).join('')}
                    </div>
                </div>
            </div>
            
            <div class="col-12 col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5>Animales por Especie</h5>
                    </div>
                    <div class="card-body">
                        ${Object.entries(stats.animals.bySpecies).map(([species, count]) =>
        `<div class="d-flex justify-content-between">
                                <span>${species}</span>
                                <span class="badge bg-success">${count}</span>
                            </div>`
    ).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Función para recargar estadísticas
function refreshDashboardStats() {
    loadDashboardStats().catch(error => {
        console.error('Error recargando estadísticas:', error);
    });
}

// Auto-refresh cada 5 minutos
setInterval(refreshDashboardStats, 5 * 60 * 1000);
