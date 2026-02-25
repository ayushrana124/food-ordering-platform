import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
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
        <div className="min-h-screen bg-[#FAFAF8] page-enter flex flex-col">
            <Navbar />

            {/* Light header */}
            <div className="bg-[#F4F3EF] border-b border-[#EBEBEB] py-[clamp(1.75rem,4vw,2.5rem)]">
                <div className="container">
                    <span className="section-label">
                        Order Online
                    </span>
                    <h1 className="font-outfit font-extrabold text-[#111] text-[clamp(1.6rem,5vw,2.4rem)] leading-[1.1]">
                        Our Menu
                    </h1>
                    <p className="text-[#9B9B9B] text-[0.875rem] mt-[0.3rem]">
                        Fresh handcrafted pizza, sides and more
                    </p>
                </div>
            </div>

            {/* Sticky filters */}
            <div className="sticky top-[62px] z-90 bg-[rgba(250,250,248,0.97)] backdrop-blur-md border-b border-[#EBEBEB] py-[0.7rem]">
                <div className="container">
                    <div className="flex gap-[0.6rem] items-center flex-wrap">
                        {/* Search */}
                        <div className="relative flex-[1_1_180px] min-w-[150px]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9B9B] flex">
                                <Search size={15} strokeWidth={2.5} />
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
                            className="flex items-center gap-[0.4rem] px-[0.85rem] py-[0.4rem] rounded-full font-ui font-bold text-[0.78rem] cursor-pointer transition-all duration-180 shrink-0"
                            style={{
                                border: `1.5px solid ${vegOnly ? '#2E7D32' : '#D0CFC9'}`,
                                background: vegOnly ? '#E8F5E9' : '#fff',
                                color: vegOnly ? '#2E7D32' : '#555',
                            }}
                        >
                            <span
                                className="w-[9px] h-[9px] rounded-full inline-block transition-colors duration-180"
                                style={{ background: vegOnly ? '#4ade80' : '#D0CFC9' }}
                            />
                            Veg Only
                        </button>

                        {/* Category pills */}
                        <div className="scroll-x-hide flex gap-[0.35rem] flex-[1_1_auto] overflow-x-auto pb-px">
                            {ALL_CATS.map((cat) => (
                                <button
                                    key={cat}
                                    className={`pill shadow-sm${activeCat === cat ? ' active' : ''}`}
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
            <div className="container flex-1 pt-6 pb-12">
                <p className="text-[0.75rem] text-[#9B9B9B] mb-4 font-semibold font-ui tracking-[0.04em]">
                    {filtered.length} item{filtered.length !== 1 ? 's' : ''} found
                </p>
                {loading ? (
                    <div className="flex justify-center py-16">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState title="No items found" description="Try a different search or category" icon={Search} />
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
