document.addEventListener("DOMContentLoaded", () => {
  const tablaAdopciones = document.getElementById("tablaAdopciones");
  const modalRegistrar = new bootstrap.Modal(document.getElementById("modalRegistrar"));
  const modalEditar = new bootstrap.Modal(document.getElementById("modalEditar"));
  const formRegistrar = document.getElementById("formRegistrar");
  const formEditar = document.getElementById("formEditar");

  let adopciones = [];

  // ==========================
  // CARGAR DATOS (SIMULADO)
  // ==========================
  function cargarAdopciones() {
    adopciones = [
      {
        idadopcion: 1,
        f_solicitud: "2025-09-10",
        estadoSolicitud: "Pendiente",
        comentario: "En revisión",
        f_adopcion: "2025-09-20",
        contrato: "Firmado",
        condiciones: "Casa con patio",
        estadoAdopcion: "Activa",
        direccionAdoptante: "Av. Los Rosales 123",
        idAnimal: 5,
        idEntregante: 2,
        idPersona: 3,
      },
      {
        idadopcion: 2,
        f_solicitud: "2025-10-01",
        estadoSolicitud: "Aprobada",
        comentario: "Cumple requisitos",
        f_adopcion: "2025-10-05",
        contrato: "Firmado",
        condiciones: "Tiene espacio suficiente",
        estadoAdopcion: "Finalizada",
        direccionAdoptante: "Jr. Lima 456",
        idAnimal: 7,
        idEntregante: 4,
        idPersona: 2,
      },
    ];
    mostrarAdopciones();
  }

  // ==========================
  // MOSTRAR TABLA
  // ==========================
  function mostrarAdopciones() {
    tablaAdopciones.innerHTML = "";
    adopciones.forEach((a) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${a.idadopcion}</td>
        <td>${a.f_solicitud}</td>
        <td>${a.estadoSolicitud}</td>
        <td>${a.comentario}</td>
        <td>${a.f_adopcion}</td>
        <td>${a.contrato}</td>
        <td>${a.condiciones}</td>
        <td>${a.estadoAdopcion}</td>
        <td>${a.direccionAdoptante}</td>
        <td>${a.idAnimal}</td>
        <td>${a.idEntregante}</td>
        <td>${a.idPersona}</td>
        <td>
          <button class="btn btn-warning btn-sm btn-editar" data-id="${a.idadopcion}">
            <i class="bi bi-pencil-square"></i>
          </button>
        </td>
        <td>
          <button class="btn btn-danger btn-sm btn-eliminar" data-id="${a.idadopcion}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      tablaAdopciones.appendChild(fila);
    });
  }

  // ==========================
  // REGISTRAR
  // ==========================
  formRegistrar.addEventListener("submit", (e) => {
    e.preventDefault();

    const nuevaAdopcion = {
      idadopcion: adopciones.length + 1,
      f_solicitud: formRegistrar.f_solicitud.value,
      estadoSolicitud: formRegistrar.estadoSolicitud.value,
      comentario: formRegistrar.comentario.value,
      f_adopcion: formRegistrar.f_adopcion.value,
      contrato: formRegistrar.contrato.value,
      condiciones: formRegistrar.condiciones.value,
      estadoAdopcion: formRegistrar.estadoAdopcion.value,
      direccionAdoptante: formRegistrar.direccionAdoptante.value,
      idAnimal: formRegistrar.idAnimal.value,
      idEntregante: formRegistrar.idEntregante.value,
      idPersona: formRegistrar.idPersona.value,
    };

    adopciones.push(nuevaAdopcion);
    mostrarAdopciones();
    modalRegistrar.hide();
    formRegistrar.reset();
  });

  // ==========================
  // EDITAR
  // ==========================
  tablaAdopciones.addEventListener("click", (e) => {
    if (e.target.closest(".btn-editar")) {
      const id = parseInt(e.target.closest(".btn-editar").dataset.id);
      const adopcion = adopciones.find((a) => a.idadopcion === id);

      if (adopcion) {
        formEditar.idadopcion.value = adopcion.idadopcion;
        formEditar.f_solicitud.value = adopcion.f_solicitud;
        formEditar.estadoSolicitud.value = adopcion.estadoSolicitud;
        formEditar.comentario.value = adopcion.comentario;
        formEditar.f_adopcion.value = adopcion.f_adopcion;
        formEditar.contrato.value = adopcion.contrato;
        formEditar.condiciones.value = adopcion.condiciones;
        formEditar.estadoAdopcion.value = adopcion.estadoAdopcion;
        formEditar.direccionAdoptante.value = adopcion.direccionAdoptante;
        formEditar.idAnimal.value = adopcion.idAnimal;
        formEditar.idEntregante.value = adopcion.idEntregante;
        formEditar.idPersona.value = adopcion.idPersona;

        modalEditar.show();
      }
    }

    // ==========================
    // ELIMINAR
    // ==========================
    if (e.target.closest(".btn-eliminar")) {
      const id = parseInt(e.target.closest(".btn-eliminar").dataset.id);
      if (confirm("¿Deseas eliminar esta adopción?")) {
        adopciones = adopciones.filter((a) => a.idadopcion !== id);
        mostrarAdopciones();
      }
    }
  });

  // ==========================
  // GUARDAR CAMBIOS (EDITAR)
  // ==========================
  formEditar.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = parseInt(formEditar.idadopcion.value);
    const index = adopciones.findIndex((a) => a.idadopcion === id);

    if (index !== -1) {
      adopciones[index] = {
        idadopcion: id,
        f_solicitud: formEditar.f_solicitud.value,
        estadoSolicitud: formEditar.estadoSolicitud.value,
        comentario: formEditar.comentario.value,
        f_adopcion: formEditar.f_adopcion.value,
        contrato: formEditar.contrato.value,
        condiciones: formEditar.condiciones.value,
        estadoAdopcion: formEditar.estadoAdopcion.value,
        direccionAdoptante: formEditar.direccionAdoptante.value,
        idAnimal: formEditar.idAnimal.value,
        idEntregante: formEditar.idEntregante.value,
        idPersona: formEditar.idPersona.value,
      };
      mostrarAdopciones();
      modalEditar.hide();
    }
  });

  // Cargar registros al iniciar
  cargarAdopciones();
});
