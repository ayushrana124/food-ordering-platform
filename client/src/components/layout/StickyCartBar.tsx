import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Lock } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

/**
 * StickyCartBar
 * – On /menu  → "X items | ₹total ··· View Cart →"
 * – On /cart  → "Pay Securely ··· ₹total"
 * Renders only when cart has items and location matches.
 * Uses createPortal so position:fixed is never broken by parent transforms.
 */
export default function StickyCartBar() {
    const { items, subtotal, itemCount } = useCart();
    const location = useLocation();
    const navigate = useNavigate();

    const isMenu = location.pathname === '/menu';
    const isCart = location.pathname === '/cart';

    if (!items.length) return null;
    if (!isMenu && !isCart) return null;

    const TAX = Math.round(subtotal * 0.05);
    const grandTotal = subtotal + TAX;

    const bar = (
        <div
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 8000,
                background: isCart
                    ? 'linear-gradient(135deg, #0F0F0F 0%, #1A1A1A 100%)'
                    : 'linear-gradient(135deg, #E8A317 0%, #F0B429 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 clamp(1rem, 4vw, 2rem)',
                height: 64,
                boxShadow: isCart
                    ? '0 -4px 24px rgba(0,0,0,0.25)'
                    : '0 -4px 24px rgba(232,163,23,0.4)',
                animation: 'slideUp 0.3s var(--ease-spring)',
            }}
        >
            {isMenu && (
                <>
                    {/* Left: items + price */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: 10,
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <ShoppingBag size={16} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.85, lineHeight: 1.1 }}>
                                {itemCount} item{itemCount !== 1 ? 's' : ''} added
                            </p>
                            <p style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1.2, fontFamily: 'Outfit, sans-serif' }}>
                                ₹{subtotal}
                            </p>
                        </div>
                    </div>

                    {/* Right: View Cart */}
                    <button
                        onClick={() => navigate('/cart')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            background: 'rgba(255,255,255,0.2)',
                            border: '1.5px solid rgba(255,255,255,0.35)',
                            borderRadius: 10,
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            padding: '0.45rem 0.95rem',
                            cursor: 'pointer',
                            backdropFilter: 'blur(4px)',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        View Cart <ArrowRight size={14} />
                    </button>
                </>
            )}

            {isCart && (
                <>
                    {/* Left: Pay securely */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Lock size={16} style={{ opacity: 0.8 }} />
                        <div>
                            <p style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 500, lineHeight: 1 }}>100% Secure</p>
                            <p style={{ fontSize: '0.9rem', fontWeight: 800, lineHeight: 1.3 }}>Pay Securely</p>
                        </div>
                    </div>

                    {/* Right: Amount + checkout */}
                    <Link
                        to="/checkout"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: '#E8A317',
                            borderRadius: 10,
                            color: 'white',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            padding: '0.5rem 1.1rem',
                            textDecoration: 'none',
                            boxShadow: '0 2px 12px rgba(232,163,23,0.4)',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        ₹{grandTotal} <ArrowRight size={15} />
                    </Link>
                </>
            )}
        </div>
    );

    return createPortal(bar, document.body);
}
