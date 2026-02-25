import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
                toast.success('Order placed! 🍕 We\'re cooking your pizza.');
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
                        toast.success('Payment successful! 🍕');
                        navigate(`/order/${order._id}`);
                    } catch {
                        toast.error('Payment verification failed. Contact support.');
                    }
                },
                prefill: { name: user?.name ?? '', contact: user?.phone ?? '' },
                theme: { color: '#D4920A' },
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
        <div className="min-h-screen bg-[#FAFAF8] page-enter">
            <Navbar />
            <div className="container py-8 px-4 pb-16">
                <h1 className="font-outfit font-extrabold text-[clamp(1.5rem,4vw,2rem)] mb-7">
                    Checkout
                </h1>

                {/* 2-col on md+ */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-6">

                    {/* Left: Address + Payment */}
                    <div className="flex flex-col gap-5">

                        {/* Delivery Address */}
                        <div className="card p-6">
                            <h3 className="font-outfit font-bold mb-4">📍 Delivery Address</h3>
                            {addresses.length === 0 ? (
                                <p className="text-[#555] text-[0.9rem]">
                                    No addresses saved yet. Please add one from your Profile.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {addresses.map((addr) => (
                                        <label
                                            key={addr._id}
                                            className="flex gap-[0.875rem] px-4 py-[0.875rem] rounded-[10px] cursor-pointer transition-all duration-150"
                                            style={{
                                                border: `2px solid ${selectedAddr === addr._id ? '#D4920A' : '#D0CFC9'}`,
                                                background: selectedAddr === addr._id ? '#FFF6DC' : 'white',
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="addr"
                                                value={addr._id}
                                                checked={selectedAddr === addr._id}
                                                onChange={() => setSelectedAddr(addr._id)}
                                                className="accent-[#D4920A] mt-[2px]"
                                            />
                                            <div>
                                                <div className="flex gap-2 items-center mb-[0.2rem]">
                                                    <span className="font-bold text-[0.875rem]">{addr.label}</span>
                                                    {addr.isDefault && (
                                                        <span className="bg-[#DCFCE7] text-[#15803D] text-[0.7rem] font-semibold px-[0.4rem] py-[0.1rem] rounded-[6px]">
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[0.875rem] text-[#555]">{addr.addressLine}</p>
                                                {addr.landmark && <p className="text-[0.8rem] text-[#9B9B9B]">Near {addr.landmark}</p>}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Payment Method */}
                        <div className="card p-6">
                            <h3 className="font-outfit font-bold mb-4">💳 Payment Method</h3>
                            <div className="flex gap-3">
                                {(['ONLINE', 'COD'] as const).map((m) => (
                                    <label
                                        key={m}
                                        className="flex-1 flex items-center gap-[0.625rem] px-4 py-[0.875rem] rounded-[10px] cursor-pointer transition-all duration-150"
                                        style={{
                                            border: `2px solid ${paymentMethod === m ? '#D4920A' : '#D0CFC9'}`,
                                            background: paymentMethod === m ? '#FFF6DC' : 'white',
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="payment"
                                            value={m}
                                            checked={paymentMethod === m}
                                            onChange={() => setPaymentMethod(m)}
                                            className="accent-[#D4920A]"
                                        />
                                        <div>
                                            <p className="font-bold text-[0.9rem]">{m === 'ONLINE' ? '💳 Online' : '💵 Cash on Delivery'}</p>
                                            <p className="text-[0.75rem] text-[#9B9B9B]">{m === 'ONLINE' ? 'UPI, Cards, Net Banking' : 'Pay when delivered'}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Special Instructions */}
                        <div className="card p-6">
                            <h3 className="font-outfit font-bold mb-[0.875rem]">📝 Special Instructions</h3>
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
                    <div className="card p-6 h-fit sticky top-20">
                        <h3 className="font-outfit font-bold mb-4">Order Summary</h3>
                        <div className="flex flex-col gap-2 mb-4">
                            {items.map((i: ICartItem) => (
                                <div key={i.cartId} className="flex justify-between text-[0.875rem] text-[#555]">
                                    <span>{i.name} × {i.quantity}</span>
                                    <span className="font-semibold">₹{(i.price + i.selectedCustomizations.reduce((s: number, c: IMenuItemCustomization) => s + c.price, 0)) * i.quantity}</span>
                                </div>
                            ))}
                        </div>
                        <div className="divider" />
                        <div className="flex flex-col gap-[0.6rem] my-3">
                            <div className="flex justify-between text-[0.875rem]">
                                <span className="text-[#555]">Delivery</span>
                                <span className={`font-semibold ${DELIVERY === 0 ? 'text-[#15803D]' : ''}`}>
                                    {DELIVERY === 0 ? 'FREE' : `₹${DELIVERY}`}
                                </span>
                            </div>
                            <div className="flex justify-between text-[0.875rem]">
                                <span className="text-[#555]">Taxes</span>
                                <span className="font-semibold">₹{TAX}</span>
                            </div>
                        </div>
                        <div className="divider" />
                        <div className="flex justify-between mt-3 mb-6">
                            <span className="font-outfit font-extrabold text-[1.1rem]">Total</span>
                            <span className="font-outfit font-extrabold text-[1.1rem] text-[#D4920A]">₹{TOTAL}</span>
                        </div>

                        <button
                            className="btn-primary w-full justify-center py-[0.875rem] text-base"
                            onClick={handlePlaceOrder}
                            disabled={loading || addresses.length === 0}
                        >
                            {loading ? <LoadingSpinner size="sm" color="white" /> : paymentMethod === 'ONLINE' ? '💳 Pay ₹' + TOTAL : '🍕 Place Order'}
                        </button>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
