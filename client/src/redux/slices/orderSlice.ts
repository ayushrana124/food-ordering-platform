import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { OrderState, IOrder } from '@/types';

const initialState: OrderState = {
    currentOrder: null,
    orders: [],
    loading: false,
    error: null,
};

const orderSlice = createSlice({
    name: 'order',
    initialState,
    reducers: {
        setCurrentOrder(state, action: PayloadAction<IOrder>) {
            state.currentOrder = action.payload;
        },
        updateCurrentOrderStatus(state, action: PayloadAction<IOrder['status']>) {
            if (state.currentOrder) {
                state.currentOrder.status = action.payload;
            }
        },
        setOrders(state, action: PayloadAction<IOrder[]>) {
            state.orders = action.payload;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        },
        setError(state, action: PayloadAction<string | null>) {
            state.error = action.payload;
        },
        clearCurrentOrder(state) {
            state.currentOrder = null;
        },
    },
});

export const {
    setCurrentOrder,
    updateCurrentOrderStatus,
    setOrders,
    setLoading,
    setError,
    clearCurrentOrder,
} = orderSlice.actions;
export default orderSlice.reducer;
