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

    // Toggle contraseña
    const togglePassword = document.getElementById("togglePassword");
    const password = document.getElementById("password");
    togglePassword.addEventListener("click", () => {
        if (password.type === "password") {
            password.type = "text";
            togglePassword.innerHTML = '<i class="bi bi-eye-slash"></i>';
        } else {
            password.type = "password";
            togglePassword.innerHTML = '<i class="bi bi-eye"></i>';
        }
    });

    // Validación simple de formulario
    const formRegistro = document.getElementById("registroForm");
    formRegistro.addEventListener("submit", (e) => {
        e.preventDefault();
        const password2 = document.getElementById("password2").value.trim();

        if (password.value !== password2) {
            alert("Las contraseñas no coinciden");
            return;
        }

        // Determinar si es empresa o persona
        const esEmpresa = document.querySelector('input[name="tipoPersonaRegistrar"]:checked').value === "empresa";

        // Armar payload con los campos exactos que espera auth.js
        const payload = {
            aliasUsuario: document.getElementById("alias").value.trim(),
            correoUsuario: document.getElementById("correo").value.trim(),
            contrasenaUsuario: password.value.trim(),
            numUsuario: document.getElementById("numero").value.trim(),
            direccionUsuario: document.getElementById("direccion").value.trim(),
            esEmpresa: esEmpresa
        };

        if (!esEmpresa) {
            payload.nombreUsuario = document.getElementById("nombrePersonaRegistrar").value.trim();
            payload.apellidoPaternoUsuario = document.getElementById("apepaternoRegistrar").value.trim();
            payload.apellidoMaternoUsuario = document.getElementById("apematernoRegistrar").value.trim();
            payload.dni = document.getElementById("dniRegistrar").value.trim();
            payload.sexo = document.getElementById("sexoRegistrar").value; // "M" o "F"
        } else {
            payload.nombreEmpresa = document.getElementById("nombreEmpresaRegistrar").value.trim();
            payload.tipoPersona = document.getElementById("tipoPersonaEmpresaRegistrar").value; // "Jurídica" o "Natural"
            payload.ruc = document.getElementById("rucRegistrar").value.trim();
            payload.f_creacion = document.getElementById("fechaCreacionRegistrar").value; // YYYY-MM-DD
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
                if (data.idUsuario) { // auth.js responde con { message, idUsuario }
                    Swal.fire({
                        icon: 'success',
                        title: 'Registro exitoso',
                        text: 'Usuario registrado correctamente',
                        confirmButtonText: 'Aceptar'
                    }).then(() => {
                        formRegistro.reset();
                        camposPersona.classList.remove("d-none");
                        camposEmpresa.classList.add("d-none");
                    });
                } else {
                    Swal.fire('Error', data.message || 'Error en el registro', 'error');
                }
            })
            .catch(err => {
                console.error("Error de conexión:", err);
                Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
            });
    });
});
