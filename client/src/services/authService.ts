import api from './api';
import type { IUser } from '@/types';

export interface VerifyFirebaseTokenResponse {
    message: string;
    token: string;
    user: IUser;
}

export const authService = {
    /**
     * Sends the Firebase ID token to the backend for verification.
     * The backend verifies the token, finds/creates the user, and returns a JWT.
     */
    verifyFirebaseToken: async (idToken: string): Promise<VerifyFirebaseTokenResponse> => {
        const res = await api.post<VerifyFirebaseTokenResponse>('/auth/verify-firebase-token', { idToken });
        return res.data;
    },

    refreshToken: async (): Promise<{ token: string }> => {
        const res = await api.post<{ token: string }>('/auth/refresh-token');
        return res.data;
    },
};
