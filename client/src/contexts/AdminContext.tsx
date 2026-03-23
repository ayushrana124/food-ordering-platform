import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { getRestaurantInfo, getAdminCategories } from '@/services/adminApi';
import type { IRestaurant, ICategory } from '@/types';

interface AdminContextValue {
    restaurant: IRestaurant | null;
    restaurantLoading: boolean;
    fetchRestaurant: (force?: boolean) => Promise<IRestaurant | null>;
    updateRestaurantCache: (restaurant: IRestaurant) => void;

    categories: ICategory[];
    categoriesLoading: boolean;
    fetchCategories: (force?: boolean) => Promise<ICategory[]>;
    invalidateCategories: () => void;

    pendingOrderCount: number;
    setPendingOrderCount: (count: number) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
    const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
    const [restaurantLoading, setRestaurantLoading] = useState(false);
    const restaurantFetched = useRef(false);

    const [categories, setCategories] = useState<ICategory[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const categoriesFetched = useRef(false);

    const [pendingOrderCount, setPendingOrderCount] = useState(0);

    const restaurantRef = useRef<IRestaurant | null>(null);

    const fetchRestaurant = useCallback(async (force = false) => {
        if (restaurantFetched.current && !force) return restaurantRef.current;
        setRestaurantLoading(true);
        try {
            const res = await getRestaurantInfo();
            setRestaurant(res.restaurant);
            restaurantRef.current = res.restaurant;
            restaurantFetched.current = true;
            return res.restaurant;
        } catch {
            return null;
        } finally {
            setRestaurantLoading(false);
        }
    }, []);

    const updateRestaurantCache = useCallback((r: IRestaurant) => {
        setRestaurant(r);
        restaurantRef.current = r;
        restaurantFetched.current = true;
    }, []);

    const categoriesRef = useRef<ICategory[]>([]);

    const fetchCategories = useCallback(async (force = false) => {
        if (categoriesFetched.current && !force) return categoriesRef.current;
        setCategoriesLoading(true);
        try {
            const res = await getAdminCategories();
            setCategories(res.categories);
            categoriesRef.current = res.categories;
            categoriesFetched.current = true;
            return res.categories;
        } catch {
            return [];
        } finally {
            setCategoriesLoading(false);
        }
    }, []);

    const invalidateCategories = useCallback(() => {
        categoriesFetched.current = false;
    }, []);

    return (
        <AdminContext.Provider value={{
            restaurant, restaurantLoading, fetchRestaurant, updateRestaurantCache,
            categories, categoriesLoading, fetchCategories, invalidateCategories,
            pendingOrderCount, setPendingOrderCount,
        }}>
            {children}
        </AdminContext.Provider>
    );
}

// Fallback context value for use during route transitions (before AdminProvider mounts)
const FALLBACK: AdminContextValue = {
    restaurant: null,
    restaurantLoading: false,
    fetchRestaurant: async () => null,
    updateRestaurantCache: () => {},
    categories: [],
    categoriesLoading: false,
    fetchCategories: async () => [],
    invalidateCategories: () => {},
    pendingOrderCount: 0,
    setPendingOrderCount: () => {},
};

export function useAdminContext() {
    const ctx = useContext(AdminContext);
    return ctx ?? FALLBACK;
}
