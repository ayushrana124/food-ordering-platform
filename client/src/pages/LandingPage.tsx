import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MenuItemCard from '@/components/menu/MenuItemCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchRestaurant, fetchMenuItems, fetchOffers } from '@/redux/slices/menuSlice';
import type { RootState } from '@/redux/store';

/* ── SVG Icons ────────────────────────────────────────────────────────────── */
const TagIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12 2 7a5 5 0 0 1 5-5h5l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </svg>
);
const GiftIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
);
const PercentIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="5" x2="5" y2="19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
);
const UtensilsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h1a2 2 0 0 1 2 2v5" />
    </svg>
);
const CakeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
        <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2 1 2 1" />
        <line x1="2" y1="21" x2="22" y2="21" />
        <line x1="7" y1="11" x2="7" y2="8" />
        <line x1="12" y1="11" x2="12" y2="6" />
        <line x1="17" y1="11" x2="17" y2="8" />
    </svg>
);
const CupIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
        <line x1="6" y1="2" x2="6" y2="4" />
        <line x1="10" y1="2" x2="10" y2="4" />
        <line x1="14" y1="2" x2="14" y2="4" />
    </svg>
);
const PizzaIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 0 1 10 10" />
        <path d="M12 2a10 10 0 0 0-10 10l10 10 10-10" />
        <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
        <circle cx="16" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
    </svg>
);
const BoxIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
);
const ZapIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);
const StarIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);
const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const ClockIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);
const MapPinIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);
const StarSolidIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#D4920A" stroke="none">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

/* ── Offer Cards data ─────────────────────────────────────────────────────── */
const OFFERS = [
    {
        id: 'o1',
        bg: 'linear-gradient(135deg, #1C1C1E 0%, #2C1810 100%)',
        accentBg: 'rgba(212,146,10,0.12)',
        Icon: TagIcon,
        label: 'Today Only',
        headline: 'Buy 2\nGet 1 FREE',
        desc: 'On any pizza from our menu. No minimum order required.',
        code: 'B2G1',
        cta: 'Order Now',
        highlight: '#D4920A',
    },
    {
        id: 'o2',
        bg: 'linear-gradient(135deg, #0F1422 0%, #1A2340 100%)',
        accentBg: 'rgba(212,146,10,0.1)',
        Icon: PercentIcon,
        label: 'New User',
        headline: '50% Off\nFirst Order',
        desc: 'Create an account and place your first online order.',
        code: 'FIRST50',
        cta: 'Claim Offer',
        highlight: '#D4920A',
    },
    {
        id: 'o3',
        bg: 'linear-gradient(135deg, #0A1A0A 0%, #112211 100%)',
        accentBg: 'rgba(212,146,10,0.08)',
        Icon: GiftIcon,
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
    { name: 'Pizzas', Icon: PizzaIcon, bg: '#FFF8ED', border: '#E8C060', color: '#8B6914' },
    { name: 'Sides', Icon: UtensilsIcon, bg: '#F0FAF4', border: '#86EFAC', color: '#166534' },
    { name: 'Desserts', Icon: CakeIcon, bg: '#FDF2F8', border: '#F0ABFC', color: '#86198F' },
    { name: 'Beverages', Icon: CupIcon, bg: '#EFF6FF', border: '#93C5FD', color: '#1D4ED8' },
    { name: 'Value Deals', Icon: TagIcon, bg: '#FFF7ED', border: '#FCA67C', color: '#C2410C' },
    { name: 'Combos', Icon: BoxIcon, bg: '#F5F3FF', border: '#C4B5FD', color: '#6D28D9' },
    { name: 'Just Launched', Icon: ZapIcon, bg: '#ECFDF5', border: '#6EE7B7', color: '#065F46' },
    { name: 'Bestsellers', Icon: StarIcon, bg: '#FFFBEB', border: '#FCD34D', color: '#92400E' },
];

/* ── Main component ───────────────────────────────────────────────────────── */
export default function LandingPage() {
    const dispatch = useAppDispatch();
    const { restaurant, items, loading } = useAppSelector((s: RootState) => s.menu);

    // Offer card carousel state
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

    // Auto-advance only on mobile
    useEffect(() => {
        if (isMobile) {
            offerTimer.current = setInterval(nextOffer, 4000);
        } else {
            if (offerTimer.current) clearInterval(offerTimer.current);
        }
        return () => { if (offerTimer.current) clearInterval(offerTimer.current); };
    }, [isMobile, nextOffer]);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }} className="page-enter">
            <Navbar />

            {/* ════════════════════════════════════════
          OFFER CARDS — 3-up desktop · 1-up mobile
      ════════════════════════════════════════ */}
            <section style={{ padding: 'clamp(2rem, 5vw, 3.5rem) 0', background: 'var(--surface-alt)' }}>
                <div className="container">
                    <div style={{ marginBottom: 'clamp(1.25rem, 3vw, 2rem)' }}>
                        <span className="section-label">Offers & Deals</span>
                        <h2 className="section-title">What's On Today</h2>
                    </div>

                    {/* Desktop: 3 cards in a row */}
                    {!isMobile ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                            {OFFERS.map((o) => <OfferCard key={o.id} offer={o} />)}
                        </div>
                    ) : (
                        /* Mobile: 1-up carousel */
                        <div>
                            <div style={{ overflow: 'hidden', borderRadius: 'var(--r-xl)' }}>
                                <div style={{
                                    display: 'flex',
                                    transform: `translateX(calc(-${activeOffer} * 100%))`,
                                    transition: 'transform 0.5s cubic-bezier(0.22,0.61,0.36,1)',
                                }}>
                                    {OFFERS.map((o) => <OfferCard key={o.id} offer={o} fullWidth />)}
                                </div>
                            </div>
                            {/* Dots */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '1rem' }}>
                                {OFFERS.map((_, i) => (
                                    <button key={i} onClick={() => goOffer(i)} style={{
                                        width: i === activeOffer ? 22 : 7, height: 7,
                                        borderRadius: 99,
                                        background: i === activeOffer ? 'var(--dark)' : 'var(--border-strong)',
                                        border: 'none', cursor: 'pointer', padding: 0,
                                        transition: 'all 0.3s',
                                    }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ════════════════════════════════════════
          RESTAURANT STATUS STRIP
      ════════════════════════════════════════ */}
            {restaurant && (
                <div style={{ background: 'var(--dark)', padding: '0.7rem 0', borderBottom: '1px solid var(--dark-3)' }}>
                    <div className="container" style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(1.5rem, 5vw, 3.5rem)', flexWrap: 'wrap' }}>
                        {[
                            { Icon: CheckIcon, text: restaurant.isOpen ? 'Open Now' : 'Closed', amber: restaurant.isOpen },
                            { Icon: ClockIcon, text: `${restaurant.deliveryTime} min delivery` },
                            { Icon: MapPinIcon, text: (restaurant.address ?? 'Mumbai').split(',')[0] },
                            { Icon: StarSolidIcon, text: `${restaurant.rating ?? '4.8'} rating` },
                        ].map((s, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                fontSize: 'clamp(0.72rem, 1.5vw, 0.82rem)',
                                color: s.amber ? 'var(--amber)' : 'rgba(255,255,255,0.6)',
                                fontWeight: s.amber ? 600 : 400,
                            }}>
                                <span style={{ opacity: 0.8 }}><s.Icon /></span>
                                {s.text}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════
          CATEGORIES
      ════════════════════════════════════════ */}
            <section style={{ padding: 'clamp(2.5rem, 6vw, 5rem) 0', background: 'var(--surface)' }}>
                <div className="container">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 'clamp(1.5rem, 3vw, 2.5rem)', justifyContent: 'center' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border-strong)' }} />
                        <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 'clamp(0.72rem, 1.8vw, 0.85rem)', letterSpacing: '0.18em', color: 'var(--text-3)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                            Browse Categories
                        </h2>
                        <div style={{ flex: 1, height: 1, background: 'var(--border-strong)' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(100px, 14vw, 135px), 1fr))', gap: 'clamp(0.6rem, 1.5vw, 1rem)' }}>
                        {CATEGORIES.map((cat) => (
                            <Link key={cat.name} to={`/menu?category=${encodeURIComponent(cat.name)}`} style={{ textDecoration: 'none' }}>
                                <div style={{
                                    background: cat.bg,
                                    border: `1.5px solid ${cat.border}`,
                                    borderRadius: 'var(--r-lg)',
                                    padding: 'clamp(0.9rem, 2.5vw, 1.3rem) 0.5rem',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    boxShadow: 'var(--shadow-sm)',
                                }}
                                    onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = 'var(--shadow-md)'; }}
                                    onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = 'var(--shadow-sm)'; }}
                                >
                                    <div style={{ color: cat.color, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <cat.Icon />
                                    </div>
                                    <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 'clamp(0.65rem, 1.4vw, 0.78rem)', color: 'var(--text-1)', textAlign: 'center', lineHeight: 1.3 }}>
                                        {cat.name}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════
          BESTSELLERS
      ════════════════════════════════════════ */}
            <section style={{ padding: 'clamp(2.5rem, 6vw, 5rem) 0', background: 'var(--surface-alt)' }}>
                <div className="container">
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 'clamp(1.25rem, 3vw, 2rem)', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                            <span className="section-label">Most Ordered</span>
                            <h2 className="section-title">Our Bestsellers</h2>
                        </div>
                        <Link to="/menu" className="btn-outline" style={{ fontSize: '0.82rem', padding: '0.5rem 1.1rem' }}>
                            View Full Menu
                        </Link>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                            <LoadingSpinner size="lg" />
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(170px, 22vw, 230px), 1fr))', gap: 'clamp(0.75rem, 2vw, 1.1rem)' }}>
                            {items.slice(0, 8).map((item) => (
                                <MenuItemCard key={item._id} item={item} compact />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ════════════════════════════════════════
          WHY US
      ════════════════════════════════════════ */}
            <section style={{ background: 'var(--dark)', padding: 'clamp(3rem, 7vw, 6rem) 0' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 5vw, 3.5rem)' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.18em', color: 'var(--amber)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>The Bunty Difference</span>
                        <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', color: '#fff' }}>
                            Why thousands choose us
                        </h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {[
                            { title: 'Farm-Fresh Daily', desc: 'Hand-stretched dough, premium mozzarella, locally sourced vegetables.' },
                            { title: `${restaurant?.deliveryTime ?? 30}-Min Delivery`, desc: 'GPS-tracked. Hot and fresh, every single time.' },
                            { title: 'Expert Chefs', desc: 'Trained artisans using authentic Italian techniques.' },
                            { title: 'Best for Money', desc: 'Restaurant-quality pizza at everyday prices.' },
                        ].map((f, i) => (
                            <div key={f.title} style={{ padding: 'clamp(1.25rem, 3vw, 1.75rem)', border: '1px solid var(--dark-3)', borderRadius: 'var(--r-lg)', transition: 'border-color 0.2s' }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--amber)'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--dark-3)'; }}
                            >
                                <div style={{ width: 36, height: 36, background: 'rgba(212,146,10,0.12)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)', marginBottom: '1rem' }}>
                                    {[<TagIcon />, <ClockIcon />, <StarIcon />, <CheckIcon />][i]}
                                </div>
                                <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: '0.35rem' }}>{f.title}</h3>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.75 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

/* ── Offer Card sub-component ─────────────────────────────────────────────── */
function OfferCard({ offer, fullWidth = false }: { offer: typeof OFFERS[0]; fullWidth?: boolean }) {
    return (
        <div style={{
            background: offer.bg,
            borderRadius: 'var(--r-xl)',
            padding: 'clamp(1.5rem, 3vw, 2rem)',
            position: 'relative',
            overflow: 'hidden',
            minWidth: fullWidth ? '100%' : undefined,
            flexShrink: fullWidth ? 0 : undefined,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.5rem',
            minHeight: 'clamp(210px, 28vw, 280px)',
            // Thin amber left border
            borderLeft: '3px solid var(--amber)',
        }}>
            {/* Big decorative background icon */}
            <div style={{
                position: 'absolute', right: '-12px', bottom: '-12px',
                color: offer.highlight, opacity: 0.06,
                width: 120, height: 120,
                transform: 'rotate(-12deg)',
            }}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="120" height="120">
                    <offer.Icon />
                </svg>
            </div>

            {/* Content */}
            <div>
                {/* Label badge */}
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                    background: 'rgba(212,146,10,0.18)',
                    color: offer.highlight,
                    borderRadius: 'var(--r-sm)',
                    padding: '0.2rem 0.65rem',
                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginBottom: '0.9rem',
                }}>
                    <offer.Icon />
                    {offer.label}
                </div>

                {/* Headline */}
                {offer.headline.split('\n').map((line, i) => (
                    <div key={i} style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 900,
                        fontSize: 'clamp(1.6rem, 3.8vw, 2.4rem)',
                        lineHeight: 1.05,
                        color: i === 0 ? '#fff' : offer.highlight,
                        letterSpacing: '-0.02em',
                    }}>
                        {line}
                    </div>
                ))}

                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(0.78rem, 1.4vw, 0.88rem)', lineHeight: 1.65, marginTop: '0.75rem', maxWidth: 300 }}>
                    {offer.desc}
                </p>
            </div>

            {/* Footer row */}
            <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link to="/menu" style={{
                    background: offer.highlight, color: '#fff',
                    padding: '0.55rem 1.2rem', borderRadius: 'var(--r-sm)',
                    fontFamily: "'Inter', sans-serif", fontWeight: 700,
                    fontSize: '0.82rem', textDecoration: 'none',
                    transition: 'filter 0.18s', letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                }}
                    onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.88)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
                >
                    {offer.cta}
                </Link>
                {offer.code && (
                    <div style={{
                        border: '1px dashed rgba(212,146,10,0.4)',
                        borderRadius: 'var(--r-sm)',
                        padding: '0.35rem 0.7rem',
                        fontSize: '0.72rem', fontWeight: 700,
                        color: 'rgba(255,255,255,0.5)',
                        letterSpacing: '0.08em',
                        whiteSpace: 'nowrap',
                    }}>
                        USE: <span style={{ color: offer.highlight }}>{offer.code}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
