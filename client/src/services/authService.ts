import api from './api';
import type { IUser } from '@/types';

export interface SendOTPResponse {
    message: string;
}

export interface VerifyOTPResponse {
    message: string;
    token: string;
    user: IUser;
}

export const authService = {
    sendOTP: async (phone: string): Promise<SendOTPResponse> => {
        const res = await api.post<SendOTPResponse>('/auth/send-otp', { phone });
        return res.data;
    },

    verifyOTP: async (phone: string, otp: string): Promise<VerifyOTPResponse> => {
        const res = await api.post<VerifyOTPResponse>('/auth/verify-otp', { phone, otp });
        return res.data;
    },

    refreshToken: async (): Promise<{ token: string }> => {
        const res = await api.post<{ token: string }>('/auth/refresh-token');
        return res.data;
    },
};
