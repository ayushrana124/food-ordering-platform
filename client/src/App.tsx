import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/redux/slices/authSlice';
import { useAppDispatch } from '@/redux/hooks';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Lazy load pages for performance
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const MenuPage = lazy(() => import('@/pages/MenuPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const OrderTrackingPage = lazy(() => import('@/pages/OrderTrackingPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));

// Protected route wrapper
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

export default function App() {
    const dispatch = useAppDispatch();

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
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}
