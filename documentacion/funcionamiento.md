# Epic Wallet - Funcionamiento Técnico Completo

Este documento describe la arquitectura, flujo de datos y componentes principales de la aplicación Epic Wallet.

## 1. Arquitectura General
La aplicación sigue un modelo Cliente-Servidor desacoplado:
- **Frontend**: Single Page Application (SPA) construida con HTML5, Tailwind CSS y JavaScript Vanilla.
- **Backend**: API RESTful desarrollada con FastAPI (Python) y SQLAlchemy como ORM.
- **Base de Datos**: SQLite (almacenamiento local por defecto).

## 2. Componentes del Frontend

### Dashboard (`index.html` / `js/main.js`)
- **Resumen General**: Calcula ingresos, gastos y balance del mes actual.
- **Gráficos**: Utiliza `Chart.js` para representar visualmente la distribución de gastos y el histórico de balance.
- **Gestión de Movimientos**: Permite registrar nuevos ingresos/gastos. La lógica detecta automáticamente si el motivo es una suma o resta según la configuración del mes.
- **Sistema de Ayuda**: Iconos interactivos en cada sección que despliegan un modal informativo (`js/help.js`).

### Detalle Mensual (`detalle.html` / `js/detalle.js`)
- **Historial 2x3**: Muestra los últimos 6 meses en una cuadrícula bento.
- **CRUD Histórico**: 
    - **Agregar**: Permite insertar movimientos en meses pasados.
    - **Editar**: Modifica tanto el monto como la categoría de registros existentes.
    - **Básicos**: Generador automático de categorías indispensables (Sueldo, Alquiler, etc.) para meses sin datos.

## 3. Lógica del Backend (`backend/app/main.py`)

### Gestión de Usuarios
- Registro con encriptación de contraseñas mediante `bcrypt`.
- Verificación de credenciales en el Login.

### Herencia de Motivos (`inicializar_motivos_mes`)
Es el "corazón" de la aplicación. Al cambiar de mes o registrar un nuevo usuario:
1. Verifica si existen motivos para el mes actual.
2. Si no existen, intenta heredar los del mes anterior.
3. Si es un usuario nuevo, carga el set por defecto (Sueldo, Luz, Gas, etc.).

### Endpoints Principales
- `GET /dashboard/{usuario}`: Resumen consolidado para la Home.
- `GET /movimientos-mensuales`: Filtra datos por mes y año para el historial.
- `POST /movimientos-basicos`: Automatiza la creación de la estructura mínima mensual.

## 4. Flujo de Datos
1. El usuario se loguea; su nombre se guarda en `sessionStorage`.
2. Al cargar la Home, el frontend solicita datos al backend usando el nombre de usuario.
3. Las transacciones se guardan con un `id_motivo` que define si resta o suma.
4. El "Ahorro Histórico" se recalcula en el backend sumando todos los movimientos de la historia del usuario.
