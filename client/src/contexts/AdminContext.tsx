import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { getRestaurantInfo, getAdminCategories, getOrders, getOrderCounts, type IAdminOrder } from '@/services/adminApi';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import type { IRestaurant, ICategory } from '@/types';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import { acknowledgeOrders } from '@/utils/orderAlert';

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

    /** Whether the realtime order feed is currently connected */
    socketConnected: boolean;
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
    // Two parallel requests instead of the four sequential ones this used to make
    // (one list plus a count query per active status).
    const refreshActiveOrders = useCallback(async () => {
        try {
            const [pendingData, counts] = await Promise.all([
                getOrders({ status: 'PENDING', limit: 50 }),
                getOrderCounts(),
            ]);

            setUnacceptedOrders(pendingData.orders);
            setPendingOrderCount(counts.pendingOrderCount);
            setActiveOrderCount(counts.activeOrderCount);
        } catch {
            // Silently fail
        }
    }, []);

    useEffect(() => { refreshActiveOrders(); }, [refreshActiveOrders]);

    // ── Order-change fan-out ─────────────────────────────────────────────────
    // Refreshes the shell's own counts and tells the order screens to refetch.
    // The Orders page already listened for `admin:orders-changed`, but nothing
    // ever dispatched it — so a new order rang the bell and raised a toast while
    // the list on screen stayed stale until the window was refocused.
    //
    // Debounced because orders arrive in bursts at dinner time: ten tickets
    // landing together should cause one refresh, not ten.
    const ordersChangedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const signalOrdersChanged = useCallback(() => {
        if (ordersChangedTimer.current) clearTimeout(ordersChangedTimer.current);
        ordersChangedTimer.current = setTimeout(() => {
            ordersChangedTimer.current = null;
            refreshActiveOrders();
            window.dispatchEvent(new CustomEvent('admin:orders-changed'));
        }, 300);
    }, [refreshActiveOrders]);

    useEffect(() => () => {
        if (ordersChangedTimer.current) clearTimeout(ordersChangedTimer.current);
    }, []);

    // Safety net for missed socket events. Fans out to the order screens too,
    // so a dropped connection cannot leave a stale list on the counter.
    useEffect(() => {
        const interval = setInterval(signalOrdersChanged, 60000);
        return () => clearInterval(interval);
    }, [signalOrdersChanged]);


    // ── Socket: real-time updates ────────────────────────────────────────────
    const { onRefresh, connected: socketConnected } = useAdminSocket({
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
                            onClick={() => { acknowledgeOrders(); toast.dismiss(t.id); }}
                            style={{
                                background: '#0F0F0F', border: 'none', cursor: 'pointer', color: 'white',
                                fontSize: '0.72rem', fontWeight: 700, padding: '0.45rem 0.7rem',
                                borderRadius: 9, flexShrink: 0,
                            }}
                        >
                            Got it
                        </button>
                    </div>
                ),
                {
                    // Stays until acknowledged — it is the control that silences the alarm.
                    duration: Infinity,
                    style: {
                        background: 'white',
                        border: '2px solid #FDE68A',
                        borderRadius: 14,
                        padding: '0.6rem 0.8rem',
                        boxShadow: '0 8px 30px rgba(232,163,23,0.15)',
                    },
                }
            );
            signalOrdersChanged();
        },
        onOrderCancelled: (data) => {
            toast.error(`Order #${data.orderNumber || ''} cancelled`, { duration: 5000 });
            signalOrdersChanged();
        },
        onPaymentReceived: () => {
            signalOrdersChanged();
        },
    });

    // Expose refresh to socket for generic data refresh callbacks from individual pages
    useEffect(() => {
        onRefresh(() => signalOrdersChanged());
    }, [onRefresh, signalOrdersChanged]);

    return (
        <AdminContext.Provider value={{
            restaurant, restaurantLoading, fetchRestaurant, updateRestaurantCache,
            categories, categoriesLoading, fetchCategories, invalidateCategories,
            pendingOrderCount, setPendingOrderCount,
            unacceptedOrders, activeOrderCount, refreshActiveOrders,
            socketConnected,
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
    socketConnected: false,
};

export function useAdminContext() {
    const ctx = useContext(AdminContext);
    return ctx ?? FALLBACK;
}
