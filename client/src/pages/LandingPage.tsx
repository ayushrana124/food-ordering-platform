import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Tag, Gift, Percent, Utensils, Cake, Coffee, Pizza, Package, Zap,
    Star, Check, Clock, MapPin, TrendingUp, ShieldCheck, Heart
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MenuItemCard from '@/components/menu/MenuItemCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchRestaurant, fetchMenuItems, fetchOffers } from '@/redux/slices/menuSlice';
import type { RootState } from '@/redux/store';

/* ── Offer data ───────────────────────────────────────────────────────────── */
const OFFERS = [
    {
        id: 'o1',
        bg: 'linear-gradient(135deg, #FFEFD5 0%, #FFF5E6 100%)',
        Icon: Tag,
        label: 'Today Only',
        headline: 'Buy 2\nGet 1 FREE',
        desc: 'On any pizza from our menu. No minimum order required.',
        code: 'B2G1',
        cta: 'Order Now',
        highlight: '#D4920A',
    },
    {
        id: 'o2',
        bg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
        Icon: Percent,
        label: 'New User',
        headline: '50% Off\nFirst Order',
        desc: 'Create an account and place your first online order.',
        code: 'FIRST50',
        cta: 'Claim Offer',
        highlight: '#D4920A',
    },
    {
        id: 'o3',
        bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
        Icon: Gift,
        label: 'Best Value',
        headline: 'Mega Combo\n@ ₹599',
        desc: '2 Pizzas + Garlic Bread + 2 Drinks. Serves 4 people comfortably.',
        code: 'COMBO599',
        cta: 'Build Combo',
        highlight: '#D4920A',
    },
];

/* ── Category data ────────────────────────────────────────────────────────── */
const CATEGORIES = [
    { name: 'Pizzas', Icon: Pizza, bg: '#FFF8ED', border: '#E8C060', color: '#8B6914' },
    { name: 'Sides', Icon: Utensils, bg: '#F0FAF4', border: '#86EFAC', color: '#166534' },
    { name: 'Desserts', Icon: Cake, bg: '#FDF2F8', border: '#F0ABFC', color: '#86198F' },
    { name: 'Beverages', Icon: Coffee, bg: '#EFF6FF', border: '#93C5FD', color: '#1D4ED8' },
    { name: 'Value Deals', Icon: Tag, bg: '#FFF7ED', border: '#FCA67C', color: '#C2410C' },
    { name: 'Combos', Icon: Package, bg: '#F5F3FF', border: '#C4B5FD', color: '#6D28D9' },
    { name: 'Just Launched', Icon: Zap, bg: '#ECFDF5', border: '#6EE7B7', color: '#065F46' },
    { name: 'Bestsellers', Icon: Star, bg: '#FFFBEB', border: '#FCD34D', color: '#92400E' },
];

/* ── Main component ───────────────────────────────────────────────────────── */
export default function LandingPage() {
    const dispatch = useAppDispatch();
    const { restaurant, items, loading } = useAppSelector((s: RootState) => s.menu);

    const [activeOffer, setActiveOffer] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const offerTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    const goOffer = useCallback((idx: number) => setActiveOffer(idx), []);
    const nextOffer = useCallback(() => goOffer((activeOffer + 1) % OFFERS.length), [activeOffer, goOffer]);

    useEffect(() => {
        dispatch(fetchRestaurant());
        dispatch(fetchMenuItems({ limit: 8 }));
        dispatch(fetchOffers());
    }, [dispatch]);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    useEffect(() => {
        if (isMobile) {
            offerTimer.current = setInterval(nextOffer, 4000);
        } else {
            if (offerTimer.current) clearInterval(offerTimer.current);
        }
        return () => { if (offerTimer.current) clearInterval(offerTimer.current); };
    }, [isMobile, nextOffer]);

    return (
        <div className="min-h-screen bg-[#FAFAF8] page-enter">
            <Navbar />

            {/* ── OFFER CARDS ─────────────────────────────────────────────── */}
            <section className="py-[clamp(2rem,5vw,3.5rem)] bg-[#F4F3EF]">
                <div className="container">
                    <div className="mb-[clamp(1.25rem,3vw,2rem)]">
                        <span className="section-label">Offers &amp; Deals</span>
                        <h2 className="section-title">What's On Today</h2>
                    </div>

                    {/* Desktop: 3 columns */}
                    {!isMobile ? (
                        <div className="grid grid-cols-3 gap-5">
                            {OFFERS.map((o) => <OfferCard key={o.id} offer={o} />)}
                        </div>
                    ) : (
                        /* Mobile: 1-up carousel */
                        <div>
                            <div className="overflow-hidden rounded-[22px]">
                                <div
                                    className="flex transition-transform duration-500"
                                    style={{
                                        transform: `translateX(calc(-${activeOffer} * 100%))`,
                                        transitionTimingFunction: 'cubic-bezier(0.22,0.61,0.36,1)',
                                    }}
                                >
                                    {OFFERS.map((o) => <OfferCard key={o.id} offer={o} fullWidth />)}
                                </div>
                            </div>
                            {/* Dots */}
                            <div className="flex justify-center gap-[6px] mt-4">
                                {OFFERS.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => goOffer(i)}
                                        className="h-[7px] rounded-full border-none cursor-pointer p-0 transition-all duration-300"
                                        style={{
                                            width: i === activeOffer ? 22 : 7,
                                            background: i === activeOffer ? '#111' : '#D0CFC9',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ── RESTAURANT STATUS STRIP ─────────────────────────────────── */}
            {restaurant && (
                <div className="bg-[#F4F3EF] py-[0.7rem] border-y border-[#EBEBEB]">
                    <div className="container flex justify-center gap-[clamp(1.5rem,5vw,3.5rem)] flex-wrap">
                        {[
                            { Icon: Check, text: restaurant.isOpen ? 'Open Now' : 'Closed', amber: restaurant.isOpen },
                            { Icon: Clock, text: `${restaurant.deliveryTime} min delivery` },
                            { Icon: MapPin, text: (restaurant.address ?? 'Mumbai').split(',')[0] },
                            { Icon: Star, text: `${restaurant.rating ?? '4.8'} rating`, fill: true },
                        ].map((s, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-[0.4rem] text-[clamp(0.72rem,1.5vw,0.82rem)]"
                                style={{
                                    color: s.amber ? '#D4920A' : '#555',
                                    fontWeight: s.amber ? 700 : 500,
                                }}
                            >
                                <span className={s.amber ? 'text-amber' : 'text-[#9B9B9B]'}>
                                    <s.Icon size={14} fill={s.fill ? 'currentColor' : 'none'} />
                                </span>
                                {s.text}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── CATEGORIES ──────────────────────────────────────────────── */}
            <section className="py-[clamp(2.5rem,6vw,5rem)] bg-white">
                <div className="container">
                    <div className="flex items-center gap-4 mb-[clamp(1.5rem,3vw,2.5rem)] justify-center">
                        <div className="flex-1 h-[1px] bg-[#D0CFC9]" />
                        <h2 className="font-ui font-bold text-[clamp(0.72rem,1.8vw,0.85rem)] tracking-[0.18em] text-[#9B9B9B] whitespace-nowrap uppercase">
                            Browse Categories
                        </h2>
                        <div className="flex-1 h-[1px] bg-[#D0CFC9]" />
                    </div>

                    <div
                        className="grid gap-[clamp(0.6rem,1.5vw,1rem)]"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(100px,14vw,135px), 1fr))' }}
                    >
                        {CATEGORIES.map((cat) => (
                            <Link key={cat.name} to={`/menu?category=${encodeURIComponent(cat.name)}`} className="no-underline">
                                <div
                                    className="flex flex-col items-center gap-[0.6rem] rounded-[16px] cursor-pointer transition-[transform,box-shadow] duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                                    style={{
                                        background: cat.bg,
                                        border: `1.5px solid ${cat.border}`,
                                        padding: 'clamp(0.9rem,2.5vw,1.3rem) 0.5rem',
                                    }}
                                >
                                    <div className="flex items-center justify-center w-8 h-8" style={{ color: cat.color }}>
                                        <cat.Icon />
                                    </div>
                                    <span className="font-ui font-bold text-[clamp(0.65rem,1.4vw,0.78rem)] text-[#111] text-center leading-snug">
                                        {cat.name}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── BESTSELLERS ─────────────────────────────────────────────── */}
            <section className="py-[clamp(2.5rem,6vw,5rem)] bg-[#F4F3EF]">
                <div className="container">
                    <div className="flex items-end justify-between mb-[clamp(1.25rem,3vw,2rem)] flex-wrap gap-3">
                        <div>
                            <span className="section-label">Most Ordered</span>
                            <h2 className="section-title">Our Bestsellers</h2>
                        </div>
                        <Link to="/menu" className="btn-outline no-underline" style={{ fontSize: '0.82rem', padding: '0.5rem 1.1rem' }}>
                            View Full Menu
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <LoadingSpinner size="lg" />
                        </div>
                    ) : (
                        <div
                            className="grid gap-[clamp(0.75rem,2vw,1.1rem)]"
                            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(170px,22vw,230px), 1fr))' }}
                        >
                            {items.slice(0, 8).map((item) => (
                                <MenuItemCard key={item._id} item={item} compact />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ── WHY US ──────────────────────────────────────────────────── */}
            <section className="bg-[#F4F3EF] py-[clamp(3rem,7vw,6rem)]">
                <div className="container">
                    <div className="text-center mb-[clamp(2rem,5vw,3.5rem)]">
                        <span className="block text-[0.7rem] font-bold tracking-[0.18em] text-[#D4920A] uppercase mb-2">
                            The Bunty Difference
                        </span>
                        <h2 className="font-outfit font-extrabold text-[clamp(1.4rem,4vw,2.2rem)] text-[#111]">
                            Why thousands choose us
                        </h2>
                    </div>
                    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        {[
                            { title: 'Farm-Fresh Daily', desc: 'Hand-stretched dough, premium mozzarella, locally sourced vegetables.', Icon: Heart },
                            { title: `${restaurant?.deliveryTime ?? 30}-Min Delivery`, desc: 'GPS-tracked. Hot and fresh, every single time.', Icon: Clock },
                            { title: 'Expert Chefs', desc: 'Trained artisans using authentic Italian techniques.', Icon: Star },
                            { title: 'Best for Money', desc: 'Restaurant-quality pizza at everyday prices.', Icon: Tag },
                        ].map((f) => (
                            <div
                                key={f.title}
                                className="p-[clamp(1.25rem,3vw,1.75rem)] rounded-[16px] bg-white border border-[#EBEBEB] shadow-sm transition-all duration-200 hover:shadow-md hover:border-amber-border group"
                            >
                                <div className="w-10 h-10 bg-[#FFF6DC] rounded-xl flex items-center justify-center text-[#D4920A] mb-4 transition-transform group-hover:scale-110">
                                    <f.Icon size={20} />
                                </div>
                                <h3 className="font-outfit font-bold text-[0.95rem] text-[#111] mb-[0.35rem]">{f.title}</h3>
                                <p className="text-[0.8rem] text-[#555] leading-[1.75] font-ui">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

/* ── Offer Card sub-component ────────────────────────────────────────────── */
function OfferCard({ offer, fullWidth = false }: { offer: typeof OFFERS[0]; fullWidth?: boolean }) {
    return (
        <div
            className="relative overflow-hidden flex flex-col justify-between gap-6 rounded-[22px] border-l-[3px] border-l-amber shadow-sm"
            style={{
                background: offer.bg,
                padding: 'clamp(1.5rem,3vw,2rem)',
                minWidth: fullWidth ? '100%' : undefined,
                flexShrink: fullWidth ? 0 : undefined,
                minHeight: 'clamp(210px,28vw,280px)',
            }}
        >
            {/* Big decorative background icon */}
            <div
                className="absolute right-[-12px] bottom-[-12px] opacity-[0.1] rotate-[-12deg] pointer-events-none"
                style={{ color: offer.highlight, width: 120, height: 120 }}
            >
                <offer.Icon size={120} />
            </div>

            {/* Content */}
            <div>
                {/* Label badge */}
                <div
                    className="inline-flex items-center gap-[0.35rem] px-[0.65rem] py-[0.2rem] rounded-[6px] text-[0.65rem] font-bold tracking-[0.12em] uppercase mb-[0.9rem]"
                    style={{ background: 'rgba(212,146,10,0.12)', color: offer.highlight }}
                >
                    <offer.Icon size={12} /> {offer.label}
                </div>

                {/* Headline */}
                {offer.headline.split('\n').map((line, i) => (
                    <div
                        key={i}
                        className="font-outfit font-black leading-[1.05] tracking-[-0.02em]"
                        style={{
                            fontSize: 'clamp(1.6rem,3.8vw,2.4rem)',
                            color: i === 0 ? '#111' : offer.highlight,
                        }}
                    >
                        {line}
                    </div>
                ))}

                <p
                    className="text-[#555] leading-[1.65] mt-3 max-w-[300px]"
                    style={{ fontSize: 'clamp(0.78rem,1.4vw,0.88rem)' }}
                >
                    {offer.desc}
                </p>
            </div>

            {/* Footer row */}
            <div className="flex gap-[0.7rem] items-center flex-wrap">
                <Link
                    to="/menu"
                    className="px-5 py-[0.55rem] rounded-[6px] font-ui font-bold text-[0.82rem] no-underline text-white whitespace-nowrap tracking-[0.01em] transition-[filter] duration-180 hover:brightness-90"
                    style={{ background: offer.highlight }}
                >
                    {offer.cta}
                </Link>
                {offer.code && (
                    <div className="border border-dashed border-[#D4920A] rounded-[6px] px-[0.7rem] py-[0.35rem] text-[0.72rem] font-bold text-[#D4920A] tracking-[0.08em] whitespace-nowrap bg-white/50">
                        USE: <span>{offer.code}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
