import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import menuReducer from './slices/menuSlice';
import orderReducer from './slices/orderSlice';
import favoritesReducer from './slices/favoritesSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        cart: cartReducer,
        menu: menuReducer,
        order: orderReducer,
        favorites: favoritesReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
