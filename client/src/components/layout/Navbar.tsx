import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Menu, X, ChefHat, MapPin, ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import LoginModal from '@/components/common/LoginModal';
import ProfileSidebar from '@/components/layout/ProfileSidebar';
import StickyCartBar from '@/components/layout/StickyCartBar';

export default function Navbar() {
    const { itemCount } = useCart();
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [showLogin, setShowLogin] = useState(false);

    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 8);
        h(); window.addEventListener('scroll', h);
        return () => window.removeEventListener('scroll', h);
    }, []);

    useEffect(() => { setMenuOpen(false); }, [location.pathname]);

    const navLinks = [
        { to: '/', label: 'Home' },
        { to: '/menu', label: 'Menu' },
    ];
    const active = (to: string) => location.pathname === to;

    // Derive active delivery address
    const activeAddress = user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0];

    return (
        <>
            {/* ── Sticky Navbar ── */}
            <nav
                className="sticky top-0 z-[100] transition-all duration-300"
                style={{
                    background: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.97)',
                    backdropFilter: 'blur(20px) saturate(1.2)',
                    WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
                    borderBottom: scrolled ? '1px solid #EEEEEE' : '1px solid transparent',
                    boxShadow: scrolled ? '0 1px 20px rgba(0,0,0,0.04)' : 'none',
                }}
            >
                <div className="container flex items-center h-[60px] gap-3">

                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-[0.5rem] no-underline shrink-0 mr-3 group">
                        <span
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-4deg]"
                            style={{
                                background: 'linear-gradient(135deg, #E8A317, #F0B429)',
                                boxShadow: '0 2px 10px rgba(232,163,23,0.25)',
                            }}
                        >
                            <ChefHat size={18} />
                        </span>
                        <span className="font-outfit font-extrabold text-[1.1rem] text-[#0F0F0F] tracking-[-0.02em]">
                            Diamond<span className="text-[#E8A317]">Pizza</span>
                        </span>
                    </Link>

                    {/* Desktop nav links */}
                    <div className="hide-mobile flex gap-[0.15rem] flex-1">
                        {navLinks.map((l) => (
                            <Link
                                key={l.to}
                                to={l.to}
                                className="px-4 py-[0.45rem] rounded-lg font-ui text-[0.875rem] no-underline transition-all duration-250"
                                style={{
                                    fontWeight: active(l.to) ? 700 : 500,
                                    color: active(l.to) ? '#E8A317' : '#4A4A4A',
                                    background: active(l.to) ? 'var(--amber-light)' : 'transparent',
                                }}
                                onMouseEnter={(e) => { if (!active(l.to)) { e.currentTarget.style.color = '#0F0F0F'; e.currentTarget.style.background = '#F7F7F5'; } }}
                                onMouseLeave={(e) => { if (!active(l.to)) { e.currentTarget.style.color = '#4A4A4A'; e.currentTarget.style.background = 'transparent'; } }}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </div>

                    {/* Right side icons */}
                    <div className="ml-auto flex items-center gap-[0.5rem]">

                        {/* Cart — desktop only */}
                        {/* <Link
                            to="/cart"
                            className="hide-mobile relative w-[40px] h-[40px] rounded-xl flex items-center justify-center bg-transparent border-[1.5px] border-[#E0E0DC] text-[#4A4A4A] no-underline shrink-0 transition-all duration-250"
                            onMouseEnter={(e) => { const el = e.currentTarget; el.style.borderColor = '#E8A317'; el.style.background = '#FFFBF0'; el.style.color = '#E8A317'; el.style.boxShadow = '0 2px 10px rgba(232,163,23,0.12)'; }}
                            onMouseLeave={(e) => { const el = e.currentTarget; el.style.borderColor = '#E0E0DC'; el.style.background = 'transparent'; el.style.color = '#4A4A4A'; el.style.boxShadow = 'none'; }}
                        >
                            <ShoppingBag size={18} />
                            {itemCount > 0 && (
                                <span
                                    className="absolute -top-[5px] -right-[5px] min-w-[18px] h-[18px] rounded-full bg-[#E8A317] text-white text-[0.6rem] font-extrabold flex items-center justify-center border-2 border-white font-ui px-1"
                                    style={{ animation: 'scaleIn 0.3s var(--ease-spring)' }}
                                >
                                    {itemCount > 9 ? '9+' : itemCount}
                                </span>
                            )}
                        </Link> */}

                        {/* Auth */}
                        {isAuthenticated ? (
                            <button
                                onClick={() => setProfileOpen(true)}
                                className="w-[40px] h-[40px] rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-all duration-250 font-ui font-extrabold text-[0.9rem]"
                                style={{
                                    background: 'linear-gradient(135deg, #FFFBF0, #FFE4A3)',
                                    border: '1.5px solid #F0CA5A',
                                    color: '#9A7209',
                                }}
                            >
                                {(user?.name || user?.phone || '?')[0].toUpperCase()}
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowLogin(true)}
                                className="w-[40px] h-[40px] rounded-xl flex items-center justify-center bg-transparent border-[1.5px] border-[#E0E0DC] text-[#4A4A4A] shrink-0 transition-all duration-250"
                                title="Sign In"
                                onMouseEnter={(e) => { const el = e.currentTarget; el.style.borderColor = '#E8A317'; el.style.background = '#FFFBF0'; el.style.color = '#E8A317'; }}
                                onMouseLeave={(e) => { const el = e.currentTarget; el.style.borderColor = '#E0E0DC'; el.style.background = 'transparent'; el.style.color = '#4A4A4A'; }}
                            >
                                <User size={18} />
                            </button>
                        )}

                        {/* Hamburger — mobile only */}
                        <button
                            className="hide-desktop w-[40px] h-[40px] rounded-xl flex items-center justify-center bg-transparent border-[1.5px] border-[#E0E0DC] text-[#4A4A4A] shrink-0 transition-all duration-250"
                            onClick={() => setMenuOpen((o) => !o)}
                            aria-label="Menu"
                        >
                            {menuOpen ? <X size={18} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu dropdown */}
                {menuOpen && (
                    <div
                        className="bg-white border-t border-[#EEEEEE] py-2 px-[clamp(1rem,4vw,2rem)]"
                        style={{ animation: 'slideDown 0.2s var(--ease-spring)' }}
                    >
                        {navLinks.map((l) => (
                            <Link
                                key={l.to}
                                to={l.to}
                                className="flex items-center py-3 px-3 font-ui text-[0.95rem] border-b border-[#EEEEEE] no-underline rounded-lg transition-colors duration-150"
                                style={{
                                    fontWeight: active(l.to) ? 700 : 500,
                                    color: active(l.to) ? '#E8A317' : '#0F0F0F',
                                    background: active(l.to) ? '#FFFBF0' : 'transparent',
                                }}
                            >
                                {l.label}
                            </Link>
                        ))}
                        {!isAuthenticated && (
                            <button
                                onClick={() => { navigate('/login'); setMenuOpen(false); }}
                                className="mt-3 w-full py-[0.75rem] rounded-xl font-bold text-[0.875rem] cursor-pointer font-ui flex items-center justify-center gap-2 transition-colors duration-150"
                                style={{
                                    background: 'linear-gradient(135deg, #FFFBF0, #FFE4A3)',
                                    border: '1.5px solid #F0CA5A',
                                    color: '#9A7209',
                                }}
                            >
                                <User size={18} /> Sign In
                            </button>
                        )}
                    </div>
                )}

                {/* Mobile menu backdrop */}
                {menuOpen && (
                    <div
                        className="fixed inset-0 bg-black/20 z-[-1] hide-desktop"
                        onClick={() => setMenuOpen(false)}
                    />
                )}

                {/* Address strip — authenticated users with saved addresses */}
                {isAuthenticated && activeAddress && (
                    <div style={{ borderBottom: '1px solid #EEEEEE', background: 'rgba(255,255,255,0.98)' }}>
                        <div
                            className="container"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.26rem clamp(1rem,4vw,2rem)' }}
                        >
                            <MapPin size={11} style={{ color: '#E8A317', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.7rem', color: '#8E8E8E', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ color: '#0F0F0F', fontWeight: 650 }}>Deliver to {activeAddress.label}:</span>{' '}
                                {activeAddress.addressLine}{activeAddress.landmark ? `, near ${activeAddress.landmark}` : ''}
                            </span>
                        </div>
                    </div>
                )}
            </nav>

            {/* ── Floating Cart FAB — home page only ── */}
            {itemCount > 0 && location.pathname === '/' && createPortal(
                <Link
                    to="/menu"
                    aria-label={`Cart (${itemCount} items)`}
                    className="sm:hidden"
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 20,
                        zIndex: 9000,
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #E8A317, #F0B429)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 6px 20px rgba(232,163,23,0.5), 0 2px 8px rgba(0,0,0,0.12)',
                        textDecoration: 'none',
                        animation: 'scaleIn 0.25s var(--ease-spring)',
                    }}
                >
                    <ShoppingBag size={22} />
                    <span
                        style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            minWidth: 19,
                            height: 19,
                            borderRadius: '50%',
                            background: '#0F0F0F',
                            color: 'white',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1.5px solid white',
                            padding: '0 2px',
                        }}
                    >
                        {itemCount > 9 ? '9+' : itemCount}
                    </span>
                </Link>,
                document.body
            )}

            {/* ── Sticky bottom bar for /menu and /cart ── */}
            <StickyCartBar />

            {/* Profile Sidebar */}
            <ProfileSidebar open={profileOpen} onClose={() => setProfileOpen(false)} />

            {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        </>
    );
}
