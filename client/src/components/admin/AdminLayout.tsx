import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, ClipboardList, UtensilsCrossed, Users, Settings,
    LogOut, ChevronLeft, Menu, ChefHat, Tag, Layers, MapPin, Bell, X,
} from 'lucide-react';
import { adminLogout, type IAdmin } from '@/services/adminApi';
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

export default function AdminLayout({ children }: AdminLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { pendingOrderCount } = useAdminContext();

    const admin: IAdmin | null = (() => {
        try { return JSON.parse(localStorage.getItem('bp_admin') || 'null'); }
        catch { return null; }
    })();

    const handleLogout = async () => {
        await adminLogout();
        navigate('/admin/login', { replace: true });
    };

    const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[260px]';

    // Get current page name for breadcrumb
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
            <div className={`flex-1 transition-all duration-300 md:ml-[260px] ${collapsed ? 'md:!ml-[72px]' : ''}`}>
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

                    {/* Notification bell */}
                    <button className="relative p-2.5 rounded-xl border border-[#EEEEEE] bg-white cursor-pointer hover:bg-[#F5F5F3] transition-colors">
                        <Bell size={18} className="text-[#4A4A4A]" />
                        {pendingOrderCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#DC2626] text-white text-[0.55rem] font-bold flex items-center justify-center">
                                {pendingOrderCount > 9 ? '9+' : pendingOrderCount}
                            </span>
                        )}
                    </button>

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
        </div>
    );
}
