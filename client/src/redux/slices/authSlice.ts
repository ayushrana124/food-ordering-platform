import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, IUser } from '@/types';

const getStoredToken = (): string | null => {
    try {
        return localStorage.getItem('bp_token');
    } catch {
        return null;
    }
};

const getStoredUser = (): IUser | null => {
    try {
        const raw = localStorage.getItem('bp_user');
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
                localStorage.setItem('bp_token', action.payload.token);
                localStorage.setItem('bp_user', JSON.stringify(action.payload.user));
            } catch { /* ignore storage errors */ }
        },
        updateUser(state, action: PayloadAction<IUser>) {
            state.user = action.payload;
            try {
                localStorage.setItem('bp_user', JSON.stringify(action.payload));
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
                localStorage.removeItem('bp_token');
                localStorage.removeItem('bp_user');
                localStorage.removeItem('bp_cart');
            } catch { /* ignore */ }
        },
    },
});

export const { setCredentials, updateUser, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
