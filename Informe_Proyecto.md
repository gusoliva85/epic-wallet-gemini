# Informe de Contexto del Proyecto: Epic Wallet

Este documento sirve como "memoria técnica" para que cualquier asistente de IA (Antigravity, Gemini, ChatGPT) entienda rápidamente el estado del proyecto, su arquitectura, y cómo continuar el desarrollo sin romper funcionalidades existentes.

## 1. Resumen Ejecutivo
**Epic Wallet** es una aplicación web de gestión financiera personal (PWA potential) enfocada en la simplicidad y la estética visual moderna.
- **Objetivo**: Permitir al usuario registrar ingresos y gastos, visualizar su flujo de caja mensual y analizar su historial financiero.
- **Estado Actual**: Funcional en local (Fase 3 completada). Persistencia en base de datos SQLite.
- **Próxima Fase (4)**: Implementación de historial mensual detallado, navegación entre meses y corrección de lógica de acumulados globales vs. mensuales.

## 2. Stack Tecnológico

### Backend (API REST)
- **Lenguaje**: Python 3.10+
- **Framework**: FastAPI (Rápido, tipado estático, documentación automática).
- **Base de Datos**: SQLite (`epic_wallet.db` local).
- **ORM**: SQLAlchemy (Manejo de modelos y consultas).
- **Servidor**: Uvicorn.

### Frontend (SPA Ligera)
- **Estructura**: HTML5 Semántico.
- **Estilos**: Tailwind CSS (vía CDN) + CSS custom para efectos (Glassmorphism sutil, gradientes).
- **Lógica**: Vanilla JavaScript (ES6+). Sin frameworks reactivos (React/Vue/Angular) para máxima simplicidad y velocidad de carga.
- **Gráficos**: Chart.js para visualización de tendencias anuales.
- **Iconos**: Bootstrap Icons (CDN).

## 3. Arquitectura de Archivos

### Backend (`/backend/app`)
- **`main.py`**: Punto de entrada. Define la `app` FastAPI, configuración CORS y endpoints. Contiene la lógica crítica de negocio:
    - `inicializar_motivos_mes()`: "Inteligencia" que clona o fusiona categorías de meses anteriores al iniciar un nuevo mes.
    - Endpoints clave: `POST /movimientos` (registrar), `GET /movimientos/{usuario}` (historial completo), `POST /login`.
- **`models.py`**: Definición de tablas SQLAlchemy:
    - `Usuario`: Credenciales y perfil.
    - `MotivoMovimiento`: Categorías (ej. "Sueldo", "Alquiler") vinculadas a un Mes/Año específico.
    - `Movimiento`: Transacciones reales vinculadas a un Usuario y un Motivo.
- **`database.py`**: Configuración de conexión SQLite (`sqlite:///./epic_wallet.db`).
- **`schemas.py`**: Modelos Pydantic para validación de datos (Requests/Responses).
- **`auth.py`**: Hashing de contraseñas (bcrypt) y verificación.

### Frontend (`/frontend`)
- **`index.html`**: Dashboard principal. Contiene el sidebar, tarjetas de resumen, input de carga rápida, gráfico anual y tabla del mes actual.
- **`js/main.js`**: Core del cliente.
    - Maneja el estado global (`walletData`).
    - `cargarDatosHistoricos()`: Obtiene *todo* el historial y calcula totales (Actualmente un punto de mejora para la Fase 4).
    - `renderizarInformeMensual()`: Filtra y ordena movimientos del mes actual con lógica de prioridad (Ingresos > Vivienda > Servicios > Otros).
    - `lineChart`: Configuración y renderizado de Chart.js.
- **`login.html` / `register.html`**: Pantallas de autenticación.

## 4. Puntos Fuertes y Funcionalidades Clave
1.  **Lógica de "Herencia de Meses"**: Al iniciar un mes nuevo, el sistema no arranca vacío. Copia los motivos de gastos recurrentes (Alquiler, Luz, etc.) del mes anterior automáticamente.
2.  **Interfaz "Clean & Professional"**: Diseño pulido con Tailwind, feedbacks visuales (glow effects al actualizar datos), y modo oscuro/claro implícito (estética dark sidebar).
3.  **Ordenamiento Inteligente**: La tabla de gastos no es alfabética; prioriza lo importante (Sueldo primero, luego gastos fijos, al final gastos hormiga).
4.  **Velocidad**: Al no depender de compilación JS pesada, la app es instantánea en local.

## 5. Áreas de Mejora para Fase 4 (Análisis Crítico)
-   **Confusión Mes Actual vs. Global**: Actualmente, las tarjetas del Home suman *todo* el historial de la base de datos, no solo el mes en curso. Esto confunde al usuario al cambiar de mes.
-   **Navegación Histórica**: No existe interfaz para ver "Enero" si estoy en "Febrero".
-   **Cierre Mensual**: Falta un concepto visual de "Mes Cerrado" vs "Mes en Curso".
-   **Git Workflow**: El proyecto se movió de Google Drive a gestión local con Git. Se debe mantener la disciplina de commits y ramas (o main directo si es solo un dev).

## 6. Comandos de Ejecución
-   **Activar Entorno (Windows)**: `.\backend\.venv\Scripts\Activate`
-   **Ejecutar Backend**: `cd backend` -> `python -m uvicorn app.main:app --reload`
-   **Frontend**: Abrir `frontend/index.html` en navegador (o usar Live Server).

---
*Este informe debe ser leído por cualquier instancia de IA que vaya a modificar el código para asegurar consistencia con la visión del producto.*
