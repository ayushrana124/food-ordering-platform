import { useSyncExternalStore } from 'react';

/**
 * New-order alarm for the admin dashboard.
 *
 * Replaces the previous 4-second burst of two plain sine oscillators, which had
 * three problems in a real kitchen:
 *   - it stopped on its own, so an order could ring while nobody was at the
 *     counter and then go silent with no trace;
 *   - the envelope stepped the gain instantly from 0 to full, which clicks
 *     audibly on every ring;
 *   - when the browser blocked autoplay the whole thing failed silently, so
 *     staff had no idea the alert was dead.
 *
 * This version rings a proper bell chime on a loop until someone acknowledges
 * it, and reports back when the browser has muted it so the UI can say so.
 *
 * Lives outside React because the alarm has to survive re-renders, route
 * changes and unmounting the component that started it.
 */

/** Master volume, 0-1. */
const VOLUME = 0.55;

/** Seconds between repeats of the two-note chime. */
const CYCLE_SECONDS = 2.6;

/**
 * Hard stop after this long, so a forgotten tab cannot ring all night.
 * Raise it if the counter is noisy and staff need longer to reach the screen.
 */
const MAX_RING_MS = 5 * 60 * 1000;

/**
 * A struck bell is not harmonic — its partials sit at non-integer ratios and the
 * higher ones die away fastest. That is what makes it read as a chime rather
 * than a beep, and it carries through kitchen noise far better than a sine pair.
 */
const PARTIALS: Array<{ ratio: number; gain: number; decay: number }> = [
    { ratio: 1.00, gain: 1.00, decay: 1.70 },
    { ratio: 2.01, gain: 0.50, decay: 1.15 },
    { ratio: 2.78, gain: 0.30, decay: 0.85 },
    { ratio: 4.09, gain: 0.17, decay: 0.60 },
    { ratio: 5.51, gain: 0.09, decay: 0.40 },
];

/** Descending fourth — the familiar doorbell interval. */
const CHIME: Array<{ freq: number; at: number; velocity: number }> = [
    { freq: 1046.5, at: 0.00, velocity: 0.95 }, // C6
    { freq: 784.0, at: 0.30, velocity: 0.90 },  // G5
];

export interface OrderAlertState {
    /** The alarm is currently sounding. */
    ringing: boolean;
    /** The browser is refusing to play audio until someone interacts with the page. */
    blocked: boolean;
    /** Unacknowledged orders since the alarm started. */
    pending: number;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let loopTimer: ReturnType<typeof setTimeout> | null = null;
let stopAtMs = 0;
let liveOscillators: OscillatorNode[] = [];
let unlockArmed = false;

let state: OrderAlertState = { ringing: false, blocked: false, pending: 0 };
const listeners = new Set<() => void>();

const setState = (next: Partial<OrderAlertState>): void => {
    const merged = { ...state, ...next };
    if (merged.ringing === state.ringing && merged.blocked === state.blocked && merged.pending === state.pending) {
        return;
    }
    state = merged;
    listeners.forEach((l) => l());
};

// ── Audio graph ──────────────────────────────────────────────────────────────

const createContext = (): boolean => {
    if (ctx) return true;
    const Ctor: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;

    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = VOLUME;
    master.connect(ctx.destination);
    return true;
};

/** Resolves true when audio is actually allowed to play. */
const ensureRunning = async (): Promise<boolean> => {
    if (!createContext() || !ctx) return false;
    if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch { /* still blocked */ }
    }
    return ctx.state === 'running';
};

/**
 * Browsers only allow audio after a user gesture. Listen for the next one and
 * pick the alarm back up if an order is still waiting.
 */
const armUnlockOnNextGesture = (): void => {
    if (unlockArmed || typeof document === 'undefined') return;
    unlockArmed = true;

    const events: Array<keyof DocumentEventMap> = ['pointerdown', 'keydown', 'touchstart'];
    const onGesture = async () => {
        const running = await ensureRunning();
        if (!running) return;

        events.forEach((e) => document.removeEventListener(e, onGesture));
        unlockArmed = false;
        setState({ blocked: false });
        if (state.pending > 0) startLoop();
    };

    events.forEach((e) => document.addEventListener(e, onGesture, { passive: true }));
};

/** Schedules one bell strike and its partials. */
const strike = (when: number, freq: number, velocity: number): void => {
    if (!ctx || !master) return;

    for (const p of PARTIALS) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq * p.ratio;

        // Exponential ramps rather than instant steps — this is what removes the
        // click the old implementation produced on every ring.
        const peak = Math.max(0.0002, velocity * p.gain);
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.exponentialRampToValueAtTime(peak, when + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + p.decay);

        osc.connect(gain).connect(master);
        osc.start(when);
        osc.stop(when + p.decay + 0.05);

        liveOscillators.push(osc);
        osc.onended = () => { liveOscillators = liveOscillators.filter((o) => o !== osc); };
    }
};

const scheduleCycle = (): void => {
    if (!ctx) return;
    const base = ctx.currentTime + 0.04;
    for (const note of CHIME) strike(base + note.at, note.freq, note.velocity);
};

const silenceNow = (): void => {
    if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }

    if (ctx && master) {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    }

    for (const osc of liveOscillators) {
        try { osc.stop(); } catch { /* already stopped */ }
    }
    liveOscillators = [];

    // Restore the level for the next alarm once the fade has finished.
    setTimeout(() => {
        if (ctx && master) master.gain.setValueAtTime(VOLUME, ctx.currentTime);
    }, 120);
};

const startLoop = (): void => {
    if (loopTimer) return;

    const tick = () => {
        if (Date.now() >= stopAtMs) {
            // Safety cap reached. Stop the noise but keep `pending` so the UI can
            // still show that orders are waiting.
            silenceNow();
            setState({ ringing: false });
            return;
        }
        scheduleCycle();
        loopTimer = setTimeout(tick, CYCLE_SECONDS * 1000);
    };

    if (ctx && master) master.gain.setValueAtTime(VOLUME, ctx.currentTime);
    tick();
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * A new order arrived. Starts (or extends) the alarm.
 * Safe to call repeatedly — a burst of orders keeps one alarm running.
 */
export const notifyNewOrder = async (): Promise<void> => {
    stopAtMs = Date.now() + MAX_RING_MS;
    setState({ pending: state.pending + 1 });

    const running = await ensureRunning();
    if (!running) {
        setState({ ringing: false, blocked: true });
        armUnlockOnNextGesture();
        return;
    }

    setState({ ringing: true, blocked: false });
    startLoop();
};

/** Someone has seen the order. Silences the alarm and clears the backlog. */
export const acknowledgeOrders = (): void => {
    silenceNow();
    setState({ ringing: false, pending: 0 });
};

/**
 * Play one chime on demand — for a "test sound" control, and a convenient way
 * for staff to satisfy the browser's gesture requirement before service starts.
 */
export const previewChime = async (): Promise<boolean> => {
    const running = await ensureRunning();
    if (!running) {
        setState({ blocked: true });
        armUnlockOnNextGesture();
        return false;
    }
    setState({ blocked: false });
    if (master && ctx) master.gain.setValueAtTime(VOLUME, ctx.currentTime);
    scheduleCycle();
    return true;
};

const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
};

const getSnapshot = (): OrderAlertState => state;

/** Subscribe a component to the alarm's state. */
export const useOrderAlert = (): OrderAlertState =>
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
