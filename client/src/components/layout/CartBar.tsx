import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useT, money } from '@/i18n';

/**
 * The floating "you have a basket" bar.
 *
 * Sits directly above the bottom navigation so the cart is always one thumb-tap
 * away, and disappears entirely when empty rather than showing an empty state
 * the customer has to think about. Hidden on the pages that already show the
 * basket, where it would be a second, competing call to action.
 */
export default function CartBar() {
    const { itemCount, total } = useCart();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const t = useT();

    const hiddenOn = ['/cart', '/checkout', '/account'];
    if (itemCount === 0 || hiddenOn.some((p) => pathname.startsWith(p)) || pathname.startsWith('/order/')) {
        return null;
    }

    return (
        <div className="c-bar">
            <div className="c-bar__inner">
                <button
                    type="button"
                    onClick={() => navigate('/cart')}
                    className="c-btn c-btn--primary c-btn--block"
                    style={{ height: 54, borderRadius: 'var(--c-r-lg)', justifyContent: 'space-between', paddingInline: 16 }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ShoppingBag size={18} />
                        <span style={{ textAlign: 'left', lineHeight: 1.25 }}>
                            <span style={{ display: 'block', fontSize: '.78rem', opacity: .75, fontWeight: 600 }}>
                                {itemCount === 1
                                    ? t('cart.itemsCount', { n: itemCount })
                                    : t('cart.itemsCountPlural', { n: itemCount })}
                            </span>
                            <span style={{ display: 'block', font: '800 1rem/1.2 Outfit, sans-serif' }}>
                                {money(total)}
                            </span>
                        </span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}>
                        {t('cart.viewCart')}
                        <ArrowRight size={17} />
                    </span>
                </button>
            </div>
        </div>
    );
}
