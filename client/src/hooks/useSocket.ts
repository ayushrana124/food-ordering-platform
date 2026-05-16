import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch } from '@/redux/hooks';
import { updateCurrentOrder } from '@/redux/slices/orderSlice';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string;

const STATUS_LABELS: Record<string, string> = {
    ACCEPTED: 'Order Accepted!',
    PREPARING: 'Your food is being prepared',
    OUT_FOR_DELIVERY: 'Order is on the way!',
    DELIVERED: 'Order Delivered!',
    CANCELLED: 'Order Cancelled',
};

// ── Singleton socket: one connection per user, shared across all components ──
let sharedSocket: Socket | null = null;
let sharedSocketUserId: string | null = null;
let refCount = 0;

function getOrCreateSocket(userId: string, token: string): Socket {
    // Reuse existing socket if same user
    if (sharedSocket && sharedSocketUserId === userId && sharedSocket.connected) {
        return sharedSocket;
    }
    // If different user or disconnected, clean up old one
    if (sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
    }
    sharedSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
    });
    sharedSocketUserId = userId;

    sharedSocket.on('connect', () => {
        // Join/re-join user room on every connect (including reconnects)
        sharedSocket!.emit('join', { userId });
    });

    sharedSocket.on('connect_error', (err) => {
        console.warn('Socket connection error:', err.message);
    });

    return sharedSocket;
}

function releaseSocket() {
    refCount--;
    if (refCount <= 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        sharedSocketUserId = null;
        refCount = 0;
    }
}

/**
 * Singleton socket hook for customer pages.
 * Multiple components can call this — only ONE socket connection is created.
 * The socket stays alive as long as at least one component is mounted.
 */
export const useSocket = (userId: string | undefined) => {
    const dispatch = useAppDispatch();
    const handlerAttached = useRef(false);

    useEffect(() => {
        if (!userId) return;
        const token = sessionStorage.getItem('bp_token');
        if (!token) return;

        const socket = getOrCreateSocket(userId, token);
        refCount++;

        // Attach orderStatusUpdate listener only once per hook instance
        if (!handlerAttached.current) {
            handlerAttached.current = true;

            socket.on('orderStatusUpdate', (data: {
                orderId: string;
                orderNumber: string;
                status: string;
                preparationTime?: number;
                estimatedDeliveryTime?: string;
                rejectionReason?: string;
                paymentStatus?: string;
            }) => {
                dispatch(updateCurrentOrder({
                    orderStatus: data.status as any,
                    ...(data.preparationTime !== undefined && { preparationTime: data.preparationTime }),
                    ...(data.estimatedDeliveryTime !== undefined && { estimatedDeliveryTime: data.estimatedDeliveryTime }),
                    ...(data.rejectionReason !== undefined && { rejectionReason: data.rejectionReason }),
                    ...(data.paymentStatus !== undefined && { paymentStatus: data.paymentStatus as any }),
                }));

                const label = STATUS_LABELS[data.status];
                if (label) {
                    if (data.status === 'CANCELLED') {
                        toast.error(label, { duration: 5000 });
                    } else if (data.status === 'DELIVERED') {
                        toast.success(label, { icon: '🎉', duration: 5000 });
                    } else {
                        toast.success(label, { duration: 4000 });
                    }
                }

                // Dispatch a custom event so other components (like TrackOrderFAB) can react
                window.dispatchEvent(new CustomEvent('orderStatusChanged', { detail: data }));
            });
        }

        return () => {
            if (handlerAttached.current && socket) {
                socket.off('orderStatusUpdate');
                handlerAttached.current = false;
            }
            releaseSocket();
        };
    }, [userId, dispatch]);

    return sharedSocket;
};
