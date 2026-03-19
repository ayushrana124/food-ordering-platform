import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingBag, Pizza, MapPin, Plus, UtensilsCrossed,
    PenLine, ChevronRight,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import EmptyState from '@/components/common/EmptyState';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import type { ICartItem } from '@/types';

export default function CartPage() {
    const navigate = useNavigate();
    const { items, subtotal, itemCount, removeItem, setQuantity } = useCart();
    const { user, isAuthenticated } = useAuth();
    const [note, setNote] = useState('');
    const [editNote, setEditNote] = useState(false);

    const TAX = Math.round(subtotal * 0.05);
    const DELIVERY_FEE = 40; // estimate shown; real fee computed at checkout
    const grandTotal = subtotal + TAX;

    const defaultAddress = user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0];

    /* ── Empty state ─────────────────────────────────────────────────────── */
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

    /* ── Main cart ───────────────────────────────────────────────────────── */
    return (
        <div className="min-h-screen bg-[#F4F4F2] page-enter" style={{ paddingBottom: 80 }}>
            <Navbar />

            <div className="container py-5" style={{ maxWidth: 680 }}>

                {/* ── ITEMS CARD ─────────────────────────────────────────── */}
                <div style={{
                    background: 'white',
                    borderRadius: 18,
                    overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    marginBottom: '1rem',
                }}>
                    {/* Card header */}
                    <div style={{
                        padding: '0.9rem 1.25rem 0.75rem',
                        borderBottom: '1px solid #F0F0EE',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}>
                        <span style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: '#FFFBF0', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            color: '#E8A317', flexShrink: 0,
                        }}>
                            <UtensilsCrossed size={14} />
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F0F0F' }}>
                            ITEMS ADDED
                        </span>
                        <span style={{
                            marginLeft: 'auto', fontSize: '0.72rem',
                            color: '#8E8E8E', fontWeight: 600,
                        }}>
                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Item rows */}
                    {items.map((item: ICartItem, idx: number) => {
                        const itemTotal = (item.price + item.selectedCustomizations.reduce((s, c) => s + c.price, 0)) * item.quantity;
                        return (
                            <div key={item.cartId}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.85rem 1.25rem',
                                }}>
                                    {/* Veg dot + name */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                            <span style={{
                                                width: 12, height: 12, borderRadius: 2,
                                                border: `2px solid ${item.isVeg ? '#16A34A' : '#DC2626'}`,
                                                display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', flexShrink: 0,
                                                marginTop: 3,
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
                                            </div>
                                        </div>
                                    </div>

                                    {/* Qty stepper */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        border: '1.5px solid #E8A317', borderRadius: 8,
                                        padding: '2px 6px', background: '#FFFBF0',
                                    }}>
                                        <button
                                            onClick={() => setQuantity(item.cartId, item.quantity - 1)}
                                            style={{
                                                width: 22, height: 22, border: 'none',
                                                background: 'none', cursor: 'pointer',
                                                color: '#E8A317', fontWeight: 800,
                                                fontSize: '1rem', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >−</button>
                                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F0F0F', minWidth: 16, textAlign: 'center' }}>
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => setQuantity(item.cartId, item.quantity + 1)}
                                            style={{
                                                width: 22, height: 22, border: 'none',
                                                background: 'none', cursor: 'pointer',
                                                color: '#E8A317', fontWeight: 800,
                                                fontSize: '1rem', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >+</button>
                                    </div>

                                    {/* Price */}
                                    <span style={{
                                        fontWeight: 800, fontSize: '0.9rem',
                                        color: '#0F0F0F', minWidth: 52, textAlign: 'right',
                                        flexShrink: 0,
                                    }}>
                                        ₹{itemTotal}
                                    </span>
                                </div>

                                {/* Dotted separator between items */}
                                {idx < items.length - 1 && (
                                    <div style={{
                                        margin: '0 1.25rem',
                                        borderTop: '1.5px dashed #E8E8E6',
                                    }} />
                                )}
                            </div>
                        );
                    })}

                    {/* Footer actions */}
                    <div style={{
                        borderTop: '1px solid #F0F0EE',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.75rem 1.25rem',
                        gap: '0.75rem',
                    }}>
                        <button
                            onClick={() => navigate('/menu')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                border: '1.5px solid #E0E0DC', borderRadius: 9,
                                background: 'white', color: '#4A4A4A',
                                fontSize: '0.78rem', fontWeight: 700,
                                padding: '0.45rem 0.9rem', cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E8A317'; e.currentTarget.style.color = '#E8A317'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E0E0DC'; e.currentTarget.style.color = '#4A4A4A'; }}
                        >
                            <Plus size={14} /> Add More Items
                        </button>

                        <button
                            onClick={() => setEditNote(n => !n)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                border: '1.5px solid #E0E0DC', borderRadius: 9,
                                background: 'white', color: '#4A4A4A',
                                fontSize: '0.78rem', fontWeight: 700,
                                padding: '0.45rem 0.9rem', cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4A4A4A'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E0E0DC'; }}
                        >
                            <PenLine size={14} /> Add Special Instructions
                        </button>
                    </div>

                    {/* Special instructions input */}
                    {editNote && (
                        <div style={{ padding: '0 1.25rem 1rem' }}>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Any special requests, allergies, or instructions..."
                                rows={3}
                                style={{
                                    width: '100%', border: '1.5px solid #E0E0DC',
                                    borderRadius: 10, padding: '0.6rem 0.9rem',
                                    fontSize: '0.82rem', fontFamily: 'Inter, sans-serif',
                                    resize: 'none', outline: 'none', color: '#0F0F0F',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* ── DELIVERY ADDRESS CARD ──────────────────────────────── */}
                <div style={{
                    background: 'white',
                    borderRadius: 18,
                    overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    marginBottom: '1rem',
                }}>
                    <div style={{ padding: '0.9rem 1.25rem 0.75rem', borderBottom: '1px solid #F0F0EE', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: '#EFF6FF', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            color: '#2563EB', flexShrink: 0,
                        }}>
                            <MapPin size={14} />
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F0F0F' }}>
                            DELIVERY DETAILS
                        </span>
                    </div>

                    <div style={{ padding: '1rem 1.25rem' }}>
                        {defaultAddress ? (
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F0F0F', marginBottom: 3 }}>
                                        {defaultAddress.label}
                                        {defaultAddress.isDefault && (
                                            <span style={{
                                                marginLeft: 6, fontSize: '0.65rem',
                                                background: '#DCFCE7', color: '#16A34A',
                                                fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                                            }}>DEFAULT</span>
                                        )}
                                    </p>
                                    <p style={{ fontSize: '0.8rem', color: '#4A4A4A', lineHeight: 1.5 }}>
                                        {defaultAddress.addressLine}
                                    </p>
                                    {defaultAddress.landmark && (
                                        <p style={{ fontSize: '0.75rem', color: '#8E8E8E', marginTop: 2 }}>
                                            Near {defaultAddress.landmark}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => navigate('/profile?tab=addresses')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 2,
                                        fontSize: '0.75rem', color: '#2563EB',
                                        fontWeight: 700, background: 'none',
                                        border: 'none', cursor: 'pointer', flexShrink: 0,
                                    }}
                                >
                                    Change <ChevronRight size={13} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => navigate('/profile?tab=addresses')}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.7rem 0.75rem',
                                    border: '2px dashed #D4D4D0',
                                    borderRadius: 12, background: '#FAFAF8',
                                    cursor: 'pointer', color: '#4A4A4A',
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

                {/* ── BILL DETAILS CARD ─────────────────────────────────── */}
                <div style={{
                    background: 'white',
                    borderRadius: 18,
                    overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    marginBottom: '1rem',
                }}>
                    {/* Bill header */}
                    <div style={{
                        padding: '0.9rem 1.25rem 0.75rem',
                        borderBottom: '1px dashed #D4D4D0',
                        display: 'flex', alignItems: 'center',
                        gap: '0.5rem',
                    }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F0F0F', letterSpacing: '0.04em' }}>
                            BILL DETAILS
                        </span>
                    </div>

                    <div style={{ padding: '0.9rem 1.25rem' }}>
                        {/* Item total */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                            <span style={{ fontSize: '0.85rem', color: '#4A4A4A' }}>Item Total</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F0F0F' }}>₹{subtotal}</span>
                        </div>

                        {/* Delivery */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                            <span style={{ fontSize: '0.85rem', color: '#4A4A4A' }}>Delivery Fee</span>
                            <span style={{ fontSize: '0.85rem', color: '#8E8E8E' }}>₹{DELIVERY_FEE}*</span>
                        </div>

                        {/* Tax */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.85rem', color: '#4A4A4A' }}>GST (Govt. Taxes)</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F0F0F' }}>₹{TAX}</span>
                        </div>

                        {/* Dashed separator */}
                        <div style={{ borderTop: '1.5px dashed #E0E0DC', margin: '0.5rem 0 0.75rem' }} />

                        {/* Grand total */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F0F0F' }}>Grand Total</span>
                            <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0F0F0F', fontFamily: 'Outfit, sans-serif' }}>
                                ₹{grandTotal}
                            </span>
                        </div>

                        {/* Dashed separator */}
                        <div style={{ borderTop: '1.5px dashed #E0E0DC', margin: '0.75rem 0 0.6rem' }} />

                        {/* Note */}
                        <p style={{ fontSize: '0.7rem', color: '#8E8E8E', lineHeight: 1.5 }}>
                            * Delivery fee is estimated. Exact charges are calculated based on your delivery distance at checkout.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
