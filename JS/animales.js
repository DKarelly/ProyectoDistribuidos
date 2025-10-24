document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM cargado - Inicializando módulo de animales");

    const animalesBody = document.getElementById("animalesBody");
    const buscarAnimalInput = document.getElementById("buscarAnimal");
    const filtroEspecieSelect = document.getElementById("filtroEspecie");
    const formRegistrarAnimal = document.getElementById("formRegistrarAnimal");
    const formEditarAnimal = document.getElementById("formEditarAnimal");

    let animalesData = [];
    let animalActual = null;

    // ==========================
    // Cargar animales
    // ==========================
    async function loadAnimals() {
        try {
            const response = await apiRequest('/animals');
            animalesData = response.data || [];
            displayAnimals(animalesData);
            loadEspecies();
        } catch (error) {
            Swal.fire('Error', 'Error cargando animales: ' + error.message, 'error');
        }
    }

    // Mostrar animales en tabla
    function displayAnimals(animales) {
        if (!animalesBody) return;
        animalesBody.innerHTML = '';

        if (animales.length === 0) {
            animalesBody.innerHTML = '<tr><td colspan="9" class="text-center">No se encontraron animales</td></tr>';
            return;
        }

        animales.forEach(animal => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${animal.idanimal}</td>
                <td>${animal.nombreanimal}</td>
                <td>${animal.especieanimal}</td>
                <td>${animal.razaanimal}</td>
                <td>${animal.edadmesesanimal} meses</td>
                <td>${animal.generoanimal === 'M' ? 'Macho' : 'Hembra'}</td>
                <td>
                    <span class="badge ${animal.estadoanimal === 'disponible' ? 'bg-success' : 'bg-warning'}">
                        ${animal.estadoanimal}
                    </span>
                </td>
                <td>
                    <button class="btn btn-warning btn-sm btn-editar" data-id="${animal.idanimal}">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
                <td>
                    <button class="btn btn-danger btn-sm btn-eliminar" data-id="${animal.idanimal}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            animalesBody.appendChild(tr);
        });

        attachAnimalButtons();
    }

    // Filtrar animales
    function filterAnimals() {
        const query = buscarAnimalInput.value.toLowerCase();
        const especie = filtroEspecieSelect.value;

        const filtered = animalesData.filter(animal => {
            const matchesSearch = animal.nombreanimal.toLowerCase().includes(query) ||
                animal.especieanimal.toLowerCase().includes(query) ||
                animal.razaanimal.toLowerCase().includes(query);
            const matchesEspecie = !especie || animal.especieanimal === especie;
            return matchesSearch && matchesEspecie;
        });

        displayAnimals(filtered);
    }

    // Cargar especies y razas para filtros
    async function loadEspecies() {
        try {
            const response = await apiRequest('/especieRaza/especies');
            const especies = response.data || [];

            // Llenar filtro
            filtroEspecieSelect.innerHTML = '<option value="">Todas las especies</option>';

            // Guardar especies globalmente para filtrado
            window.todasLasEspecies = especies;

            // Separar "Otros" del resto
            const otrasEspecies = especies.filter(especie => especie.especieanimal.toLowerCase() === 'otro');
            const restoEspecies = especies.filter(especie => especie.especieanimal.toLowerCase() !== 'otro');

            // Agregar primero el resto, luego "Otros"
            [...restoEspecies, ...otrasEspecies].forEach(especie => {
                const option = document.createElement('option');
                option.value = especie.especieanimal;
                option.textContent = especie.especieanimal;
                filtroEspecieSelect.appendChild(option);
            });

            // Llenar selects de especies en modales
            const selectRegistrarEspecie = formRegistrarAnimal.querySelector('select');
            const selectEditarEspecie = formEditarAnimal.querySelector('#especieEditarAnimal');

            [selectRegistrarEspecie, selectEditarEspecie].forEach(select => {
                if (select) {
                    const currentValue = select.value;
                    select.innerHTML = '<option value="">Seleccionar especie</option>';

                    // Aplicar el mismo orden: resto primero, "Otros" al final
                    [...restoEspecies, ...otrasEspecies].forEach(especie => {
                        const option = document.createElement('option');
                        option.value = especie.especieanimal;
                        option.textContent = especie.especieanimal;
                        select.appendChild(option);
                    });
                    select.value = currentValue;
                }
            });

            // Cargar razas
            await loadRazas();
        } catch (error) {
            console.error('Error cargando especies:', error);
        }
    }

    // Cargar razas
    async function loadRazas() {
        try {
            const response = await apiRequest('/especieRaza/razas');
            const razas = response.data || [];

            // Guardar todas las razas globalmente para filtrado
            window.todasLasRazas = razas;

            // Llenar selects de razas en modales
            const selectRegistrarRaza = document.getElementById('razaRegistrarAnimal');
            const selectEditarRaza = document.getElementById('razaEditarAnimal');

            [selectRegistrarRaza, selectEditarRaza].forEach(select => {
                if (select) {
                    const currentValue = select.value;
                    select.innerHTML = '<option value="">Seleccionar raza</option>';
                    razas.forEach(raza => {
                        const option = document.createElement('option');
                        option.value = raza.razaanimal;
                        option.textContent = raza.razaanimal;
                        option.dataset.idEspecie = raza.idespecie;
                        select.appendChild(option);
                    });
                    select.value = currentValue;
                }
            });
        } catch (error) {
            console.error('Error cargando razas:', error);
        }
    }

    // Filtrar razas según especie seleccionada
    function filtrarRazasPorEspecie(especieSeleccionada, selectRaza) {
        if (!window.todasLasRazas || !selectRaza) return;

        // Limpiar opciones actuales
        selectRaza.innerHTML = '<option value="">Seleccionar raza</option>';

        // Si no hay especie seleccionada, mostrar todas las razas
        if (!especieSeleccionada) {
            window.todasLasRazas.forEach(raza => {
                const option = document.createElement('option');
                option.value = raza.razaanimal;
                option.textContent = raza.razaanimal;
                option.dataset.idEspecie = raza.idespecie;
                selectRaza.appendChild(option);
            });
            return;
        }

        // Filtrar razas por especie
        const razasFiltradas = window.todasLasRazas.filter(raza =>
            raza.idespecie === parseInt(especieSeleccionada)
        );

        razasFiltradas.forEach(raza => {
            const option = document.createElement('option');
            option.value = raza.razaanimal;
            option.textContent = raza.razaanimal;
            option.dataset.idEspecie = raza.idespecie;
            selectRaza.appendChild(option);
        });
    }

    // Adjuntar eventos a botones
    function attachAnimalButtons() {
        // Botones editar
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                await abrirModalEdicion(id);
            });
        });

        // Botones eliminar
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                Swal.fire({
                    title: '¿Estás seguro?',
                    text: '¿Seguro que deseas eliminar este animal?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            await apiRequest(`/animals/${id}`, { method: 'DELETE' });
                            Swal.fire('Éxito', 'Animal eliminado correctamente', 'success');
                            loadAnimals();
                        } catch (error) {
                            Swal.fire('Error', error.message, 'error');
                        }
                    }
                });
            });
        });
    }

    // Abrir modal de edición
    async function abrirModalEdicion(id) {
        try {
            const response = await apiRequest(`/animals/${id}`);
            const animal = response.data;
            animalActual = animal;

            // Llenar formulario
            document.getElementById('idEditarAnimal').value = animal.idanimal;
            document.getElementById('nombreEditarAnimal').value = animal.nombreanimal;
            document.getElementById('razaEditarAnimal').value = animal.razaanimal;
            document.getElementById('edadEditarAnimal').value = animal.edadmesesanimal;
            document.getElementById('generoEditarAnimal').value = animal.generoanimal;
            document.getElementById('pesoEditarAnimal').value = animal.pesoanimal || '';
            document.getElementById('pelajeEditarAnimal').value = animal.tipopelaje || '';
            document.getElementById('tamanoEditarAnimal').value = animal.tamano || '';
            document.getElementById('descripcionEditarAnimal').value = animal.descripcion || '';

            // Cargar especies y seleccionar la correcta
            await loadEspecies();
            document.getElementById('especieEditarAnimal').value = animal.especieanimal;

            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('modalEditarAnimal'));
            modal.show();

        } catch (error) {
            Swal.fire('Error', 'Error cargando datos del animal: ' + error.message, 'error');
        }
    }

    // Registrar nuevo animal
    async function registrarAnimal() {
        try {
            const formData = new FormData();

            // Datos básicos
            formData.append('nombreanimal', formRegistrarAnimal.querySelector('input[placeholder="Ingresar nombre"]').value.trim());
            formData.append('especieanimal', formRegistrarAnimal.querySelector('select').value.trim());
            formData.append('razaanimal', document.getElementById('razaRegistrarAnimal').value.trim());
            formData.append('edadmesesanimal', parseInt(formRegistrarAnimal.querySelector('input[placeholder="Ingresar edad"]').value));
            formData.append('generoanimal', formRegistrarAnimal.querySelectorAll('select')[1].value.trim());
            formData.append('pesoanimal', parseFloat(formRegistrarAnimal.querySelector('input[placeholder="Ingresar peso"]').value) || null);
            formData.append('tipopelaje', formRegistrarAnimal.querySelectorAll('select')[2].value.trim() || null);
            formData.append('tamano', formRegistrarAnimal.querySelectorAll('select')[3].value.trim() || null);
            formData.append('descripcion', formRegistrarAnimal.querySelector('textarea').value.trim() || null);
            formData.append('estadoanimal', 'disponible');

            // Foto del animal
            const fotoFile = document.getElementById('fotoRegistrarAnimal').files[0];
            if (fotoFile) {
                formData.append('foto', fotoFile);
            }

            // Validaciones
            if (!formData.get('nombreanimal') || !formData.get('especieanimal') || !formData.get('razaanimal') || !formData.get('edadmesesanimal') || !formData.get('generoanimal')) {
                Swal.fire('Advertencia', 'Todos los campos obligatorios deben ser completados', 'warning');
                return;
            }

            // Enviar con FormData para manejar archivos
            const response = await fetch('/api/animals', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error en la petición');
            }

            Swal.fire('Éxito', 'Animal registrado correctamente', 'success');

            // Cerrar modal y limpiar formulario
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalRegistrarAnimal'));
            modal.hide();
            formRegistrarAnimal.reset();

            // Recargar lista
            loadAnimals();

        } catch (error) {
            Swal.fire('Error', 'Error registrando animal: ' + error.message, 'error');
        }
    }

    // Actualizar animal
    async function actualizarAnimal() {
        try {
            if (!animalActual) return;

            const formData = {
                nombreanimal: document.getElementById('nombreEditarAnimal').value.trim(),
                especieanimal: document.getElementById('especieEditarAnimal').value.trim(),
                razaanimal: document.getElementById('razaEditarAnimal').value.trim(),
                edadmesesanimal: parseInt(document.getElementById('edadEditarAnimal').value),
                generoanimal: document.getElementById('generoEditarAnimal').value.trim(),
                pesoanimal: parseFloat(document.getElementById('pesoEditarAnimal').value) || null,
                tipopelaje: document.getElementById('pelajeEditarAnimal').value.trim() || null,
                tamano: document.getElementById('tamanoEditarAnimal').value.trim() || null,
                descripcion: document.getElementById('descripcionEditarAnimal').value.trim() || null
            };

            // Validaciones
            if (!formData.nombreanimal || !formData.especieanimal || !formData.razaanimal || !formData.edadmesesanimal || !formData.generoanimal) {
                Swal.fire('Advertencia', 'Todos los campos obligatorios deben ser completados', 'warning');
                return;
            }

            await apiRequest(`/animals/${animalActual.idanimal}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            Swal.fire('Éxito', 'Animal actualizado correctamente', 'success');

            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarAnimal'));
            modal.hide();

            // Recargar lista
            loadAnimals();

        } catch (error) {
            Swal.fire('Error', 'Error actualizando animal: ' + error.message, 'error');
        }
    }

    // Event listeners
    buscarAnimalInput.addEventListener('input', filterAnimals);
    filtroEspecieSelect.addEventListener('change', filterAnimals);

    // Previsualización de imagen al registrar
    const fotoRegistrarAnimalInput = document.getElementById('fotoRegistrarAnimal');
    const fotoPreviewRegistrarAnimal = document.getElementById('fotoPreviewRegistrarAnimal');
    const fotoPreviewContainer = document.getElementById('fotoPreviewContainer');

    if (fotoRegistrarAnimalInput && fotoPreviewRegistrarAnimal && fotoPreviewContainer) {
        fotoRegistrarAnimalInput.addEventListener('change', function (event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    fotoPreviewRegistrarAnimal.src = e.target.result;
                    fotoPreviewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                fotoPreviewRegistrarAnimal.src = '#';
                fotoPreviewContainer.style.display = 'none';
            }
        });
    }

    // Filtrar razas cuando cambie la especie en el modal de registrar
    const selectRegistrarEspecie = formRegistrarAnimal.querySelector('select');
    const selectRegistrarRaza = document.getElementById('razaRegistrarAnimal');

    if (selectRegistrarEspecie && selectRegistrarRaza) {
        selectRegistrarEspecie.addEventListener('change', function () {
            const especieSeleccionada = this.value;
            // Buscar el ID de la especie seleccionada
            const especie = window.todasLasEspecies?.find(esp => esp.especieanimal === especieSeleccionada);
            filtrarRazasPorEspecie(especie?.idespecie, selectRegistrarRaza);
        });
    }

    // Filtrar razas cuando cambie la especie en el modal de editar
    const selectEditarEspecie = document.getElementById('especieEditarAnimal');
    const selectEditarRaza = document.getElementById('razaEditarAnimal');

    if (selectEditarEspecie && selectEditarRaza) {
        selectEditarEspecie.addEventListener('change', function () {
            const especieSeleccionada = this.value;
            // Buscar el ID de la especie seleccionada
            const especie = window.todasLasEspecies?.find(esp => esp.especieanimal === especieSeleccionada);
            filtrarRazasPorEspecie(especie?.idespecie, selectEditarRaza);
        });
    }

    // Hacer funciones globales
    window.registrarAnimal = registrarAnimal;
    window.actualizarAnimal = actualizarAnimal;

    // ============================================================
    // INICIALIZAR
    // ============================================================
    await loadAnimals();
    console.log("Módulo de administración de animales inicializado");
});
