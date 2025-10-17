document.addEventListener("DOMContentLoaded", () => {
    const modalElement = document.getElementById("modalEditarUsuario");
    const modalEditar = new bootstrap.Modal(modalElement);
    const camposPersona = document.getElementById("camposPersona");
    const camposEmpresa = document.getElementById("camposEmpresa");
    const radios = document.getElementsByName("tipoPersona");

    let datosGuardados = false; // Control para saber si se guardaron los cambios

    // Mostrar modal al hacer clic en "editar"
    const tablaUsuarios = document.getElementById("tablaUsuarios");
    if (tablaUsuarios) {
        tablaUsuarios.addEventListener("click", (e) => {
            if (e.target.closest(".btn-editar")) {
                e.preventDefault();
                datosGuardados = false;
                // Reiniciar radios y ocultar campos
                radios.forEach(r => (r.checked = false));
                camposPersona.classList.add("d-none");
                camposEmpresa.classList.add("d-none");
                modalEditar.show();
            }
        });
    }

    // Mostrar/ocultar campos según el tipo de persona
    radios.forEach(radio => {
        radio.addEventListener("change", () => {
            if (radio.value === "persona" && radio.checked) {
                camposPersona.classList.remove("d-none");
                camposEmpresa.classList.add("d-none");
            } else if (radio.value === "empresa" && radio.checked) {
                camposEmpresa.classList.remove("d-none");
                camposPersona.classList.add("d-none");
            }
        });
    });

    // Si se quitan ambas selecciones → ocultar campos
    document.addEventListener("click", () => {
        const personaSeleccionada = document.getElementById("tipoPersona1").checked;
        const empresaSeleccionada = document.getElementById("tipoPersona2").checked;

        if (!personaSeleccionada && !empresaSeleccionada) {
            camposPersona.classList.add("d-none");
            camposEmpresa.classList.add("d-none");
        }
    });

    // Marcar como guardado
    document.getElementById("formEditarUsuario").addEventListener("submit", (e) => {
        e.preventDefault();
        datosGuardados = true;
        alert("Datos guardados correctamente.");
        modalEditar.hide();
    });

    // Confirmar cierre
    modalElement.addEventListener("hide.bs.modal", (event) => {
        const confirmar = confirm("¿Estás seguro de cerrar?");
        if (!confirmar) {
            event.preventDefault(); // Cancela el cierre
        } else {
            // Reiniciar los radios y campos al cerrar
            radios.forEach(r => (r.checked = false));
            camposPersona.classList.add("d-none");
            camposEmpresa.classList.add("d-none");
        }
    });
});