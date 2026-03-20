import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    X, User, FileText, MapPin, Star, LogOut, ChevronRight, Phone
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function ProfileSidebar({ open, onClose }: Props) {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    // Lock body scroll when open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Navigate after closing — avoids double-render
    const handleNav = (to: string) => {
        onClose();
        // Small delay so sidebar closes before page transitions
        setTimeout(() => navigate(to), 10);
    };

    const handleSignOut = () => {
        signOut();
        onClose();
        setTimeout(() => navigate('/'), 10);
    };

    const navItems = [
        { to: '/profile', icon: User, label: 'My Profile', desc: 'View & edit your info' },
        { to: '/profile?tab=orders', icon: FileText, label: 'My Orders', desc: 'Track & reorder' },
        { to: '/profile?tab=addresses', icon: MapPin, label: 'Manage Addresses', desc: 'Saved delivery locations' },
    ];

    const initials = (user?.name || user?.phone || '?')[0].toUpperCase();

    if (!open) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9500,
                background: 'rgba(15,15,15,0.55)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                animation: 'fadeIn 0.2s ease',
            }}
            onClick={onClose}
        >
            {/* Panel — full height, right-aligned, max 100vw on mobile */}
            <div
                style={{
                    width: 'min(100vw, 380px)',
                    height: '100%',
                    background: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    boxShadow: '-12px 0 48px rgba(0,0,0,0.15)',
                    animation: 'slideInRight 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid #F0F0EE', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8E8E8E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Your Account
                        </span>
                        <button
                            onClick={onClose}
                            style={{
                                width: 32, height: 32, borderRadius: 9,
                                border: '1.5px solid #E0E0DC', background: '#F7F7F5',
                                cursor: 'pointer', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', color: '#4A4A4A', flexShrink: 0,
                            }}
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* Avatar row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: 15,
                            background: 'linear-gradient(135deg, #FFFBF0, #FFE4A3)',
                            border: '2px solid #F0CA5A',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.3rem', fontWeight: 800, color: '#9A7209', flexShrink: 0,
                        }}>
                            {initials}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            {user?.name && (
                                <p style={{ fontWeight: 800, fontSize: '1rem', color: '#0F0F0F', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user.name}
                                </p>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#8E8E8E' }}>
                                <Phone size={11} />
                                <span style={{ fontSize: '0.8rem' }}>{user?.phone}</span>
                            </div>
                            {user?.email && (
                                <p style={{ fontSize: '0.73rem', color: '#8E8E8E', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user.email}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Nav items ── */}
                <div style={{ flex: 1 }}>
                    {navItems.map((item) => (
                        <button
                            key={item.to}
                            onClick={() => handleNav(item.to)}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center',
                                gap: '0.85rem', padding: '0.9rem 1.25rem',
                                background: 'none', border: 'none',
                                borderBottom: '1px solid #F5F5F3',
                                cursor: 'pointer', textAlign: 'left',
                                transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#FAFAF8'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <div style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: '#FFFBF0', border: '1px solid rgba(232,163,23,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#E8A317', flexShrink: 0,
                            }}>
                                <item.icon size={17} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F0F0F', marginBottom: 2 }}>
                                    {item.label}
                                </p>
                                <p style={{ fontSize: '0.72rem', color: '#8E8E8E' }}>{item.desc}</p>
                            </div>
                            <ChevronRight size={15} color="#D4D4D0" style={{ flexShrink: 0 }} />
                        </button>
                    ))}

                    {/* Rate us */}
                    <a
                        href="https://maps.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClose}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center',
                            gap: '0.85rem', padding: '0.9rem 1.25rem',
                            textDecoration: 'none', color: 'inherit',
                            borderBottom: '1px solid #F5F5F3',
                            transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#FAFAF8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: '#FFF9EC', border: '1px solid rgba(232,163,23,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#E8A317', flexShrink: 0,
                        }}>
                            <Star size={17} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F0F0F', marginBottom: 2 }}>
                                Rate Us on Google
                            </p>
                            <p style={{ fontSize: '0.72rem', color: '#8E8E8E' }}>Share your experience ⭐</p>
                        </div>
                        <ChevronRight size={15} color="#D4D4D0" style={{ flexShrink: 0 }} />
                    </a>
                </div>

                {/* ── Logout ── */}
                <div style={{ padding: '1rem 1.25rem 2.5rem', borderTop: '1px solid #F0F0EE', flexShrink: 0 }}>
                    <button
                        onClick={handleSignOut}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: '0.6rem',
                            padding: '0.85rem', borderRadius: 13,
                            border: '1.5px solid #FCA5A5', background: '#FEF2F2',
                            color: '#DC2626', fontWeight: 700, fontSize: '0.9rem',
                            cursor: 'pointer', transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE2E2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#FEF2F2'; }}
                    >
                        <LogOut size={15} /> Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
