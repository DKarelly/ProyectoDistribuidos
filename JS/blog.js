document.addEventListener("DOMContentLoaded", async () => {
  const contenedorAnimales = document.getElementById("contenedorAnimales");

  try {
    // === 1. Obtener animales disponibles desde el backend ===
    const response = await fetch(window.location.origin + "/api/animals/disponibles");
    const result = await response.json();
    const animales = result.data; // La respuesta tiene { message, data: [...] }

    console.log('Animales recibidos:', animales);
    console.log('Primer animal:', animales[0]);

    // === 2. Generar tarjetas dinámicamente ===
    animales.forEach((animal, index) => {
      const card = document.createElement("div");
      card.classList.add("col-12", "col-sm-6", "col-lg-4");

      // Crear carousel con múltiples imágenes/videos
      let carouselItems = '';
      console.log(`Animal ${animal.nombreanimal} - imagenAnimal:`, animal.imagenAnimal);

      if (animal.imagenAnimal) {
        const imageUrl = `/files/${animal.imagenAnimal}`;
        console.log(`URL de imagen para ${animal.nombreanimal}:`, imageUrl);
        carouselItems = `
          <div class="carousel-item active">
            <img src="${imageUrl}" class="d-block w-100 rounded-top" alt="${animal.nombreanimal}" 
                 onerror="console.error('Error cargando imagen:', this.src); this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="d-block w-100 rounded-top bg-light d-flex align-items-center justify-content-center" style="height: 300px; display: none;">
              <h4 class="text-muted">${animal.nombreanimal}</h4>
            </div>
          </div>
        `;
      } else {
        console.log(`No hay imagen para ${animal.nombreanimal}`);
        carouselItems = `
          <div class="carousel-item active">
            <div class="d-block w-100 rounded-top bg-light d-flex align-items-center justify-content-center" style="height: 300px;">
              <h4 class="text-muted">${animal.nombreanimal}</h4>
            </div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="card card-historia shadow-sm mx-auto">
          <div id="carousel${index}" class="carousel slide" data-bs-ride="carousel">
            <div class="carousel-inner">
              ${carouselItems}
            </div>
            ${animal.imagenAnimal ? `
              <button class="carousel-control-prev" type="button" data-bs-target="#carousel${index}" data-bs-slide="prev">
                <span class="carousel-control-prev-icon"></span>
              </button>
              <button class="carousel-control-next" type="button" data-bs-target="#carousel${index}" data-bs-slide="next">
                <span class="carousel-control-next-icon"></span>
              </button>
            ` : ''}
          </div>
          <div class="card-body">
            <h5 class="card-title">${animal.nombreanimal}</h5>
            <p class="card-text">${animal.especieanimal} - ${animal.razaanimal}</p>
            <a href="#" class="btn btn-pink btn-ver-historia" data-id="${animal.idanimal}">Ver historia</a>
          </div>
        </div>
      `;
      contenedorAnimales.appendChild(card);
    });

    // === 3. Reusar tu lógica de modales (ajustado al fetch) ===
    inicializarEventosVerHistoria();

  } catch (error) {
    console.error("Error al cargar animales:", error);
    contenedorAnimales.innerHTML = `<p class="text-danger">Error al cargar los animales.</p>`;
  }
});

// ==========================
// FUNCIONES DE LOS MODALES
// ==========================
function inicializarEventosVerHistoria() {
  const btnsVerHistoria = document.querySelectorAll(".btn-ver-historia");

  btnsVerHistoria.forEach(btn => {
    btn.addEventListener("click", async e => {
      e.preventDefault();
      const idAnimal = btn.getAttribute("data-id");

      try {
        console.log('Obteniendo detalles del animal ID:', idAnimal);
        // Obtener detalle del animal desde backend usando /api/animals/:id
        const res = await fetch(`${window.location.origin}/api/animals/${idAnimal}`);
        console.log('Respuesta del servidor:', res.status, res.statusText);

        if (!res.ok) {
          const errorText = await res.text();
          console.error('Error del servidor:', errorText);
          throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }

        const result = await res.json();
        console.log('Datos del animal recibidos:', result);
        const animal = result.data; // La respuesta tiene { message, data: animal }

        // Rellenar modal con datos reales
        document.getElementById("detalleAnimalLabel").textContent = animal.nombreanimal;

        // Mostrar galería completa si existe
        const galeriaContainer = document.querySelector("#modalDetalleAnimal .galeria-container");
        if (galeriaContainer && animal.galeria && animal.galeria.length > 0) {
          let galeriaHTML = '<div class="row g-2">';
          animal.galeria.forEach(media => {
            if (media.imagen) {
              galeriaHTML += `
                <div class="col-md-4">
                  <img src="/files/${media.imagen}" class="img-thumbnail" alt="${animal.nombreanimal}" style="width: 100%; height: 150px; object-fit: cover;">
                </div>
              `;
            }
            if (media.video) {
              galeriaHTML += `
                <div class="col-md-4">
                  <video class="img-thumbnail" controls style="width: 100%; height: 150px; object-fit: cover;">
                    <source src="/files/${media.video}" type="video/mp4">
                    Tu navegador no soporta videos.
                  </video>
                </div>
              `;
            }
          });
          galeriaHTML += '</div>';
          galeriaContainer.innerHTML = galeriaHTML;
          galeriaContainer.style.display = 'block';
        } else if (galeriaContainer) {
          galeriaContainer.style.display = 'none';
        }

        // Imagen principal (primera imagen o placeholder)
        const mainImg = document.querySelector("#modalDetalleAnimal img");
        if (mainImg) {
          const primeraImagen = animal.galeria?.find(media => media.imagen);
          mainImg.src = primeraImagen ? `/files/${primeraImagen.imagen}` : `https://via.placeholder.com/300x300?text=${animal.nombreanimal}`;
          mainImg.alt = animal.nombreanimal;
        }

        const inputs = document.querySelectorAll("#formDetalleAnimal input, #formDetalleAnimal textarea");
        inputs[0].value = animal.edadmesesanimal; // Edad en meses
        inputs[1].value = animal.generoanimal; // Género
        inputs[2].value = animal.especieanimal; // Especie

        // Llenar campos de historia médica con datos del historial
        if (animal.historial && animal.historial.length > 0) {
          // Enfermedad: usar nombenfermedad del primer registro o concatenar
          inputs[3].value = animal.historial.map(h => h.nombenfermedad || h.descripcionhistorial).filter(Boolean).join('; ') || "Sin enfermedad";
          // Gravedad: usar gravedadenfermedad
          inputs[4].value = animal.historial.map(h => h.gravedadenfermedad).filter(Boolean).join('; ') || "No especificado";
          // Medicinas: usar medicinas
          inputs[5].value = animal.historial.map(h => h.medicinas).filter(Boolean).join(', ') || "Ninguna";
        } else {
          inputs[3].value = "Sin enfermedad";
          inputs[4].value = "No especificado";
          inputs[5].value = "Ninguna";
        }

        // Actualizar el data-animal del botón Apadrinar
        const btnApadrinar = document.querySelector("#formDetalleAnimal button[onclick]");
        if (btnApadrinar) {
          btnApadrinar.setAttribute("data-animal", animal.nombreanimal);
        }

        // Bloquear campos (solo lectura)
        inputs.forEach(i => i.setAttribute("readonly", true));

        // Mostrar modal
        const modalDetalle = new bootstrap.Modal(document.getElementById("modalDetalleAnimal"));
        modalDetalle.show();
      } catch (error) {
        console.error("Error al obtener detalle del animal:", error);
        console.error("Stack trace:", error.stack);

        // Mostrar error más específico
        let errorMessage = "Error al cargar el detalle del animal. Inténtalo de nuevo.";
        if (error.message.includes('HTTP')) {
          errorMessage = `Error del servidor: ${error.message}`;
        } else if (error.message.includes('fetch')) {
          errorMessage = "Error de conexión. Verifica que el servidor esté funcionando.";
        }

        alert(errorMessage);
      }
    });
  });
}

// Función para confirmar apadrinamiento
function confirmarApadrinar(button) {
  const animalName = button.getAttribute("data-animal");
  const idAnimal = button.getAttribute("data-id"); // Asumiendo que el botón tiene data-id
  document.getElementById("nombreAnimalConfirmacion").textContent = animalName;

  // Mostrar modal de confirmación
  const modalConfirmar = new bootstrap.Modal(document.getElementById("modalConfirmarApadrinar"));
  modalConfirmar.show();

  // Configurar el botón de confirmación
  const btnConfirmar = document.getElementById("confirmarApadrinarBtn");
  btnConfirmar.onclick = async () => {
    try {
      const response = await fetch(window.location.origin + '/api/animals/apadrinar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Asumiendo que el token está en localStorage
        },
        body: JSON.stringify({ idAnimal: idAnimal })
      });

      if (!response.ok) throw new Error('Error en la solicitud');

      const result = await response.json();
      alert(`Apadrinamiento confirmado para ${animalName}`);
      modalConfirmar.hide();
    } catch (error) {
      console.error('Error al registrar apadrinamiento:', error);
      alert('Error al registrar el apadrinamiento. Inténtalo de nuevo.');
    }
  };
}
