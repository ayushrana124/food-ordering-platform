import { useState, useEffect, useCallback } from 'react';
import { Loader2, Power, TrendingUp, ShoppingBag, Users, Receipt, RefreshCw } from 'lucide-react';
import AdminShell from '@/components/admin/AdminShell';
import { RevenueTrend, RankedBars, PaymentSplit } from '@/components/admin/Charts';
import { getDetailedOrderStats, toggleRestaurantOpen, type IDetailedStats } from '@/services/adminApi';
import { useAdminContext } from '@/contexts/AdminContext';
import { money } from '@/i18n';
import toast from 'react-hot-toast';

const RANGES = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: '7 days' },
    { key: 'month', label: '30 days' },
    { key: '3months', label: '3 months' },
] as const;

/** Friendly names for the raw status keys the aggregation returns. */
const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Waiting',
    ACCEPTED: 'Accepted',
    PREPARING: 'Cooking',
    OUT_FOR_DELIVERY: 'On the way',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
};

export default function AdminDashboard() {
    const { restaurant, fetchRestaurant, updateRestaurantCache } = useAdminContext();

    const [range, setRange] = useState<string>('today');
    const [stats, setStats] = useState<IDetailedStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    const load = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        try {
            const data = await getDetailedOrderStats(range);
            setStats(data);
        } catch {
            toast.error('Could not load reports');
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { fetchRestaurant(); }, [fetchRestaurant]);

    // Refresh when the window regains focus — the owner flicks back to this tab.
    useEffect(() => {
        const handler = () => load(true);
        window.addEventListener('focus', handler);
        return () => window.removeEventListener('focus', handler);
    }, [load]);

    const isOpen = restaurant?.isOpen ?? true;

    const toggleOpen = async () => {
        setToggling(true);
        try {
            const res = await toggleRestaurantOpen(isOpen);
            if (res.restaurant) updateRestaurantCache(res.restaurant);
            toast.success(res.restaurant?.isOpen ? 'Now accepting orders' : 'Restaurant closed');
        } catch {
            toast.error('Could not change the shop status');
        } finally {
            setToggling(false);
        }
    };

    const statusRows = stats
        ? Object.entries(stats.ordersByStatus)
            .map(([k, v]) => ({ label: STATUS_LABEL[k] ?? k, value: v }))
            .sort((a, b) => b.value - a.value)
        : [];

    return (
        <AdminShell
            title="Reports"
            actions={
                <button type="button" className="a-pill a-pill--quiet" onClick={() => load()} aria-label="Refresh">
                    <RefreshCw size={14} />
                </button>
            }
        >
            <div className="a-wrap">
                {/* ── Shop open / closed ── */}
                <div
                    className="a-card"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 14,
                        background: isOpen ? 'var(--c-ok-wash)' : 'var(--c-danger-wash)',
                        borderColor: isOpen ? '#BBF7D0' : '#FECACA',
                    }}
                >
                    <span
                        style={{
                            width: 40, height: 40, flex: 'none', borderRadius: 12, display: 'grid', placeItems: 'center',
                            background: isOpen ? 'var(--c-ok)' : 'var(--c-danger)', color: '#fff',
                        }}
                    >
                        <Power size={19} />
                    </span>
                    <div className="a-grow" style={{ minWidth: 0 }}>
                        <p style={{ font: '800 .95rem/1.2 Outfit, sans-serif', color: 'var(--c-ink)' }}>
                            {isOpen ? 'Accepting orders' : 'Closed'}
                        </p>
                        <p style={{ marginTop: 2, font: '500 .78rem/1.35 "DM Sans", sans-serif', color: 'var(--c-ink-2)' }}>
                            {isOpen ? 'Customers can order right now' : 'Customers can browse but not order'}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="a-pill"
                        style={{ height: 40, paddingInline: 14, background: 'var(--c-ink)', color: '#fff' }}
                        onClick={toggleOpen}
                        disabled={toggling}
                    >
                        {toggling ? <Loader2 size={14} className="animate-spin" /> : isOpen ? 'Close shop' : 'Open shop'}
                    </button>
                </div>

                {/* ── Range ── */}
                <div className="c-strip" style={{ paddingInline: 0, paddingTop: 0 }}>
                    {RANGES.map((r) => (
                        <button
                            key={r.key}
                            type="button"
                            className="c-chip"
                            data-active={range === r.key}
                            onClick={() => setRange(r.key)}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ display: 'grid', placeItems: 'center', padding: '72px 0' }}>
                        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--c-ink-3)' }} />
                    </div>
                ) : !stats ? null : (
                    <>
                        {/* ── Headline numbers: tiles, not charts ── */}
                        <div className="a-today" style={{ marginTop: 12 }}>
                            <Tile icon={TrendingUp} k="Revenue" v={money(stats.revenue)} />
                            <Tile icon={ShoppingBag} k="Orders" v={String(stats.orders)} />
                            <Tile icon={Receipt} k="Average order" v={money(stats.avgOrderValue)} />
                            <Tile icon={Users} k="Customers" v={String(stats.activeUsers)} />
                        </div>

                        {/* ── Panels ── */}
                        <div
                            style={{
                                marginTop: 14,
                                display: 'grid',
                                gap: 12,
                                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
                            }}
                        >
                            <Panel title="Revenue" note={rangeNote(range)} wide>
                                <RevenueTrend data={stats.trendData} />
                            </Panel>

                            <Panel title="Orders by stage" note="How the period's orders ended up">
                                <RankedBars rows={statusRows} />
                            </Panel>

                            <Panel title="How customers paid" note="Share of delivered revenue">
                                <PaymentSplit cod={stats.revenueByPayment.cod} online={stats.revenueByPayment.online} />
                            </Panel>

                            <Panel title="Best sellers" note="By quantity sold">
                                <RankedBars rows={stats.topItems.map((i) => ({ label: i.name, value: i.count }))} unit="sold" />
                            </Panel>
                        </div>
                    </>
                )}
            </div>
        </AdminShell>
    );
}

function Tile({ icon: Icon, k, v }: { icon: React.ComponentType<{ size?: number }>; k: string; v: string }) {
    return (
        <div className="a-today__cell">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={13} />
                <span className="a-today__k">{k}</span>
            </div>
            <p className="a-today__v">{v}</p>
        </div>
    );
}

function Panel({ title, note, children, wide }: { title: string; note?: string; children: React.ReactNode; wide?: boolean }) {
    return (
        <section className="a-card" style={{ padding: 14, gridColumn: wide ? '1 / -1' : undefined }}>
            <h2 className="a-h2">{title}</h2>
            {note && (
                <p style={{ marginTop: 2, marginBottom: 12, font: '400 .76rem/1.35 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>
                    {note}
                </p>
            )}
            {children}
        </section>
    );
}

const rangeNote = (range: string) =>
    range === 'today' ? 'Delivered and paid, in 3-hour blocks'
        : range === '3months' ? 'Delivered and paid, weekly'
            : 'Delivered and paid, daily';
