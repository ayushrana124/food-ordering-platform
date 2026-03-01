import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, ClipboardList, UtensilsCrossed, Users, Settings,
    LogOut, ChevronLeft, Menu, ChefHat
} from 'lucide-react';
import { adminLogout, type IAdmin } from '@/services/adminApi';

interface AdminLayoutProps {
    children: React.ReactNode;
}

const NAV_ITEMS = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
    { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const admin: IAdmin | null = (() => {
        try { return JSON.parse(localStorage.getItem('bp_admin') || 'null'); }
        catch { return null; }
    })();

    const handleLogout = async () => {
        await adminLogout();
        navigate('/admin/login', { replace: true });
    };

    const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[250px]';

    return (
        <div className="flex min-h-screen bg-[#F5F5F3]">
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full z-50 bg-[#0F0F0F] text-white flex flex-col transition-all duration-300 ${sidebarWidth} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 h-[68px] border-b border-white/10 shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E8A317] to-[#F0B429] flex items-center justify-center shrink-0">
                        <ChefHat size={18} className="text-white" />
                    </div>
                    {!collapsed && (
                        <span className="font-outfit font-bold text-[1.05rem] tracking-[-0.02em] whitespace-nowrap">
                            BuntyPizza
                        </span>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-[0.65rem] rounded-xl text-[0.875rem] font-medium transition-all duration-200 no-underline ${isActive
                                    ? 'bg-[#E8A317]/15 text-[#E8A317]'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                                }`
                            }
                        >
                            <item.icon size={20} className="shrink-0" />
                            {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom: Collapse + Logout */}
                <div className="border-t border-white/10 px-3 py-3 flex flex-col gap-1 shrink-0">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden md:flex items-center gap-3 px-3 py-[0.6rem] rounded-xl text-white/50 hover:text-white/80 hover:bg-white/5 transition-all border-none bg-transparent cursor-pointer text-[0.875rem]"
                    >
                        <ChevronLeft size={20} className={`shrink-0 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
                        {!collapsed && <span>Collapse</span>}
                    </button>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-[0.6rem] rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border-none bg-transparent cursor-pointer text-[0.875rem] font-medium"
                    >
                        <LogOut size={20} className="shrink-0" />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main content area */}
            <div className={`flex-1 transition-all duration-300 md:ml-[250px] ${collapsed ? 'md:!ml-[72px]' : ''}`}>
                {/* Top bar */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#EEEEEE] h-[68px] flex items-center px-6 gap-4">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="md:hidden p-2 rounded-lg bg-transparent border border-[#EEEEEE] cursor-pointer text-[#0F0F0F]"
                    >
                        <Menu size={20} />
                    </button>

                    <div className="flex-1" />

                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-[0.8rem] font-semibold text-[#0F0F0F] leading-tight">{admin?.name || 'Admin'}</p>
                            <p className="text-[0.7rem] text-[#8E8E8E]">{admin?.role || 'OWNER'}</p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E8A317] to-[#F0B429] flex items-center justify-center text-white font-bold text-[0.85rem]">
                            {(admin?.name || 'A')[0].toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-6">{children}</main>
            </div>
        </div>
    );
}
