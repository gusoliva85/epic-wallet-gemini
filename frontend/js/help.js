/**
 * EPIC WALLET - Sistema de Ayuda Centralizado
 * Maneja la apertura del modal y la interactividad de los iconos de información.
 */

document.addEventListener('DOMContentLoaded', () => {
    inicializarEventosAyuda();
});

/**
 * Inicializa los listeners para los triggers de ayuda
 */
function inicializarEventosAyuda() {
    // Actualmente el click se maneja con el atributo 'onclick' en el HTML.
    // Esta función queda lista para futuras expansiones de interactividad.
    console.log("Sistema de ayuda inicializado (solo click).");
}

/**
 * Abre el modal de ayuda con la información correspondiente
 * @param {string} clave - La clave del objeto datosAyuda en ayuda.js
 */
function abrirAyuda(clave) {
    const modal = document.getElementById('modalAyuda');
    const titulo = document.getElementById('ayudaTitulo');
    const cuerpo = document.getElementById('ayudaCuerpo');

    if (!modal || !titulo || !cuerpo) {
        console.error("No se encontraron los elementos del modal de ayuda en el DOM");
        return;
    }

    // datosAyuda viene del archivo ayuda.js cargado previamente en index.html
    if (typeof datosAyuda === 'undefined') {
        console.error("El objeto datosAyuda no está definido. Asegúrate de que ayuda.js esté cargado.");
        return;
    }

    const info = datosAyuda[clave];

    if (info) {
        titulo.innerText = info.titulo;
        cuerpo.innerText = info.cuerpo;

        // Mostrar modal con animación
        modal.classList.remove('hidden');
        modal.classList.add('flex', 'animate-fade-in');
    } else {
        console.warn(`No se encontró información de ayuda para la clave: ${clave}`);
    }
}

/**
 * Cierra el modal de ayuda
 */
function cerrarAyuda() {
    const modal = document.getElementById('modalAyuda');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Cerrar modal al hacer clic fuera del contenido
window.addEventListener('click', (event) => {
    const modal = document.getElementById('modalAyuda');
    if (event.target === modal) {
        cerrarAyuda();
    }
});
