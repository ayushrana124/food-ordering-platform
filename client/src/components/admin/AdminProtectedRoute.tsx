import { Navigate } from 'react-router-dom';

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
    const token = localStorage.getItem('bp_admin_token');
    if (!token) return <Navigate to="/admin/login" replace />;
    return <>{children}</>;
}
