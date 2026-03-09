import { Navigate } from 'react-router-dom';

function isTokenExpired(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.exp) return false; // no expiry claim — treat as valid
        return payload.exp * 1000 < Date.now();
    } catch {
        return true; // malformed token — treat as expired
    }
}

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
    const token = localStorage.getItem('bp_admin_token');

    if (!token || isTokenExpired(token)) {
        // Clear stale credentials
        localStorage.removeItem('bp_admin_token');
        localStorage.removeItem('bp_admin');
        return <Navigate to="/admin/login" replace />;
    }

    return <>{children}</>;
}
