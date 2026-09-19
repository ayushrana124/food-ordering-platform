import { useNavigate, useLocation } from 'react-router-dom';
import { Home, UtensilsCrossed, ReceiptText, User } from 'lucide-react';
import { useT } from '@/i18n';
import { useAppSelector } from '@/redux/hooks';
import type { StringKey } from '@/i18n/strings';

interface Tab {
    to: string;
    labelKey: StringKey;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    /** Paths that should also light this tab. */
    match: (path: string) => boolean;
}

const TABS: Tab[] = [
    { to: '/', labelKey: 'nav.home', icon: Home, match: (p) => p === '/' },
    { to: '/menu', labelKey: 'nav.menu', icon: UtensilsCrossed, match: (p) => p.startsWith('/menu') },
    { to: '/orders', labelKey: 'nav.orders', icon: ReceiptText, match: (p) => p.startsWith('/orders') || p.startsWith('/order/') },
    { to: '/account', labelKey: 'nav.account', icon: User, match: (p) => p.startsWith('/account') },
];

/**
 * Persistent bottom navigation.
 *
 * Replaces the previous mix of a top navbar and two floating action buttons,
 * which between them occupied the same thumb zone and left no stable place to
 * get back to the menu. Four destinations is the practical ceiling for reachable
 * targets on a 360px screen.
 */
export default function BottomNav() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const t = useT();

    // Orders worth surfacing a badge for: anything still in flight.
    const activeOrders = useAppSelector((s) =>
        s.order.orders.filter((o) =>
            ['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)
        ).length
    );

    return (
        <nav className="c-nav" aria-label="Main">
            {TABS.map((tab) => {
                const active = tab.match(pathname);
                const Icon = tab.icon;
                const badge = tab.to === '/orders' ? activeOrders : 0;

                return (
                    <button
                        key={tab.to}
                        type="button"
                        className="c-nav__item"
                        data-active={active}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => navigate(tab.to)}
                    >
                        <Icon size={21} strokeWidth={active ? 2.4 : 1.9} />
                        <span>{t(tab.labelKey)}</span>
                        {badge > 0 && <span className="c-nav__dot">{badge > 9 ? '9+' : badge}</span>}
                    </button>
                );
            })}
        </nav>
    );
}
