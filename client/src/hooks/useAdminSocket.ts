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

// ── Sound queue: plays one ring at a time, queues concurrent orders ──────────
const soundQueue: Array<() => void> = [];
let isPlaying = false;

function generateRingTone(ctx: AudioContext, startTime: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    // 8 "ring" bursts over ~4 seconds: ring-ring-ring-ring ring-ring-ring-ring
    const ringFreq = 880;
    const burstDuration = 0.35;
    const pauseDuration = 0.15;

    const times: Array<[number, number]> = [];
    let t = startTime;
    for (let i = 0; i < 8; i++) {
        times.push([t, t + burstDuration]);
        t += burstDuration + pauseDuration;
    }

    // Schedule frequency changes
    osc.frequency.setValueAtTime(ringFreq, startTime);
    gain.gain.setValueAtTime(0, startTime);

    for (const [on, off] of times) {
        gain.gain.linearRampToValueAtTime(0.35, on + 0.02);
        gain.gain.setValueAtTime(0.35, off - 0.02);
        gain.gain.linearRampToValueAtTime(0, off);
    }

    const totalDuration = times[times.length - 1][1] - startTime;
    osc.start(startTime);
    osc.stop(startTime + totalDuration + 0.05);

    return totalDuration;
}

function playRingSound() {
    if (isPlaying) return;
    if (soundQueue.length === 0) return;

    isPlaying = true;
    const done = soundQueue.shift()!;

    try {
        const ctx = new AudioContext();
        const duration = generateRingTone(ctx, ctx.currentTime);

        setTimeout(() => {
            ctx.close().catch(() => {});
            done();
            isPlaying = false;
            // Play next in queue if any
            if (soundQueue.length > 0) playRingSound();
        }, (duration + 0.1) * 1000);
    } catch {
        done();
        isPlaying = false;
        if (soundQueue.length > 0) playRingSound();
    }
}

function enqueueRingSound() {
    return new Promise<void>((resolve) => {
        soundQueue.push(resolve);
        if (!isPlaying) playRingSound();
    });
}

/**
 * Socket hook for admin dashboard pages.
 * Joins the `admin-room` and listens for real-time order events.
 * Plays a "ring ring ring ring" sound on new orders with queue-based concurrency.
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
            // Queue ring sound — concurrent orders play sequentially, never overlap
            enqueueRingSound();
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
