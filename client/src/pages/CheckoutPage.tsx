import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Banknote, CreditCard, Check, Loader2, AlertTriangle, Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setCurrentOrder } from '@/redux/slices/orderSlice';
import { resetCart } from '@/redux/slices/cartSlice';
import { orderService } from '@/services/orderService';
import { userService } from '@/services/userService';
import { updateUser } from '@/redux/slices/authSlice';
import type { IAddress, PaymentMethod } from '@/types';
import AppShell, { TopBar } from '@/components/layout/AppShell';
import AddressSheet from '@/components/address/AddressSheet';
import { VegMark, Tag } from '@/components/ui/Bits';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useT, money } from '@/i18n';
import { distanceKm, deliveryFee } from '@/utils/delivery';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const t = useT();
    const { user } = useAuth();
    const restaurant = useAppSelector((s) => s.menu.restaurant);
    const { items, subtotal, itemCount, discount } = useCart();

    const [addresses, setAddresses] = useState<IAddress[]>(user?.addresses ?? []);
    const [selectedId, setSelectedId] = useState<string>('');
    const [sheetOpen, setSheetOpen] = useState(false);
    const [payment, setPayment] = useState<PaymentMethod>('COD');
    const [instructions, setInstructions] = useState('');
    const [placing, setPlacing] = useState(false);

    // Guards the empty-cart redirect from firing on the success navigation,
    // when the cart has legitimately just been emptied.
    const placedRef = useRef(false);

    useEffect(() => { window.scrollTo(0, 0); }, []);

    useEffect(() => {
        userService.getProfile()
            .then((profile) => {
                setAddresses(profile.addresses);
                setSelectedId((current) =>
                    current || profile.addresses.find((a) => a.isDefault)?._id || profile.addresses[0]?._id || ''
                );
            })
            .catch(() => { /* fall back to whatever the auth slice already has */ });
    }, []);

    useEffect(() => {
        if (itemCount === 0 && !placedRef.current) navigate('/cart', { replace: true });
    }, [itemCount, navigate]);

    const selected = addresses.find((a) => a._id === selectedId) ?? null;

    // ── Delivery fee, previewed from the same rules the server applies ───────
    const { fee, km, outOfRange } = useMemo(() => {
        const shop = restaurant?.address?.coordinates;
        const to = selected?.coordinates;
        if (!shop || !to) return { fee: null as number | null, km: null as number | null, outOfRange: false };

        const d = distanceKm(shop.lat, shop.lng, to.lat, to.lng);
        const f = deliveryFee(d);
        return {
            fee: f,
            km: d,
            outOfRange: f === null || d > (restaurant?.deliveryRadius ?? 10),
        };
    }, [restaurant, selected]);

    const discountAmount = discount?.appliedDiscount ?? 0;
    const payable = Math.max(0, subtotal + (fee ?? 0) - discountAmount);

    const codBlocked = user?.isCODBlocked === true;
    const canPlace = !!selected && !outOfRange && itemCount > 0 && !(payment === 'COD' && codBlocked);

    const placeOrder = async () => {
        if (!selected) { setSheetOpen(true); return; }
        setPlacing(true);
        try {
            const { order } = await orderService.createOrder({
                deliveryAddress: selected,
                addressId: selected._id,
                paymentMethod: payment,
                ...(instructions.trim() ? { specialInstructions: instructions.trim() } : {}),
            });

            placedRef.current = true;
            dispatch(setCurrentOrder(order));
            dispatch(resetCart());
            navigate(`/order/${order._id}`, { replace: true });
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? t('common.somethingWrong'));
        } finally {
            setPlacing(false);
        }
    };

    return (
        <AppShell bare hideCartBar>
            <TopBar title={t('checkout.title')} back="/cart" />

            <div style={{ paddingBottom: 140 }}>
                {/* ── Address ── */}
                <section className="c-wrap" style={{ paddingTop: 16 }}>
                    <SectionTitle>{t('checkout.deliverTo')}</SectionTitle>

                    {selected ? (
                        <div className="c-card" style={{ padding: 14, display: 'flex', gap: 12 }}>
                            <MapPin size={18} style={{ flex: 'none', marginTop: 2, color: 'var(--c-brand-deep)' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <span style={{ font: '800 .88rem/1.2 "DM Sans", sans-serif', color: 'var(--c-ink)' }}>
                                        {selected.label}
                                    </span>
                                    {km !== null && <Tag tone={outOfRange ? 'danger' : 'brand'}>{km} km</Tag>}
                                </div>
                                <p style={{ marginTop: 3, font: '400 .82rem/1.45 "DM Sans", sans-serif', color: 'var(--c-ink-2)' }}>
                                    {selected.addressLine}
                                    {selected.landmark ? ` · ${selected.landmark}` : ''}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSheetOpen(true)}
                                style={{
                                    border: 0, background: 'none', cursor: 'pointer', padding: 0, flex: 'none',
                                    font: '700 .8rem/1 "DM Sans", sans-serif', color: 'var(--c-brand-deep)',
                                }}
                            >
                                {t('checkout.changeAddress')}
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="c-btn c-btn--line c-btn--block"
                            style={{ minHeight: 56 }}
                            onClick={() => setSheetOpen(true)}
                        >
                            <Plus size={17} />
                            {t('checkout.addAddress')}
                        </button>
                    )}

                    {outOfRange && (
                        <Notice tone="danger">
                            {t('address.outOfRange', { km: restaurant?.deliveryRadius ?? 10, dist: km ?? 0 })}
                        </Notice>
                    )}
                </section>

                {/* ── Payment ── */}
                <section className="c-wrap" style={{ marginTop: 24 }}>
                    <SectionTitle>{t('checkout.payment')}</SectionTitle>

                    <PaymentOption
                        icon={Banknote}
                        title={t('checkout.cod')}
                        note={codBlocked ? t('checkout.codBlocked') : t('checkout.codNote')}
                        selected={payment === 'COD'}
                        disabled={codBlocked}
                        onSelect={() => setPayment('COD')}
                    />
                    <PaymentOption
                        icon={CreditCard}
                        title={t('checkout.online')}
                        note={t('checkout.onlineDisabled')}
                        selected={false}
                        disabled
                        onSelect={() => {}}
                    />
                </section>

                {/* ── Instructions ── */}
                <section className="c-wrap" style={{ marginTop: 24 }}>
                    <SectionTitle>{t('checkout.instructions')}</SectionTitle>
                    <textarea
                        className="c-field"
                        rows={2}
                        maxLength={500}
                        placeholder={t('checkout.instructionsPlaceholder')}
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        style={{ resize: 'none' }}
                    />
                </section>

                {/* ── Summary ── */}
                <section className="c-wrap" style={{ marginTop: 24 }}>
                    <SectionTitle>{t('checkout.orderSummary')}</SectionTitle>

                    <div className="c-card" style={{ padding: 14 }}>
                        {items.map((item) => (
                            <div key={item.cartItemId} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBlock: 6 }}>
                                <VegMark isVeg={item.isVeg} size={12} />
                                <span style={{ flex: 1, minWidth: 0, font: '500 .84rem/1.4 "DM Sans", sans-serif', color: 'var(--c-ink-2)' }}>
                                    {item.quantity} × {item.name}
                                    {item.selectedCustomizations.length > 0 && (
                                        <span style={{ display: 'block', font: '400 .74rem/1.35 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>
                                            {item.selectedCustomizations.map((c) => c.optionName).join(' · ')}
                                        </span>
                                    )}
                                </span>
                                <span style={{ font: '700 .84rem/1.4 "DM Sans", sans-serif', color: 'var(--c-ink)' }}>
                                    {money(item.itemTotal)}
                                </span>
                            </div>
                        ))}

                        <div style={{ height: 1, background: 'var(--c-line)', marginBlock: 10 }} />

                        <BillRow label={t('cart.itemTotal')} value={money(subtotal)} />
                        {discountAmount > 0 && <BillRow label={t('cart.discount')} value={`− ${money(discountAmount)}`} tone="ok" />}
                        <BillRow
                            label={t('cart.delivery')}
                            value={fee === null ? '—' : fee === 0 ? t('common.free') : money(fee)}
                        />

                        <div style={{ height: 1, background: 'var(--c-line)', marginBlock: 10 }} />
                        <BillRow label={t('cart.toPay')} value={money(payable)} strong />
                    </div>
                </section>
            </div>

            {/* ── Place order ── */}
            <div className="c-bar c-bar--solo">
                <div className="c-bar__inner">
                    <button
                        type="button"
                        className="c-btn c-btn--primary c-btn--block c-btn--lg"
                        style={{ justifyContent: 'space-between', paddingInline: 18 }}
                        onClick={placeOrder}
                        disabled={!canPlace || placing}
                    >
                        <span>{money(payable)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {placing && <Loader2 size={17} className="animate-spin" />}
                            {placing ? t('checkout.placing') : t('checkout.placeOrder')}
                        </span>
                    </button>
                </div>
            </div>

            <AddressSheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                addresses={addresses}
                selectedId={selectedId}
                restaurant={restaurant}
                onSelect={(a) => setSelectedId(a._id)}
                onChanged={(all) => {
                    setAddresses(all);
                    if (user) dispatch(updateUser({ ...user, addresses: all }));
                }}
            />
        </AppShell>
    );
}

// ── Small pieces ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h2 style={{ marginBottom: 10, font: '800 .84rem/1 "DM Sans", sans-serif', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--c-ink-3)' }}>
            {children}
        </h2>
    );
}

function Notice({ tone, children }: { tone: 'danger'; children: React.ReactNode }) {
    return (
        <div
            style={{
                marginTop: 10, display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 'var(--c-r-md)',
                background: 'var(--c-danger-wash)', color: 'var(--c-danger)',
                font: '600 .78rem/1.45 "DM Sans", sans-serif',
            }}
        >
            <AlertTriangle size={15} style={{ flex: 'none', marginTop: 1 }} />
            {children}
        </div>
    );
}

function PaymentOption({ icon: Icon, title, note, selected, disabled, onSelect }: {
    icon: React.ComponentType<{ size?: number }>;
    title: string;
    note: string;
    selected: boolean;
    disabled?: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            disabled={disabled}
            style={{
                width: '100%', marginBottom: 10, padding: 14, borderRadius: 'var(--c-r-lg)', border: 0,
                cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12,
                background: selected ? 'var(--c-brand-wash)' : 'var(--c-surface)',
                boxShadow: `inset 0 0 0 1.5px ${selected ? 'var(--c-brand)' : 'var(--c-line)'}`,
                opacity: disabled ? .55 : 1,
            }}
        >
            <Icon size={19} />
            <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', font: '700 .88rem/1.2 "DM Sans", sans-serif', color: 'var(--c-ink)' }}>{title}</span>
                <span style={{ display: 'block', marginTop: 2, font: '400 .76rem/1.35 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>{note}</span>
            </span>
            <span
                style={{
                    width: 20, height: 20, flex: 'none', borderRadius: 999, display: 'grid', placeItems: 'center',
                    background: selected ? 'var(--c-brand)' : 'transparent',
                    boxShadow: selected ? 'none' : 'inset 0 0 0 1.5px var(--c-line-strong)',
                    color: 'var(--c-ink)',
                }}
            >
                {selected && <Check size={12} strokeWidth={3.5} />}
            </span>
        </button>
    );
}

function BillRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'ok' }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBlock: 3 }}>
            <span style={{ font: `${strong ? 800 : 500} .86rem/1.4 "DM Sans", sans-serif`, color: strong ? 'var(--c-ink)' : 'var(--c-ink-2)' }}>
                {label}
            </span>
            <span
                style={{
                    font: `${strong ? 800 : 600} ${strong ? '1rem' : '.86rem'}/1.4 ${strong ? 'Outfit' : '"DM Sans"'}, sans-serif`,
                    color: tone === 'ok' ? 'var(--c-ok)' : 'var(--c-ink)',
                }}
            >
                {value}
            </span>
        </div>
    );
}
