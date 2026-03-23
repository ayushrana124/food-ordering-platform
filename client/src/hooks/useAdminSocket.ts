import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string;

interface AdminSocketCallbacks {
    onNewOrder?: (data: {
        orderId: string; orderNumber: string; total: number; items: number;
        customerName?: string; customerPhone?: string; paymentMethod?: string;
    }) => void;
    onOrderCancelled?: (data: { orderId: string; orderNumber: string }) => void;
    onPaymentReceived?: (data: { orderId: string; orderNumber: string; amount: number }) => void;
}

/**
 * Socket hook for admin dashboard pages.
 * Joins the `admin-room` and listens for real-time order events.
 */
export const useAdminSocket = (callbacks?: AdminSocketCallbacks) => {
    const socketRef = useRef<Socket | null>(null);
    const cbRef = useRef(callbacks);
    cbRef.current = callbacks;

    const refreshRef = useRef<(() => void) | null>(null);

    /** Call this to set a generic "refresh data" function the hook calls on any event */
    const onRefresh = useCallback((fn: () => void) => {
        refreshRef.current = fn;
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('bp_admin_token');
        if (!token) return;

        socketRef.current = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnectionAttempts: 5,
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            socket.emit('join-admin');
        });

        socket.on('newOrder', (data) => {
            // Play notification bell sound
            try {
                const audio = new Audio('https://cdn.pixabay.com/audio/2022/03/24/audio_805cb7e0d3.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => { /* autoplay policy may block — ignore */ });
            } catch { /* ignore audio errors */ }
            cbRef.current?.onNewOrder?.(data);
            refreshRef.current?.();
        });

        socket.on('orderCancelled', (data) => {
            cbRef.current?.onOrderCancelled?.(data);
            refreshRef.current?.();
        });

        socket.on('paymentReceived', (data) => {
            cbRef.current?.onPaymentReceived?.(data);
            refreshRef.current?.();
        });

        socket.on('connect_error', (err) => {
            console.warn('Admin socket connection error:', err.message);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    return { socket: socketRef.current, onRefresh };
};
