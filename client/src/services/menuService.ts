import api from './api';
import type { IRestaurant, IMenuItem, IOffer, ICategory } from '@/types';

export const menuService = {
    getRestaurantInfo: async (): Promise<IRestaurant> => {
        const res = await api.get<{ restaurant: IRestaurant }>('/menu/restaurant');
        return res.data.restaurant;
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
