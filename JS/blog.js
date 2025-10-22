document.addEventListener("DOMContentLoaded", () => {

  // ==========================
  // ABRIR MODAL "Ver historia"
  // ==========================
  const btnsVerHistoria = document.querySelectorAll(".btn.btn-pink");

  btnsVerHistoria.forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();

      // Obtener datos del animal desde la tarjeta
      const card = btn.closest(".card");
      const nombre = card.querySelector(".card-title").textContent.trim();
      const imgSrc = card.querySelector(".carousel-item.active img").src;

      // Asignar datos al modal de detalle
      document.getElementById("detalleAnimalLabel").textContent = nombre;
      document.querySelector("#modalDetalleAnimal img").src = imgSrc;
      document.querySelector("#modalDetalleAnimal img").alt = nombre;

      // Actualizar botón "Apadrinar"
      const btnApadrinar = document.querySelector("#modalDetalleAnimal .btn.btn-pink");
      btnApadrinar.setAttribute("data-animal", nombre);

      // Mostrar el modal
      const modalDetalle = new bootstrap.Modal(document.getElementById("modalDetalleAnimal"));
      modalDetalle.show();
    });
  });

  // ==========================
  // PASAR DATOS AL MODAL CONFIRMAR
  // ==========================
  const modalConfirmar = document.getElementById("modalConfirmarApadrinar");
  const nombreAnimalConfirmacion = document.getElementById("nombreAnimalConfirmacion");
  let animalActual = "";

  modalConfirmar.addEventListener("show.bs.modal", event => {
    const button = event.relatedTarget;
    animalActual = button.getAttribute("data-animal");
    nombreAnimalConfirmacion.textContent = animalActual;
  });

  // ==========================
  // CONFIRMAR APADRINAMIENTO (CONEXIÓN CON BACKEND)
  // ==========================
  const btnConfirmar = document.getElementById("confirmarApadrinarBtn");

  btnConfirmar.addEventListener("click", async () => {
    try {
      // Enviar datos al backend
      const response = await fetch("/apadrinar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ animal: animalActual }),
      });

      const result = await response.json();

      // Cerrar modal
      const modal = bootstrap.Modal.getInstance(modalConfirmar);
      modal.hide();

      if (result.success) {
        alert(`Usted está apadrinando a: ${animalActual}`);
      } else {
        alert("No se pudo registrar el apadrinamiento. Intente nuevamente.");
      }

    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      alert("Ocurrió un error al conectar con el servidor.");
    }
  });

});