import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchFavorites, toggleFavorite, optimisticToggle } from '@/redux/slices/favoritesSlice';

/**
 * Favourites are per-account, so the heart is only interactive once signed in.
 * `toggle` returns false when it could not act, letting the caller prompt for
 * sign-in rather than failing silently.
 */
export const useFavorites = () => {
    const dispatch = useAppDispatch();
    const { ids, items, loaded, loading } = useAppSelector((s) => s.favorites);
    const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

    const isFavorite = useCallback((menuItemId: string) => ids.includes(menuItemId), [ids]);

    const toggle = useCallback((menuItemId: string): boolean => {
        if (!isAuthenticated) return false;
        dispatch(optimisticToggle(menuItemId));
        dispatch(toggleFavorite(menuItemId));
        return true;
    }, [dispatch, isAuthenticated]);

    return {
        ids,
        items,
        loaded,
        loading,
        isFavorite,
        toggle,
        refresh: () => dispatch(fetchFavorites()),
        canFavorite: isAuthenticated,
    };
};
