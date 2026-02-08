# Roadmap Fase 4: Detalle Mensual y Optimización Histórica

Este roadmap detalla los pasos para completar la Fase 4 del proyecto **Epic Wallet**.
La fase se enfoca en resolver la navegación entre meses, corregir la visualización de datos históricos y habilitar la carga retroactiva de movimientos.

## 0. Configuración del Flujo de Trabajo (Git + GitHub)
**Objetivo**: Trabajar eficazmente entre dos computadoras (Escritorio Windows y Notebook Linux) sin depender de Google Drive.

### Flujo Diario Recomendado
1.  **Al iniciar el día (Notebook o PC)**:
    ```bash
    git pull origin main
    ```
    *Esto baja los últimos cambios de la nube.*
2.  **Durante el desarrollo**:
    - Realizar cambios pequeños.
    - Probar que funciona.
    - Guardar cambios (Commit):
      ```bash
      git add .
      git commit -m "Descripción breve de lo que hiciste"
      ```
3.  **Al finalizar la sesión**:
    ```bash
    git push origin main
    ```
    *Esto sube todo a GitHub para que esté disponible en la otra computadora.*

> [!IMPORTANT]
> El entorno virtual `.venv` y la base de datos `epic_wallet.db` están ignorados en `.gitignore`. Esto es correcto.
> - **Base de datos**: Al trabajar en local, cada PC tendrá sus propios datos de prueba. Si necesitas sincronizar datos reales, deberás copiar el archivo `.db` manualmente o, idealmente para la Fase 5, usar una base de datos en la nube (Supabase).
> - **Entorno Virtual**: Se crea una vez en cada máquina.

---

## 1. Corrección de Totales en Dashboard (Home)
**Problema**: El Home muestra la suma total de *todos* los tiempos en las tarjetas "Ingresos" y "Gastos", mezclando Enero y Febrero.
**Solución**: Separar la lógica visual. Las tarjetas deben mostrar solo el mes en curso. "Total Ahorrado" debe ser el acumulado global.

- [ ] **1.1 Backend**: Verificar que `GET /dashboard/{usuario}` devuelva correctamente los totales del mes corriente y el ahorro global acumulado. (El endpoint ya existe, falta integrarlo o ajustar el frontend).
- [ ] **1.2 Frontend**: Modificar `main.js` -> `cargarDatosHistoricos`.
    - Calcular `ingresosMesActual` y `gastosMesActual` filtrando por fecha.
    - Calcular `ahorroGlobal` sumando todo el historial.
    - Actualizar el DOM para que las tarjetas de arriba reflejen solo el mes actual.
    - Actualizar la tarjeta "Total Ahorros" con el valor global.

## 2. Nueva Pantalla: Detalle Mensual
**Objetivo**: Poder ver qué pasó en meses anteriores.

- [ ] **2.1 Frontend Estructura**: Crear archivo `frontend/detalle.html`.
    - Copiar estructura base de `index.html` (Sidebar, estilos).
    - Eliminar Gráfico Anual de esta vista.
    - Agregar **Selector de Fecha**: Un dropdown o control `< Mes Anterior | Mes Actual | Mes Siguiente >`.
- [ ] **2.2 Backend API**: Crear endpoint `GET /movimientos-mensuales` (o reutilizar con filtros).
    - Params: `?mes=X&anio=Y`.
    - Response: Solo movimientos de ese período.
- [ ] **2.3 Lógica Frontend**:
    - Al cambiar el selector de fecha, llamar a la API con el mes seleccionado.
    - Renderizar la tabla de movimientos con la misma lógica de ordenamiento (Sueldo -> Fijos -> Servicios) que ya funciona en el Home.
    - Mostrar totales de *ese* mes en tarjetas resumen específicas de esta vista.

## 3. Carga de Movimientos Retroactivos
**Objetivo**: Olvidé cargar un gasto de Enero y ya estamos en Febrero.

- [ ] **3.1 Interfaz**: En `detalle.html`, agregar botón "Agregar Movimiento".
    - El modal debe saber en qué mes estamos posicionados (no usar `Date.now()`, usar el valor del selector).
- [ ] **3.2 Backend**: Modificar `POST /movimientos` (o el `schemas.py`) para aceptar opcionalmente `fecha_creacion`.
    - Si no se envía fecha, usar `now()`.
    - Si se envía fecha, usar esa para guardarlo en el historial correcto.
- [ ] **3.3 Validación**: Verificar que si agrego un gasto en Enero, el "Total Ahorrado" del Home (que es global) se actualice correctamente al volver.

## 4. Cierre Mensual Automático (Lógica de Negocio)
**Objetivo**: Confirmar que la lógica de "Herencia de Motivos" sigue intacta.

- [ ] **4.1 Test**: Simular cambio de mes en el sistema o alterar fecha de PC.
- [ ] **4.2 Verificación**: Asegurar que al entrar a un mes nuevo (Marzo), aparezcan los motivos recurrentes creados en Febrero pero con montos en $0.

---
## Comandos para Verificación Continua

Para levantar el **Backend**:
```powershell
cd backend
.\.venv\Scripts\Activate
python -m uvicorn app.main:app --reload
```

Para ver el **Frontend**:
Abrir `frontend/index.html` en tu navegador.
(O si usas VS Code, click derecho en index.html -> "Open with Live Server").
