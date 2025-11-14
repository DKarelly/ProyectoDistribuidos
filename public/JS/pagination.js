// Archivo general para manejar paginación en tablas
// Requiere que las funciones de carga de datos estén definidas en el scope global

class TablePagination {
    constructor(tableId, infoId, paginationId, loadFunction, itemsPerPage = 10) {
        this.tableId = tableId;
        this.infoId = infoId;
        this.paginationId = paginationId;
        this.loadFunction = loadFunction;
        this.itemsPerPage = itemsPerPage;
        this.currentPage = 1;
        this.totalItems = 0;
        this.totalPages = 0;
    }

    // Cargar datos con paginación
    async loadData(page = 1) {
        this.currentPage = page;
        try {
            const response = await this.loadFunction(page, this.itemsPerPage);
            if (response && response.data) {
                this.renderData(response.data);
                if (response.pagination) {
                    this.renderPagination(response.pagination);
                }
            }
        } catch (error) {
            console.error('Error loading paginated data:', error);
        }
    }

    // Renderizar datos (debe ser implementado por cada tabla específica)
    renderData(data) {
        // Implementar en subclase o pasar como callback
        console.warn('renderData method should be implemented');
    }

    // Renderizar controles de paginación
    renderPagination(pagination) {
        const { currentPage, totalPages, totalItems } = pagination;
        this.currentPage = currentPage;
        this.totalPages = totalPages;
        this.totalItems = totalItems;

        const infoElement = document.getElementById(this.infoId);
        const paginationElement = document.getElementById(this.paginationId);

        // Actualizar información
        const start = (currentPage - 1) * this.itemsPerPage + 1;
        const end = Math.min(currentPage * this.itemsPerPage, totalItems);
        infoElement.textContent = `Mostrando ${start} a ${end} de ${totalItems} elementos`;

        // Generar controles de paginación
        paginationElement.innerHTML = '';

        // Botón anterior
        if (currentPage > 1) {
            const prevBtn = document.createElement('li');
            prevBtn.className = 'page-item';
            prevBtn.innerHTML = `<a class="page-link" href="#" onclick="changePage('${this.tableId}', ${currentPage - 1})">Anterior</a>`;
            paginationElement.appendChild(prevBtn);
        }

        // Páginas
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('li');
            pageBtn.className = `page-item ${i === currentPage ? 'active' : ''}`;
            pageBtn.innerHTML = `<a class="page-link" href="#" onclick="changePage('${this.tableId}', ${i})">${i}</a>`;
            paginationElement.appendChild(pageBtn);
        }

        // Botón siguiente
        if (currentPage < totalPages) {
            const nextBtn = document.createElement('li');
            nextBtn.className = 'page-item';
            nextBtn.innerHTML = `<a class="page-link" href="#" onclick="changePage('${this.tableId}', ${currentPage + 1})">Siguiente</a>`;
            paginationElement.appendChild(nextBtn);
        }
    }

    // Cambiar página
    changePage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.loadData(page);
        }
    }
}

// Función global para cambiar página (llamada desde los controles de paginación)
function changePage(tableId, page) {
    const paginationInstance = window.tablePaginations[tableId];
    if (paginationInstance) {
        paginationInstance.changePage(page);
    }
}

// Inicializar paginaciones globales
window.tablePaginations = {};

// Función helper para crear instancia de paginación
function createPagination(tableId, infoId, paginationId, loadFunction, itemsPerPage = 10) {
    const pagination = new TablePagination(tableId, infoId, paginationId, loadFunction, itemsPerPage);
    window.tablePaginations[tableId] = pagination;
    return pagination;
}
