import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { logout, setCredentials } from '@/redux/slices/authSlice';
import { fetchCart, mergeGuestCart, hardResetCart } from '@/redux/slices/cartSlice';
import { fetchFavorites, resetFavorites } from '@/redux/slices/favoritesSlice';
import { fetchMenuItems, fetchCategories, fetchRestaurant } from '@/redux/slices/menuSlice';
import { useAppDispatch } from '@/redux/hooks';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { silentRefresh } from '@/services/api';
import { LanguageProvider } from '@/i18n';
import toast from 'react-hot-toast';

// Customer pages
const HomePage = lazy(() => import('@/pages/HomePage'));
const MenuPage = lazy(() => import('@/pages/MenuPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const OrderTrackingPage = lazy(() => import('@/pages/OrderTrackingPage'));
const AccountPage = lazy(() => import('@/pages/AccountPage'));

// Admin pages
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminOrders = lazy(() => import('@/pages/admin/Orders'));
const AdminMenuManagement = lazy(() => import('@/pages/admin/MenuManagement'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminSettings = lazy(() => import('@/pages/admin/Settings'));
const AdminOffers = lazy(() => import('@/pages/admin/OfferManagement'));
const AdminCategories = lazy(() => import('@/pages/admin/CategoryManagement'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

import AdminProtectedRoute from '@/components/admin/AdminProtectedRoute';
import { AdminProvider } from '@/contexts/AdminContext';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const AdminRouteLayout = () => (
    <AdminProtectedRoute>
        <AdminProvider>
            <Outlet />
        </AdminProvider>
    </AdminProtectedRoute>
);

const PageLoader = (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" />
    </div>
);

const withSuspense = (element: React.ReactElement) => (
    <Suspense fallback={PageLoader}>{element}</Suspense>
);

export default function App() {
    const dispatch = useAppDispatch();
    const { isAuthenticated, user } = useAuth();


    // The menu is loaded here, not per page, because the guest basket is stored
    // as bare ids and priced by joining against these items. Without it loaded,
    // a guest landing straight on /cart would see an empty basket even though
    // their lines were saved.
    useEffect(() => {
        dispatch(fetchMenuItems({}));
        dispatch(fetchCategories());
        dispatch(fetchRestaurant());
    }, [dispatch]);

    useEffect(() => {
        if (!isAuthenticated) return;

        dispatch(fetchFavorites());

        // Always go through the merge, never a plain fetch.
        //
        // Keying this off the sign-in *edge* was wrong: a guest who signed in and
        // then reloaded — or closed the tab before the merge landed — would come
        // back with lines still in localStorage and no code path that would ever
        // pick them up again. The thunk falls back to a plain cart fetch when
        // there is nothing to merge, so this is safe to run on every load.
        dispatch(mergeGuestCart())
            .unwrap()
            .then((result) => {
                const skipped = (result as { skipped?: string[] }).skipped ?? [];
                if (skipped.length > 0) {
                    toast(`${skipped.join(', ')} — no longer available`, { icon: '⚠️', duration: 5000 });
                }
            })
            .catch(() => dispatch(fetchCart()));
    }, [isAuthenticated, dispatch]);

    // Proactively refresh the JWT when it is close to expiry.
    useEffect(() => {
        if (!isAuthenticated || !user) return;
        silentRefresh().then((newToken) => {
            if (newToken) dispatch(setCredentials({ user, token: newToken }));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    // The API interceptor raises this when a refresh finally fails.
    useEffect(() => {
        const handleUnauthorized = () => {
            dispatch(logout());
            dispatch(hardResetCart());
            dispatch(resetFavorites());
        };
        window.addEventListener('bp:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('bp:unauthorized', handleUnauthorized);
    }, [dispatch]);

    return (
        <LanguageProvider>
            <Routes>
                {/* Customer */}
                <Route path="/" element={withSuspense(<HomePage />)} />
                <Route path="/menu" element={withSuspense(<MenuPage />)} />
                <Route path="/cart" element={withSuspense(<CartPage />)} />
                <Route path="/orders" element={withSuspense(<OrdersPage />)} />
                <Route path="/account" element={withSuspense(<AccountPage />)} />

                <Route
                    path="/checkout"
                    element={<PrivateRoute>{withSuspense(<CheckoutPage />)}</PrivateRoute>}
                />
                <Route
                    path="/order/:orderId"
                    element={<PrivateRoute>{withSuspense(<OrderTrackingPage />)}</PrivateRoute>}
                />

                {/* Legacy paths, kept so existing links and bookmarks still land somewhere sensible */}
                <Route path="/profile" element={<Navigate to="/account" replace />} />

                {/* Admin */}
                <Route path="/admin/login" element={withSuspense(<AdminLogin />)} />
                <Route element={<AdminRouteLayout />}>
                    <Route path="/admin/dashboard" element={withSuspense(<AdminDashboard />)} />
                    <Route path="/admin/orders" element={withSuspense(<AdminOrders />)} />
                    <Route path="/admin/menu" element={withSuspense(<AdminMenuManagement />)} />
                    <Route path="/admin/users" element={withSuspense(<AdminUsers />)} />
                    <Route path="/admin/settings" element={withSuspense(<AdminSettings />)} />
                    <Route path="/admin/offers" element={withSuspense(<AdminOffers />)} />
                    <Route path="/admin/categories" element={withSuspense(<AdminCategories />)} />
                </Route>

                <Route path="*" element={withSuspense(<NotFoundPage />)} />
            </Routes>
        </LanguageProvider>
    );
}
