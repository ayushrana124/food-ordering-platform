import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Banknote, FileText, Pizza, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchRestaurant } from '@/redux/slices/menuSlice';
import { setCurrentOrder } from '@/redux/slices/orderSlice';
import { orderService } from '@/services/orderService';
import { paymentService } from '@/services/paymentService';
import type { RootState } from '@/redux/store';
import type { ICartItem, IMenuItemCustomization, IAddress } from '@/types';
import { userService } from '@/services/userService';
import toast from 'react-hot-toast';

declare global { interface Window { Razorpay: new (opts: RazorpayOptions) => RazorpayInstance; } }
interface RazorpayOptions { key: string; amount: number; currency: string; name: string; description: string; order_id: string; handler: (r: RazorpayResponse) => void; prefill?: Record<string, string>; theme?: { color: string }; }
interface RazorpayInstance { open(): void; }
interface RazorpayResponse { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; }

export default function CheckoutPage() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { items, subtotal, clear } = useCart();
    const { user } = useAuth();
    const { restaurant } = useAppSelector((s: RootState) => s.menu);
    const [addresses, setAddresses] = useState<IAddress[]>(user?.addresses ?? []);
    const [selectedAddr, setSelectedAddr] = useState<string>(addresses.find((a) => a.isDefault)?._id ?? addresses[0]?._id ?? '');
    const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('ONLINE');
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [loading, setLoading] = useState(false);

    const DELIVERY = subtotal >= 499 ? 0 : subtotal >= 299 ? 40 : 60;
    const TAX = Math.round(subtotal * 0.05);
    const TOTAL = subtotal + DELIVERY + TAX;

    useEffect(() => {
        if (!restaurant) dispatch(fetchRestaurant());
        userService.getProfile().then((u) => {
            setAddresses(u.addresses);
            setSelectedAddr(u.addresses.find((a) => a.isDefault)?._id ?? u.addresses[0]?._id ?? '');
        }).catch(() => { });
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => { document.body.removeChild(script); };
    }, [dispatch, restaurant]);

    const handlePlaceOrder = async () => {
        if (!selectedAddr) { toast.error('Please select a delivery address'); return; }
        if (items.length === 0) { toast.error('Your cart is empty'); return; }

        const deliveryAddr = addresses.find((a) => a._id === selectedAddr);
        if (!deliveryAddr) return;

        setLoading(true);
        try {
            const { order } = await orderService.createOrder({
                items: items.map((i: ICartItem) => ({ menuItemId: i.menuItemId, quantity: i.quantity, customizations: i.selectedCustomizations })),
                deliveryAddress: deliveryAddr,
                paymentMethod,
                specialInstructions,
            });

            dispatch(setCurrentOrder(order));

            if (paymentMethod === 'COD') {
                clear();
                toast.success('Order placed! We\'re cooking your pizza.');
                navigate(`/order/${order._id}`);
                return;
            }

            const paymentOrder = await paymentService.createPaymentOrder(order._id);

            const rzp = new window.Razorpay({
                key: paymentOrder.keyId,
                amount: paymentOrder.amount,
                currency: paymentOrder.currency,
                name: 'Bunty Pizza',
                description: `Order #${order.orderId}`,
                order_id: paymentOrder.razorpayOrderId,
                handler: async (response: RazorpayResponse) => {
                    try {
                        await paymentService.verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            orderId: order._id,
                        });
                        clear();
                        toast.success('Payment successful!');
                        navigate(`/order/${order._id}`);
                    } catch {
                        toast.error('Payment verification failed. Contact support.');
                    }
                },
                prefill: { name: user?.name ?? '', contact: user?.phone ?? '' },
                theme: { color: '#E8A317' },
            });
            rzp.open();
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : 'Failed to place order';
            toast.error(msg ?? 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white page-enter">
            <Navbar />
            <div className="container py-8 px-4 pb-16">
                <h1 className="font-outfit font-extrabold text-[clamp(1.6rem,4vw,2.2rem)] mb-8 tracking-[-0.02em]">
                    Checkout
                </h1>

                {/* 2-col on md+ */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-7">

                    {/* Left: Address + Payment */}
                    <div className="flex flex-col gap-6">

                        {/* Delivery Address */}
                        <div className="card p-7">
                            <h3 className="font-outfit font-bold mb-5 flex items-center gap-2.5">
                                <span className="w-9 h-9 rounded-xl bg-[#FFFBF0] flex items-center justify-center text-[#E8A317]">
                                    <MapPin size={18} />
                                </span>
                                Delivery Address
                            </h3>
                            {addresses.length === 0 ? (
                                <p className="text-[#4A4A4A] text-[0.9rem]">
                                    No addresses saved yet. Please add one from your Profile.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {addresses.map((addr) => (
                                        <label
                                            key={addr._id}
                                            className="flex gap-4 px-5 py-4 rounded-xl cursor-pointer transition-all duration-200"
                                            style={{
                                                border: `2px solid ${selectedAddr === addr._id ? '#E8A317' : '#E0E0DC'}`,
                                                background: selectedAddr === addr._id ? '#FFFBF0' : 'white',
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="addr"
                                                value={addr._id}
                                                checked={selectedAddr === addr._id}
                                                onChange={() => setSelectedAddr(addr._id)}
                                                className="accent-[#E8A317] mt-[2px]"
                                            />
                                            <div>
                                                <div className="flex gap-2 items-center mb-[0.2rem]">
                                                    <span className="font-bold text-[0.875rem]">{addr.label}</span>
                                                    {addr.isDefault && (
                                                        <span className="bg-[#DCFCE7] text-[#16A34A] text-[0.7rem] font-semibold px-2 py-[0.15rem] rounded-md">
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[0.875rem] text-[#4A4A4A]">{addr.addressLine}</p>
                                                {addr.landmark && <p className="text-[0.8rem] text-[#8E8E8E]">Near {addr.landmark}</p>}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Payment Method */}
                        <div className="card p-7">
                            <h3 className="font-outfit font-bold mb-5 flex items-center gap-2.5">
                                <span className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                                    <CreditCard size={18} />
                                </span>
                                Payment Method
                            </h3>
                            <div className="flex gap-3">
                                {(['ONLINE', 'COD'] as const).map((m) => (
                                    <label
                                        key={m}
                                        className="flex-1 flex items-center gap-3 px-5 py-4 rounded-xl cursor-pointer transition-all duration-200"
                                        style={{
                                            border: `2px solid ${paymentMethod === m ? '#E8A317' : '#E0E0DC'}`,
                                            background: paymentMethod === m ? '#FFFBF0' : 'white',
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="payment"
                                            value={m}
                                            checked={paymentMethod === m}
                                            onChange={() => setPaymentMethod(m)}
                                            className="accent-[#E8A317]"
                                        />
                                        <div>
                                            <p className="font-outfit font-bold text-[0.9rem] flex items-center gap-2">
                                                {m === 'ONLINE' ? <CreditCard size={16} className="text-[#2563EB]" /> : <Banknote size={16} className="text-[#16A34A]" />}
                                                {m === 'ONLINE' ? 'Online' : 'Cash on Delivery'}
                                            </p>
                                            <p className="text-[0.75rem] text-[#8E8E8E]">{m === 'ONLINE' ? 'UPI, Cards, Net Banking' : 'Pay when delivered'}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Special Instructions */}
                        <div className="card p-7">
                            <h3 className="font-outfit font-bold mb-4 flex items-center gap-2.5">
                                <span className="w-9 h-9 rounded-xl bg-[#F5F3FF] flex items-center justify-center text-[#7C3AED]">
                                    <FileText size={18} />
                                </span>
                                Special Instructions
                            </h3>
                            <textarea
                                className="input resize-y"
                                rows={3}
                                placeholder="Extra cheese, no onions, ring the bell..."
                                value={specialInstructions}
                                onChange={(e) => setSpecialInstructions(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Right: Summary */}
                    <div className="card p-7 h-fit sticky top-20">
                        <h3 className="font-outfit font-bold mb-5">Order Summary</h3>
                        <div className="flex flex-col gap-2.5 mb-4">
                            {items.map((i: ICartItem) => (
                                <div key={i.cartId} className="flex justify-between text-[0.875rem] text-[#4A4A4A]">
                                    <span>{i.name} × {i.quantity}</span>
                                    <span className="font-semibold">₹{(i.price + i.selectedCustomizations.reduce((s: number, c: IMenuItemCustomization) => s + c.price, 0)) * i.quantity}</span>
                                </div>
                            ))}
                        </div>
                        <div className="divider" />
                        <div className="flex flex-col gap-[0.6rem] my-3">
                            <div className="flex justify-between text-[0.875rem]">
                                <span className="text-[#4A4A4A]">Delivery</span>
                                <span className={`font-semibold ${DELIVERY === 0 ? 'text-[#16A34A]' : ''}`}>
                                    {DELIVERY === 0 ? 'FREE' : `₹${DELIVERY}`}
                                </span>
                            </div>
                            <div className="flex justify-between text-[0.875rem]">
                                <span className="text-[#4A4A4A]">Taxes</span>
                                <span className="font-semibold">₹{TAX}</span>
                            </div>
                        </div>
                        <div className="divider" />
                        <div className="flex justify-between mt-3 mb-6">
                            <span className="font-outfit font-extrabold text-[1.15rem]">Total</span>
                            <span className="font-outfit font-extrabold text-[1.15rem] text-[#E8A317]">₹{TOTAL}</span>
                        </div>

                        <button
                            className="btn-primary w-full justify-center py-[0.9rem] text-base flex items-center gap-2"
                            onClick={handlePlaceOrder}
                            disabled={loading || addresses.length === 0}
                        >
                            {loading ? (
                                <LoadingSpinner size="sm" color="white" />
                            ) : (
                                <>
                                    <ShieldCheck size={18} />
                                    {paymentMethod === 'ONLINE' ? 'Pay ₹' + TOTAL : 'Place Order'}
                                    <ArrowRight size={18} className="ml-1" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
