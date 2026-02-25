import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CartState, ICartItem, IMenuItemCustomization } from '@/types';

const loadCartFromSession = (): ICartItem[] => {
    try {
        const raw = sessionStorage.getItem('bp_cart');
        return raw ? (JSON.parse(raw) as ICartItem[]) : [];
    } catch {
        return [];
    }
};

const saveCartToSession = (items: ICartItem[]) => {
    try {
        sessionStorage.setItem('bp_cart', JSON.stringify(items));
    } catch { /* ignore */ }
};

const calcSubtotal = (items: ICartItem[]): number =>
    items.reduce((sum, item) => {
        const customTotal = item.selectedCustomizations.reduce(
            (s, c) => s + c.price, 0
        );
        return sum + (item.price + customTotal) * item.quantity;
    }, 0);

const calcItemCount = (items: ICartItem[]): number =>
    items.reduce((sum, item) => sum + item.quantity, 0);

const storedItems = loadCartFromSession();

const initialState: CartState = {
    items: storedItems,
    subtotal: calcSubtotal(storedItems),
    itemCount: calcItemCount(storedItems),
};

interface AddToCartPayload {
    menuItemId: string;
    name: string;
    price: number;
    image?: string;
    isVeg: boolean;
    selectedCustomizations: IMenuItemCustomization[];
}

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        addToCart(state, action: PayloadAction<AddToCartPayload>) {
            const { menuItemId, selectedCustomizations } = action.payload;
            const customKey = JSON.stringify(selectedCustomizations);

            const existing = state.items.find(
                (i) => i.menuItemId === menuItemId &&
                    JSON.stringify(i.selectedCustomizations) === customKey
            );

            if (existing) {
                existing.quantity += 1;
            } else {
                const cartId = `${menuItemId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                state.items.push({ ...action.payload, cartId, quantity: 1 });
            }

            state.subtotal = calcSubtotal(state.items);
            state.itemCount = calcItemCount(state.items);
            saveCartToSession(state.items);
        },

        removeFromCart(state, action: PayloadAction<string>) {
            state.items = state.items.filter((i) => i.cartId !== action.payload);
            state.subtotal = calcSubtotal(state.items);
            state.itemCount = calcItemCount(state.items);
            saveCartToSession(state.items);
        },

        updateQuantity(state, action: PayloadAction<{ cartId: string; quantity: number }>) {
            const item = state.items.find((i) => i.cartId === action.payload.cartId);
            if (item && action.payload.quantity > 0) {
                item.quantity = action.payload.quantity;
            } else if (item && action.payload.quantity <= 0) {
                state.items = state.items.filter((i) => i.cartId !== action.payload.cartId);
            }
            state.subtotal = calcSubtotal(state.items);
            state.itemCount = calcItemCount(state.items);
            saveCartToSession(state.items);
        },

        clearCart(state) {
            state.items = [];
            state.subtotal = 0;
            state.itemCount = 0;
            try { sessionStorage.removeItem('bp_cart'); } catch { /* ignore */ }
        },
    },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
