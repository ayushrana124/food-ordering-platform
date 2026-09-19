import { Minus, Plus } from 'lucide-react';
import { useT } from '@/i18n';

/**
 * The veg / non-veg mark every Indian menu carries. A square outline with a
 * filled dot — recognised instantly and legible at 14px, which a coloured word
 * is not.
 */
export function VegMark({ isVeg, size = 14 }: { isVeg: boolean; size?: number }) {
    const t = useT();
    return (
        <span
            className={isVeg ? 'c-mark c-mark--veg' : 'c-mark c-mark--nonveg'}
            style={{ width: size, height: size }}
            role="img"
            aria-label={isVeg ? t('common.veg') : t('common.nonVeg')}
        />
    );
}

interface StepperProps {
    value: number;
    onChange: (next: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
}

/** Quantity control. Dropping to `min - 1` is how a line gets removed. */
export function Stepper({ value, onChange, min = 0, max = 20, disabled }: StepperProps) {
    return (
        <div className="c-step" onClick={(e) => e.stopPropagation()}>
            <button
                type="button"
                className="c-step__btn"
                onClick={() => onChange(value - 1)}
                disabled={disabled || value <= min}
                aria-label="Decrease quantity"
            >
                <Minus size={15} strokeWidth={3} />
            </button>
            <span className="c-step__n" aria-live="polite">{value}</span>
            <button
                type="button"
                className="c-step__btn"
                onClick={() => onChange(value + 1)}
                disabled={disabled || value >= max}
                aria-label="Increase quantity"
            >
                <Plus size={15} strokeWidth={3} />
            </button>
        </div>
    );
}

/** Small pill used for offers, order status and similar one-word labels. */
export function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'veg' | 'brand' | 'danger' | 'ok' }) {
    const tones: Record<string, { bg: string; fg: string }> = {
        neutral: { bg: 'var(--c-surface-2)', fg: 'var(--c-ink-2)' },
        veg: { bg: '#ECFDF3', fg: 'var(--c-veg)' },
        brand: { bg: 'var(--c-brand-wash)', fg: 'var(--c-brand-deep)' },
        danger: { bg: 'var(--c-danger-wash)', fg: 'var(--c-danger)' },
        ok: { bg: 'var(--c-ok-wash)', fg: 'var(--c-ok)' },
    };
    const { bg, fg } = tones[tone];
    return (
        <span
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 999, background: bg, color: fg,
                font: '700 .68rem/1 "DM Sans", sans-serif', letterSpacing: '.02em',
                whiteSpace: 'nowrap',
            }}
        >
            {children}
        </span>
    );
}

/**
 * Stand-in for a dish with no photo. Menu photography is uneven here, so this
 * has to look deliberate rather than broken — a warm tinted panel with the
 * dish's initial, seeded from its name so the same dish always looks the same.
 */
export function DishFallback({ name, radius = 14 }: { name: string; radius?: number }) {
    const hues = [28, 14, 42, 8, 35];
    let seed = 0;
    for (let i = 0; i < name.length; i++) seed = (seed + name.charCodeAt(i)) % 997;
    const hue = hues[seed % hues.length];

    return (
        <div
            aria-hidden="true"
            style={{
                width: '100%', height: '100%', borderRadius: radius,
                display: 'grid', placeItems: 'center',
                background: `linear-gradient(145deg, hsl(${hue} 68% 93%), hsl(${hue} 55% 86%))`,
                color: `hsl(${hue} 45% 42%)`,
                font: '800 1.4rem/1 Outfit, sans-serif',
            }}
        >
            {name.trim().charAt(0).toUpperCase() || '·'}
        </div>
    );
}

export function Skeleton({ h = 16, w = '100%', r = 10, style }: { h?: number | string; w?: number | string; r?: number; style?: React.CSSProperties }) {
    return <div className="c-skel" style={{ height: h, width: w, borderRadius: r, ...style }} />;
}

/** Shown when a list is legitimately empty — never for an error. */
export function Empty({ icon: Icon, title, body, action }: {
    icon: React.ComponentType<{ size?: number }>;
    title: string;
    body?: string;
    action?: React.ReactNode;
}) {
    return (
        <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div
                style={{
                    width: 64, height: 64, margin: '0 auto 16px', borderRadius: 20,
                    display: 'grid', placeItems: 'center',
                    background: 'var(--c-surface-2)', color: 'var(--c-ink-3)',
                }}
            >
                <Icon size={28} />
            </div>
            <p style={{ font: '800 1.02rem/1.3 Outfit, sans-serif', color: 'var(--c-ink)' }}>{title}</p>
            {body && (
                <p style={{ marginTop: 6, font: '400 .86rem/1.5 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>
                    {body}
                </p>
            )}
            {action && <div style={{ marginTop: 20 }}>{action}</div>}
        </div>
    );
}
