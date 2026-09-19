import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Phone, XCircle, RotateCcw, Loader2, ChefHat, Bike, PackageCheck, Clock } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setCurrentOrder } from '@/redux/slices/orderSlice';
import { reorder } from '@/redux/slices/cartSlice';
import { orderService } from '@/services/orderService';
import type { IOrder, OrderStatus } from '@/types';
import AppShell, { TopBar } from '@/components/layout/AppShell';
import { VegMark, Tag } from '@/components/ui/Bits';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { useT, money } from '@/i18n';
import type { StringKey } from '@/i18n/strings';
import toast from 'react-hot-toast';

/** The happy path, in order. CANCELLED is handled separately. */
const STEPS: { status: OrderStatus; icon: typeof ChefHat }[] = [
    { status: 'PENDING', icon: Clock },
    { status: 'ACCEPTED', icon: Check },
    { status: 'PREPARING', icon: ChefHat },
    { status: 'OUT_FOR_DELIVERY', icon: Bike },
    { status: 'DELIVERED', icon: PackageCheck },
];

export default function OrderTrackingPage() {
    const { orderId } = useParams<{ orderId: string }>();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const t = useT();
    const { user } = useAuth();
    const restaurant = useAppSelector((s) => s.menu.restaurant);
    const order = useAppSelector((s) => s.order.currentOrder);
    const menuItems = useAppSelector((s) => s.menu.items);

    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [reordering, setReordering] = useState(false);
    const [now, setNow] = useState(Date.now());

    // Live status pushes land in `currentOrder` via this socket.
    useSocket(user?._id);

    useEffect(() => {
        if (!orderId) return;
        let cancelled = false;

        orderService.getOrder(orderId)
            .then((fetched) => { if (!cancelled) dispatch(setCurrentOrder(fetched)); })
            .catch(() => { if (!cancelled) toast.error(t('common.somethingWrong')); })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [orderId, dispatch, t]);

    // Drives the countdown. One second is the right resolution for a timer the
    // customer is actually watching.
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const minutesLeft = useMemo(() => {
        if (!order?.estimatedDeliveryTime) return null;
        const diff = new Date(order.estimatedDeliveryTime).getTime() - now;
        return Math.max(0, Math.ceil(diff / 60000));
    }, [order?.estimatedDeliveryTime, now]);

    if (loading || !order) {
        return (
            <AppShell bare hideCartBar>
                <TopBar title={t('track.title')} back="/orders" />
                <div style={{ display: 'grid', placeItems: 'center', paddingTop: 80 }}>
                    <Loader2 size={26} className="animate-spin" style={{ color: 'var(--c-ink-3)' }} />
                </div>
            </AppShell>
        );
    }

    const isCancelled = order.orderStatus === 'CANCELLED';
    const isDelivered = order.orderStatus === 'DELIVERED';
    const currentStep = STEPS.findIndex((s) => s.status === order.orderStatus);
    const canCancel = order.orderStatus === 'PENDING';

    const cancel = async () => {
        if (!window.confirm(t('track.cancelConfirm'))) return;
        setCancelling(true);
        try {
            await orderService.cancelOrder(order._id);
            const fresh = await orderService.getOrder(order._id);
            dispatch(setCurrentOrder(fresh));
            toast.success(t('track.cancelled'));
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? t('track.cannotCancel'));
        } finally {
            setCancelling(false);
        }
    };

    const handleReorder = async () => {
        setReordering(true);
        try {
            await dispatch(reorder(order._id)).unwrap();
            toast.success(t('orders.reordered'));
            navigate('/cart');
        } catch (err) {
            toast.error(typeof err === 'string' ? err : t('common.somethingWrong'));
        } finally {
            setReordering(false);
        }
    };

    return (
        <AppShell hideCartBar>
            <TopBar title={t('track.title')} back="/orders" />

            {/* ── Headline status ── */}
            <div className="c-wrap" style={{ paddingTop: 18 }}>
                <div
                    className="c-card"
                    style={{
                        padding: 20, textAlign: 'center',
                        background: isCancelled ? 'var(--c-danger-wash)' : isDelivered ? 'var(--c-ok-wash)' : 'var(--c-brand-wash)',
                        borderColor: isCancelled ? '#FECACA' : isDelivered ? '#BBF7D0' : '#F6E3B6',
                    }}
                >
                    {!isCancelled && !isDelivered && minutesLeft !== null && (
                        <>
                            <p style={{ font: '700 .76rem/1 "DM Sans", sans-serif', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--c-ink-3)' }}>
                                {t('track.arrivingIn')}
                            </p>
                            <p style={{ marginTop: 6, font: '900 2.6rem/1 Outfit, sans-serif', color: 'var(--c-ink)' }}>
                                {minutesLeft > 0 ? minutesLeft : '·'}
                                {minutesLeft > 0 && (
                                    <span style={{ fontSize: '1rem', fontWeight: 700, marginLeft: 6 }}>{t('track.mins')}</span>
                                )}
                            </p>
                            {minutesLeft === 0 && (
                                <p style={{ marginTop: 4, font: '700 .9rem/1.3 "DM Sans", sans-serif', color: 'var(--c-ink-2)' }}>
                                    {t('track.arrivingNow')}
                                </p>
                            )}
                        </>
                    )}

                    <p
                        style={{
                            marginTop: minutesLeft !== null && !isCancelled && !isDelivered ? 12 : 0,
                            font: '800 1.12rem/1.3 Outfit, sans-serif',
                            color: isCancelled ? 'var(--c-danger)' : 'var(--c-ink)',
                        }}
                    >
                        {t(`status.${order.orderStatus}` as StringKey)}
                    </p>
                    <p style={{ marginTop: 4, font: '500 .84rem/1.45 "DM Sans", sans-serif', color: 'var(--c-ink-2)' }}>
                        {order.rejectionReason || t(`status.${order.orderStatus}.sub` as StringKey)}
                    </p>

                    <p style={{ marginTop: 12, font: '600 .74rem/1 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>
                        {t('track.orderNumber')} #{order.orderId}
                    </p>
                </div>
            </div>

            {/* ── Progress ── */}
            {!isCancelled && (
                <div className="c-wrap" style={{ marginTop: 22 }}>
                    {STEPS.map((step, index) => {
                        const done = index <= currentStep;
                        const active = index === currentStep;
                        const Icon = step.icon;
                        const last = index === STEPS.length - 1;

                        return (
                            <div key={step.status} style={{ display: 'flex', gap: 14 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
                                    <span
                                        style={{
                                            width: 34, height: 34, borderRadius: 999, display: 'grid', placeItems: 'center',
                                            background: done ? 'var(--c-brand)' : 'var(--c-surface-2)',
                                            color: done ? 'var(--c-ink)' : 'var(--c-ink-3)',
                                            boxShadow: active ? '0 0 0 4px var(--c-brand-wash)' : 'none',
                                            transition: 'background .3s ease',
                                        }}
                                    >
                                        <Icon size={16} />
                                    </span>
                                    {!last && (
                                        <span
                                            style={{
                                                width: 2, flex: 1, minHeight: 26,
                                                background: index < currentStep ? 'var(--c-brand)' : 'var(--c-line)',
                                            }}
                                        />
                                    )}
                                </div>

                                <div style={{ paddingBottom: last ? 0 : 18, paddingTop: 6 }}>
                                    <p
                                        style={{
                                            font: `${active ? 800 : 600} .88rem/1.3 "DM Sans", sans-serif`,
                                            color: done ? 'var(--c-ink)' : 'var(--c-ink-3)',
                                        }}
                                    >
                                        {t(`status.${step.status}` as StringKey)}
                                    </p>
                                    {active && (
                                        <p style={{ marginTop: 2, font: '400 .78rem/1.4 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>
                                            {t(`status.${step.status}.sub` as StringKey)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Items ── */}
            <div className="c-wrap" style={{ marginTop: 24 }}>
                <div className="c-card" style={{ padding: 14 }}>
                    {order.items.map((item, index) => {
                        // Orders do not store the veg flag, so resolve it from the
                        // live menu. Never guess: showing a chicken dish with a green
                        // mark would be a serious error, so when the dish is no longer
                        // on the menu the mark is omitted rather than defaulted.
                        const dish = menuItems.find((m) => m._id === item.menuItemId);
                        return (
                        <div key={`${item.menuItemId}-${index}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBlock: 6 }}>
                            {dish ? <VegMark isVeg={dish.isVeg} size={12} /> : <span style={{ width: 12, flex: 'none' }} />}
                            <span style={{ flex: 1, minWidth: 0, font: '500 .84rem/1.4 "DM Sans", sans-serif', color: 'var(--c-ink-2)' }}>
                                {item.quantity} × {item.name}
                                {item.customizations?.length > 0 && (
                                    <span style={{ display: 'block', font: '400 .74rem/1.35 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>
                                        {item.customizations.map((c) => c.optionName ?? (c as { name?: string }).name).filter(Boolean).join(' · ')}
                                    </span>
                                )}
                            </span>
                            <span style={{ font: '700 .84rem/1.4 "DM Sans", sans-serif', color: 'var(--c-ink)' }}>
                                {money(item.price * item.quantity)}
                            </span>
                        </div>
                        );
                    })}

                    <div style={{ height: 1, background: 'var(--c-line)', marginBlock: 10 }} />

                    <Row label={t('cart.itemTotal')} value={money(order.subtotal)} />
                    {(order.discount ?? 0) > 0 && <Row label={t('cart.discount')} value={`− ${money(order.discount!)}`} />}
                    <Row label={t('cart.delivery')} value={order.deliveryCharges === 0 ? t('common.free') : money(order.deliveryCharges)} />
                    <div style={{ height: 1, background: 'var(--c-line)', marginBlock: 10 }} />
                    <Row label={t('cart.toPay')} value={money(order.total)} strong />

                    <div style={{ marginTop: 10 }}>
                        <Tag tone={order.paymentMethod === 'COD' ? 'neutral' : 'ok'}>
                            {order.paymentMethod === 'COD' ? t('checkout.cod') : t('checkout.online')}
                        </Tag>
                    </div>
                </div>
            </div>

            {/* ── Address ── */}
            <div className="c-wrap" style={{ marginTop: 16 }}>
                <div className="c-card" style={{ padding: 14 }}>
                    <p style={{ font: '700 .76rem/1 "DM Sans", sans-serif', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--c-ink-3)' }}>
                        {t('checkout.deliverTo')}
                    </p>
                    <p style={{ marginTop: 6, font: '600 .86rem/1.45 "DM Sans", sans-serif', color: 'var(--c-ink)' }}>
                        {order.deliveryAddress?.addressLine}
                        {order.deliveryAddress?.landmark ? ` · ${order.deliveryAddress.landmark}` : ''}
                    </p>
                    {order.specialInstructions && (
                        <p style={{ marginTop: 6, font: '400 .8rem/1.45 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>
                            “{order.specialInstructions}”
                        </p>
                    )}
                </div>
            </div>

            {/* ── Actions ── */}
            <div className="c-wrap" style={{ marginTop: 20, display: 'grid', gap: 10 }}>
                {restaurant?.phone && (
                    <a href={`tel:${restaurant.phone}`} className="c-btn c-btn--line c-btn--block" style={{ textDecoration: 'none' }}>
                        <Phone size={16} />
                        {t('track.callRestaurant')}
                    </a>
                )}

                {canCancel && (
                    <button
                        type="button"
                        className="c-btn c-btn--block"
                        style={{ background: 'var(--c-danger-wash)', color: 'var(--c-danger)' }}
                        onClick={cancel}
                        disabled={cancelling}
                    >
                        {cancelling ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                        {t('track.cancelOrder')}
                    </button>
                )}

                {(isDelivered || isCancelled) && (
                    <button
                        type="button"
                        className="c-btn c-btn--primary c-btn--block"
                        onClick={handleReorder}
                        disabled={reordering}
                    >
                        {reordering ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                        {t('track.orderAgain')}
                    </button>
                )}
            </div>
        </AppShell>
    );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBlock: 3 }}>
            <span style={{ font: `${strong ? 800 : 500} .86rem/1.4 "DM Sans", sans-serif`, color: strong ? 'var(--c-ink)' : 'var(--c-ink-2)' }}>
                {label}
            </span>
            <span style={{ font: `${strong ? 800 : 600} ${strong ? '1rem' : '.86rem'}/1.4 ${strong ? 'Outfit' : '"DM Sans"'}, sans-serif`, color: 'var(--c-ink)' }}>
                {value}
            </span>
        </div>
    );
}
