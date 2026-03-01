import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchMenuItems } from '@/redux/slices/menuSlice';
import type { RootState } from '@/redux/store';
import MenuItemCard from '@/components/menu/MenuItemCard';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const ALL_CATS = ['All', 'Pizzas', 'Sides', 'Desserts', 'Beverages', 'Value Deals', 'Combos'];

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
        <div className="min-h-screen bg-white page-enter flex flex-col">
            <Navbar />

            {/* Header */}
            <div className="bg-[#F7F7F5] border-b border-[#EEEEEE] py-[clamp(2rem,4.5vw,3rem)]">
                <div className="container">
                    <span className="section-label">
                        <SlidersHorizontal size={13} /> Order Online
                    </span>
                    <h1 className="font-outfit font-extrabold text-[#0F0F0F] text-[clamp(1.8rem,5vw,2.6rem)] leading-[1.1] tracking-[-0.02em]">
                        Our Menu
                    </h1>
                    <p className="text-[#8E8E8E] text-[0.9rem] mt-[0.4rem]">
                        Fresh handcrafted pizza, sides and more
                    </p>
                </div>
            </div>

            {/* Sticky filters */}
            <div className="sticky top-[64px] z-90 bg-white/95 backdrop-blur-md border-b border-[#EEEEEE] py-3" style={{ WebkitBackdropFilter: 'blur(16px)' }}>
                <div className="container">
                    <div className="flex gap-[0.6rem] items-center flex-wrap">
                        {/* Search */}
                        <div className="relative flex-[1_1_180px] min-w-[150px]">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E8E] flex">
                                <Search size={15} strokeWidth={2.5} />
                            </span>
                            <input
                                className="input pl-10 h-[40px] text-[0.85rem] rounded-full"
                                placeholder="Search menu..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Veg toggle */}
                        <button
                            onClick={() => setVegOnly((v) => !v)}
                            className="flex items-center gap-[0.4rem] px-4 py-[0.45rem] rounded-full font-ui font-bold text-[0.78rem] cursor-pointer transition-all duration-250 shrink-0"
                            style={{
                                border: `1.5px solid ${vegOnly ? '#16A34A' : '#E0E0DC'}`,
                                background: vegOnly ? '#F0FDF4' : '#fff',
                                color: vegOnly ? '#16A34A' : '#4A4A4A',
                            }}
                        >
                            <span
                                className="w-[10px] h-[10px] rounded-full inline-block transition-colors duration-250"
                                style={{ background: vegOnly ? '#4ade80' : '#D4D4D0' }}
                            />
                            Veg Only
                        </button>

                        {/* Category pills */}
                        <div className="scroll-x-hide flex gap-[0.4rem] flex-[1_1_auto] overflow-x-auto pb-px">
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
            <div className="container flex-1 pt-7 pb-14">
                <p className="text-[0.75rem] text-[#8E8E8E] mb-5 font-semibold font-ui tracking-[0.04em]">
                    {filtered.length} item{filtered.length !== 1 ? 's' : ''} found
                </p>
                {loading ? (
                    <div className="flex justify-center py-16">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState title="No items found" description="Try a different search or category" icon={Search} />
                ) : (
                    <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(clamp(180px,24vw,240px),1fr))' }}>
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
