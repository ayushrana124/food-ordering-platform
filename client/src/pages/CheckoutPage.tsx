import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    CreditCard, Banknote, ArrowRight, ShieldCheck, Tag,
    Lock, UtensilsCrossed, Loader2, Clock,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchRestaurant } from '@/redux/slices/menuSlice';
import { setCurrentOrder } from '@/redux/slices/orderSlice';
import { orderService } from '@/services/orderService';
import { paymentService } from '@/services/paymentService';
import type { RootState } from '@/redux/store';
import type { IAddress } from '@/types';
import { userService } from '@/services/userService';
import toast from 'react-hot-toast';

declare global { interface Window { Razorpay: new (opts: RazorpayOptions) => RazorpayInstance; } }
interface RazorpayOptions { key: string; amount: number; currency: string; name: string; description: string; order_id: string; handler: (r: RazorpayResponse) => void; modal?: { ondismiss?: () => void }; prefill?: Record<string, string>; theme?: { color: string }; }
interface RazorpayInstance { open(): void; }
interface RazorpayResponse { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; }

export default function CheckoutPage() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { items, subtotal, total, discount, itemCount, clear } = useCart();
    const { user } = useAuth();
    const { restaurant } = useAppSelector((s: RootState) => s.menu);
    const [addresses, setAddresses] = useState<IAddress[]>(user?.addresses ?? []);
    const [selectedAddr, setSelectedAddr] = useState<string>(addresses.find((a) => a.isDefault)?._id ?? addresses[0]?._id ?? '');
    const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
    const [loading, setLoading] = useState(false);
    const orderPlacedRef = useRef(false);

    const deliveryAddr = addresses.find((a) => a._id === selectedAddr);

    useEffect(() => {
        window.scrollTo(0, 0);
        if (items.length === 0 && !orderPlacedRef.current) { navigate('/cart', { replace: true }); return; }
        if (!restaurant) dispatch(fetchRestaurant());
        userService.getProfile().then((u) => {
            setAddresses(u.addresses);
            setSelectedAddr(u.addresses.find((a) => a.isDefault)?._id ?? u.addresses[0]?._id ?? '');
        }).catch(() => {});
        // Razorpay script loading disabled — only COD is enabled for now
    }, [dispatch, restaurant, items.length, navigate]);

    const handlePlaceOrder = async () => {
        if (!deliveryAddr) { toast.error('No delivery address found'); return; }
        if (items.length === 0) { toast.error('Your cart is empty'); return; }

        setLoading(true);
        try {
            const { order } = await orderService.createOrder({
                deliveryAddress: deliveryAddr,
                paymentMethod,
            });

            dispatch(setCurrentOrder(order));

            if (paymentMethod === 'COD') {
                orderPlacedRef.current = true;
                clear();
                toast.success('Order placed successfully!');
                navigate(`/order/${order._id}`);
                return;
            }

            const paymentOrder = await paymentService.createPaymentOrder(order._id);

            // Dummy payment bypass — backend returned a fake key, skip Razorpay SDK
            if (paymentOrder.key === 'dummy_key') {
                await paymentService.verifyPayment({
                    razorpay_order_id: paymentOrder.razorpayOrderId,
                    razorpay_payment_id: `dummy_pay_${Date.now()}`,
                    razorpay_signature: 'dummy_signature',
                    orderId: order._id,
                });
                orderPlacedRef.current = true;
                clear();
                toast.success('Payment successful! (Test Mode)');
                navigate(`/order/${order._id}`);
                return;
            }

            const rzp = new window.Razorpay({
                key: paymentOrder.key,
                amount: paymentOrder.amount,
                currency: paymentOrder.currency,
                name: 'Diamond Pizza',
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
                        orderPlacedRef.current = true;
                        clear();
                        toast.success('Payment successful!');
                        navigate(`/order/${order._id}`);
                    } catch {
                        toast.error('Payment verification failed. Contact support.');
                    }
                },
                modal: {
                    ondismiss: () => {
                        // User closed Razorpay without paying — redirect to tracking where they can retry
                        toast('Payment not completed. You can retry from the order page.', { icon: '⚠️' });
                        navigate(`/order/${order._id}`);
                    },
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

    /* ── Bottom bar (portal) ─────────────────────────────────────────── */
    const bottomBar = createPortal(
        <div
            style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 8000,
                background: '#0F0F0F', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 clamp(1rem, 4vw, 2rem)', height: 68,
                boxShadow: '0 -4px 30px rgba(0,0,0,0.25)',
                animation: 'slideUp 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)',
            }}
        >
            <div>
                <p style={{ fontSize: '0.68rem', opacity: 0.55, fontWeight: 500, lineHeight: 1, marginBottom: 3 }}>
                    {itemCount} item{itemCount !== 1 ? 's' : ''} • Cash on Delivery
                </p>
                <p style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif', lineHeight: 1.1 }}>
                    ₹{total}
                </p>
            </div>
            <button
                onClick={handlePlaceOrder}
                disabled={loading || !deliveryAddr}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: loading ? '#555' : '#E8A317',
                    border: 'none', borderRadius: 12,
                    color: 'white', fontWeight: 800, fontSize: '0.88rem',
                    padding: '0.6rem 1.3rem',
                    cursor: loading ? 'wait' : 'pointer',
                    boxShadow: '0 2px 16px rgba(232,163,23,0.35)',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.2s',
                }}
            >
                {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <>
                        Place Order
                        <ArrowRight size={16} />
                    </>
                )}
            </button>
        </div>,
        document.body,
    );

    return (
        <div style={{ minHeight: '100vh', background: '#F4F4F2', paddingBottom: 84 }} className="page-enter">
            <Navbar />

            <div style={{ maxWidth: 560, margin: '0 auto', padding: '1.25rem clamp(0.75rem, 3vw, 1.5rem)' }}>

                {/* ── Header ─────────────────────────────────────── */}
                <h1 style={{
                    fontFamily: 'Outfit, sans-serif', fontWeight: 900,
                    fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', color: '#0F0F0F',
                    marginBottom: '1.25rem', letterSpacing: '-0.02em',
                }}>
                    Checkout
                </h1>

                {/* ── Order Items Card ────────────────────────────── */}
                <div style={{
                    background: 'white', borderRadius: 18, overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '0.75rem',
                }}>
                    <div style={{
                        padding: '0.8rem 1.15rem', borderBottom: '1px solid #F0F0EE',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                        <span style={{
                            width: 26, height: 26, borderRadius: 7, background: '#FFFBF0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#E8A317', flexShrink: 0,
                        }}>
                            <UtensilsCrossed size={12} />
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0F0F0F', letterSpacing: '0.04em' }}>
                            ORDER SUMMARY
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#8E8E8E', fontWeight: 600 }}>
                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <div style={{ padding: '0.65rem 1.15rem' }}>
                        {items.map((item, idx) => (
                            <div key={item.cartItemId}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.55rem 0', gap: '0.5rem',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                                        <span style={{
                                            width: 11, height: 11, borderRadius: 2,
                                            border: `1.5px solid ${item.isVeg ? '#16A34A' : '#DC2626'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <span style={{
                                                width: 5, height: 5, borderRadius: '50%',
                                                background: item.isVeg ? '#16A34A' : '#DC2626',
                                            }} />
                                        </span>
                                        <span style={{
                                            fontSize: '0.82rem', fontWeight: 600, color: '#0F0F0F',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {item.name}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', color: '#8E8E8E', flexShrink: 0 }}>
                                            ×{item.quantity}
                                        </span>
                                    </div>
                                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F0F0F', flexShrink: 0 }}>
                                        ₹{item.itemTotal}
                                    </span>
                                </div>
                                {item.selectedCustomizations.length > 0 && (
                                    <p style={{ fontSize: '0.65rem', color: '#8E8E8E', marginTop: -4, marginBottom: 4, paddingLeft: 21 }}>
                                        {item.selectedCustomizations.map((c) => c.optionName).join(' • ')}
                                    </p>
                                )}
                                {idx < items.length - 1 && (
                                    <div style={{ borderTop: '1px dashed #EEEEEE' }} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Payment Method Card ─────────────────────────── */}
                <div style={{
                    background: 'white', borderRadius: 18, overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '0.75rem',
                }}>
                    <div style={{
                        padding: '0.8rem 1.15rem', borderBottom: '1px solid #F0F0EE',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                        <span style={{
                            width: 26, height: 26, borderRadius: 7, background: '#EFF6FF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#2563EB', flexShrink: 0,
                        }}>
                            <CreditCard size={12} />
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0F0F0F', letterSpacing: '0.04em' }}>
                            PAYMENT METHOD
                        </span>
                    </div>

                    <div style={{ padding: '0.75rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* COD — Active */}
                        <button
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.75rem 1rem', borderRadius: 14, width: '100%',
                                border: '2px solid #E8A317',
                                background: '#FFFBF0',
                                cursor: 'default', textAlign: 'left',
                                transition: 'all 0.15s',
                            }}
                        >
                            <span style={{
                                width: 18, height: 18, borderRadius: '50%',
                                border: '2px solid #E8A317',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E8A317' }} />
                            </span>
                            <span style={{
                                width: 36, height: 36, borderRadius: 10, background: '#F0FDF4',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#16A34A', flexShrink: 0,
                            }}>
                                <Banknote size={17} />
                            </span>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F0F0F' }}>Cash on Delivery</p>
                                <p style={{ fontSize: '0.7rem', color: '#8E8E8E', marginTop: 1 }}>Pay when delivered</p>
                            </div>
                        </button>

                        {/* ONLINE — Disabled / Coming Soon */}
                        <div
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.75rem 1rem', borderRadius: 14, width: '100%',
                                border: '2px solid #EEEEEE',
                                background: '#FAFAF8',
                                opacity: 0.45,
                                cursor: 'not-allowed', textAlign: 'left',
                                position: 'relative',
                            }}
                        >
                            <span style={{
                                width: 18, height: 18, borderRadius: '50%',
                                border: '2px solid #D4D4D0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }} />
                            <span style={{
                                width: 36, height: 36, borderRadius: 10, background: '#EFF6FF',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#2563EB', flexShrink: 0,
                            }}>
                                <CreditCard size={17} />
                            </span>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F0F0F' }}>Pay Online</p>
                                <p style={{ fontSize: '0.7rem', color: '#8E8E8E', marginTop: 1 }}>UPI, Cards, Net Banking</p>
                            </div>
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: 3,
                                padding: '3px 8px', borderRadius: 6,
                                background: '#FEF3C7', color: '#92400E',
                                fontSize: '0.62rem', fontWeight: 700,
                                letterSpacing: '0.02em',
                                flexShrink: 0,
                            }}>
                                <Clock size={10} /> COMING SOON
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Bill Details Card ───────────────────────────── */}
                <div style={{
                    background: 'white', borderRadius: 18, overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '0.75rem',
                }}>
                    <div style={{
                        padding: '0.8rem 1.15rem', borderBottom: '1px dashed #D4D4D0',
                        fontWeight: 800, fontSize: '0.78rem', color: '#0F0F0F', letterSpacing: '0.04em',
                    }}>
                        BILL DETAILS
                    </div>

                    <div style={{ padding: '0.75rem 1.15rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.82rem', color: '#4A4A4A' }}>Item Total</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F0F0F' }}>₹{subtotal}</span>
                        </div>

                        {discount && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.82rem', color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Tag size={11} /> Discount ({discount.code})
                                </span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16A34A' }}>−₹{discount.appliedDiscount}</span>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                            <span style={{ fontSize: '0.82rem', color: '#4A4A4A' }}>Delivery Fee</span>
                            <span style={{ fontSize: '0.78rem', color: '#8E8E8E' }}>Based on distance</span>
                        </div>

                        <div style={{ borderTop: '1.5px dashed #E0E0DC', margin: '0.4rem 0 0.6rem' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F0F0F' }}>Total</span>
                            <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0F0F0F', fontFamily: 'Outfit, sans-serif' }}>
                                ₹{total}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Secure badge ────────────────────────────────── */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.4rem', padding: '0.75rem 0', opacity: 0.45,
                }}>
                    <Lock size={11} />
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#4A4A4A', letterSpacing: '0.03em' }}>
                        <ShieldCheck size={11} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />
                        Payments are 100% secure & encrypted
                    </span>
                </div>
            </div>

            {bottomBar}
        </div>
    );
}
