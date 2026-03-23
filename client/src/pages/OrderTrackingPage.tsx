import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ClipboardList, CheckCircle2, UtensilsCrossed, Bike, Home,
    XCircle, Pizza, MapPin, Check, ArrowRight, Clock, CreditCard,
    Timer, RefreshCw, Loader2, Ban,
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

type StatusStep = { key: string; label: string; icon: any };

const STATUS_STEPS: StatusStep[] = [
    { key: 'PENDING', label: 'Order Placed', icon: ClipboardList },
    { key: 'ACCEPTED', label: 'Accepted', icon: CheckCircle2 },
    { key: 'PREPARING', label: 'Preparing', icon: UtensilsCrossed },
    { key: 'OUT_FOR_DELIVERY', label: 'On the Way', icon: Bike },
    { key: 'DELIVERED', label: 'Delivered', icon: Home },
];

const STATUS_HEADINGS: Record<string, string> = {
    PENDING: 'Waiting for confirmation...',
    ACCEPTED: 'Restaurant accepted your order!',
    PREPARING: 'Your food is being prepared',
    OUT_FOR_DELIVERY: 'Your order is on the way!',
    DELIVERED: 'Enjoy your meal!',
    CANCELLED: 'Order Cancelled',
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

    useSocket(user?._id);

    // Fetch / re-fetch order when status changes via socket
    useEffect(() => {
        if (!orderId) return;
        orderService.getOrder(orderId).then((order) => {
            dispatch(setCurrentOrder(order));
        }).catch(console.error);
    }, [orderId, dispatch, currentOrder?.orderStatus]);

    const countdown = useCountdown(currentOrder?.estimatedDeliveryTime);

    const canCancel = currentOrder?.orderStatus === 'PENDING';
    const needsPayment = currentOrder?.paymentMethod === 'ONLINE' && currentOrder?.paymentStatus !== 'PAID' && currentOrder?.orderStatus !== 'CANCELLED';

    const handleRetryPayment = async () => {
        if (!currentOrder) return;
        setRetrying(true);
        try {
            const paymentOrder = await paymentService.retryPayment(currentOrder._id);

            // Dummy payment bypass
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
                name: 'Bunty Pizza',
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
                        // Re-fetch order to get updated payment status
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
            <div className="min-h-screen bg-white">
                <Navbar />
                <div className="flex justify-center py-24">
                    <LoadingSpinner size="lg" />
                </div>
            </div>
        );
    }

    const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === currentOrder.orderStatus);
    const isCancelled = currentOrder.orderStatus === 'CANCELLED';
    const isDelivered = currentOrder.orderStatus === 'DELIVERED';
    const heading = STATUS_HEADINGS[currentOrder.orderStatus] || 'Tracking your order';

    return (
        <div className="min-h-screen bg-white page-enter">
            <Navbar />
            <div className="container py-8 px-4 pb-16 max-w-[660px]">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-5">
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center"
                            style={{
                                background: isCancelled ? '#FEF2F2' : isDelivered ? '#F0FDF4' : '#FFFBF0',
                                color: isCancelled ? '#DC2626' : isDelivered ? '#16A34A' : '#E8A317',
                                boxShadow: isCancelled ? '0 4px 16px rgba(220,38,38,0.1)' : isDelivered ? '0 4px 16px rgba(22,163,74,0.1)' : '0 4px 16px rgba(232,163,23,0.1)',
                            }}
                        >
                            {isCancelled ? (
                                <XCircle size={38} />
                            ) : isDelivered ? (
                                <CheckCircle2 size={38} />
                            ) : (
                                <Pizza size={38} />
                            )}
                        </div>
                    </div>
                    <h1 className="font-outfit font-extrabold text-[clamp(1.5rem,4vw,2rem)] mb-1 tracking-[-0.02em]">
                        {heading}
                    </h1>
                    <p className="text-[#8E8E8E] text-[0.9rem]">Order ID: #{currentOrder.orderId}</p>

                    {/* Rejection reason */}
                    {isCancelled && currentOrder.rejectionReason && (
                        <p className="text-[0.85rem] text-[#DC2626] bg-[#FEF2F2] rounded-xl px-4 py-2.5 mt-3 inline-block">
                            Reason: {currentOrder.rejectionReason}
                        </p>
                    )}

                    <div className="flex flex-wrap justify-center gap-3 mt-3">
                        <span className="flex items-center gap-1.5 text-[0.8rem] text-[#4A4A4A] bg-[#F7F7F5] px-3 py-1.5 rounded-lg">
                            <Clock size={13} className="text-[#8E8E8E]" />
                            {new Date(currentOrder.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`flex items-center gap-1.5 text-[0.8rem] font-semibold px-3 py-1.5 rounded-lg ${currentOrder.paymentStatus === 'PAID' ? 'bg-[#F0FDF4] text-[#16A34A]' :
                            currentOrder.paymentMethod === 'COD' ? 'bg-[#FFFBF0] text-[#D97706]' : 'bg-[#FEF2F2] text-[#DC2626]'
                            }`}>
                            <CreditCard size={13} />
                            {currentOrder.paymentStatus === 'PAID' ? 'Paid' : currentOrder.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Payment Pending'}
                        </span>
                    </div>

                    {/* Estimated delivery countdown */}
                    {countdown && !isCancelled && !isDelivered && (
                        <div className="mt-4 inline-flex items-center gap-2 bg-[#FFFBF0] border border-[#F5E6C8] rounded-xl px-5 py-3">
                            <Timer size={18} className="text-[#E8A317]" />
                            <div className="text-left">
                                <p className="text-[0.7rem] text-[#8E8E8E] font-medium">Estimated delivery</p>
                                <p className="font-outfit font-bold text-[1.1rem] text-[#E8A317] leading-tight">{countdown}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status Stepper */}
                {!isCancelled && (
                    <div className="card p-7 mb-6">
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
                                            className="text-[0.65rem] text-center mt-[0.4rem] leading-[1.3] font-medium"
                                            style={{
                                                color: isActive ? '#E8A317' : isDone ? '#16A34A' : '#8E8E8E',
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

                {/* Payment Retry Banner */}
                {needsPayment && !isCancelled && (
                    <div className="card p-5 mb-6 border-2 border-[#FED7AA] bg-[#FFFBF0]">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] flex items-center justify-center text-[#DC2626] shrink-0">
                                <CreditCard size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-[0.9rem] text-[#0F0F0F]">Payment Pending</p>
                                <p className="text-[0.78rem] text-[#8E8E8E]">Complete your payment to confirm the order</p>
                            </div>
                        </div>
                        <button
                            onClick={handleRetryPayment}
                            disabled={retrying}
                            className="w-full h-11 rounded-xl bg-[#E8A317] text-white border-none cursor-pointer font-bold text-[0.85rem] flex items-center justify-center gap-2 hover:bg-[#D4940F] transition-colors disabled:opacity-50"
                        >
                            {retrying ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                            {retrying ? 'Processing...' : 'Retry Payment'}
                        </button>
                    </div>
                )}

                {/* Order Details */}
                <div className="card p-7 mb-6">
                    <h3 className="font-outfit font-bold mb-4">Order Details</h3>
                    <div className="flex flex-col gap-[0.6rem]">
                        {currentOrder.items.map((item: IOrderItem, i: number) => (
                            <div key={i} className="flex justify-between text-[0.9rem]">
                                <span className="text-[#4A4A4A]">{item.name} × {item.quantity}</span>
                                <span className="font-semibold">₹{item.price * item.quantity}</span>
                            </div>
                        ))}
                    </div>
                    <div className="divider" />
                    <div className="flex flex-col gap-2 mt-3">
                        <div className="flex justify-between text-[0.875rem]">
                            <span className="text-[#4A4A4A]">Subtotal</span>
                            <span>₹{currentOrder.subtotal}</span>
                        </div>
                        <div className="flex justify-between text-[0.875rem]">
                            <span className="text-[#4A4A4A]">Delivery</span>
                            <span>₹{currentOrder.deliveryCharges}</span>
                        </div>
                        {(currentOrder.discount ?? 0) > 0 && (
                            <div className="flex justify-between text-[0.875rem] text-[#16A34A]">
                                <span>Discount</span>
                                <span>-₹{currentOrder.discount}</span>
                            </div>
                        )}
                        <div className="divider my-1" />
                        <div className="flex justify-between font-outfit font-extrabold text-[1.1rem]">
                            <span>Total</span>
                            <span className="text-[#E8A317]">₹{currentOrder.total}</span>
                        </div>
                    </div>
                </div>

                {/* Delivery Address */}
                <div className="card p-6 mb-6">
                    <h3 className="font-outfit font-bold text-[0.95rem] mb-2 flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-[#FFFBF0] flex items-center justify-center text-[#E8A317]">
                            <MapPin size={16} />
                        </span>
                        Delivering to
                    </h3>
                    <p className="text-[0.875rem] text-[#4A4A4A] ml-[42px]">{currentOrder.deliveryAddress.addressLine}</p>
                    {currentOrder.deliveryAddress.landmark && (
                        <p className="text-[0.8rem] text-[#8E8E8E] ml-[42px]">Near {currentOrder.deliveryAddress.landmark}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-4 flex-wrap">
                    {canCancel && (
                        <button
                            onClick={handleCancel}
                            disabled={cancelling}
                            className="flex-1 min-w-[140px] h-12 rounded-xl border-2 border-[#DC2626] text-[#DC2626] bg-white cursor-pointer font-bold text-[0.85rem] flex items-center justify-center gap-2 hover:bg-[#FEF2F2] transition-colors disabled:opacity-50"
                        >
                            {cancelling ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                            {cancelling ? 'Cancelling...' : 'Cancel Order'}
                        </button>
                    )}
                    <Link to="/menu" className="btn-primary flex-1 justify-center no-underline min-w-[160px] flex items-center gap-2 group">
                        Order Again <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link to="/profile?tab=orders" className="btn-outline flex-1 justify-center no-underline min-w-[160px]">
                        All Orders
                    </Link>
                </div>
            </div>
        </div>
    );
}
