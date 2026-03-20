import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cartService, type CartResponse, type ServerCartItem, type CartDiscount } from '@/services/cartService';

export type { ServerCartItem, CartDiscount };

export interface CartState {
    items: ServerCartItem[];
    subtotal: number;
    discount: CartDiscount | null;
    total: number;
    itemCount: number;
    appliedCoupon: string | null;
    loading: boolean;
    error: string | null;
}

const initialState: CartState = {
    items: [],
    subtotal: 0,
    discount: null,
    total: 0,
    itemCount: 0,
    appliedCoupon: null,
    loading: false,
    error: null,
};

function applyCartResponse(state: CartState, data: CartResponse) {
    state.items = data.items;
    state.subtotal = data.subtotal;
    state.discount = data.discount;
    state.total = data.total;
    state.itemCount = data.itemCount;
    state.appliedCoupon = data.appliedCoupon;
    state.error = null;
}

// ── Thunks ───────────────────────────────────────────────────────────────────

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { rejectWithValue }) => {
    try {
        return await cartService.getCart();
    } catch (err: any) {
        return rejectWithValue(err.response?.data?.message ?? 'Failed to fetch cart');
    }
});

export const addToCart = createAsyncThunk(
    'cart/add',
    async (payload: { menuItemId: string; quantity?: number; selectedCustomizations?: { groupName: string; optionName: string }[] }, { rejectWithValue }) => {
        try {
            return await cartService.addItem(
                payload.menuItemId,
                payload.quantity ?? 1,
                payload.selectedCustomizations ?? []
            );
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to add item');
        }
    }
);

export const updateCartItem = createAsyncThunk(
    'cart/update',
    async (payload: { cartItemId: string; quantity: number }, { rejectWithValue }) => {
        try {
            return await cartService.updateItem(payload.cartItemId, payload.quantity);
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to update item');
        }
    }
);

export const removeCartItem = createAsyncThunk(
    'cart/remove',
    async (cartItemId: string, { rejectWithValue }) => {
        try {
            return await cartService.removeItem(cartItemId);
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to remove item');
        }
    }
);

export const clearCartThunk = createAsyncThunk('cart/clear', async (_, { rejectWithValue }) => {
    try {
        return await cartService.clearCart();
    } catch (err: any) {
        return rejectWithValue(err.response?.data?.message ?? 'Failed to clear cart');
    }
});

export const applyCoupon = createAsyncThunk(
    'cart/applyCoupon',
    async (code: string, { rejectWithValue }) => {
        try {
            return await cartService.applyCoupon(code);
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to apply coupon');
        }
    }
);

export const removeCoupon = createAsyncThunk('cart/removeCoupon', async (_, { rejectWithValue }) => {
    try {
        return await cartService.removeCoupon();
    } catch (err: any) {
        return rejectWithValue(err.response?.data?.message ?? 'Failed to remove coupon');
    }
});

// ── Slice ────────────────────────────────────────────────────────────────────

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        resetCart: () => initialState,
    },
    extraReducers: (builder) => {
        for (const thunk of [fetchCart, addToCart, updateCartItem, removeCartItem, applyCoupon]) {
            builder.addCase(thunk.pending, (state) => { state.loading = true; });
            builder.addCase(thunk.fulfilled, (state, action) => { state.loading = false; applyCartResponse(state, action.payload); });
            builder.addCase(thunk.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
        }
        builder.addCase(clearCartThunk.fulfilled, (state, action) => { applyCartResponse(state, action.payload); });
        builder.addCase(removeCoupon.fulfilled, (state, action) => { applyCartResponse(state, action.payload); });
    },
});

export const { resetCart } = cartSlice.actions;
export default cartSlice.reducer;
