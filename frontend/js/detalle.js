// ============================
// LOGICA DE DETALLE MENSUAL
// ============================

let todosMovimientos = [];
let usuarioLogueado = "";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Validar Sesión
    usuarioLogueado = sessionStorage.getItem('usuarioNombre');
    if (!usuarioLogueado) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Setup Filtros de Fecha (Mes actual por defecto)
    const hoy = new Date();
    const selectMes = document.getElementById('filtroMes');
    const selectAnio = document.getElementById('filtroAnio');

    selectMes.value = hoy.getMonth();
    selectAnio.value = hoy.getFullYear();

    // 3. Listeners
    selectMes.addEventListener('change', filtrarYRenderizar);
    selectAnio.addEventListener('change', filtrarYRenderizar);

    document.getElementById('buscador').addEventListener('input', (e) => {
        filtrarYRenderizar(); // Filtrado en tiempo real por texto
    });

    // 4. Mobile Menu
    const btnAbrirMenu = document.getElementById('btnAbrirMenu');
    const sidebar = document.getElementById('sidebar');
    if (btnAbrirMenu) {
        btnAbrirMenu.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
        });
    }

    document.getElementById('btnLogOut').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'login.html';
    });

    // 5. Cargar Datos
    cargarMovimientos();
});


async function cargarMovimientos() {
    try {
        const response = await fetch(`http://127.0.0.1:8000/movimientos/${usuarioLogueado}`);
        if (!response.ok) throw new Error("Error al cargar datos");
        todosMovimientos = await response.json();
        filtrarYRenderizar();
    } catch (error) {
        console.error("Error:", error);
        alert("No se pudieron cargar los movimientos");
    }
}

function filtrarYRenderizar() {
    const mes = parseInt(document.getElementById('filtroMes').value);
    const anio = parseInt(document.getElementById('filtroAnio').value);
    const textoBusqueda = document.getElementById('buscador').value.toLowerCase();

    // Filtros
    let filtrados = todosMovimientos.filter(m => {
        const fecha = new Date(m.fecha);
        const coincideFecha = fecha.getMonth() === mes && fecha.getFullYear() === anio;
        const coincideTexto = m.motivo.toLowerCase().includes(textoBusqueda);
        return coincideFecha && coincideTexto;
    });

    // Ordenar por fecha descendente
    filtrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    renderizarTabla(filtrados);
    actualizarResumen(filtrados);
}

function renderizarTabla(movimientos) {
    const tbody = document.getElementById('tablaDetalle');
    const emptyState = document.getElementById('emptyState');
    tbody.innerHTML = '';

    if (movimientos.length === 0) {
        tbody.parentElement.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    tbody.parentElement.classList.remove('hidden');
    emptyState.classList.add('hidden');

    movimientos.forEach(mov => {
        const fecha = new Date(mov.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        const esIngreso = mov.tipo === 'suma';
        const colorMonto = esIngreso ? 'text-emerald-600' : 'text-rose-600';
        const signo = esIngreso ? '+' : '-';

        let iconClass = 'bi-credit-card';
        const n = mov.motivo.toLowerCase();
        if (n.includes('sueldo')) iconClass = 'bi-cash-coin';
        if (n.includes('alquiler')) iconClass = 'bi-house';
        if (n.includes('comida') || n.includes('super')) iconClass = 'bi-cart';

        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 transition-colors group";
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${fecha}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs">
                        <i class="bi ${iconClass}"></i>
                    </div>
                    <span class="font-medium text-gray-700">${mov.motivo}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${esIngreso ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
                    ${esIngreso ? 'Ingreso' : 'Gasto'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right font-bold text-sm ${colorMonto}">
                ${signo} $${Math.abs(mov.monto).toLocaleString('es-AR')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
                <button onclick="abrirModalEditar(${mov.id}, ${Math.abs(mov.monto)})" class="text-gray-400 hover:text-indigo-600 transition p-2" title="Editar">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button onclick="eliminarMovimiento(${mov.id})" class="text-gray-400 hover:text-rose-600 transition p-2" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function actualizarResumen(movimientos) {
    let ingresos = 0;
    let gastos = 0;

    movimientos.forEach(m => {
        if (m.tipo === 'suma') ingresos += Math.abs(m.monto);
        else gastos += Math.abs(m.monto);
    });

    document.getElementById('totalIngresosMes').textContent = '$ ' + ingresos.toLocaleString('es-AR');
    document.getElementById('totalGastosMes').textContent = '$ ' + gastos.toLocaleString('es-AR');

    document.getElementById('balanceNetoMes').textContent = '$ ' + (ingresos - gastos).toLocaleString('es-AR');
}


// --- EDITAR ---
let currentEditId = null;

function abrirModalEditar(id, montoActual) {
    currentEditId = id;
    document.getElementById('editMonto').value = Math.abs(montoActual); // Siempre positivo para editar
    document.getElementById('editId').value = id;
    document.getElementById('modalEditar').classList.remove('hidden');
}

function cerrarModalEditar() {
    document.getElementById('modalEditar').classList.add('hidden');
    currentEditId = null;
}

async function guardarEdicion() {
    const nuevoMonto = parseFloat(document.getElementById('editMonto').value);
    if (isNaN(nuevoMonto) || nuevoMonto <= 0) {
        alert("Monto inválido");
        return;
    }

    // Buscamos el movimiento original para mantener su signo (solo editamos magnitud por ahora)
    const movOriginal = todosMovimientos.find(m => m.id === currentEditId);
    if (!movOriginal) return;

    // Si era resta, lo mantenemos negativo. Si era suma, positivo.
    const montoFinal = movOriginal.tipo === 'resta' ? -nuevoMonto : nuevoMonto;

    try {
        const response = await fetch(`http://127.0.0.1:8000/movimientos/${currentEditId}`, {
            method: 'PUT', // Requiere endpoint PUT en backend (Si no existe, fallará, asumimos que existe o lo creamos)
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monto: montoFinal })  // Backend debe soportar patch parcial o full update
        });

        // NOTA: Si el backend no tiene PUT, esto dará 405. 
        // Si falla, el plan B es borrar y crear uno nuevo, pero idealmente es hacer un UPDATE.
        // Asumimos por ahora que solo tenemos GET/POST/DELETE.
        // Si falla: alert("Edición no implementada en backend aún");

        if (response.ok) {
            cerrarModalEditar();
            cargarMovimientos(); // Recargar
        } else {
            // Fallback si no hay PUT: Alertar
            alert("El backend no soporta edición directa todavía. Borrá y creá de nuevo.");
        }
    } catch (e) {
        console.error(e);
    }
}

// --- ELIMINAR ---
async function eliminarMovimiento(id) {
    if (!confirm("¿Eliminar transacción?")) return;

    try {
        await fetch(`http://127.0.0.1:8000/movimientos/${id}`, { method: 'DELETE' });
        cargarMovimientos();
    } catch (e) {
        alert("Error al eliminar");
    }
}
