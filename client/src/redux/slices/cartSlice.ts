import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { cartService, type CartResponse, type ServerCartItem, type CartDiscount } from '@/services/cartService';

export type { ServerCartItem, CartDiscount };

/**
 * A line in the guest (not-yet-signed-in) cart.
 *
 * Guests can browse and build a basket without an account; only the checkout
 * step requires signing in. Until then the basket lives here and in
 * localStorage, and is folded into the server cart by `mergeGuestCart` on login.
 *
 * Only the identifiers are stored, never names or prices — those are always
 * resolved from the live menu so a stale basket cannot show yesterday's price.
 */
export interface GuestLine {
    lineId: string;
    menuItemId: string;
    quantity: number;
    selectedCustomizations: { groupName: string; optionName: string }[];
}

const GUEST_KEY = 'bp_guest_cart';
const MAX_LINE_QTY = 20;

const readGuestLines = (): GuestLine[] => {
    try {
        const raw = localStorage.getItem(GUEST_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeGuestLines = (lines: GuestLine[]): void => {
    try {
        localStorage.setItem(GUEST_KEY, JSON.stringify(lines));
    } catch {
        // Private mode or blocked storage — the cart still works for this session.
    }
};

/** Stable key for "same dish, same options", matching the server's rule. */
const lineKey = (menuItemId: string, c: { groupName: string; optionName: string }[]): string =>
    menuItemId + '|' + JSON.stringify(
        [...c].sort((a, b) => a.groupName.localeCompare(b.groupName) || a.optionName.localeCompare(b.optionName))
    );

export interface CartState {
    items: ServerCartItem[];
    subtotal: number;
    discount: CartDiscount | null;
    total: number;
    itemCount: number;
    appliedCoupon: string | null;
    loading: boolean;
    error: string | null;
    /** Guest basket. Empty once signed in. */
    guestLines: GuestLine[];
    merging: boolean;
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
    guestLines: readGuestLines(),
    merging: false,
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

/**
 * Hand the guest basket to the server right after sign-in.
 * Returns the merged cart plus the names of anything that could not be carried
 * over, so the UI can tell the customer instead of silently dropping it.
 */
export const mergeGuestCart = createAsyncThunk(
    'cart/mergeGuest',
    async (_, { getState, rejectWithValue }) => {
        const { cart } = getState() as { cart: CartState };
        const lines = cart.guestLines;

        if (lines.length === 0) {
            // Nothing to merge, but the account may already have a cart waiting.
            return { ...(await cartService.getCart()), skipped: [] as string[] };
        }

        try {
            return await cartService.merge(lines.map(({ menuItemId, quantity, selectedCustomizations }) => ({
                menuItemId, quantity, selectedCustomizations,
            })));
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to merge cart');
        }
    }
);

/** Refill the cart from a past order. */
export const reorder = createAsyncThunk(
    'cart/reorder',
    async (orderId: string, { rejectWithValue }) => {
        try {
            return await cartService.reorder(orderId);
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Failed to reorder');
        }
    }
);

// ── Slice ────────────────────────────────────────────────────────────────────

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        resetCart: (state) => ({ ...initialState, guestLines: state.guestLines }),

        /** Wipes everything including the guest basket — used on sign-out. */
        hardResetCart: () => {
            writeGuestLines([]);
            return { ...initialState, guestLines: [] };
        },

        guestAdd: (state, action: PayloadAction<{ menuItemId: string; quantity?: number; selectedCustomizations?: { groupName: string; optionName: string }[] }>) => {
            const { menuItemId, quantity = 1, selectedCustomizations = [] } = action.payload;
            const key = lineKey(menuItemId, selectedCustomizations);
            const existing = state.guestLines.find((l) => lineKey(l.menuItemId, l.selectedCustomizations) === key);

            if (existing) {
                existing.quantity = Math.min(existing.quantity + quantity, MAX_LINE_QTY);
            } else {
                state.guestLines.push({
                    lineId: `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
                    menuItemId,
                    quantity: Math.min(quantity, MAX_LINE_QTY),
                    selectedCustomizations,
                });
            }
            writeGuestLines(state.guestLines);
        },

        guestSetQuantity: (state, action: PayloadAction<{ lineId: string; quantity: number }>) => {
            const { lineId, quantity } = action.payload;
            if (quantity <= 0) {
                state.guestLines = state.guestLines.filter((l) => l.lineId !== lineId);
            } else {
                const line = state.guestLines.find((l) => l.lineId === lineId);
                if (line) line.quantity = Math.min(quantity, MAX_LINE_QTY);
            }
            writeGuestLines(state.guestLines);
        },

        guestRemove: (state, action: PayloadAction<string>) => {
            state.guestLines = state.guestLines.filter((l) => l.lineId !== action.payload);
            writeGuestLines(state.guestLines);
        },

        guestClear: (state) => {
            state.guestLines = [];
            writeGuestLines([]);
        },
    },
    extraReducers: (builder) => {
        for (const thunk of [fetchCart, addToCart, updateCartItem, removeCartItem, applyCoupon]) {
            builder.addCase(thunk.pending, (state) => { state.loading = true; });
            builder.addCase(thunk.fulfilled, (state, action) => { state.loading = false; applyCartResponse(state, action.payload); });
            builder.addCase(thunk.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
        }

        builder.addCase(clearCartThunk.fulfilled, (state, action) => { applyCartResponse(state, action.payload); });
        builder.addCase(removeCoupon.fulfilled, (state, action) => { applyCartResponse(state, action.payload); });

        builder.addCase(mergeGuestCart.pending, (state) => { state.merging = true; });
        builder.addCase(mergeGuestCart.fulfilled, (state, action) => {
            state.merging = false;
            applyCartResponse(state, action.payload);
            // The basket now lives on the server; drop the local copy so it can
            // never be merged a second time.
            state.guestLines = [];
            writeGuestLines([]);
        });
        builder.addCase(mergeGuestCart.rejected, (state, action) => {
            state.merging = false;
            state.error = action.payload as string;
            // Deliberately keep guestLines — a failed merge must not lose the basket.
        });

        builder.addCase(reorder.pending, (state) => { state.loading = true; });
        builder.addCase(reorder.fulfilled, (state, action) => { state.loading = false; applyCartResponse(state, action.payload); });
        builder.addCase(reorder.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
    },
});

export const { resetCart, hardResetCart, guestAdd, guestSetQuantity, guestRemove, guestClear } = cartSlice.actions;
export default cartSlice.reducer;
