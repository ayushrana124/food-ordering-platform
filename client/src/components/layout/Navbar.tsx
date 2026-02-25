import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, User, Menu, X, FileText, LogOut, Pizza } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';

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
                    <Link to="/" className="flex items-center gap-[0.55rem] no-underline shrink-0 mr-2">
                        <span className="text-amber flex items-center">
                            <Pizza size={24} />
                        </span>
                        <span className="font-outfit font-extrabold text-[1.1rem] text-[#111] tracking-[-0.02em]">
                            Bunty<span className="text-amber">Pizza</span>
                        </span>
                    </Link>

                    {/* Desktop links */}
                    <div className="hide-mobile flex gap-[0.1rem] flex-1">
                        {navLinks.map((l) => (
                            <Link
                                key={l.to}
                                to={l.to}
                                className="px-[0.85rem] py-[0.4rem] rounded-sm font-ui text-[0.875rem] no-underline transition-all duration-180"
                                style={{
                                    fontWeight: active(l.to) ? 700 : 500,
                                    color: active(l.to) ? '#111' : '#555',
                                    background: active(l.to) ? 'var(--amber-light)' : 'transparent',
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
                            <ShoppingBag size={19} />
                            {itemCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#111] text-white text-[0.58rem] font-extrabold flex items-center justify-center border-2 border-bg font-ui">
                                    {itemCount > 9 ? '9+' : itemCount}
                                </span>
                            )}
                        </Link>

                        {/* Auth */}
                        {isAuthenticated ? (
                            <div className="relative">
                                <button
                                    onClick={() => setProfileOpen((p) => !p)}
                                    className={`${iconBtnCls} bg-amber-light border-amber-border text-[#7a5a00] font-ui font-extrabold text-[0.9rem]`}
                                >
                                    {(user?.name || user?.phone || '?')[0].toUpperCase()}
                                </button>
                                {profileOpen && (
                                    <div className="absolute top-[46px] right-0 bg-white rounded-lg shadow-lg border border-border min-w-[175px] z-200 overflow-hidden">
                                        {[
                                            { to: '/profile', Icon: User, label: 'My Profile' },
                                            { to: '/profile?tab=orders', Icon: FileText, label: 'My Orders' },
                                        ].map((item) => (
                                            <Link
                                                key={item.to}
                                                to={item.to}
                                                className="flex items-center gap-[0.55rem] px-4 py-[0.8rem] text-[0.83rem] font-semibold text-[#111] border-b border-border no-underline hover:bg-surface-alt transition-colors"
                                            >
                                                <item.Icon size={15} /> {item.label}
                                            </Link>
                                        ))}
                                        <button
                                            onClick={signOut}
                                            className="w-full flex items-center gap-[0.55rem] px-4 py-[0.8rem] text-[0.83rem] font-semibold text-[#DC2626] bg-none border-none cursor-pointer hover:bg-[#FFF1F2] transition-colors"
                                        >
                                            <LogOut size={15} /> Sign Out
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
                                <User size={18} />
                            </button>
                        )}

                        {/* Hamburger (mobile) */}
                        <button
                            className={`${iconBtnCls} hide-desktop`}
                            onClick={() => setMenuOpen((o) => !o)}
                            aria-label="Menu"
                        >
                            {menuOpen ? <X size={19} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mobile dropdown */}
                {menuOpen && (
                    <div className="bg-bg border-t border-border py-2 px-[clamp(1rem,4vw,2rem)]">
                        {navLinks.map((l) => (
                            <Link
                                key={l.to}
                                to={l.to}
                                className="flex items-center py-3 px-2 font-ui text-[0.95rem] border-b border-border no-underline"
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
                                className="mt-3 w-full py-[0.7rem] rounded-md bg-amber-light border-[1.5px] border-amber-border text-[#7a5a00] font-bold text-[0.875rem] cursor-pointer font-ui flex items-center justify-center gap-2"
                            >
                                <User size={18} /> Sign In
                            </button>
                        )}
                    </div>
                )}
            </nav>

            {profileOpen && (
                <div className="fixed inset-0 z-199" onClick={() => setProfileOpen(false)} />
            )}
        </>
    );
}
