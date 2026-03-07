const loginForm = document.getElementById('loginForm');
const userInput = document.getElementById('userInput');
const passInput = document.getElementById('passInput');
const btnLogin = document.getElementById('btnLogin');
const errorMessage = document.getElementById('errorMessage');

// 1. Lógica de validación visual del botón
function validarInputs() {
    const user = userInput.value.trim();
    const pass = passInput.value.trim();

    // Regla: Usuario 6-20 caracteres y sin espacios
    const isUserValid = user.length >= 6 && user.length <= 20 && !user.includes(' ');
    const isPassValid = pass.length >= 1;

    if (isUserValid && isPassValid) {
        btnLogin.disabled = false;
    } else {
        btnLogin.disabled = true;
    }
}

userInput.addEventListener('input', validarInputs);
passInput.addEventListener('input', validarInputs);

// 2. Envío de datos al Backend
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Limpiar errores previos
    errorMessage.classList.add('hidden');
    btnLogin.innerText = "VERIFICANDO...";
    btnLogin.disabled = true;

    try {
        const response = await api.post('/login', {
            usuario: userInput.value.trim(),
            password: passInput.value
        });

        if (!response) {
            throw new Error("No response from server");
        }

        const data = await response.json();

        if (response.ok) {
            // ÉXITO: GUARDAR EL TOKEN Y EL NOMBRE EN AMBOS POR COMPATIBILIDAD file://
            api.setToken(data.access_token);

            localStorage.setItem('usuarioNombre', data.usuario);
            localStorage.setItem('nombreReal', data.nombreReal);

            sessionStorage.setItem('usuarioNombre', data.usuario);
            sessionStorage.setItem('nombreReal', data.nombreReal);

            console.log("[Login] Datos de sesión guardados.");

            btnLogin.innerText = "¡ÉXITO!";
            btnLogin.classList.replace('bg-primary', 'bg-green-600');

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);

        } else {
            // ERROR: Mostrar mensaje del backend
            errorMessage.textContent = data.detail || "Error al ingresar";
            errorMessage.classList.remove('hidden');
            btnLogin.innerText = "INGRESAR";
            btnLogin.disabled = false;
        }
    } catch (err) {
        console.error("Login error:", err);
        errorMessage.textContent = "Servidor fuera de línea o error de red";
        errorMessage.classList.remove('hidden');
        btnLogin.innerText = "INGRESAR";
        btnLogin.disabled = false;
    }
});