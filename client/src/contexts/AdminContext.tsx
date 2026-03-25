import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { getRestaurantInfo, getAdminCategories, getOrders, type IAdminOrder } from '@/services/adminApi';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import type { IRestaurant, ICategory } from '@/types';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';

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

    /** Unaccepted (PENDING status) orders for notification dropdown */
    unacceptedOrders: IAdminOrder[];
    /** Count of all active orders (PENDING + ACCEPTED + PREPARING + OUT_FOR_DELIVERY) */
    activeOrderCount: number;
    /** Refresh unaccepted orders & active counts from server */
    refreshActiveOrders: () => Promise<void>;
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
    const [unacceptedOrders, setUnacceptedOrders] = useState<IAdminOrder[]>([]);
    const [activeOrderCount, setActiveOrderCount] = useState(0);

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

    // ── Fetch unaccepted + active orders ─────────────────────────────────────
    const refreshActiveOrders = useCallback(async () => {
        try {
            // Fetch pending (unaccepted) orders
            const pendingData = await getOrders({ status: 'PENDING', limit: 50 });
            setUnacceptedOrders(pendingData.orders);
            setPendingOrderCount(pendingData.totalOrders);

            // Fetch active orders count (all non-terminal statuses)
            const activeStatuses = ['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY'];
            let totalActive = pendingData.totalOrders; // PENDING counts as active too
            for (const status of activeStatuses) {
                const res = await getOrders({ status, limit: 1 });
                totalActive += res.totalOrders;
            }
            setActiveOrderCount(totalActive);
        } catch {
            // Silently fail
        }
    }, []);

    // Initial fetch + periodic refresh
    useEffect(() => {
        refreshActiveOrders();
        const interval = setInterval(refreshActiveOrders, 30000);
        return () => clearInterval(interval);
    }, [refreshActiveOrders]);

    // ── Socket: real-time updates ────────────────────────────────────────────
    const { onRefresh } = useAdminSocket({
        onNewOrder: (data) => {
            toast(
                (t) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10, background: '#FFFBF0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#E8A317', flexShrink: 0,
                        }}>
                            <Bell size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0, color: '#0F0F0F' }}>
                                New Order #{data.orderNumber || ''}
                            </p>
                            <p style={{ fontSize: '0.72rem', color: '#8E8E8E', margin: '2px 0 0' }}>
                                {data.customerName ? `${data.customerName} • ` : ''}{data.items} item{data.items !== 1 ? 's' : ''} • {'\u20B9'}{data.total}
                                {data.paymentMethod ? ` • ${data.paymentMethod}` : ''}
                            </p>
                        </div>
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#8E8E8E', fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem',
                            }}
                        >
                            OK
                        </button>
                    </div>
                ),
                {
                    duration: 10000,
                    style: {
                        background: 'white',
                        border: '2px solid #FDE68A',
                        borderRadius: 14,
                        padding: '0.6rem 0.8rem',
                        boxShadow: '0 8px 30px rgba(232,163,23,0.15)',
                    },
                }
            );
            // Refresh counts immediately
            refreshActiveOrders();
        },
        onOrderCancelled: (data) => {
            toast.error(`Order #${data.orderNumber || ''} cancelled`, { duration: 5000 });
            // Refresh — cancelled order should disappear from notifications
            refreshActiveOrders();
        },
        onPaymentReceived: () => {
            refreshActiveOrders();
        },
    });

    // Expose refresh to socket for generic data refresh callbacks from individual pages
    useEffect(() => {
        onRefresh(() => refreshActiveOrders());
    }, [onRefresh, refreshActiveOrders]);

    return (
        <AdminContext.Provider value={{
            restaurant, restaurantLoading, fetchRestaurant, updateRestaurantCache,
            categories, categoriesLoading, fetchCategories, invalidateCategories,
            pendingOrderCount, setPendingOrderCount,
            unacceptedOrders, activeOrderCount, refreshActiveOrders,
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
    unacceptedOrders: [],
    activeOrderCount: 0,
    refreshActiveOrders: async () => {},
};

export function useAdminContext() {
    const ctx = useContext(AdminContext);
    return ctx ?? FALLBACK;
}
