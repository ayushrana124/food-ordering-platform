import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Clock, Heart, RotateCcw, ChevronRight, Pizza, Store } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchMenuItems, fetchCategories, fetchRestaurant, fetchOffers } from '@/redux/slices/menuSlice';
import { setOrders } from '@/redux/slices/orderSlice';
import { reorder } from '@/redux/slices/cartSlice';
import { orderService } from '@/services/orderService';
import type { IMenuItem, IOrder } from '@/types';
import AppShell from '@/components/layout/AppShell';
import DishCard from '@/components/menu/DishCard';
import DishSheet from '@/components/menu/DishSheet';
import LoginModal from '@/components/common/LoginModal';
import { Tag, Skeleton, DishFallback } from '@/components/ui/Bits';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { useT, money } from '@/i18n';
import toast from 'react-hot-toast';

export default function HomePage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const t = useT();
    const { isAuthenticated, user } = useAuth();
    const { items: favItems, refresh: refreshFavorites, loaded: favLoaded } = useFavorites();

    const { items, categories, restaurant, offers, loading } = useAppSelector((s) => s.menu);
    const orders = useAppSelector((s) => s.order.orders);

    const [openDish, setOpenDish] = useState<IMenuItem | null>(null);
    const [showLogin, setShowLogin] = useState(false);
    const [reordering, setReordering] = useState<string | null>(null);

    useEffect(() => {
        dispatch(fetchMenuItems({}));
        dispatch(fetchCategories());
        dispatch(fetchRestaurant());
        dispatch(fetchOffers());
    }, [dispatch]);

    useEffect(() => {
        if (!isAuthenticated) return;
        if (!favLoaded) refreshFavorites();
        orderService.getUserOrders(1, 5)
            .then((res) => dispatch(setOrders(res.orders)))
            .catch(() => { /* the Orders tab surfaces failures; the home rail just stays hidden */ });
    }, [isAuthenticated, dispatch, favLoaded, refreshFavorites]);

    const defaultAddress = user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0];
    const isClosed = restaurant?.isOpen === false;

    // Most recent delivered orders are the ones worth offering to repeat.
    const reorderable = useMemo(
        () => orders.filter((o) => o.orderStatus === 'DELIVERED').slice(0, 5),
        [orders]
    );

    const popular = useMemo(() => items.filter((i) => i.isAvailable).slice(0, 4), [items]);

    const handleReorder = async (order: IOrder) => {
        setReordering(order._id);
        try {
            const result = await dispatch(reorder(order._id)).unwrap();
            const skipped = (result as { skipped?: string[] }).skipped ?? [];
            toast.success(t('orders.reordered'));
            if (skipped.length > 0) toast(t('orders.someItemsGone'), { icon: '⚠️' });
            navigate('/cart');
        } catch (err) {
            toast.error(typeof err === 'string' ? err : t('common.somethingWrong'));
        } finally {
            setReordering(null);
        }
    };

    return (
        <AppShell>
            {/* ── Location + brand header ── */}
            <header style={{ paddingTop: 'calc(var(--safe-t) + 12px)', background: 'var(--c-bg)' }}>
                <div className="c-wrap" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        type="button"
                        onClick={() => navigate(isAuthenticated ? '/account' : '/cart')}
                        style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 0, background: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--c-ink-3)', font: '700 .68rem/1 "DM Sans", sans-serif', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                            <MapPin size={11} />
                            {t('home.deliverTo')}
                        </span>
                        <span
                            style={{
                                display: 'block', marginTop: 3,
                                font: '700 .95rem/1.2 "DM Sans", sans-serif', color: 'var(--c-ink)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                        >
                            {defaultAddress
                                ? `${defaultAddress.label} · ${defaultAddress.addressLine}`
                                : t('home.setLocation')}
                        </span>
                    </button>
                </div>

                {/* ── Search ── */}
                <div className="c-wrap" style={{ marginTop: 14 }}>
                    <button
                        type="button"
                        onClick={() => navigate('/menu')}
                        className="c-field"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            color: 'var(--c-ink-3)', textAlign: 'left', cursor: 'pointer',
                        }}
                    >
                        <Search size={17} />
                        {t('home.searchPlaceholder')}
                    </button>
                </div>
            </header>

            {/* ── Restaurant status ── */}
            <div className="c-wrap" style={{ marginTop: 14 }}>
                <div
                    className="c-card"
                    style={{
                        padding: 14, display: 'flex', alignItems: 'center', gap: 12,
                        background: isClosed ? 'var(--c-danger-wash)' : 'var(--c-brand-wash)',
                        borderColor: isClosed ? '#FECACA' : '#F6E3B6',
                    }}
                >
                    <div
                        style={{
                            width: 42, height: 42, flex: 'none', borderRadius: 14, display: 'grid', placeItems: 'center',
                            background: isClosed ? 'var(--c-danger)' : 'var(--c-brand)',
                            color: isClosed ? '#fff' : 'var(--c-ink)',
                        }}
                    >
                        <Store size={20} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ font: '800 .98rem/1.25 Outfit, sans-serif', color: 'var(--c-ink)' }}>
                            {restaurant?.name ?? 'Diamond Pizza'}
                        </p>
                        <p style={{ marginTop: 2, font: '500 .76rem/1.35 "DM Sans", sans-serif', color: isClosed ? 'var(--c-danger)' : 'var(--c-ink-2)' }}>
                            {isClosed
                                ? t('home.closedTitle')
                                : [
                                    t('home.deliveryIn', { mins: restaurant?.avgPreparationTime ?? 30 }),
                                    restaurant?.minOrderAmount
                                        ? t('home.minOrder', { amount: money(restaurant.minOrderAmount) })
                                        : null,
                                ].filter(Boolean).join(' · ')}
                        </p>
                    </div>

                    {!isClosed && <Tag tone="ok">{t('home.openNow')}</Tag>}
                </div>
            </div>

            {/* ── Offers ── */}
            {offers.length > 0 && (
                <section style={{ marginTop: 20 }}>
                    <div className="c-strip" style={{ paddingBlock: 0 }}>
                        {offers.map((offer) => (
                            <div
                                key={offer._id}
                                style={{
                                    flex: 'none', width: 250, padding: 14, borderRadius: 'var(--c-r-lg)',
                                    background: 'linear-gradient(135deg, #17120B, #34281A)', color: '#fff',
                                }}
                            >
                                <p style={{ font: '900 1.22rem/1.1 Outfit, sans-serif', color: 'var(--c-brand)' }}>
                                    {offer.discountType === 'PERCENTAGE'
                                        ? `${offer.discountValue}% ${t('common.off')}`
                                        : `${money(offer.discountValue)} ${t('common.off')}`}
                                </p>
                                <p style={{ marginTop: 4, font: '600 .8rem/1.35 "DM Sans", sans-serif', opacity: .88 }}>
                                    {offer.title}
                                </p>
                                {offer.code && (
                                    <p style={{ marginTop: 8, font: '800 .72rem/1 "DM Sans", sans-serif', letterSpacing: '.1em', color: 'var(--c-brand)' }}>
                                        {offer.code}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Order again ── */}
            {reorderable.length > 0 && (
                <section style={{ marginTop: 24 }}>
                    <SectionHead title={t('home.orderAgain')} />
                    <div className="c-strip" style={{ paddingBlock: 0 }}>
                        {reorderable.map((order) => (
                            <div
                                key={order._id}
                                className="c-card"
                                style={{ flex: 'none', width: 232, padding: 12 }}
                            >
                                <p
                                    style={{
                                        font: '700 .85rem/1.35 "DM Sans", sans-serif', color: 'var(--c-ink)',
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                        minHeight: '2.4em',
                                    }}
                                >
                                    {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                                </p>
                                <p style={{ marginTop: 6, font: '800 .9rem/1 Outfit, sans-serif', color: 'var(--c-ink)' }}>
                                    {money(order.total)}
                                </p>
                                <button
                                    type="button"
                                    className="c-btn c-btn--ghost c-btn--block"
                                    style={{ marginTop: 10, minHeight: 38, fontSize: '.82rem' }}
                                    onClick={() => handleReorder(order)}
                                    disabled={reordering === order._id}
                                >
                                    <RotateCcw size={14} />
                                    {reordering === order._id ? t('orders.reordering') : t('orders.reorder')}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Favourites ── */}
            {favItems.length > 0 && (
                <section style={{ marginTop: 24 }}>
                    <SectionHead
                        title={t('home.favourites')}
                        icon={<Heart size={13} fill="currentColor" />}
                        onMore={() => navigate('/account')}
                    />
                    <div className="c-strip" style={{ paddingBlock: 0 }}>
                        {favItems.map((item) => (
                            <button
                                key={item._id}
                                type="button"
                                onClick={() => setOpenDish(item)}
                                style={{ flex: 'none', width: 132, border: 0, background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                            >
                                <div style={{ width: 132, height: 100, borderRadius: 'var(--c-r-md)', overflow: 'hidden', background: 'var(--c-surface-2)' }}>
                                    {item.image
                                        ? <img src={item.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <DishFallback name={item.name} radius={0} />}
                                </div>
                                <p style={{ marginTop: 6, font: '700 .8rem/1.3 "DM Sans", sans-serif', color: 'var(--c-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.name}
                                </p>
                                <p style={{ font: '800 .82rem/1 Outfit, sans-serif', color: 'var(--c-ink)' }}>{money(item.price)}</p>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Categories ── */}
            {categories.length > 0 && (
                <section style={{ marginTop: 26 }}>
                    <SectionHead title={t('home.categories')} />
                    <div className="c-wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10 }}>
                        {categories.map((cat) => (
                            <button
                                key={cat._id}
                                type="button"
                                onClick={() => navigate(`/menu?category=${encodeURIComponent(cat.name)}`)}
                                className="c-card"
                                style={{
                                    padding: '14px 8px', border: 0, cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                    background: 'var(--c-surface)',
                                }}
                            >
                                <span
                                    style={{
                                        width: 42, height: 42, borderRadius: 999, display: 'grid', placeItems: 'center',
                                        background: 'var(--c-brand-wash)', color: 'var(--c-brand-deep)', fontSize: '1.1rem',
                                    }}
                                >
                                    {cat.icon || <Pizza size={19} />}
                                </span>
                                <span style={{ font: '700 .74rem/1.2 "DM Sans", sans-serif', color: 'var(--c-ink)', textAlign: 'center' }}>
                                    {cat.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* ── A taste of the menu ── */}
            <section style={{ marginTop: 26 }}>
                <SectionHead title={t('home.popular')} onMore={() => navigate('/menu')} moreLabel={t('home.browseMenu')} />
                <div className="c-wrap">
                    {loading && items.length === 0
                        ? Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 104px', gap: 12, padding: '14px 0' }}>
                                <div>
                                    <Skeleton h={12} w="35%" />
                                    <Skeleton h={16} w="70%" style={{ marginTop: 10 }} />
                                    <Skeleton h={14} w="30%" style={{ marginTop: 10 }} />
                                </div>
                                <Skeleton h={104} w={104} r={14} />
                            </div>
                        ))
                        : popular.map((item) => (
                            <DishCard key={item._id} item={item} onOpen={setOpenDish} onNeedSignIn={() => setShowLogin(true)} />
                        ))}
                </div>

                <div className="c-wrap" style={{ marginTop: 16 }}>
                    <button type="button" className="c-btn c-btn--line c-btn--block" onClick={() => navigate('/menu')}>
                        {t('home.browseMenu')}
                        <ChevronRight size={16} />
                    </button>
                </div>
            </section>

            <DishSheet item={openDish} onClose={() => setOpenDish(null)} onNeedSignIn={() => setShowLogin(true)} />
            {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        </AppShell>
    );
}

function SectionHead({ title, icon, onMore, moreLabel }: {
    title: string;
    icon?: React.ReactNode;
    onMore?: () => void;
    moreLabel?: string;
}) {
    return (
        <div className="c-wrap" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10 }}>
            <h2 style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, font: '800 1.05rem/1.2 Outfit, sans-serif', color: 'var(--c-ink)' }}>
                {icon}
                {title}
            </h2>
            {onMore && (
                <button
                    type="button"
                    onClick={onMore}
                    style={{
                        border: 0, background: 'none', cursor: 'pointer', padding: 0,
                        display: 'flex', alignItems: 'center', gap: 2,
                        font: '700 .78rem/1 "DM Sans", sans-serif', color: 'var(--c-brand-deep)',
                    }}
                >
                    {moreLabel ?? ''}
                    <ChevronRight size={14} />
                </button>
            )}
        </div>
    );
}
