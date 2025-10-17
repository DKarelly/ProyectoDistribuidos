document.addEventListener("DOMContentLoaded", () => {
    // ==========================
    // Modales y elementos
    // ==========================
    const modalEditarElement = document.getElementById("modalEditarUsuario");
    const modalEditar = new bootstrap.Modal(modalEditarElement);
    const modalRegistrarElement = document.getElementById("modalRegistrarUsuario");
    const modalRegistrar = new bootstrap.Modal(modalRegistrarElement);

    const camposPersona = document.getElementById("camposPersona");
    const camposEmpresa = document.getElementById("camposEmpresa");
    const radios = document.getElementsByName("tipoPersona");

    const tablaUsuarios = document.getElementById("tablaUsuarios");
    let datosGuardados = false;

    // ==========================
    // Cargar roles desde backend
    // ==========================
    async function loadRoles() {
        try {
            const response = await apiRequest('/roles');
            const roles = (response.data || []).map(r => ({
                idRol: r.idrol,
                rolUsuario: r.rolusuario
            }));

            const selectRegistrar = document.getElementById('selectRolRegistrar');
            const selectEditar = document.getElementById('selectRolEditar');
            [selectRegistrar, selectEditar].forEach(select => {
                if (select) {
                    select.innerHTML = '<option value="">Seleccione rol</option>';
                    roles.forEach(r => {
                        const option = document.createElement('option');
                        option.value = r.idRol;
                        option.textContent = r.rolUsuario;
                        select.appendChild(option);
                    });
                }
            });
        } catch (error) {
            console.error('Error cargando roles:', error);
        }
    }

    // ==========================
    // Cargar tabla de usuarios
    // ==========================
    async function loadUsersTable() {
        if (!tablaUsuarios) return;
        try {
            const response = await apiRequest('/usuarios');
            const users = (response.data || []).map(u => ({
                idUsuario: u.idusuario,
                aliasUsuario: u.aliasusuario,
                correoUsuario: u.correousuario,
                numUsuario: u.numusuario,
                direccionUsuario: u.direccionusuario,
                rolUsuario: u.rolusuario,
                idRol: u.idrol
            }));

            const tbody = document.getElementById('usuariosBody');
            tbody.innerHTML = '';

            users.forEach(u => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${u.idUsuario}</td>
                    <td>${u.aliasUsuario}</td>
                    <td>${u.correoUsuario}</td>
                    <td>${u.numUsuario}</td>
                    <td>${u.direccionUsuario}</td>
                    <td>${u.rolUsuario}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-editar" data-id="${u.idUsuario}">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-eliminar" data-id="${u.idUsuario}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error cargando usuarios:', err);
        }
    }

    // ==========================
    // Abrir modal editar usuario
    // ==========================
    if (tablaUsuarios) {
        tablaUsuarios.addEventListener("click", async (e) => {
            const btn = e.target.closest(".btn-editar");
            if (!btn) return;

            const id = btn.dataset.id;
            datosGuardados = false;

            radios.forEach(r => r.checked = false);
            camposPersona?.classList.add("d-none");
            camposEmpresa?.classList.add("d-none");

            try {
                const response = await apiRequest(`/usuarios/${id}`);
                const u = response.data;

                const form = document.getElementById('formEditarUsuario');
                form.elements[0].value = u.idUsuario;
                form.elements[1].value = u.aliasUsuario;
                form.elements[2].value = u.correoUsuario;
                form.elements[3].value = u.numUsuario;
                form.elements[4].value = u.direccionUsuario;
                if (form.elements[5]) form.elements[5].value = u.idRol;

                modalEditar.show();
            } catch (err) {
                alert('Error al cargar usuario: ' + err.message);
            }
        });
    }

    // ==========================
    // Cambiar campos según tipo persona
    // ==========================
    radios.forEach(radio => {
        radio.addEventListener("change", () => {
            if (radio.value === "persona" && radio.checked) {
                camposPersona?.classList.remove("d-none");
                camposEmpresa?.classList.add("d-none");
            } else if (radio.value === "empresa" && radio.checked) {
                camposEmpresa?.classList.remove("d-none");
                camposPersona?.classList.add("d-none");
            }
        });
    });

    document.addEventListener("click", () => {
        const personaSeleccionada = document.getElementById("tipoPersona1")?.checked;
        const empresaSeleccionada = document.getElementById("tipoPersona2")?.checked;
        if (!personaSeleccionada && !empresaSeleccionada) {
            camposPersona?.classList.add("d-none");
            camposEmpresa?.classList.add("d-none");
        }
    });

    // ==========================
    // Editar usuario
    // ==========================
    document.getElementById("formEditarUsuario").addEventListener("submit", async e => {
        e.preventDefault();
        const form = e.target;

        const data = {
            aliasusuario: form.elements[1].value.trim(),
            correousuario: form.elements[2].value.trim(),
            numusuario: form.elements[3].value.trim(),
            direccionusuario: form.elements[4].value.trim(),
            idrol: parseInt(form.elements[5].value)
        };

        try {
            await apiRequest(`/usuarios/${form.elements[0].value}`, { method: 'PUT', body: JSON.stringify(data) });
            alert("Usuario actualizado correctamente.");
            datosGuardados = true;
            modalEditar.hide();
            loadUsersTable();
        } catch (err) {
            alert("Error al actualizar usuario: " + err.message);
        }
    });

    modalEditarElement.addEventListener("hide.bs.modal", (event) => {
        if (!datosGuardados) {
            const confirmar = confirm("¿Estás seguro de cerrar sin guardar?");
            if (!confirmar) event.preventDefault();
        }
    });

    // ==========================
    // Registrar usuario
    // ==========================
    const formRegistrarUsuario = document.getElementById('formRegistrarUsuario');
    if (formRegistrarUsuario) {
        formRegistrarUsuario.addEventListener('submit', async e => {
            e.preventDefault();
            const form = formRegistrarUsuario;

            const data = {
                aliasusuario: form.elements[0].value.trim(),
                correousuario: form.elements[1].value.trim(),
                claveusuario: form.elements[2].value.trim(),
                numusuario: form.elements[3].value.trim(),
                direccionusuario: form.elements[4].value.trim(),
                idrol: parseInt(form.elements[5].value)
            };

            if (!data.aliasusuario || !data.correousuario || !data.claveusuario || !data.idrol) {
                return alert('Completa todos los campos obligatorios');
            }

            try {
                await apiRequest('/usuarios', { method: 'POST', body: JSON.stringify(data) });
                alert('Usuario registrado correctamente.');
                modalRegistrar.hide();
                form.reset();
                loadUsersTable();
            } catch (err) {
                alert('Error al registrar: ' + err.message);
            }
        });
    }

    // ==========================
    // Eliminar usuario
    // ==========================
    if (tablaUsuarios) {
        tablaUsuarios.addEventListener("click", async (e) => {
            const btn = e.target.closest(".btn-eliminar");
            if (!btn) return;

            const id = btn.dataset.id;
            const confirmar = confirm(`¿Eliminar usuario con ID ${id}?`);
            if (!confirmar) return;

            try {
                await apiRequest(`/usuarios/${id}`, { method: 'DELETE' });
                alert("Usuario eliminado correctamente.");
                loadUsersTable();
            } catch (err) {
                alert("Error al eliminar: " + err.message);
            }
        });
    }

    // ==========================
    // Filtro dinámico en la tabla
    // ==========================
    const inputBuscar = document.getElementById('buscarUsuario');
    if (inputBuscar) {
        inputBuscar.addEventListener('input', () => {
            const filtro = inputBuscar.value.toLowerCase();
            const filas = document.querySelectorAll('#usuariosBody tr');

            filas.forEach(fila => {
                const alias = fila.cells[1].textContent.toLowerCase();
                const rol = fila.cells[5].textContent.toLowerCase();
                fila.style.display = alias.includes(filtro) || rol.includes(filtro) ? '' : 'none';
            });
        });
    }

    // ==========================
    // Inicialización
    // ==========================
    loadRoles();
    loadUsersTable();
});
