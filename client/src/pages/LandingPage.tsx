import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Tag, Gift, Percent, Utensils, Cake, Coffee, Pizza, Package, Zap,
    Star, Check, Clock, MapPin, Heart, ArrowRight, Sparkles,
    type LucideIcon
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MenuItemCard from '@/components/menu/MenuItemCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchRestaurant, fetchMenuItems, fetchOffers, fetchCategories } from '@/redux/slices/menuSlice';
import type { RootState } from '@/redux/store';
import type { IOffer, ICategory } from '@/types';

/* ── Icon lookup ────────────────────────────────────────────────────────── */
const ICON_MAP: Record<string, LucideIcon> = {
    Tag, Gift, Percent, Utensils, Cake, Coffee, Pizza, Package, Zap, Star, Heart, Clock, MapPin,
};
const getIcon = (key: string): LucideIcon => ICON_MAP[key] || Utensils;

/* ── Offer color helpers ─────────────────────────────────────────────────── */
const OFFER_STYLES = [
    { bg: 'linear-gradient(135deg, #FFFCF5 0%, #FFF5E0 100%)', Icon: Tag, accentBg: 'rgba(232,163,23,0.08)' },
    { bg: 'linear-gradient(135deg, #F0FAF4 0%, #E8F5E9 100%)', Icon: Percent, accentBg: 'rgba(22,163,74,0.08)' },
    { bg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)', Icon: Gift, accentBg: 'rgba(124,58,237,0.08)' },
];

/* ── Main component ───────────────────────────────────────────────────── */
export default function LandingPage() {
    const dispatch = useAppDispatch();
    const { restaurant, items, offers, categories, loading } = useAppSelector((s: RootState) => s.menu);

    const [activeOffer, setActiveOffer] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const offerTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    const goOffer = useCallback((idx: number) => setActiveOffer(idx), []);
    const nextOffer = useCallback(
        () => goOffer(offers.length > 0 ? (activeOffer + 1) % offers.length : 0),
        [activeOffer, goOffer, offers.length]
    );

    useEffect(() => {
        dispatch(fetchRestaurant());
        dispatch(fetchMenuItems({ limit: 8 }));
        dispatch(fetchOffers());
        dispatch(fetchCategories());
    }, [dispatch]);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    useEffect(() => {
        if (isMobile && offers.length > 1) {
            offerTimer.current = setInterval(nextOffer, 4000);
        } else {
            if (offerTimer.current) clearInterval(offerTimer.current);
        }
        return () => { if (offerTimer.current) clearInterval(offerTimer.current); };
    }, [isMobile, nextOffer, offers.length]);

    return (
        <div className="min-h-screen bg-white page-enter">
            <Navbar />

            {/* ── HERO SECTION ──────────────────────────────────────────────── */}
            <section
                className="relative overflow-hidden"
                style={{
                    background: 'linear-gradient(160deg, #FFFFFF 0%, #FFFEF9 30%, #FFF9E6 60%, #FBBF24 140%)',
                    minHeight: 'clamp(400px, 52vh, 520px)',
                }}
            >
                <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full opacity-[0.08] pointer-events-none" style={{ background: 'radial-gradient(circle, #FBBF24 0%, transparent 70%)' }} />
                <div className="absolute bottom-[-40px] left-[-60px] w-[200px] h-[200px] rounded-full opacity-[0.06] pointer-events-none" style={{ background: 'radial-gradient(circle, #E8A317 0%, transparent 70%)' }} />

                <div className="container relative z-10 h-full flex items-center" style={{ minHeight: 'clamp(400px, 52vh, 520px)' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center w-full py-10 md:py-0">
                        <div className="order-2 md:order-1 text-center md:text-left">
                            <div
                                className="inline-flex items-center gap-2 px-4 py-[0.35rem] rounded-full mb-6"
                                style={{ background: 'rgba(232, 163, 23, 0.08)', border: '1px solid rgba(232, 163, 23, 0.15)' }}
                            >
                                <Sparkles size={14} className="text-[#E8A317]" />
                                <span className="text-[#9A7209] text-[0.78rem] font-semibold">Freshly Baked, Always</span>
                            </div>

                            <h1
                                className="font-outfit font-extrabold text-[#0F0F0F] leading-[1.05] tracking-[-0.03em] mb-5"
                                style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}
                            >
                                Quality Pizza,<br />
                                <span className="text-[#E8A317]">Delivered Fast</span>
                            </h1>

                            <p className="text-[#4A4A4A] text-[clamp(0.88rem,1.7vw,1.05rem)] leading-[1.75] mb-8 max-w-[440px] mx-auto md:mx-0">
                                Hand-stretched dough, premium mozzarella, and the freshest toppings — prepared by expert chefs and delivered hot to your door.
                            </p>

                            <div className="flex gap-3 flex-wrap justify-center md:justify-start">
                                <Link to="/menu" className="btn-primary text-[0.95rem] py-[0.8rem] px-7 flex items-center gap-2 group no-underline">
                                    Order Now <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                </Link>
                                <Link to="/menu" className="btn-outline flex items-center gap-2 no-underline text-[0.9rem] py-[0.75rem] px-6">
                                    View Menu
                                </Link>
                            </div>
                        </div>

                        <div className="order-1 md:order-2 flex justify-center md:justify-end">
                            <img
                                src="/pizza-hero.png"
                                alt="Delicious pizza"
                                className="w-[clamp(220px,50vw,420px)] h-auto drop-shadow-2xl select-none pointer-events-none"
                                style={{
                                    filter: 'drop-shadow(0 20px 40px rgba(232,163,23,0.18))',
                                    animation: 'float 4s ease-in-out infinite',
                                }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── RESTAURANT STATUS STRIP ─────────────────────────────────── */}
            {restaurant && (
                <div className="bg-white py-4 border-b border-[#EEEEEE]">
                    <div className="container flex justify-center gap-[clamp(1.5rem,5vw,3.5rem)] flex-wrap">
                        {[
                            { Icon: Check, text: restaurant.isOpen ? 'Open Now' : 'Closed', amber: restaurant.isOpen },
                            { Icon: Clock, text: `${restaurant.deliveryTime} min delivery` },
                            { Icon: MapPin, text: (restaurant.address ?? 'Mumbai').split(',')[0] },
                            { Icon: Star, text: `${restaurant.rating ?? '4.8'} rating`, fill: true },
                        ].map((s, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-[0.45rem] text-[clamp(0.75rem,1.5vw,0.84rem)]"
                                style={{
                                    color: s.amber ? '#E8A317' : '#4A4A4A',
                                    fontWeight: s.amber ? 700 : 500,
                                }}
                            >
                                <span
                                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                                    style={{
                                        background: s.amber ? '#FFFBF0' : '#F7F7F5',
                                        color: s.amber ? '#E8A317' : '#8E8E8E',
                                    }}
                                >
                                    <s.Icon size={14} fill={s.fill ? 'currentColor' : 'none'} />
                                </span>
                                {s.text}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── OFFER CARDS (from backend) ─────────────────────────────── */}
            {offers.length > 0 && (
                <section className="py-[clamp(3rem,6vw,5rem)] bg-white">
                    <div className="container">
                        <div className="mb-[clamp(1.5rem,3vw,2.5rem)]">
                            <span className="section-label">
                                <Tag size={13} /> Offers & Deals
                            </span>
                            <h2 className="section-title">What's On Today</h2>
                        </div>

                        {!isMobile ? (
                            <div className="grid grid-cols-3 gap-5">
                                {offers.map((o, i) => <OfferCard key={o._id} offer={o} styleIdx={i} />)}
                            </div>
                        ) : (
                            <div>
                                <div className="overflow-hidden rounded-[24px]">
                                    <div
                                        className="flex transition-transform duration-500"
                                        style={{
                                            transform: `translateX(calc(-${activeOffer} * 100%))`,
                                            transitionTimingFunction: 'var(--ease-spring)',
                                        }}
                                    >
                                        {offers.map((o, i) => <OfferCard key={o._id} offer={o} styleIdx={i} fullWidth />)}
                                    </div>
                                </div>
                                <div className="flex justify-center gap-[6px] mt-4">
                                    {offers.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => goOffer(i)}
                                            className="h-[7px] rounded-full border-none cursor-pointer p-0 transition-all duration-300"
                                            style={{
                                                width: i === activeOffer ? 24 : 7,
                                                background: i === activeOffer ? '#E8A317' : '#D4D4D0',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ── CATEGORIES (from backend) ─────────────────────────────── */}
            {categories.length > 0 && (
                <section className="py-[clamp(3rem,6vw,5rem)] bg-[#F7F7F5]">
                    <div className="container">
                        <div className="text-center mb-[clamp(1.5rem,3vw,2.5rem)]">
                            <span className="section-label justify-center">
                                Browse Categories
                            </span>
                            <h2 className="section-title">Explore Our Menu</h2>
                        </div>

                        <div
                            className="grid gap-[clamp(0.6rem,1.5vw,1rem)]"
                            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(110px,14vw,140px), 1fr))' }}
                        >
                            {categories.map((cat) => {
                                const CatIcon = getIcon(cat.icon);
                                return (
                                    <Link key={cat._id} to={`/menu?category=${encodeURIComponent(cat.name)}`} className="no-underline group">
                                        <div
                                            className="flex flex-col items-center gap-[0.7rem] rounded-[18px] cursor-pointer transition-all duration-300 group-hover:-translate-y-1"
                                            style={{
                                                background: 'white',
                                                border: `1.5px solid #EEEEEE`,
                                                padding: 'clamp(1rem,2.5vw,1.4rem) 0.5rem',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = cat.colorScheme?.border || '#E8A317'; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.06)`; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#EEEEEE'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'; }}
                                        >
                                            <div
                                                className="flex items-center justify-center w-10 h-10 rounded-xl transition-transform duration-300 group-hover:scale-110"
                                                style={{ background: cat.colorScheme?.iconBg || '#F0F0EE', color: cat.colorScheme?.color || '#4A4A4A' }}
                                            >
                                                <CatIcon size={20} />
                                            </div>
                                            <span className="font-ui font-bold text-[clamp(0.68rem,1.4vw,0.78rem)] text-[#0F0F0F] text-center leading-snug">
                                                {cat.name}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* ── BESTSELLERS ─────────────────────────────────────────────── */}
            <section className="py-[clamp(3rem,6vw,5rem)] bg-white">
                <div className="container">
                    <div className="flex items-end justify-between mb-[clamp(1.5rem,3vw,2.5rem)] flex-wrap gap-3">
                        <div>
                            <span className="section-label">
                                <Star size={13} /> Most Ordered
                            </span>
                            <h2 className="section-title">Our Bestsellers</h2>
                        </div>
                        <Link to="/menu" className="btn-outline no-underline flex items-center gap-2" style={{ fontSize: '0.84rem', padding: '0.5rem 1.2rem' }}>
                            View Full Menu <ArrowRight size={15} />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <LoadingSpinner size="lg" />
                        </div>
                    ) : (
                        <div
                            className="grid gap-[clamp(0.75rem,2vw,1.1rem)]"
                            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(180px,22vw,240px), 1fr))' }}
                        >
                            {items.slice(0, 8).map((item) => (
                                <MenuItemCard key={item._id} item={item} compact />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ── WHY US ──────────────────────────────────────────────────── */}
            <section className="py-[clamp(3.5rem,7vw,6rem)] bg-[#F7F7F5]">
                <div className="container">
                    <div className="text-center mb-[clamp(2rem,5vw,3.5rem)]">
                        <span className="section-label justify-center">
                            The Bunty Difference
                        </span>
                        <h2 className="font-outfit font-extrabold text-[clamp(1.5rem,4vw,2.2rem)] text-[#0F0F0F] tracking-[-0.02em]">
                            Why thousands choose us
                        </h2>
                    </div>
                    <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                        {[
                            { title: 'Farm-Fresh Daily', desc: 'Hand-stretched dough, premium mozzarella, locally sourced vegetables.', Icon: Heart, iconBg: '#FFFBF0', iconColor: '#E8A317' },
                            { title: `${restaurant?.deliveryTime ?? 30}-Min Delivery`, desc: 'GPS-tracked. Hot and fresh, every single time.', Icon: Clock, iconBg: '#EFF6FF', iconColor: '#2563EB' },
                            { title: 'Expert Chefs', desc: 'Trained artisans using authentic Italian techniques.', Icon: Star, iconBg: '#FFFBEB', iconColor: '#D97706' },
                            { title: 'Best for Money', desc: 'Restaurant-quality pizza at everyday prices.', Icon: Tag, iconBg: '#F0FAF4', iconColor: '#16A34A' },
                        ].map((f) => (
                            <div
                                key={f.title}
                                className="p-[clamp(1.5rem,3vw,2rem)] rounded-[18px] bg-white border border-[#EEEEEE] transition-all duration-300 hover:-translate-y-1 group"
                                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.06)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'; }}
                            >
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                                    style={{ background: f.iconBg, color: f.iconColor }}
                                >
                                    <f.Icon size={22} />
                                </div>
                                <h3 className="font-outfit font-bold text-[0.95rem] text-[#0F0F0F] mb-[0.4rem]">{f.title}</h3>
                                <p className="text-[0.82rem] text-[#4A4A4A] leading-[1.75] font-ui">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

/* ── Offer Card sub-component ────────────────────────────────────────── */
function OfferCard({ offer, styleIdx = 0, fullWidth = false }: { offer: IOffer; styleIdx?: number; fullWidth?: boolean }) {
    const style = OFFER_STYLES[styleIdx % OFFER_STYLES.length];
    const highlight = offer.colorTheme || '#E8A317';
    const OfferIcon = style.Icon;

    return (
        <div
            className="relative overflow-hidden flex flex-col justify-between gap-6 rounded-[24px] transition-all duration-300 hover:-translate-y-1 group"
            style={{
                background: style.bg,
                padding: 'clamp(1.5rem,3vw,2rem)',
                minWidth: fullWidth ? '100%' : undefined,
                flexShrink: fullWidth ? 0 : undefined,
                minHeight: 'clamp(220px,28vw,290px)',
                border: '1px solid rgba(0,0,0,0.04)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'; }}
        >
            <div
                className="absolute right-[-12px] bottom-[-12px] opacity-[0.06] rotate-[-12deg] pointer-events-none transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110"
                style={{ color: highlight, width: 130, height: 130 }}
            >
                <OfferIcon size={130} />
            </div>

            <div>
                <div
                    className="inline-flex items-center gap-[0.35rem] px-3 py-[0.25rem] rounded-lg text-[0.65rem] font-bold tracking-[0.1em] uppercase mb-4"
                    style={{ background: style.accentBg, color: highlight }}
                >
                    <OfferIcon size={12} /> {offer.label || 'Special'}
                </div>

                {(offer.headline || offer.title).split('\n').map((line, i) => (
                    <div
                        key={i}
                        className="font-outfit font-black leading-[1.05] tracking-[-0.02em]"
                        style={{
                            fontSize: 'clamp(1.6rem,3.8vw,2.4rem)',
                            color: i === 0 ? '#0F0F0F' : highlight,
                        }}
                    >
                        {line}
                    </div>
                ))}

                <p
                    className="text-[#4A4A4A] leading-[1.65] mt-3 max-w-[300px]"
                    style={{ fontSize: 'clamp(0.78rem,1.4vw,0.88rem)' }}
                >
                    {offer.description}
                </p>
            </div>

            <div className="flex gap-[0.7rem] items-center flex-wrap">
                <Link
                    to="/menu"
                    className="px-5 py-[0.55rem] rounded-[10px] font-ui font-bold text-[0.82rem] no-underline text-white whitespace-nowrap tracking-[0.01em] transition-all duration-250 hover:brightness-95"
                    style={{ background: highlight, boxShadow: `0 2px 10px ${highlight}30` }}
                >
                    {offer.ctaText || 'Order Now'}
                </Link>
                {offer.code && (
                    <div
                        className="border border-dashed rounded-lg px-3 py-[0.35rem] text-[0.72rem] font-bold tracking-[0.06em] whitespace-nowrap"
                        style={{ borderColor: highlight + '60', color: highlight, background: 'rgba(255,255,255,0.6)' }}
                    >
                        USE: <span>{offer.code}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
