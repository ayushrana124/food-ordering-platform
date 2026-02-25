import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setCredentials, logout } from '@/redux/slices/authSlice';
import type { IUser } from '@/types';

export const useAuth = () => {
    const dispatch = useAppDispatch();
    const { user, token, isAuthenticated, loading } = useAppSelector((s) => s.auth);

    const login = (user: IUser, token: string) => {
        dispatch(setCredentials({ user, token }));
    };

    const signOut = () => {
        dispatch(logout());
    };

    return { user, token, isAuthenticated, loading, login, signOut };
};
