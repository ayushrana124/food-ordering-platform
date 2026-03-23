import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch } from '@/redux/hooks';
import { updateCurrentOrder } from '@/redux/slices/orderSlice';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string;

export const useSocket = (userId: string | undefined) => {
    const socketRef = useRef<Socket | null>(null);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!userId) return;

        const token = sessionStorage.getItem('bp_token');
        if (!token) return;

        socketRef.current = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnectionAttempts: 5,
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            socket.emit('join', { userId });
        });

        socket.on('orderStatusUpdate', (data: {
            orderId: string;
            orderNumber: string;
            status: string;
            preparationTime?: number;
            estimatedDeliveryTime?: string;
            rejectionReason?: string;
            paymentStatus?: string;
        }) => {
            // Merge all fields from the socket event into the current order
            dispatch(updateCurrentOrder({
                orderStatus: data.status as any,
                ...(data.preparationTime !== undefined && { preparationTime: data.preparationTime }),
                ...(data.estimatedDeliveryTime !== undefined && { estimatedDeliveryTime: data.estimatedDeliveryTime }),
                ...(data.rejectionReason !== undefined && { rejectionReason: data.rejectionReason }),
                ...(data.paymentStatus !== undefined && { paymentStatus: data.paymentStatus as any }),
            }));
        });

        socket.on('connect_error', (err) => {
            console.warn('Socket connection error:', err.message);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [userId, dispatch]);

    return socketRef.current;
};
