document.addEventListener('DOMContentLoaded', () => {
    const rolesBody = document.getElementById('rolesBody');
    const buscarRolInput = document.getElementById('buscarRol');
    const formEditarRol = document.getElementById('formEditarRol');
    const formRegistrarRol = document.getElementById('formRegistrarRol');

    let rolesData = [];
    let rolActual = null;

    // ==========================
    // Cargar roles
    // ==========================
    async function loadRoles() {
        try {
            const response = await apiRequest('/roles'); // ✅ ruta correcta
            rolesData = (response.data || []).map(r => ({
                idRol: r.idrol,
                rolUsuario: r.rolusuario
            }));
            displayRoles(rolesData);
        } catch (error) {
            Swal.fire('Error', 'Error cargando roles: ' + error.message, 'error');
        }
    }

    // Mostrar roles en tabla
    function displayRoles(roles) {
        if (!rolesBody) return;
        rolesBody.innerHTML = '';

        if (roles.length === 0) {
            rolesBody.innerHTML = '<tr><td colspan="4" class="text-center">No se encontraron roles</td></tr>';
            return;
        }

        roles.forEach(rol => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${rol.idRol}</td>
                <td>${rol.rolUsuario}</td>
                <td>
                    <button class="btn btn-warning btn-sm btn-editar" data-id="${rol.idRol}">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
                <td>
                    <button class="btn btn-danger btn-sm btn-eliminar" data-id="${rol.idRol}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            rolesBody.appendChild(tr);
        });

        attachRoleButtons();
    }

    // Filtrar roles
    function filterRoles() {
        const query = buscarRolInput.value.toLowerCase();
        const filtered = rolesData.filter(r => r.rolUsuario.toLowerCase().includes(query));
        displayRoles(filtered);
    }

    // Adjuntar eventos
    function attachRoleButtons() {
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                rolActual = rolesData.find(r => r.idRol === id);
                if (rolActual) openEditarRolModal(rolActual);
            });
        });

        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                Swal.fire({
                    title: '¿Estás seguro?',
                    text: '¿Seguro que deseas eliminar este rol?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            await apiRequest(`/roles/${id}`, { method: 'DELETE' });
                            Swal.fire('Éxito', 'Rol eliminado correctamente', 'success');
                            loadRoles();
                        } catch (error) {
                            Swal.fire('Error', error.message, 'error');
                        }
                    }
                });
            });
        });
    }

    // Abrir modal de edición
    function openEditarRolModal(rol) {
        const modal = new bootstrap.Modal(document.getElementById('modalEditarRol'));
        formEditarRol.elements[0].value = rol.idRol;
        formEditarRol.elements[1].value = rol.rolUsuario;
        modal.show();
    }

    // Guardar edición
    if (formEditarRol) {
        formEditarRol.addEventListener('submit', async e => {
            e.preventDefault();
            if (!rolActual) return;
            const nuevoNombre = formEditarRol.elements[1].value.trim();
            if (!nuevoNombre) return Swal.fire('Advertencia', 'El nombre del rol no puede estar vacío', 'warning');

            try {
                await apiRequest(`/roles/${rolActual.idRol}`, {
                    method: 'PUT',
                    body: JSON.stringify({ rolusuario: nuevoNombre })
                });
                Swal.fire('Éxito', 'Rol actualizado correctamente', 'success');
                bootstrap.Modal.getInstance(document.getElementById('modalEditarRol')).hide();
                loadRoles();
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            }
        });
    }

    // Registrar nuevo rol
    if (formRegistrarRol) {
        formRegistrarRol.addEventListener('submit', async e => {
            e.preventDefault();
            const nombreRol = formRegistrarRol.elements[0].value.trim();
            if (!nombreRol) return Swal.fire('Advertencia', 'El nombre del rol es obligatorio', 'warning');

            try {
                await apiRequest('/roles', {
                    method: 'POST',
                    body: JSON.stringify({ rolusuario: nombreRol })
                });
                Swal.fire('Éxito', 'Rol registrado correctamente', 'success');
                bootstrap.Modal.getInstance(document.getElementById('modalRegistrarRol')).hide();
                formRegistrarRol.reset();
                loadRoles();
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            }
        });
    }

    if (buscarRolInput) buscarRolInput.addEventListener('input', filterRoles);

    loadRoles();
});