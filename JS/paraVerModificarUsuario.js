console.log("✅ paraVerModificarUsuario.js cargado correctamente");

document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM cargado - Inicializando módulo de usuarios");

    //const API_BASE_URL = "http://localhost:3000/api"; // Ajusta si tu backend usa otro puerto o ruta
    const usuariosBody = document.getElementById("usuariosBody");
    const inputBuscar = document.getElementById("buscarUsuario");
    const filtroRol = document.getElementById("filtroRol");
    const formEditar = document.getElementById("formEditarUsuario");

    let usuarios = [];

    /* ============================================================
       🔹 FUNCIÓN GENÉRICA PARA HACER PETICIONES AL BACKEND
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
            console.error("❌ apiRequest error:", err);
            Swal.fire("Error", err.message, "error");
            throw err;
        }
    }

    /* ============================================================
       🔹 CARGAR ROLES
    ============================================================ */
    async function loadRoles() {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                console.warn("⚠️ No se encontró token de autenticación en localStorage.");
                Swal.fire("Advertencia", "Debes iniciar sesión para cargar los roles.", "warning");
                return;
            }

            console.log("🌐 Solicitando roles a:", `${API_BASE_URL}/roles`);
            const response = await fetch(`${API_BASE_URL}/roles`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            console.log("📥 Respuesta HTTP:", response.status);
            const data = await response.json();
            console.log("📦 Datos recibidos:", data);

            if (!response.ok) throw new Error(data.message || "Error al obtener roles.");

            const roles = data.data || [];
            if (!roles.length) {
                console.warn("⚠️ No hay roles en la base de datos.");
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

            console.log("✅ Roles cargados correctamente.");

        } catch (err) {
            console.error("❌ Error cargando roles:", err);
            Swal.fire("Error", "No se pudieron cargar los roles", "error");
        }
    }

    /* ============================================================
       🔹 CARGAR USUARIOS
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
       🔹 RENDERIZAR TABLA DE USUARIOS
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
                <td>${u.numusuario || "-"}</td>
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
       🔹 FILTROS DE BÚSQUEDA Y ROL
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
       🔹 ELIMINAR USUARIO
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
       🔹 EDITAR USUARIO - ABRIR MODAL
    ============================================================ */
    async function abrirModalEdicion(id) {
        try {
            // Buscar el usuario localmente
            let usuario = usuarios.find(u => String(u.idusuario) === String(id));

            if (!usuario) {
                // Como fallback, intentar pedir al backend (solo si existe la ruta)
                const res = await apiRequest(`/users/${id}`);
                usuario = res.data || res;
                if (!usuario) throw new Error('Usuario no encontrado');
            }

            const form = formEditar;

            // 🔹 Asignar valores a los campos
            form.querySelector('#idEditar').value = usuario.idusuario || "";
            form.querySelector('input[placeholder="Ingresar alias"]').value = usuario.aliasusuario || "";
            form.querySelector('input[placeholder="Ingresar correo"]').value = usuario.correousuario || "";
            form.querySelector('input[placeholder="Ingresar teléfono"]').value = usuario.numusuario || "";
            form.querySelector('input[placeholder="Ingresar dirección"]').value = usuario.direccionusuario || "";
            form.querySelector('#selectRolEditar').value = usuario.idrol || "";

            // 🔹 Abrir el modal
            const modal = new bootstrap.Modal(document.getElementById("modalEditarUsuario"));
            modal.show();

            // 🔹 Configurar envío del formulario
            form.onsubmit = async e => {
                e.preventDefault();

                const payload = {
                    aliasusuario: form.querySelector('input[placeholder="Ingresar alias"]').value.trim(),
                    correousuario: form.querySelector('input[placeholder="Ingresar correo"]').value.trim(),
                    numusuario: form.querySelector('input[placeholder="Ingresar teléfono"]').value.trim(),
                    direccionusuario: form.querySelector('input[placeholder="Ingresar dirección"]').value.trim(),
                    idrol: form.querySelector('#selectRolEditar').value
                };

                try {
                    const result = await apiRequest(`/users/${id}`, 'PUT', payload);
                    Swal.fire('✅ Éxito', result.message || 'Usuario actualizado', 'success');
                    modal.hide();
                    loadUsersTable(); // refrescar tabla
                } catch (error) {
                    Swal.fire('❌ Error', error.message || 'Error al actualizar usuario', 'error');
                }
            };

        } catch (err) {
            console.error("Error abriendo modal edición:", err);
            Swal.fire("Error", err.message || "No se pudo abrir el modal", "error");
        }
    }

    /* ============================================================
       🔹 MOSTRAR / OCULTAR CAMPOS (PERSONA / EMPRESA)
    ============================================================ */
    const tipoPersonaRadios = document.querySelectorAll('input[name="tipoPersona"]');
    const camposPersona = document.getElementById("camposPersona");
    const camposEmpresa = document.getElementById("camposEmpresa");

    tipoPersonaRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
            if (radio.value === "persona") {
                camposPersona.classList.remove("d-none");
                camposEmpresa.classList.add("d-none");
            } else {
                camposEmpresa.classList.remove("d-none");
                camposPersona.classList.add("d-none");
            }
        });
    });

    /* ============================================================
       🔹 INICIALIZAR MÓDULO
    ============================================================ */
    await loadRoles();
    await loadUsersTable();
    console.log("✅ Módulo de administración de usuarios inicializado");
});
