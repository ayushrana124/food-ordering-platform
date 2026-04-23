import api from './api';
import type { IRestaurant, IMenuItem, IOffer, ICategory } from '@/types';

export const menuService = {
    getRestaurantInfo: async (): Promise<IRestaurant> => {
        const res = await api.get<{ restaurant: any }>('/menu/restaurant');
        const raw = res.data.restaurant;

        // The server stores coordinates nested under `address.coordinates`
        // but the client IRestaurant type expects them as top-level `coordinates`.
        // Normalize the shape here so the rest of the app works correctly.
        const normalized: IRestaurant = {
            ...raw,
            address: typeof raw.address === 'string'
                ? raw.address
                : raw.address?.addressLine ?? '',
            coordinates: raw.coordinates ?? raw.address?.coordinates ?? { lat: 0, lng: 0 },
        };

        return normalized;
    },

    getMenuItems: async (
        params?: Record<string, string | number | boolean | undefined>
    ): Promise<IMenuItem[]> => {
        const res = await api.get<{ menuItems: IMenuItem[] }>('/menu/items', { params });
        return res.data.menuItems;
    },

    getMenuItem: async (id: string): Promise<IMenuItem> => {
        const res = await api.get<{ menuItem: IMenuItem }>(`/menu/items/${id}`);
        return res.data.menuItem;
    },

    getOffers: async (): Promise<IOffer[]> => {
        const res = await api.get<{ offers: IOffer[] }>('/menu/offers');
        return res.data.offers;
    },

    getCategories: async (): Promise<ICategory[]> => {
        const res = await api.get<{ categories: ICategory[] }>('/menu/categories');
        return res.data.categories;
    },
};
