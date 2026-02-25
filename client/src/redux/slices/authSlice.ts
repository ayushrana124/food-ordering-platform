import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, IUser } from '@/types';

const getStoredToken = (): string | null => {
    try {
        return sessionStorage.getItem('bp_token');
    } catch {
        return null;
    }
};

const getStoredUser = (): IUser | null => {
    try {
        const raw = sessionStorage.getItem('bp_user');
        return raw ? (JSON.parse(raw) as IUser) : null;
    } catch {
        return null;
    }
};

const initialState: AuthState = {
    user: getStoredUser(),
    token: getStoredToken(),
    isAuthenticated: !!getStoredToken(),
    loading: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials(state, action: PayloadAction<{ user: IUser; token: string }>) {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isAuthenticated = true;
            state.loading = false;
            try {
                sessionStorage.setItem('bp_token', action.payload.token);
                sessionStorage.setItem('bp_user', JSON.stringify(action.payload.user));
            } catch { /* ignore storage errors */ }
        },
        updateUser(state, action: PayloadAction<IUser>) {
            state.user = action.payload;
            try {
                sessionStorage.setItem('bp_user', JSON.stringify(action.payload));
            } catch { /* ignore */ }
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        },
        logout(state) {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.loading = false;
            try {
                sessionStorage.removeItem('bp_token');
                sessionStorage.removeItem('bp_user');
                sessionStorage.removeItem('bp_cart');
            } catch { /* ignore */ }
        },
    },
});

export const { setCredentials, updateUser, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
