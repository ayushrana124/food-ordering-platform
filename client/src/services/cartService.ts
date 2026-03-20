import api from './api';

export interface ServerCartItem {
    cartItemId: string;
    menuItemId: string;
    name: string;
    image?: string;
    isVeg: boolean;
    price: number;
    quantity: number;
    selectedCustomizations: { groupName: string; optionName: string; price: number }[];
    itemTotal: number;
    isAvailable: boolean;
}

export interface CartDiscount {
    code: string;
    discountType: 'PERCENTAGE' | 'FLAT';
    discountValue: number;
    appliedDiscount: number;
    title: string;
}

export interface CartResponse {
    items: ServerCartItem[];
    subtotal: number;
    discount: CartDiscount | null;
    total: number;
    itemCount: number;
    appliedCoupon: string | null;
}

export interface AvailableCoupon {
    code: string;
    title: string;
    description: string;
    discountType: 'PERCENTAGE' | 'FLAT';
    discountValue: number;
    minOrderAmount: number;
    maxDiscount: number | null;
    eligible: boolean;
    savings: number;
    reason: string | null;
}

export const cartService = {
    getCart: async (): Promise<CartResponse> => {
        const { data } = await api.get('/cart');
        return data;
    },

    addItem: async (
        menuItemId: string,
        quantity: number,
        selectedCustomizations: { groupName: string; optionName: string }[]
    ): Promise<CartResponse> => {
        const { data } = await api.post('/cart/add', { menuItemId, quantity, selectedCustomizations });
        return data;
    },

    updateItem: async (cartItemId: string, quantity: number): Promise<CartResponse> => {
        const { data } = await api.put('/cart/update', { cartItemId, quantity });
        return data;
    },

    removeItem: async (cartItemId: string): Promise<CartResponse> => {
        const { data } = await api.delete(`/cart/item/${cartItemId}`);
        return data;
    },

    clearCart: async (): Promise<CartResponse> => {
        const { data } = await api.delete('/cart');
        return data;
    },

    applyCoupon: async (code: string): Promise<CartResponse> => {
        const { data } = await api.post('/cart/apply-coupon', { code });
        return data;
    },

    removeCoupon: async (): Promise<CartResponse> => {
        const { data } = await api.delete('/cart/coupon');
        return data;
    },

    getAvailableCoupons: async (): Promise<{ coupons: AvailableCoupon[]; subtotal: number }> => {
        const { data } = await api.get('/cart/available-coupons');
        return data;
    },
};
