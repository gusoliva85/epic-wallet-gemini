# Epic Wallet - Propiedad Intelectual, Seguridad y Despliegue

Este informe detalla los pasos necesarios para proteger tu obra y llevarla a un entorno de producción de forma segura y profesional.

---

## 1. Propiedad Intelectual y Marca
Para que la aplicación sea legalmente tuya y se note tu autoría:

### Branding Personalizado
- **Copyright**: Añadir un footer en todas las páginas: `© 2026 Epic Wallet - Desarrollado por [Tu Nombre]`.
- **Licencia**: Crear un archivo `LICENSE` en la raíz. Recomiendo la **Licencia MIT** (permite que otros vean el código pero te reconoce como autor original).
- **Favicon**: Cambiar el icono por defecto del navegador por un logo propio.

### Metadatos
- Actualizar los tags `<meta name="author" content="Tu Nombre">` en el `head` de cada HTML.

---

## 2. Auditoría de Seguridad (Lo que falta)
Antes de subir a producción, **debes** corregir estos puntos críticos para evitar que otros accedan a tus datos:

1.  **JWT (JSON Web Tokens)**: 
    - *Situación actual*: El frontend envía el nombre de usuario por la URL. Un atacante podría borrar datos de cualquiera solo cambiando el nombre en la URL.
    - *Solución*: Implementar tokens de sesión firmados. El servidor debe validar quién eres en cada petición.
2.  **Variables de Entorno**: 
    - *Situación actual*: La URL de la API (`127.0.0.1`) está grabada en el JS.
    - *Solución*: Usar un archivo `.env` para que la app sepa dónde está el servidor sin exponer secretos en el código.
3.  **CORS Policy**: 
    - Restringir el acceso para que solo tu dominio (`epic-wallet.netlify.app`) pueda hacer peticiones a tu API.
4.  **Base de Datos**: 
    - SQLite es excelente para desarrollo, pero para producción es mejor usar **PostgreSQL** (disponible gratis en Supabase o Neon.tech).

---

## 3. Plan de Despliegue (Gratuito)
Haremos el despliegue dividiendo la app en dos partes:

### Paso 1: Base de Datos y Backend (Render.com)
1.  **Servicio**: Render.com permite alojar APIs de Python gratis.
2.  **Procedimiento**:
    - Sincronizar tu repositorio de GitHub con Render.
    - Configurar el comando de inicio: `gunicorn -k uvicorn.workers.UvicornWorker app.main:app`.
    - Añadir una base de datos PostgreSQL gratis en la misma plataforma.

### Paso 2: Frontend (Netlify o Vercel)
1.  **Servicio**: Netlify es el estándar para sitios estáticos (HTML/JS).
2.  **Procedimiento**:
    - Arrastrar la carpeta `frontend` a Netlify.
    - Configurar la `API_URL` para que apunte a tu nuevo servidor en Render.

---

## 4. Hoja de Ruta (Siguientes Pasos)
De ahora en adelante, nuestro orden de trabajo será:
1.  **Refactor de Seguridad**: Implementar JWT en el backend y login real.
2.  **Configuración de Producción**: Reemplazar IPs locales por variables configurables.
3.  **Migración de DB**: Preparar el código para conectar a PostgreSQL.
4.  **Lanzamiento**: Subir a GitHub -> Render -> Netlify.

**¡Estamos a un paso de tener tu aplicación en la nube!**
