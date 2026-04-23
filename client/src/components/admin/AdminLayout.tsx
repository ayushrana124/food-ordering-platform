import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
    LayoutDashboard, ClipboardList, UtensilsCrossed, Users, Settings,
    LogOut, ChevronLeft, Menu, ChefHat, Tag, Layers, MapPin, Bell, X,
    Clock, AlertCircle,
} from 'lucide-react';
import { adminLogout, type IAdmin, type IAdminOrder } from '@/services/adminApi';
import { useAdminContext } from '@/contexts/AdminContext';

interface AdminLayoutProps {
    children: React.ReactNode;
}

const NAV_ITEMS = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
    { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/admin/categories', label: 'Categories', icon: Layers },
    { to: '/admin/offers', label: 'Offers', icon: Tag },
    { to: '/admin/delivery-locations', label: 'Delivery', icon: MapPin },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
];

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const bellRef = useRef<HTMLButtonElement>(null);
    const { pendingOrderCount, unacceptedOrders, activeOrderCount } = useAdminContext();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Listen for order detail sidebar open/close events to hide the FAB
    useEffect(() => {
        const handleOpen = () => setSidebarOpen(true);
        const handleClose = () => setSidebarOpen(false);
        window.addEventListener('admin-sidebar-open', handleOpen);
        window.addEventListener('admin-sidebar-close', handleClose);
        return () => {
            window.removeEventListener('admin-sidebar-open', handleOpen);
            window.removeEventListener('admin-sidebar-close', handleClose);
        };
    }, []);

    const admin: IAdmin | null = (() => {
        try { return JSON.parse(localStorage.getItem('bp_admin') || 'null'); }
        catch { return null; }
    })();

    const handleLogout = async () => {
        await adminLogout();
        navigate('/admin/login', { replace: true });
    };

    // Close notification dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                notifRef.current && !notifRef.current.contains(e.target as Node) &&
                bellRef.current && !bellRef.current.contains(e.target as Node)
            ) {
                setNotifOpen(false);
            }
        };
        if (notifOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [notifOpen]);

    const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[260px]';
    const currentPage = NAV_ITEMS.find(item => location.pathname.startsWith(item.to))?.label || 'Admin';

    return (
        <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #F8F8F6 0%, #F2F1EF 100%)' }}>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full z-50 text-white flex flex-col transition-all duration-300 ${sidebarWidth} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
                style={{ background: 'linear-gradient(180deg, #111111 0%, #1A1714 100%)' }}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 h-[72px] border-b border-white/8 shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8A317] to-[#F0B429] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(232,163,23,0.3)]">
                        <ChefHat size={20} className="text-white" />
                    </div>
                    {!collapsed && (
                        <span className="font-outfit font-bold text-[1.1rem] tracking-[-0.02em] whitespace-nowrap">
                            BuntyPizza
                        </span>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 py-5 px-3 flex flex-col gap-1 overflow-y-auto">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                                `relative flex items-center gap-3 px-3 py-[0.7rem] rounded-xl text-[0.85rem] font-medium transition-all duration-200 no-underline group ${isActive
                                    ? 'bg-[#E8A317]/12 text-[#F0B429]'
                                    : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-[#E8A317]" />
                                    )}
                                    <item.icon size={20} className="shrink-0" />
                                    {!collapsed && (
                                        <span className="whitespace-nowrap flex-1">{item.label}</span>
                                    )}
                                    {/* Pending order badge */}
                                    {item.label === 'Orders' && pendingOrderCount > 0 && !collapsed && (
                                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#DC2626] text-white text-[0.65rem] font-bold flex items-center justify-center animate-pulse">
                                            {pendingOrderCount > 99 ? '99+' : pendingOrderCount}
                                        </span>
                                    )}
                                    {item.label === 'Orders' && pendingOrderCount > 0 && collapsed && (
                                        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-pulse" />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom: Collapse + Logout */}
                <div className="border-t border-white/8 px-3 py-3 flex flex-col gap-1 shrink-0">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden md:flex items-center gap-3 px-3 py-[0.6rem] rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-all border-none bg-transparent cursor-pointer text-[0.85rem]"
                    >
                        <ChevronLeft size={20} className={`shrink-0 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
                        {!collapsed && <span>Collapse</span>}
                    </button>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-[0.6rem] rounded-xl text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all border-none bg-transparent cursor-pointer text-[0.85rem] font-medium"
                    >
                        <LogOut size={20} className="shrink-0" />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main content area */}
            <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 md:ml-[260px] ${collapsed ? 'md:!ml-[72px]' : ''}`}>
                {/* Top bar */}
                <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-[#EEEEEE]/60 h-[72px] flex items-center px-4 sm:px-6 gap-3">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="md:hidden p-2.5 rounded-xl bg-transparent border border-[#EEEEEE] cursor-pointer text-[#0F0F0F] hover:bg-[#F5F5F3] transition-colors"
                    >
                        <Menu size={20} />
                    </button>

                    {/* Page title */}
                    <h1 className="font-outfit font-extrabold text-[1.05rem] sm:text-[1.2rem] text-[#0F0F0F] tracking-[-0.02em]">
                        {currentPage}
                    </h1>

                    <div className="flex-1" />

                    {/* Notification bell with dropdown */}
                    <div className="relative">
                        <button
                            ref={bellRef}
                            onClick={() => setNotifOpen((p) => !p)}
                            className="relative p-2.5 rounded-xl border border-[#EEEEEE] bg-white cursor-pointer hover:bg-[#F5F5F3] transition-colors"
                        >
                            <Bell size={18} className="text-[#4A4A4A]" />
                            {pendingOrderCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[0.55rem] font-bold flex items-center justify-center animate-pulse">
                                    {pendingOrderCount > 9 ? '9+' : pendingOrderCount}
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {notifOpen && (
                            <div
                                ref={notifRef}
                                className="absolute right-0 top-[calc(100%+8px)] w-[340px] sm:w-[380px] bg-white rounded-2xl border border-[#EEEEEE] shadow-[0_12px_48px_rgba(0,0,0,0.12)] z-50 overflow-hidden"
                                style={{ maxHeight: 'min(480px, 70vh)' }}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0EE] bg-[#FAFAF8]">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={15} className="text-[#D97706]" />
                                        <span className="text-[0.82rem] font-bold text-[#0F0F0F]">
                                            Unaccepted Orders
                                        </span>
                                        {pendingOrderCount > 0 && (
                                            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#D97706] text-white text-[0.6rem] font-bold flex items-center justify-center">
                                                {pendingOrderCount}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setNotifOpen(false)}
                                        className="p-1 rounded-lg hover:bg-[#F0F0EE] transition-colors border-none bg-transparent cursor-pointer"
                                    >
                                        <X size={14} className="text-[#8E8E8E]" />
                                    </button>
                                </div>

                                {/* Order list */}
                                <div className="overflow-y-auto" style={{ maxHeight: 'min(380px, 55vh)' }}>
                                    {unacceptedOrders.length === 0 ? (
                                        <div className="py-10 text-center">
                                            <ClipboardList size={28} className="mx-auto text-[#D4D4D0] mb-2" />
                                            <p className="text-[0.8rem] text-[#8E8E8E] font-medium">No pending orders</p>
                                            <p className="text-[0.7rem] text-[#B0B0B0] mt-0.5">All caught up!</p>
                                        </div>
                                    ) : (
                                        unacceptedOrders.map((order) => (
                                            <NotifOrderRow
                                                key={order._id}
                                                order={order}
                                                onClick={() => {
                                                    setNotifOpen(false);
                                                    navigate('/admin/orders');
                                                }}
                                            />
                                        ))
                                    )}
                                </div>

                                {/* Footer */}
                                {unacceptedOrders.length > 0 && (
                                    <div className="border-t border-[#F0F0EE] px-4 py-2.5 bg-[#FAFAF8]">
                                        <button
                                            onClick={() => { setNotifOpen(false); navigate('/admin/orders'); }}
                                            className="w-full text-center text-[0.75rem] font-semibold text-[#E8A317] hover:text-[#D49516] transition-colors bg-transparent border-none cursor-pointer py-1"
                                        >
                                            View All Orders →
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Admin profile */}
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-[0.82rem] font-semibold text-[#0F0F0F] leading-tight">{admin?.name || 'Admin'}</p>
                            <p className="text-[0.7rem] text-[#8E8E8E]">{admin?.role || 'OWNER'}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8A317] to-[#F0B429] flex items-center justify-center text-white font-bold text-[0.9rem] shadow-[0_2px_8px_rgba(232,163,23,0.25)]">
                            {(admin?.name || 'A')[0].toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 sm:p-6 lg:p-8">{children}</main>
            </div>

            {/* ── Sticky Active Orders FAB (bottom-right) — hidden when order detail sidebar is open ── */}
            {activeOrderCount > 0 && !sidebarOpen && createPortal(
                <button
                    onClick={() => navigate('/admin/orders')}
                    style={{
                        position: 'fixed',
                        bottom: 'clamp(1rem, 3vw, 1.5rem)',
                        right: 'clamp(0.75rem, 2.5vw, 1.25rem)',
                        zIndex: 9999,
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'linear-gradient(135deg, #1A1714 0%, #111111 100%)',
                        border: '1.5px solid rgba(232,163,23,0.3)',
                        borderRadius: 16,
                        padding: '0.6rem 1rem',
                        cursor: 'pointer',
                        boxShadow: '0 6px 24px rgba(0,0,0,0.18), 0 2px 8px rgba(232,163,23,0.15)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        animation: 'adminFabBlink 2s ease-in-out infinite, adminFabSlideIn 0.4s cubic-bezier(0.22, 0.61, 0.36, 1)',
                        color: 'white',
                        fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 10px 32px rgba(0,0,0,0.22), 0 4px 12px rgba(232,163,23,0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.18), 0 2px 8px rgba(232,163,23,0.15)';
                    }}
                >
                    {/* Pulse dot */}
                    <span style={{
                        position: 'absolute', top: -3, left: -3,
                        width: 10, height: 10, borderRadius: '50%',
                        background: '#DC2626',
                        animation: 'adminFabPulse 2s ease-in-out infinite',
                    }} />

                    {/* Count badge */}
                    <span style={{
                        minWidth: 28, height: 28, borderRadius: 10,
                        background: 'linear-gradient(135deg, #E8A317, #F0B429)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.82rem', fontWeight: 800, color: '#fff',
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(232,163,23,0.3)',
                    }}>
                        {activeOrderCount > 99 ? '99+' : activeOrderCount}
                    </span>

                    <div style={{ textAlign: 'left' }}>
                        <p style={{
                            fontSize: '0.68rem', fontWeight: 700, color: '#fff',
                            margin: 0, lineHeight: 1.1, letterSpacing: '0.01em',
                            whiteSpace: 'nowrap',
                        }}>
                            Orders On Hold
                        </p>
                        <p style={{
                            fontSize: '0.55rem', fontWeight: 600, color: 'rgba(255,255,255,0.55)',
                            margin: '2px 0 0', lineHeight: 1,
                            whiteSpace: 'nowrap',
                        }}>
                            Tap to view
                        </p>
                    </div>

                    <style>{`
                        @keyframes adminFabBlink {
                            0%, 100% { border-color: rgba(232,163,23,0.3); }
                            50% { border-color: rgba(232,163,23,0.7); }
                        }
                        @keyframes adminFabSlideIn {
                            from { opacity: 0; transform: translateX(20px) scale(0.9); }
                            to { opacity: 1; transform: translateX(0) scale(1); }
                        }
                        @keyframes adminFabPulse {
                            0%, 100% { opacity: 1; transform: scale(1); }
                            50% { opacity: 0.5; transform: scale(1.4); }
                        }
                    `}</style>
                </button>,
                document.body,
            )}
        </div>
    );
}

/** Single row in the notification dropdown */
function NotifOrderRow({ order, onClick }: { order: IAdminOrder; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left px-4 py-3 hover:bg-[#FFFBF0] transition-colors border-none bg-transparent cursor-pointer border-b border-[#F5F5F3]"
            style={{ borderBottom: '1px solid #F5F5F3' }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: '#FFFBF0', border: '1px solid #FDE68A',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <Clock size={14} style={{ color: '#D97706' }} />
                    </div>
                    <div className="min-w-0">
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F0F0F', margin: 0, lineHeight: 1.2 }}>
                            #{order.orderId}
                        </p>
                        <p style={{ fontSize: '0.68rem', color: '#8E8E8E', margin: '2px 0 0', lineHeight: 1 }} className="truncate">
                            {order.userId?.name || 'Guest'} • {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F0F0F', margin: 0 }}>
                        {'\u20B9'}{order.total}
                    </p>
                    <p style={{ fontSize: '0.6rem', color: '#B0B0B0', margin: '2px 0 0' }}>
                        {timeAgo(order.createdAt)}
                    </p>
                </div>
            </div>
        </button>
    );
}
