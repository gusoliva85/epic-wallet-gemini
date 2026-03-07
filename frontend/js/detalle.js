// ============================================
// LÓGICA DE DETALLE HISTÓRICO PREMIUM (2x3)
// ============================================

let usuarioLogueado = "";
let nombreReal = "";
// Inicializar mesBase al mes anterior al actual (Límite superior)
let mesBase = new Date().getMonth() - 1;
let anioBase = new Date().getFullYear();

// Ajustar si el mes actual es Enero (0)
if (mesBase < 0) {
    mesBase = 11;
    anioBase--;
}

let chartsInstancias = [];
let minAnchorDate = null; // Fecha mínima permitida para el anchor (mesBase/anioBase)
let maxAnchorDate = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);

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
    usuarioLogueado = localStorage.getItem('usuarioNombre') || sessionStorage.getItem('usuarioNombre');
    const token = api.getToken();
    nombreReal = localStorage.getItem('nombreReal') || sessionStorage.getItem('nombreReal') || usuarioLogueado || "Invitado";

    console.log("[Detalle] Verificando sesión:", { usuarioLogueado, token: token ? 'OK' : 'MISSING' });

    if (!usuarioLogueado || !token) {
        api.logout();
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

    const btnLogOut = document.getElementById('btnLogOut') || document.getElementById('logoutBtn');
    if (btnLogOut) {
        btnLogOut.addEventListener('click', (e) => {
            e.preventDefault();
            api.logout();
        });
    }

    cargarCuadricula();
});

async function navegar(direccion) {
    // Calcular nueva fecha potencial
    let nuevoMes = mesBase + direccion;
    let fecha = new Date(anioBase, nuevoMes, 1);

    // Verificar límite superior (No permitir mes actual ni futuros)
    const hoy = new Date();
    const limiteSup = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    if (fecha >= limiteSup) return;

    // Verificar límite inferior (2 meses antes del último con datos)
    if (minAnchorDate && fecha < minAnchorDate) return;

    mesBase = fecha.getMonth();
    anioBase = fecha.getFullYear();
    await cargarCuadricula();
}

function actualizarControlesNavegacion() {
    const btnAnt = document.getElementById('btnPeriodoAnterior');
    const btnSig = document.getElementById('btnPeriodoSiguiente');
    if (!btnAnt || !btnSig) return;

    const hoy = new Date();
    const limiteSup = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    // Siguiente (Hacia el futuro)
    const fechaSig = new Date(anioBase, mesBase + 1, 1);
    if (fechaSig >= limiteSup) {
        btnSig.disabled = true;
        btnSig.classList.add('opacity-30', 'cursor-not-allowed');
    } else {
        btnSig.disabled = false;
        btnSig.classList.remove('opacity-30', 'cursor-not-allowed');
    }

    // Anterior (Hacia el pasado)
    const fechaAnt = new Date(anioBase, mesBase - 1, 1);
    if (minAnchorDate && fechaAnt < minAnchorDate) {
        btnAnt.disabled = true;
        btnAnt.classList.add('opacity-30', 'cursor-not-allowed');
    } else {
        btnAnt.disabled = false;
        btnAnt.classList.remove('opacity-30', 'cursor-not-allowed');
    }
}

async function calcularLimites() {
    try {
        const res = await api.get('/historial-resumen');
        const historial = (res && res.ok) ? await res.json() : [];

        // Referencia base para límites si no hay datos (Mes anterior al actual)
        const hoy = new Date();
        const refDate = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);

        if (historial && historial.length > 0) {
            // Encontrar el mes más antiguo con datos
            let first = historial[0];
            let firstM = first.mes !== undefined ? first.mes : first[0];
            let firstA = first.anio !== undefined ? first.anio : first[1];
            let minDataDate = new Date(firstA, firstM - 1, 1);

            historial.forEach(h => {
                let m = h.mes !== undefined ? h.mes : h[0];
                let a = h.anio !== undefined ? h.anio : h[1];
                const d = new Date(a, m - 1, 1);
                if (d < minDataDate) minDataDate = d;
            });

            // Límite Inferior: permitir que el ANCLA (mesBase) retroceda hasta 2 meses antes del dato más antiguo
            minAnchorDate = new Date(minDataDate.getFullYear(), minDataDate.getMonth() - 2, 1);
        } else {
            // Si no hay datos, permitimos retroceder 2 meses desde la vista inicial
            minAnchorDate = new Date(refDate.getFullYear(), refDate.getMonth() - 2, 1);
        }
    } catch (e) {
        console.error("Error calculando límites:", e);
    }
}

async function cargarCuadricula() {
    await calcularLimites();
    actualizarControlesNavegacion();
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
            api.get(`/movimientos-mensuales?mes=${p.mes}&anio=${p.anio}`)
                .then(res => res && res.ok ? res.json() : [])
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
        const key = m.motivo;

        if (!categoriasMap[key]) {
            categoriasMap[key] = { monto: 0, tipo: m.tipo, ids: [], rawData: [] };
        }

        // Sumamos el valor absoluto al "balde" de la categoría
        categoriasMap[key].monto += montoAbs;
        categoriasMap[key].ids.push(m.id);
        categoriasMap[key].rawData.push(m);

        // Los totales globales se basan estrictamente en el TIPO de la categoría
        if (m.tipo === 'suma') {
            totalIngresos += montoAbs;
        } else {
            totalGastos += montoAbs;
        }
    });

    const catsArray = Object.keys(categoriasMap).map(nombre => {
        const catData = categoriasMap[nombre];
        return {
            nombre,
            ...catData,
            displayMonto: catData.monto, // Ya es absoluto por la lógica anterior
            isNegativeUI: catData.tipo === 'resta',
            color: getColorForCategory(nombre)
        };
    });

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
                <button onclick="abrirModalNuevo(${periodo.mes}, ${periodo.anio})" 
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

            <!-- Listado Agrupado con Expansión -->
            <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[340px]">
                <table class="w-full border-separate border-spacing-y-0.5">
                    <tbody>
                        ${tieneDatos ? catsArray.map(cat => {
        const isGroup = cat.ids.length > 1;
        return `
                            <tr class="group/row hover:bg-indigo-50/40 transition-all cursor-default">
                                <td class="py-1 px-2 sm:px-3 max-w-[120px] sm:max-w-none" 
                                    ${isGroup ? `onclick="toggleGrupo('${index}-${cat.nombre.replace(/\s+/g, '')}')"` : ''}>
                                    <div class="flex flex-col">
                                        <div class="flex items-center gap-2">
                                            <span class="font-bold text-gray-800 text-[13px] sm:text-[14px] leading-tight mb-1 truncate group-hover/row:text-indigo-600" title="${cat.nombre}">${cat.nombre}</span>
                                            ${isGroup ? `<span class="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[9px] font-black rounded-full uppercase">${cat.ids.length} ítems</span>` : ''}
                                        </div>
                                        <div class="h-[3px] w-full rounded-full opacity-80" style="background-color: ${cat.tipo === 'suma' ? '#10b981' : cat.color}"></div>
                                    </div>
                                </td>
                                <td class="py-1 px-2 sm:px-3 text-right whitespace-nowrap">
                                    <span class="font-black text-[13px] sm:text-[14px] ${cat.isNegativeUI ? 'text-rose-600' : 'text-emerald-600'} leading-none">
                                        ${cat.isNegativeUI ? '-' : ''}$${cat.displayMonto.toLocaleString('es-AR')}
                                    </span>
                                    <div class="flex items-center justify-end gap-1 sm:gap-2 mt-1 opacity-0 group-hover/row:opacity-100 transition-all">
                                        ${!isGroup ? `
                                            <button onclick="abrirModalEditar(${cat.ids[0]}, ${cat.rawData[0].id_motivo}, ${cat.displayMonto}, ${periodo.mes}, ${periodo.anio}, '${cat.tipo}')" 
                                                class="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-indigo-50 text-indigo-500 rounded-lg sm:rounded-xl hover:bg-indigo-500 hover:text-white transition-all">
                                                <i class="bi bi-pencil-square text-[10px] sm:text-xs"></i>
                                            </button>
                                            <button onclick="eliminarFuga(${cat.ids[0]})" 
                                                class="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-rose-50 text-rose-500 rounded-lg sm:rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                                                <i class="bi bi-trash text-[10px] sm:text-xs"></i>
                                            </button>
                                        ` : `
                                            <button onclick="toggleGrupo('${index}-${cat.nombre.replace(/\s+/g, '')}')" 
                                                class="w-16 py-1 text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 rounded-lg hover:bg-indigo-500 hover:text-white transition-all">Ver Más</button>
                                        `}
                                    </div>
                                </td>
                            </tr>
                            ${isGroup ? `
                                <tr id="sub-list-${index}-${cat.nombre.replace(/\s+/g, '')}" class="hidden bg-gray-50/50">
                                    <td colspan="2" class="p-2">
                                        <div class="space-y-1 pl-4 border-l-2 border-indigo-100">
                                            ${cat.rawData.map(mov => `
                                                <div class="flex items-center justify-between py-1 hover:bg-white rounded-lg px-2 transition-colors">
                                                    <span class="text-[12px] text-gray-500">${new Date(mov.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</span>
                                                    <span class="text-[12px] font-bold text-gray-700">$${Math.abs(mov.monto).toLocaleString('es-AR')}</span>
                                                    <div class="flex gap-1">
                                                        <button onclick="abrirModalEditar(${mov.id}, ${mov.id_motivo}, ${Math.abs(mov.monto)}, ${periodo.mes}, ${periodo.anio}, '${mov.tipo}')" class="text-indigo-400 hover:text-indigo-600"><i class="bi bi-pencil-square"></i></button>
                                                        <button onclick="eliminarFuga(${mov.id})" class="text-rose-400 hover:text-rose-600"><i class="bi bi-trash"></i></button>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </td>
                                </tr>
                            ` : ''}
                            `;
    }).join('') : `
                            <tr>
                                <td colspan="2" class="py-20 text-center flex flex-col items-center justify-center">
                                    <p class="text-gray-300 font-bold uppercase tracking-widest opacity-40 text-sm mb-6">No registra datos</p>
                                    <div class="flex flex-col sm:flex-row gap-3">
                                        <button onclick="agregarBasicos(${periodo.mes}, ${periodo.anio})" 
                                            class="px-6 py-3 bg-indigo-50 text-indigo-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                            <i class="bi bi-magic mr-2"></i> Agregar Básicos
                                        </button>
                                        <button onclick="abrirModalNuevo(${periodo.mes}, ${periodo.anio})" 
                                            class="px-6 py-3 bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                                            <i class="bi bi-plus-lg mr-2"></i> Agregar Movimiento
                                        </button>
                                    </div>
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

let currentEditType = 'resta'; // Para saber si guardar como pos o neg

async function abrirModalEditar(id, idMotivo, monto, mes, anio, tipo) {
    currentEditId = id;
    currentMonthTarget = { mes, anio };
    currentEditType = tipo || 'resta';

    document.getElementById('editId').value = id;

    // Seteamos el valor y disparamos el evento de entrada para que el formateador actúe
    const inputMonto = document.getElementById('editMonto');
    inputMonto.value = monto;
    inputMonto.dispatchEvent(new Event('input'));

    // Cargar motivos para ese mes específico en el select del modal
    await cargarMotivosParaEdicion(mes, anio, idMotivo);

    document.getElementById('modalEditar').classList.remove('hidden');
}

// NUEVO: Formateador de Moneda en Tiempo Real
document.addEventListener('DOMContentLoaded', () => {
    const inputs = ['editMonto', 'nuevoMonto'];

    inputs.forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;

        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, "");
            if (value === "") {
                e.target.value = "";
                return;
            }
            let formattedValue = parseInt(value).toLocaleString('es-AR');
            e.target.value = formattedValue;
        });
    });
});

// NUEVO: Toggle para grupos
function toggleGrupo(id) {
    const el = document.getElementById('sub-list-' + id);
    if (el) el.classList.toggle('hidden');
}

async function cargarMotivosParaEdicion(mes, anio, selectedId) {
    const select = document.getElementById('editMotivo');
    select.innerHTML = '<option value="">Cargando...</option>';

    try {
        const res = await api.get(`/motivos?mes=${mes}&anio=${anio}`);
        if (!res) return;
        const motivos = await res.json();

        select.innerHTML = '';
        motivos.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.nombre;
            opt.dataset.tipo = m.tipo; // Guardamos el tipo para el save
            if (m.id === selectedId) opt.selected = true;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Error al cargar motivos para edición", e);
    }
}

function cerrarModalEditar() { document.getElementById('modalEditar').classList.add('hidden'); }

async function guardarEdicion() {
    // Obtenemos el valor limpio (sin puntos ni comas)
    const rawValue = document.getElementById('editMonto').value.replace(/\D/g, "");
    const montoNum = parseInt(rawValue);
    const idMotivo = parseInt(document.getElementById('editMotivo').value);

    if (isNaN(montoNum) || montoNum < 0) return alert("Ingresá un monto válido");
    if (!idMotivo) return alert("Seleccioná una categoría");

    // BUSCAMOS EL TIPO DEL MOTIVO SI CAMBIÓ
    const select = document.getElementById('editMotivo');
    const selectedOption = select.selectedOptions[0];
    const tipoFinal = selectedOption.dataset.tipo || currentEditType;

    // APLICAMOS EL SIGNO CORRECTO
    const montoFinal = tipoFinal === 'suma' ? Math.abs(montoNum) : -Math.abs(montoNum);

    try {
        const response = await api.put(`/movimientos/${currentEditId}`, {
            monto: montoFinal,
            id_motivo: idMotivo
        });
        if (response && response.ok) {
            cerrarModalEditar();
            cargarCuadricula();
        }
    } catch (e) {
        console.error(e);
        alert("Error al conectar con el servidor");
    }
}

async function eliminarFuga(id) {
    if (!confirm("¿Deseas eliminar este registro?")) return;
    try {
        const r = await api.delete(`/movimientos/${id}`);
        if (r && r.ok) cargarCuadricula();
    } catch (e) { console.error(e); }
}

async function agregarBasicos(mes, anio) {
    try {
        const r = await api.post('/movimientos-basicos', {
            usuario: usuarioLogueado,
            mes,
            anio
        });
        if (r && r.ok) cargarCuadricula();
    } catch (e) { console.error(e); }
}

/**
 * Funciones para el Modal de Nuevo Movimiento
 */
let targetMonth = null;
let nuevoTipoSeleccionado = 'resta';

function seleccionarNuevoTipo(tipo) {
    nuevoTipoSeleccionado = tipo;
    const btnSuma = document.getElementById('btnNuevoTipoSuma');
    const btnResta = document.getElementById('btnNuevoTipoResta');

    if (tipo === 'suma') {
        btnSuma.className = "py-2 rounded-xl text-xs font-black uppercase transition-all bg-white shadow-sm text-emerald-600";
        btnResta.className = "py-2 rounded-xl text-xs font-black uppercase transition-all text-gray-400 hover:bg-gray-200";
    } else {
        btnResta.className = "py-2 rounded-xl text-xs font-black uppercase transition-all bg-white shadow-sm text-rose-600";
        btnSuma.className = "py-2 rounded-xl text-xs font-black uppercase transition-all text-gray-400 hover:bg-gray-200";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const selectMotivo = document.getElementById('nuevoMotivo');
    if (selectMotivo) {
        selectMotivo.addEventListener('change', (e) => {
            const wrapper = document.getElementById('wrapperNuevoMotivo');
            if (e.target.value === 'OTRO') {
                wrapper.classList.remove('hidden');
                seleccionarNuevoTipo('resta');
            } else {
                wrapper.classList.add('hidden');
            }
        });
    }
});

async function abrirModalNuevo(mes, anio) {
    targetMonth = { mes, anio };

    const labelPeriodo = document.getElementById('nuevoModalPeriodo');
    const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    if (labelPeriodo) labelPeriodo.textContent = `${mesesNombres[mes - 1]} ${anio}`;

    const select = document.getElementById('nuevoMotivo');
    select.innerHTML = '<option value="">Cargando...</option>';

    document.getElementById('nuevoMonto').value = '';
    document.getElementById('nuevoMotivoManual').value = '';
    document.getElementById('wrapperNuevoMotivo').classList.add('hidden');
    document.getElementById('modalNuevo').classList.remove('hidden');

    try {
        const res = await api.get(`/motivos?mes=${mes}&anio=${anio}`);
        if (!res) return;
        const motivos = await res.json();

        select.innerHTML = '<option value="">Seleccionar categoría</option>';
        motivos.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.nombre;
            opt.dataset.tipo = m.tipo;
            select.appendChild(opt);
        });

        // Agregar opción de "Otro..."
        const optOtro = document.createElement('option');
        optOtro.value = 'OTRO';
        optOtro.textContent = '+ Otro... (Agregar Nuevo)';
        optOtro.className = "text-indigo-600 font-bold";
        select.appendChild(optOtro);

    } catch (e) {
        console.error("Error al cargar motivos", e);
    }
}

function cerrarModalNuevo() {
    document.getElementById('modalNuevo').classList.add('hidden');
}

async function guardarNuevoMovimiento() {
    const select = document.getElementById('nuevoMotivo');
    let idMotivo = select.value;
    const rawValue = document.getElementById('nuevoMonto').value.replace(/\D/g, "");
    const montoNum = parseInt(rawValue);

    if (!idMotivo) return alert("Seleccioná una categoría");
    if (isNaN(montoNum) || montoNum <= 0) return alert("Ingresá un monto válido");

    let tipoFinal = '';

    // Si es un motivo nuevo
    if (idMotivo === 'OTRO') {
        const nombreManual = document.getElementById('nuevoMotivoManual').value.trim();
        if (!nombreManual) return alert("Ingresá el nombre del nuevo motivo");

        try {
            const resMotivo = await api.post('/motivos', {
                nombre: nombreManual,
                tipo: nuevoTipoSeleccionado,
                usuario: usuarioLogueado,
                mes: targetMonth.mes,
                anio: targetMonth.anio
            });

            if (resMotivo && resMotivo.ok) {
                const dataMotivo = await resMotivo.json();
                idMotivo = dataMotivo.id;
                tipoFinal = nuevoTipoSeleccionado;
            } else {
                return alert("Error al crear la nueva categoría");
            }
        } catch (e) {
            console.error(e);
            return alert("Error al crear la categoría");
        }
    } else {
        const selectedOption = select.selectedOptions[0];
        tipoFinal = selectedOption.dataset.tipo;
        idMotivo = parseInt(idMotivo);
    }

    const montoFinal = tipoFinal === 'suma' ? Math.abs(montoNum) : -Math.abs(montoNum);

    try {
        const response = await api.post('/movimientos', {
            monto: montoFinal,
            id_motivo: idMotivo,
            usuario: usuarioLogueado
        });

        if (response && response.ok) {
            cerrarModalNuevo();
            cargarCuadricula();
        } else {
            alert("Error al guardar el movimiento");
        }
    } catch (e) {
        console.error(e);
        alert("Error de conexión");
    }
}

/**
 * Función obsoleta reemplazada por abrirModalNuevo
 */
async function agregarNuevoItem(mes, anio) {
    // Redirigir a la nueva implementación
    abrirModalNuevo(mes, anio);
}
