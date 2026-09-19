import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import BottomNav from './BottomNav';
import CartBar from './CartBar';
import { useCart } from '@/hooks/useCart';

interface AppShellProps {
    children: ReactNode;
    /** Hides the bottom nav — used by focused flows like checkout. */
    bare?: boolean;
    /** Suppresses the floating cart bar on pages that show the basket themselves. */
    hideCartBar?: boolean;
}

/**
 * Wraps every customer screen so the chrome — bottom navigation, cart bar and
 * the padding that keeps content clear of both — is defined in exactly one place.
 */
export default function AppShell({ children, bare = false, hideCartBar = false }: AppShellProps) {
    const { itemCount } = useCart();
    const showCartBar = !hideCartBar && itemCount > 0;

    return (
        <div className="c-app">
            <main className={showCartBar && !bare ? 'c-page c-page--with-bar' : bare ? '' : 'c-page'}>
                {children}
            </main>
            {!hideCartBar && <CartBar />}
            {!bare && <BottomNav />}
        </div>
    );
}

interface TopBarProps {
    title?: string;
    /** Shows a back chevron. Pass a path to force where it goes. */
    back?: boolean | string;
    right?: ReactNode;
    /** Renders below the title row — used for search fields and filter strips. */
    below?: ReactNode;
    /** Keeps the bar pinned while the page scrolls. */
    sticky?: boolean;
}

/**
 * Page header. Deliberately short: on a 640px-tall phone every pixel of chrome
 * is a pixel not showing food, so this is a single 52px row.
 */
export function TopBar({ title, back, right, below, sticky = true }: TopBarProps) {
    const navigate = useNavigate();

    const goBack = () => {
        if (typeof back === 'string') navigate(back);
        else if (window.history.length > 1) navigate(-1);
        else navigate('/');
    };

    return (
        <header
            style={{
                position: sticky ? 'sticky' : 'relative',
                top: 0,
                zIndex: 90,
                background: 'var(--c-bg)',
                paddingTop: 'var(--safe-t)',
                borderBottom: below ? 'none' : '1px solid var(--c-line)',
            }}
        >
            <div
                className="c-wrap"
                style={{ height: 52, display: 'flex', alignItems: 'center', gap: 10 }}
            >
                {back && (
                    <button
                        type="button"
                        onClick={goBack}
                        aria-label="Go back"
                        style={{
                            width: 36, height: 36, marginLeft: -8, flex: 'none',
                            display: 'grid', placeItems: 'center',
                            border: 0, background: 'none', cursor: 'pointer', color: 'var(--c-ink)',
                        }}
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}

                {title && (
                    <h1
                        style={{
                            flex: 1, minWidth: 0,
                            font: '800 1.12rem/1.2 Outfit, sans-serif',
                            color: 'var(--c-ink)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                    >
                        {title}
                    </h1>
                )}

                {!title && <div style={{ flex: 1 }} />}
                {right}
            </div>

            {below}
        </header>
    );
}
