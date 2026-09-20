import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClipboardList, RefreshCw, Loader2, History } from 'lucide-react';
import AdminShell from '@/components/admin/AdminShell';
import OrderCard from '@/components/admin/OrderCard';
import { getOrders, getOrderStats, type IAdminOrder, type IOrderStats } from '@/services/adminApi';
import { useAdminContext } from '@/contexts/AdminContext';
import { money } from '@/i18n';
import toast from 'react-hot-toast';

/**
 * The four stages an order passes through while it is still work.
 * Delivered and cancelled orders drop out of the board into the history view.
 */
const STAGES = [
    { key: 'PENDING', title: 'New', tone: 'new' },
    { key: 'ACCEPTED', title: 'Accepted', tone: '' },
    { key: 'PREPARING', title: 'Cooking', tone: '' },
    { key: 'OUT_FOR_DELIVERY', title: 'On the way', tone: '' },
] as const;

type View = 'board' | 'history';

export default function AdminOrders() {
    const { refreshActiveOrders } = useAdminContext();

    const [orders, setOrders] = useState<IAdminOrder[]>([]);
    const [history, setHistory] = useState<IAdminOrder[]>([]);
    const [stats, setStats] = useState<IOrderStats | null>(null);
    const [view, setView] = useState<View>('board');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ── Data ─────────────────────────────────────────────────────────────────
    const load = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        setRefreshing(true);
        try {
            // One call for the live board: the four working stages are all the
            // kitchen needs, and the server's default page of 20 is nowhere near
            // enough when a rush stacks up.
            const [live, todayStats] = await Promise.all([
                getOrders({ limit: 100 }),
                getOrderStats().catch(() => null),
            ]);

            const all = live.orders ?? [];
            setOrders(all.filter((o) => STAGES.some((s) => s.key === o.orderStatus)));
            setHistory(all.filter((o) => o.orderStatus === 'DELIVERED' || o.orderStatus === 'CANCELLED'));
            if (todayStats) setStats(todayStats);
        } catch {
            toast.error('Could not load orders');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // The provider fans this out on every socket event and on its heartbeat.
    useEffect(() => {
        const handler = () => load(true);
        window.addEventListener('admin:orders-changed', handler);
        return () => window.removeEventListener('admin:orders-changed', handler);
    }, [load]);

    const afterAction = useCallback(() => {
        load(true);
        refreshActiveOrders();
    }, [load, refreshActiveOrders]);

    const byStage = useMemo(() => {
        const map: Record<string, IAdminOrder[]> = {};
        for (const stage of STAGES) {
            map[stage.key] = orders
                .filter((o) => o.orderStatus === stage.key)
                // Oldest first — the order that has waited longest is the one to do next.
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        return map;
    }, [orders]);

    const liveCount = orders.length;

    return (
        <AdminShell
            title="Orders"
            actions={
                <button
                    type="button"
                    className="a-pill a-pill--quiet"
                    onClick={() => load()}
                    aria-label="Refresh"
                    disabled={refreshing}
                >
                    {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                </button>
            }
        >
            <div className="a-wrap">
                {/* ── Today ── */}
                <div className="a-today">
                    <Cell k="Orders today" v={stats ? String(stats.todayOrders) : '—'} />
                    <Cell k="Revenue today" v={stats ? money(stats.todayRevenue) : '—'} />
                    <Cell k="Working now" v={String(liveCount)} />
                    <Cell
                        k="Waiting"
                        v={String(byStage.PENDING?.length ?? 0)}
                        alert={(byStage.PENDING?.length ?? 0) > 0}
                    />
                </div>

                {/* ── View switch ── */}
                <div className="a-row" style={{ marginTop: 16, marginBottom: 4 }}>
                    <div className="a-seg">
                        <button type="button" className="a-seg__b" data-on={view === 'board'} onClick={() => setView('board')}>
                            Live board
                        </button>
                        <button type="button" className="a-seg__b" data-on={view === 'history'} onClick={() => setView('history')}>
                            Finished
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'grid', placeItems: 'center', padding: '64px 0' }}>
                        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--c-ink-3)' }} />
                    </div>
                ) : view === 'board' ? (
                    liveCount === 0 ? (
                        <Blank
                            icon={ClipboardList}
                            title="No orders in the kitchen"
                            body="New orders appear here the moment they come in, and the alarm will ring."
                        />
                    ) : (
                        <div className="a-board" style={{ marginTop: 8 }}>
                            {STAGES.map((stage) => {
                                const list = byStage[stage.key] ?? [];
                                return (
                                    <section
                                        key={stage.key}
                                        className={stage.tone === 'new' ? 'a-col a-col--new' : 'a-col'}
                                        data-empty={list.length === 0}
                                    >
                                        <div className="a-col__head">
                                            <span className="a-col__title a-grow">{stage.title}</span>
                                            <span className="a-col__n">{list.length}</span>
                                        </div>

                                        {list.length === 0 ? (
                                            <p
                                                style={{
                                                    padding: '18px 12px', textAlign: 'center',
                                                    border: '1px dashed var(--c-line-strong)', borderRadius: 'var(--c-r-md)',
                                                    color: 'var(--c-ink-3)', font: '600 .78rem/1.4 "DM Sans", sans-serif',
                                                }}
                                            >
                                                Nothing here
                                            </p>
                                        ) : (
                                            list.map((order) => (
                                                <OrderCard key={order._id} order={order} onChanged={afterAction} />
                                            ))
                                        )}
                                    </section>
                                );
                            })}
                        </div>
                    )
                ) : history.length === 0 ? (
                    <Blank icon={History} title="Nothing finished yet" body="Delivered and cancelled orders collect here." />
                ) : (
                    <div className="a-grid" style={{ marginTop: 8 }}>
                        {history.map((order) => (
                            <OrderCard key={order._id} order={order} onChanged={afterAction} detailed={false} />
                        ))}
                    </div>
                )}
            </div>
        </AdminShell>
    );
}

function Cell({ k, v, alert }: { k: string; v: string; alert?: boolean }) {
    return (
        <div className="a-today__cell" style={alert ? { borderColor: '#F3C969', background: 'var(--c-brand-wash)' } : undefined}>
            <p className="a-today__k">{k}</p>
            <p className="a-today__v" style={alert ? { color: 'var(--c-brand-deep)' } : undefined}>{v}</p>
        </div>
    );
}

function Blank({ icon: Icon, title, body }: { icon: React.ComponentType<{ size?: number }>; title: string; body: string }) {
    return (
        <div style={{ padding: '56px 20px', textAlign: 'center' }}>
            <div
                style={{
                    width: 58, height: 58, margin: '0 auto 14px', borderRadius: 18, display: 'grid', placeItems: 'center',
                    background: 'var(--c-surface-2)', color: 'var(--c-ink-3)',
                }}
            >
                <Icon size={25} />
            </div>
            <p style={{ font: '800 1rem/1.3 Outfit, sans-serif', color: 'var(--c-ink)' }}>{title}</p>
            <p style={{ marginTop: 5, font: '400 .85rem/1.5 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>{body}</p>
        </div>
    );
}
