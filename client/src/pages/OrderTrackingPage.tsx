import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ClipboardList, CheckCircle2, UtensilsCrossed, Bike, Home,
    XCircle, Pizza, MapPin, Check, ArrowRight, Clock, CreditCard,
    Timer, RefreshCw, Loader2, Ban, RotateCw, Package,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setCurrentOrder } from '@/redux/slices/orderSlice';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import type { RootState } from '@/redux/store';
import type { IOrderItem } from '@/types';
import { orderService } from '@/services/orderService';
import { paymentService } from '@/services/paymentService';
import toast from 'react-hot-toast';

// Razorpay global type is declared in CheckoutPage.tsx

type StatusStep = { key: string; label: string; icon: any; mobileLabel: string };

const STATUS_STEPS: StatusStep[] = [
    { key: 'PENDING', label: 'Order Placed', mobileLabel: 'Placed', icon: ClipboardList },
    { key: 'ACCEPTED', label: 'Accepted', mobileLabel: 'Accepted', icon: CheckCircle2 },
    { key: 'PREPARING', label: 'Preparing', mobileLabel: 'Preparing', icon: UtensilsCrossed },
    { key: 'OUT_FOR_DELIVERY', label: 'On the Way', mobileLabel: 'On Way', icon: Bike },
    { key: 'DELIVERED', label: 'Delivered', mobileLabel: 'Delivered', icon: Home },
];

const STATUS_HEADINGS: Record<string, string> = {
    PENDING: 'Waiting for confirmation...',
    ACCEPTED: 'Restaurant accepted your order!',
    PREPARING: 'Your food is being prepared',
    OUT_FOR_DELIVERY: 'Your order is on the way!',
    DELIVERED: 'Enjoy your meal!',
    CANCELLED: 'Order Cancelled',
};

const STATUS_SUBTEXT: Record<string, string> = {
    PENDING: 'The restaurant will confirm shortly',
    ACCEPTED: 'Your food will be ready soon',
    PREPARING: 'Almost there, hang tight!',
    OUT_FOR_DELIVERY: 'Rider is heading to your location',
    DELIVERED: 'We hope you loved it!',
    CANCELLED: 'This order has been cancelled',
};

function useCountdown(targetDate: string | undefined) {
    const [remaining, setRemaining] = useState('');
    useEffect(() => {
        if (!targetDate) { setRemaining(''); return; }
        const update = () => {
            const diff = new Date(targetDate).getTime() - Date.now();
            if (diff <= 0) { setRemaining('Any moment now'); return; }
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setRemaining(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [targetDate]);
    return remaining;
}

export default function OrderTrackingPage() {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { user } = useAuth();
    const { currentOrder, loading } = useAppSelector((s: RootState) => s.order);
    const [retrying, setRetrying] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useSocket(user?._id);

    // Fetch order once on mount — socket handles all real-time updates after this
    useEffect(() => {
        if (!orderId) return;
        orderService.getOrder(orderId).then((order) => {
            dispatch(setCurrentOrder(order));
        }).catch(console.error);
    }, [orderId, dispatch]);

    const countdown = useCountdown(currentOrder?.estimatedDeliveryTime);

    const canCancel = currentOrder?.orderStatus === 'PENDING';
    const needsPayment = currentOrder?.paymentMethod === 'ONLINE' && currentOrder?.paymentStatus !== 'PAID' && currentOrder?.orderStatus !== 'CANCELLED';

    const handleRefresh = useCallback(async () => {
        if (!orderId || refreshing) return;
        setRefreshing(true);
        try {
            const order = await orderService.getOrder(orderId);
            dispatch(setCurrentOrder(order));
            toast.success('Status updated');
        } catch {
            toast.error('Failed to refresh');
        } finally {
            setRefreshing(false);
        }
    }, [orderId, refreshing, dispatch]);

    const handleRetryPayment = async () => {
        if (!currentOrder) return;
        setRetrying(true);
        try {
            const paymentOrder = await paymentService.retryPayment(currentOrder._id);

            if (paymentOrder.key === 'dummy_key') {
                await paymentService.verifyPayment({
                    razorpay_order_id: paymentOrder.razorpayOrderId,
                    razorpay_payment_id: `dummy_pay_${Date.now()}`,
                    razorpay_signature: 'dummy_signature',
                    orderId: currentOrder._id,
                });
                toast.success('Payment successful! (Test Mode)');
                const updated = await orderService.getOrder(currentOrder._id);
                dispatch(setCurrentOrder(updated));
                return;
            }

            const rzp = new window.Razorpay({
                key: paymentOrder.key,
                amount: paymentOrder.amount,
                currency: paymentOrder.currency,
                name: 'Diamond Pizza',
                description: `Order #${currentOrder.orderId}`,
                order_id: paymentOrder.razorpayOrderId,
                handler: async (response: any) => {
                    try {
                        await paymentService.verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            orderId: currentOrder._id,
                        });
                        toast.success('Payment successful!');
                        const updated = await orderService.getOrder(currentOrder._id);
                        dispatch(setCurrentOrder(updated));
                    } catch {
                        toast.error('Payment verification failed');
                    }
                },
                prefill: { name: user?.name ?? '', contact: user?.phone ?? '' },
                theme: { color: '#E8A317' },
            });
            rzp.open();
        } catch {
            toast.error('Failed to retry payment');
        } finally {
            setRetrying(false);
        }
    };

    const handleCancel = async () => {
        if (!currentOrder) return;
        setCancelling(true);
        try {
            await orderService.cancelOrder(currentOrder._id);
            toast.success('Order cancelled');
            const updated = await orderService.getOrder(currentOrder._id);
            dispatch(setCurrentOrder(updated));
        } catch {
            toast.error('Failed to cancel order');
        } finally {
            setCancelling(false);
        }
    };

    if (loading || !currentOrder) {
        return (
            <div style={{ minHeight: '100vh', background: '#F4F4F2' }}>
                <Navbar />
                <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem 0' }}>
                    <LoadingSpinner size="lg" />
                </div>
            </div>
        );
    }

    const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === currentOrder.orderStatus);
    const isCancelled = currentOrder.orderStatus === 'CANCELLED';
    const isDelivered = currentOrder.orderStatus === 'DELIVERED';
    const heading = STATUS_HEADINGS[currentOrder.orderStatus] || 'Tracking your order';
    const subtext = STATUS_SUBTEXT[currentOrder.orderStatus] || '';

    const statusColor = isCancelled ? '#DC2626' : isDelivered ? '#16A34A' : '#E8A317';
    const statusBg = isCancelled ? '#FEF2F2' : isDelivered ? '#F0FDF4' : '#FFFBF0';

    return (
        <div style={{ minHeight: '100vh', background: '#F4F4F2' }} className="page-enter">
            <Navbar />

            <div style={{ maxWidth: 540, margin: '0 auto', padding: '1rem clamp(0.75rem, 3vw, 1.25rem)', paddingBottom: '2rem' }}>

                {/* ── Hero Status Card ──────────────────────────────── */}
                <div style={{
                    background: 'white',
                    borderRadius: 20,
                    overflow: 'hidden',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    marginBottom: '0.75rem',
                }}>
                    {/* Animated gradient top bar */}
                    <div style={{
                        height: 4,
                        background: isCancelled
                            ? '#DC2626'
                            : isDelivered
                                ? '#16A34A'
                                : 'linear-gradient(90deg, #E8A317, #F5C563, #E8A317)',
                        backgroundSize: '200% 100%',
                        animation: (!isCancelled && !isDelivered) ? 'shimmer 2s ease-in-out infinite' : 'none',
                    }} />

                    <div style={{ padding: 'clamp(1rem, 4vw, 1.5rem)', textAlign: 'center' }}>
                        {/* Status icon */}
                        <div style={{
                            width: 56, height: 56, borderRadius: 16, margin: '0 auto 0.75rem',
                            background: statusBg, color: statusColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 4px 14px ${statusColor}18`,
                        }}>
                            {isCancelled ? <XCircle size={28} /> : isDelivered ? <CheckCircle2 size={28} /> : <Pizza size={28} />}
                        </div>

                        <h1 style={{
                            fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                            fontSize: 'clamp(1.05rem, 3.5vw, 1.4rem)', color: '#0F0F0F',
                            margin: '0 0 0.2rem', letterSpacing: '-0.02em', lineHeight: 1.2,
                        }}>
                            {heading}
                        </h1>
                        <p style={{ fontSize: 'clamp(0.7rem, 2.5vw, 0.82rem)', color: '#8E8E8E', margin: '0 0 0.5rem' }}>
                            {subtext}
                        </p>

                        {/* Meta badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.35rem', marginTop: '0.5rem' }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 'clamp(0.62rem, 2vw, 0.72rem)', color: '#8E8E8E', fontWeight: 500,
                                background: '#F7F7F5', padding: '0.3rem 0.6rem', borderRadius: 8,
                            }}>
                                <Package size={11} />
                                #{currentOrder.orderId}
                            </span>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 'clamp(0.62rem, 2vw, 0.72rem)', color: '#8E8E8E', fontWeight: 500,
                                background: '#F7F7F5', padding: '0.3rem 0.6rem', borderRadius: 8,
                            }}>
                                <Clock size={11} />
                                {new Date(currentOrder.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 'clamp(0.62rem, 2vw, 0.72rem)', fontWeight: 600,
                                padding: '0.3rem 0.6rem', borderRadius: 8,
                                background: currentOrder.paymentStatus === 'PAID' ? '#F0FDF4' : currentOrder.paymentMethod === 'COD' ? '#FFFBF0' : '#FEF2F2',
                                color: currentOrder.paymentStatus === 'PAID' ? '#16A34A' : currentOrder.paymentMethod === 'COD' ? '#D97706' : '#DC2626',
                            }}>
                                <CreditCard size={11} />
                                {currentOrder.paymentStatus === 'PAID' ? 'Paid' : currentOrder.paymentMethod === 'COD' ? 'COD' : 'Pending'}
                            </span>
                        </div>

                        {/* Rejection reason */}
                        {isCancelled && currentOrder.rejectionReason && (
                            <p style={{
                                fontSize: 'clamp(0.68rem, 2.2vw, 0.8rem)', color: '#DC2626',
                                background: '#FEF2F2', borderRadius: 10, padding: '0.5rem 0.75rem',
                                marginTop: '0.6rem', display: 'inline-block',
                            }}>
                                Reason: {currentOrder.rejectionReason}
                            </p>
                        )}

                        {/* Countdown timer */}
                        {countdown && !isCancelled && !isDelivered && (
                            <div style={{
                                marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                background: '#FFFBF0', border: '1px solid #F5E6C8', borderRadius: 12,
                                padding: '0.5rem 0.85rem',
                            }}>
                                <Timer size={15} style={{ color: '#E8A317' }} />
                                <div style={{ textAlign: 'left' }}>
                                    <p style={{ fontSize: 'clamp(0.58rem, 1.8vw, 0.65rem)', color: '#8E8E8E', fontWeight: 500, margin: 0, lineHeight: 1 }}>
                                        Estimated delivery
                                    </p>
                                    <p style={{
                                        fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                                        fontSize: 'clamp(0.85rem, 2.8vw, 1rem)', color: '#E8A317',
                                        margin: 0, lineHeight: 1.2,
                                    }}>
                                        {countdown}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Refresh button */}
                        <div style={{ marginTop: '0.6rem' }}>
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    background: 'none', border: '1px solid #E8E8E6', borderRadius: 8,
                                    padding: '0.3rem 0.65rem', cursor: refreshing ? 'wait' : 'pointer',
                                    fontSize: 'clamp(0.6rem, 1.8vw, 0.7rem)', color: '#8E8E8E', fontWeight: 600,
                                    transition: 'all 0.2s',
                                }}
                            >
                                <RotateCw size={11} style={{
                                    animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
                                }} />
                                {refreshing ? 'Checking...' : 'Refresh Status'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Status Stepper Card ───────────────────────────── */}
                {!isCancelled && (
                    <div style={{
                        background: 'white', borderRadius: 18, padding: 'clamp(0.85rem, 3vw, 1.25rem)',
                        boxShadow: '0 1px 6px rgba(0,0,0,0.05)', marginBottom: '0.75rem',
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: 'clamp(0.65rem, 2.5vw, 1rem)',
                        }}>
                            <h3 style={{
                                fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                                fontSize: 'clamp(0.78rem, 2.5vw, 0.9rem)', color: '#0F0F0F', margin: 0,
                            }}>
                                Order Status
                            </h3>
                        </div>

                        <div style={{ display: 'flex', position: 'relative' }}>
                            {STATUS_STEPS.map((step, idx) => {
                                const isDone = idx < currentStepIdx;
                                const isActive = idx === currentStepIdx;
                                const StepIcon = step.icon;
                                return (
                                    <div key={step.key} style={{
                                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        position: 'relative',
                                    }}>
                                        {/* Connector line */}
                                        {idx < STATUS_STEPS.length - 1 && (
                                            <div style={{
                                                position: 'absolute', top: 14, left: '50%', right: '-50%',
                                                height: 3, borderRadius: 2,
                                                background: isDone ? '#16A34A' : '#EEEEEE',
                                                zIndex: 0,
                                                transition: 'background 0.4s',
                                            }} />
                                        )}
                                        {/* Dot */}
                                        <div style={{
                                            width: 30, height: 30, borderRadius: 10,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            zIndex: 1, transition: 'all 0.3s',
                                            background: isActive ? statusBg : isDone ? '#F0FDF4' : '#F7F7F5',
                                            color: isActive ? '#E8A317' : isDone ? '#16A34A' : '#C4C4C0',
                                            boxShadow: isActive ? `0 2px 10px ${statusColor}25` : 'none',
                                            border: isActive ? `2px solid ${statusColor}40` : '2px solid transparent',
                                        }}>
                                            {isDone ? <Check size={13} strokeWidth={3} /> : <StepIcon size={13} />}
                                        </div>
                                        <span style={{
                                            fontSize: 'clamp(0.52rem, 1.7vw, 0.65rem)',
                                            textAlign: 'center', marginTop: '0.3rem', lineHeight: 1.2,
                                            fontWeight: isActive ? 700 : 500,
                                            color: isActive ? '#E8A317' : isDone ? '#16A34A' : '#8E8E8E',
                                        }}>
                                            <span className="hidden sm:inline">{step.label}</span>
                                            <span className="sm:hidden">{step.mobileLabel}</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Payment Retry Banner ──────────────────────────── */}
                {needsPayment && !isCancelled && (
                    <div style={{
                        background: '#FFFBF0', borderRadius: 16, padding: 'clamp(0.75rem, 3vw, 1.1rem)',
                        border: '2px solid #FED7AA', marginBottom: '0.75rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                            <div style={{
                                width: 34, height: 34, borderRadius: 10, background: '#FEF2F2',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#DC2626', flexShrink: 0,
                            }}>
                                <CreditCard size={16} />
                            </div>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)', color: '#0F0F0F', margin: 0 }}>Payment Pending</p>
                                <p style={{ fontSize: 'clamp(0.62rem, 2vw, 0.72rem)', color: '#8E8E8E', margin: 0 }}>Complete payment to confirm</p>
                            </div>
                        </div>
                        <button
                            onClick={handleRetryPayment}
                            disabled={retrying}
                            style={{
                                width: '100%', height: 38, borderRadius: 10,
                                background: '#E8A317', color: 'white', border: 'none',
                                cursor: retrying ? 'wait' : 'pointer',
                                fontWeight: 700, fontSize: 'clamp(0.72rem, 2.2vw, 0.82rem)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                opacity: retrying ? 0.6 : 1, transition: 'opacity 0.2s',
                            }}
                        >
                            {retrying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            {retrying ? 'Processing...' : 'Retry Payment'}
                        </button>
                    </div>
                )}

                {/* ── Order Items Card ──────────────────────────────── */}
                <div style={{
                    background: 'white', borderRadius: 18, overflow: 'hidden',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.05)', marginBottom: '0.75rem',
                }}>
                    <div style={{
                        padding: 'clamp(0.6rem, 2.5vw, 0.8rem) clamp(0.75rem, 3vw, 1.1rem)',
                        borderBottom: '1px solid #F0F0EE',
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                    }}>
                        <span style={{
                            width: 24, height: 24, borderRadius: 6, background: '#FFFBF0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#E8A317', flexShrink: 0,
                        }}>
                            <UtensilsCrossed size={11} />
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 'clamp(0.68rem, 2.2vw, 0.78rem)', color: '#0F0F0F', letterSpacing: '0.03em' }}>
                            ORDER ITEMS
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 'clamp(0.58rem, 1.8vw, 0.65rem)', color: '#8E8E8E', fontWeight: 500 }}>
                            {currentOrder.items.length} item{currentOrder.items.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <div style={{ padding: 'clamp(0.5rem, 2vw, 0.7rem) clamp(0.75rem, 3vw, 1.1rem)' }}>
                        {currentOrder.items.map((item: IOrderItem, i: number) => (
                            <div key={i}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.4rem 0', gap: '0.4rem',
                                }}>
                                    <span style={{
                                        fontSize: 'clamp(0.7rem, 2.3vw, 0.82rem)', fontWeight: 500, color: '#4A4A4A',
                                        flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {item.name} <span style={{ color: '#8E8E8E', fontSize: 'clamp(0.6rem, 1.8vw, 0.7rem)' }}>x{item.quantity}</span>
                                    </span>
                                    <span style={{ fontWeight: 600, fontSize: 'clamp(0.7rem, 2.3vw, 0.82rem)', color: '#0F0F0F', flexShrink: 0 }}>
                                        {'\u20B9'}{item.price * item.quantity}
                                    </span>
                                </div>
                                {i < currentOrder.items.length - 1 && (
                                    <div style={{ borderTop: '1px dashed #F0F0EE' }} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Bill summary */}
                    <div style={{
                        borderTop: '1.5px dashed #E8E8E6',
                        padding: 'clamp(0.5rem, 2vw, 0.7rem) clamp(0.75rem, 3vw, 1.1rem)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                            <span style={{ fontSize: 'clamp(0.65rem, 2vw, 0.78rem)', color: '#8E8E8E' }}>Subtotal</span>
                            <span style={{ fontSize: 'clamp(0.65rem, 2vw, 0.78rem)', color: '#4A4A4A' }}>{'\u20B9'}{currentOrder.subtotal}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                            <span style={{ fontSize: 'clamp(0.65rem, 2vw, 0.78rem)', color: '#8E8E8E' }}>Delivery</span>
                            <span style={{ fontSize: 'clamp(0.65rem, 2vw, 0.78rem)', color: '#4A4A4A' }}>{'\u20B9'}{currentOrder.deliveryCharges}</span>
                        </div>
                        {(currentOrder.discount ?? 0) > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                <span style={{ fontSize: 'clamp(0.65rem, 2vw, 0.78rem)', color: '#16A34A' }}>Discount</span>
                                <span style={{ fontSize: 'clamp(0.65rem, 2vw, 0.78rem)', color: '#16A34A', fontWeight: 600 }}>-{'\u20B9'}{currentOrder.discount}</span>
                            </div>
                        )}
                        <div style={{ borderTop: '1px solid #F0F0EE', margin: '0.35rem 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: 'clamp(0.78rem, 2.5vw, 0.9rem)', color: '#0F0F0F' }}>Total</span>
                            <span style={{
                                fontFamily: 'Outfit, sans-serif', fontWeight: 900,
                                fontSize: 'clamp(0.85rem, 2.8vw, 1rem)', color: '#E8A317',
                            }}>
                                {'\u20B9'}{currentOrder.total}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Delivery Address Card ─────────────────────────── */}
                <div style={{
                    background: 'white', borderRadius: 18,
                    padding: 'clamp(0.75rem, 3vw, 1rem) clamp(0.75rem, 3vw, 1.1rem)',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.05)', marginBottom: '0.75rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span style={{
                            width: 26, height: 26, borderRadius: 7, background: '#FFFBF0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#E8A317', flexShrink: 0,
                        }}>
                            <MapPin size={13} />
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 'clamp(0.72rem, 2.3vw, 0.85rem)', color: '#0F0F0F' }}>
                            Delivering to
                        </span>
                    </div>
                    <p style={{
                        fontSize: 'clamp(0.68rem, 2.2vw, 0.8rem)', color: '#4A4A4A',
                        margin: '0 0 0 2.1rem', lineHeight: 1.4,
                    }}>
                        {currentOrder.deliveryAddress.addressLine}
                    </p>
                    {currentOrder.deliveryAddress.landmark && (
                        <p style={{
                            fontSize: 'clamp(0.6rem, 1.8vw, 0.72rem)', color: '#8E8E8E',
                            margin: '0.15rem 0 0 2.1rem',
                        }}>
                            Near {currentOrder.deliveryAddress.landmark}
                        </p>
                    )}
                </div>

                {/* ── Action Buttons ────────────────────────────────── */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {canCancel && (
                        <button
                            onClick={handleCancel}
                            disabled={cancelling}
                            style={{
                                flex: 1, minWidth: 120, height: 40, borderRadius: 12,
                                border: '2px solid #DC2626', background: 'white', color: '#DC2626',
                                cursor: cancelling ? 'wait' : 'pointer',
                                fontWeight: 700, fontSize: 'clamp(0.7rem, 2.2vw, 0.8rem)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                opacity: cancelling ? 0.5 : 1, transition: 'all 0.2s',
                            }}
                        >
                            {cancelling ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                            {cancelling ? 'Cancelling...' : 'Cancel'}
                        </button>
                    )}
                    <Link
                        to="/menu"
                        style={{
                            flex: 1, minWidth: 130, height: 40, borderRadius: 12,
                            background: '#E8A317', color: 'white', textDecoration: 'none',
                            fontWeight: 700, fontSize: 'clamp(0.7rem, 2.2vw, 0.8rem)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            boxShadow: '0 2px 10px rgba(232,163,23,0.25)',
                        }}
                    >
                        Order Again <ArrowRight size={14} />
                    </Link>
                    <Link
                        to="/profile?tab=orders"
                        style={{
                            flex: 1, minWidth: 120, height: 40, borderRadius: 12,
                            border: '2px solid #E8E8E6', background: 'white', color: '#4A4A4A',
                            textDecoration: 'none',
                            fontWeight: 700, fontSize: 'clamp(0.7rem, 2.2vw, 0.8rem)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        All Orders
                    </Link>
                </div>
            </div>

            {/* Shimmer animation for top bar */}
            <style>{`
                @keyframes shimmer {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
