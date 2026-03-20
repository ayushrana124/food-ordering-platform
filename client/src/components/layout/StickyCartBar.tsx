import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Lock, MapPin } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';

/**
 * StickyCartBar
 * – On /menu  → "X items | ₹total ··· View Cart →"
 * – On /cart  → "Pay Securely ··· ₹total"  (disabled if no address)
 * Renders only when cart has items and location matches.
 * Uses createPortal so position:fixed is never broken by parent transforms.
 */
export default function StickyCartBar() {
    const { items, subtotal, total, itemCount, discount } = useCart();
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const isMenu = location.pathname === '/menu';
    const isCart = location.pathname === '/cart';

    if (!items.length) return null;
    if (!isMenu && !isCart) return null;

    const hasAddress = (user?.addresses?.length ?? 0) > 0;

    const bar = (
        <div
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 8000,
                background: 'linear-gradient(135deg, #E8A317 0%, #F0B429 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 clamp(1rem, 4vw, 2rem)',
                height: 64,
                boxShadow: '0 -4px 24px rgba(232,163,23,0.4)',
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
                    {/* Left: Pay securely or add address prompt */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {hasAddress ? (
                            <>
                                <Lock size={16} style={{ opacity: 0.8 }} />
                                <div>
                                    <p style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 500, lineHeight: 1 }}>100% Secure</p>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 800, lineHeight: 1.3 }}>Pay Securely</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <MapPin size={16} style={{ opacity: 0.8 }} />
                                <div>
                                    <p style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 500, lineHeight: 1 }}>Add address first</p>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 800, lineHeight: 1.3 }}>Add Address to Continue</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right: Amount + checkout (disabled without address) */}
                    {hasAddress ? (
                        <Link
                            to="/checkout"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: 'rgba(255,255,255,0.2)',
                                border: '1.5px solid rgba(255,255,255,0.35)',
                                borderRadius: 10,
                                color: 'white',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                padding: '0.5rem 1.1rem',
                                textDecoration: 'none',
                                backdropFilter: 'blur(4px)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            ₹{total} <ArrowRight size={15} />
                        </Link>
                    ) : (
                        <span
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1.5px solid rgba(255,255,255,0.15)',
                                borderRadius: 10,
                                color: 'rgba(255,255,255,0.5)',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                padding: '0.5rem 1.1rem',
                                whiteSpace: 'nowrap',
                                cursor: 'not-allowed',
                            }}
                        >
                            ₹{total} <ArrowRight size={15} />
                        </span>
                    )}
                </>
            )}
        </div>
    );

    return createPortal(bar, document.body);
}
