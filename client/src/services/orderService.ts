import api from './api';
import type { IOrder, IAddress, ISelectedCustomization } from '@/types';

export interface CreateOrderPayload {
    items: {
        menuItemId: string;
        quantity: number;
        customizations: ISelectedCustomization[];
    }[];
    deliveryAddress: IAddress;
    paymentMethod: 'COD' | 'ONLINE';
    specialInstructions?: string;
}

// Maps client-side ISelectedCustomization to the { name, price } format the server expects
function mapPayloadForServer(payload: CreateOrderPayload) {
    return {
        ...payload,
        items: payload.items.map((item) => ({
            ...item,
            customizations: item.customizations.map((c) => ({
                name: c.optionName,
                price: c.price,
            })),
        })),
    };
}

export interface PaginatedOrdersResponse {
    orders: IOrder[];
    total: number;
    page: number;
    pages: number;
}

export const orderService = {
    createOrder: async (payload: CreateOrderPayload): Promise<{ order: IOrder }> => {
        const res = await api.post<{ order: IOrder }>('/orders', mapPayloadForServer(payload));
        return res.data;
    },

    getOrder: async (orderId: string): Promise<IOrder> => {
        const res = await api.get<{ order: IOrder }>(`/orders/${orderId}`);
        return res.data.order;
    },

    cancelOrder: async (orderId: string): Promise<{ message: string }> => {
        const res = await api.put<{ message: string }>(`/orders/${orderId}/cancel`);
        return res.data;
    },

    getUserOrders: async (page = 1, limit = 10): Promise<PaginatedOrdersResponse> => {
        const res = await api.get<PaginatedOrdersResponse>('/users/orders', {
            params: { page, limit },
        });
        return res.data;
    },
};
