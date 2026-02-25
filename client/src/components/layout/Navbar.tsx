import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';

/* ── Inline SVG icons ─────────────────────────────────────────────────────── */
const LogoIcon = ({ size = 26 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2C6.48 2 2 6.48 2 12" />
        <path d="M12 2c3.31 0 6.19 1.65 8 4.17" />
        <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="14" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="13" r="0.9" fill="currentColor" stroke="none" />
        <path d="M2 12l10 10 10-10" />
    </svg>
);

const CartIcon = () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
);

const UserIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const BarsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);

const CloseIcon = () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const OrdersIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
);

const SignOutIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

/* ── Shared style ─────────────────────────────────────────────────────────── */
const iconBtnStyle: React.CSSProperties = {
    position: 'relative',
    width: 38, height: 38, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent',
    border: '1.5px solid var(--border-strong)',
    color: 'var(--text-2)',
    cursor: 'pointer', flexShrink: 0,
    transition: 'border-color 0.18s, background 0.18s, color 0.18s',
};

export default function Navbar() {
    const { itemCount } = useCart();
    const { user, isAuthenticated, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 8);
        h(); window.addEventListener('scroll', h);
        return () => window.removeEventListener('scroll', h);
    }, []);

    useEffect(() => { setMenuOpen(false); setProfileOpen(false); }, [location.pathname]);

    const navLinks = [
        { to: '/', label: 'Home' },
        { to: '/menu', label: 'Menu' },
    ];
    const active = (to: string) => location.pathname === to;

    return (
        <>
            <nav style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'rgba(250,250,248,0.97)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
                boxShadow: scrolled ? '0 1px 16px rgba(0,0,0,0.05)' : 'none',
                transition: 'border-color 0.25s, box-shadow 0.25s',
            }}>
                <div className="container" style={{ display: 'flex', alignItems: 'center', height: 62, gap: '0.5rem' }}>

                    {/* Logo */}
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', textDecoration: 'none', flexShrink: 0, marginRight: '0.5rem' }}>
                        <div style={{ color: 'var(--amber)', display: 'flex', alignItems: 'center' }}>
                            <LogoIcon size={24} />
                        </div>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                            Bunty<span style={{ color: 'var(--amber)' }}>Pizza</span>
                        </span>
                    </Link>

                    {/* Desktop links */}
                    <div className="hide-mobile" style={{ display: 'flex', gap: '0.1rem', flex: 1 }}>
                        {navLinks.map((l) => (
                            <Link key={l.to} to={l.to} style={{
                                padding: '0.4rem 0.85rem', borderRadius: '6px',
                                fontFamily: "'Inter', sans-serif",
                                fontWeight: active(l.to) ? 700 : 500,
                                fontSize: '0.875rem',
                                color: active(l.to) ? 'var(--text-1)' : 'var(--text-2)',
                                background: active(l.to) ? 'var(--amber-light)' : 'transparent',
                                textDecoration: 'none', transition: 'all 0.18s',
                            }}
                                onMouseEnter={(e) => { if (!active(l.to)) e.currentTarget.style.color = 'var(--text-1)'; }}
                                onMouseLeave={(e) => { if (!active(l.to)) e.currentTarget.style.color = 'var(--text-2)'; }}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </div>

                    {/* Right icons */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>

                        {/* Cart */}
                        <Link to="/cart" style={{ ...iconBtnStyle, textDecoration: 'none' }}
                            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--amber)'; el.style.background = 'var(--amber-light)'; el.style.color = 'var(--amber)'; }}
                            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border-strong)'; el.style.background = 'transparent'; el.style.color = 'var(--text-2)'; }}
                        >
                            <CartIcon />
                            {itemCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: -4, right: -4,
                                    background: 'var(--dark)', color: '#fff',
                                    width: 16, height: 16, borderRadius: '50%',
                                    fontSize: '0.58rem', fontWeight: 800,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid var(--bg)',
                                    fontFamily: "'Inter', sans-serif",
                                }}>
                                    {itemCount > 9 ? '9+' : itemCount}
                                </span>
                            )}
                        </Link>

                        {/* Auth */}
                        {isAuthenticated ? (
                            <div style={{ position: 'relative' }}>
                                <button onClick={() => setProfileOpen((p) => !p)} style={{
                                    ...iconBtnStyle,
                                    background: 'var(--amber-light)', borderColor: 'var(--amber-border)',
                                    color: '#7a5a00', fontFamily: "'Inter', sans-serif",
                                    fontWeight: 800, fontSize: '0.9rem',
                                }}>
                                    {(user?.name || user?.phone || '?')[0].toUpperCase()}
                                </button>
                                {profileOpen && (
                                    <div style={{ position: 'absolute', top: 46, right: 0, background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', minWidth: 175, zIndex: 200, overflow: 'hidden' }}>
                                        {[
                                            { to: '/profile', Icon: UserIcon, label: 'My Profile' },
                                            { to: '/profile?tab=orders', Icon: OrdersIcon, label: 'My Orders' },
                                        ].map((item) => (
                                            <Link key={item.to} to={item.to} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.8rem 1rem', fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-1)', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-alt)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}>
                                                <item.Icon /> {item.label}
                                            </Link>
                                        ))}
                                        <button onClick={signOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.8rem 1rem', fontSize: '0.83rem', fontWeight: 600, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF1F2'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}>
                                            <SignOutIcon /> Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button onClick={() => navigate('/login')} style={{ ...iconBtnStyle }} title="Sign In"
                                onMouseEnter={(e) => { const el = e.currentTarget; el.style.borderColor = 'var(--amber)'; el.style.background = 'var(--amber-light)'; el.style.color = 'var(--amber)'; }}
                                onMouseLeave={(e) => { const el = e.currentTarget; el.style.borderColor = 'var(--border-strong)'; el.style.background = 'transparent'; el.style.color = 'var(--text-2)'; }}
                            >
                                <UserIcon />
                            </button>
                        )}

                        {/* Hamburger (mobile) */}
                        <button className="hide-desktop" onClick={() => setMenuOpen((o) => !o)} style={{ ...iconBtnStyle }} aria-label="Menu">
                            {menuOpen ? <CloseIcon /> : <BarsIcon />}
                        </button>
                    </div>
                </div>

                {/* Mobile dropdown */}
                {menuOpen && (
                    <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', padding: '0.5rem clamp(1rem,4vw,2rem) 1rem' }}>
                        {navLinks.map((l) => (
                            <Link key={l.to} to={l.to} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 0.5rem', fontFamily: "'Inter', sans-serif", fontWeight: active(l.to) ? 700 : 500, fontSize: '0.95rem', color: active(l.to) ? 'var(--amber)' : 'var(--text-1)', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}>
                                {l.label}
                            </Link>
                        ))}
                        {!isAuthenticated && (
                            <button onClick={() => { navigate('/login'); setMenuOpen(false); }} style={{ marginTop: '0.75rem', width: '100%', padding: '0.7rem', borderRadius: 'var(--r-md)', background: 'var(--amber-light)', border: '1.5px solid var(--amber-border)', color: '#7a5a00', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <UserIcon /> Sign In
                            </button>
                        )}
                    </div>
                )}
            </nav>

            {profileOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setProfileOpen(false)} />}
        </>
    );
}
