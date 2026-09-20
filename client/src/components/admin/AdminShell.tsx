import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ClipboardList, UtensilsCrossed, BarChart3, Settings as SettingsIcon,
    Layers, Tag, Users as UsersIcon, LogOut, ChefHat, WifiOff, BellRing, Volume2,
} from 'lucide-react';
import { useAdminContext } from '@/contexts/AdminContext';
import { useOrderAlert, acknowledgeOrders, previewChime } from '@/utils/orderAlert';
import { adminLogout } from '@/services/adminApi';

interface NavItem {
    to: string;
    label: string;
    short: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    /** Shown on phones' bottom bar. The rest live in More/sidebar only. */
    primary?: boolean;
}

const NAV: NavItem[] = [
    { to: '/admin/orders', label: 'Orders', short: 'Orders', icon: ClipboardList, primary: true },
    { to: '/admin/menu', label: 'Menu', short: 'Menu', icon: UtensilsCrossed, primary: true },
    { to: '/admin/dashboard', label: 'Reports', short: 'Reports', icon: BarChart3, primary: true },
    { to: '/admin/categories', label: 'Categories', short: 'Cats', icon: Layers },
    { to: '/admin/offers', label: 'Offers', short: 'Offers', icon: Tag },
    { to: '/admin/users', label: 'Customers', short: 'People', icon: UsersIcon },
    { to: '/admin/settings', label: 'Settings', short: 'More', icon: SettingsIcon, primary: true },
];

interface AdminShellProps {
    title: string;
    children: ReactNode;
    /** Rendered at the right of the header — filters, actions. */
    actions?: ReactNode;
}

/**
 * The admin chrome, for all three devices the shop actually uses.
 *
 * A fixed sidebar from 900px (counter laptop, tablet in landscape) and a bottom
 * bar below that (phone, tablet in portrait) — the same set of destinations,
 * placed where the hand already is on each.
 *
 * The header carries the two things staff must never have to hunt for: whether
 * the live order feed is connected, and how to silence the new-order alarm.
 */
export default function AdminShell({ title, children, actions }: AdminShellProps) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { pendingOrderCount, socketConnected } = useAdminContext();
    const { ringing, blocked } = useOrderAlert();

    const isOn = (to: string) => pathname.startsWith(to);

    const signOut = async () => {
        try { await adminLogout(); } catch { /* the token is cleared regardless */ }
        localStorage.removeItem('bp_admin_token');
        localStorage.removeItem('bp_admin');
        navigate('/admin/login');
    };

    return (
        <div className="a-app">
            {/* ── Sidebar (>=900px) ── */}
            <aside className="a-rail">
                <div className="a-rail__brand">
                    <span
                        style={{
                            width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center',
                            background: 'var(--c-brand)', color: 'var(--c-ink)', flex: 'none',
                        }}
                    >
                        <ChefHat size={17} />
                    </span>
                    Diamond Pizza
                </div>

                <nav style={{ marginTop: 6, flex: 1, overflowY: 'auto' }}>
                    {NAV.map((item) => {
                        const Icon = item.icon;
                        const active = isOn(item.to);
                        return (
                            <button
                                key={item.to}
                                type="button"
                                className="a-rail__link"
                                data-active={active}
                                onClick={() => navigate(item.to)}
                            >
                                <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                                {item.label}
                                {item.to === '/admin/orders' && pendingOrderCount > 0 && (
                                    <span className="a-rail__count">{pendingOrderCount > 99 ? '99+' : pendingOrderCount}</span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <button
                    type="button"
                    className="a-rail__link"
                    style={{ marginBottom: 14, color: '#FCA5A5' }}
                    onClick={signOut}
                >
                    <LogOut size={18} />
                    Sign out
                </button>
            </aside>

            {/* ── Main ── */}
            <div className="a-main">
                <header className="a-head">
                    <h1 className="a-head__title a-grow">{title}</h1>

                    {!socketConnected && (
                        <span className="a-pill a-pill--bad" title="Not receiving live orders. Reconnecting…">
                            <WifiOff size={14} />
                            <span className="hidden-xs">Offline</span>
                        </span>
                    )}

                    {ringing && (
                        <button
                            type="button"
                            className="a-pill a-pill--bad"
                            style={{ animation: 'cFade .6s ease infinite alternate' }}
                            onClick={acknowledgeOrders}
                        >
                            <BellRing size={14} />
                            Silence
                        </button>
                    )}

                    {blocked && !ringing && (
                        <button
                            type="button"
                            className="a-pill a-pill--warn"
                            title="Your browser has blocked the order alarm. Tap once to enable sound."
                            onClick={() => { void previewChime(); }}
                        >
                            <Volume2 size={14} />
                            <span className="hidden-xs">Enable sound</span>
                        </button>
                    )}

                    {actions}
                </header>

                {children}
            </div>

            {/* ── Bottom bar (<900px) ── */}
            <nav className="a-tabs" style={{ gridTemplateColumns: `repeat(${NAV.filter((n) => n.primary).length}, 1fr)` }}>
                {NAV.filter((n) => n.primary).map((item) => {
                    const Icon = item.icon;
                    const active = isOn(item.to);
                    return (
                        <button
                            key={item.to}
                            type="button"
                            className="a-tab"
                            data-active={active}
                            onClick={() => navigate(item.to)}
                        >
                            <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
                            {item.short}
                            {item.to === '/admin/orders' && pendingOrderCount > 0 && (
                                <span className="a-tab__count">{pendingOrderCount > 9 ? '9+' : pendingOrderCount}</span>
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
