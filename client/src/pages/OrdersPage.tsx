import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReceiptText, RotateCcw, ChevronRight, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setOrders } from '@/redux/slices/orderSlice';
import { reorder } from '@/redux/slices/cartSlice';
import { orderService } from '@/services/orderService';
import type { IOrder, OrderStatus } from '@/types';
import AppShell, { TopBar } from '@/components/layout/AppShell';
import LoginModal from '@/components/common/LoginModal';
import { Empty, Tag, Skeleton } from '@/components/ui/Bits';
import { useAuth } from '@/hooks/useAuth';
import { useT, money } from '@/i18n';
import type { StringKey } from '@/i18n/strings';
import { ticketCode } from '@/utils/orderCode';
import toast from 'react-hot-toast';

const LIVE: OrderStatus[] = ['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY'];

const TONE: Record<OrderStatus, 'brand' | 'ok' | 'danger' | 'neutral'> = {
    PENDING: 'brand',
    ACCEPTED: 'brand',
    PREPARING: 'brand',
    OUT_FOR_DELIVERY: 'brand',
    DELIVERED: 'ok',
    CANCELLED: 'danger',
};

export default function OrdersPage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const t = useT();
    const { isAuthenticated } = useAuth();
    const orders = useAppSelector((s) => s.order.orders);

    const [loading, setLoading] = useState(true);
    const [reordering, setReordering] = useState<string | null>(null);
    const [showLogin, setShowLogin] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) { setLoading(false); return; }
        let cancelled = false;

        orderService.getUserOrders(1, 25)
            .then((res) => { if (!cancelled) dispatch(setOrders(res.orders)); })
            .catch(() => { if (!cancelled) toast.error(t('common.somethingWrong')); })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [isAuthenticated, dispatch, t]);

    const handleReorder = async (order: IOrder) => {
        setReordering(order._id);
        try {
            const result = await dispatch(reorder(order._id)).unwrap();
            const skipped = (result as { skipped?: string[] }).skipped ?? [];
            toast.success(t('orders.reordered'));
            if (skipped.length > 0) toast(t('orders.someItemsGone'), { icon: '⚠️' });
            navigate('/cart');
        } catch (err) {
            toast.error(typeof err === 'string' ? err : t('common.somethingWrong'));
        } finally {
            setReordering(null);
        }
    };

    if (!isAuthenticated) {
        return (
            <AppShell>
                <TopBar title={t('orders.title')} />
                <Empty
                    icon={ReceiptText}
                    title={t('account.signIn')}
                    body={t('account.signInBody')}
                    action={
                        <button type="button" className="c-btn c-btn--primary" onClick={() => setShowLogin(true)}>
                            {t('account.signIn')}
                        </button>
                    }
                />
                {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
            </AppShell>
        );
    }

    return (
        <AppShell>
            <TopBar title={t('orders.title')} />

            <div className="c-wrap" style={{ paddingTop: 12 }}>
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="c-card" style={{ padding: 14, marginBottom: 12 }}>
                            <Skeleton h={12} w="40%" />
                            <Skeleton h={16} w="80%" style={{ marginTop: 10 }} />
                            <Skeleton h={14} w="30%" style={{ marginTop: 10 }} />
                        </div>
                    ))
                ) : orders.length === 0 ? (
                    <Empty
                        icon={ReceiptText}
                        title={t('orders.empty')}
                        body={t('orders.emptyBody')}
                        action={
                            <button type="button" className="c-btn c-btn--primary" onClick={() => navigate('/menu')}>
                                {t('cart.startOrdering')}
                            </button>
                        }
                    />
                ) : (
                    orders.map((order) => {
                        const live = LIVE.includes(order.orderStatus);
                        const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);

                        return (
                            <article key={order._id} className="c-card" style={{ padding: 14, marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <Tag tone={TONE[order.orderStatus]}>
                                        {t(`status.${order.orderStatus}` as StringKey)}
                                    </Tag>
                                    <span style={{ flex: 1 }} />
                                    <span style={{ font: '500 .72rem/1 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>
                                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>

                                <p
                                    style={{
                                        font: '600 .86rem/1.45 "DM Sans", sans-serif', color: 'var(--c-ink)',
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                    }}
                                >
                                    {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                                </p>

                                <p style={{ marginTop: 6, font: '500 .76rem/1 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>
                                    {itemCount === 1
                                        ? t('orders.itemsLine', { n: itemCount })
                                        : t('orders.itemsLinePlural', { n: itemCount })}
                                    {' · '}
                                    <span style={{ font: '800 .88rem/1 Outfit, sans-serif', color: 'var(--c-ink)' }}>
                                        {money(order.total)}
                                    </span>
                                </p>

                                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                    {live ? (
                                        <button
                                            type="button"
                                            className="c-btn c-btn--primary"
                                            style={{ flex: 1, minHeight: 40, fontSize: '.84rem' }}
                                            onClick={() => navigate(`/order/${order._id}`)}
                                        >
                                            {t('orders.track')}
                                            <ChevronRight size={15} />
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                className="c-btn c-btn--ghost"
                                                style={{ flex: 1, minHeight: 40, fontSize: '.84rem' }}
                                                onClick={() => navigate(`/order/${order._id}`)}
                                            >
                                                {t('orders.viewDetails')}
                                            </button>
                                            <button
                                                type="button"
                                                className="c-btn c-btn--primary"
                                                style={{ flex: 1, minHeight: 40, fontSize: '.84rem' }}
                                                onClick={() => handleReorder(order)}
                                                disabled={reordering === order._id}
                                            >
                                                {reordering === order._id
                                                    ? <Loader2 size={15} className="animate-spin" />
                                                    : <RotateCcw size={15} />}
                                                {reordering === order._id ? t('orders.reordering') : t('orders.reorder')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </article>
                        );
                    })
                )}
            </div>
        </AppShell>
    );
}
