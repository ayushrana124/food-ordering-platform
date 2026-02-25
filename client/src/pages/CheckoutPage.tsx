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
        // Load Razorpay script
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

            // Online payment
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
                theme: { color: '#E63946' },
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
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }} className="page-enter">
            <Navbar />
            <div className="container" style={{ padding: '2rem 1rem 4rem' }}>
                <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '1.75rem' }}>
                    Checkout
                </h1>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <style>{`@media(min-width:900px){ .checkout-grid { grid-template-columns: 1fr 380px !important; } }`}</style>
                    <div className="checkout-grid" style={{ display: 'grid', gap: '1.5rem' }}>

                        {/* Left: Address + Payment */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Addresses */}
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '1rem' }}>📍 Delivery Address</h3>
                                {addresses.length === 0 ? (
                                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                        No addresses saved yet. Please add one from your Profile.
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {addresses.map((addr) => (
                                            <label key={addr._id} style={{
                                                display: 'flex', gap: '0.875rem',
                                                padding: '0.875rem 1rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: `2px solid ${selectedAddr === addr._id ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
                                                background: selectedAddr === addr._id ? 'var(--color-accent-light)' : 'white',
                                                cursor: 'pointer', transition: 'all 0.15s',
                                            }}>
                                                <input type="radio" name="addr" value={addr._id} checked={selectedAddr === addr._id} onChange={() => setSelectedAddr(addr._id)} style={{ accentColor: 'var(--color-accent)', marginTop: 2 }} />
                                                <div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.2rem' }}>
                                                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{addr.label}</span>
                                                        {addr.isDefault && <span style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>Default</span>}
                                                    </div>
                                                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{addr.addressLine}</p>
                                                    {addr.landmark && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Near {addr.landmark}</p>}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Payment Method */}
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '1rem' }}>💳 Payment Method</h3>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    {(['ONLINE', 'COD'] as const).map((m) => (
                                        <label key={m} style={{
                                            flex: 1, display: 'flex', alignItems: 'center', gap: '0.625rem',
                                            padding: '0.875rem 1rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: `2px solid ${paymentMethod === m ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
                                            background: paymentMethod === m ? 'var(--color-accent-light)' : 'white',
                                            cursor: 'pointer', transition: 'all 0.15s',
                                        }}>
                                            <input type="radio" name="payment" value={m} checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} style={{ accentColor: 'var(--color-accent)' }} />
                                            <div>
                                                <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{m === 'ONLINE' ? '💳 Online' : '💵 Cash on Delivery'}</p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{m === 'ONLINE' ? 'UPI, Cards, Net Banking' : 'Pay when delivered'}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Special instructions */}
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '0.875rem' }}>📝 Special Instructions</h3>
                                <textarea
                                    className="input"
                                    rows={3}
                                    placeholder="Extra cheese, no onions, ring the bell..."
                                    value={specialInstructions}
                                    onChange={(e) => setSpecialInstructions(e.target.value)}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                        </div>

                        {/* Right: Summary */}
                        <div className="card" style={{ padding: '1.5rem', height: 'fit-content', position: 'sticky', top: 80 }}>
                            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '1rem' }}>Order Summary</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                {items.map((i: ICartItem) => (
                                    <div key={i.cartId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                        <span>{i.name} × {i.quantity}</span>
                                        <span style={{ fontWeight: 600 }}>₹{(i.price + i.selectedCustomizations.reduce((s: number, c: IMenuItemCustomization) => s + c.price, 0)) * i.quantity}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="divider" />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', margin: '0.75rem 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Delivery</span>
                                    <span style={{ fontWeight: 600, color: DELIVERY === 0 ? 'var(--color-success)' : '' }}>{DELIVERY === 0 ? 'FREE' : `₹${DELIVERY}`}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Taxes</span>
                                    <span style={{ fontWeight: 600 }}>₹{TAX}</span>
                                </div>
                            </div>
                            <div className="divider" />
                            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.75rem 0 1.5rem' }}>
                                <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.1rem' }}>Total</span>
                                <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-accent)' }}>₹{TOTAL}</span>
                            </div>

                            <button
                                className="btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '1rem' }}
                                onClick={handlePlaceOrder}
                                disabled={loading || addresses.length === 0}
                            >
                                {loading ? <LoadingSpinner size="sm" color="white" /> : paymentMethod === 'ONLINE' ? '💳 Pay ₹' + TOTAL : '🍕 Place Order'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
