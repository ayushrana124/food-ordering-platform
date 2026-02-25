import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import EmptyState from '@/components/common/EmptyState';
import { useCart } from '@/hooks/useCart';
import type { ICartItem } from '@/types';

export default function CartPage() {
    const navigate = useNavigate();
    const { items, subtotal, itemCount, removeItem, setQuantity } = useCart();

    const DELIVERY_CHARGE = subtotal >= 499 ? 0 : subtotal >= 299 ? 40 : 60;
    const TAX = Math.round(subtotal * 0.05);
    const TOTAL = subtotal + DELIVERY_CHARGE + TAX;

    if (items.length === 0) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
                <Navbar />
                <div style={{ padding: '4rem 0' }}>
                    <EmptyState
                        emoji="🛒"
                        title="Your cart is empty"
                        description="Add some delicious items from our menu!"
                        action={
                            <button className="btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }} onClick={() => navigate('/menu')}>
                                Browse Menu 🍕
                            </button>
                        }
                    />
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }} className="page-enter">
            <Navbar />
            <div className="container" style={{ padding: '2rem 1rem 4rem' }}>
                <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '1.75rem' }}>
                    🛒 Your Cart <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>({itemCount} items)</span>
                </h1>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                    {/* Grid becomes 2-col on large screens */}
                    <style>{`@media(min-width:900px){ .cart-grid { grid-template-columns: 1fr 380px !important; } }`}</style>
                    <div className="cart-grid" style={{ display: 'grid', gap: '1.5rem' }}>

                        {/* Items */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            {items.map((item: ICartItem) => {
                                const itemTotal = (item.price + item.selectedCustomizations.reduce((s, c) => s + c.price, 0)) * item.quantity;
                                return (
                                    <div key={item.cartId} className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        {/* Image */}
                                        <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, background: 'var(--color-surface-alt)' }}>
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '2rem' }}>🍕</div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.isVeg ? 'var(--color-success)' : '#B91C1C', flexShrink: 0 }} />
                                                <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h4>
                                            </div>
                                            {item.selectedCustomizations.length > 0 && (
                                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                    + {item.selectedCustomizations.map((c) => c.name).join(', ')}
                                                </p>
                                            )}
                                            <p style={{ fontWeight: 700, color: 'var(--color-accent)', marginTop: '0.25rem' }}>₹{itemTotal}</p>
                                        </div>

                                        {/* Quantity */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                            <button className="qty-btn" onClick={() => setQuantity(item.cartId, item.quantity - 1)}>−</button>
                                            <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                                            <button className="qty-btn" onClick={() => setQuantity(item.cartId, item.quantity + 1)}>+</button>
                                        </div>

                                        {/* Remove */}
                                        <button
                                            onClick={() => removeItem(item.cartId)}
                                            style={{ padding: '0.35rem', border: 'none', background: 'var(--color-error-bg)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-error)', fontSize: '1rem', flexShrink: 0 }}
                                            title="Remove"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Order Summary */}
                        <div className="card" style={{ padding: '1.5rem', height: 'fit-content', position: 'sticky', top: 80 }}>
                            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.15rem', marginBottom: '1.25rem' }}>Order Summary</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal</span>
                                    <span style={{ fontWeight: 600 }}>₹{subtotal}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Delivery</span>
                                    <span style={{ fontWeight: 600, color: DELIVERY_CHARGE === 0 ? 'var(--color-success)' : 'inherit' }}>
                                        {DELIVERY_CHARGE === 0 ? 'FREE 🎉' : `₹${DELIVERY_CHARGE}`}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Taxes (5%)</span>
                                    <span style={{ fontWeight: 600 }}>₹{TAX}</span>
                                </div>
                            </div>

                            <div className="divider" />

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', marginTop: '0.75rem' }}>
                                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.1rem' }}>Total</span>
                                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-accent)' }}>₹{TOTAL}</span>
                            </div>

                            {subtotal < 499 && (
                                <div style={{ background: 'var(--color-warning-bg)', borderRadius: 'var(--radius-md)', padding: '0.625rem 0.875rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--color-warning)', fontWeight: 500 }}>
                                    Add ₹{499 - subtotal} more for free delivery!
                                </div>
                            )}

                            <button
                                className="btn-primary"
                                style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '0.875rem' }}
                                onClick={() => navigate('/checkout')}
                            >
                                Proceed to Checkout →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
