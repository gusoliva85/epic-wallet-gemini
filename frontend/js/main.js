/**************************************************
 * EPIC WALLET - FASE 2
 * Implementando la base de datos y Seguridad
 **************************************************/

// ============================
// ESTADO GLOBAL EN MEMORIA
// ============================

const walletData = {
    ingresos: 0,
    gastos: 0
};

let previousValues = {
    ingresos: 0,
    gastos: 0,
    restante: 0
};

let usuarioLogueado = "";

// Función para generar los últimos 13 meses dinámicamente
function generarLabels13Meses() {
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const labels = [];
    const hoy = new Date();

    for (let i = 12; i >= 0; i--){
        const fechaCorte = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const nombreMes = nombresMeses[fechaCorte.getMonth()];
        const anioShort = fechaCorte.getFullYear();
        labels.push(`${nombreMes} ${anioShort}`);
    }
    return labels;
}

const chartData = {
    meses: generarLabels13Meses(),
    ingresos: new Array(13).fill(0),
    gastos: new Array(13).fill(0)
}


// ============================
// REFERENCIAS AL DOM
// ============================

const motivoSelect = document.getElementById('motivo');
const montoInput   = document.getElementById('monto');
const agregarBtn   = document.getElementById('agregarBtn');

const totalIngresosEl    = document.getElementById('totalIngresos');
const totalGastosEl      = document.getElementById('totalGastos');
const dineroRestanteEl   = document.getElementById('dineroRestante');
const totalAdicionalesEl = document.getElementById('totalAdicionales');

const cardIngresos = totalIngresosEl.closest('.rounded-2xl');
const cardGastos = totalGastosEl.closest('.rounded-2xl');
const cardRestante = dineroRestanteEl.closest('.rounded-2xl');


// ==========================================
// CONTROL DE ACCESO Y PERSONALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener datos de la sesión
    usuarioLogueado = sessionStorage.getItem('usuarioNombre'); 
    const nombreReal = sessionStorage.getItem('nombreReal');

    // 2. Validar sesión
    if (!usuarioLogueado) {
        window.location.href = 'login.html';
        return; 
    }

    // 3. Saludo con NOMBRE REAL
    const spanNombre = document.getElementById('nombreUsuario');
    if (spanNombre) {
        // Si por algún motivo nombreReal es null, usamos el nick de usuario
        const nombreAmostrar = nombreReal || usuarioLogueado;
        spanNombre.textContent = nombreAmostrar.charAt(0).toUpperCase() + nombreAmostrar.slice(1);
    }

    // 4. MES Y AÑO DINÁMICO
    const fecha = new Date();
    const mesesAnio = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // Verificamos que los elementos existan antes de asignarles valor
    const mesEl = document.getElementById('mesActual');
    const anioEl = document.getElementById('anioActual');
    if (mesEl) mesEl.textContent = mesesAnio[fecha.getMonth()];
    if (anioEl) anioEl.textContent = fecha.getFullYear();
    
    // 5. Cargar los motivos desde la Base de Datos
    cargarMotivosDelMes(usuarioLogueado);

    // 6. Cargar historial de movimientos
    cargarDatosHistoricos(usuarioLogueado);
});


// ============================
// UTILIDADES
// ============================

// $ 1.234.567 (sin decimales)
function formatCurrency(value) {
    return '$ ' + Math.round(value).toLocaleString('es-AR');
}

// "1.234.567" → 1234567
function parseMonto(valor) {
    return Number(valor.replace(/\./g, '')) || 0;
}

// Formatea input con separador de miles
function formatInputMiles(value) {
    const numericValue = value.replace(/\D/g, '');
    return numericValue
        ? numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        : '';
}

// Animación de conteo suave en números
function animateValue(element, start, end, duration = 400) {
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const value = Math.round(start + (end - start) * progress);
        element.textContent = formatCurrency(value);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function triggerGlow(element, className) {
    element.classList.remove(className);
    void element.offsetWidth; // fuerza reflow
    element.classList.add(className);
}

// Animacion del grafico
function glowChartPoint(datasetIndex, pointIndex) {
    const dataset = lineChart.data.datasets[datasetIndex];

    // Guardamos estado original
    const originalRadius = dataset.pointRadius;

    // Aplicamos glow
    dataset.pointRadius = (ctx) =>
        ctx.dataIndex === pointIndex ? 10 : originalRadius;

    lineChart.update();

    // Restauramos después
    setTimeout(() => {
        dataset.pointRadius = originalRadius;
        lineChart.update();
    }, 600);
}


// ============================
// CARGAR DATOS HISTORICOS
// ============================
async function cargarDatosHistoricos(usuario) {
    try {
        const response = await fetch(`http://127.0.0.1:8000/movimientos/${usuario}`);
        if (!response.ok) throw new Error("Error al obtener historial");
        const movimientos = await response.json();

        const hoy = new Date();

        // --- IMPORTANTE: RESETEAR DATOS ANTES DE RECALCULAR ---
        walletData.ingresos = 0;
        walletData.gastos = 0;
        chartData.ingresos.fill(0);
        chartData.gastos.fill(0);
        // -----------------------------------------------------

        movimientos.forEach(mov => {
            const fechaMov = new Date(mov.fecha);
            const monto = Math.abs(mov.monto);

            if (mov.tipo === 'suma'){
                walletData.ingresos += monto;
            } else {
                walletData.gastos += monto;
            }

            const diffMeses = (hoy.getFullYear() - fechaMov.getFullYear()) * 12 + (hoy.getMonth() - fechaMov.getMonth());
            
            if (diffMeses >= 0 && diffMeses <= 12) {
                const indice = 12 - diffMeses;
                if (mov.tipo === 'suma') {
                    chartData.ingresos[indice] += monto;
                } else {
                    chartData.gastos[indice] += monto;
                }
            }
        });

        actualizarTotales();
        
        lineChart.data.datasets[0].data = [...chartData.ingresos];
        lineChart.data.datasets[1].data = [...chartData.gastos];
        lineChart.data.datasets[2].data = chartData.ingresos.map((v, i) => v - chartData.gastos[i]);
        lineChart.update('none'); // 'none' evita animaciones molestas en cada refresh
        
        renderizarTablaMovimientos(movimientos);
        renderizarInformeMensual(movimientos);

    } catch (error) {
        console.error("Error cargando historial:", error);
    }
}


// ============================
// VALIDACIONES
// ============================

function validarFormulario() {
    const motivoValido = motivoSelect.value !== '';
    const monto = parseMonto(montoInput.value);

    if (motivoValido && monto > 0) {
        agregarBtn.disabled = false;
        agregarBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        agregarBtn.disabled = true;
        agregarBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

// ============================
// EVENTOS
// ============================

// Cambio de motivo
motivoSelect.addEventListener('change', validarFormulario);

// Input con separador de miles automático
montoInput.addEventListener('input', (e) => {
    const cursor = e.target.selectionStart;
    const originalLength = e.target.value.length;

    e.target.value = formatInputMiles(e.target.value);

    const newLength = e.target.value.length;
    e.target.selectionEnd = cursor + (newLength - originalLength);

    validarFormulario();
});

// Cargar motivos
async function cargarMotivosDelMes(usuario) {
    const selectMotivo = document.getElementById('motivo');
    // Si el usuario ya desplegó el select o tiene algo elegido, no refrescamos para no interrumpir
    if (document.activeElement === selectMotivo && selectMotivo.value !== "") return;

    try {
        const response = await fetch(`http://127.0.0.1:8000/motivos?usuario=${usuario}`);
        if (!response.ok) throw new Error("No se pudieron cargar");

        const motivos = await response.json();
        
        // Solo actualizamos si la cantidad de motivos cambió (evita refrescos innecesarios)
        if (selectMotivo.options.length - 1 === motivos.length) return;

        selectMotivo.innerHTML = '<option value="">Seleccionar motivo</option>';
        motivos.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.nombre;
            option.dataset.tipo = m.tipo; 
            selectMotivo.appendChild(option);
        });
    } catch (error) {
        console.error("Error:", error);
    }
}


// ============================
// AGREGAR MOVIMIENTO
// ============================

agregarBtn.addEventListener('click', async () => {
    // 1. Captura de datos inicial
    const usuario = sessionStorage.getItem('usuarioNombre');
    const selectedOption = motivoSelect.selectedOptions[0];
    const tipo = selectedOption.dataset.tipo; 
    const montoLimpio = parseMonto(montoInput.value);
    const idMotivo = selectedOption.value;

    if (!montoLimpio || !idMotivo) return; // Validación rápida

    // 2. Preparar datos para DB
    const montoParaDB = tipo === 'suma' ? Math.abs(montoLimpio) : -Math.abs(montoLimpio);

    // Feedback visual: Deshabilitar botón mientras procesa
    agregarBtn.disabled = true;
    agregarBtn.textContent = "Guardando...";

    try {
        // 3. ENVÍO AL BACKEND
        const response = await fetch('http://127.0.0.1:8000/movimientos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                monto: montoParaDB,
                id_motivo: parseInt(idMotivo),
                usuario: usuario
            })
        });

        if (!response.ok) throw new Error("Error al persistir en base de datos");

        // 4. ACTUALIZACIÓN DE ESTADO (Solo si fetch dio OK)
        if (tipo === 'suma') {
            walletData.ingresos += montoLimpio;
        } else {
            walletData.gastos += montoLimpio;
        }

        // 5. ACTUALIZACIÓN DE INTERFAZ Y GRÁFICO
        const mesActual = new Date().getMonth();
        
        if (tipo === 'suma') {
            chartData.ingresos[mesActual] += montoLimpio;
            glowChartPoint(0, mesActual); // Punto verde
            triggerGlow(cardIngresos, 'glow-ingreso');
        } else {
            chartData.gastos[mesActual] += montoLimpio;
            glowChartPoint(1, mesActual); // Punto rojo
            triggerGlow(cardGastos, 'glow-gasto');
        }

        // Actualizar línea de "Restante"
        lineChart.data.datasets[2].data = chartData.ingresos.map((v, i) => v - chartData.gastos[i]);
        lineChart.update();
        
        // Efectos finales
        actualizarTotales();
        glowChartPoint(2, mesActual); // Punto naranja (restante)
        triggerGlow(cardRestante, 'glow-restante');
        
        resetFormulario();
        console.log("¡Éxito! Datos sincronizados con el servidor.");

    } catch (error) {
        console.error("Error crítico:", error);
        alert("No se pudo guardar. El servidor no responde.");
    } finally {
        // Reestablecer botón
        agregarBtn.disabled = false;
        agregarBtn.textContent = "Agregar";
    }
});


// ============================
// ELIMINAR MOVIMIENTO
// ============================
async function eliminarMovimiento(id) {
    if (!confirm("¿Estás seguro de que querés borrar este movimiento?")) return;

    try {
        const response = await fetch(`http://127.0.0.1:8000/movimientos/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // REFRESCAR TODO: Esto recalcula totales, gráfico y tabla automáticamente
            cargarDatosHistoricos(usuarioLogueado);
        } else {
            alert("Error al eliminar");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}


// ============================
// ACTUALIZACIÓN UI
// ============================

function actualizarTotales() {
    const restante = walletData.ingresos - walletData.gastos;

    animateValue(totalIngresosEl, previousValues.ingresos, walletData.ingresos);
    animateValue(totalGastosEl, previousValues.gastos, walletData.gastos);
    animateValue(dineroRestanteEl, previousValues.restante, restante);
    animateValue(totalAdicionalesEl, previousValues.restante, restante);

    dineroRestanteEl.classList.toggle('text-danger', restante < 0);

    previousValues = {
        ingresos: walletData.ingresos,
        gastos: walletData.gastos,
        restante
    };
}


// ============================
// TABLA DE HISTORIAL DE MOVIMIENTOS
// ============================
function renderizarTablaMovimientos(movimientos) {
    const tbody = document.getElementById('cuerpo-tabla-movimientos');
    tbody.innerHTML = ''; 

    // Ordenar: el más reciente arriba
    const ordenados = [...movimientos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    ordenados.forEach(mov => {
        const fila = document.createElement('tr');
        fila.className = "group hover:bg-gray-50 transition-colors duration-150";

        const fechaObj = new Date(mov.fecha);
        const fechaFormateada = fechaObj.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short'
        });

        const esIngreso = mov.tipo === 'suma';
        // Colores profesionales: Emerald para ingresos, Rose para egresos
        const colorClase = esIngreso ? 'text-emerald-600' : 'text-rose-600';
        const signo = esIngreso ? '+' : '-';

        fila.innerHTML = `
            <td class="py-3 text-sm text-gray-500">${fechaFormateada}</td>
            <td class="py-3 text-sm font-medium text-gray-700">${mov.motivo}</td>
            <td class="py-3 text-sm text-right font-bold ${colorClase}">
                ${signo} $${Math.abs(mov.monto).toLocaleString('es-AR')}
            </td>
            <td class="py-3 text-right">
                <button onclick="eliminarMovimiento(${mov.id})" class="text-gray-300 hover:text-rose-500 transition-colors">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

// ============================
// INFORME MENSUAL
// ============================
function renderizarInformeMensual(movimientos) {
    const tbody = document.getElementById('cuerpo-informe-mensual');
    if (!tbody) return;

    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();

    // Filtrar solo movimientos del mes actual
    const movimientosMes = movimientos.filter(m => {
        const d = new Date(m.fecha);
        return d.getMonth() === mesActual && d.getFullYear() === anioActual;
    });

    // Agrupar por Motivo
    const agrupados = movimientosMes.reduce((acc, mov) => {
        if (!acc[mov.motivo]) {
            acc[mov.motivo] = { nombre: mov.motivo, ingresos: 0, gastos: 0 };
        }
        if (mov.tipo === 'suma') acc[mov.motivo].ingresos += Math.abs(mov.monto);
        else acc[mov.motivo].gastos += Math.abs(mov.monto);
        return acc;
    }, {});

    // Convertir objeto a array para ordenar
    let items = Object.values(agrupados);

    // Lógica de Ordenamiento Inteligente
    const obtenerPrioridad = (nombre) => {
        const n = nombre.toLowerCase();
        // INGRESOS
        if (n.includes('sueldo') || n.includes('honorarios') || n.includes('venta')) return 1;
        
        // GASTOS FIJOS VIVIENDA
        if (n.includes('alquiler') || n.includes('expensas') || n.includes('cochera')) return 2;
        
        // SERVICIOS
        const servicios = ['luz', 'gas', 'agua', 'abl', 'internet', 'telefono', 'wifi'];
        if (servicios.some(s => n.includes(s))) return 3;
        
        // DEUDAS Y EDUCACION
        const fijos = ['tarjeta', 'prestamo', 'universidad', 'facultad', 'escuela', 'curso', 'cuota'];
        if (fijos.some(f => n.includes(f))) return 4;

        // OTROS (Al final)
        if (n === 'otros') return 99;
        
        return 10; // Resto de gastos
    };

    items.sort((a, b) => {
        // Primero por prioridad definida
        const prioA = obtenerPrioridad(a.nombre);
        const prioB = obtenerPrioridad(b.nombre);
        if (prioA !== prioB) return prioA - prioB;
        // Si tienen misma prioridad, por monto mayor primero
        return (b.ingresos + b.gastos) - (a.ingresos + a.gastos);
    });

    // Renderizar la tabla
    tbody.innerHTML = '';
    items.forEach(item => {
        const fila = document.createElement('tr');
        fila.className = "hover:bg-gray-50 transition-colors";
        fila.innerHTML = `
            <td class="py-3 text-sm font-medium text-gray-700">${item.nombre}</td>
            <td class="py-3 text-sm text-right text-emerald-600 font-bold">
                ${item.ingresos > 0 ? '+ ' + formatCurrency(item.ingresos) : '-'}
            </td>
            <td class="py-3 text-sm text-right text-rose-600 font-bold">
                ${item.gastos > 0 ? '- ' + formatCurrency(item.gastos) : '-'}
            </td>
        `;
        tbody.appendChild(fila);
    });
}


// ============================
// RESET FORMULARIO
// ============================

function resetFormulario() {
    motivoSelect.value = '';
    montoInput.value = '';
    validarFormulario();
}


// ============================
// GRAFICO ANUAL
// ============================

const ctx = document.getElementById('lineChart').getContext('2d');
// Clonamos los datos reales
const ingresosIniciales = [...chartData.ingresos];
const gastosIniciales   = [...chartData.gastos];
// Forzamos arranque en 0
chartData.ingresos = chartData.ingresos.map(() => 0);
chartData.gastos   = chartData.gastos.map(() => 0);

const lineChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: chartData.meses,
        datasets: [
            {
                label: 'Ingresos',
                data: chartData.ingresos,
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34,197,94,0.1)',
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true
            },
            {
                label: 'Gastos',
                data: chartData.gastos,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239,68,68,0.1)',
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true
            },
            {
                label: 'Restante',
                data: chartData.ingresos.map((v, i) => v - chartData.gastos[i]),
                borderColor: '#f97316',
                borderDash: [5,5],
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5
            }
        ]
    },
    options: {
        responsive: true,
        animation: {
            duration: 1200,
            easing: 'easeOutQuart'
        },
        plugins: {
            legend: {
                labels: {
                    color: '#374151',
                    font: {
                        size: 12,
                        weight: '500'
                    }
                }
            },
            tooltip: {
                backgroundColor: '#0f172a', // azul oscuro
                titleColor: '#e5e7eb',
                bodyColor: '#f9fafb',
                borderColor: '#334155',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 10,
                displayColors: false,
                animation: {
                    duration: 200
                },
                titleFont: {
                    size: 13,
                    weight: '600'
                },
                bodyFont: {
                    size: 13
                },
                callbacks: {
                    label: function(context) {
                        const value = context.parsed.y || 0;
                        return `$ ${value.toLocaleString('es-AR')}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: value => '$ ' + value.toLocaleString('es-AR')
                }
            },
            x: {
                ticks: {
                    color: '#6b7280'
                }
            }
        }
    }
});

// ============================
// RESTAURAR DATOS (ANIMACIÓN AL CARGAR)
// ============================

setTimeout(() => {
    lineChart.data.labels = chartData.meses;
    lineChart.data.datasets[0].data = chartData.ingresos;
    lineChart.data.datasets[1].data = chartData.gastos;
    lineChart.data.datasets[2].data = chartData.ingresos.map((v, i) => v - chartData.gastos[i]);

    lineChart.update();
}, 300);


// ==========================================
// LÓGICA DE SALIDA 
// ==========================================
// Detecta el click en el botón de cerrar sesión
const btnLogOut = document.getElementById('btnLogOut');
if (btnLogOut) {
    btnLogOut.addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'login.html';
    });
}


// ==========================================
// AGREGAR NUEVO MOTIVO DE MOVIMIENTO
// ==========================================
let tipoSeleccionado = 'resta';

function mostrarModalNuevoMotivo() {
    document.getElementById('modalMotivo').classList.remove('hidden');
    document.getElementById('nuevoMotivoNombre').focus();

    seleccionarTipoMotivo('resta');
}

function cerrarModalMotivo() {
    document.getElementById('modalMotivo').classList.add('hidden');
    document.getElementById('nuevoMotivoNombre').value = '';
}

function seleccionarTipoMotivo(tipo) {
    tipoSeleccionado = tipo;
    const btnSuma = document.getElementById('btnSuma');
    const btnResta = document.getElementById('btnResta');

    if (tipo === 'suma') {
        btnSuma.className = "py-2.5 rounded-lg text-sm font-semibold transition-all bg-white shadow-sm text-emerald-600";
        btnResta.className = "py-2.5 rounded-lg text-sm font-semibold transition-all text-gray-500 hover:bg-gray-200";
    } else {
        btnResta.className = "py-2.5 rounded-lg text-sm font-semibold transition-all bg-white shadow-sm text-rose-600";
        btnSuma.className = "py-2.5 rounded-lg text-sm font-semibold transition-all text-gray-500 hover:bg-gray-200";
    }
}

async function guardarNuevoMotivo() {
    const nombreInput = document.getElementById('nuevoMotivoNombre');
    const nombre = nombreInput.value.trim();

    if (!nombre) {
        alert("Por favor, ingresá un nombre para el motivo.");
        return;
    }

    // Importante: usuarioLogueado debe ser el string del nombre de usuario
    const datos = {
        nombre: nombre,
        tipo: tipoSeleccionado, 
        usuario: usuarioLogueado 
    };

    console.log("Enviando datos:", datos); // Esto te permite ver en consola qué se envía

    try {
        const response = await fetch('http://127.0.0.1:8000/motivos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const data = await response.json();

        if (response.ok) {
            console.log("Respuesta servidor:", data);
            cerrarModalMotivo();
            // Corregido el nombre de la función a cargarMotivosDelMes
            await cargarMotivosDelMes(usuarioLogueado); 
            
            // Seleccionamos el nuevo motivo automáticamente (opcional)
            alert("Motivo guardado con éxito");
        } else {
            console.error("Error del servidor:", data);
            alert("Error al guardar: " + (data.detail || "Error desconocido"));
        }
    } catch (error) {
        console.error("Error de red:", error);
        alert("No se pudo conectar con el servidor.");
    }
}


// ==========================================
// CONTROL DEL MENÚ RESPONSIVE
// ==========================================
const btnAbrirMenu = document.getElementById('btnAbrirMenu');
const sidebar = document.getElementById('sidebar');

if (btnAbrirMenu && sidebar) {
    btnAbrirMenu.addEventListener('click', () => {
        // Alternar entre mostrar y esconder en móvil
        sidebar.classList.toggle('-translate-x-full');
    });

    // Cerrar el menú si se hace click fuera de él (opcional pero recomendado)
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !btnAbrirMenu.contains(e.target) && !sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.add('-translate-x-full');
        }
    });
}

// Función para abrir/cerrar menú
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    sidebar.classList.toggle('-translate-x-full'); // Quita o pone el desplazamiento
    overlay.classList.toggle('hidden');            // Muestra o esconde el fondo oscuro
}