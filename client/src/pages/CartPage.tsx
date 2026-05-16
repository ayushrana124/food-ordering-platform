import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingBag, Pizza, MapPin, Plus, UtensilsCrossed,
    ChevronRight, Tag, X, Percent, ChevronDown, Lock, IndianRupee
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { cartService, type AvailableCoupon } from '@/services/cartService';
import { userService } from '@/services/userService';
import AddressBottomSheet from '@/components/cart/AddressBottomSheet';
import type { IAddress } from '@/types';
import toast from 'react-hot-toast';

export default function CartPage() {
    const navigate = useNavigate();
    const {
        items, subtotal, total, itemCount, discount, appliedCoupon,
        loading, fetch, setQuantity, removeItem,
        applyCoupon: applyCode, removeCoupon,
    } = useCart();
    const { user } = useAuth();
    const [couponLoading, setCouponLoading] = useState(false);
    const [showCoupons, setShowCoupons] = useState(false);
    const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
    const [couponsLoading, setCouponsLoading] = useState(false);
    const [showAddressSheet, setShowAddressSheet] = useState(false);
    const [addresses, setAddresses] = useState<IAddress[]>(user?.addresses ?? []);
    const [selectedAddrId, setSelectedAddrId] = useState(() => {
        const def = user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0];
        return def?._id ?? '';
    });

    const selectedAddress = addresses.find((a) => a._id === selectedAddrId);

    // Refresh addresses on mount
    useEffect(() => {
        if (user) {
            userService.getProfile().then((u) => {
                setAddresses(u.addresses);
                if (!selectedAddrId && u.addresses.length > 0) {
                    const def = u.addresses.find((a) => a.isDefault) ?? u.addresses[0];
                    setSelectedAddrId(def._id);
                }
            }).catch(() => {});
        }
    }, [user]);

    useEffect(() => { fetch(); }, []);

    const loadCoupons = async () => {
        if (showCoupons) { setShowCoupons(false); return; }
        setCouponsLoading(true);
        try {
            const { coupons } = await cartService.getAvailableCoupons();
            setAvailableCoupons(coupons);
            setShowCoupons(true);
        } catch {
            toast.error('Failed to load coupons');
        } finally {
            setCouponsLoading(false);
        }
    };

    const handleApplyCoupon = async (code: string) => {
        setCouponLoading(true);
        try {
            const result = await applyCode(code);
            if ((result as any).meta?.requestStatus === 'rejected') {
                toast.error((result as any).payload || 'Invalid coupon');
            } else {
                toast.success('Coupon applied!');
                setShowCoupons(false);
            }
        } catch {
            toast.error('Failed to apply coupon');
        } finally {
            setCouponLoading(false);
        }
    };

    const handleRemoveCoupon = async () => {
        await removeCoupon();
        toast.success('Coupon removed');
    };

    /* ── Loading ───────────────────────────────────────────────────────── */
    if (loading && items.length === 0) {
        return (
            <div className="min-h-screen bg-[#F7F7F5]">
                <Navbar />
                <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            </div>
        );
    }

    /* ── Empty state ───────────────────────────────────────────────────── */
    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-[#F7F7F5]">
                <Navbar />
                <div className="py-16">
                    <EmptyState
                        icon={ShoppingBag}
                        title="Your cart is empty"
                        description="Add some delicious items from our menu!"
                        action={
                            <button
                                className="btn-primary text-base px-8 py-3 flex items-center gap-2"
                                onClick={() => navigate('/menu')}
                            >
                                Browse Menu <Pizza size={18} />
                            </button>
                        }
                    />
                </div>
                <Footer />
            </div>
        );
    }

    /* ── Main cart ─────────────────────────────────────────────────────── */
    return (
        <div className="min-h-screen bg-[#F4F4F2] page-enter" style={{ paddingBottom: 80 }}>
            <Navbar />

            <div className="container py-5" style={{ maxWidth: 680 }}>

                {/* ── ITEMS CARD ─────────────────────────────────────── */}
                <div style={{
                    background: 'white', borderRadius: 18, overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1rem',
                }}>
                    <div style={{
                        padding: '0.9rem 1.25rem 0.75rem', borderBottom: '1px solid #F0F0EE',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                        <span style={{
                            width: 28, height: 28, borderRadius: 8, background: '#FFFBF0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#E8A317', flexShrink: 0,
                        }}>
                            <UtensilsCrossed size={14} />
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F0F0F' }}>ITEMS ADDED</span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#8E8E8E', fontWeight: 600 }}>
                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {items.map((item, idx) => (
                        <div key={item.cartItemId}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.85rem 1.25rem',
                                opacity: item.isAvailable ? 1 : 0.5,
                            }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                        <span style={{
                                            width: 12, height: 12, borderRadius: 2,
                                            border: `2px solid ${item.isVeg ? '#16A34A' : '#DC2626'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, marginTop: 3,
                                        }}>
                                            <span style={{
                                                width: 6, height: 6, borderRadius: '50%',
                                                background: item.isVeg ? '#16A34A' : '#DC2626',
                                            }} />
                                        </span>
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F0F0F', lineHeight: 1.3 }}>
                                                {item.name}
                                            </p>
                                            {item.selectedCustomizations.length > 0 && (
                                                <p style={{ fontSize: '0.7rem', color: '#8E8E8E', marginTop: 2 }}>
                                                    {item.selectedCustomizations.map((c) => c.optionName).join(' • ')}
                                                </p>
                                            )}
                                            {!item.isAvailable && (
                                                <span style={{
                                                    display: 'inline-block', marginTop: 4,
                                                    fontSize: '0.65rem', fontWeight: 700,
                                                    color: '#DC2626', background: '#FEF2F2',
                                                    padding: '1px 8px', borderRadius: 4,
                                                }}>Unavailable</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Qty stepper */}
                                {item.isAvailable ? (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        border: '1.5px solid #E8A317', borderRadius: 8,
                                        padding: '2px 6px', background: '#FFFBF0',
                                    }}>
                                        <button
                                            onClick={() => setQuantity(item.cartItemId, item.quantity - 1)}
                                            style={{
                                                width: 22, height: 22, border: 'none', background: 'none',
                                                cursor: 'pointer', color: '#E8A317', fontWeight: 800,
                                                fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >−</button>
                                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F0F0F', minWidth: 16, textAlign: 'center' }}>
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => setQuantity(item.cartItemId, item.quantity + 1)}
                                            style={{
                                                width: 22, height: 22, border: 'none', background: 'none',
                                                cursor: 'pointer', color: '#E8A317', fontWeight: 800,
                                                fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >+</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => removeItem(item.cartItemId)}
                                        style={{
                                            fontSize: '0.72rem', fontWeight: 700, color: '#DC2626',
                                            background: 'none', border: 'none', cursor: 'pointer',
                                        }}
                                    >Remove</button>
                                )}

                                <span style={{
                                    fontWeight: 800, fontSize: '0.9rem', color: '#0F0F0F',
                                    minWidth: 52, textAlign: 'right', flexShrink: 0,
                                }}>
                                    ₹{item.itemTotal}
                                </span>
                            </div>

                            {idx < items.length - 1 && (
                                <div style={{ margin: '0 1.25rem', borderTop: '1.5px dashed #E8E8E6' }} />
                            )}
                        </div>
                    ))}

                    {/* Footer actions */}
                    <div style={{
                        borderTop: '1px solid #F0F0EE', display: 'flex', alignItems: 'center',
                        padding: '0.55rem 1.25rem',
                    }}>
                        <button
                            onClick={() => navigate('/menu')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                                border: '1px solid #E0E0DC', borderRadius: 6, background: 'white',
                                color: '#8E8E8E', fontSize: '0.68rem', fontWeight: 600,
                                padding: '0.3rem 0.6rem', cursor: 'pointer', transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E8A317'; e.currentTarget.style.color = '#E8A317'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E0E0DC'; e.currentTarget.style.color = '#8E8E8E'; }}
                        >
                            <Plus size={10} /> Add more
                        </button>
                    </div>
                </div>

                {/* ── COUPON CARD ────────────────────────────────────── */}
                <div style={{
                    background: 'white', borderRadius: 18, overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1rem',
                }}>
                    {/* Applied coupon */}
                    {appliedCoupon && discount ? (
                        <div style={{ padding: '0.85rem 1.25rem' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 12,
                                padding: '0.7rem 1rem',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <Percent size={16} style={{ color: '#16A34A' }} />
                                    <div>
                                        <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#16A34A' }}>
                                            {appliedCoupon}
                                        </p>
                                        <p style={{ fontSize: '0.72rem', color: '#4A4A4A' }}>
                                            {discount.title} — You save ₹{discount.appliedDiscount}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRemoveCoupon}
                                    style={{
                                        width: 28, height: 28, borderRadius: 8, border: '1px solid #86EFAC',
                                        background: 'white', cursor: 'pointer', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', color: '#DC2626', flexShrink: 0,
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Coupon selector toggle */}
                            <button
                                onClick={loadCoupons}
                                disabled={couponsLoading}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center',
                                    padding: '0.85rem 1.25rem', border: 'none', background: 'white',
                                    cursor: 'pointer', gap: '0.5rem',
                                }}
                            >
                                <span style={{
                                    width: 28, height: 28, borderRadius: 8, background: '#F0FDF4',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#16A34A', flexShrink: 0,
                                }}>
                                    <Tag size={14} />
                                </span>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F0F0F', flex: 1, textAlign: 'left' }}>
                                    Apply Coupon
                                </span>
                                {couponsLoading ? (
                                    <LoadingSpinner size="sm" />
                                ) : (
                                    <ChevronDown
                                        size={16}
                                        style={{
                                            color: '#8E8E8E', flexShrink: 0,
                                            transform: showCoupons ? 'rotate(180deg)' : 'rotate(0)',
                                            transition: 'transform 0.2s',
                                        }}
                                    />
                                )}
                            </button>

                            {/* Coupons dropdown */}
                            {showCoupons && (
                                <div style={{ borderTop: '1px solid #F0F0EE' }}>
                                    {availableCoupons.length === 0 ? (
                                        <p style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#8E8E8E', textAlign: 'center' }}>
                                            No coupons available right now.
                                        </p>
                                    ) : (
                                        availableCoupons.map((coupon) => {
                                            const isFlat = coupon.discountType === 'FLAT';
                                            return (
                                                <div
                                                    key={coupon.code}
                                                    style={{
                                                        display: 'flex', alignItems: 'center',
                                                        padding: '1rem 1.25rem', gap: '1rem',
                                                        borderBottom: '1px solid #F7F7F5',
                                                        backgroundColor: coupon.eligible ? '#FFFFFF' : '#FAFAF8',
                                                        opacity: coupon.eligible ? 1 : 0.65,
                                                    }}
                                                >
                                                    {/* Coupon Icon/Badge */}
                                                    <div style={{
                                                        width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                                                        background: coupon.eligible ? (isFlat ? '#FFFBF0' : '#EFF6FF') : '#F5F5F3',
                                                        border: `1px solid ${coupon.eligible ? (isFlat ? '#FDE68A' : '#BFDBFE') : '#E5E5E5'}`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: coupon.eligible ? (isFlat ? '#D97706' : '#2563EB') : '#8E8E8E'
                                                    }}>
                                                        {isFlat ? <IndianRupee size={18} /> : <Percent size={18} />}
                                                    </div>

                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '4px' }}>
                                                            <span style={{
                                                                fontWeight: 800, fontSize: '0.78rem', 
                                                                color: coupon.eligible ? (isFlat ? '#D97706' : '#2563EB') : '#8E8E8E',
                                                                letterSpacing: '0.05em', background: coupon.eligible ? 'transparent' : '#F5F5F3',
                                                                padding: '1px 6px', borderRadius: '6px',
                                                                border: `1px dashed ${coupon.eligible ? (isFlat ? '#D97706' : '#2563EB') : '#D4D4D0'}`,
                                                                display: 'inline-block'
                                                            }}>
                                                                {coupon.code}
                                                            </span>
                                                        </div>
                                                        <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F0F0F', lineHeight: 1.3, marginBottom: '2px' }}>
                                                            {coupon.title}
                                                        </p>
                                                        {coupon.description && (
                                                            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>
                                                                {coupon.description}
                                                            </p>
                                                        )}
                                                        {coupon.eligible ? (
                                                            <p style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 700, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Tag size={12} /> You save ₹{coupon.savings}
                                                            </p>
                                                        ) : (
                                                            <p style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Lock size={10} /> {coupon.reason}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleApplyCoupon(coupon.code)}
                                                        disabled={!coupon.eligible || couponLoading}
                                                        style={{
                                                            padding: '0.5rem 1rem', borderRadius: '10px',
                                                            border: coupon.eligible ? '1.5px solid #16A34A' : '1px solid #D4D4D0',
                                                            background: coupon.eligible ? '#F0FDF4' : '#F7F7F5',
                                                            color: coupon.eligible ? '#16A34A' : '#8E8E8E',
                                                            fontWeight: 800, fontSize: '0.75rem',
                                                            cursor: coupon.eligible ? 'pointer' : 'not-allowed',
                                                            flexShrink: 0, transition: 'all 0.2s',
                                                            boxShadow: coupon.eligible ? '0 2px 8px rgba(22, 163, 74, 0.1)' : 'none'
                                                        }}
                                                    >
                                                        {coupon.eligible ? 'APPLY' : 'LOCKED'}
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── DELIVERY ADDRESS CARD ──────────────────────────── */}
                <div style={{
                    background: 'white', borderRadius: 18, overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1rem',
                }}>
                    <div style={{
                        padding: '0.9rem 1.25rem 0.75rem', borderBottom: '1px solid #F0F0EE',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                        <span style={{
                            width: 28, height: 28, borderRadius: 8, background: '#EFF6FF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#2563EB', flexShrink: 0,
                        }}>
                            <MapPin size={14} />
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F0F0F' }}>DELIVERY DETAILS</span>
                    </div>

                    <div style={{ padding: '1rem 1.25rem' }}>
                        {selectedAddress ? (
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F0F0F', marginBottom: 3 }}>
                                        {selectedAddress.label}
                                        {selectedAddress.isDefault && (
                                            <span style={{
                                                marginLeft: 6, fontSize: '0.65rem', background: '#DCFCE7',
                                                color: '#16A34A', fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                                            }}>DEFAULT</span>
                                        )}
                                    </p>
                                    <p style={{ fontSize: '0.8rem', color: '#4A4A4A', lineHeight: 1.5 }}>
                                        {selectedAddress.addressLine}
                                    </p>
                                    {selectedAddress.landmark && (
                                        <p style={{ fontSize: '0.75rem', color: '#8E8E8E', marginTop: 2 }}>
                                            Near {selectedAddress.landmark}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowAddressSheet(true)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.75rem',
                                        color: '#2563EB', fontWeight: 700, background: 'none',
                                        border: 'none', cursor: 'pointer', flexShrink: 0,
                                    }}
                                >
                                    Change <ChevronRight size={13} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAddressSheet(true)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.7rem 0.75rem', border: '2px dashed #D4D4D0', borderRadius: 12,
                                    background: '#FAFAF8', cursor: 'pointer', color: '#4A4A4A',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <Plus size={16} color="#E8A317" />
                                    <div style={{ textAlign: 'left' }}>
                                        <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F0F0F' }}>Add delivery address</p>
                                        <p style={{ fontSize: '0.72rem', color: '#8E8E8E', marginTop: 1 }}>Required to place your order</p>
                                    </div>
                                </div>
                                <ChevronRight size={16} color="#8E8E8E" />
                            </button>
                        )}
                    </div>
                </div>

                {showAddressSheet && (
                    <AddressBottomSheet
                        addresses={addresses}
                        selectedId={selectedAddrId}
                        onSelect={setSelectedAddrId}
                        onAddressesUpdate={setAddresses}
                        onClose={() => setShowAddressSheet(false)}
                    />
                )}

                {/* ── BILL DETAILS CARD ──────────────────────────────── */}
                <div style={{
                    background: 'white', borderRadius: 18, overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1rem',
                }}>
                    <div style={{
                        padding: '0.9rem 1.25rem 0.75rem', borderBottom: '1px dashed #D4D4D0',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F0F0F', letterSpacing: '0.04em' }}>
                            BILL DETAILS
                        </span>
                    </div>

                    <div style={{ padding: '0.9rem 1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                            <span style={{ fontSize: '0.85rem', color: '#4A4A4A' }}>Item Total</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F0F0F' }}>₹{subtotal}</span>
                        </div>

                        {discount && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                                <span style={{ fontSize: '0.85rem', color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Tag size={12} /> Discount ({discount.code})
                                </span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16A34A' }}>−₹{discount.appliedDiscount}</span>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.85rem', color: '#4A4A4A' }}>Delivery Fee</span>
                            <span style={{ fontSize: '0.85rem', color: '#8E8E8E' }}>Based on distance*</span>
                        </div>

                        <div style={{ borderTop: '1.5px dashed #E0E0DC', margin: '0.5rem 0 0.75rem' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F0F0F' }}>Total</span>
                            <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0F0F0F', fontFamily: 'Outfit, sans-serif' }}>
                                ₹{total}
                            </span>
                        </div>

                        <div style={{ borderTop: '1.5px dashed #E0E0DC', margin: '0.75rem 0 0.6rem' }} />

                        <p style={{ fontSize: '0.7rem', color: '#8E8E8E', lineHeight: 1.5 }}>
                            * Delivery charges are calculated based on distance at checkout. Prices are verified by the server.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
