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
        const response = await fetch('http://127.0.0.1:8000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario: userInput.value.trim(),
                password: passInput.value
            })
        });

        const data = await response.json();

        if (response.ok) {
            // ÉXITO: GUARDAR EL NOMBRE EN LA SESIÓN
            // Tomamos el valor que el usuario escribió en el input
            sessionStorage.setItem('usuarioNombre', data.usuario); //userInput.value.trim());
            sessionStorage.setItem('nombreReal', data.nombreReal);

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
        errorMessage.textContent = "Servidor fuera de línea";
        errorMessage.classList.remove('hidden');
        btnLogin.innerText = "INGRESAR";
        btnLogin.disabled = false;
    }
});