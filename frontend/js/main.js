/**************************************************
 * EPIC WALLET - FASE 1 (estable)
 * Lógica en memoria (sin backend)
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

const chartData = {
    meses: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    ingresos: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    gastos:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

// ============================
// REFERENCIAS AL DOM (IDs REALES)
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

// ============================
// AGREGAR MOVIMIENTO
// ============================

agregarBtn.addEventListener('click', () => {

    const selectedOption = motivoSelect.selectedOptions[0];
    const tipo = selectedOption.dataset.tipo;
    const monto = parseMonto(montoInput.value);

    // LÓGICA PRINCIPAL
    if (tipo === 'ingreso') {
        walletData.ingresos += monto;
    } else {
        walletData.gastos += monto;
    }

    actualizarTotales();

    // ACTUALIZAR GRÁFICO
    const mesActual = new Date().getMonth(); // 0 a 11

    if (tipo === 'ingreso') {
        chartData.ingresos[mesActual] += monto;
    } else {
        chartData.gastos[mesActual] += monto;
    }

    // Recalcular línea restante
    lineChart.data.datasets[2].data =
        chartData.ingresos.map((v, i) => v - chartData.gastos[i]);

    lineChart.update();

    // GLOW VISUAL
    if (tipo === 'ingreso') {
        triggerGlow(cardIngresos, 'glow-ingreso');
    } else {
        triggerGlow(cardGastos, 'glow-gasto');
    }

    // GLOW del grafico
    if (tipo === 'ingreso') {
        glowChartPoint(0, mesActual); // ingresos
    } else {
        glowChartPoint(1, mesActual); // gastos
    }

    // Glow del restante
    glowChartPoint(2, mesActual);

    triggerGlow(cardRestante, 'glow-restante');

    resetFormulario();
});

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
    chartData.ingresos = ingresosIniciales;
    chartData.gastos = gastosIniciales;

    lineChart.data.datasets[0].data = chartData.ingresos;
    lineChart.data.datasets[1].data = chartData.gastos;
    lineChart.data.datasets[2].data =
        chartData.ingresos.map((v, i) => v - chartData.gastos[i]);

    lineChart.update();
}, 300);