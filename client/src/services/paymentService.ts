import api from './api';

export interface RazorpayOrderResponse {
    razorpayOrderId: string;
    amount: number;
    currency: string;
    key: string; // Key is sent from backend — never stored in .env on client
}

export interface VerifyPaymentPayload {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    orderId: string;
}

export const paymentService = {
    createPaymentOrder: async (orderId: string): Promise<RazorpayOrderResponse> => {
        const res = await api.post<RazorpayOrderResponse>('/payment/create-order', { orderId });
        return res.data;
    },

    verifyPayment: async (payload: VerifyPaymentPayload): Promise<{ message: string }> => {
        const res = await api.post<{ message: string }>('/payment/verify', payload);
        return res.data;
    },
};
