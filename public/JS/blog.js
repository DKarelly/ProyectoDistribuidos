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
    animales.forEach(async (animal, index) => {
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

      const imageUrl = animal.imagenAnimal ? `/files/${animal.imagenAnimal}` : '';
      const photoStyle = imageUrl ? `style=\"background-image:url('${imageUrl}')\"` : '';
      card.innerHTML = `
        <div class="card card-historia shadow-sm mx-auto">
          <div class="card-hero-full">
            <div class="card-photo" ${photoStyle}></div>
            <div class="card-shade"></div>
            <div class="card-content">
              <h5 class="card-title">${animal.nombreanimal}</h5>
              <a href="#" class="btn btn-pink btn-ver-historia" data-id="${animal.idanimal}">Ver historia</a>
            </div>
          </div>
        </div>
      `;
      contenedorAnimales.appendChild(card);

      // Si no vino imagen en /disponibles, cargar primera de la galería
      if (!imageUrl) {
        try {
          const resDetalle = await fetch(`${window.location.origin}/api/animals/${animal.idanimal}`);
          if (resDetalle.ok) {
            const detalle = await resDetalle.json();
            const primera = detalle.data?.galeria?.find(m => m.imagen)?.imagen;
            if (primera) {
              const photoDiv = card.querySelector('.card-photo');
              if (photoDiv) photoDiv.style.backgroundImage = `url('/files/${primera}')`;
            }
          }
        } catch (e) {
          console.warn('No se pudo cargar imagen de galería para', animal.idanimal, e);
        }
      }
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
        // Obtener perfil enriquecido para hero y resumen
        const perfilRes = await fetch(`${window.location.origin}/api/animals/perfil/${idAnimal}`);
        const perfil = perfilRes.ok ? (await perfilRes.json()).data : null;
        // Obtener detalle del animal (galería e historial completo)
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

        // Rellenar hero/resumen si hay perfil
        const hero = document.getElementById('modalHero');
        const titulo = document.getElementById('detalleAnimalLabel');
        const resumenHero = document.getElementById('resumenHero');
        const diasRef = document.getElementById('diasRefugio');
        const estadoEl = document.getElementById('estadoAnimal');

        titulo.textContent = animal.nombreanimal;
        if (perfil) {
          if (hero && perfil.imagen) hero.style.background = `url('/files/${perfil.imagen}') center/cover no-repeat`;
          if (resumenHero && typeof perfil.dias_en_refugio !== 'undefined') resumenHero.textContent = `Lleva ${perfil.dias_en_refugio} días esperando`;
          if (diasRef && typeof perfil.dias_en_refugio !== 'undefined') diasRef.textContent = perfil.dias_en_refugio;
          if (estadoEl && perfil.estado) estadoEl.textContent = perfil.estado;
        } else if (hero) {
          // Fallback: usa primera imagen del detalle
          const primeraImagen = animal.galeria?.find(m => m.imagen)?.imagen;
          if (primeraImagen) hero.style.background = `url('/files/${primeraImagen}') center/cover no-repeat`;
        }

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
          btnApadrinar.setAttribute("data-id", animal.idanimal);
          btnApadrinar.setAttribute("onclick", "confirmarSolicitarApadrinamiento(this)");
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

// Función para confirmar solicitud de apadrinamiento
function confirmarSolicitarApadrinamiento(button) {
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
      const response = await fetch(window.location.origin + '/api/animals/solicitar-apadrinamiento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Asumiendo que el token está en localStorage
        },
        body: JSON.stringify({ idAnimal: idAnimal })
      });

      if (!response.ok) throw new Error('Error en la solicitud');

      const result = await response.json();

      // Crear y mostrar modal de éxito
      const modalSuccessHTML = `
        <div class="modal fade" id="modalSuccess" tabindex="-1" aria-labelledby="modalSuccessLabel" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-success text-white">
                <h5 class="modal-title" id="modalSuccessLabel">¡Solicitud Enviada!</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body text-center">
                <i class="bi bi-check-circle-fill text-success" style="font-size: 3rem;"></i>
                <p class="mt-3 mb-0 fs-5">Solicitud de apadrinamiento enviada para <strong>${animalName}</strong></p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-success" data-bs-dismiss="modal">Aceptar</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalSuccessHTML);
      const modalSuccess = new bootstrap.Modal(document.getElementById('modalSuccess'));
      modalSuccess.show();

      modalConfirmar.hide();
    } catch (error) {
      console.error('Error al registrar apadrinamiento:', error);
      alert('Error al registrar el apadrinamiento. Inténtalo de nuevo.');
    }
  };
}
