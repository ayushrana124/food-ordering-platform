import axios, { AxiosError } from 'axios';
import type { IMenuItem, IOrder, IUser, IRestaurant, IOffer, ICustomizationGroup, ICategory } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL as string;

// Separate axios instance for admin — uses localStorage instead of sessionStorage
const adminApi = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
});

adminApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('bp_admin_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

adminApi.interceptors.response.use(
    (res) => res,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('bp_admin_token');
            localStorage.removeItem('bp_admin');
            window.location.href = '/admin/login';
        }
        return Promise.reject(error);
    },
);

// ── Types ──────────────────────────────────────────────────────────────────────

export interface IAdmin {
    id: string;
    name: string;
    email: string;
    role: 'OWNER' | 'MANAGER';
    restaurantId: string;
}

export interface IOrderStats {
    todayRevenue: number;
    todayOrders: number;
    pendingOrders: number;
    activeUsers: number;
}

export interface IAdminOrder extends Omit<IOrder, 'userId'> {
    userId: { _id: string; name?: string; phone: string };
    preparationTime?: number;
    estimatedDeliveryTime?: string;
    distance?: number;
}

export interface OrderFilters {
    status?: string;
    paymentMethod?: string;
    page?: number;
    limit?: number;
}

export interface UserFilters {
    search?: string;
    isBlocked?: string;
    page?: number;
    limit?: number;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export async function adminLogin(email: string, password: string) {
    const { data } = await adminApi.post<{ message: string; token: string; admin: IAdmin }>('/admin/login', { email, password });
    return data;
}

export async function adminLogout() {
    try { await adminApi.post('/admin/logout'); } catch { /* no-op */ }
    localStorage.removeItem('bp_admin_token');
    localStorage.removeItem('bp_admin');
}

// ── Orders ─────────────────────────────────────────────────────────────────────

export async function getOrderStats() {
    const { data } = await adminApi.get<IOrderStats>('/admin/orders/stats');
    return data;
}

export async function getOrders(filters: OrderFilters = {}) {
    const { data } = await adminApi.get<{
        orders: IAdminOrder[];
        totalPages: number;
        currentPage: number;
        totalOrders: number;
    }>('/admin/orders', { params: filters });
    return data;
}

export async function acceptOrder(id: string, preparationTime: number) {
    const { data } = await adminApi.put<{ message: string; order: IAdminOrder }>(`/admin/orders/${id}/accept`, { preparationTime });
    return data;
}

export async function updateOrderStatus(id: string, status: string) {
    const { data } = await adminApi.put<{ message: string; order: IAdminOrder }>(`/admin/orders/${id}/status`, { status });
    return data;
}

// ── Menu ───────────────────────────────────────────────────────────────────────

export async function getMenuItems() {
    const { data } = await adminApi.get<{ menuItems: IMenuItem[] }>('/menu');
    return data;
}

export async function addMenuItem(formData: FormData) {
    const { data } = await adminApi.post<{ message: string; menuItem: IMenuItem }>('/admin/menu', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

export async function updateMenuItem(id: string, payload: Partial<IMenuItem>) {
    const { data } = await adminApi.put<{ message: string; menuItem: IMenuItem }>(`/admin/menu/${id}`, payload);
    return data;
}

export async function deleteMenuItem(id: string) {
    const { data } = await adminApi.delete<{ message: string }>(`/admin/menu/${id}`);
    return data;
}

export async function toggleAvailability(id: string) {
    const { data } = await adminApi.put<{ message: string; menuItem: IMenuItem }>(`/admin/menu/${id}/availability`);
    return data;
}

// ── Users ──────────────────────────────────────────────────────────────────────

export async function getUsers(filters: UserFilters = {}) {
    const { data } = await adminApi.get<{
        users: IUser[];
        totalPages: number;
        currentPage: number;
        totalUsers: number;
    }>('/admin/users', { params: filters });
    return data;
}

export async function toggleUserBlock(id: string) {
    const { data } = await adminApi.put<{ message: string; user: IUser }>(`/admin/users/${id}/block`);
    return data;
}

export async function toggleCODBlock(id: string) {
    const { data } = await adminApi.put<{ message: string; user: IUser }>(`/admin/users/${id}/block-cod`);
    return data;
}

// ── Restaurant ─────────────────────────────────────────────────────────────────

export async function getRestaurantInfo() {
    const { data } = await adminApi.get<{ restaurant: IRestaurant }>('/menu/restaurant');
    return data;
}

export async function updateRestaurant(payload: Partial<IRestaurant>) {
    const { data } = await adminApi.put<{ message: string; restaurant: IRestaurant }>('/admin/restaurant', payload);
    return data;
}

export async function toggleRestaurantOpen(currentlyOpen: boolean) {
    return updateRestaurant({ isOpen: !currentlyOpen } as Partial<IRestaurant>);
}

// ── Offers ─────────────────────────────────────────────────────────────────────

export async function getAdminOffers(page = 1, limit = 20) {
    const { data } = await adminApi.get<{
        offers: IOffer[];
        totalPages: number;
        currentPage: number;
        totalOffers: number;
    }>('/admin/offers', { params: { page, limit } });
    return data;
}

export async function createOffer(payload: Partial<IOffer>) {
    const { data } = await adminApi.post<{ message: string; offer: IOffer }>('/admin/offers', payload);
    return data;
}

export async function updateOffer(id: string, payload: Partial<IOffer>) {
    const { data } = await adminApi.put<{ message: string; offer: IOffer }>(`/admin/offers/${id}`, payload);
    return data;
}

export async function deleteOffer(id: string) {
    const { data } = await adminApi.delete<{ message: string }>(`/admin/offers/${id}`);
    return data;
}

export async function toggleOfferActive(id: string) {
    const { data } = await adminApi.put<{ message: string; offer: IOffer }>(`/admin/offers/${id}/toggle`);
    return data;
}

// ── Categories ─────────────────────────────────────────────────────────────────

export async function getAdminCategories() {
    const { data } = await adminApi.get<{ categories: ICategory[] }>('/admin/categories');
    return data;
}

export async function createCategory(payload: Partial<ICategory>) {
    const { data } = await adminApi.post<{ message: string; category: ICategory }>('/admin/categories', payload);
    return data;
}

export async function updateCategory(id: string, payload: Partial<ICategory>) {
    const { data } = await adminApi.put<{ message: string; category: ICategory }>(`/admin/categories/${id}`, payload);
    return data;
}

export async function deleteCategory(id: string) {
    const { data } = await adminApi.delete<{ message: string }>(`/admin/categories/${id}`);
    return data;
}
