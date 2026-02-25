// ============================================
// LÓGICA DE DETALLE HISTÓRICO PREMIUM (2x3)
// ============================================

let usuarioLogueado = "";
let nombreReal = "";
let mesBase = new Date().getMonth();
let anioBase = new Date().getFullYear();
let chartsInstancias = [];

// PALETA DE COLORES VIBRANTES Y PREMIUM
const COLOR_PALETTE = [
    '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#FACC15'
];

const categoryColors = {};
let nextColorIndex = 0;

function getColorForCategory(category) {
    const cat = category.toLowerCase();
    if (categoryColors[cat]) return categoryColors[cat];
    categoryColors[cat] = COLOR_PALETTE[nextColorIndex % COLOR_PALETTE.length];
    nextColorIndex++;
    return categoryColors[cat];
}

document.addEventListener('DOMContentLoaded', () => {
    usuarioLogueado = sessionStorage.getItem('usuarioNombre');
    nombreReal = sessionStorage.getItem('nombreReal') || usuarioLogueado || "Invitado";

    if (!usuarioLogueado) {
        window.location.href = 'login.html';
        return;
    }

    const saludoNombre = document.getElementById('nombreUsuarioDetalle');
    if (saludoNombre) saludoNombre.textContent = nombreReal;

    document.getElementById('btnPeriodoAnterior').addEventListener('click', () => navegar(-1));
    document.getElementById('btnPeriodoSiguiente').addEventListener('click', () => navegar(1));

    const btnAbrirMenu = document.getElementById('btnAbrirMenu');
    const sidebar = document.getElementById('sidebar');
    if (btnAbrirMenu) {
        btnAbrirMenu.addEventListener('click', () => sidebar.classList.toggle('-translate-x-full'));
    }

    document.getElementById('btnLogOut').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'login.html';
    });

    cargarCuadricula();
});

function navegar(direccion) {
    mesBase += direccion;
    const fecha = new Date(anioBase, mesBase, 1);
    mesBase = fecha.getMonth();
    anioBase = fecha.getFullYear();
    cargarCuadricula();
}

async function cargarCuadricula() {
    const grid = document.getElementById('gridMeses');
    if (!grid) return;

    grid.innerHTML = '';
    chartsInstancias.forEach(c => c.destroy());
    chartsInstancias = [];

    const periodos = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(anioBase, mesBase - i, 1);
        periodos.push({
            mes: d.getMonth() + 1,
            anio: d.getFullYear(),
            label: d.toLocaleString('es-AR', { month: 'long' }),
            anioLabel: d.getFullYear()
        });
    }

    const rangoEl = document.getElementById('rangoMeses');
    if (rangoEl) {
        rangoEl.textContent = `${periodos[5].label} ${periodos[5].anioLabel} - ${periodos[0].label} ${periodos[0].anioLabel}`;
    }

    try {
        const promesas = periodos.map(p =>
            fetch(`http://127.0.0.1:8000/movimientos-mensuales?usuario=${usuarioLogueado}&mes=${p.mes}&anio=${p.anio}`)
                .then(res => res.ok ? res.json() : [])
                .catch(() => [])
        );

        const resultados = await Promise.all(promesas);

        resultados.forEach((movimientos, index) => {
            renderizarMes(periodos[index], movimientos, index);
        });
    } catch (error) {
        console.error("Error en carga:", error);
    }
}

function renderizarMes(periodo, movimientos, index) {
    const grid = document.getElementById('gridMeses');

    const categoriasMap = {};
    let totalIngresos = 0;
    let totalGastos = 0;

    movimientos.forEach(m => {
        const montoAbs = Math.abs(m.monto);
        if (m.tipo === 'suma') totalIngresos += montoAbs;
        else totalGastos += montoAbs;

        const key = m.motivo;
        if (!categoriasMap[key]) {
            categoriasMap[key] = { monto: 0, tipo: m.tipo, ids: [] };
        }
        categoriasMap[key].monto += montoAbs;
        categoriasMap[key].ids.push(m.id);
    });

    const catsArray = Object.keys(categoriasMap).map(nombre => ({
        nombre,
        ...categoriasMap[nombre],
        color: getColorForCategory(nombre)
    }));

    catsArray.sort((a, b) => {
        const prioridad = (n) => {
            const l = n.toLowerCase();
            if (l.includes('sueldo')) return 4;
            if (l.includes('alquiler') || l.includes('vivienda') || l.includes('expensas')) return 3;
            if (l.includes('luz') || l.includes('agua') || l.includes('internet') || l.includes('gas')) return 2;
            return 1;
        };
        const pA = prioridad(a.nombre);
        const pB = prioridad(b.nombre);
        if (pA !== pB) return pB - pA;
        return b.monto - a.monto;
    });

    const datosGrafico = catsArray.filter(c => c.tipo === 'resta');
    const tieneDatos = movimientos.length > 0;
    const balance = totalIngresos - totalGastos;

    const card = document.createElement('div');
    card.className = "relative bg-white p-6 sm:p-8 rounded-[4rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col hover:shadow-[0_40px_100px_rgba(99,102,241,0.1)] transition-all duration-700 group min-h-[480px] overflow-hidden";

    card.innerHTML = `
        <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-50/20 rounded-full blur-[100px] group-hover:bg-indigo-100/30 transition-colors"></div>
        
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 relative z-10">
            <div class="flex flex-col">
                <h3 class="text-3xl font-black text-gray-900 capitalize tracking-tighter group-hover:text-indigo-600 transition-colors duration-500">${periodo.label}</h3>
                <span class="text-[12px] font-black text-indigo-400 tracking-[0.5em] uppercase">${periodo.anioLabel}</span>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="agregarNuevoItem(${periodo.mes}, ${periodo.anio})" 
                    class="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                    title="Agregar Movimiento">
                    <i class="bi bi-plus-lg"></i>
                </button>
                <div class="px-5 py-2 bg-gray-50/80 backdrop-blur-md border border-gray-100 shadow-sm rounded-3xl text-[10px] font-black text-gray-500 uppercase">
                    ${tieneDatos ? movimientos.length + ' OPERACIONES' : 'SIN DATOS'}
                </div>
            </div>
        </div>

        <div class="flex flex-col xl:flex-row gap-8 flex-1 relative z-10">
            <!-- Gráfico de Alta Precisión con Balance Centrado -->
            <div class="w-full xl:w-[50%] flex flex-col items-center justify-center relative min-h-[300px]">
                <canvas id="chart-${index}" class="relative z-10 w-full max-w-[280px] drop-shadow-2xl"></canvas>
                <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center leading-none mb-3">Balance Mensual</span>
                    <span class="text-4xl font-black ${balance < 0 ? 'text-rose-500' : 'text-emerald-600'} tracking-tighter drop-shadow-md">
                        $${Math.abs(balance).toLocaleString('es-AR')}
                    </span>
                </div>
            </div>

            <!-- Listado con Líneas de Color Completas -->
            <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[340px]">
                <table class="w-full border-separate border-spacing-y-0.5">
                    <tbody>
                        ${tieneDatos ? catsArray.map(cat => `
                            <tr class="group/row hover:bg-indigo-50/40 transition-all cursor-default">
                                <td class="py-0.5 px-3">
                                    <div class="flex flex-col">
                                        <span class="font-bold text-gray-800 text-[14px] leading-tight mb-1 truncate group-hover/row:text-indigo-600">${cat.nombre}</span>
                                        <!-- Línea de Color Completas -->
                                        <div class="h-[3px] w-full rounded-full opacity-80" style="background-color: ${cat.tipo === 'suma' ? '#10b981' : cat.color}"></div>
                                    </div>
                                </td>
                                <td class="py-0.5 px-3 text-right">
                                    <span class="font-black text-[14px] ${cat.tipo === 'suma' ? 'text-emerald-600' : 'text-rose-600'} leading-none">
                                        $${cat.monto.toLocaleString('es-AR')}
                                    </span>
                                    <div class="flex items-center justify-end gap-2 mt-1 opacity-0 group-hover/row:opacity-100 transition-all">
                                        <button onclick="abrirModalEditar(${cat.ids[0]}, ${cat.ids.length > 1 ? 'null' : (movimientos.find(m => m.id === cat.ids[0])?.id_motivo || 'null')}, ${cat.monto}, ${periodo.mes}, ${periodo.anio})" class="w-7 h-7 flex items-center justify-center bg-indigo-50 text-indigo-500 rounded-xl hover:bg-indigo-500 hover:text-white transition-all"><i class="bi bi-pencil-square text-xs"></i></button>
                                        <button onclick="eliminarFuga(${cat.ids[0]})" class="w-7 h-7 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><i class="bi bi-trash text-xs"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="2" class="py-20 text-center flex flex-col items-center justify-center">
                                    <p class="text-gray-300 font-bold uppercase tracking-widest opacity-40 text-sm mb-6">No registra datos</p>
                                    <button onclick="agregarBasicos(${periodo.mes}, ${periodo.anio})" 
                                        class="px-6 py-3 bg-indigo-50 text-indigo-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                        <i class="bi bi-magic mr-2"></i> Agregar Básicos
                                    </button>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    grid.appendChild(card);

    if (datosGrafico.length > 0) {
        initChart(index, datosGrafico);
    } else if (tieneDatos) {
        const ctx = document.getElementById(`chart-${index}`).getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: { datasets: [{ data: [1], backgroundColor: ['#F1F5F9'], borderWidth: 0 }] },
            options: { cutout: '85%', plugins: { legend: false, tooltip: false }, responsive: true }
        });
    }
}

function initChart(index, cats) {
    const canvas = document.getElementById(`chart-${index}`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    chartsInstancias.push(new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: cats.map(c => c.nombre),
            datasets: [{
                data: cats.map(c => c.monto),
                backgroundColor: cats.map(c => c.color),
                borderWidth: 1.5,
                borderColor: '#ffffff',
                hoverOffset: 35,
                borderRadius: 0,
                spacing: 1
            }]
        },
        options: {
            cutout: '68%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.98)',
                    padding: 20,
                    titleFont: { size: 16, weight: '900', family: 'Inter' },
                    bodyFont: { size: 14 },
                    cornerRadius: 30,
                    boxPadding: 10,
                    callbacks: {
                        label: (item) => ` Valor: $${item.raw.toLocaleString('es-AR')}`
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: true,
            layout: { padding: 15 },
            animation: {
                duration: 3000,
                easing: 'easeOutElastic',
                animateRotate: true,
                animateScale: true
            }
        }
    }));
}

// --- EDICIÓN ---
let currentEditId = null;
let currentMonthTarget = null; // { mes, anio }

async function abrirModalEditar(id, idMotivo, monto, mes, anio) {
    currentEditId = id;
    currentMonthTarget = { mes, anio };

    document.getElementById('editId').value = id;
    document.getElementById('editMonto').value = Math.abs(monto);

    // Cargar motivos para ese mes específico en el select del modal
    await cargarMotivosParaEdicion(mes, anio, idMotivo);

    document.getElementById('modalEditar').classList.remove('hidden');
}

async function cargarMotivosParaEdicion(mes, anio, selectedId) {
    const select = document.getElementById('editMotivo');
    select.innerHTML = '<option value="">Cargando...</option>';

    try {
        const res = await fetch(`http://127.0.0.1:8000/motivos?usuario=${usuarioLogueado}&mes=${mes}&anio=${anio}`);
        const motivos = await res.json();

        select.innerHTML = '';
        motivos.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.nombre;
            if (m.id === selectedId) opt.selected = true;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Error al cargar motivos para edición", e);
    }
}

function cerrarModalEditar() { document.getElementById('modalEditar').classList.add('hidden'); }

async function guardarEdicion() {
    const monto = parseInt(document.getElementById('editMonto').value);
    const idMotivo = parseInt(document.getElementById('editMotivo').value);

    if (!monto || monto < 0) return alert("Ingresá un monto válido");
    if (!idMotivo) return alert("Seleccioná una categoría");

    try {
        const response = await fetch(`http://127.0.0.1:8000/movimientos/${currentEditId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monto: monto, id_motivo: idMotivo })
        });
        if (response.ok) {
            cerrarModalEditar();
            cargarCuadricula();
        }
    } catch (e) { console.error(e); }
}

async function eliminarFuga(id) {
    if (!confirm("¿Deseas eliminar este registro?")) return;
    try {
        const r = await fetch(`http://127.0.0.1:8000/movimientos/${id}`, { method: 'DELETE' });
        if (r.ok) cargarCuadricula();
    } catch (e) { console.error(e); }
}

async function agregarBasicos(mes, anio) {
    try {
        const r = await fetch('http://127.0.0.1:8000/movimientos-basicos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: usuarioLogueado, mes, anio })
        });
        if (r.ok) cargarCuadricula();
    } catch (e) { console.error(e); }
}

/**
 * Función para agregar un item vacío (0) a un mes específico
 * Esto permite luego editarlo para poner el valor real.
 */
async function agregarNuevoItem(mes, anio) {
    // Para simplificar, abrimos el modal de motivos del Home o creamos uno rápido.
    // Aquí simplemente pedimos el primer motivo disponible o mostramos un prompt rápido.
    try {
        const resMotivos = await fetch(`http://127.0.0.1:8000/motivos?usuario=${usuarioLogueado}&mes=${mes}&anio=${anio}`);
        const motivos = await resMotivos.json();

        if (motivos.length === 0) {
            // Si no hay motivos, forzamos la creación de básicos primero
            if (confirm("Este mes no tiene categorías. ¿Deseas agregar los básicos primero?")) {
                await agregarBasicos(mes, anio);
            }
            return;
        }

        // Seleccionamos el primer motivo por defecto para crear un registro en 0
        const idMotivo = motivos[0].id;

        const r = await fetch('http://127.0.0.1:8000/movimientos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                monto: 0,
                id_motivo: idMotivo,
                usuario: usuarioLogueado
            })
        });

        if (r.ok) {
            const data = await r.json();
            // Abrimos el modal de edición inmediatamente para que el usuario complete el monto
            abrirModalEditar(data.id, idMotivo, 0, mes, anio);
        }
    } catch (e) { console.error(e); }
}
