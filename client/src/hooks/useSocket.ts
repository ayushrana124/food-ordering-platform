import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch } from '@/redux/hooks';
import { updateCurrentOrderStatus } from '@/redux/slices/orderSlice';
import type { OrderStatus } from '@/types';

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

        socket.on('orderStatusUpdate', (data: { status: OrderStatus }) => {
            dispatch(updateCurrentOrderStatus(data.status));
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
