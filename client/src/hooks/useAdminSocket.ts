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
    // Real phone-style ring: two frequencies layered, 4 distinct ring bursts with gaps
    // Pattern: RING (0.5s) — pause (0.5s) — RING — pause — RING — pause — RING
    const ringDuration = 0.5;
    const pauseDuration = 0.5;
    const rings = 4;
    const volume = 0.6;

    let t = startTime;
    for (let i = 0; i < rings; i++) {
        // Each "ring" is two sine oscillators at 440Hz + 480Hz (US phone ring frequencies)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.value = 440;
        osc2.frequency.value = 480;

        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(ctx.destination);
        gain2.connect(ctx.destination);

        // Sharp on/off — no smooth ramp so it sounds like distinct rings
        gain1.gain.setValueAtTime(0, t);
        gain1.gain.setValueAtTime(volume, t + 0.005);
        gain1.gain.setValueAtTime(volume, t + ringDuration - 0.005);
        gain1.gain.setValueAtTime(0, t + ringDuration);

        gain2.gain.setValueAtTime(0, t);
        gain2.gain.setValueAtTime(volume * 0.7, t + 0.005);
        gain2.gain.setValueAtTime(volume * 0.7, t + ringDuration - 0.005);
        gain2.gain.setValueAtTime(0, t + ringDuration);

        osc1.start(t);
        osc1.stop(t + ringDuration + 0.01);
        osc2.start(t);
        osc2.stop(t + ringDuration + 0.01);

        t += ringDuration + pauseDuration;
    }

    return rings * (ringDuration + pauseDuration); // ~4 seconds total
}

async function playRingSound() {
    if (isPlaying) return;
    if (soundQueue.length === 0) return;

    isPlaying = true;
    const done = soundQueue.shift()!;

    try {
        const ctx = new AudioContext();
        // Browser may suspend new AudioContext — must resume before scheduling
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
        const duration = generateRingTone(ctx, ctx.currentTime);

        // Keep reference alive and wait the full duration before cleanup
        await new Promise<void>((resolve) => {
            setTimeout(() => {
                ctx.close().catch(() => {});
                resolve();
            }, (duration + 0.5) * 1000);
        });

        done();
        isPlaying = false;
        // Play next in queue if any
        if (soundQueue.length > 0) playRingSound();
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
