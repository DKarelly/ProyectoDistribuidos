console.log("paraVerModificarUsuario.js cargado correctamente");

document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM cargado - Inicializando módulo de usuarios");

    const usuariosBody = document.getElementById("usuariosBody");
    const inputBuscar = document.getElementById("buscarUsuario");
    const filtroRol = document.getElementById("filtroRol");
    const formEditar = document.getElementById("formEditarUsuario");

    let usuarios = [];

    /* ============================================================
         FUNCIÓN GENÉRICA PARA HACER PETICIONES AL BACKEND
    ============================================================ */
    async function apiRequest(endpoint, method = "GET", body) {
        try {
            const headers = { "Content-Type": "application/json" };
            const token = localStorage.getItem("authToken");
            if (token) headers.Authorization = `Bearer ${token}`;

            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Error en la petición");
            return data;
        } catch (err) {
            console.error("apiRequest error:", err);
            Swal.fire("Error", err.message, "error");
            throw err;
        }
    }

    /* ============================================================
         CARGAR ROLES
    ============================================================ */
    async function loadRoles() {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                console.warn("No se encontró token de autenticación en localStorage.");
                Swal.fire("Advertencia", "Debes iniciar sesión para cargar los roles.", "warning");
                return;
            }

            console.log("Solicitando roles a:", `${API_BASE_URL}/roles`);
            const response = await fetch(`${API_BASE_URL}/roles`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            console.log("Respuesta HTTP:", response.status);
            const data = await response.json();
            console.log("Datos recibidos:", data);

            if (!response.ok) throw new Error(data.message || "Error al obtener roles.");

            const roles = data.data || [];
            if (!roles.length) {
                console.warn("No hay roles en la base de datos.");
            }

            // Rellenar filtro superior
            filtroRol.innerHTML = `<option value="">Todos los roles</option>`;
            roles.forEach((r) => {
                const opt = document.createElement("option");
                opt.value = r.rolusuario;
                opt.textContent = r.rolusuario;
                filtroRol.appendChild(opt);
            });

            // Rellenar selects del modal
            const selectRegistrar = document.getElementById("selectRolRegistrar");
            const selectEditar = document.getElementById("selectRolEditar");
            [selectRegistrar, selectEditar].forEach((sel) => {
                if (!sel) return;
                sel.innerHTML = `<option value="">Seleccione rol</option>`;
                roles.forEach((r) => {
                    const o = document.createElement("option");
                    o.value = r.idrol;
                    o.textContent = r.rolusuario;
                    sel.appendChild(o);
                });
            });

            console.log("Roles cargados correctamente.");

        } catch (err) {
            console.error("Error cargando roles:", err);
            Swal.fire("Error", "No se pudieron cargar los roles", "error");
        }
    }

    /* ============================================================
       CARGAR USUARIOS CON PAGINACIÓN
    ============================================================ */
    let currentPage = 1;
    let totalPages = 1;
    let itemsPerPage = 10;

    async function loadUsersTable(page = 1) {
        try {
            const response = await apiRequest(`/users?page=${page}&limit=${itemsPerPage}`);
            usuarios = response.data || [];
            const pagination = response.pagination || {};
            currentPage = pagination.currentPage || 1;
            totalPages = pagination.totalPages || 1;
            renderTable(usuarios);
            renderPagination(pagination);
        } catch (err) {
            console.error("Error cargando usuarios:", err);
        }
    }

    /* ============================================================
       RENDERIZAR TABLA DE USUARIOS
    ============================================================ */
    function renderTable(data) {
        usuariosBody.innerHTML = "";
        if (data.length === 0) {
            usuariosBody.innerHTML = `
                <tr><td colspan="8" class="text-center text-muted">No hay usuarios registrados</td></tr>`;
            return;
        }

        data.forEach((u) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${u.idusuario}</td>
                <td>${u.aliasusuario}</td>
                <td>${u.correousuario}</td>
                <td>${u.numerousuario || "-"}</td>
                <td>${u.direccionusuario || "-"}</td>
                <td>${u.rolusuario}</td>
                <td>
                    <button class="btn btn-warning btn-sm btn-editar" data-id="${u.idusuario}">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                </td>
                <td>
                    <button class="btn btn-danger btn-sm btn-eliminar" data-id="${u.idusuario}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            usuariosBody.appendChild(tr);
        });

        // Eventos dinámicos
        document.querySelectorAll(".btn-editar").forEach((btn) => {
            btn.addEventListener("click", () => abrirModalEdicion(btn.dataset.id));
        });
        document.querySelectorAll(".btn-eliminar").forEach((btn) => {
            btn.addEventListener("click", () => eliminarUsuario(btn.dataset.id));
        });
    }

    /* ============================================================
       RENDERIZAR PAGINACIÓN
    ============================================================ */
    function renderPagination(pagination) {
        const paginationInfo = document.getElementById("usuariosPaginationInfo");
        const paginationControls = document.getElementById("usuariosPaginationControls");

        if (!paginationInfo || !paginationControls) return;

        const { currentPage, totalPages, totalItems, itemsPerPage } = pagination;
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);

        paginationInfo.textContent = `Mostrando ${startItem} a ${endItem} de ${totalItems} usuarios`;

        paginationControls.innerHTML = "";

        // Botón Anterior
        const prevBtn = document.createElement("li");
        prevBtn.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevBtn.innerHTML = `<a class="page-link" href="#" aria-label="Anterior"><span aria-hidden="true">&laquo;</span></a>`;
        prevBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (currentPage > 1) loadUsersTable(currentPage - 1);
        });
        paginationControls.appendChild(prevBtn);

        // Páginas
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement("li");
            pageBtn.className = `page-item ${i === currentPage ? 'active' : ''}`;
            pageBtn.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            pageBtn.addEventListener("click", (e) => {
                e.preventDefault();
                loadUsersTable(i);
            });
            paginationControls.appendChild(pageBtn);
        }

        // Botón Siguiente
        const nextBtn = document.createElement("li");
        nextBtn.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextBtn.innerHTML = `<a class="page-link" href="#" aria-label="Siguiente"><span aria-hidden="true">&raquo;</span></a>`;
        nextBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (currentPage < totalPages) loadUsersTable(currentPage + 1);
        });
        paginationControls.appendChild(nextBtn);
    }

    /* ============================================================
       FILTROS DE BÚSQUEDA Y ROL
    ============================================================ */
    function aplicarFiltros() {
        // Para filtros, por ahora recargamos la primera página
        // En una implementación completa, se enviaría la búsqueda al backend
        loadUsersTable(1);
    }

    inputBuscar.addEventListener("input", aplicarFiltros);
    filtroRol.addEventListener("change", aplicarFiltros);

    /* ============================================================
       BUSCAR USUARIOS CON FILTROS
    ============================================================ */
    async function searchUsers(searchTerm, roleFilter, page = 1) {
        try {
            let url = `/users?page=${page}&limit=${itemsPerPage}`;
            if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
            if (roleFilter) url += `&role=${encodeURIComponent(roleFilter)}`;

            const response = await apiRequest(url);
            usuarios = response.data || [];
            const pagination = response.pagination || {};
            currentPage = pagination.currentPage || 1;
            totalPages = pagination.totalPages || 1;
            renderTable(usuarios);
            renderPagination(pagination);
        } catch (err) {
            console.error("Error buscando usuarios:", err);
        }
    }

    // Actualizar la función aplicarFiltros para usar búsqueda en backend
    function aplicarFiltros() {
        const texto = inputBuscar.value.trim();
        const rolSel = filtroRol.value;
        searchUsers(texto, rolSel, 1);
    }

    // Actualizar loadUsersTable para usar la nueva función de búsqueda
    async function loadUsersTable(page = 1) {
        const texto = inputBuscar.value.trim();
        const rolSel = filtroRol.value;
        await searchUsers(texto, rolSel, page);
    }

    /* ============================================================
       ELIMINAR USUARIO
    ============================================================ */
    async function eliminarUsuario(id) {
        const confirm = await Swal.fire({
            title: "¿Eliminar usuario?",
            text: "Esta acción no se puede deshacer",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        });

        if (!confirm.isConfirmed) return;

        try {
            await apiRequest(`/users/${id}`, "DELETE");
            Swal.fire("Eliminado", "Usuario eliminado correctamente", "success");
            loadUsersTable();
        } catch (err) {
            console.error("Error eliminando usuario:", err);
        }
    }

    /* ============================================================
       EDITAR USUARIO - ABRIR MODAL
    ============================================================ */
    async function abrirModalEdicion(id) {
        try {
            const res = await apiRequest(`/users/${id}`);
            const usuario = res.usuario;
            const persona = res.persona;
            const empresa = res.empresa;

            const form = formEditar;

            // Usuario
            form.querySelector('#idEditar').value = usuario.idusuario;
            form.querySelector('#idEditar').readOnly = true;
            form.querySelector('input[placeholder="Ingresar alias"]').value = usuario.aliasusuario || "";
            form.querySelector('input[placeholder="Ingresar correo"]').value = usuario.correousuario || "";
            form.querySelector('input[placeholder="Ingresar teléfono"]').value = usuario.numerousuario || "";
            form.querySelector('input[placeholder="Ingresar dirección"]').value = usuario.direccionusuario || "";
            form.querySelector('#selectRolEditar').value = usuario.idrol || "";

            // Persona
            if (persona) {
                document.getElementById("tipoPersona1").checked = true;
                const camposPersona = document.getElementById("camposPersona");
                camposPersona.classList.remove("d-none");

                document.getElementById("idPersonaEditar").value = persona.idpersona;
                document.getElementById("nombresPersonaEditar").value = persona.nombres || "";
                document.getElementById("apepaternoPersonaEditar").value = persona.apepaterno || "";
                document.getElementById("apematernoPersonaEditar").value = persona.apematerno || "";
                document.getElementById("dniPersonaEditar").value = persona.dni || "";
                document.getElementById("sexoPersonaEditar").value = persona.sexo || "";
            } else {
                document.getElementById("camposPersona").classList.add("d-none");
            }

            if (empresa) {
                document.getElementById("tipoPersona2").checked = true;
                const camposEmpresa = document.getElementById("camposEmpresa");
                camposEmpresa.classList.remove("d-none");

                document.getElementById("idEmpresaEditar").value = empresa.idempresa;
                document.getElementById("nombreEmpresaEditar").value = empresa.nombreempresa || "";
                document.getElementById("tipoPersonaEmpresaEditar").value = empresa.tipopersona || "";
                document.getElementById("rucEmpresaEditar").value = empresa.ruc || "";
                document.getElementById("fechaCreacionEmpresaEditar").value = empresa.f_creacion || "";
            } else {
                document.getElementById("camposEmpresa").classList.add("d-none");
            }

            // Abrir modal
            const modal = new bootstrap.Modal(document.getElementById("modalEditarUsuario"));
            modal.show();

            // Aplicar validaciones al modal
            applyEditUserValidations();

            // Enviar formulario
            form.onsubmit = async e => {
                e.preventDefault();
                const payload = {
                    aliasusuario: form.querySelector('input[placeholder="Ingresar alias"]').value.trim(),
                    correousuario: form.querySelector('input[placeholder="Ingresar correo"]').value.trim(),
                    numerousuario: form.querySelector('input[placeholder="Ingresar teléfono"]').value.trim(),
                    direccionusuario: form.querySelector('input[placeholder="Ingresar dirección"]').value.trim(),
                    idrol: form.querySelector('#selectRolEditar').value,
                    persona: persona ? {
                        idpersona: persona.idpersona,
                        nombres: document.getElementById("nombresPersonaEditar").value.trim(),
                        apepaterno: document.getElementById("apepaternoPersonaEditar").value.trim(),
                        apematerno: document.getElementById("apematernoPersonaEditar").value.trim(),
                        dni: document.getElementById("dniPersonaEditar").value.trim(),
                        sexo: document.getElementById("sexoPersonaEditar").value
                    } : null,
                    empresa: empresa ? {
                        idempresa: empresa.idempresa,
                        nombreempresa: document.getElementById("nombreEmpresaEditar").value.trim(),
                        ruc: document.getElementById("rucEmpresaEditar").value.trim(),
                        f_creacion: document.getElementById("fechaCreacionEmpresaEditar").value,
                        tipopersona: document.getElementById("tipoPersonaEmpresaEditar").value
                    } : null
                };

                try {
                    const result = await apiRequest(`/users/${id}`, 'PUT', payload);
                    Swal.fire('Éxito', result.message || 'Usuario actualizado', 'success');
                    modal.hide();
                    loadUsersTable();
                } catch (error) {
                    Swal.fire('Error', error.message || 'Error al actualizar usuario', 'error');
                }
            };

        } catch (err) {
            console.error("Error abriendo modal edición:", err);
            Swal.fire("Error", err.message || "No se pudo abrir el modal", "error");
        }
    }

    /* ============================================================
       MOSTRAR / OCULTAR CAMPOS (PERSONA / EMPRESA)
    ============================================================ */
    function configurarFormularioPersonaEmpresa(idModal, idRadioPersona, idRadioEmpresa, idFormPersona, idFormEmpresa) {
        const modal = document.getElementById(idModal);
        const radioPersona = document.getElementById(idRadioPersona);
        const radioEmpresa = document.getElementById(idRadioEmpresa);
        const formPersona = document.getElementById(idFormPersona);
        const formEmpresa = document.getElementById(idFormEmpresa);

        if (!modal || !radioPersona || !radioEmpresa || !formPersona || !formEmpresa) return;

        // Función para mostrar según selección
        function actualizarFormulario() {
            if (radioPersona.checked) {
                formPersona.classList.remove("d-none");
                formEmpresa.classList.add("d-none");
            } else if (radioEmpresa.checked) {
                formEmpresa.classList.remove("d-none");
                formPersona.classList.add("d-none");
            } else {
                formPersona.classList.add("d-none");
                formEmpresa.classList.add("d-none");
            }
        }

        // Eventos de cambio de tipo
        radioPersona.addEventListener("change", actualizarFormulario);
        radioEmpresa.addEventListener("change", actualizarFormulario);

        // 🔹 Al abrir el modal: limpiar y ocultar campos
        modal.addEventListener("show.bs.modal", () => {
            radioPersona.checked = false;
            radioEmpresa.checked = false;
            formPersona.classList.add("d-none");
            formEmpresa.classList.add("d-none");
        });

        // 🔹 Al cerrar el modal: limpiar y ocultar campos
        modal.addEventListener("hidden.bs.modal", () => {
            radioPersona.checked = false;
            radioEmpresa.checked = false;
            formPersona.classList.add("d-none");
            formEmpresa.classList.add("d-none");
        });
    }

    // Configurar ambos modales
    configurarFormularioPersonaEmpresa(
        "modalRegistrarUsuario",
        "tipoPersonaRegistrar1",
        "tipoPersonaRegistrar2",
        "camposPersonaRegistrar",
        "camposEmpresaRegistrar"
    );

    configurarFormularioPersonaEmpresa(
        "modalEditarUsuario",
        "tipoPersona1",
        "tipoPersona2",
        "camposPersona",
        "camposEmpresa"
    );


    /* ============================================================
      REGISTRAR NUEVO USUARIO
    ============================================================ */
    const formRegistrar = document.getElementById("formRegistrarUsuario");

    formRegistrar.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Obtener valores
        const aliasusuario = document.getElementById("aliasRegistrar").value.trim();
        const correousuario = document.getElementById("correoRegistrar").value.trim();
        const claveusuario = document.getElementById("claveRegistrar").value.trim();
        const confirmarClave = document.getElementById("confirmarClaveRegistrar").value.trim();
        const numerousuario = document.getElementById("telefonoRegistrar").value.trim();
        const direccionusuario = document.getElementById("direccionRegistrar").value.trim();
        const idrol = document.getElementById("selectRolRegistrar").value;

        const tipoPersona = document.querySelector('input[name="tipoPersonaRegistrar"]:checked').value;
        let persona = null;
        let empresa = null;

        if (tipoPersona === "persona") {
            persona = {
                nombres: document.getElementById("nombrePersonaRegistrar").value.trim(),
                apepaterno: document.getElementById("apepaternoRegistrar").value.trim(),
                apematerno: document.getElementById("apematernoRegistrar").value.trim(),
                dni: document.getElementById("dniRegistrar").value.trim(),
                sexo: document.getElementById("sexoRegistrar").value,
            };
        } else {
            empresa = {
                nombreempresa: document.getElementById("nombreEmpresaRegistrar").value.trim(),
                tipopersona: document.getElementById("tipoPersonaEmpresaRegistrar").value,
                ruc: document.getElementById("rucRegistrar").value.trim(),
                f_creacion: document.getElementById("fechaCreacionRegistrar").value,
            };
        }

        if (claveusuario !== confirmarClave) {
            Swal.fire("Error", "Las contraseñas no coinciden", "error");
            return;
        }

        try {
            const res = await apiRequest("/users", "POST", {
                aliasusuario,
                correousuario,
                claveusuario,
                numerousuario,
                direccionusuario,
                idrol,
                tipoPersona,
                persona,
                empresa,
            });

            Swal.fire("Éxito", res.message || "Usuario registrado correctamente", "success");

            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById("modalRegistrarUsuario"));
            modal.hide();

            // Reset formulario
            formRegistrar.reset();

            // Refrescar tabla
            await loadUsersTable();

        } catch (err) {
            console.error("Error registrando usuario:", err);
            Swal.fire("Error", err.message || "No se pudo registrar el usuario", "error");
        }
    });

    // Aplicar validaciones al modal de editar usuario
    function applyEditUserValidations() {
        // Alias: máximo 30 caracteres
        const aliasInput = formEditar.querySelector('input[placeholder="Ingresar alias"]');
        if (aliasInput) {
            aliasInput.setAttribute('maxlength', '30');
            aliasInput.addEventListener('input', (e) => {
                if (e.target.value.length >= 30) {
                    e.target.value = e.target.value.substring(0, 30);
                }
            });
        }

        // Correo: máximo 50 caracteres
        const emailInput = formEditar.querySelector('input[placeholder="Ingresar correo"]');
        if (emailInput) {
            emailInput.setAttribute('maxlength', '50');
            emailInput.addEventListener('input', (e) => {
                if (e.target.value.length >= 50) {
                    e.target.value = e.target.value.substring(0, 50);
                }
            });
        }

        // Teléfono: solo números, máximo 9 dígitos
        const phoneInput = formEditar.querySelector('input[placeholder="Ingresar teléfono"]');
        if (phoneInput) {
            phoneInput.setAttribute('maxlength', '9');
            phoneInput.addEventListener('input', (e) => {
                // Solo permitir números
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                if (e.target.value.length >= 9) {
                    e.target.value = e.target.value.substring(0, 9);
                }
            });

            // Bloquear teclas no numéricas
            phoneInput.addEventListener('keypress', (e) => {
                if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }

        // Dirección: máximo 100 caracteres
        const addressInput = formEditar.querySelector('input[placeholder="Ingresar dirección"]');
        if (addressInput) {
            addressInput.setAttribute('maxlength', '100');
            addressInput.addEventListener('input', (e) => {
                if (e.target.value.length >= 100) {
                    e.target.value = e.target.value.substring(0, 100);
                }
            });
        }

        // Nombres: solo letras, máximo 30 caracteres
        const nombreInput = formEditar.querySelector('input[placeholder="Ingresar nombres"]');
        if (nombreInput) {
            nombreInput.setAttribute('maxlength', '30');
            nombreInput.addEventListener('input', (e) => {
                // Solo permitir letras y espacios
                e.target.value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
                if (e.target.value.length >= 30) {
                    e.target.value = e.target.value.substring(0, 30);
                }
            });

            // Bloquear teclas no alfabéticas
            nombreInput.addEventListener('keypress', (e) => {
                if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }

        // Apellido Paterno: solo letras, máximo 30 caracteres
        const apePaternoInput = formEditar.querySelector('input[placeholder="Ingresar apellido paterno"]');
        if (apePaternoInput) {
            apePaternoInput.setAttribute('maxlength', '30');
            apePaternoInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
                if (e.target.value.length >= 30) {
                    e.target.value = e.target.value.substring(0, 30);
                }
            });

            apePaternoInput.addEventListener('keypress', (e) => {
                if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }

        // Apellido Materno: solo letras, máximo 30 caracteres
        const apeMaternoInput = formEditar.querySelector('input[placeholder="Ingresar apellido materno"]');
        if (apeMaternoInput) {
            apeMaternoInput.setAttribute('maxlength', '30');
            apeMaternoInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
                if (e.target.value.length >= 30) {
                    e.target.value = e.target.value.substring(0, 30);
                }
            });

            apeMaternoInput.addEventListener('keypress', (e) => {
                if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }

        // DNI: solo números, máximo 8 dígitos
        const dniInput = formEditar.querySelector('input[placeholder="Ingresar DNI"]');
        if (dniInput) {
            dniInput.setAttribute('maxlength', '8');
            dniInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                if (e.target.value.length >= 8) {
                    e.target.value = e.target.value.substring(0, 8);
                }
            });

            dniInput.addEventListener('keypress', (e) => {
                if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }

        // RUC: solo números, máximo 20 dígitos
        const rucInput = formEditar.querySelector('input[placeholder="Ingresar RUC"]');
        if (rucInput) {
            rucInput.setAttribute('maxlength', '20');
            rucInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                if (e.target.value.length >= 20) {
                    e.target.value = e.target.value.substring(0, 20);
                }
            });

            rucInput.addEventListener('keypress', (e) => {
                if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }
    }

    /* ============================================================
        INICIALIZAR
    ============================================================ */
    await loadRoles();
    await loadUsersTable();
    console.log("Módulo de administración de usuarios inicializado");
});
