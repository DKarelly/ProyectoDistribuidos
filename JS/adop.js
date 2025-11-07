/*
document.addEventListener("DOMContentLoaded", () => {
  const tablaAdopciones = document.getElementById("tbodyAdopciones");
  const tablaSolicitudes = document.getElementById("tbodySolicitudes");

  const modalRegistrar = new bootstrap.Modal(document.getElementById("modalRegistrar"));
  const modalEditar = new bootstrap.Modal(document.getElementById("modalEditar"));
  const formRegistrar = document.getElementById("formRegistrar");
  const formEditar = document.getElementById("formEditar");

  let adopciones = [];
  let solicitudes = [];
  const token = localStorage.getItem("token");

  // ======================================================
  // FUNCIONES DE CARGA
  // ======================================================
  async function cargarAdopciones() {
    try {
      const res = await fetch("/api/adoptions/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error al cargar adopciones");

      const data = await res.json();
      if (!data.data) throw new Error("Respuesta inválida del servidor");

      adopciones = data.data.map((a, index) => ({
        idadopcion: index + 1,
        f_adopcion: a.fechaAdopcion || "-",
        direccionAdoptante: a.dirAdoptante || "-",
        estadoAdopcion: a.estadoAdop || "-",
        animal: a.animal || "-",
        adoptante: a.adoptante || "-",
        entregante: a.entregante || "-"
      }));
      mostrarAdopciones();
    } catch (err) {
      console.error("Error cargando adopciones:", err);
    }
  }

  async function cargarSolicitudes() {
    try {
      const res = await fetch("/api/adoptions/solicitud", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error al cargar solicitudes");

      const data = await res.json();
      if (!data.data) throw new Error("Respuesta inválida del servidor");

      solicitudes = data.data.map((s, index) => ({
        idSolicitud: index + 1,
        fechaSolicitud: s.fechaSolicitud || "-",
        comentario: s.comentario || "-",
        estadoSolic: s.estadoSolic || "-",
        animal: s.animal || "-",
        solicitante: s.solicitante || "-",
        entregante: s.entregante || "-"
      }));
      mostrarSolicitudes();
    } catch (err) {
      console.error("Error cargando solicitudes:", err);
    }
  }

  // ======================================================
  // TABLAS
  // ======================================================
  function mostrarAdopciones() {
    tablaAdopciones.innerHTML = "";
    adopciones.forEach((a) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${a.idadopcion}</td>
        <td>${a.animal}</td>
        <td>${a.f_adopcion}</td>
        <td>${a.estadoAdopcion}</td>
        <td>${a.adoptante}</td>
        <td>${a.entregante}</td>
        <td>${a.direccionAdoptante}</td>
        <td>
          <button class="btn btn-warning btn-sm btn-editar" data-id="${a.idadopcion}">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button class="btn btn-danger btn-sm btn-eliminar" data-id="${a.idadopcion}">
            <i class="bi bi-trash"></i>
          </button>
        </td>`;
      tablaAdopciones.appendChild(fila);
    });
  }

  function mostrarSolicitudes() {
    tablaSolicitudes.innerHTML = "";
    solicitudes.forEach((s) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${s.idSolicitud}</td>
        <td>${s.solicitante}</td>
        <td>${s.fechaSolicitud}</td>
        <td>${s.estadoSolic}</td>
        <td>${s.animal}</td>
        <td>${s.entregante}</td>
        <td>${s.comentario}</td>
        <td>
          <button class="btn btn-danger btn-sm btn-eliminar-solicitud" data-id="${s.idSolicitud}">
            <i class="bi bi-trash"></i>
          </button>
        </td>`;
      tablaSolicitudes.appendChild(fila);
    });
  }

  // ======================================================
  // REGISTRAR SOLICITUD
  // ======================================================
  formRegistrar.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nuevo = {
      motivo: formRegistrar.motivo.value.trim(),
      idAnimal: formRegistrar.idAnimal.value,
      idPersona: formRegistrar.idPersona.value,
      idEntregante: formRegistrar.idEntregante?.value || null
    };

    try {
      const res = await fetch("/api/adoptions/registrar_solicitud", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(nuevo)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al registrar solicitud");

      console.log("✅", data.message);
      cargarSolicitudes();
      modalRegistrar.hide();
      formRegistrar.reset();
    } catch (err) {
      console.error("Error registrando solicitud:", err);
    }
  });

  // ======================================================
  // 🔍 BÚSQUEDAS DINÁMICAS
  // ======================================================
  const inputPersona = document.getElementById("idPersona");
  const previewPersona = document.getElementById("previewPersona");
  const inputAnimal = document.getElementById("idAnimal");
  const previewAnimal = document.getElementById("previewAnimal");

  // Buscar persona (adoptante)
  inputPersona.addEventListener("input", async () => {
    const q = inputPersona.value.trim();
    if (q.length < 3) {
      previewPersona.innerHTML = `<p class="text-muted">Ingrese al menos 3 letras...</p>`;
      return;
    }

    try {
      const res = await fetch(`/api/adoptions/busqueda_persona/${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok || !data.data) throw new Error("Persona no encontrada");

      const p = data.data;
      previewPersona.innerHTML = `
        <p><strong>Nombre:</strong> ${p.nombrecompleto}</p>
        <p><strong>DNI:</strong> ${p.dni}</p>
        <p><strong>Sexo:</strong> ${p.sexo}</p>
        <p><strong>Dirección:</strong> ${p.direccionusuario}</p>
        <p><strong>Teléfono:</strong> ${p.numerousuario}</p>
        <p><strong>Correo:</strong> ${p.correousuario}</p>`;
      formRegistrar.idPersona.value = p.idpersona;
    } catch (err) {
      previewPersona.innerHTML = `<p class="text-danger">No se encontró adoptante</p>`;
      console.error("Error buscando persona:", err);
    }
  });

  // Buscar animal
  inputAnimal.addEventListener("input", async () => {
    const q = inputAnimal.value.trim();
    if (q.length < 2) {
      previewAnimal.innerHTML = `<p class="text-muted">Ingrese al menos 2 letras...</p>`;
      return;
    }

    try {
      const res = await fetch(`/api/adoptions/busqueda_animal/${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok || !data.data) throw new Error("Animal no encontrado");

      const a = data.data;
      previewAnimal.innerHTML = `
        <div class="d-flex align-items-center gap-3">
          <img src="${a.imagen || '/static/img/default_animal.png'}"
               alt="${a.nombreanimal}"
               style="width:80px; height:80px; border-radius:10px; object-fit:cover;">
          <div>
            <p><strong>Nombre:</strong> ${a.nombreanimal}</p>
            <p><strong>Especie:</strong> ${a.especieanimal}</p>
            <p><strong>Raza:</strong> ${a.razaanimal}</p>
            <p><strong>Estado:</strong>
              <span class="badge bg-${
                a.estado === "adoptado"
                  ? "secondary"
                  : a.estado === "en_proceso"
                  ? "warning"
                  : "success"
              }">${a.estado}</span>
            </p>
          </div>
        </div>`;
      formRegistrar.idAnimal.value = a.idanimal;
    } catch (err) {
      previewAnimal.innerHTML = `<p class="text-danger">No se encontró animal</p>`;
      console.error("Error buscando animal:", err);
    }
  });

  // ======================================================
  // CARGAR AL INICIO
  // ======================================================
  cargarAdopciones();
  cargarSolicitudes();
});
*/