import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Tag as TagIcon, X, Trash2, AlertTriangle } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useAppSelector } from '@/redux/hooks';
import AppShell, { TopBar } from '@/components/layout/AppShell';
import LoginModal from '@/components/common/LoginModal';
import { VegMark, Stepper, Empty, Tag, DishFallback } from '@/components/ui/Bits';
import { useT, money } from '@/i18n';
import toast from 'react-hot-toast';

export default function CartPage() {
    const navigate = useNavigate();
    const t = useT();
    const { isAuthenticated } = useAuth();
    const restaurant = useAppSelector((s) => s.menu.restaurant);

    const {
        items, subtotal, itemCount, discount, appliedCoupon,
        setQuantity, removeItem, applyCoupon, removeCoupon, isGuest, loading,
    } = useCart();

    const [couponInput, setCouponInput] = useState('');
    const [applying, setApplying] = useState(false);
    const [showLogin, setShowLogin] = useState(false);

    useEffect(() => { window.scrollTo(0, 0); }, []);

    const minOrder = restaurant?.minOrderAmount ?? 0;
    const shortfall = Math.max(0, minOrder - subtotal);
    const discountAmount = discount?.appliedDiscount ?? 0;
    const payable = Math.max(0, subtotal - discountAmount);

    const unavailable = items.filter((i) => !i.isAvailable);

    const handleApplyCoupon = async () => {
        const code = couponInput.trim().toUpperCase();
        if (!code) return;
        setApplying(true);
        try {
            await applyCoupon(code).unwrap();
            toast.success(t('cart.couponApplied', { code }));
            setCouponInput('');
        } catch (err) {
            toast.error(typeof err === 'string' ? err : t('common.somethingWrong'));
        } finally {
            setApplying(false);
        }
    };

    const handleCheckout = () => {
        // Signing in is deferred to exactly this point — everything before it
        // works as a guest, which is what keeps the basket from being abandoned.
        if (!isAuthenticated) { setShowLogin(true); return; }
        navigate('/checkout');
    };

    if (itemCount === 0) {
        return (
            <AppShell hideCartBar>
                <TopBar title={t('cart.title')} back="/menu" />
                <Empty
                    icon={ShoppingBag}
                    title={t('cart.empty')}
                    body={t('cart.emptyBody')}
                    action={
                        <button type="button" className="c-btn c-btn--primary" onClick={() => navigate('/menu')}>
                            {t('cart.startOrdering')}
                        </button>
                    }
                />
            </AppShell>
        );
    }

    return (
        <AppShell hideCartBar>
            <TopBar title={t('cart.title')} back="/menu" />

            {/* ── Items ── */}
            <div className="c-wrap" style={{ paddingTop: 8 }}>
                {items.map((item) => (
                    <div
                        key={item.cartItemId}
                        style={{
                            display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 12,
                            alignItems: 'start', paddingBlock: 14, borderBottom: '1px solid var(--c-line)',
                            opacity: item.isAvailable ? 1 : .55,
                        }}
                    >
                        <div style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface-2)' }}>
                            {item.image
                                ? <img src={item.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <DishFallback name={item.name} radius={0} />}
                        </div>

                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <VegMark isVeg={item.isVeg} size={12} />
                                <span style={{ font: '700 .88rem/1.3 "DM Sans", sans-serif', color: 'var(--c-ink)' }}>
                                    {item.name}
                                </span>
                            </div>

                            {item.selectedCustomizations.length > 0 && (
                                <p style={{ marginTop: 2, font: '400 .74rem/1.4 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>
                                    {item.selectedCustomizations.map((c) => c.optionName).join(' · ')}
                                </p>
                            )}

                            {!item.isAvailable && (
                                <span style={{ display: 'inline-block', marginTop: 4 }}>
                                    <Tag tone="danger">{t('menu.unavailable')}</Tag>
                                </span>
                            )}

                            <div style={{ marginTop: 8 }}>
                                <Stepper
                                    value={item.quantity}
                                    onChange={(next) => {
                                        if (next <= 0) {
                                            removeItem(item.cartItemId);
                                            toast.success(t('cart.removedItem'));
                                        } else {
                                            setQuantity(item.cartItemId, next);
                                        }
                                    }}
                                    min={0}
                                />
                            </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <p style={{ font: '800 .95rem/1 Outfit, sans-serif', color: 'var(--c-ink)' }}>
                                {money(item.itemTotal)}
                            </p>
                            <button
                                type="button"
                                onClick={() => { removeItem(item.cartItemId); toast.success(t('cart.removedItem')); }}
                                aria-label={t('cart.removedItem')}
                                style={{
                                    marginTop: 10, border: 0, background: 'none', cursor: 'pointer',
                                    color: 'var(--c-ink-3)', padding: 4,
                                }}
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {unavailable.length > 0 && (
                <div className="c-wrap" style={{ marginTop: 14 }}>
                    <div
                        style={{
                            display: 'flex', gap: 10, padding: 12, borderRadius: 'var(--c-r-md)',
                            background: 'var(--c-danger-wash)', color: 'var(--c-danger)',
                            font: '600 .78rem/1.45 "DM Sans", sans-serif',
                        }}
                    >
                        <AlertTriangle size={16} style={{ flex: 'none', marginTop: 1 }} />
                        {t('cart.someUnavailable')}
                    </div>
                </div>
            )}

            {/* ── Coupon ── */}
            {!isGuest && (
                <div className="c-wrap" style={{ marginTop: 20 }}>
                    {appliedCoupon && discount ? (
                        <div
                            className="c-card"
                            style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--c-ok-wash)', borderColor: '#BBF7D0' }}
                        >
                            <TagIcon size={17} style={{ color: 'var(--c-ok)', flex: 'none' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ font: '800 .84rem/1.2 "DM Sans", sans-serif', color: 'var(--c-ok)' }}>
                                    {appliedCoupon}
                                </p>
                                <p style={{ font: '500 .74rem/1.3 "DM Sans", sans-serif', color: 'var(--c-ink-2)' }}>
                                    {discount.title} · −{money(discount.appliedDiscount)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeCoupon()}
                                aria-label={t('cart.removeCoupon')}
                                style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--c-ink-3)', padding: 4 }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                className="c-field"
                                style={{ flex: 1, minHeight: 44, textTransform: 'uppercase' }}
                                placeholder={t('cart.coupon')}
                                value={couponInput}
                                onChange={(e) => setCouponInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCoupon(); }}
                            />
                            <button
                                type="button"
                                className="c-btn c-btn--ghost"
                                style={{ minHeight: 44 }}
                                onClick={handleApplyCoupon}
                                disabled={applying || !couponInput.trim()}
                            >
                                {t('cart.applyCoupon')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Bill ── */}
            <div className="c-wrap" style={{ marginTop: 20 }}>
                <div className="c-card" style={{ padding: 14 }}>
                    <Row label={t('cart.itemTotal')} value={money(subtotal)} />
                    {discountAmount > 0 && (
                        <Row label={t('cart.discount')} value={`− ${money(discountAmount)}`} tone="ok" />
                    )}
                    <Row label={t('cart.delivery')} value={t('cart.deliveryAtCheckout')} muted />
                    <div style={{ height: 1, background: 'var(--c-line)', marginBlock: 10 }} />
                    <Row label={t('cart.toPay')} value={money(payable)} strong />
                </div>
            </div>

            {shortfall > 0 && (
                <div className="c-wrap" style={{ marginTop: 12 }}>
                    <p
                        style={{
                            padding: 10, borderRadius: 'var(--c-r-md)', textAlign: 'center',
                            background: 'var(--c-brand-wash)', color: 'var(--c-brand-deep)',
                            font: '700 .8rem/1.4 "DM Sans", sans-serif',
                        }}
                    >
                        {t('cart.minOrderWarning', { amount: money(shortfall) })}
                    </p>
                </div>
            )}

            {/* ── Checkout ── */}
            <div className="c-bar c-bar--docked">
                <div className="c-bar__inner">
                    <button
                        type="button"
                        className="c-btn c-btn--primary c-btn--block c-btn--lg"
                        onClick={handleCheckout}
                        disabled={loading || shortfall > 0 || unavailable.length > 0}
                        style={{ justifyContent: 'space-between', paddingInline: 18 }}
                    >
                        <span>{money(payable)}</span>
                        <span>{t('cart.checkout')} →</span>
                    </button>
                </div>
            </div>

            {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        </AppShell>
    );
}

function Row({ label, value, strong, muted, tone }: {
    label: string; value: string; strong?: boolean; muted?: boolean; tone?: 'ok';
}) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBlock: 4 }}>
            <span style={{ font: `${strong ? 800 : 500} .86rem/1.4 "DM Sans", sans-serif`, color: strong ? 'var(--c-ink)' : 'var(--c-ink-2)' }}>
                {label}
            </span>
            <span
                style={{
                    font: `${strong ? 800 : 600} ${strong ? '1rem' : '.86rem'}/1.4 ${strong ? 'Outfit' : '"DM Sans"'}, sans-serif`,
                    color: tone === 'ok' ? 'var(--c-ok)' : muted ? 'var(--c-ink-3)' : 'var(--c-ink)',
                }}
            >
                {value}
            </span>
        </div>
    );
}
