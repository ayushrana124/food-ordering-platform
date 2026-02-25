import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ClipboardList, CheckCircle2, UtensilsCrossed, Bike, Home,
    XCircle, PartyPopper, Pizza, MapPin, Check
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

type StatusStep = { key: string; label: string; icon: any };

const STATUS_STEPS: StatusStep[] = [
    { key: 'PENDING', label: 'Order Placed', icon: ClipboardList },
    { key: 'ACCEPTED', label: 'Accepted', icon: CheckCircle2 },
    { key: 'PREPARING', label: 'Preparing', icon: UtensilsCrossed },
    { key: 'OUT_FOR_DELIVERY', label: 'On the Way', icon: Bike },
    { key: 'DELIVERED', label: 'Delivered', icon: Home },
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
            <div className="min-h-screen bg-bg">
                <Navbar />
                <div className="flex justify-center py-24">
                    <LoadingSpinner size="lg" />
                </div>
            </div>
        );
    }

    const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === currentOrder.status);
    const isCancelled = currentOrder.status === 'CANCELLED';

    return (
        <div className="min-h-screen bg-bg page-enter">
            <Navbar />
            <div className="container py-8 px-4 pb-16 max-w-[640px]">

                {/* Header soul */}
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-4">
                        <div className="w-20 h-20 rounded-full bg-surface-alt flex items-center justify-center text-amber shadow-sm">
                            {isCancelled ? (
                                <XCircle size={40} className="text-red-500" />
                            ) : currentOrder.status === 'DELIVERED' ? (
                                <PartyPopper size={40} />
                            ) : (
                                <Pizza size={40} />
                            )}
                        </div>
                    </div>
                    <h1 className="font-outfit font-extrabold text-[clamp(1.5rem,4vw,2rem)] mb-1">
                        {isCancelled ? 'Order Cancelled' : currentOrder.status === 'DELIVERED' ? 'Enjoy your meal!' : 'Your pizza is on the way!'}
                    </h1>
                    <p className="text-[#555] text-[0.9rem]">Order ID: #{currentOrder.orderId}</p>
                </div>

                {/* Status Stepper soul */}
                {!isCancelled && (
                    <div className="card p-6 mb-6">
                        <h3 className="font-outfit font-bold mb-6">Order Status</h3>
                        <div className="flex relative">
                            {STATUS_STEPS.map((step, idx) => {
                                const isDone = idx < currentStepIdx;
                                const isActive = idx === currentStepIdx;
                                return (
                                    <div key={step.key} className="status-step">
                                        {idx < STATUS_STEPS.length - 1 && (
                                            <div className={`status-step-line${isDone ? ' done' : ''}`} />
                                        )}
                                        <div
                                            className={`status-step-dot${isActive ? ' active' : isDone ? ' done' : ''}`}
                                            style={{ zIndex: 1 }}
                                        >
                                            {isDone ? <Check size={14} /> : <step.icon size={14} />}
                                        </div>
                                        <span
                                            className="text-[0.65rem] text-center mt-[0.35rem] leading-[1.3] font-medium"
                                            style={{
                                                color: isActive ? '#D4920A' : isDone ? '#15803D' : '#9B9B9B',
                                                fontWeight: isActive ? 700 : 500,
                                            }}
                                        >
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Order Details soul */}
                <div className="card p-6 mb-6">
                    <h3 className="font-outfit font-bold mb-4">Order Details</h3>
                    <div className="flex flex-col gap-[0.6rem]">
                        {currentOrder.items.map((item: IOrderItem, i: number) => (
                            <div key={i} className="flex justify-between text-[0.9rem]">
                                <span className="text-[#555]">{item.name} × {item.quantity}</span>
                                <span className="font-semibold">₹{item.price * item.quantity}</span>
                            </div>
                        ))}
                    </div>
                    <div className="divider" />
                    <div className="flex flex-col gap-2 mt-3">
                        <div className="flex justify-between text-[0.875rem]">
                            <span className="text-[#555]">Subtotal</span>
                            <span>₹{currentOrder.subtotal}</span>
                        </div>
                        <div className="flex justify-between text-[0.875rem]">
                            <span className="text-[#555]">Delivery</span>
                            <span>₹{currentOrder.deliveryCharges}</span>
                        </div>
                        <div className="flex justify-between text-[0.875rem]">
                            <span className="text-[#555]">Taxes</span>
                            <span>₹{currentOrder.taxes}</span>
                        </div>
                        <div className="divider my-1" />
                        <div className="flex justify-between font-outfit font-extrabold text-[1.05rem]">
                            <span>Total</span>
                            <span className="text-amber">₹{currentOrder.total}</span>
                        </div>
                    </div>
                </div>

                {/* Delivery Address soul */}
                <div className="card p-5 mb-6">
                    <h3 className="font-outfit font-bold text-[0.95rem] mb-2 flex items-center gap-2">
                        <MapPin size={18} className="text-amber" />
                        Delivering to
                    </h3>
                    <p className="text-[0.875rem] text-[#555]">{currentOrder.deliveryAddress.addressLine}</p>
                    {currentOrder.deliveryAddress.landmark && (
                        <p className="text-[0.8rem] text-text-muted">Near {currentOrder.deliveryAddress.landmark}</p>
                    )}
                </div>

                {/* Actions soul */}
                <div className="flex gap-4 flex-wrap">
                    <Link to="/menu" className="btn-primary flex-1 justify-center no-underline min-w-[160px] flex items-center gap-2">
                        Order Again <Pizza size={18} />
                    </Link>
                    <Link to="/profile?tab=orders" className="btn-outline flex-1 justify-center no-underline min-w-[160px]">
                        All Orders
                    </Link>
                </div>
            </div>
        </div>
    );
}
