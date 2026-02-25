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
        <div className="min-h-screen bg-[#FAFAF8] page-enter">
            <Navbar />

            {/* Dark header */}
            <div className="bg-[#111] py-[clamp(1.75rem,4vw,2.5rem)]">
                <div className="container">
                    <span className="text-[0.7rem] font-bold tracking-[0.16em] text-[#D4920A] uppercase block mb-[0.3rem]">
                        Order Online
                    </span>
                    <h1 className="font-ui font-extrabold text-white text-[clamp(1.6rem,5vw,2.4rem)] leading-[1.1]">
                        Our Menu
                    </h1>
                    <p className="text-[rgba(255,255,255,0.5)] text-[0.875rem] mt-[0.3rem] font-ui">
                        Fresh handcrafted pizza, sides and more
                    </p>
                </div>
            </div>

            {/* Sticky filters */}
            <div className="sticky top-[62px] z-[90] bg-[rgba(250,250,248,0.97)] backdrop-blur-[12px] border-b border-[#EBEBEB] py-[0.7rem]">
                <div className="container">
                    <div className="flex gap-[0.6rem] items-center flex-wrap">
                        {/* Search */}
                        <div className="relative flex-[1_1_180px] min-w-[150px]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9B9B] flex">
                                <SearchIcon />
                            </span>
                            <input
                                className="input pl-9 h-[38px] text-[0.85rem] rounded-full"
                                placeholder="Search menu..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Veg toggle */}
                        <button
                            onClick={() => setVegOnly((v) => !v)}
                            className="flex items-center gap-[0.4rem] px-[0.85rem] py-[0.4rem] rounded-full font-ui font-bold text-[0.78rem] cursor-pointer transition-all duration-[180ms] flex-shrink-0"
                            style={{
                                border: `1.5px solid ${vegOnly ? '#4ade80' : '#D0CFC9'}`,
                                background: vegOnly ? '#F0FAF4' : '#fff',
                                color: vegOnly ? '#166534' : '#555',
                            }}
                        >
                            <span
                                className="w-[9px] h-[9px] rounded-full inline-block transition-colors duration-[180ms]"
                                style={{ background: vegOnly ? '#4ade80' : '#D0CFC9' }}
                            />
                            Veg Only
                        </button>

                        {/* Category pills */}
                        <div className="scroll-x-hide flex gap-[0.35rem] flex-[1_1_auto] overflow-x-auto pb-[1px]">
                            {ALL_CATS.map((cat) => (
                                <button
                                    key={cat}
                                    className={`pill${activeCat === cat ? ' active' : ''}`}
                                    onClick={() => setActiveCat(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="container pt-6 pb-12">
                <p className="text-[0.75rem] text-[#9B9B9B] mb-4 font-semibold font-ui tracking-[0.04em]">
                    {filtered.length} item{filtered.length !== 1 ? 's' : ''} found
                </p>
                {loading ? (
                    <div className="flex justify-center py-16">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState emoji="🔍" title="No items found" description="Try a different search or category" />
                ) : (
                    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(clamp(180px,24vw,240px),1fr))' }}>
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
