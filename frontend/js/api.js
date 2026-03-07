/**
 * API Utility for Epic Wallet
 * Handles authenticated requests and common fetch logic.
 */

// Detección automática de entorno (Local vs Producción)
const isLocal = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '' ||
    window.location.protocol === 'file:';

const API_BASE_URL = isLocal ? 'http://localhost:8000' : 'https://epic-wallet-api.onrender.com';
console.log(`[API] Entorno: ${isLocal ? 'LOCAL' : 'PRODUCCIÓN'} (${API_BASE_URL})`);

const api = {
    /**
     * Get the stored access token (checks both storages)
     */
    getToken() {
        const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        console.log(`[API] Token obtenido: ${token ? 'PRESENTE' : 'AUSENTE'}`);
        return token;
    },

    /**
     * Store the access token
     */
    setToken(token) {
        localStorage.setItem('access_token', token);
        sessionStorage.setItem('access_token', token);
        console.log("[API] Token guardado en ambos almacenamientos.");
    },

    /**
     * Clear token and user data (Logout)
     */
    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('usuarioNombre');
        localStorage.removeItem('nombreReal');
        sessionStorage.clear(); // Por si acaso
        window.location.href = 'login.html';
    },

    /**
     * Helper for fetch with Auth header
     */
    async request(endpoint, options = {}) {
        const token = this.getToken();

        // Headers por defecto
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Añadir Authorization si hay token
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
        console.log(`[API] Solicitando: ${url}`, { method: options.method, headers });

        try {
            const response = await fetch(url, { ...options, headers });
            console.log(`[API] Respuesta recibida: ${response.status}`);

            // Si el token expiró o es inválido (401)
            if (response.status === 401 && !endpoint.includes('/login')) {
                console.warn("Sesión expirada o inválida.");
                this.logout();
                return null;
            }

            return response;
        } catch (error) {
            console.error("[API] Error de Red/CORS:", error);
            throw error;
        }
    },

    // Métodos rápidos
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

// Exportar globalmente si no se usan módulos
window.api = api;
