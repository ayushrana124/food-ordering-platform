import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/redux/slices/authSlice';
import { fetchCart } from '@/redux/slices/cartSlice';
import { useAppDispatch } from '@/redux/hooks';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Lazy load pages for performance
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const MenuPage = lazy(() => import('@/pages/MenuPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const OrderTrackingPage = lazy(() => import('@/pages/OrderTrackingPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));

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

import { Outlet } from 'react-router-dom';
import AdminProtectedRoute from '@/components/admin/AdminProtectedRoute';
import { AdminProvider } from '@/contexts/AdminContext';

// Protected route wrapper
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

// Wraps all protected admin routes with AdminProvider for shared caching
const AdminRouteLayout = () => (
    <AdminProtectedRoute>
        <AdminProvider>
            <Outlet />
        </AdminProvider>
    </AdminProtectedRoute>
);

const PageLoader = (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" />
    </div>
);

const withSuspense = (element: React.ReactElement) => (
    <Suspense fallback={PageLoader}>{element}</Suspense>
);

export default function App() {
    const dispatch = useAppDispatch();
    const { isAuthenticated } = useAuth();

    // Fetch server cart when user is authenticated
    useEffect(() => {
        if (isAuthenticated) dispatch(fetchCart());
    }, [isAuthenticated, dispatch]);

    // Handle 401 from API interceptor globally
    useEffect(() => {
        const handleUnauthorized = () => {
            dispatch(logout());
        };
        window.addEventListener('bp:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('bp:unauthorized', handleUnauthorized);
    }, [dispatch]);

    return (
        <Routes>
            <Route path="/" element={withSuspense(<LandingPage />)} />
            <Route path="/menu" element={withSuspense(<MenuPage />)} />
            <Route path="/cart" element={withSuspense(<CartPage />)} />
            <Route
                path="/checkout"
                element={
                    <PrivateRoute>
                        {withSuspense(<CheckoutPage />)}
                    </PrivateRoute>
                }
            />
            <Route
                path="/order/:orderId"
                element={
                    <PrivateRoute>
                        {withSuspense(<OrderTrackingPage />)}
                    </PrivateRoute>
                }
            />
            <Route
                path="/profile"
                element={
                    <PrivateRoute>
                        {withSuspense(<ProfilePage />)}
                    </PrivateRoute>
                }
            />

            {/* Admin routes */}
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
    );
}
