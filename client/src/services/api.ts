import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL as string;

if (!BASE_URL) {
    console.error('VITE_API_URL is not set. Please create a .env file.');
}

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
});

// Attach JWT token from sessionStorage on every request
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('bp_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 globally — clear session and redirect to home
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            sessionStorage.removeItem('bp_token');
            sessionStorage.removeItem('bp_user');
            sessionStorage.removeItem('bp_cart');
            // Dispatch logout if needed — handled in components via auth state
            window.dispatchEvent(new CustomEvent('bp:unauthorized'));
        }
        return Promise.reject(error);
    }
);

export default api;
