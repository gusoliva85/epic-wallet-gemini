const registerForm = document.getElementById('registerForm');
const errorMessage = document.getElementById('errorMessage');
const btnRegister = document.getElementById('btnRegister');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    errorMessage.classList.add('hidden');
    btnRegister.innerText = "CREANDO CUENTA...";
    btnRegister.disabled = true;

    const userData = {
        nombre: document.getElementById('nombre').value.trim(),
        apellido: document.getElementById('apellido').value.trim(),
        usuario: document.getElementById('usuario').value.trim(),
        mail: document.getElementById('mail').value.trim(),
        password: document.getElementById('password').value
    };

    try {
        const response = await fetch('http://127.0.0.1:8000/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            btnRegister.classList.replace('bg-primary', 'bg-green-600');
            btnRegister.innerText = "¡CUENTA CREADA!";
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            // Error detallado (ej: usuario ya existe)
            errorMessage.textContent = data.detail || "Error en el registro";
            errorMessage.classList.remove('hidden');
            btnRegister.innerText = "COMENZAR AHORA";
            btnRegister.disabled = false;
        }
    } catch (err) {
        errorMessage.textContent = "Error de conexión con el servidor";
        errorMessage.classList.remove('hidden');
        btnRegister.innerText = "COMENZAR AHORA";
        btnRegister.disabled = false;
    }
});