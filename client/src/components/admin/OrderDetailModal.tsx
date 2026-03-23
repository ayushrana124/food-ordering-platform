import { useState } from 'react';
import { X, User, MapPin, Clock, CreditCard, Check, XCircle, Package, Truck, ChefHat, ArrowRight, AlertTriangle, Phone, MessageSquare } from 'lucide-react';
import { acceptOrder, updateOrderStatus, rejectOrder, type IAdminOrder } from '@/services/adminApi';
import AdminBadge from '@/components/admin/ui/AdminBadge';
import toast from 'react-hot-toast';

interface Props {
    order: IAdminOrder;
    onClose: () => void;
    onRefresh: () => void;
}

const STATUS_FLOW = ['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
const STATUS_ICONS: Record<string, typeof Package> = {
    PENDING: Clock, ACCEPTED: Check, PREPARING: ChefHat, OUT_FOR_DELIVERY: Truck, DELIVERED: Package,
};

const PREP_TIMES = [20, 30, 45, 60, 90];

export default function OrderDetailModal({ order, onClose, onRefresh }: Props) {
    const [prepTime, setPrepTime] = useState(30);
    const [loading, setLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);

    const currentStatus = order.orderStatus;
    const currentIdx = STATUS_FLOW.indexOf(currentStatus as typeof STATUS_FLOW[number]);
    const isUnpaidOnline = order.paymentMethod === 'ONLINE' && order.paymentStatus !== 'PAID';

    const handleAccept = async () => {
        setLoading(true);
        try {
            await acceptOrder(order._id, prepTime);
            toast.success('Order accepted!');
            onRefresh();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to accept');
        } finally { setLoading(false); }
    };

    const handleReject = async () => {
        setLoading(true);
        try {
            await rejectOrder(order._id, rejectReason || undefined);
            toast.success('Order rejected');
            onRefresh();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to reject');
        } finally { setLoading(false); }
    };

    const handleStatusUpdate = async (status: string) => {
        setLoading(true);
        try {
            await updateOrderStatus(order._id, status);
            toast.success('Status updated!');
            onRefresh();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to update status');
        } finally { setLoading(false); }
    };

    const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

    return (
        <div
            className="fixed inset-0 z-[100] flex justify-end"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="bg-white h-full w-full max-w-[520px] flex flex-col shadow-[-8px_0_40px_rgba(0,0,0,0.12)]"
                style={{ animation: 'slideInRight 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#EEEEEE] shrink-0">
                    <div>
                        <h2 className="font-outfit font-bold text-[1.15rem] text-[#0F0F0F]">Order #{order.orderId}</h2>
                        <p className="text-[0.78rem] text-[#8E8E8E] mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-xl border border-[#EEEEEE] flex items-center justify-center bg-white cursor-pointer text-[#4A4A4A] hover:bg-[#F5F5F3] transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6 flex flex-col gap-6">

                        {/* Status Timeline */}
                        {currentStatus !== 'CANCELLED' && (
                            <div className="flex items-center gap-1 overflow-x-auto pb-2">
                                {STATUS_FLOW.map((s, idx) => {
                                    const Icon = STATUS_ICONS[s] || Package;
                                    const isActive = idx <= currentIdx;
                                    const isCurrent = idx === currentIdx;
                                    return (
                                        <div key={s} className="flex items-center gap-1 shrink-0">
                                            <div className={`flex flex-col items-center gap-1`}>
                                                <div
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                                        isCurrent ? 'ring-2 ring-offset-2 ring-[#E8A317]' : ''
                                                    }`}
                                                    style={{
                                                        background: isActive ? '#0F0F0F' : '#F5F5F3',
                                                        color: isActive ? 'white' : '#C4C4C0',
                                                    }}
                                                >
                                                    <Icon size={16} />
                                                </div>
                                                <span className={`text-[0.62rem] font-semibold whitespace-nowrap ${isActive ? 'text-[#0F0F0F]' : 'text-[#C4C4C0]'}`}>
                                                    {s.replace(/_/g, ' ').split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ')}
                                                </span>
                                            </div>
                                            {idx < STATUS_FLOW.length - 1 && (
                                                <div className={`w-6 h-[2px] rounded-full mb-5 ${idx < currentIdx ? 'bg-[#0F0F0F]' : 'bg-[#E0E0DC]'}`} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {currentStatus === 'CANCELLED' && (
                            <div className="bg-[#FEF2F2] rounded-xl p-4 text-center">
                                <AdminBadge label="CANCELLED" size="md" />
                                <p className="text-[0.82rem] text-[#DC2626] mt-2">This order has been cancelled</p>
                                {order.rejectionReason && (
                                    <p className="text-[0.78rem] text-[#8E8E8E] mt-1">Reason: {order.rejectionReason}</p>
                                )}
                            </div>
                        )}

                        {/* Payment Guard Warning */}
                        {currentStatus === 'PENDING' && isUnpaidOnline && (
                            <div className="flex items-center gap-3 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl p-4">
                                <AlertTriangle size={20} className="text-[#D97706] shrink-0" />
                                <div>
                                    <p className="font-semibold text-[0.85rem] text-[#D97706]">Payment Pending</p>
                                    <p className="text-[0.78rem] text-[#92400E]">Online payment hasn't been received yet. Order cannot be accepted until payment is confirmed.</p>
                                </div>
                            </div>
                        )}

                        {/* Customer — prominent phone */}
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] shrink-0">
                                <User size={18} />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-[0.9rem] text-[#0F0F0F]">{order.userId?.name || 'Guest'}</p>
                                <a href={`tel:${order.userId?.phone}`} className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 bg-[#EFF6FF] rounded-lg text-[0.82rem] text-[#2563EB] font-semibold no-underline hover:bg-[#DBEAFE] transition-colors">
                                    <Phone size={13} />
                                    {order.userId?.phone}
                                </a>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#FFFBF0] flex items-center justify-center text-[#E8A317] shrink-0">
                                <MapPin size={18} />
                            </div>
                            <div>
                                <p className="font-semibold text-[0.85rem] text-[#0F0F0F]">Delivery Address</p>
                                <p className="text-[0.84rem] text-[#4A4A4A] mt-0.5">{order.deliveryAddress?.addressLine}</p>
                                {order.deliveryAddress?.landmark && (
                                    <p className="text-[0.78rem] text-[#8E8E8E] mt-0.5">Near {order.deliveryAddress.landmark}</p>
                                )}
                                {order.distance && (
                                    <p className="text-[0.75rem] text-[#8E8E8E] mt-0.5">{order.distance.toFixed(1)} km away</p>
                                )}
                            </div>
                        </div>

                        {/* Items */}
                        <div>
                            <h4 className="font-bold text-[0.88rem] text-[#0F0F0F] mb-3">Order Items</h4>
                            <div className="flex flex-col gap-2.5">
                                {order.items.map((item, i) => (
                                    <div key={i} className="flex justify-between items-start bg-[#FAFAF8] rounded-xl p-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[0.85rem] text-[#0F0F0F]">{item.name}</span>
                                                <span className="text-[0.75rem] text-[#8E8E8E]">x{item.quantity}</span>
                                            </div>
                                            {item.customizations && item.customizations.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {item.customizations.map((c, ci) => (
                                                        <span key={ci} className="text-[0.7rem] text-[#8E8E8E] bg-white px-2 py-0.5 rounded-md border border-[#EEEEEE]">
                                                            {c.groupName || (c as any).name}: {c.optionName || (c as any).option}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-bold text-[0.85rem] text-[#0F0F0F] shrink-0 ml-3">
                                            {'\u20B9'}{item.price * item.quantity}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment Summary */}
                        <div className="bg-[#FAFAF8] rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <CreditCard size={16} className="text-[#8E8E8E]" />
                                <span className="font-semibold text-[0.85rem] text-[#0F0F0F]">{order.paymentMethod}</span>
                                <AdminBadge label={order.paymentStatus} size="sm" />
                            </div>
                            <div className="flex flex-col gap-[0.4rem] text-[0.84rem]">
                                <div className="flex justify-between"><span className="text-[#4A4A4A]">Subtotal</span><span>{'\u20B9'}{order.subtotal}</span></div>
                                <div className="flex justify-between"><span className="text-[#4A4A4A]">Delivery</span><span>{'\u20B9'}{order.deliveryCharges}</span></div>
                                {(order as any).discount > 0 && (
                                    <div className="flex justify-between text-[#16A34A]"><span>Discount</span><span>-{'\u20B9'}{(order as any).discount}</span></div>
                                )}
                                <div className="h-[1px] bg-[#E0E0DC] my-1" />
                                <div className="flex justify-between font-extrabold font-outfit text-[1.05rem]">
                                    <span>Total</span><span className="text-[#E8A317]">{'\u20B9'}{order.total}</span>
                                </div>
                            </div>
                        </div>

                        {/* Estimated Delivery */}
                        {order.estimatedDeliveryTime && currentStatus !== 'DELIVERED' && currentStatus !== 'CANCELLED' && (
                            <div className="flex items-center gap-3 bg-[#F0FDF4] rounded-xl p-4">
                                <Clock size={18} className="text-[#16A34A]" />
                                <div>
                                    <p className="text-[0.78rem] text-[#8E8E8E]">Estimated delivery by</p>
                                    <p className="font-bold text-[0.9rem] text-[#0F0F0F]">
                                        {new Date(order.estimatedDeliveryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        {order.preparationTime && <span className="text-[#8E8E8E] font-normal text-[0.78rem] ml-2">({order.preparationTime} min prep)</span>}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Status History */}
                        {order.statusHistory && order.statusHistory.length > 0 && (
                            <div>
                                <h4 className="font-bold text-[0.88rem] text-[#0F0F0F] mb-3">Status History</h4>
                                <div className="flex flex-col gap-2">
                                    {order.statusHistory.map((entry, i) => (
                                        <div key={i} className="flex items-center gap-3 text-[0.8rem]">
                                            <span className="text-[#8E8E8E] text-[0.72rem] whitespace-nowrap w-[70px] shrink-0">
                                                {new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${entry.status === 'CANCELLED' ? 'bg-[#DC2626]' : entry.status === 'DELIVERED' ? 'bg-[#16A34A]' : 'bg-[#E8A317]'}`} />
                                            <span className="font-semibold text-[#0F0F0F]">
                                                {entry.status.replace(/_/g, ' ')}
                                            </span>
                                            {entry.note && <span className="text-[#8E8E8E] text-[0.75rem]">— {entry.note}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions Footer */}
                {currentStatus !== 'DELIVERED' && currentStatus !== 'CANCELLED' && (
                    <div className="border-t border-[#EEEEEE] px-6 py-4 shrink-0">
                        {currentStatus === 'PENDING' && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <Clock size={16} className="text-[#8E8E8E] shrink-0" />
                                    <label className="text-[0.82rem] font-medium shrink-0">Prep time</label>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {PREP_TIMES.map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setPrepTime(t)}
                                                className={`px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold border cursor-pointer transition-all ${
                                                    prepTime === t
                                                        ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]'
                                                        : 'bg-white text-[#4A4A4A] border-[#EEEEEE] hover:bg-[#F5F5F3]'
                                                }`}
                                            >
                                                {t >= 60 ? `${t / 60 >= 1.5 ? '1.5h' : t === 60 ? '1h' : t + 'm'}` : `${t}m`}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Reject reason input */}
                                {showRejectInput && (
                                    <div className="flex items-center gap-2">
                                        <MessageSquare size={16} className="text-[#8E8E8E] shrink-0" />
                                        <input
                                            type="text"
                                            placeholder="Rejection reason (optional)"
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            maxLength={200}
                                            className="flex-1 h-9 rounded-lg border border-[#EEEEEE] px-3 text-[0.82rem] outline-none focus:border-[#DC2626] transition-colors"
                                        />
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        className="flex-1 h-11 rounded-xl bg-[#16A34A] text-white border-none cursor-pointer font-bold text-[0.85rem] flex items-center justify-center gap-2 hover:bg-[#15803D] transition-colors disabled:opacity-50"
                                        onClick={handleAccept}
                                        disabled={loading || isUnpaidOnline}
                                        title={isUnpaidOnline ? 'Cannot accept — payment pending' : ''}
                                    >
                                        <Check size={16} /> Accept
                                    </button>
                                    {!showRejectInput ? (
                                        <button
                                            className="h-11 px-4 rounded-xl border-2 border-[#DC2626] text-[#DC2626] bg-white cursor-pointer font-bold text-[0.85rem] flex items-center gap-2 hover:bg-[#FEF2F2] transition-colors disabled:opacity-50"
                                            onClick={() => setShowRejectInput(true)}
                                            disabled={loading}
                                        >
                                            <XCircle size={16} /> Reject
                                        </button>
                                    ) : (
                                        <button
                                            className="h-11 px-4 rounded-xl bg-[#DC2626] text-white border-none cursor-pointer font-bold text-[0.85rem] flex items-center gap-2 hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
                                            onClick={handleReject}
                                            disabled={loading}
                                        >
                                            <XCircle size={16} /> Confirm Reject
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {currentStatus !== 'PENDING' && nextStatus && (
                            <button
                                onClick={() => handleStatusUpdate(nextStatus)}
                                disabled={loading}
                                className="w-full h-11 rounded-xl bg-[#0F0F0F] text-white border-none cursor-pointer font-bold text-[0.85rem] flex items-center justify-center gap-2 hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
                            >
                                Mark as {nextStatus.replace(/_/g, ' ')} <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}
