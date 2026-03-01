import { useState } from 'react';
import { X, User, MapPin, Clock, CreditCard, Check } from 'lucide-react';
import { acceptOrder, updateOrderStatus, type IAdminOrder } from '@/services/adminApi';
import toast from 'react-hot-toast';

interface Props {
    order: IAdminOrder;
    onClose: () => void;
    onRefresh: () => void;
}

const STATUS_FLOW = ['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;

export default function OrderDetailModal({ order, onClose, onRefresh }: Props) {
    const [prepTime, setPrepTime] = useState(30);
    const [loading, setLoading] = useState(false);

    const currentStatus = order.orderStatus || order.status;

    const handleAccept = async () => {
        setLoading(true);
        try {
            await acceptOrder(order._id, prepTime);
            toast.success('Order accepted!');
            onRefresh();
            onClose();
        } catch { toast.error('Failed to accept'); }
        finally { setLoading(false); }
    };

    const handleStatusUpdate = async (status: string) => {
        setLoading(true);
        try {
            await updateOrderStatus(order._id, status);
            toast.success('Status updated!');
            onRefresh();
            onClose();
        } catch { toast.error('Failed to update status'); }
        finally { setLoading(false); }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto"
                style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.15)', animation: 'slideUp 0.25s var(--ease-spring)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-[#EEEEEE]">
                    <h2 className="font-outfit font-bold text-[1.15rem]">Order #{order.orderId}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg border border-[#EEEEEE] flex items-center justify-center bg-white cursor-pointer text-[#4A4A4A] hover:bg-[#F5F5F3] transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-7 flex flex-col gap-6">
                    {/* Customer */}
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] shrink-0 mt-0.5">
                            <User size={17} />
                        </div>
                        <div>
                            <p className="font-bold text-[0.9rem]">{order.userId?.name || 'Guest'}</p>
                            <p className="text-[0.8rem] text-[#8E8E8E]">{order.userId?.phone}</p>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FFFBF0] flex items-center justify-center text-[#E8A317] shrink-0 mt-0.5">
                            <MapPin size={17} />
                        </div>
                        <div>
                            <p className="font-semibold text-[0.85rem]">Delivery Address</p>
                            <p className="text-[0.84rem] text-[#4A4A4A]">{order.deliveryAddress?.addressLine}</p>
                            {order.deliveryAddress?.landmark && (
                                <p className="text-[0.78rem] text-[#8E8E8E]">Near {order.deliveryAddress.landmark}</p>
                            )}
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <h4 className="font-bold text-[0.85rem] mb-3">Items</h4>
                        <div className="flex flex-col gap-2">
                            {order.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-[0.85rem]">
                                    <span className="text-[#4A4A4A]">{item.name} x {item.quantity}</span>
                                    <span className="font-semibold">₹{item.price * item.quantity}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment summary */}
                    <div className="bg-[#F9F9F7] rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <CreditCard size={16} className="text-[#8E8E8E]" />
                            <span className="font-semibold text-[0.85rem]">{order.paymentMethod} — {order.paymentStatus}</span>
                        </div>
                        <div className="flex flex-col gap-[0.35rem] text-[0.84rem]">
                            <div className="flex justify-between"><span className="text-[#4A4A4A]">Subtotal</span><span>₹{order.subtotal}</span></div>
                            <div className="flex justify-between"><span className="text-[#4A4A4A]">Delivery</span><span>₹{order.deliveryCharges}</span></div>
                            <div className="flex justify-between"><span className="text-[#4A4A4A]">Taxes</span><span>₹{order.taxes}</span></div>
                            <div className="h-[1px] bg-[#E0E0DC] my-1" />
                            <div className="flex justify-between font-extrabold font-outfit text-[1rem]">
                                <span>Total</span><span className="text-[#E8A317]">₹{order.total}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    {currentStatus === 'PENDING' && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <Clock size={16} className="text-[#8E8E8E] shrink-0" />
                                <label className="text-[0.85rem] font-medium shrink-0">Prep time (min)</label>
                                <input
                                    className="input flex-1"
                                    type="number"
                                    min={10}
                                    max={120}
                                    value={prepTime}
                                    onChange={(e) => setPrepTime(Number(e.target.value))}
                                />
                            </div>
                            <button
                                className="btn-primary w-full justify-center flex items-center gap-2"
                                onClick={handleAccept}
                                disabled={loading}
                            >
                                <Check size={18} /> Accept Order
                            </button>
                        </div>
                    )}

                    {currentStatus !== 'PENDING' && currentStatus !== 'DELIVERED' && currentStatus !== 'CANCELLED' && (
                        <div>
                            <p className="text-[0.8rem] font-semibold mb-2 text-[#8E8E8E]">Update Status</p>
                            <div className="flex flex-wrap gap-2">
                                {STATUS_FLOW.filter((s) => {
                                    const idx = STATUS_FLOW.indexOf(currentStatus as typeof STATUS_FLOW[number]);
                                    return STATUS_FLOW.indexOf(s) > idx;
                                }).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => handleStatusUpdate(s)}
                                        disabled={loading}
                                        className="px-4 py-2 rounded-xl bg-[#0F0F0F] text-white border-none cursor-pointer font-semibold text-[0.8rem] hover:bg-[#1A1A1A] transition-colors disabled:opacity-50"
                                    >
                                        {s.replace(/_/g, ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
