import { useState, useRef, useEffect, useMemo } from 'react';
import { money } from '@/i18n';

/**
 * Charts for the admin reports screen, drawn as plain SVG.
 *
 * These replaced a charting library that cost ~100 KB gzipped — more than half
 * the entire app bundle — for two charts on one screen. Hand-drawn SVG is a
 * couple of kilobytes and lets the marks follow the house spec exactly.
 *
 * Palette is validated (see the data-viz checks): the single-series hue is the
 * deep brand amber #C07E06, which clears 3:1 against a white surface where the
 * lighter brand amber does not. The one two-series chart pairs it with #2a78d6;
 * that pair clears CVD separation at ΔE 27 (protan) and 30.7 (normal vision).
 */

const SERIES = '#C07E06';        // single-series / sequential hue
const SERIES_ALT = '#2a78d6';    // second categorical slot, payment split only
const GRID = 'var(--c-line)';
const INK_3 = 'var(--c-ink-3)';

/** Tracks a container's width so marks are drawn at true pixel size, undistorted. */
function useWidth<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
        ro.observe(el);
        setWidth(el.clientWidth);
        return () => ro.disconnect();
    }, []);

    return [ref, width] as const;
}

// ── Revenue trend ────────────────────────────────────────────────────────────

interface TrendProps {
    data: { date: string; revenue: number }[];
    height?: number;
}

/**
 * Single-series area. No legend — the panel title names the series, which is
 * what the accessibility rule asks for at one series. Hover gives a crosshair
 * and a tooltip rather than labelling every point.
 */
export function RevenueTrend({ data, height = 190 }: TrendProps) {
    const [ref, width] = useWidth<HTMLDivElement>();
    const [hover, setHover] = useState<number | null>(null);

    const pad = { top: 12, right: 8, bottom: 22, left: 44 };
    const w = Math.max(width, 240);
    const innerW = Math.max(10, w - pad.left - pad.right);
    const innerH = Math.max(10, height - pad.top - pad.bottom);

    const max = Math.max(0, ...data.map((d) => d.revenue));
    // Round the axis top to a number a person would have picked.
    const top = niceCeil(max);

    const x = (i: number) => (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = (v: number) => innerH - (v / top) * innerH;

    const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.revenue).toFixed(1)}`).join(' ');
    const area = data.length
        ? `${line} L${x(data.length - 1).toFixed(1)},${innerH} L${x(0).toFixed(1)},${innerH} Z`
        : '';

    // De-duplicate by rendered label: a low axis top (an all-zero day) would
    // otherwise round 0.5 and 1 to the same "1" and print it twice.
    const ticks = [...new Map([0, top / 2, top].map((t) => [axisLabel(t), t])).values()];

    // Label only the ends and the peak — never a number on every point.
    const peak = data.reduce((best, d, i) => (d.revenue > data[best].revenue ? i : best), 0);
    const labelled = new Set(data.length > 1 ? [0, data.length - 1, peak] : [0]);

    if (data.length === 0) {
        return <Empty height={height} label="No revenue in this period" />;
    }

    return (
        <div ref={ref} style={{ width: '100%', position: 'relative' }}>
            <svg
                width={w}
                height={height}
                role="img"
                aria-label={`Revenue trend, ${data.length} points, peak ${money(data[peak].revenue)}`}
                onMouseLeave={() => setHover(null)}
                onMouseMove={(e) => {
                    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                    const px = e.clientX - rect.left - pad.left;
                    const i = Math.round((px / innerW) * (data.length - 1));
                    setHover(i >= 0 && i < data.length ? i : null);
                }}
                style={{ display: 'block', touchAction: 'none' }}
            >
                <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SERIES} stopOpacity="0.22" />
                        <stop offset="100%" stopColor={SERIES} stopOpacity="0.02" />
                    </linearGradient>
                </defs>

                <g transform={`translate(${pad.left},${pad.top})`}>
                    {/* Recessive grid */}
                    {ticks.map((t) => (
                        <g key={t}>
                            <line x1={0} y1={y(t)} x2={innerW} y2={y(t)} stroke={GRID} strokeWidth={1} />
                            <text x={-8} y={y(t) + 4} textAnchor="end" fontSize={10} fill={INK_3} fontFamily="DM Sans, sans-serif">
                                {axisLabel(t)}
                            </text>
                        </g>
                    ))}

                    <path d={area} fill="url(#revFill)" />
                    <path d={line} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

                    {/* Markers only where we label, plus the hovered point. */}
                    {data.map((d, i) =>
                        labelled.has(i) || hover === i ? (
                            <circle
                                key={i}
                                cx={x(i)}
                                cy={y(d.revenue)}
                                r={hover === i ? 5 : 4}
                                fill={SERIES}
                                stroke="var(--c-surface)"
                                strokeWidth={2}
                            />
                        ) : null
                    )}

                    {hover !== null && (
                        <line x1={x(hover)} y1={0} x2={x(hover)} y2={innerH} stroke={SERIES} strokeWidth={1} strokeDasharray="3 3" opacity={0.55} />
                    )}

                    {/* X labels: first and last only, so they never collide. */}
                    <text x={0} y={innerH + 15} fontSize={10} fill={INK_3} fontFamily="DM Sans, sans-serif">
                        {shortLabel(data[0].date)}
                    </text>
                    {data.length > 1 && (
                        <text x={innerW} y={innerH + 15} textAnchor="end" fontSize={10} fill={INK_3} fontFamily="DM Sans, sans-serif">
                            {shortLabel(data[data.length - 1].date)}
                        </text>
                    )}
                </g>
            </svg>

            {hover !== null && (
                <div
                    style={{
                        position: 'absolute',
                        left: Math.min(Math.max(pad.left + x(hover) - 60, 0), Math.max(0, w - 124)),
                        top: 0,
                        width: 120,
                        pointerEvents: 'none',
                        background: 'var(--c-ink)',
                        color: '#fff',
                        borderRadius: 10,
                        padding: '7px 9px',
                        font: '600 .72rem/1.35 "DM Sans", sans-serif',
                        boxShadow: 'var(--c-sh-2)',
                    }}
                >
                    <div style={{ opacity: .7 }}>{shortLabel(data[hover].date)}</div>
                    <div style={{ font: '800 .92rem/1.2 Outfit, sans-serif' }}>{money(data[hover].revenue)}</div>
                </div>
            )}
        </div>
    );
}

// ── Ranked bars ──────────────────────────────────────────────────────────────

interface BarsProps {
    rows: { label: string; value: number }[];
    /** Rendered after the value, e.g. "sold". */
    unit?: string;
    /** Formats the value; defaults to a plain count. */
    format?: (n: number) => string;
    max?: number;
}

/**
 * Horizontal bars for magnitude comparison — the form the order-status breakdown
 * and the top-sellers list both want. This replaced a pie chart, which cannot be
 * read for rank once it has more than two or three slices.
 *
 * One hue throughout: identity lives in the row label, not the colour.
 */
export function RankedBars({ rows, unit, format, max }: BarsProps) {
    if (rows.length === 0) return <Empty height={120} label="Nothing to show yet" />;

    const top = max ?? Math.max(1, ...rows.map((r) => r.value));
    const fmt = format ?? ((n: number) => String(n));

    return (
        <div style={{ display: 'grid', gap: 10 }}>
            {rows.map((row) => {
                const pct = Math.max(2, (row.value / top) * 100);
                return (
                    <div key={row.label}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 4 }}>
                            <span
                                className="a-grow a-trunc"
                                style={{ font: '600 .82rem/1.3 "DM Sans", sans-serif', color: 'var(--c-ink-2)' }}
                            >
                                {row.label}
                            </span>
                            <span style={{ font: '800 .84rem/1 Outfit, sans-serif', color: 'var(--c-ink)' }}>
                                {fmt(row.value)}{unit ? <span style={{ fontWeight: 600, color: INK_3 }}> {unit}</span> : null}
                            </span>
                        </div>
                        <div style={{ height: 8, borderRadius: 999, background: 'var(--c-surface-2)', overflow: 'hidden' }}>
                            <div
                                style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    borderRadius: 999,
                                    background: SERIES,
                                    transition: 'width .35s cubic-bezier(.22,1,.36,1)',
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Two-part split ───────────────────────────────────────────────────────────

/**
 * Part-to-whole for exactly two parts — a meter, not a two-slice pie.
 * Both parts are direct-labelled, so identity never rests on colour alone,
 * and a 2px surface gap separates the fills.
 */
export function PaymentSplit({ cod, online }: { cod: number; online: number }) {
    const total = cod + online;
    const parts = useMemo(
        () => [
            { label: 'Cash on delivery', value: cod, color: SERIES },
            { label: 'Paid online', value: online, color: SERIES_ALT },
        ],
        [cod, online]
    );

    if (total <= 0) return <Empty height={92} label="No revenue in this period" />;

    return (
        <div>
            <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', background: 'var(--c-surface-2)', gap: 2 }}>
                {parts.map((p) =>
                    p.value > 0 ? (
                        <div
                            key={p.label}
                            style={{ width: `${(p.value / total) * 100}%`, background: p.color, transition: 'width .35s ease' }}
                        />
                    ) : null
                )}
            </div>

            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                {parts.map((p) => (
                    <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: p.color, flex: 'none' }} />
                        <span className="a-grow" style={{ font: '600 .82rem/1.3 "DM Sans", sans-serif', color: 'var(--c-ink-2)' }}>
                            {p.label}
                        </span>
                        <span style={{ font: '800 .84rem/1 Outfit, sans-serif', color: 'var(--c-ink)' }}>
                            {money(p.value)}
                        </span>
                        <span style={{ font: '600 .74rem/1 "DM Sans", sans-serif', color: INK_3, minWidth: 34, textAlign: 'right' }}>
                            {Math.round((p.value / total) * 100)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Shared ───────────────────────────────────────────────────────────────────

function Empty({ height, label }: { height: number; label: string }) {
    return (
        <div
            style={{
                height,
                display: 'grid',
                placeItems: 'center',
                border: '1px dashed var(--c-line-strong)',
                borderRadius: 'var(--c-r-md)',
                color: INK_3,
                font: '600 .8rem/1.4 "DM Sans", sans-serif',
            }}
        >
            {label}
        </div>
    );
}

/**
 * Smallest round number at or above the data max, so the axis reads like one a
 * person would have drawn. Falls back to 10 for an empty or all-zero period,
 * which gives a sane 0/5/10 scale instead of a degenerate 0/0.5/1.
 */
function niceCeil(max: number): number {
    if (!Number.isFinite(max) || max <= 0) return 10;
    const mag = Math.pow(10, Math.floor(Math.log10(max)));
    for (const m of [1, 2, 2.5, 5, 10]) {
        if (m * mag >= max) return m * mag;
    }
    return 10 * mag;
}

/** Compact axis label: 1200 becomes "1.2k". */
function axisLabel(v: number): string {
    if (v >= 1000) return `${Math.round(v / 100) / 10}k`;
    return String(Math.round(v));
}

/** Turns "2026-09-20" into "20 Sep"; leaves "12:00" alone. */
function shortLabel(raw: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const d = new Date(`${raw}T00:00:00`);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
    return raw;
}
