import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setCurrentOrder } from '@/redux/slices/orderSlice';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import type { RootState } from '@/redux/store';
import type { IOrderItem } from '@/types';
import { orderService } from '@/services/orderService';

type StatusStep = { key: string; label: string; icon: string };

const STATUS_STEPS: StatusStep[] = [
    { key: 'PENDING', label: 'Order Placed', icon: '📋' },
    { key: 'ACCEPTED', label: 'Accepted', icon: '✅' },
    { key: 'PREPARING', label: 'Preparing', icon: '👨‍🍳' },
    { key: 'OUT_FOR_DELIVERY', label: 'On the Way', icon: '🛵' },
    { key: 'DELIVERED', label: 'Delivered', icon: '🏠' },
];

export default function OrderTrackingPage() {
    const { orderId } = useParams<{ orderId: string }>();
    const dispatch = useAppDispatch();
    const { user } = useAuth();
    const { currentOrder, loading } = useAppSelector((s: RootState) => s.order);

    useSocket(user?._id);

    useEffect(() => {
        if (!orderId) return;
        orderService.getOrder(orderId).then((order) => {
            dispatch(setCurrentOrder(order));
        }).catch(console.error);
    }, [orderId, dispatch]);

    if (loading || !currentOrder) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
                <Navbar />
                <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem 0' }}>
                    <LoadingSpinner size="lg" />
                </div>
            </div>
        );
    }

    const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === currentOrder.status);
    const isCancelled = currentOrder.status === 'CANCELLED';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }} className="page-enter">
            <Navbar />
            <div className="container" style={{ padding: '2rem 1rem 4rem', maxWidth: 640 }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                        {isCancelled ? '❌' : currentOrder.status === 'DELIVERED' ? '🎉' : '🍕'}
                    </div>
                    <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '0.25rem' }}>
                        {isCancelled ? 'Order Cancelled' : currentOrder.status === 'DELIVERED' ? 'Enjoy your meal!' : 'Your pizza is on the way!'}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Order ID: #{currentOrder.orderId}</p>
                </div>

                {/* Status Stepper */}
                {!isCancelled && (
                    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, marginBottom: '1.5rem' }}>Order Status</h3>
                        <div style={{ display: 'flex', position: 'relative' }}>
                            {STATUS_STEPS.map((step, idx) => {
                                const isDone = idx < currentStepIdx;
                                const isActive = idx === currentStepIdx;
                                return (
                                    <div key={step.key} className="status-step">
                                        {/* Connector line */}
                                        {idx < STATUS_STEPS.length - 1 && (
                                            <div className={`status-step-line${isDone ? ' done' : ''}`} />
                                        )}
                                        <div className={`status-step-dot${isActive ? ' active' : isDone ? ' done' : ''}`} style={{ zIndex: 1 }}>
                                            {isDone ? '✓' : step.icon.slice(0, 2)}
                                        </div>
                                        <span style={{ fontSize: '0.65rem', textAlign: 'center', color: isActive ? 'var(--color-accent)' : isDone ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: isActive ? 700 : 500, marginTop: '0.35rem', lineHeight: 1.3 }}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Order Details */}
                <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, marginBottom: '1rem' }}>Order Details</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {currentOrder.items.map((item: IOrderItem, i: number) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>{item.name} × {item.quantity}</span>
                                <span style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</span>
                            </div>
                        ))}
                    </div>
                    <div className="divider" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal</span>
                            <span>₹{currentOrder.subtotal}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Delivery</span>
                            <span>₹{currentOrder.deliveryCharges}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Taxes</span>
                            <span>₹{currentOrder.taxes}</span>
                        </div>
                        <div className="divider" style={{ margin: '0.25rem 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.05rem' }}>
                            <span>Total</span>
                            <span style={{ color: 'var(--color-accent)' }}>₹{currentOrder.total}</span>
                        </div>
                    </div>
                </div>

                {/* Delivery Address */}
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>📍 Delivering to</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{currentOrder.deliveryAddress.addressLine}</p>
                    {currentOrder.deliveryAddress.landmark && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Near {currentOrder.deliveryAddress.landmark}</p>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <Link to="/menu" className="btn-primary" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', minWidth: 160 }}>
                        Order Again 🍕
                    </Link>
                    <Link to="/profile?tab=orders" className="btn-outline" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', minWidth: 160 }}>
                        All Orders
                    </Link>
                </div>
            </div>
        </div>
    );
}
