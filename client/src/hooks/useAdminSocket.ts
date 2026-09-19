import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { notifyNewOrder } from '@/utils/orderAlert';

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
 *
 * The new-order alarm lives in `@/utils/orderAlert` — it has to keep ringing
 * across re-renders and route changes, so it cannot be owned by a component.
 */
export const useAdminSocket = (callbacks?: AdminSocketCallbacks) => {
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);
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
            // Prefer a WebSocket, but fall back to long-polling rather than failing
            // outright — some restaurant networks and proxies block WebSockets.
            transports: ['websocket', 'polling'],
            // This used to give up after 5 attempts. A brief wifi drop or a server
            // restart would then leave the dashboard connected-looking but deaf:
            // no ring, no new orders, and no indication anything was wrong. The
            // kitchen must never stop receiving orders, so retry indefinitely.
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            randomizationFactor: 0.5,
        });

        const socket = socketRef.current;
        let hasConnectedOnce = false;

        socket.on('connect', () => {
            socket.emit('join-admin');
            setConnected(true);

            // After a reconnect, pull the orders that arrived while we were offline.
            if (hasConnectedOnce) refreshRef.current?.();
            hasConnectedOnce = true;
        });

        socket.on('disconnect', () => setConnected(false));

        // Each handler invokes the callback only. It used to *also* call
        // refreshRef, which the provider wires to the same refresh function the
        // callbacks already trigger — so every event refetched everything twice.
        socket.on('newOrder', (data) => {
            // Rings until someone acknowledges it, rather than for a fixed few seconds.
            void notifyNewOrder();
            cbRef.current?.onNewOrder?.(data);
        });

        socket.on('orderCancelled', (data) => {
            cbRef.current?.onOrderCancelled?.(data);
        });

        socket.on('paymentReceived', (data) => {
            cbRef.current?.onPaymentReceived?.(data);
        });

        socket.on('connect_error', (err) => {
            console.warn('Admin socket connection error:', err.message);
            setConnected(false);

            // The server now rejects bad credentials during the handshake. Retrying
            // those forever would be pointless, so send the admin back to login.
            const authFailure = /auth|token|admin no longer exists/i.test(err.message);
            if (authFailure) {
                socket.disconnect();
                localStorage.removeItem('bp_admin_token');
                localStorage.removeItem('bp_admin');
                window.location.href = '/admin/login';
            }
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    return { socket: socketRef.current, onRefresh, connected };
};
