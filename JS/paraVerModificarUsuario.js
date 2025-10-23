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
       CARGAR USUARIOS
    ============================================================ */
    async function loadUsersTable() {
        try {
            const response = await apiRequest("/users");
            usuarios = response.data || [];
            renderTable(usuarios);
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
                <<td>
                    <button class="btn btn-warning btn-sm btn-editar" data-id="${u.idusuario}">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                </td>
                <td>
                    <button class="btn btn-danger btn-sm btn-eliminar" data-id="${u.idusuario}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>td>${u.rolusuario}</td>
                
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
       FILTROS DE BÚSQUEDA Y ROL
    ============================================================ */
    function aplicarFiltros() {
        const texto = inputBuscar.value.toLowerCase();
        const rolSel = filtroRol.value;

        const filtrados = usuarios.filter((u) => {
            const alias = u.aliasusuario?.toLowerCase() || "";
            const correo = u.correousuario?.toLowerCase() || "";
            const rol = u.rolusuario;
            const textoCoincide = alias.includes(texto) || correo.includes(texto);
            const rolCoincide = rolSel ? rolSel === rol : true;
            return textoCoincide && rolCoincide;
        });

        renderTable(filtrados);
    }

    inputBuscar.addEventListener("input", aplicarFiltros);
    filtroRol.addEventListener("change", aplicarFiltros);

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

    /* ============================================================
        INICIALIZAR
    ============================================================ */
    await loadRoles();
    await loadUsersTable();
    console.log("Módulo de administración de usuarios inicializado");
});
