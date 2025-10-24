document.addEventListener("DOMContentLoaded", () => {
    const tipoPersonaRadios = document.querySelectorAll('input[name="tipoPersonaRegistrar"]');
    const camposPersona = document.getElementById("camposPersonaRegistrar");
    const camposEmpresa = document.getElementById("camposEmpresaRegistrar");

    // ===================================================
    // VALIDACIONES Y LÍMITES SEGÚN BASE DE DATOS
    // ===================================================

    // Alias: máximo 30 caracteres
    const aliasInput = document.getElementById("alias");
    aliasInput.setAttribute("maxlength", "30");
    aliasInput.addEventListener("input", (e) => {
        if (e.target.value.length >= 30) {
            e.target.value = e.target.value.substring(0, 30);
        }
    });

    // Correo: validación de formato
    const correoInput = document.getElementById("correo");
    correoInput.setAttribute("maxlength", "50");
    correoInput.addEventListener("input", (e) => {
        if (e.target.value.length >= 50) {
            e.target.value = e.target.value.substring(0, 50);
        }
    });

    // Teléfono: solo números, máximo 9 dígitos, sin espacios
    const telefonoInput = document.getElementById("numero");
    telefonoInput.setAttribute("maxlength", "9");
    telefonoInput.addEventListener("input", (e) => {
        // Solo permitir números
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        if (e.target.value.length >= 9) {
            e.target.value = e.target.value.substring(0, 9);
        }
    });

    // Bloquear teclas no numéricas en teléfono
    telefonoInput.addEventListener("keypress", (e) => {
        if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }
    });

    // Dirección: máximo 50 caracteres
    const direccionInput = document.getElementById("direccion");
    direccionInput.setAttribute("maxlength", "50");

    // Nombres: solo letras y espacios, máximo 30 caracteres
    const nombreInput = document.getElementById("nombrePersonaRegistrar");
    if (nombreInput) {
        nombreInput.setAttribute("maxlength", "30");
        nombreInput.addEventListener("input", (e) => {
            // Solo letras y espacios
            e.target.value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
            if (e.target.value.length >= 30) {
                e.target.value = e.target.value.substring(0, 30);
            }
        });

        // Bloquear teclas no alfabéticas en nombres
        nombreInput.addEventListener("keypress", (e) => {
            if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
        });
    }

    // Apellido Paterno: solo letras y espacios, máximo 30 caracteres
    const apePaternoInput = document.getElementById("apepaternoRegistrar");
    if (apePaternoInput) {
        apePaternoInput.setAttribute("maxlength", "30");
        apePaternoInput.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
            if (e.target.value.length >= 30) {
                e.target.value = e.target.value.substring(0, 30);
            }
        });

        // Bloquear teclas no alfabéticas en apellido paterno
        apePaternoInput.addEventListener("keypress", (e) => {
            if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
        });
    }

    // Apellido Materno: solo letras y espacios, máximo 30 caracteres
    const apeMaternoInput = document.getElementById("apematernoRegistrar");
    if (apeMaternoInput) {
        apeMaternoInput.setAttribute("maxlength", "30");
        apeMaternoInput.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
            if (e.target.value.length >= 30) {
                e.target.value = e.target.value.substring(0, 30);
            }
        });

        // Bloquear teclas no alfabéticas en apellido materno
        apeMaternoInput.addEventListener("keypress", (e) => {
            if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
        });
    }

    // DNI: solo números, exactamente 8 dígitos
    const dniInput = document.getElementById("dniRegistrar");
    if (dniInput) {
        dniInput.setAttribute("maxlength", "8");
        dniInput.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value.length >= 8) {
                e.target.value = e.target.value.substring(0, 8);
            }
        });

        // Bloquear teclas no numéricas en DNI
        dniInput.addEventListener("keypress", (e) => {
            if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
        });
    }

    // Nombre Empresa: máximo 50 caracteres
    const nombreEmpresaInput = document.getElementById("nombreEmpresaRegistrar");
    if (nombreEmpresaInput) {
        nombreEmpresaInput.setAttribute("maxlength", "50");
    }

    // RUC: solo números, máximo 20 dígitos
    const rucInput = document.getElementById("rucRegistrar");
    if (rucInput) {
        rucInput.setAttribute("maxlength", "20");
        rucInput.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value.length >= 20) {
                e.target.value = e.target.value.substring(0, 20);
            }
        });

        // Bloquear teclas no numéricas en RUC
        rucInput.addEventListener("keypress", (e) => {
            if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
        });
    }

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

    // Agregar debugging
    console.log("Formulario encontrado:", formRegistro);

    // Agregar evento de click al botón también
    const botonRegistro = document.querySelector('button[type="submit"]');
    if (botonRegistro) {
        console.log("Botón encontrado:", botonRegistro);
        botonRegistro.addEventListener("click", (e) => {
            console.log("Botón clickeado!");
            // No prevenir el evento aquí, dejar que el submit se maneje
        });
    }

    formRegistro.addEventListener("submit", (e) => {
        console.log("Formulario enviado!");
        e.preventDefault();

        // Mensaje de prueba
        Swal.fire('Info', 'Formulario enviado correctamente', 'info');

        const password = document.getElementById("password");
        const password2 = document.getElementById("password2").value.trim();

        console.log("Validando formulario...");

        // Validación básica de campos obligatorios
        const alias = document.getElementById("alias").value.trim();
        const correo = document.getElementById("correo").value.trim();

        if (!alias || !correo || !password.value) {
            Swal.fire('Error', 'Debes completar todos los campos obligatorios', 'error');
            return;
        }

        // Validar contraseña
        if (password.value !== password2) {
            Swal.fire('Error', 'Las contraseñas no coinciden', 'error');
            return;
        }

        // Validar formato de correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo)) {
            Swal.fire('Error', 'El formato del correo electrónico no es válido', 'error');
            return;
        }

        // Validar teléfono
        const telefono = document.getElementById("numero").value.trim();
        if (telefono.length !== 9) {
            Swal.fire('Error', 'El teléfono debe tener exactamente 9 dígitos', 'error');
            return;
        }

        // Validar DNI (si es persona)
        const tipoPersona = document.querySelector('input[name="tipoPersonaRegistrar"]:checked').value;
        if (tipoPersona === "persona") {
            const dni = document.getElementById("dniRegistrar").value.trim();
            if (dni.length !== 8) {
                Swal.fire('Error', 'El DNI debe tener exactamente 8 dígitos', 'error');
                return;
            }
        }

        // Validar RUC (si es empresa)
        if (tipoPersona === "empresa") {
            const ruc = document.getElementById("rucRegistrar").value.trim();
            if (ruc.length < 11 || ruc.length > 20) {
                Swal.fire('Error', 'El RUC debe tener entre 11 y 20 dígitos', 'error');
                return;
            }
        }

        // Construir payload base
        const payload = {
            aliasUsuario: document.getElementById("alias").value.trim(),
            correoUsuario: document.getElementById("correo").value.trim(),
            claveusuario: password.value.trim(),
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
