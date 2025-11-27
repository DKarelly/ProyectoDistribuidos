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

        const resultados = await buscarRecursos('personName', searchValue);
        
        selectedDisplay.value = "Selección Pendiente";
        idInput.value = "";
        previewDiv.textContent = "Esperando datos de contacto...";

        if (!resultados || resultados.personas.length === 0) {
            mostrarMensaje(`No se encontraron personas para '${searchValue}'.`, true);
            return;
        }

        if (resultados.personas.length === 1) {
            const persona = resultados.personas[0];
            const nombreCompleto = `${persona.nombres} ${persona.apePaterno} ${persona.apeMaterno}`;
            selectedDisplay.value = nombreCompleto;
            idInput.value = persona.idusuario;
            previewDiv.textContent = `${nombreCompleto} | DNI: ${persona.dni} | Tel: ${persona.numerousuario}`;
            mostrarMensaje(`Persona '${nombreCompleto}' seleccionada.`, false);
        } else {
            console.log("Múltiples resultados de personas. Mostrar modal de selección:", resultados.personas);
            mostrarMensaje(`Se encontraron ${resultados.personas.length} resultados para personas. Por favor, seleccione uno en el modal de resultados.`, false);
            // Aquí se debería abrir un modal para elegir entre 'resultados.personas'
        }
    }

    /** Maneja la búsqueda y selección del Animal. */
    async function manejarBusquedaAnimal() {
        const searchInput = document.getElementById("inputAnimalSearch");
        const selectedDisplay = document.getElementById("nombreAnimalSeleccionada");
        const idInput = document.getElementById("idAnimal");
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
    async function registrarSolicitud() {
        const motivo = document.getElementById("motivo").value;
        const observaciones = document.getElementById("observaciones")?.value || ""; 
        const idAnimal = document.getElementById("idAnimal")?.value; 

        if (!motivo || !idAnimal) {
            mostrarMensaje("Por favor, completa el motivo de la solicitud y selecciona un Animal.", true);
            return;
        }

        try {
            // Llama a /api/adoptions/registrar_solicitud
            const res = await fetch(`${API_BASE_URL}/registrar_solicitud`, {
                method: "POST",
                headers: headersAuth,
                body: JSON.stringify({
                    motivoSolicitud: motivo,
                    observaciones: observaciones,
                    idAnimal: idAnimal
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Error desconocido");

            mostrarMensaje("Solicitud enviada correctamente.");
            cargarMisAdopciones(); 
        } catch (err) {
            console.error("Error registrando solicitud:", err);
            mostrarMensaje("Error al registrar solicitud: " + err.message, true);
        }
    }

    /* ========================================================
     * 3. CAMBIAR ESTADO DE SOLICITUD (ADMIN)
     * ======================================================== */
    async function cambiarEstadoSolicitud(idSolicitud, nuevoEstado) {
        if (!await confirmarAccion(`¿Seguro de cambiar el estado de la solicitud #${idSolicitud} a ${nuevoEstado}?`)) return;
        
        try {
            // Llama a /api/adoptions/estado_solicitud/:id
            const res = await fetch(`${API_BASE_URL}/estado_solicitud/${idSolicitud}`, {
                method: "PUT",
                headers: headersAuth,
                body: JSON.stringify({ estadoSolicitud: nuevoEstado })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Error desconocido");

            mostrarMensaje(`Estado de la solicitud #${idSolicitud} actualizado a ${nuevoEstado}`);
            listarSolicitudes(); 
        } catch (err) {
            console.error("Error al cambiar estado:", err);
            mostrarMensaje("Error al cambiar estado: " + err.message, true);
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
            // Llama a /api/adoptions/solicitud
            const res = await fetch(`${API_BASE_URL}/solicitud`, { headers: headersAuth });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Error desconocido");
            renderSolicitudes(data.data);
        } catch (err) {
            console.error("Error cargando solicitudes:", err);
            mostrarMensaje("Error cargando solicitudes: " + err.message, true);
        }
    }

    function renderSolicitudes(lista) {
        const contenedor = document.getElementById("listaSolicitudes");
        if (!contenedor) return;

        contenedor.innerHTML = lista.length === 0 
            ? '<p class="text-center text-gray-500">No hay solicitudes pendientes de revisión.</p>'
            : lista.map(item => `
                <div class="card p-4 my-2 border rounded shadow-lg bg-gray-50">
                    <p><b>Solicitud ID:</b> ${item.idsolicitudadopcion}</p>
                    <h4 class="font-bold text-xl text-indigo-700">Animal: ${item.nombreanimal}</h4>
                    <p><b>Fecha:</b> ${item.f_solicitud}</p>
                    <p><b>Estado:</b> <span class="font-bold">${item.estadosolicitud}</span></p>

                    <div class="flex space-x-2 mt-3">
                        <button class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition" 
                                onclick="cambiarEstadoSolicitud(${item.idsolicitudadopcion}, 'ACEPTADA')">
                            Aceptar
                        </button>
                        <button class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                                onclick="cambiarEstadoSolicitud(${item.idsolicitudadopcion}, 'RECHAZADA')">
                            Rechazar
                        </button>
                        <button class="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
                                onclick="eliminarSolicitud(${item.idsolicitudadopcion})">
                            Eliminar
                        </button>
                    </div>
                </div>
            `).join('');
    }

    /* ========================================================
     * 6. LISTAR ADOPCIONES (ADMIN)
     * ======================================================== */
    async function listarAdopciones() {
        try {
            // Llama a /api/adoptions/ (endpoint raíz del router)
            const res = await fetch(`${API_BASE_URL}/`, { headers: headersAuth });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Error desconocido");
            renderAdopciones(data.data);
        } catch (err) {
            console.error("Error cargando adopciones:", err);
            mostrarMensaje("Error cargando adopciones: " + err.message, true);
        }
    }

    function renderAdopciones(lista) {
        const contenedor = document.getElementById("listaAdopciones");
        if (!contenedor) return;

        contenedor.innerHTML = lista.length === 0
            ? '<p class="text-center text-gray-500">Aún no hay adopciones registradas.</p>'
            : lista.map(item => `
                <div class="card p-4 my-2 border rounded shadow-sm bg-blue-50">
                    <p><b>ID Adopción:</b> ${item.idadopcion}</p>
                    <h4 class="font-bold text-lg">Animal: ${item.nombreanimal}</h4>
                    <p><b>Adoptante ID:</b> ${item.idusuario}</p>
                    <p><b>Fecha:</b> ${item.f_adopcion}</p>
                </div>
            `).join('');
    }

    /* ========================================================
     * 7. ELIMINAR SOLICITUD
     * ======================================================== */
    async function eliminarSolicitud(idSolicitud) {
        if (!await confirmarAccion(`¿Seguro de eliminar la solicitud #${idSolicitud}?`)) return;

        try {
            // Llama a /api/adoptions/solicitud/:id
            const res = await fetch(`${API_BASE_URL}/solicitud/${idSolicitud}`, { method: "DELETE", headers: headersAuth });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Error desconocido");

            mostrarMensaje(`Solicitud #${idSolicitud} eliminada correctamente.`);
            listarSolicitudes();
        } catch (err) {
            console.error("Error al eliminar solicitud:", err);
            mostrarMensaje("Error al eliminar solicitud: " + (data?.message || err.message), true);
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
    
    // EXPONER FUNCIONES DE BÚSQUEDA
    window.manejarBusquedaPersona = manejarBusquedaPersona;
    window.manejarBusquedaAnimal = manejarBusquedaAnimal;


    // ========================================================
    // EVENT LISTENERS DE BÚSQUEDA
    // ========================================================
    const btnBuscarPersona = document.getElementById("btnBuscarPersona");
    if (btnBuscarPersona) {
        btnBuscarPersona.addEventListener("click", manejarBusquedaPersona);
    }

    const btnBuscarAnimal = document.getElementById("btnBuscarAnimal");
    if (btnBuscarAnimal) {
        btnBuscarAnimal.addEventListener("click", manejarBusquedaAnimal);
    }
    
    // Lógica de inicio
    if (document.getElementById("misSolicitudes")) {
        cargarMisAdopciones();
    }
    if (document.getElementById("listaSolicitudes")) {
        listarSolicitudes();
    }
    if (document.getElementById("listaAdopciones")) {
        listarAdopciones();
    }
});