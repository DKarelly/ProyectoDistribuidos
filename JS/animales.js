document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM cargado - Inicializando módulo de animales");

    // Importar variables necesarias desde codigo.js
    const API_BASE_URL = window.location.origin + '/api';
    const authToken = localStorage.getItem('authToken');

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

        const badge = document.getElementById('badgeAnimales');
        if (badge) {
            badge.style.display = 'inline-block';
            badge.textContent = `${animales.length} registros`;
        }

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
            // Usar fetch directamente como en la página que funciona
            const response = await fetch(window.location.origin + '/api/especieRaza/especies', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Error cargando especies: ' + response.status);
            }

            const data = await response.json();
            const especies = data.data || [];
            console.log('Especies obtenidas de la API:', especies);
            console.log('Primera especie (ejemplo):', especies[0]);
            if (especies[0]) {
                console.log('Campos de la primera especie:', Object.keys(especies[0]));
                console.log('idEspecie:', especies[0].idEspecie);
                console.log('idEspecie (alternativo):', especies[0].idespecie);
                console.log('especieAnimal:', especies[0].especieAnimal);
            }

            // Llenar filtro
            filtroEspecieSelect.innerHTML = '<option value="">Todas las especies</option>';

            // Guardar especies globalmente para filtrado
            window.todasLasEspecies = especies;
            console.log('Especies guardadas globalmente:', window.todasLasEspecies);

            // Separar "Otros" del resto
            const otrasEspecies = especies.filter(especie =>
                (especie.especieAnimal || especie.especieanimal).toLowerCase() === 'otro'
            );
            const restoEspecies = especies.filter(especie =>
                (especie.especieAnimal || especie.especieanimal).toLowerCase() !== 'otro'
            );

            // Agregar primero el resto, luego "Otros"
            [...restoEspecies, ...otrasEspecies].forEach(especie => {
                const option = document.createElement('option');
                // Manejar tanto idEspecie como idespecie (PostgreSQL puede devolver en minúsculas)
                const especieId = especie.idEspecie || especie.idespecie;
                option.value = especieId;
                option.textContent = especie.especieAnimal || especie.especieanimal;
                filtroEspecieSelect.appendChild(option);
            });

            // Llenar selects de especies en modales
            const selectRegistrarEspecie = document.getElementById('especieRegistrarAnimal');
            const selectEditarEspecie = document.getElementById('especieEditarAnimal');

            console.log('Select registrar especie encontrado:', selectRegistrarEspecie);
            console.log('Select editar especie encontrado:', selectEditarEspecie);

            [selectRegistrarEspecie, selectEditarEspecie].forEach(select => {
                if (select) {
                    const currentValue = select.value;
                    select.innerHTML = '<option value="">Seleccionar especie</option>';

                    console.log('Llenando select con especies:', [...restoEspecies, ...otrasEspecies].length, 'especies');

                    // Aplicar el mismo orden: resto primero, "Otros" al final
                    [...restoEspecies, ...otrasEspecies].forEach(especie => {
                        const option = document.createElement('option');
                        // Manejar tanto idEspecie como idespecie (PostgreSQL puede devolver en minúsculas)
                        const especieId = especie.idEspecie || especie.idespecie;
                        option.value = especieId;
                        option.textContent = especie.especieAnimal || especie.especieanimal;
                        select.appendChild(option);
                        console.log('Agregada especie:', especie.especieAnimal || especie.especieanimal, 'con ID:', especieId);
                    });
                    select.value = currentValue;
                    console.log('Select llenado, opciones disponibles:', select.options.length);
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
            // Usar fetch directamente como en la página que funciona
            const response = await fetch(window.location.origin + '/api/especieRaza/razas', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Error cargando razas: ' + response.status);
            }

            const data = await response.json();
            const razas = data.data || [];

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

    // Variables para manejar eliminaciones pendientes
    let mediosEliminadosPendientes = [];
    let mediosOriginales = [];

    // Función para restaurar medios eliminados
    function restaurarMediosEliminados() {
        console.log('Restaurando medios eliminados...');

        // Limpiar array de eliminaciones pendientes
        mediosEliminadosPendientes = [];

        // Recargar medios originales
        if (animalActual) {
            cargarMediosExistentes(animalActual.idanimal);
        }
    }

    // Cargar medios existentes para edición
    async function cargarMediosExistentes(idAnimal) {
        try {
            const response = await apiRequest(`/animals/${idAnimal}`);
            const animal = response.data;
            const mediosContainer = document.getElementById('mediosExistentes');

            if (!mediosContainer) return;

            // Limpiar arrays de control
            mediosEliminadosPendientes = [];
            mediosOriginales = animal.galeria ? [...animal.galeria] : [];

            mediosContainer.innerHTML = '';

            if (animal.galeria && animal.galeria.length > 0) {
                console.log('Medios cargados:', animal.galeria);
                animal.galeria.forEach(media => {
                    console.log('Procesando medio:', media);
                    const col = document.createElement('div');
                    col.className = 'col-md-3 col-sm-4 col-6';

                    const card = document.createElement('div');
                    card.className = 'card mb-2';
                    card.style.position = 'relative';

                    const cardBody = document.createElement('div');
                    cardBody.className = 'card-body p-2 text-center';

                    if (media.imagen) {
                        const img = document.createElement('img');
                        img.className = 'img-thumbnail';
                        img.style.maxWidth = '100px';
                        img.style.maxHeight = '100px';
                        img.style.objectFit = 'cover';
                        img.src = `/files/${media.imagen}`;
                        cardBody.appendChild(img);
                    }

                    if (media.video) {
                        const video = document.createElement('video');
                        video.className = 'img-thumbnail';
                        video.style.maxWidth = '100px';
                        video.style.maxHeight = '100px';
                        video.style.objectFit = 'cover';
                        video.controls = true;
                        video.muted = true;
                        video.src = `/files/${media.video}`;
                        cardBody.appendChild(video);
                    }

                    // Botón para eliminar medio
                    const deleteBtn = document.createElement('button');
                    deleteBtn.type = 'button';
                    deleteBtn.className = 'btn btn-sm btn-danger position-absolute';
                    deleteBtn.style.top = '5px';
                    deleteBtn.style.right = '5px';
                    deleteBtn.style.padding = '2px 6px';
                    deleteBtn.innerHTML = '×';
                    deleteBtn.addEventListener('click', async function (event) {
                        event.preventDefault();
                        event.stopPropagation();

                        const result = await Swal.fire({
                            title: '¿Estás seguro?',
                            text: '¿Quieres eliminar este medio?',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#d33',
                            cancelButtonColor: '#3085d6',
                            confirmButtonText: 'Sí, eliminar',
                            cancelButtonText: 'Cancelar'
                        });

                        if (result.isConfirmed) {
                            // Marcar como eliminado pendiente (no eliminar del servidor aún)
                            console.log('Marcando para eliminación - ID:', media.idgaleria, 'Media:', media);
                            mediosEliminadosPendientes.push(media.idgaleria);

                            // Ocultar el elemento con animación
                            col.style.opacity = '0.3';
                            col.style.transform = 'scale(0.95)';
                            col.style.transition = 'all 0.3s ease';

                            setTimeout(() => {
                                col.style.display = 'none';
                            }, 300);

                            // Agregar indicador visual de eliminación pendiente
                            const pendingIndicator = document.createElement('div');
                            pendingIndicator.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
                            pendingIndicator.style.background = 'rgba(220, 53, 69, 0.8)';
                            pendingIndicator.style.borderRadius = '0.375rem';
                            pendingIndicator.innerHTML = '<span class="text-white fw-bold">PENDIENTE DE ELIMINACIÓN</span>';
                            card.appendChild(pendingIndicator);

                            Swal.fire('Info', 'Medio marcado para eliminación. Se eliminará al actualizar el animal.', 'info');
                        }
                    });

                    // Nombre del archivo
                    const fileName = document.createElement('small');
                    fileName.className = 'd-block text-muted mt-1';
                    const fileNameText = media.imagen || media.video;
                    fileName.textContent = fileNameText.length > 15 ? fileNameText.substring(0, 15) + '...' : fileNameText;
                    fileName.title = fileNameText;

                    cardBody.appendChild(fileName);
                    card.appendChild(cardBody);
                    card.appendChild(deleteBtn);
                    col.appendChild(card);
                    mediosContainer.appendChild(col);
                });
            } else {
                mediosContainer.innerHTML = '<div class="col-12"><p class="text-muted">No hay medios asociados a este animal.</p></div>';
            }
        } catch (error) {
            console.error('Error cargando medios existentes:', error);
        }
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
            document.getElementById('pelajeEditarAnimal').value = animal.pelaje || '';
            document.getElementById('tamanoEditarAnimal').value = animal.tamano || animal.tamaño || '';
            document.getElementById('descripcionEditarAnimal').value = animal.descripcion || '';

            // Cargar especies y seleccionar la correcta
            await loadEspecies();
            // Buscar el ID de la especie por nombre
            const especieEncontrada = window.todasLasEspecies.find(esp =>
                (esp.especieAnimal || esp.especieanimal) === animal.especieanimal
            );
            if (especieEncontrada) {
                const especieId = especieEncontrada.idEspecie || especieEncontrada.idespecie;
                document.getElementById('especieEditarAnimal').value = especieId;
            }

            // Cargar medios existentes
            await cargarMediosExistentes(animal.idanimal);

            // Inicializar manejo de nuevos medios
            inicializarNuevosMediosEdicion();

            // Agregar event listener para cancelar
            const modalElement = document.getElementById('modalEditarAnimal');
            const cancelBtn = modalElement.querySelector('button[data-bs-dismiss="modal"]');

            if (cancelBtn) {
                cancelBtn.addEventListener('click', function () {
                    // Restaurar medios al cancelar
                    restaurarMediosEliminados();
                    // Limpiar nuevos medios seleccionados
                    nuevosMediosSeleccionados = [];
                    actualizarPrevisualizacionNuevosMedios();
                });
            }

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
            formData.append('nombreAnimal', formRegistrarAnimal.querySelector('input[placeholder="Ingresar nombre"]').value.trim());

            // Obtener el nombre de la especie por ID
            const especieId = document.getElementById('especieRegistrarAnimal').value.trim();
            const especieEncontrada = window.todasLasEspecies.find(esp =>
                (esp.idEspecie || esp.idespecie) == especieId
            );
            const nombreEspecie = especieEncontrada ? (especieEncontrada.especieAnimal || especieEncontrada.especieanimal) : '';
            formData.append('especie', nombreEspecie);

            // Obtener el nombre de la raza por ID
            const razaId = document.getElementById('razaRegistrarAnimal').value.trim();
            const razaEncontrada = window.todasLasRazas ? window.todasLasRazas.find(raza =>
                (raza.idRaza || raza.idraza) == razaId
            ) : null;
            const nombreRaza = razaEncontrada ? (razaEncontrada.razaAnimal || razaEncontrada.razaanimal) : '';
            formData.append('raza', nombreRaza);
            const edadMesesInput = formRegistrarAnimal.querySelector('input[placeholder="Ingresar edad"]').value;
            const edadMesesParsed = parseInt(edadMesesInput);
            if (isNaN(edadMesesParsed) || edadMesesParsed < 0) {
                Swal.fire('Error', 'La edad en meses debe ser un número mayor o igual a 0', 'error');
                return;
            }
            formData.append('edadMeses', edadMesesParsed);
            // Obtener género del select (ya está en formato BD: M/F)
            const generoValue = formRegistrarAnimal.querySelectorAll('select')[2].value.trim();
            formData.append('genero', generoValue);
            const pesoInput = formRegistrarAnimal.querySelector('input[placeholder="Ingresar peso"]').value;
            const pesoParsed = pesoInput === '' ? null : parseFloat(pesoInput);
            if (pesoParsed !== null && (isNaN(pesoParsed) || pesoParsed < 0)) {
                Swal.fire('Error', 'El peso debe ser un número mayor o igual a 0', 'error');
                return;
            }
            formData.append('peso', pesoParsed);
            formData.append('pelaje', formRegistrarAnimal.querySelectorAll('select')[3].value.trim() || null);
            // Obtener tamaño del select específico
            const tamañoSelect = document.getElementById('tamanoRegistrarAnimal');
            const tamañoValue = tamañoSelect ? tamañoSelect.value.trim() : '';
            console.log('=== DEBUG TAMAÑO ===');
            console.log('Select de tamaño encontrado:', tamañoSelect);
            console.log('Valor de tamaño seleccionado:', tamañoValue);
            console.log('Opciones disponibles:', tamañoSelect ? Array.from(tamañoSelect.options).map(opt => ({ value: opt.value, text: opt.textContent })) : 'No encontrado');
            // Enviar ambas claves por compatibilidad
            formData.append('tamaño', tamañoValue || '');
            formData.append('tamano', tamañoValue || '');

            // Campos de enfermedad
            const enfermedadId = document.getElementById('enfermedadRegistrarAnimal').value;
            const gravedad = document.getElementById('gravedadRegistrarAnimal').value;
            const medicinas = document.getElementById('medicinasRegistrarAnimal').value;

            formData.append('enfermedadId', enfermedadId || null);
            formData.append('gravedad', gravedad || null);
            formData.append('medicinas', medicinas || null);
            formData.append('descripcion', formRegistrarAnimal.querySelector('textarea').value.trim() || null);

            // Debug: Mostrar todos los valores del FormData
            console.log('=== DATOS DEL FORMULARIO ===');
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }

            // Archivos del animal (usando archivos acumulados)
            console.log('Archivos acumulados a enviar:', archivosSeleccionados.length);
            console.log('Detalles de archivos:', archivosSeleccionados.map(f => ({ name: f.name, type: f.type, size: f.size })));

            if (archivosSeleccionados.length > 0) {
                // Separar imágenes y videos de los archivos acumulados
                let imagenesCount = 0;
                let videosCount = 0;

                for (let i = 0; i < archivosSeleccionados.length; i++) {
                    const file = archivosSeleccionados[i];
                    if (file.type.startsWith('image/')) {
                        formData.append('imagenAnimal', file);
                        imagenesCount++;
                        console.log('Imagen agregada:', file.name, 'Tipo:', file.type);
                    } else if (file.type.startsWith('video/')) {
                        formData.append('videoAnimal', file);
                        videosCount++;
                        console.log('Video agregado:', file.name, 'Tipo:', file.type);
                    }
                }

                console.log(`Total archivos en FormData: ${imagenesCount} imágenes, ${videosCount} videos`);
            }

            // Validaciones
            if (!formData.get('nombreAnimal') || !formData.get('especie') || !formData.get('raza') || !formData.get('edadMeses') || !formData.get('genero')) {
                Swal.fire('Advertencia', 'Todos los campos obligatorios deben ser completados', 'warning');
                return;
            }

            // Verificar que al menos haya un archivo
            if (archivosSeleccionados.length === 0) {
                Swal.fire('Advertencia', 'Debe seleccionar al menos un archivo (imagen o video)', 'warning');
                return;
            }

            // Validar que el género sea válido (M o F)
            if (generoValue !== 'M' && generoValue !== 'F') {
                Swal.fire('Error', 'Debe seleccionar un género válido', 'error');
                return;
            }

            // Enviar con FormData para manejar archivos
            const response = await fetch(window.location.origin + '/api/animals/agregar', {
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

            // Limpiar archivos seleccionados y previsualización
            archivosSeleccionados = [];
            actualizarPrevisualizacion();

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

            // Obtener el nombre de la especie por ID
            const especieId = document.getElementById('especieEditarAnimal').value;
            const especieEncontrada = window.todasLasEspecies.find(esp =>
                (esp.idEspecie || esp.idespecie) == especieId
            );
            const nombreEspecie = especieEncontrada ? (especieEncontrada.especieAnimal || especieEncontrada.especieanimal) : '';

            const formData = {
                nombreanimal: document.getElementById('nombreEditarAnimal').value.trim(),
                especieanimal: nombreEspecie,
                razaanimal: document.getElementById('razaEditarAnimal').value.trim(),
                edadmesesanimal: parseInt(document.getElementById('edadEditarAnimal').value),
                generoanimal: document.getElementById('generoEditarAnimal').value.trim(),
                pesoanimal: (function(){
                    const v = document.getElementById('pesoEditarAnimal').value;
                    if (v === '') return null;
                    const n = parseFloat(v);
                    return isNaN(n) ? null : n;
                })(),
                pelaje: document.getElementById('pelajeEditarAnimal').value.trim() || null,
                tamaño: document.getElementById('tamanoEditarAnimal').value.trim() || null,
                descripcion: document.getElementById('descripcionEditarAnimal').value.trim() || null
            };

            // Validaciones
            if (!formData.nombreanimal || !formData.especieanimal || !formData.razaanimal || isNaN(formData.edadmesesanimal) || !formData.generoanimal) {
                Swal.fire('Advertencia', 'Todos los campos obligatorios deben ser completados', 'warning');
                return;
            }
            if (formData.edadmesesanimal < 0) {
                Swal.fire('Error', 'La edad en meses debe ser mayor o igual a 0', 'error');
                return;
            }
            if (formData.pesoanimal !== null && formData.pesoanimal < 0) {
                Swal.fire('Error', 'El peso debe ser mayor o igual a 0', 'error');
                return;
            }

            await apiRequest(`/animals/${animalActual.idanimal}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            // Eliminar medios marcados para eliminación
            if (mediosEliminadosPendientes.length > 0) {
                console.log('Eliminando medios pendientes:', mediosEliminadosPendientes);
                for (const mediaId of mediosEliminadosPendientes) {
                    try {
                        await apiRequest(`/animals/${animalActual.idanimal}/media/${mediaId}`, { method: 'DELETE' });
                        console.log('Medio eliminado:', mediaId);
                    } catch (error) {
                        console.error('Error eliminando medio:', error);
                    }
                }
            }

            // Subir nuevos medios si hay alguno seleccionado
            if (nuevosMediosSeleccionados.length > 0) {
                console.log('Subiendo nuevos medios:', nuevosMediosSeleccionados.length);
                console.log('Archivos a subir:', nuevosMediosSeleccionados);
                const formData = new FormData();

                // Agregar todos los nuevos archivos
                nuevosMediosSeleccionados.forEach((archivo, index) => {
                    console.log(`Agregando archivo ${index}:`, archivo.name, archivo.type, archivo.size);
                    formData.append('imagenAnimal', archivo);
                });

                try {
                    // Usar fetch directamente para FormData (sin Content-Type manual)
                    const url = `${API_BASE_URL}/animals/${animalActual.idanimal}/media`;
                    console.log('URL de subida:', url);
                    console.log('Token de autenticación:', authToken ? 'Presente' : 'Ausente');

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${authToken}`
                            // No establecer Content-Type para que el navegador lo haga automáticamente
                        },
                        body: formData
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Error subiendo medios');
                    }

                    const result = await response.json();
                    console.log('Nuevos medios subidos exitosamente:', result);
                } catch (error) {
                    console.error('Error subiendo nuevos medios:', error);
                    Swal.fire('Advertencia', 'Error subiendo nuevos medios: ' + error.message, 'warning');
                }
            }

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

    // ==========================
    // Manejo de nuevos medios en modal de edición
    // ==========================
    let nuevosMediosSeleccionados = []; // Array para almacenar nuevos archivos seleccionados

    // Función para inicializar el manejo de nuevos medios en el modal de edición
    function inicializarNuevosMediosEdicion() {
        const nuevosMediosInput = document.getElementById('nuevosMediosEditar');
        const nuevosMediosPreview = document.getElementById('nuevosMediosPreview');
        const nuevosMediosGrid = document.getElementById('nuevosMediosGrid');

        if (nuevosMediosInput && nuevosMediosPreview && nuevosMediosGrid) {
            // Limpiar array al abrir modal
            nuevosMediosSeleccionados = [];

            nuevosMediosInput.addEventListener('change', function (event) {
                const nuevosArchivos = Array.from(event.target.files);
                console.log('Nuevos archivos seleccionados para edición:', nuevosArchivos.length);

                // Agregar nuevos archivos a la lista existente
                nuevosMediosSeleccionados = nuevosMediosSeleccionados.concat(nuevosArchivos);
                console.log('Total de nuevos archivos acumulados:', nuevosMediosSeleccionados.length);

                // Limpiar el input para permitir selecciones futuras
                event.target.value = '';

                // Actualizar la previsualización
                actualizarPrevisualizacionNuevosMedios();
            });
        }
    }

    // Función para actualizar la previsualización de nuevos medios
    function actualizarPrevisualizacionNuevosMedios() {
        const nuevosMediosPreview = document.getElementById('nuevosMediosPreview');
        const nuevosMediosGrid = document.getElementById('nuevosMediosGrid');

        if (!nuevosMediosPreview || !nuevosMediosGrid) return;

        if (nuevosMediosSeleccionados.length === 0) {
            nuevosMediosPreview.style.display = 'none';
            return;
        }

        // Mostrar contenedor
        nuevosMediosPreview.style.display = 'block';

        // Limpiar grid anterior
        nuevosMediosGrid.innerHTML = '';

        // Crear previsualizaciones
        nuevosMediosSeleccionados.forEach((archivo, index) => {
            const col = document.createElement('div');
            col.className = 'col-md-4 col-sm-6';

            const card = document.createElement('div');
            card.className = 'card position-relative';
            card.style.height = '150px';

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body p-2 d-flex align-items-center justify-content-center';
            cardBody.style.height = '100%';

            if (archivo.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.className = 'img-fluid rounded';
                img.style.maxHeight = '120px';
                img.style.maxWidth = '100%';
                img.style.objectFit = 'cover';
                img.src = URL.createObjectURL(archivo);
                cardBody.appendChild(img);
            } else if (archivo.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.className = 'img-fluid rounded';
                video.style.maxHeight = '120px';
                video.style.maxWidth = '100%';
                video.style.objectFit = 'cover';
                video.controls = true;
                video.muted = true;
                video.src = URL.createObjectURL(archivo);
                cardBody.appendChild(video);
            }

            // Botón para eliminar archivo
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn btn-sm btn-danger position-absolute';
            deleteBtn.style.top = '5px';
            deleteBtn.style.right = '5px';
            deleteBtn.style.padding = '2px 6px';
            deleteBtn.innerHTML = '×';
            deleteBtn.addEventListener('click', function () {
                // Remover archivo del array
                nuevosMediosSeleccionados.splice(index, 1);
                // Actualizar previsualización
                actualizarPrevisualizacionNuevosMedios();
            });

            card.appendChild(cardBody);
            card.appendChild(deleteBtn);

            // Nombre del archivo
            const fileName = document.createElement('small');
            fileName.className = 'd-block text-muted mt-1 text-center';
            fileName.textContent = archivo.name.length > 15 ? archivo.name.substring(0, 15) + '...' : archivo.name;

            col.appendChild(card);
            col.appendChild(fileName);
            nuevosMediosGrid.appendChild(col);
        });
    }

    // ==========================
    // Manejo de archivos múltiples con selección acumulativa
    // ==========================
    let archivosSeleccionados = []; // Array para almacenar todos los archivos seleccionados

    const fotoRegistrarAnimalInput = document.getElementById('fotoRegistrarAnimal');
    const previewType = document.getElementById('previewType');
    const fotoPreviewContainer = document.getElementById('fotoPreviewContainer');
    const previewGrid = document.getElementById('previewGrid');

    if (fotoRegistrarAnimalInput && previewType && fotoPreviewContainer && previewGrid) {
        fotoRegistrarAnimalInput.addEventListener('change', function (event) {
            const nuevosArchivos = Array.from(event.target.files);
            console.log('Nuevos archivos seleccionados:', nuevosArchivos.length);

            // Agregar nuevos archivos a la lista existente
            archivosSeleccionados = archivosSeleccionados.concat(nuevosArchivos);
            console.log('Total de archivos acumulados:', archivosSeleccionados.length);

            // Limpiar el input para permitir selecciones futuras
            event.target.value = '';

            // Actualizar la previsualización
            actualizarPrevisualizacion();
        });
    }

    // Función para actualizar la previsualización de todos los archivos
    function actualizarPrevisualizacion() {
        if (archivosSeleccionados.length === 0) {
            fotoPreviewContainer.style.display = 'none';
            return;
        }

        // Mostrar contenedor
        fotoPreviewContainer.style.display = 'block';

        // Limpiar grid anterior
        previewGrid.innerHTML = '';

        // Contar tipos de archivos
        let imagenesCount = 0;
        let videosCount = 0;
        let archivosInfo = [];

        archivosSeleccionados.forEach((file, index) => {
            if (file.type.startsWith('image/')) {
                imagenesCount++;
                archivosInfo.push(`📷 ${file.name}`);
            } else if (file.type.startsWith('video/')) {
                videosCount++;
                archivosInfo.push(`🎥 ${file.name}`);
            }
        });

        // Mostrar información general
        previewType.innerHTML = `
            <strong>Archivos seleccionados (${archivosSeleccionados.length}):</strong><br>
            ${archivosInfo.join('<br>')}
        `;

        // Crear previsualizaciones para cada archivo
        archivosSeleccionados.forEach((file, index) => {
            const col = document.createElement('div');
            col.className = 'col-md-3 col-sm-4 col-6';

            const card = document.createElement('div');
            card.className = 'card mb-2';
            card.style.position = 'relative';

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body p-2 text-center';

            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.className = 'img-thumbnail';
                img.style.maxWidth = '100px';
                img.style.maxHeight = '100px';
                img.style.objectFit = 'cover';

                const reader = new FileReader();
                reader.onload = function (e) {
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);

                cardBody.appendChild(img);
            } else if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.className = 'img-thumbnail';
                video.style.maxWidth = '100px';
                video.style.maxHeight = '100px';
                video.style.objectFit = 'cover';
                video.controls = true;
                video.muted = true;

                const reader = new FileReader();
                reader.onload = function (e) {
                    video.src = e.target.result;
                };
                reader.readAsDataURL(file);

                cardBody.appendChild(video);
            }

            // Botón para eliminar archivo
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-danger position-absolute';
            deleteBtn.style.top = '5px';
            deleteBtn.style.right = '5px';
            deleteBtn.style.padding = '2px 6px';
            deleteBtn.innerHTML = '×';
            deleteBtn.onclick = function () {
                eliminarArchivo(index);
            };

            // Nombre del archivo
            const fileName = document.createElement('small');
            fileName.className = 'd-block text-muted mt-1';
            fileName.textContent = file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name;
            fileName.title = file.name;

            cardBody.appendChild(fileName);
            card.appendChild(cardBody);
            card.appendChild(deleteBtn);
            col.appendChild(card);
            previewGrid.appendChild(col);
        });
    }

    // Función para eliminar un archivo específico
    function eliminarArchivo(index) {
        archivosSeleccionados.splice(index, 1);
        console.log('Archivo eliminado. Restantes:', archivosSeleccionados.length);
        actualizarPrevisualizacion();
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

    // Limpiar archivos cuando se abra el modal de registrar
    const modalRegistrar = document.getElementById('modalRegistrarAnimal');
    if (modalRegistrar) {
        modalRegistrar.addEventListener('show.bs.modal', function () {
            // Limpiar archivos seleccionados al abrir el modal
            archivosSeleccionados = [];
            actualizarPrevisualizacion();
        });
    }

    // Hacer funciones globales
    window.registrarAnimal = registrarAnimal;
    window.actualizarAnimal = actualizarAnimal;

    // ============================================================
    // CARGAR TIPOS DE ENFERMEDAD Y ENFERMEDADES
    // ============================================================
    async function loadTiposEnfermedad() {
        try {
            console.log('=== INICIANDO CARGA DE TIPOS DE ENFERMEDAD ===');
            console.log('Cargando tipos de enfermedad...');

            const response = await apiRequest('/animals/tipos-enfermedad');
            console.log('Respuesta completa de tipos:', response);
            console.log('Tipo de respuesta:', typeof response);
            console.log('Propiedades de la respuesta:', Object.keys(response));

            let tipos = response.data || [];
            // Ordenar por ID ascendente (según la BD)
            tipos = tipos.sort((a, b) => (a.idTipoEnfermedad || a.idtipoenfermedad) - (b.idTipoEnfermedad || b.idtipoenfermedad));
            console.log('Tipos extraídos:', tipos);
            console.log('Cantidad de tipos:', tipos.length);

            const selectTipo = document.getElementById('tipoEnfermedadRegistrarAnimal');
            console.log('Select tipo encontrado:', selectTipo);

            if (selectTipo) {
                // Limpiar el select
                selectTipo.innerHTML = '';

                // Agregar opción por defecto
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Seleccionar tipo';
                selectTipo.appendChild(defaultOption);

                // Agregar tipos
                if (tipos.length > 0) {
                    console.log('Agregando tipos al select...');
                    tipos.forEach((tipo, index) => {
                        console.log(`Tipo ${index + 1}:`, tipo);
                        const option = document.createElement('option');
                        option.value = tipo.idTipoEnfermedad || tipo.idtipoenfermedad;
                        option.textContent = tipo.tipoEnfermedad || tipo.tipoenfermedad;
                        selectTipo.appendChild(option);
                        console.log(`Agregado: ${option.textContent} con valor: ${option.value}`);
                    });
                } else {
                    console.log('No hay tipos para mostrar');
                    const noTiposOption = document.createElement('option');
                    noTiposOption.value = '';
                    noTiposOption.textContent = 'No hay tipos disponibles';
                    selectTipo.appendChild(noTiposOption);
                }

                console.log('Select final con opciones:', selectTipo.options.length);
                console.log('Opciones del select:', Array.from(selectTipo.options).map(opt => ({ value: opt.value, text: opt.textContent })));
            } else {
                console.error('No se encontró el select tipoEnfermedadRegistrarAnimal');
            }
        } catch (error) {
            console.error('Error cargando tipos de enfermedad:', error);
            console.error('Detalles del error:', error.message);
        }
    }

    async function loadEnfermedadesPorTipo(tipoId) {
        try {
            console.log('=== INICIANDO CARGA DE ENFERMEDADES ===');
            console.log('Cargando enfermedades para tipo ID:', tipoId);

            // Verificar que tipoId sea válido
            if (!tipoId || tipoId === 'undefined' || tipoId === '') {
                console.error('ID de tipo inválido:', tipoId);
                return;
            }

            console.log('Haciendo request a:', `/animals/enfermedades-por-tipo/${tipoId}`);
            const response = await apiRequest(`/animals/enfermedades-por-tipo/${tipoId}`);
            console.log('Respuesta completa de enfermedades:', response);
            console.log('Tipo de respuesta:', typeof response);
            console.log('Propiedades de la respuesta:', Object.keys(response));

            const enfermedades = response.data || [];
            console.log('Enfermedades extraídas:', enfermedades);
            console.log('Cantidad de enfermedades:', enfermedades.length);

            const selectEnfermedad = document.getElementById('enfermedadRegistrarAnimal');
            console.log('Select enfermedad encontrado:', selectEnfermedad);

            if (selectEnfermedad) {
                // Limpiar el select
                selectEnfermedad.innerHTML = '';

                // Agregar opción por defecto
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Seleccionar enfermedad';
                selectEnfermedad.appendChild(defaultOption);

                // Agregar enfermedades
                if (enfermedades.length > 0) {
                    console.log('Agregando enfermedades al select...');
                    enfermedades.forEach((enfermedad, index) => {
                        console.log(`Enfermedad ${index + 1}:`, enfermedad);
                        const option = document.createElement('option');
                        option.value = enfermedad.idEnfermedad || enfermedad.idenfermedad;
                        option.textContent = enfermedad.nombEnfermedad || enfermedad.nombenfermedad;
                        selectEnfermedad.appendChild(option);
                        console.log(`Agregada: ${option.textContent} con valor: ${option.value}`);
                    });
                } else {
                    console.log('No hay enfermedades para mostrar');
                    const noEnfermedadesOption = document.createElement('option');
                    noEnfermedadesOption.value = '';
                    noEnfermedadesOption.textContent = 'No hay enfermedades disponibles';
                    selectEnfermedad.appendChild(noEnfermedadesOption);
                }

                selectEnfermedad.disabled = false;
                console.log('Select final con opciones:', selectEnfermedad.options.length);
                console.log('Opciones del select:', Array.from(selectEnfermedad.options).map(opt => ({ value: opt.value, text: opt.textContent })));
            } else {
                console.error('No se encontró el select enfermedadRegistrarAnimal');
            }
        } catch (error) {
            console.error('Error cargando enfermedades por tipo:', error);
            console.error('Detalles del error:', error.message);
        }
    }

    async function loadRazasPorEspecie(especieId) {
        try {
            console.log('=== INICIANDO CARGA DE RAZAS ===');
            console.log('Cargando razas para especie ID:', especieId);

            // Verificar que especieId sea válido
            if (!especieId || especieId === 'undefined' || especieId === '') {
                console.error('ID de especie inválido:', especieId);
                return;
            }

            console.log('Haciendo request a:', `/especieRaza/razas?especie=${especieId}`);
            const response = await apiRequest(`/especieRaza/razas?especie=${especieId}`);
            console.log('Respuesta completa de la API:', response);
            console.log('Tipo de respuesta:', typeof response);
            console.log('Propiedades de la respuesta:', Object.keys(response));

            const razas = response.data || [];
            console.log('Razas extraídas:', razas);
            console.log('Cantidad de razas:', razas.length);

            const selectRaza = document.getElementById('razaRegistrarAnimal');
            console.log('Select raza encontrado:', selectRaza);

            if (selectRaza) {
                // Limpiar el select
                selectRaza.innerHTML = '';

                // Agregar opción por defecto
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Seleccionar raza';
                selectRaza.appendChild(defaultOption);

                // Agregar razas
                if (razas.length > 0) {
                    console.log('Agregando razas al select...');
                    razas.forEach((raza, index) => {
                        console.log(`Raza ${index + 1}:`, raza);
                        const option = document.createElement('option');
                        option.value = raza.idRaza || raza.idraza;
                        option.textContent = raza.razaAnimal || raza.razaanimal;
                        selectRaza.appendChild(option);
                        console.log(`Agregada: ${option.textContent} con valor: ${option.value}`);
                    });
                } else {
                    console.log('No hay razas para mostrar');
                    const noRazasOption = document.createElement('option');
                    noRazasOption.value = '';
                    noRazasOption.textContent = 'No hay razas disponibles';
                    selectRaza.appendChild(noRazasOption);
                }

                selectRaza.disabled = false;
                console.log('Select final con opciones:', selectRaza.options.length);
                console.log('Opciones del select:', Array.from(selectRaza.options).map(opt => ({ value: opt.value, text: opt.textContent })));
            } else {
                console.error('No se encontró el select razaRegistrarAnimal');
            }
        } catch (error) {
            console.error('Error cargando razas por especie:', error);
            console.error('Detalles del error:', error.message);
        }
    }

    // ============================================================
    // CONFIGURAR EVENT LISTENERS PARA ENFERMEDADES
    // ============================================================
    function configurarEventListenersEnfermedades() {
        const tipoEnfermedadSelect = document.getElementById('tipoEnfermedadRegistrarAnimal');
        if (tipoEnfermedadSelect) {
            // Remover listener anterior si existe
            tipoEnfermedadSelect.removeEventListener('change', handleTipoEnfermedadChange);
            // Agregar nuevo listener
            tipoEnfermedadSelect.addEventListener('change', handleTipoEnfermedadChange);
        }
    }

    function handleTipoEnfermedadChange() {
        const tipoId = this.value;
        const tipoText = this.options[this.selectedIndex].text;
        console.log('Tipo de enfermedad seleccionado:', tipoText, 'con ID:', tipoId);
        const selectEnfermedad = document.getElementById('enfermedadRegistrarAnimal');

        if (tipoId && tipoId !== '') {
            console.log('Cargando enfermedades para tipo:', tipoText, 'ID:', tipoId);
            loadEnfermedadesPorTipo(tipoId);
        } else {
            console.log('Bloqueando enfermedad - no hay tipo seleccionado');
            if (selectEnfermedad) {
                selectEnfermedad.innerHTML = '<option value="">Primero selecciona un tipo</option>';
                selectEnfermedad.disabled = true;
            }
        }
    }

    // ============================================================
    // CONFIGURAR EVENT LISTENERS DESPUÉS DE CARGAR ESPECIES
    // ============================================================
    function configurarEventListeners() {
        const especieSelect = document.getElementById('especieRegistrarAnimal');
        console.log('Configurando event listener para especie:', especieSelect);
        if (especieSelect) {
            // Remover listener anterior si existe
            especieSelect.removeEventListener('change', handleEspecieChange);
            // Agregar nuevo listener
            especieSelect.addEventListener('change', handleEspecieChange);
            console.log('Event listener configurado para especie');
        } else {
            console.error('No se encontró el select especieRegistrarAnimal');
        }
    }

    function handleEspecieChange() {
        const especieId = this.value;
        const especieText = this.options[this.selectedIndex].text;
        console.log('Especie seleccionada:', especieText, 'con ID:', especieId);
        const selectRaza = document.getElementById('razaRegistrarAnimal');

        if (especieId && especieId !== '') {
            console.log('Cargando razas para especie:', especieText, 'ID:', especieId);
            loadRazasPorEspecie(especieId);
        } else {
            console.log('Bloqueando raza - no hay especie seleccionada');
            if (selectRaza) {
                selectRaza.innerHTML = '<option value="">Primero selecciona una especie</option>';
                selectRaza.disabled = true;
            }
        }
    }

    // ============================================================
    // INICIALIZAR
    // ============================================================
    await loadAnimals();
    await loadEspecies(); // Cargar especies primero
    await loadRazas(); // Cargar todas las razas
    await loadTiposEnfermedad(); // Cargar tipos de enfermedad
    configurarEventListeners(); // Configurar event listeners de especies
    configurarEventListenersEnfermedades(); // Configurar event listeners de enfermedades
    // Bloquear negativos en inputs numéricos (edad/peso)
    (function attachNonNegativeGuards() {
        function guardInput(el, allowDecimal = false) {
            if (!el) return;
            el.setAttribute('min', '0');
            el.addEventListener('keydown', (e) => {
                const invalidKeys = ['-', '+', 'e', 'E'];
                if (invalidKeys.includes(e.key)) e.preventDefault();
                if (!allowDecimal && e.key === '.') e.preventDefault();
            });
            el.addEventListener('input', () => {
                const v = el.value;
                // Quitar signos y normalizar
                let cleaned = v.replace(/[eE+\-]/g, '');
                if (!allowDecimal) cleaned = cleaned.replace(/\./g, '');
                el.value = cleaned;
                if (el.value !== '' && parseFloat(el.value) < 0) el.value = '0';
            });
        }

        // Registrar
        guardInput(document.querySelector('#formRegistrarAnimal input[placeholder="Ingresar edad"]'), false);
        guardInput(document.querySelector('#formRegistrarAnimal input[placeholder="Ingresar peso"]'), true);
        // Editar
        guardInput(document.getElementById('edadEditarAnimal'), false);
        guardInput(document.getElementById('pesoEditarAnimal'), true);
    })();

    // ==========================
    // Asignar Veterinario (modal)
    // ==========================
    (function initAsignarVet() {
        const selectAnimal = document.getElementById('selectAnimalVet');
        const inputNombreVet = document.getElementById('inputNombreVet');
        const btnGuardarVet = document.getElementById('btnGuardarVet');
        const modalAsignarVet = document.getElementById('modalAsignarVet');

        if (!selectAnimal || !btnGuardarVet || !modalAsignarVet) return;

        // Cargar animales en el select cada vez que se abre
        modalAsignarVet.addEventListener('show.bs.modal', () => {
            selectAnimal.innerHTML = '';
            animalesData.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.idanimal;
                opt.textContent = `${a.idanimal} - ${a.nombreanimal} (${a.especieanimal} / ${a.razaanimal})`;
                selectAnimal.appendChild(opt);
            });
            inputNombreVet.value = '';
        });

        btnGuardarVet.addEventListener('click', async () => {
            const id = selectAnimal.value;
            const nombre = inputNombreVet.value.trim();
            if (!id || !nombre) {
                Swal.fire('Advertencia', 'Selecciona un animal e ingresa el nombre del veterinario', 'warning');
                return;
            }
            try {
                await apiRequest(`/animals/${id}/assign-vet`, {
                    method: 'POST',
                    body: JSON.stringify({ nombVeterinario: nombre })
                });
                Swal.fire('Éxito', 'Veterinario asignado/actualizado', 'success');
                const modal = bootstrap.Modal.getInstance(modalAsignarVet);
                modal.hide();
            } catch (err) {
                Swal.fire('Error', err.message || 'No se pudo asignar el veterinario', 'error');
            }
        });
    })();
    console.log("Módulo de administración de animales inicializado");

    // =============================
    // Solicitudes (Admin)
    // =============================
    const solicitudesBody = document.getElementById('solicitudesBody');
    const contenedorSolicitudes = document.getElementById('contenedorSolicitudes');
    const badgeSolicitudes = document.getElementById('badgeSolicitudes');
    const iconSolicitudes = document.getElementById('iconSolicitudes');

    async function loadSolicitudesAdmin() {
        if (!solicitudesBody) return;
        try {
            const resp = await apiRequest('/animals/solicitudes');
            const items = resp.data || [];
            badgeSolicitudes.style.display = items.length ? 'inline-block' : 'none';
            badgeSolicitudes.textContent = `${items.length} pendientes`;
            if (!items.length) {
                solicitudesBody.innerHTML = '<tr><td colspan="5" class="text-center">Sin solicitudes pendientes</td></tr>';
                return;
            }
            solicitudesBody.innerHTML = items.map(s => {
                const fechaLocal = new Date(s.created_at).toLocaleString('es-PE', { hour12: false, timeZone: 'America/Lima' });
                return `
                <tr>
                    <td>${s.idsolicitud || s.idSolicitud}</td>
                    <td>${s.idusuario || s.idUsuario}</td>
                    <td>${fechaLocal}</td>
                    <td><span class="badge bg-warning">${s.estado}</span></td>
                    <td>
                        <button class="btn btn-sm btn-secondary me-2" onclick="window.visualizarSolicitud(${s.idsolicitud || s.idSolicitud})">Visualizar</button>
                        <button class="btn btn-sm btn-success me-2" onclick="window.aprobarSolicitud(${s.idsolicitud || s.idSolicitud})">Aprobar</button>
                        <button class="btn btn-sm btn-danger" onclick="window.rechazarSolicitud(${s.idsolicitud || s.idSolicitud})">Rechazar</button>
                    </td>
                </tr>
            `}).join('');
        } catch (err) {
            solicitudesBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${err.message || 'Error cargando solicitudes'}</td></tr>`;
        }
    }

    window.toggleSolicitudes = function() {
        const contenedor = document.getElementById('contenedorSolicitudes');
        const icon = document.getElementById('iconSolicitudes');
        if (!contenedor) {
            console.error('No se encontró el contenedor de solicitudes');
            return;
        }
        const visible = contenedor.style.display !== 'none';
        contenedor.style.display = visible ? 'none' : 'block';
        if (icon) {
            icon.className = visible ? 'bi bi-plus-circle' : 'bi bi-dash-circle';
        }
        if (!visible) {
            loadSolicitudesAdmin();
        }
    }

    // Visualizar detalle de solicitud
    window.visualizarSolicitud = async function(id) {
        try {
            const resp = await apiRequest(`/animals/solicitudes/${id}`);
            const s = resp.data;
            if (!s) {
                Swal.fire('Error', 'No se encontró la solicitud', 'error');
                return;
            }
            
            // Manejar diferentes formatos del payload
            let payload = {};
            if (s.payload) {
                if (typeof s.payload === 'string') {
                    try {
                        payload = JSON.parse(s.payload);
                    } catch (e) {
                        payload = {};
                    }
                } else if (s.payload.body) {
                    payload = s.payload.body;
                } else {
                    payload = s.payload;
                }
            }
            
            const fechaLocal = s.created_at 
                ? new Date(s.created_at).toLocaleString('es-PE', { hour12: false, timeZone: 'America/Lima' })
                : 'Fecha no disponible';

            const carouselId = `carousel-solicitud-${id}`;
            const mediaItems = [
                ...(s.imagenes || []).map(fn => ({ type: 'img', src: `/files/${fn}` })),
                ...(s.videos || []).map(fn => ({ type: 'video', src: `/files/${fn}` }))
            ];

            const indicators = mediaItems.map((_, idx) => `
                <button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${idx}" ${idx===0?'class="active" aria-current="true"':''} aria-label="Slide ${idx+1}"></button>
            `).join('');

            const slides = mediaItems.map((m, idx) => `
                <div class="carousel-item ${idx===0?'active':''}">
                    ${m.type==='img'
                        ? `<img src="${m.src}" class="d-block w-100" style="object-fit:contain; max-height:420px;">`
                        : `<video src="${m.src}" class="d-block w-100" style="max-height:420px" controls></video>`}
                </div>
            `).join('');

            const carouselHtml = mediaItems.length ? `
                <div id="${carouselId}" class="carousel slide" data-bs-ride="carousel">
                    <div class="carousel-indicators">
                        ${indicators}
                    </div>
                    <div class="carousel-inner">
                        ${slides}
                    </div>
                    <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Anterior</span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                        <span class="carousel-control-next-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Siguiente</span>
                    </button>
                </div>
            ` : '<div class="text-muted">Sin medios adjuntos</div>';

            const html = `
                <div class="container-fluid text-start">
                    <div class="row g-4">
                        <div class="col-12 col-lg-6">
                            <p><strong>ID:</strong> ${s.idsolicitud || s.idSolicitud}</p>
                            <p><strong>Usuario:</strong> ${s.idusuario || s.idUsuario}</p>
                            <p><strong>Fecha:</strong> ${fechaLocal}</p>
                            <hr/>
                            <p><strong>Nombre:</strong> ${payload.nombreAnimal || ''}</p>
                            <p><strong>Especie:</strong> ${payload.especie || ''}</p>
                            <p><strong>Raza:</strong> ${payload.raza || ''}</p>
                            <p><strong>Edad (meses):</strong> ${payload.edadMeses || ''}</p>
                            <p><strong>Género:</strong> ${payload.genero || ''}</p>
                            <p><strong>Peso:</strong> ${payload.peso || ''}</p>
                            <p><strong>Pelaje:</strong> ${payload.pelaje || ''}</p>
                            <p><strong>Tamaño:</strong> ${payload.tamano || payload.tamaño || ''}</p>
                            <p><strong>Descripción:</strong> ${payload.descripcion || ''}</p>
                        </div>
                        <div class="col-12 col-lg-6">
                            <h5 class="mb-2">Medios</h5>
                            ${carouselHtml}
                        </div>
                    </div>
                </div>
            `;
            Swal.fire({ title: 'Solicitud', html, width: 800 });
        } catch (err) {
            Swal.fire('Error', err.message || 'No se pudo cargar el detalle', 'error');
        }
    }

    // Plegar/expandir tabla de animales
    window.toggleAnimalesSection = function() {
        const cont = document.getElementById('contenedorAnimales');
        const icon = document.getElementById('iconAnimales');
        if (!cont) return;
        const visible = cont.style.display !== 'none';
        cont.style.display = visible ? 'none' : 'block';
        if (icon) icon.className = visible ? 'bi bi-plus-circle' : 'bi bi-dash-circle';
    }

    window.aprobarSolicitud = async function(id) {
        const { value: comentario } = await Swal.fire({
            title: 'Aprobar solicitud',
            input: 'text',
            inputLabel: 'Mensaje opcional para el usuario',
            inputPlaceholder: 'Ej: Aprobado. Gracias por el aporte!',
            showCancelButton: true
        });
        if (comentario === undefined) return;
        try {
            await apiRequest(`/animals/solicitudes/${id}/aprobar`, {
                method: 'PUT',
                body: JSON.stringify({ mensaje: comentario || null })
            });
            
            // Lanzar confeti de celebración
            if (typeof confetti !== 'undefined') {
                const duration = 3000;
                const end = Date.now() + duration;
                (function frame() {
                    confetti({
                        particleCount: 2,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0 },
                        colors: ['#ff5c8d', '#ffc107', '#20c997', '#0dcaf0']
                    });
                    confetti({
                        particleCount: 2,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1 },
                        colors: ['#ff5c8d', '#ffc107', '#20c997', '#0dcaf0']
                    });
                    if (Date.now() < end) {
                        requestAnimationFrame(frame);
                    }
                }());
            }
            
            Swal.fire({
                icon: 'success',
                title: '¡Solicitud aprobada! 🎉',
                text: 'La solicitud ha sido aprobada y el animal publicado',
                timer: 3000,
                showConfirmButton: false
            });
            loadSolicitudesAdmin();
            loadAnimals();
        } catch (err) {
            Swal.fire('Error', err.message || 'No se pudo aprobar', 'error');
        }
    }

    window.rechazarSolicitud = async function(id) {
        const { value: comentario } = await Swal.fire({
            title: 'Rechazar solicitud',
            input: 'text',
            inputLabel: 'Motivo del rechazo (se enviará al usuario)',
            inputPlaceholder: 'Ej: Información insuficiente / fotos no válidas',
            showCancelButton: true
        });
        if (comentario === undefined) return;
        try {
            await apiRequest(`/animals/solicitudes/${id}/rechazar`, {
                method: 'PUT',
                body: JSON.stringify({ mensaje: comentario || null })
            });
            Swal.fire('Listo', 'Solicitud rechazada', 'success');
            loadSolicitudesAdmin();
        } catch (err) {
            Swal.fire('Error', err.message || 'No se pudo rechazar', 'error');
        }
    }
});
