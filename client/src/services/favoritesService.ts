import api from './api';
import type { IMenuItem } from '@/types';

export interface FavoritesResponse {
    /** Ids only — cheap to keep in state for heart toggles across the menu. */
    favorites: string[];
    /** Full dishes, already filtered to what is still on the menu. */
    menuItems: IMenuItem[];
}

export const favoritesService = {
    list: async (): Promise<FavoritesResponse> => {
        const { data } = await api.get('/users/favorites');
        return data;
    },

    /** Toggles one dish and returns the new state, so a double-tap cannot desync. */
    toggle: async (menuItemId: string): Promise<{ isFavorite: boolean; favorites: string[] }> => {
        const { data } = await api.put(`/users/favorites/${menuItemId}`);
        return data;
    },
};
