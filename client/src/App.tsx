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
const AdminDeliveryLocations = lazy(() => import('@/pages/admin/DeliveryLocations'));
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
        <Suspense
            fallback={
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LoadingSpinner size="lg" />
                </div>
            }
        >
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route
                    path="/checkout"
                    element={
                        <PrivateRoute>
                            <CheckoutPage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/order/:orderId"
                    element={
                        <PrivateRoute>
                            <OrderTrackingPage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <PrivateRoute>
                            <ProfilePage />
                        </PrivateRoute>
                    }
                />

                {/* Admin routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route element={<AdminRouteLayout />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/orders" element={<AdminOrders />} />
                    <Route path="/admin/menu" element={<AdminMenuManagement />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />
                    <Route path="/admin/offers" element={<AdminOffers />} />
                    <Route path="/admin/categories" element={<AdminCategories />} />
                    <Route path="/admin/delivery-locations" element={<AdminDeliveryLocations />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </Suspense>
    );
}

