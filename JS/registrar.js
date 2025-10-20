document.addEventListener("DOMContentLoaded", () => {
    const tipoPersonaRadios = document.querySelectorAll('input[name="tipoPersonaRegistrar"]');
    const camposPersona = document.getElementById("camposPersonaRegistrar");
    const camposEmpresa = document.getElementById("camposEmpresaRegistrar");

    // Toggle campos Persona/Empresa
    tipoPersonaRadios.forEach(radio => {
        radio.addEventListener("change", () => {
            if (radio.value === "persona") {
                camposPersona.classList.remove("d-none");
                camposEmpresa.classList.add("d-none");
            } else if (radio.value === "empresa") {
                camposEmpresa.classList.remove("d-none");
                camposPersona.classList.add("d-none");
            }
        });
    });

    // Toggle contraseña (esto se maneja ahora en el HTML con el script inline)

    // Validación y envío del formulario
    const formRegistro = document.getElementById("registroForm");
    formRegistro.addEventListener("submit", (e) => {
        e.preventDefault();
        const password2 = document.getElementById("password2").value.trim();

        // Validar contraseña
        if (password.value !== password2) {
            Swal.fire('Error', 'Las contraseñas no coinciden', 'error');
            return;
        }

        // Determinar tipo de persona
        const tipoPersona = document.querySelector('input[name="tipoPersonaRegistrar"]:checked').value;

        // Construir payload base
        const payload = {
            aliasUsuario: document.getElementById("alias").value.trim(),
            correoUsuario: document.getElementById("correo").value.trim(),
            contrasenaUsuario: password.value.trim(),
            numUsuario: document.getElementById("numero").value.trim(),
            direccionUsuario: document.getElementById("direccion").value.trim(),
            tipoPersona: tipoPersona // lo que espera el backend
        };

        // Campos específicos según tipoPersona
        if (tipoPersona === "persona") {
            payload.nombreUsuario = document.getElementById("nombrePersonaRegistrar").value.trim();
            payload.apellidoPaternoUsuario = document.getElementById("apepaternoRegistrar").value.trim();
            payload.apellidoMaternoUsuario = document.getElementById("apematernoRegistrar").value.trim();
            payload.dni = document.getElementById("dniRegistrar").value.trim();
            payload.sexo = document.getElementById("sexoRegistrar").value;

            // Validaciones obligatorias
            if (!payload.nombreUsuario || !payload.apellidoPaternoUsuario || !payload.dni || !payload.sexo) {
                Swal.fire('Error', 'Debes completar todos los campos de persona', 'error');
                return;
            }

        } else if (tipoPersona === "empresa") {
            payload.nombreEmpresa = document.getElementById("nombreEmpresaRegistrar").value.trim();
            payload.tipoEmpresa = document.getElementById("tipoPersonaEmpresaRegistrar").value; // Jurídica o Natural
            payload.ruc = document.getElementById("rucRegistrar").value.trim();
            payload.f_creacion = document.getElementById("fechaCreacionRegistrar").value;

            // Validaciones obligatorias
            if (!payload.nombreEmpresa || !payload.tipoEmpresa || !payload.ruc || !payload.f_creacion) {
                Swal.fire('Error', 'Debes completar todos los campos de empresa', 'error');
                return;
            }
        }

        console.log("Payload registro:", payload);

        // Enviar al backend
        fetch("/api/auth/registro", {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        })
        .then(res => res.json())
        .then(data => {
            console.log("Respuesta backend:", data);
            if (data.idUsuario) {
                Swal.fire({
                    icon: 'success',
                    title: 'Registro exitoso',
                    text: 'Usuario registrado correctamente',
                    confirmButtonText: 'Aceptar'
                }).then(() => {
                    // Redirigir a iniciar sesión
                    window.location.href = 'iniciarSesion.html';
                });
            } else {
                Swal.fire('Error', data.message || 'Datos inválidos', 'error');
            }
        })
        .catch(err => {
            console.error("Error de conexión:", err);
            Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
        });
    });
});
