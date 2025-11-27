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
            : lista.map(item => {
                // Determinar color según estado
                let estadoClass = 'text-warning';
                let estadoTexto = item.estadosolicitud;
                if (item.estadosolicitud === 'APROBADO') {
                    estadoClass = 'text-success';
                    estadoTexto = 'Aprobado';
                } else if (item.estadosolicitud === 'RECHAZADO') {
                    estadoClass = 'text-danger';
                    estadoTexto = 'Rechazado';
                } else if (item.estadosolicitud === 'EN_REVISION') {
                    estadoClass = 'text-info';
                    estadoTexto = 'En Revisión';
                } else if (item.estadosolicitud === 'PENDIENTE') {
                    estadoClass = 'text-warning';
                    estadoTexto = 'Pendiente';
                }

                return `
                <div class="card p-4 my-2 border rounded shadow-sm bg-white">
                    <h4 class="font-bold text-lg">${item.nombreanimal}</h4>
                    <p><b>ID Solicitud:</b> ${item.idsolicitudadopcion}</p>
                    <p><b>Fecha Solicitud:</b> ${item.fechasolicitud || '-'}</p>
                    <p><b>Estado:</b> <span class="font-semibold ${estadoClass}">${estadoTexto}</span></p>
                    <p><b>Motivo:</b> ${item.motivosolicitud}</p>
                    <p><b>Observaciones:</b> ${item.observaciones || 'N/A'}</p>

                    ${
                        item.idadopcion
                        ? `<div class="mt-2 p-2 bg-green-100 border-l-4 border-green-500">
                            <b>🎉 Adopción registrada el:</b> ${item.fechaadopcion}<br>
                            </div>`
                        : item.estadosolicitud === 'RECHAZADO'
                            ? `<div class="mt-2 p-2 bg-red-100 border-l-4 border-red-500">
                                <i class="text-danger">Solicitud rechazada</i>
                               </div>`
                            : `<i class="text-gray-500">Solicitud en proceso</i>`
                    }
                </div>
            `}).join('');
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
     * Estados: PENDIENTE → EN_REVISION → APROBADO/RECHAZADO
     * Al APROBAR se registra la adopción automáticamente
     * ======================================================== */
    async function cambiarEstadoSolicitud(idSolicitud, nuevoEstado) {
        let observaciones = null;
        
        console.log("🔄 Iniciando cambio de estado:", idSolicitud, "→", nuevoEstado);
        
        // Si se va a rechazar, solicitar observaciones (obligatorio)
        if (nuevoEstado === 'RECHAZADO') {
            observaciones = prompt('Ingrese el motivo del rechazo (obligatorio):');
            if (!observaciones || observaciones.trim() === '') {
                mostrarMensaje('Debe ingresar un motivo para rechazar la solicitud.', true);
                return;
            }
        }
        
        // Mensaje de confirmación según la acción
        let mensajeConfirmacion = `¿Seguro de cambiar el estado de la solicitud #${idSolicitud} a ${nuevoEstado}?`;
        if (nuevoEstado === 'APROBADO') {
            mensajeConfirmacion = `¿Confirma APROBAR la solicitud #${idSolicitud}?\n\nEsto registrará automáticamente la adopción del animal.`;
        } else if (nuevoEstado === 'RECHAZADO') {
            mensajeConfirmacion = `¿Confirma RECHAZAR la solicitud #${idSolicitud}?\n\nMotivo: ${observaciones}`;
        }
        
        if (!await confirmarAccion(mensajeConfirmacion)) return;
        
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

            // Mensaje según el resultado
            if (nuevoEstado === 'APROBADO' && data.adopcion) {
                mostrarMensaje(`✅ Solicitud APROBADA\n\n🎉 Adopción registrada exitosamente (ID: ${data.adopcion.idadopcion})`);
                // Recargar también la tabla de adopciones
                listarAdopciones();
            } else if (nuevoEstado === 'RECHAZADO') {
                mostrarMensaje(`❌ Solicitud RECHAZADA\n\nMotivo: ${observaciones}`);
            } else {
                mostrarMensaje(`✅ Estado actualizado a ${nuevoEstado}`);
            }
            
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
            let estadoTexto = estado;
            let botones = '';
            
            console.log(`Fila ${index}: Estado="${estado}", ID=${item.idsolicitudadopcion}, Persona="${item.nombreusuario}"`);
            
            // Colores y botones según estado
            // Estados: PENDIENTE → EN_REVISION → APROBADO/RECHAZADO
            if (estado === 'PENDIENTE') {
                estadoClass = 'badge bg-warning text-dark';
                estadoTexto = 'Pendiente';
                botones = `
                    <button class="btn btn-sm btn-pink me-1 btn-ver" data-id="${item.idsolicitudadopcion}" title="Al ver, cambiará a En Revisión">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm btn-pink me-1 btn-aprobar" data-id="${item.idsolicitudadopcion}" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important;">
                        <i class="bi bi-check-circle"></i> Aprobar
                    </button>
                    <button class="btn btn-sm btn-pink btn-rechazar" data-id="${item.idsolicitudadopcion}" style="background: linear-gradient(135deg, #dc3545 0%, #ff6b6b 100%) !important;">
                        <i class="bi bi-x-circle"></i> Rechazar
                    </button>
                `;
            } else if (estado === 'EN_REVISION') {
                estadoClass = 'badge bg-info';
                estadoTexto = 'En Revisión';
                botones = `
                    <button class="btn btn-sm btn-pink me-1 btn-ver" data-id="${item.idsolicitudadopcion}">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm btn-pink me-1 btn-aprobar" data-id="${item.idsolicitudadopcion}" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important;">
                        <i class="bi bi-check-circle"></i> Aprobar
                    </button>
                    <button class="btn btn-sm btn-pink btn-rechazar" data-id="${item.idsolicitudadopcion}" style="background: linear-gradient(135deg, #dc3545 0%, #ff6b6b 100%) !important;">
                        <i class="bi bi-x-circle"></i> Rechazar
                    </button>
                `;
            } else if (estado === 'APROBADO') {
                estadoClass = 'badge bg-success';
                estadoTexto = 'Aprobado';
                botones = `
                    <button class="btn btn-sm btn-pink btn-ver" data-id="${item.idsolicitudadopcion}">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                `;
            } else if (estado === 'RECHAZADO') {
                estadoClass = 'badge bg-danger';
                estadoTexto = 'Rechazado';
                botones = `
                    <button class="btn btn-sm btn-pink btn-ver" data-id="${item.idsolicitudadopcion}">
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
                    <td><span class="${estadoClass}">${estadoTexto}</span></td>
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
        
        document.querySelectorAll('.btn-aprobar').forEach(btn => {
            btn.addEventListener('click', () => {
                console.log("✅ Aprobar solicitud:", btn.dataset.id);
                cambiarEstadoSolicitud(parseInt(btn.dataset.id), 'APROBADO');
            });
        });
        
        document.querySelectorAll('.btn-rechazar').forEach(btn => {
            btn.addEventListener('click', () => {
                console.log("❌ Rechazar solicitud:", btn.dataset.id);
                cambiarEstadoSolicitud(parseInt(btn.dataset.id), 'RECHAZADO');
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
            
            // Aplicar filtros del lado del cliente
            let adopcionesFiltradas = data.data || [];
            
            const filtroPersona = document.getElementById('filtroPersonaAdopcion')?.value?.toLowerCase() || '';
            const filtroAnimal = document.getElementById('filtroAnimalAdopcion')?.value?.toLowerCase() || '';
            const filtroFecha = document.getElementById('filtroFechaAdopcion')?.value || '';
            
            if (filtroPersona) {
                adopcionesFiltradas = adopcionesFiltradas.filter(a => 
                    (a.nombreusuario || '').toLowerCase().includes(filtroPersona)
                );
            }
            if (filtroAnimal) {
                adopcionesFiltradas = adopcionesFiltradas.filter(a => 
                    (a.nombreanimal || '').toLowerCase().includes(filtroAnimal)
                );
            }
            if (filtroFecha) {
                adopcionesFiltradas = adopcionesFiltradas.filter(a => {
                    if (!a.f_adopcion) return false;
                    const fechaAdopcion = new Date(a.f_adopcion).toISOString().split('T')[0];
                    return fechaAdopcion === filtroFecha;
                });
            }
            
            renderAdopciones(adopcionesFiltradas);
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
                <td><strong>${item.nombreanimal || 'N/A'}</strong></td>
                <td>${item.f_adopcion ? new Date(item.f_adopcion).toLocaleDateString('es-PE') : 'N/A'}</td>
                <td>${item.nombreusuario || 'Sin datos'}</td>
                <td>
                    <button class="btn btn-sm btn-pink btn-ver-adopcion" data-id="${item.idadopcion}">
                        <i class="bi bi-eye"></i> Ver
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
     * Al ver, si está PENDIENTE cambia a EN_REVISION automáticamente
     * ======================================================== */
    async function verDetalleSolicitud(idSolicitud) {
        try {
            // Usar el nuevo endpoint que obtiene detalle y cambia estado si es PENDIENTE
            const res = await fetch(`${API_BASE_URL}/solicitud/${idSolicitud}`, { headers: headersAuth });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Error desconocido");
            
            const solicitud = data.data;
            if (!solicitud) {
                mostrarMensaje("No se encontró la solicitud", true);
                return;
            }

            // Si el estado cambió de PENDIENTE a EN_REVISION, mostrar mensaje
            if (data.estadoCambiado) {
                console.log("📋 Estado actualizado automáticamente a EN_REVISION");
            }

            // Determinar clase del badge según estado
            let estadoClass = 'warning';
            let estadoTexto = solicitud.estadosolicitud;
            if (solicitud.estadosolicitud === 'APROBADO') {
                estadoClass = 'success';
                estadoTexto = 'Aprobado';
            } else if (solicitud.estadosolicitud === 'RECHAZADO') {
                estadoClass = 'danger';
                estadoTexto = 'Rechazado';
            } else if (solicitud.estadosolicitud === 'EN_REVISION') {
                estadoClass = 'info';
                estadoTexto = 'En Revisión';
            } else if (solicitud.estadosolicitud === 'PENDIENTE') {
                estadoClass = 'warning';
                estadoTexto = 'Pendiente';
            }

            const modalBody = document.getElementById("detalleSolicitudBody");
            const edadTexto = solicitud.edadmesesanimal 
                ? (solicitud.edadmesesanimal >= 12 
                    ? `${Math.floor(solicitud.edadmesesanimal/12)} año(s) ${solicitud.edadmesesanimal % 12 > 0 ? `y ${solicitud.edadmesesanimal % 12} mes(es)` : ''}` 
                    : `${solicitud.edadmesesanimal} mes(es)`) 
                : 'No especificada';
            const generoTexto = solicitud.generoanimal === 'M' ? 'Macho' : solicitud.generoanimal === 'H' ? 'Hembra' : 'No especificado';

            modalBody.innerHTML = `
                <!-- Estado de la solicitud -->
                <div class="text-center mb-4">
                    <span class="badge bg-${estadoClass} fs-6 px-4 py-2">
                        <i class="bi bi-${estadoClass === 'success' ? 'check-circle' : estadoClass === 'danger' ? 'x-circle' : estadoClass === 'info' ? 'hourglass-split' : 'clock'} me-2"></i>
                        ${estadoTexto}
                    </span>
                    <p class="text-muted small mt-2 mb-0">Solicitud #${solicitud.idsolicitudadopcion} • ${solicitud.f_solicitud ? new Date(solicitud.f_solicitud).toLocaleDateString('es-PE', {day: '2-digit', month: 'long', year: 'numeric'}) : 'Sin fecha'}</p>
                </div>

                <div class="row g-4">
                    <!-- COLUMNA IZQUIERDA: Animal -->
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-header text-white py-2" style="background: linear-gradient(135deg, #ef7aa1 0%, #ff6b9d 100%);">
                                <h6 class="mb-0"><i class="bi bi-heart-fill me-2"></i>Animal a Adoptar</h6>
                            </div>
                            <div class="card-body">
                                <div class="text-center mb-3">
                                    <div class="rounded-circle bg-pink bg-opacity-10 d-inline-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                                        <i class="bi bi-piggy-bank" style="font-size: 2.5rem; color: #ef7aa1;"></i>
                                    </div>
                                    <h5 class="mt-2 mb-0 fw-bold" style="color: #ef3b7d;">${solicitud.nombreanimal || 'Sin nombre'}</h5>
                                </div>
                                
                                <div class="row g-2 text-center">
                                    <div class="col-6">
                                        <div class="border rounded p-2 bg-light">
                                            <small class="text-muted d-block">Especie</small>
                                            <strong>${solicitud.especieanimal || 'N/A'}</strong>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="border rounded p-2 bg-light">
                                            <small class="text-muted d-block">Raza</small>
                                            <strong>${solicitud.razaanimal || 'N/A'}</strong>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="border rounded p-2 bg-light">
                                            <small class="text-muted d-block">Edad</small>
                                            <strong>${edadTexto}</strong>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="border rounded p-2 bg-light">
                                            <small class="text-muted d-block">Género</small>
                                            <strong>${generoTexto}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- COLUMNA DERECHA: Solicitante -->
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-header bg-secondary text-white py-2">
                                <h6 class="mb-0"><i class="bi bi-person-fill me-2"></i>Solicitante</h6>
                            </div>
                            <div class="card-body">
                                <div class="d-flex align-items-center mb-3">
                                    <div class="rounded-circle bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center me-3" style="width: 50px; height: 50px;">
                                        <i class="bi bi-person" style="font-size: 1.5rem; color: #6c757d;"></i>
                                    </div>
                                    <div>
                                        <h6 class="mb-0 fw-bold">${solicitud.nombreusuario || 'Sin nombre'}</h6>
                                        <small class="text-muted">DNI: ${solicitud.dni || 'N/A'}</small>
                                    </div>
                                </div>
                                
                                <div class="border-top pt-3">
                                    <p class="mb-2 small">
                                        <i class="bi bi-telephone me-2 text-muted"></i>
                                        <strong>Teléfono:</strong> ${solicitud.numerousuario || 'No registrado'}
                                    </p>
                                    <p class="mb-2 small">
                                        <i class="bi bi-envelope me-2 text-muted"></i>
                                        <strong>Correo:</strong> ${solicitud.correousuario || 'No registrado'}
                                    </p>
                                    <p class="mb-0 small">
                                        <i class="bi bi-geo-alt me-2 text-muted"></i>
                                        <strong>Dirección:</strong> ${solicitud.direccionusuario || 'No registrada'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Motivo de la solicitud -->
                <div class="card border-0 shadow-sm mt-4">
                    <div class="card-header bg-light py-2">
                        <h6 class="mb-0"><i class="bi bi-chat-quote me-2"></i>Motivo de la Solicitud</h6>
                    </div>
                    <div class="card-body">
                        <p class="mb-0 fst-italic">"${solicitud.motivosolicitud || 'No especificado'}"</p>
                    </div>
                </div>

                ${solicitud.observaciones ? `
                    <div class="alert ${estadoClass === 'danger' ? 'alert-danger' : 'alert-info'} mt-4 mb-0">
                        <h6 class="alert-heading">
                            <i class="bi bi-${estadoClass === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                            Observaciones
                        </h6>
                        <p class="mb-0">${solicitud.observaciones}</p>
                    </div>
                ` : ''}
            `;

            // Obtener o crear instancia del modal (evitar duplicados que bloquean)
            const modalElement = document.getElementById('modalVerSolicitud');
            let modal = bootstrap.Modal.getInstance(modalElement);
            if (!modal) {
                modal = new bootstrap.Modal(modalElement);
            }
            modal.show();

            // Recargar la tabla para reflejar el cambio de estado si ocurrió
            if (data.estadoCambiado) {
                setTimeout(() => listarSolicitudes(), 300);
            }
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
                <!-- Encabezado de éxito -->
                <div class="text-center mb-4">
                    <div class="rounded-circle bg-success bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3" style="width: 80px; height: 80px;">
                        <i class="bi bi-check-circle-fill text-success" style="font-size: 3rem;"></i>
                    </div>
                    <h4 class="text-success fw-bold mb-1">¡Adopción Exitosa!</h4>
                    <p class="text-muted mb-0">Adopción #${adopcion.idadopcion} • ${adopcion.f_adopcion ? new Date(adopcion.f_adopcion).toLocaleDateString('es-PE', {day: '2-digit', month: 'long', year: 'numeric'}) : 'Sin fecha'}</p>
                </div>

                <div class="row g-4">
                    <!-- Animal adoptado -->
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-header text-white py-2" style="background: linear-gradient(135deg, #ef7aa1 0%, #ff6b9d 100%);">
                                <h6 class="mb-0"><i class="bi bi-heart-fill me-2"></i>Animal Adoptado</h6>
                            </div>
                            <div class="card-body text-center">
                                <div class="rounded-circle bg-pink bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3" style="width: 70px; height: 70px;">
                                    <i class="bi bi-piggy-bank" style="font-size: 2rem; color: #ef7aa1;"></i>
                                </div>
                                <h5 class="fw-bold mb-0" style="color: #ef3b7d;">${adopcion.nombreanimal || 'Sin nombre'}</h5>
                            </div>
                        </div>
                    </div>

                    <!-- Adoptante -->
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-header bg-secondary text-white py-2">
                                <h6 class="mb-0"><i class="bi bi-person-heart me-2"></i>Adoptante</h6>
                            </div>
                            <div class="card-body text-center">
                                <div class="rounded-circle bg-secondary bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3" style="width: 70px; height: 70px;">
                                    <i class="bi bi-person" style="font-size: 2rem; color: #6c757d;"></i>
                                </div>
                                <h5 class="fw-bold mb-0">${adopcion.nombreusuario || 'Sin nombre'}</h5>
                                <small class="text-muted">DNI: ${adopcion.dni || 'N/A'}</small>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Detalles del contrato -->
                <div class="card border-0 shadow-sm mt-4">
                    <div class="card-header bg-light py-2">
                        <h6 class="mb-0"><i class="bi bi-file-earmark-text me-2"></i>Detalles del Contrato</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <p class="mb-2 small">
                                    <i class="bi bi-file-text me-2 text-muted"></i>
                                    <strong>Contrato:</strong> ${adopcion.contratoadopcion || 'Contrato estándar'}
                                </p>
                            </div>
                            <div class="col-md-6">
                                <p class="mb-0 small">
                                    <i class="bi bi-list-check me-2 text-muted"></i>
                                    <strong>Condiciones:</strong> ${adopcion.condiciones || 'Seguimiento periódico'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Obtener o crear instancia del modal (evitar duplicados que bloquean)
            const modalElement = document.getElementById('modalVerAdopcion');
            let modal = bootstrap.Modal.getInstance(modalElement);
            if (!modal) {
                modal = new bootstrap.Modal(modalElement);
            }
            modal.show();
        } catch (err) {
            console.error("Error al ver detalle:", err);
            mostrarMensaje("Error al cargar detalle: " + err.message, true);
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

    // Filtros de adopciones
    const filtroPersonaAdopcion = document.getElementById("filtroPersonaAdopcion");
    const filtroAnimalAdopcion = document.getElementById("filtroAnimalAdopcion");
    const filtroFechaAdopcion = document.getElementById("filtroFechaAdopcion");
    
    if (filtroPersonaAdopcion) {
        filtroPersonaAdopcion.addEventListener("input", () => {
            clearTimeout(filtroPersonaAdopcion.timeout);
            filtroPersonaAdopcion.timeout = setTimeout(listarAdopciones, 500);
        });
    }
    
    if (filtroAnimalAdopcion) {
        filtroAnimalAdopcion.addEventListener("input", () => {
            clearTimeout(filtroAnimalAdopcion.timeout);
            filtroAnimalAdopcion.timeout = setTimeout(listarAdopciones, 500);
        });
    }
    
    if (filtroFechaAdopcion) {
        filtroFechaAdopcion.addEventListener("change", listarAdopciones);
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
