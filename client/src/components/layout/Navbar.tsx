import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, User, Menu, X, FileText, LogOut, ChefHat } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import LoginModal from '@/components/common/LoginModal';

export default function Navbar() {
    const { itemCount } = useCart();
    const { user, isAuthenticated, signOut } = useAuth();
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

    useEffect(() => { setMenuOpen(false); setProfileOpen(false); }, [location.pathname]);

    const navLinks = [
        { to: '/', label: 'Home' },
        { to: '/menu', label: 'Menu' },
    ];
    const active = (to: string) => location.pathname === to;

    return (
        <>
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
                <div className="container flex items-center h-[64px] gap-3">

                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-[0.5rem] no-underline shrink-0 mr-3 group">
                        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E8A317] to-[#F0B429] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-4deg]" style={{ boxShadow: '0 2px 10px rgba(232,163,23,0.25)' }}>
                            <ChefHat size={20} />
                        </span>
                        <span className="font-outfit font-extrabold text-[1.15rem] text-[#0F0F0F] tracking-[-0.02em]">
                            Bunty<span className="text-[#E8A317]">Pizza</span>
                        </span>
                    </Link>

                    {/* Desktop links */}
                    <div className="hide-mobile flex gap-[0.15rem] flex-1">
                        {navLinks.map((l) => (
                            <Link
                                key={l.to}
                                to={l.to}
                                className="relative px-4 py-[0.45rem] rounded-lg font-ui text-[0.875rem] no-underline transition-all duration-250"
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

                    {/* Right icons */}
                    <div className="ml-auto flex items-center gap-[0.5rem]">

                        {/* Cart */}
                        <Link
                            to="/cart"
                            className="relative w-[40px] h-[40px] rounded-xl flex items-center justify-center bg-transparent border-[1.5px] border-[#E0E0DC] text-[#4A4A4A] no-underline shrink-0 transition-all duration-250"
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
                        </Link>

                        {/* Auth */}
                        {isAuthenticated ? (
                            <div className="relative">
                                <button
                                    onClick={() => setProfileOpen((p) => !p)}
                                    className="w-[40px] h-[40px] rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-all duration-250 font-ui font-extrabold text-[0.9rem]"
                                    style={{
                                        background: 'linear-gradient(135deg, #FFFBF0, #FFE4A3)',
                                        border: '1.5px solid #F0CA5A',
                                        color: '#9A7209',
                                    }}
                                >
                                    {(user?.name || user?.phone || '?')[0].toUpperCase()}
                                </button>
                                {profileOpen && (
                                    <div
                                        className="absolute top-[48px] right-0 bg-white rounded-2xl border border-[#EEEEEE] min-w-[190px] z-200 overflow-hidden"
                                        style={{
                                            boxShadow: '0 8px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                                            animation: 'slideDown 0.2s var(--ease-spring)',
                                        }}
                                    >
                                        {[
                                            { to: '/profile', Icon: User, label: 'My Profile' },
                                            { to: '/profile?tab=orders', Icon: FileText, label: 'My Orders' },
                                        ].map((item) => (
                                            <Link
                                                key={item.to}
                                                to={item.to}
                                                className="flex items-center gap-[0.6rem] px-5 py-[0.85rem] text-[0.84rem] font-semibold text-[#0F0F0F] border-b border-[#EEEEEE] no-underline hover:bg-[#F7F7F5] transition-colors duration-150"
                                            >
                                                <item.Icon size={16} className="text-[#8E8E8E]" /> {item.label}
                                            </Link>
                                        ))}
                                        <button
                                            onClick={signOut}
                                            className="w-full flex items-center gap-[0.6rem] px-5 py-[0.85rem] text-[0.84rem] font-semibold text-[#DC2626] bg-none border-none cursor-pointer hover:bg-[#FEF2F2] transition-colors duration-150"
                                        >
                                            <LogOut size={16} /> Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
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

                        {/* Hamburger (mobile) */}
                        <button
                            className="w-[40px] h-[40px] rounded-xl flex items-center justify-center bg-transparent border-[1.5px] border-[#E0E0DC] text-[#4A4A4A] shrink-0 transition-all duration-250 hide-desktop"
                            onClick={() => setMenuOpen((o) => !o)}
                            aria-label="Menu"
                        >
                            {menuOpen ? <X size={18} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mobile dropdown */}
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

                {/* Mobile backdrop */}
                {menuOpen && (
                    <div
                        className="fixed inset-0 bg-black/20 z-[-1] hide-desktop"
                        onClick={() => setMenuOpen(false)}
                    />
                )}
            </nav>

            {profileOpen && (
                <div className="fixed inset-0 z-199" onClick={() => setProfileOpen(false)} />
            )}

            {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        </>
    );
}
