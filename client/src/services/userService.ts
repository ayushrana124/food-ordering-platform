import api from './api';
import type { IUser, IAddress, IDeliveryLocation } from '@/types';

export interface UpdateProfilePayload {
    name?: string;
    email?: string;
}

export interface AddAddressPayload {
    label: 'Home' | 'Work' | 'Other';
    addressLine: string;
    landmark?: string;
    coordinates?: { lat: number; lng: number };
    isDefault?: boolean;
}

export const userService = {
    getProfile: async (): Promise<IUser> => {
        const res = await api.get<{ user: IUser }>('/users/profile');
        return res.data.user;
    },

    updateProfile: async (payload: UpdateProfilePayload): Promise<IUser> => {
        const res = await api.put<{ user: IUser }>('/users/profile', payload);
        return res.data.user;
    },

    addAddress: async (payload: AddAddressPayload): Promise<IAddress> => {
        const res = await api.post<{ address: IAddress }>('/users/address', payload);
        return res.data.address;
    },

    updateAddress: async (
        addressId: string,
        payload: Partial<AddAddressPayload>
    ): Promise<IAddress> => {
        const res = await api.put<{ address: IAddress }>(`/users/address/${addressId}`, payload);
        return res.data.address;
    },

    deleteAddress: async (addressId: string): Promise<{ message: string }> => {
        const res = await api.delete<{ message: string }>(`/users/address/${addressId}`);
        return res.data;
    },

    getDeliveryLocations: async () => {
        const res = await api.get<{ locations: IDeliveryLocation[] }>('/menu/delivery-locations');
        return res.data;
    },
};
