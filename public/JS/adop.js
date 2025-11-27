document.addEventListener("DOMContentLoaded", async () => {

    /* ========================================================
     * CONFIGURACIÓN GLOBAL
     * ======================================================== */
    // ÚNICA BASE URL UTILIZADA (COINCIDE CON EL BACKEND /api/adoptions)
    const API_BASE_URL = window.location.origin + '/api/adoptions'; 
    const authToken = localStorage.getItem('authToken');

    const headersAuth = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
    };

    /* ========================================================
     * FUNCIONES DE INTERFAZ DE USUARIO
     * ======================================================== */
    
    function mostrarMensaje(mensaje, esError = false) {
        console.log(`[MENSAJE] ${esError ? 'ERROR: ' : 'INFO: '} ${mensaje}`);
        alert(mensaje);
    }

    async function confirmarAccion(mensaje) {
        return window.confirm(mensaje);
    }

    /* ========================================================
     * 8. BÚSQUEDA DE ANIMAL Y PERSONA (ADMIN)
     * ======================================================== */

    /**
     * Realiza la llamada a la API para buscar animales o personas.
     * @param {string} queryType - 'animalName' o 'personName'.
     * @param {string} searchValue - Valor a buscar.
     */
    async function buscarRecursos(queryType, searchValue) {
        if (!searchValue) {
            mostrarMensaje(`Por favor, ingrese un valor para buscar ${queryType.includes('animal') ? 'un animal' : 'una persona'}.`, true);
            return null;
        }

        try {
            // Llama a /api/adoptions/buscar
            const params = new URLSearchParams({ [queryType]: searchValue }).toString();
            const res = await fetch(`${API_BASE_URL}/buscar?${params}`, { 
                headers: headersAuth
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Error desconocido en la búsqueda");

            return data.data;

        } catch (err) {
            console.error("Error en la búsqueda:", err);
            mostrarMensaje("Error al buscar recursos: " + err.message, true);
            return null;
        }
    }

    /** Maneja la búsqueda y selección de la Persona/Solicitante. */
    async function manejarBusquedaPersona() {
        const searchInput = document.getElementById("inputPersonaSearch");
        const selectedDisplay = document.getElementById("nombrePersonaSeleccionada");
        const idInput = document.getElementById("idUsuario");
        const previewDiv = document.getElementById("previewPersona");
        const searchValue = searchInput.value.trim();

        console.log("\n🔍 === BÚSQUEDA DE PERSONA ===");
        console.log("Buscando:", searchValue);

        const resultados = await buscarRecursos('personName', searchValue);
        
        console.log("📦 Resultados completos del API:", resultados);
        
        // Limpiar campos
        selectedDisplay.value = "Selección Pendiente";
        idInput.value = "";
        previewDiv.textContent = "Esperando datos de contacto...";

        if (!resultados || resultados.personas.length === 0) {
            console.log("❌ No se encontraron personas");
            mostrarMensaje(`No se encontraron personas para '${searchValue}'.`, true);
            return;
        }

        console.log(`✅ Se encontraron ${resultados.personas.length} persona(s)`);
        console.log("📋 Primera persona:", resultados.personas[0]);

        if (resultados.personas.length === 1) {
            const persona = resultados.personas[0];
            const nombreCompleto = `${persona.nombres} ${persona.apepaterno} ${persona.apematerno}`;
            
            console.log("👤 Datos de la persona seleccionada:");
            console.log("   - ID Usuario:", persona.idusuario);
            console.log("   - Nombre completo:", nombreCompleto);
            console.log("   - DNI:", persona.dni);
            
            selectedDisplay.value = nombreCompleto;
            idInput.value = persona.idusuario;
            previewDiv.textContent = `${nombreCompleto} | DNI: ${persona.dni} | Tel: ${persona.numerousuario}`;
            
            console.log("✅ Campo idUsuario actualizado a:", idInput.value);
            console.log("✅ Verificación - valor del campo:", document.getElementById("idUsuario").value);
            
            mostrarMensaje(`Persona '${nombreCompleto}' seleccionada.`, false);
        } else {
            console.log("⚠️ Múltiples resultados - necesita modal de selección");
            console.log("Personas encontradas:", resultados.personas);
            mostrarMensaje(`Se encontraron ${resultados.personas.length} resultados para personas. Por favor, seleccione uno en el modal de resultados.`, false);
            // Aquí se debería abrir un modal para elegir entre 'resultados.personas'
        }
    }

    /** Maneja la búsqueda y selección del Animal. */
    async function manejarBusquedaAnimal() {
        const searchInput = document.getElementById("inputAnimalSearch");
        const selectedDisplay = document.getElementById("nombreAnimalSeleccionado");
        const idInput = document.getElementById("idAnimalSeleccionado");
        const previewDiv = document.getElementById("previewAnimal");
        const searchValue = searchInput.value.trim();

        const resultados = await buscarRecursos('animalName', searchValue);

        selectedDisplay.value = "Selección Pendiente";
        idInput.value = "";
        previewDiv.textContent = "Esperando datos del animal...";

        if (!resultados || resultados.animales.length === 0) {
            mostrarMensaje(`No se encontraron animales para '${searchValue}'.`, true);
            return;
        }

        if (resultados.animales.length === 1) {
            const animal = resultados.animales[0];
            const nombreDisplay = `${animal.nombreanimal} (${animal.especieanimal}/${animal.razaanimal})`;
            selectedDisplay.value = nombreDisplay;
            idInput.value = animal.idanimal;
            
            const edad = animal.edadmesesanimal > 12 
                         ? `${Math.floor(animal.edadmesesanimal / 12)} años` 
                         : `${animal.edadmesesanimal} meses`;
            
            previewDiv.textContent = `${animal.nombreanimal} | Especie: ${animal.especieanimal} | Edad: ${edad}`;
            mostrarMensaje(`Animal '${nombreDisplay}' seleccionado.`, false);
        } else {
            console.log("Múltiples resultados de animales. Mostrar modal de selección:", resultados.animales);
            mostrarMensaje(`Se encontraron ${resultados.animales.length} resultados para animales. Por favor, seleccione uno en el modal de resultados.`, false);
            // Aquí se debería abrir un modal para elegir entre 'resultados.animales'
        }
    }

    /* ========================================================
     * 1. CARGAR MIS SOLICITUDES / ADOPCIONES
     * ======================================================== */
    async function cargarMisAdopciones() {
        try {
            // Llama a /api/adoptions/mine
            const res = await fetch(`${API_BASE_URL}/mine`, { headers: headersAuth });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Error desconocido al cargar");
            renderMisAdopciones(data.data);
        } catch (err) {
            console.error("Error cargando mis solicitudes:", err);
            mostrarMensaje("No se pudieron cargar tus solicitudes/adopciones. " + err.message, true);
        }
    }

    function renderMisAdopciones(lista) {
        const contenedor = document.getElementById("misSolicitudes");
        if (!contenedor) return;

        contenedor.innerHTML = lista.length === 0 
            ? '<p class="text-center text-gray-500">Aún no has registrado ninguna solicitud de adopción.</p>'
            : lista.map(item => `
                <div class="card p-4 my-2 border rounded shadow-sm bg-white">
                    <h4 class="font-bold text-lg">${item.nombreanimal}</h4>
                    <p><b>ID Solicitud:</b> ${item.idsolicitudadopcion}</p>
                    <p><b>Fecha Solicitud:</b> ${item.fechasolicitud || '-'}</p>
                    <p><b>Estado:</b> <span class="font-semibold text-blue-600">${item.estadosolicitud}</span></p>
                    <p><b>Motivo:</b> ${item.motivosolicitud}</p>
                    <p><b>Observaciones:</b> ${item.observaciones || 'N/A'}</p>

                    ${
                        item.idadopcion
                        ? `<div class="mt-2 p-2 bg-green-100 border-l-4 border-green-500">
                            <b>Adopción registrada el:</b> ${item.fechaadopcion}<br>
                            </div>`
                        : `<i class="text-gray-500">Aún sin adopción aprobada</i>`
                    }
                </div>
            `).join('');
    }

    /* ========================================================
     * 2. REGISTRAR SOLICITUD
     * ======================================================== */
    async function registrarSolicitud(event) {
        event.preventDefault();
        
        const motivo = document.getElementById("motivo").value;
        const idAnimal = document.getElementById("idAnimalSeleccionado")?.value;
        const idUsuario = document.getElementById("idUsuario")?.value;

        console.log("\n=== REGISTRO DE SOLICITUD ===");
        console.log("📋 Motivo:", motivo);
        console.log("🐾 ID Animal:", idAnimal);
        console.log("👤 ID Usuario (persona):", idUsuario);
        console.log("⚠️ Si idUsuario está vacío, se usará TU ID de administrador");

        if (!motivo || !idAnimal) {
            mostrarMensaje("Por favor, completa el motivo de la solicitud y selecciona un Animal.", true);
            return;
        }

        if (!idUsuario) {
            mostrarMensaje("⚠️ DEBES BUSCAR Y SELECCIONAR UNA PERSONA antes de registrar la solicitud. Usa el botón de búsqueda.", true);
            return;
        }

        const bodyData = {
            motivoSolicitud: motivo,
            idAnimal: parseInt(idAnimal),
            idUsuario: parseInt(idUsuario)
        };

        console.log("📤 Enviando al servidor:", bodyData);

        try {
            const res = await fetch(`${API_BASE_URL}/registrar_solicitud`, {
                method: "POST",
                headers: headersAuth,
                body: JSON.stringify(bodyData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Error desconocido");

            mostrarMensaje("✅ Solicitud registrada correctamente");
            
            // Cerrar modal y limpiar formulario
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalRegistrar'));
            modal.hide();
            document.getElementById("formRegistrar").reset();
            
            // Limpiar campos de persona
            document.getElementById("nombrePersonaSeleccionada").value = "Selección Pendiente";
            document.getElementById("idUsuario").value = "";
            document.getElementById("previewPersona").textContent = "Esperando datos de contacto...";
            
            // Limpiar campos de animal
            document.getElementById("nombreAnimalSeleccionado").value = "Selección Pendiente";
            document.getElementById("idAnimalSeleccionado").value = "";
            document.getElementById("previewAnimal").textContent = "Esperando datos del animal...";
            
            // Recargar tabla de solicitudes
            listarSolicitudes();
        } catch (err) {
            console.error("Error registrando solicitud:", err);
            mostrarMensaje("❌ Error al registrar solicitud: " + err.message, true);
        }
    }

    /* ========================================================
     * 3. CAMBIAR ESTADO DE SOLICITUD (ADMIN)
     * ======================================================== */
    async function cambiarEstadoSolicitud(idSolicitud, nuevoEstado) {
        let observaciones = null;
        
        console.log("🔄 Iniciando cambio de estado:", idSolicitud, "→", nuevoEstado);
        
        // Si se va a rechazar, solicitar observaciones
        if (nuevoEstado === 'RECHAZADA') {
            observaciones = prompt('Ingrese el motivo del rechazo:');
            if (!observaciones || observaciones.trim() === '') {
                mostrarMensaje('Debe ingresar un motivo para rechazar la solicitud.', true);
                return;
            }
        }
        
        if (!await confirmarAccion(`¿Seguro de cambiar el estado de la solicitud #${idSolicitud} a ${nuevoEstado}?`)) return;
        
        try {
            const body = { estadoSolicitud: nuevoEstado.toUpperCase() };
            if (observaciones) {
                body.observaciones = observaciones.trim();
            }
            
            console.log("📤 Enviando:", body);
            
            const res = await fetch(`${API_BASE_URL}/estado_solicitud/${idSolicitud}`, {
                method: "PUT",
                headers: headersAuth,
                body: JSON.stringify(body)
            });

            const data = await res.json();
            
            console.log("📥 Respuesta:", data);
            
            if (!res.ok) throw new Error(data.message || "Error desconocido");

            mostrarMensaje(`✅ Estado actualizado a ${nuevoEstado}`);
            listarSolicitudes(); 
        } catch (err) {
            console.error("❌ Error al cambiar estado:", err);
            mostrarMensaje("❌ Error al cambiar estado: " + err.message, true);
        }
    }

    /* ========================================================
     * 4. REGISTRAR ADOPCIÓN (ADMIN)
     * ======================================================== */
    async function registrarAdopcion(idSolicitud) {
        const contrato = document.getElementById("contrato")?.value;
        const condiciones = document.getElementById("condiciones")?.value;

        if (!contrato || !condiciones) {
            mostrarMensaje("Debes completar los detalles del contrato y las condiciones para registrar la adopción.", true);
            return;
        }

        if (!await confirmarAccion(`¿Confirmas registrar la adopción final para la solicitud #${idSolicitud}?`)) return;

        try {
            // Llama a /api/adoptions/registrar_adopcion/:idSolicitud
            const res = await fetch(`${API_BASE_URL}/registrar_adopcion/${idSolicitud}`, {
                method: "POST",
                headers: headersAuth,
                body: JSON.stringify({ contratoAdopcion: contrato, condiciones })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Error desconocido");

            mostrarMensaje(`Adopción registrada correctamente para la solicitud #${idSolicitud}.`);
            listarSolicitudes(); 
        } catch (err) {
            console.error("Error registrando adopción:", err);
            mostrarMensaje("Error al registrar adopción: " + err.message, true);
        }
    }

    /* ========================================================
     * 5. LISTAR TODAS LAS SOLICITUDES (ADMIN)
     * ======================================================== */
    async function listarSolicitudes() {
        try {
            // Obtener valores de filtros
            const persona = document.getElementById('filtroPersonaSolicitud')?.value || '';
            const animal = document.getElementById('filtroAnimalSolicitud')?.value || '';
            const fecha = document.getElementById('filtroFechaSolicitud')?.value || '';
            
            // Construir query params
            const params = new URLSearchParams();
            if (persona) params.append('persona', persona);
            if (animal) params.append('animal', animal);
            if (fecha) params.append('fecha', fecha);
            
            const queryString = params.toString() ? `?${params.toString()}` : '';
            
            const res = await fetch(`${API_BASE_URL}/solicitud${queryString}`, { headers: headersAuth });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.message || "Error desconocido");
            
            console.log("📋 Solicitudes cargadas:", data.data);
            renderSolicitudes(data.data);
        } catch (err) {
            console.error("❌ Error cargando solicitudes:", err);
            mostrarMensaje("Error cargando solicitudes: " + err.message, true);
        }
    }

    function renderSolicitudes(lista) {
        const tbody = document.getElementById("tablaSolicitudes");
        if (!tbody) {
            console.error("❌ No se encontró elemento tablaSolicitudes");
            return;
        }

        console.log("🔄 Renderizando", lista.length, "solicitudes");
        if (lista.length > 0) {
            console.log("📋 Ejemplo de datos:", lista[0]);
            console.log("📋 Keys disponibles:", Object.keys(lista[0]));
        }

        if (lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay solicitudes registradas</td></tr>';
            return;
        }

        tbody.innerHTML = lista.map((item, index) => {
            const estado = (item.estadosolicitud || 'PENDIENTE').toUpperCase();
            const rowId = `solicitud-${item.idsolicitudadopcion}`;
            let estadoClass = 'badge bg-secondary';
            let botones = '';
            
            console.log(`Fila ${index}: Estado="${estado}", ID=${item.idsolicitudadopcion}, Persona="${item.nombreusuario}"`);
            
            // Colores y botones según estado
            if (estado === 'PENDIENTE') {
                estadoClass = 'badge bg-warning text-dark';
                botones = `
                    <button class="btn btn-sm btn-info me-1 btn-ver" data-id="${item.idsolicitudadopcion}" style="display: inline-block;">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm btn-success me-1 btn-aceptar" data-id="${item.idsolicitudadopcion}" style="display: inline-block;">
                        <i class="bi bi-check-circle"></i> Aceptar
                    </button>
                    <button class="btn btn-sm btn-danger btn-rechazar" data-id="${item.idsolicitudadopcion}" style="display: inline-block;">
                        <i class="bi bi-x-circle"></i> Rechazar
                    </button>
                `;
            } else if (estado === 'EN_REVISION') {
                estadoClass = 'badge bg-info';
                botones = `
                    <button class="btn btn-sm btn-info me-1 btn-ver" data-id="${item.idsolicitudadopcion}" style="display: inline-block;">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm btn-success me-1 btn-aceptar" data-id="${item.idsolicitudadopcion}" style="display: inline-block;">
                        <i class="bi bi-check-circle"></i> Aceptar
                    </button>
                    <button class="btn btn-sm btn-danger btn-rechazar" data-id="${item.idsolicitudadopcion}" style="display: inline-block;">
                        <i class="bi bi-x-circle"></i> Rechazar
                    </button>
                `;
            } else if (estado === 'ACEPTADA') {
                estadoClass = 'badge bg-success';
                botones = `
                    <button class="btn btn-sm btn-info me-1 btn-ver" data-id="${item.idsolicitudadopcion}" style="display: inline-block;">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm btn-primary btn-adopcion" data-id="${item.idsolicitudadopcion}" style="display: inline-block;">
                        <i class="bi bi-heart-fill"></i> Adopción
                    </button>
                `;
            } else if (estado === 'RECHAZADA') {
                estadoClass = 'badge bg-danger';
                botones = `
                    <button class="btn btn-sm btn-info btn-ver" data-id="${item.idsolicitudadopcion}" style="display: inline-block;">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                `;
            }
            
            return `
                <tr id="${rowId}">
                    <td>${item.idsolicitudadopcion}</td>
                    <td>${item.nombreusuario || 'Sin usuario'}</td>
                    <td>${item.nombreanimal || 'Sin animal'}</td>
                    <td>${item.f_solicitud ? new Date(item.f_solicitud).toLocaleDateString('es-PE') : 'N/A'}</td>
                    <td><span class="${estadoClass}">${estado}</span></td>
                    <td class="text-nowrap" style="min-width: 200px;">${botones}</td>
                </tr>
            `;
        }).join('');

        console.log("✅ HTML generado, agregando event listeners...");

        // Agregar event listeners a los botones
        document.querySelectorAll('.btn-ver').forEach(btn => {
            btn.addEventListener('click', () => {
                console.log("👁️ Ver solicitud:", btn.dataset.id);
                verDetalleSolicitud(parseInt(btn.dataset.id));
            });
        });
        
        document.querySelectorAll('.btn-aceptar').forEach(btn => {
            btn.addEventListener('click', () => {
                console.log("✅ Aceptar solicitud:", btn.dataset.id);
                cambiarEstadoSolicitud(parseInt(btn.dataset.id), 'ACEPTADA');
            });
        });
        
        document.querySelectorAll('.btn-rechazar').forEach(btn => {
            btn.addEventListener('click', () => {
                console.log("❌ Rechazar solicitud:", btn.dataset.id);
                cambiarEstadoSolicitud(parseInt(btn.dataset.id), 'RECHAZADA');
            });
        });
        
        document.querySelectorAll('.btn-adopcion').forEach(btn => {
            btn.addEventListener('click', () => {
                console.log("💚 Registrar adopción:", btn.dataset.id);
                registrarAdopcionDirecta(parseInt(btn.dataset.id));
            });
        });

        console.log("✅ Event listeners agregados correctamente");
    }

    /* ========================================================
     * 6. LISTAR ADOPCIONES (ADMIN)
     * ======================================================== */
    async function listarAdopciones() {
        try {
            const res = await fetch(`${API_BASE_URL}/`, { headers: headersAuth });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.message || "Error desconocido");
            
            console.log("💚 Adopciones cargadas:", data.data);
            renderAdopciones(data.data);
        } catch (err) {
            console.error("❌ Error cargando adopciones:", err);
            mostrarMensaje("Error cargando adopciones: " + err.message, true);
        }
    }

    function renderAdopciones(lista) {
        const tbody = document.getElementById("tablaAdopciones");
        if (!tbody) {
            console.error("❌ No se encontró elemento tablaAdopciones");
            return;
        }

        console.log("🔄 Renderizando", lista.length, "adopciones");

        if (lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay adopciones registradas</td></tr>';
            return;
        }

        tbody.innerHTML = lista.map(item => `
            <tr>
                <td>${item.idadopcion}</td>
                <td>${item.nombreanimal || 'N/A'}</td>
                <td>${item.f_adopcion ? new Date(item.f_adopcion).toLocaleDateString('es-PE') : 'N/A'}</td>
                <td>${item.nombreusuario || 'Sin datos'}</td>
                <td>
                    <button class="btn btn-sm btn-info btn-ver-adopcion" data-id="${item.idadopcion}">
                        <i class="bi bi-eye"></i> Ver detalles
                    </button>
                </td>
            </tr>
        `).join('');

        // Agregar event listeners a los botones de adopción
        document.querySelectorAll('.btn-ver-adopcion').forEach(btn => {
            btn.addEventListener('click', () => verDetalleAdopcion(parseInt(btn.dataset.id)));
        });
    }

    /* ========================================================
     * 7. ELIMINAR SOLICITUD
     * ======================================================== */
    async function eliminarSolicitud(idSolicitud) {
        if (!await confirmarAccion(`¿Seguro de eliminar la solicitud #${idSolicitud}?`)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/solicitud/${idSolicitud}`, { method: "DELETE", headers: headersAuth });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Error desconocido");

            mostrarMensaje(`Solicitud #${idSolicitud} eliminada correctamente.`);
            listarSolicitudes();
        } catch (err) {
            console.error("Error al eliminar solicitud:", err);
            mostrarMensaje("Error al eliminar solicitud: " + err.message, true);
        }
    }

    /* ========================================================
     * 8. VER DETALLE DE SOLICITUD
     * ======================================================== */
    async function verDetalleSolicitud(idSolicitud) {
        try {
            const res = await fetch(`${API_BASE_URL}/solicitud`, { headers: headersAuth });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Error desconocido");
            
            const solicitud = data.data.find(s => s.idsolicitudadopcion === idSolicitud);
            if (!solicitud) {
                mostrarMensaje("No se encontró la solicitud", true);
                return;
            }

            const modalBody = document.getElementById("detalleSolicitudBody");
            modalBody.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="text-primary"><i class="bi bi-file-text"></i> Información de Solicitud</h6>
                        <p><strong>ID:</strong> ${solicitud.idsolicitudadopcion}</p>
                        <p><strong>Estado:</strong> <span class="badge bg-${solicitud.estadosolicitud === 'ACEPTADA' ? 'success' : solicitud.estadosolicitud === 'RECHAZADA' ? 'danger' : solicitud.estadosolicitud === 'EN_REVISION' ? 'info' : 'warning'}">${solicitud.estadosolicitud}</span></p>
                        <p><strong>Fecha:</strong> ${solicitud.f_solicitud ? new Date(solicitud.f_solicitud).toLocaleDateString('es-PE') : 'N/A'}</p>
                        <p><strong>Motivo:</strong> ${solicitud.motivosolicitud || 'N/A'}</p>
                        ${solicitud.observaciones ? `<p class="text-danger"><strong>Observaciones:</strong> ${solicitud.observaciones}</p>` : ''}
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-success"><i class="bi bi-heart"></i> Información del Animal</h6>
                        <p><strong>Nombre:</strong> ${solicitud.nombreanimal || 'N/A'}</p>
                        <p><strong>Usuario:</strong> ${solicitud.nombreusuario || 'N/A'}</p>
                    </div>
                </div>
            `;

            const modal = new bootstrap.Modal(document.getElementById('modalVerSolicitud'));
            modal.show();
        } catch (err) {
            console.error("Error al ver detalle:", err);
            mostrarMensaje("Error al cargar detalle: " + err.message, true);
        }
    }

    /* ========================================================
     * 9. VER DETALLE DE ADOPCIÓN
     * ======================================================== */
    async function verDetalleAdopcion(idAdopcion) {
        try {
            const res = await fetch(`${API_BASE_URL}/`, { headers: headersAuth });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Error desconocido");
            
            const adopcion = data.data.find(a => a.idadopcion === idAdopcion);
            if (!adopcion) {
                mostrarMensaje("No se encontró la adopción", true);
                return;
            }

            const modalBody = document.getElementById("detalleAdopcionBody");
            modalBody.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="text-success"><i class="bi bi-heart-fill"></i> Información de Adopción</h6>
                        <p><strong>ID:</strong> ${adopcion.idadopcion}</p>
                        <p><strong>Fecha:</strong> ${adopcion.f_adopcion ? new Date(adopcion.f_adopcion).toLocaleDateString('es-PE') : 'N/A'}</p>
                        <p><strong>Contrato:</strong> ${adopcion.contratoadopcion || 'No especificado'}</p>
                        <p><strong>Condiciones:</strong> ${adopcion.condiciones || 'No especificadas'}</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-primary"><i class="bi bi-person"></i> Adoptante</h6>
                        <p><strong>Nombre:</strong> ${adopcion.nombreusuario || 'N/A'}</p>
                        <h6 class="text-info mt-3"><i class="bi bi-heart"></i> Animal Adoptado</h6>
                        <p><strong>Nombre:</strong> ${adopcion.nombreanimal || 'N/A'}</p>
                    </div>
                </div>
            `;

            const modal = new bootstrap.Modal(document.getElementById('modalVerAdopcion'));
            modal.show();
        } catch (err) {
            console.error("Error al ver detalle:", err);
            mostrarMensaje("Error al cargar detalle: " + err.message, true);
        }
    }

    /* ========================================================
     * 10. REGISTRAR ADOPCIÓN DIRECTA
     * ======================================================== */
    async function registrarAdopcionDirecta(idSolicitud) {
        if (!await confirmarAccion(`¿Confirmas registrar la adopción para la solicitud #${idSolicitud}?`)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/registrar_adopcion/${idSolicitud}`, {
                method: "POST",
                headers: headersAuth,
                body: JSON.stringify({ 
                    contratoAdopcion: "Contrato de adopción estándar",
                    condiciones: "Seguimiento mensual durante 6 meses"
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Error desconocido");

            mostrarMensaje(`✅ Adopción registrada correctamente`);
            listarSolicitudes();
            listarAdopciones();
        } catch (err) {
            console.error("Error registrando adopción:", err);
            mostrarMensaje("❌ Error: " + err.message, true);
        }
    }
    
    // ========================================================
    // EXPONER FUNCIONES GLOBALES
    // ========================================================
    window.mostrarMensaje = mostrarMensaje;
    window.confirmarAccion = confirmarAccion;
    window.registrarSolicitud = registrarSolicitud;
    window.cambiarEstadoSolicitud = cambiarEstadoSolicitud;
    window.registrarAdopcion = registrarAdopcion;
    window.registrarAdopcionDirecta = registrarAdopcionDirecta;
    window.eliminarSolicitud = eliminarSolicitud;
    window.listarSolicitudes = listarSolicitudes;
    window.listarAdopciones = listarAdopciones;
    window.verDetalleSolicitud = verDetalleSolicitud;
    window.verDetalleAdopcion = verDetalleAdopcion;
    
    // EXPONER FUNCIONES DE BÚSQUEDA
    window.manejarBusquedaPersona = manejarBusquedaPersona;
    window.manejarBusquedaAnimal = manejarBusquedaAnimal;


    // ========================================================
    // EVENT LISTENERS
    // ========================================================
    
    // Botón buscar persona
    const btnBuscarPersona = document.getElementById("btnBuscarPersona");
    if (btnBuscarPersona) {
        btnBuscarPersona.addEventListener("click", manejarBusquedaPersona);
    }

    // Botón buscar animal
    const btnBuscarAnimal = document.getElementById("btnBuscarAnimal");
    if (btnBuscarAnimal) {
        btnBuscarAnimal.addEventListener("click", manejarBusquedaAnimal);
    }

    // Formulario de registro
    const formRegistrar = document.getElementById("formRegistrar");
    if (formRegistrar) {
        formRegistrar.addEventListener("submit", registrarSolicitud);
    }

    // Filtros de solicitudes
    const filtroPersonaSolicitud = document.getElementById("filtroPersonaSolicitud");
    const filtroAnimalSolicitud = document.getElementById("filtroAnimalSolicitud");
    const filtroFechaSolicitud = document.getElementById("filtroFechaSolicitud");
    
    if (filtroPersonaSolicitud) {
        filtroPersonaSolicitud.addEventListener("input", () => {
            clearTimeout(filtroPersonaSolicitud.timeout);
            filtroPersonaSolicitud.timeout = setTimeout(listarSolicitudes, 500);
        });
    }
    
    if (filtroAnimalSolicitud) {
        filtroAnimalSolicitud.addEventListener("input", () => {
            clearTimeout(filtroAnimalSolicitud.timeout);
            filtroAnimalSolicitud.timeout = setTimeout(listarSolicitudes, 500);
        });
    }
    
    if (filtroFechaSolicitud) {
        filtroFechaSolicitud.addEventListener("change", listarSolicitudes);
    }

    // Tabs de solicitudes y adopciones
    const solicitudesTab = document.getElementById("solicitudes-tab");
    if (solicitudesTab) {
        solicitudesTab.addEventListener("shown.bs.tab", () => {
            listarSolicitudes();
        });
    }

    const adopcionesTab = document.getElementById("adopciones-tab");
    if (adopcionesTab) {
        adopcionesTab.addEventListener("shown.bs.tab", () => {
            listarAdopciones();
        });
    }

    /* ========================================================
     *  CARGAR DATOS INICIALES
     * ======================================================== */

    // Cargar solicitudes si estamos en la pestaña de solicitudes
    if (document.getElementById("tablaSolicitudes")) {
        listarSolicitudes();
    }

    // Cargar adopciones si estamos en la pestaña de adopciones
    if (document.getElementById("tablaAdopciones")) {
        listarAdopciones();
    }

}); // <-- CIERRE DE DOMContentLoaded
