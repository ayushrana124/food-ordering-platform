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

/* ── Icon button base class ─────────────────────────────────────────────── */
const iconBtnCls = 'relative w-[38px] h-[38px] rounded-full flex items-center justify-center bg-transparent border-[1.5px] border-[#D0CFC9] text-[#555] cursor-pointer flex-shrink-0 transition-all duration-[180ms]';

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
            <nav
                className={`sticky top-0 z-[100] bg-[rgba(250,250,248,0.97)] backdrop-blur-[16px] transition-[border-color,box-shadow] duration-[250ms] ${scrolled ? 'border-b border-[#EBEBEB] shadow-[0_1px_16px_rgba(0,0,0,0.05)]' : 'border-b border-transparent'
                    }`}
                style={{ WebkitBackdropFilter: 'blur(16px)' }}
            >
                <div className="container flex items-center h-[62px] gap-2">

                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-[0.55rem] no-underline flex-shrink-0 mr-2">
                        <span className="text-[#D4920A] flex items-center">
                            <LogoIcon size={24} />
                        </span>
                        <span className="font-ui font-extrabold text-[1.1rem] text-[#111] tracking-[-0.02em]">
                            Bunty<span className="text-[#D4920A]">Pizza</span>
                        </span>
                    </Link>

                    {/* Desktop links */}
                    <div className="hide-mobile flex gap-[0.1rem] flex-1">
                        {navLinks.map((l) => (
                            <Link
                                key={l.to}
                                to={l.to}
                                className="px-[0.85rem] py-[0.4rem] rounded-[6px] font-ui text-[0.875rem] no-underline transition-all duration-[180ms]"
                                style={{
                                    fontWeight: active(l.to) ? 700 : 500,
                                    color: active(l.to) ? '#111' : '#555',
                                    background: active(l.to) ? '#FFF6DC' : 'transparent',
                                }}
                                onMouseEnter={(e) => { if (!active(l.to)) e.currentTarget.style.color = '#111'; }}
                                onMouseLeave={(e) => { if (!active(l.to)) e.currentTarget.style.color = '#555'; }}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </div>

                    {/* Right icons */}
                    <div className="ml-auto flex items-center gap-[0.45rem]">

                        {/* Cart */}
                        <Link
                            to="/cart"
                            className={`${iconBtnCls} no-underline`}
                            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#D4920A'; el.style.background = '#FFF6DC'; el.style.color = '#D4920A'; }}
                            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#D0CFC9'; el.style.background = 'transparent'; el.style.color = '#555'; }}
                        >
                            <CartIcon />
                            {itemCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#111] text-white text-[0.58rem] font-extrabold flex items-center justify-center border-2 border-[#FAFAF8] font-ui">
                                    {itemCount > 9 ? '9+' : itemCount}
                                </span>
                            )}
                        </Link>

                        {/* Auth */}
                        {isAuthenticated ? (
                            <div className="relative">
                                <button
                                    onClick={() => setProfileOpen((p) => !p)}
                                    className={`${iconBtnCls} bg-[#FFF6DC] border-[#E8C060] text-[#7a5a00] font-ui font-extrabold text-[0.9rem]`}
                                >
                                    {(user?.name || user?.phone || '?')[0].toUpperCase()}
                                </button>
                                {profileOpen && (
                                    <div className="absolute top-[46px] right-0 bg-white rounded-[16px] shadow-[0_12px_36px_rgba(0,0,0,0.12)] border border-[#EBEBEB] min-w-[175px] z-[200] overflow-hidden">
                                        {[
                                            { to: '/profile', Icon: UserIcon, label: 'My Profile' },
                                            { to: '/profile?tab=orders', Icon: OrdersIcon, label: 'My Orders' },
                                        ].map((item) => (
                                            <Link
                                                key={item.to}
                                                to={item.to}
                                                className="flex items-center gap-[0.55rem] px-4 py-[0.8rem] text-[0.83rem] font-semibold text-[#111] border-b border-[#EBEBEB] no-underline hover:bg-[#F4F3EF] transition-colors"
                                            >
                                                <item.Icon /> {item.label}
                                            </Link>
                                        ))}
                                        <button
                                            onClick={signOut}
                                            className="w-full flex items-center gap-[0.55rem] px-4 py-[0.8rem] text-[0.83rem] font-semibold text-[#DC2626] bg-none border-none cursor-pointer hover:bg-[#FFF1F2] transition-colors"
                                        >
                                            <SignOutIcon /> Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className={iconBtnCls}
                                title="Sign In"
                                onMouseEnter={(e) => { const el = e.currentTarget; el.style.borderColor = '#D4920A'; el.style.background = '#FFF6DC'; el.style.color = '#D4920A'; }}
                                onMouseLeave={(e) => { const el = e.currentTarget; el.style.borderColor = '#D0CFC9'; el.style.background = 'transparent'; el.style.color = '#555'; }}
                            >
                                <UserIcon />
                            </button>
                        )}

                        {/* Hamburger (mobile) */}
                        <button
                            className={`${iconBtnCls} hide-desktop`}
                            onClick={() => setMenuOpen((o) => !o)}
                            aria-label="Menu"
                        >
                            {menuOpen ? <CloseIcon /> : <BarsIcon />}
                        </button>
                    </div>
                </div>

                {/* Mobile dropdown */}
                {menuOpen && (
                    <div className="bg-[#FAFAF8] border-t border-[#EBEBEB] py-2 px-[clamp(1rem,4vw,2rem)]">
                        {navLinks.map((l) => (
                            <Link
                                key={l.to}
                                to={l.to}
                                className="flex items-center py-3 px-2 font-ui text-[0.95rem] border-b border-[#EBEBEB] no-underline"
                                style={{
                                    fontWeight: active(l.to) ? 700 : 500,
                                    color: active(l.to) ? '#D4920A' : '#111',
                                }}
                            >
                                {l.label}
                            </Link>
                        ))}
                        {!isAuthenticated && (
                            <button
                                onClick={() => { navigate('/login'); setMenuOpen(false); }}
                                className="mt-3 w-full py-[0.7rem] rounded-[10px] bg-[#FFF6DC] border-[1.5px] border-[#E8C060] text-[#7a5a00] font-bold text-[0.875rem] cursor-pointer font-ui flex items-center justify-center gap-2"
                            >
                                <UserIcon /> Sign In
                            </button>
                        )}
                    </div>
                )}
            </nav>

            {profileOpen && (
                <div className="fixed inset-0 z-[199]" onClick={() => setProfileOpen(false)} />
            )}
        </>
    );
}
