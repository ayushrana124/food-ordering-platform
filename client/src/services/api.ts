import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL as string;

if (!BASE_URL) {
    console.error('VITE_API_URL is not set. Please create a .env file.');
}

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
});

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('bp_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ── Silent token refresh on 401 ──────────────────────────────────────────────
// If a request gets a 401 (expired token), we attempt ONE silent refresh call.
// On success: save the new token and transparently retry the original request.
// On failure: clear storage and dispatch logout.
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function processQueue(newToken: string) {
    refreshQueue.forEach((resolve) => resolve(newToken));
    refreshQueue = [];
}

async function attemptRefresh(): Promise<string | null> {
    const oldToken = localStorage.getItem('bp_token');
    if (!oldToken) return null;
    try {
        const res = await axios.post<{ token: string }>(
            `${BASE_URL}/auth/refresh-token`,
            {},
            { headers: { Authorization: `Bearer ${oldToken}` } }
        );
        const newToken = res.data.token;
        localStorage.setItem('bp_token', newToken);
        return newToken;
    } catch {
        return null;
    }
}

function clearAuthAndLogout() {
    localStorage.removeItem('bp_token');
    localStorage.removeItem('bp_user');
    localStorage.removeItem('bp_cart');
    window.dispatchEvent(new CustomEvent('bp:unauthorized'));
}

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Only handle 401 and only retry once
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // Don't retry the refresh endpoint itself
        if (originalRequest.url?.includes('/auth/refresh-token')) {
            clearAuthAndLogout();
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (isRefreshing) {
            // Another refresh is already in-flight — queue this request
            return new Promise((resolve, reject) => {
                refreshQueue.push((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    resolve(api(originalRequest));
                });
            });
        }

        isRefreshing = true;
        const newToken = await attemptRefresh();
        isRefreshing = false;

        if (newToken) {
            processQueue(newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
        } else {
            refreshQueue = [];
            clearAuthAndLogout();
            return Promise.reject(error);
        }
    }
);

/**
 * Call on app startup to proactively refresh the token if it's close to expiry.
 * Returns the new token string, or null if no refresh was needed/possible.
 */
export async function silentRefresh(): Promise<string | null> {
    const token = localStorage.getItem('bp_token');
    if (!token) return null;

    try {
        // Decode the JWT payload (no signature verification — just read expiry)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = payload.exp * 1000; // convert to ms
        const oneDayMs = 24 * 60 * 60 * 1000;

        // Only refresh if token expires within the next 24 hours
        if (Date.now() < expiresAt - oneDayMs) return null;

        return await attemptRefresh();
    } catch {
        return null;
    }
}

export default api;

