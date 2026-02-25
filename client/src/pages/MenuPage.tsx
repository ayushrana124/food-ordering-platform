import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchMenuItems } from '@/redux/slices/menuSlice';
import type { RootState } from '@/redux/store';
import MenuItemCard from '@/components/menu/MenuItemCard';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const ALL_CATS = ['All', 'Pizzas', 'Sides', 'Desserts', 'Beverages', 'Value Deals', 'Combos'];

const SearchIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

export default function MenuPage() {
    const dispatch = useAppDispatch();
    const { items, loading } = useAppSelector((s: RootState) => s.menu);
    const [search, setSearch] = useState('');
    const [vegOnly, setVegOnly] = useState(false);
    const [activeCat, setActiveCat] = useState('All');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('category');
        if (cat && ALL_CATS.includes(cat)) setActiveCat(cat);
        dispatch(fetchMenuItems({}));
    }, [dispatch]);

    const filtered = items.filter((item) => {
        const matchCat = activeCat === 'All' || item.category.toLowerCase() === activeCat.toLowerCase();
        const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase());
        const matchVeg = !vegOnly || item.isVeg;
        return matchCat && matchSearch && matchVeg;
    });

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }} className="page-enter">
            <Navbar />

            {/* Dark header */}
            <div style={{ background: 'var(--dark)', padding: 'clamp(1.75rem, 4vw, 2.5rem) 0' }}>
                <div className="container">
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--amber)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                        Order Online
                    </span>
                    <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, color: '#fff', fontSize: 'clamp(1.6rem, 5vw, 2.4rem)', lineHeight: 1.1 }}>
                        Our Menu
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.3rem', fontFamily: "'Inter', sans-serif" }}>
                        Fresh handcrafted pizza, sides and more
                    </p>
                </div>
            </div>

            {/* Sticky filters */}
            <div style={{ position: 'sticky', top: 62, zIndex: 90, background: 'rgba(250,250,248,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0.7rem 0' }}>
                <div className="container">
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Search */}
                        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 150 }}>
                            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', display: 'flex' }}>
                                <SearchIcon />
                            </span>
                            <input className="input" placeholder="Search menu..." value={search} onChange={(e) => setSearch(e.target.value)}
                                style={{ paddingLeft: '2.25rem', height: 38, fontSize: '0.85rem', borderRadius: 'var(--r-full)' }} />
                        </div>

                        {/* Veg toggle */}
                        <button onClick={() => setVegOnly((v) => !v)} style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem',
                            borderRadius: 'var(--r-full)',
                            border: `1.5px solid ${vegOnly ? '#4ade80' : 'var(--border-strong)'}`,
                            background: vegOnly ? '#F0FAF4' : 'var(--surface)',
                            color: vegOnly ? '#166534' : 'var(--text-2)',
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0,
                        }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: vegOnly ? '#4ade80' : 'var(--border-strong)', display: 'inline-block', transition: 'background 0.18s' }} />
                            Veg Only
                        </button>

                        {/* Category pills */}
                        <div className="scroll-x-hide" style={{ display: 'flex', gap: '0.35rem', flex: '1 1 auto', overflowX: 'auto', paddingBottom: '1px' }}>
                            {ALL_CATS.map((cat) => (
                                <button key={cat} className={`pill${activeCat === cat ? ' active' : ''}`} onClick={() => setActiveCat(cat)}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '1rem', fontWeight: 600, fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em' }}>
                    {filtered.length} item{filtered.length !== 1 ? 's' : ''} found
                </p>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                        <LoadingSpinner size="lg" />
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState emoji="🔍" title="No items found" description="Try a different search or category" />
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(180px, 24vw, 240px), 1fr))', gap: '1rem' }}>
                        {filtered.map((item) => (
                            <MenuItemCard key={item._id} item={item} />
                        ))}
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
}
