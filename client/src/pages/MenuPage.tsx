import { useState, useEffect, useMemo } from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchMenuItems, fetchCategories, fetchRestaurant } from '@/redux/slices/menuSlice';
import type { RootState } from '@/redux/store';
import MenuItemCard from '@/components/menu/MenuItemCard';
import CategoryFAB from '@/components/menu/CategoryFAB';
import SearchOverlay from '@/components/menu/SearchOverlay';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import TrackOrderFAB from '@/components/common/TrackOrderFAB';

export default function MenuPage() {
    const dispatch = useAppDispatch();
    const { items, categories, restaurant, loading } = useAppSelector((s: RootState) => s.menu);
    const [vegOnly, setVegOnly] = useState(false);
    const [activeCat, setActiveCat] = useState('All');
    const [searchOpen, setSearchOpen] = useState(false);

    const catNames = useMemo(() => ['All', ...categories.map(c => c.name)], [categories]);

    useEffect(() => {
        window.scrollTo(0, 0);
        dispatch(fetchMenuItems({}));
        dispatch(fetchCategories());
        dispatch(fetchRestaurant());
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('category');
        if (cat) setActiveCat(cat);
    }, [dispatch]);

    const filtered = items.filter((item) => {
        const matchCat = activeCat === 'All' || item.category.toLowerCase() === activeCat.toLowerCase();
        const matchVeg = !vegOnly || item.isVeg;
        return matchCat && matchVeg;
    });

    const isClosed = restaurant && restaurant.isOpen === false;

    return (
        <div className="min-h-screen bg-white page-enter flex flex-col" style={{ paddingBottom: 80 }}>
            <Navbar />

            {/* Closed banner */}
            {isClosed && (
                <div
                    className="border-b"
                    style={{
                        background: 'linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%)',
                        borderColor: '#FCA5A5',
                    }}
                >
                    <div className="container py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#DC2626] flex items-center justify-center shrink-0">
                            <AlertTriangle size={16} className="text-white" />
                        </div>
                        <div>
                            <p className="font-semibold text-[0.88rem] text-[#DC2626]">Restaurant is currently closed</p>
                            <p className="text-[0.78rem] text-[#9B1C1C]">Orders are not being accepted right now. Please check back later.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Sticky filters */}
            <div className="sticky top-[60px] z-90 bg-white backdrop-blur-md border-b border-[#EEEEEE] py-3" style={{ WebkitBackdropFilter: 'blur(16px)' }}>
                <div className="container">
                    <div className="flex gap-[0.6rem] items-center flex-wrap">
                        {/* Search trigger (opens overlay) */}
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="input pl-10 h-[40px] text-[0.85rem] rounded-full flex-[1_1_180px] min-w-[150px] relative text-left cursor-pointer"
                            style={{ color: '#8E8E8E' }}
                        >
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E8E] flex">
                                <Search size={15} strokeWidth={2.5} />
                            </span>
                            Search menu...
                        </button>

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

                        {/* Category pills — desktop only */}
                        <div className="scroll-x-hide hidden sm:flex gap-[0.4rem] flex-[1_1_auto] overflow-x-auto pb-px">
                            {catNames.map((cat) => (
                                <button
                                    key={cat}
                                    className={`pill${activeCat === cat ? ' active' : ''}`}
                                    onClick={() => { setActiveCat(cat); window.scrollTo({ top: 0, behavior: 'instant' }); }}
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
                    <EmptyState title="No items found" description="Try a different category" icon={Search} />
                ) : (
                    <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(clamp(180px,24vw,240px),1fr))]">
                        {filtered.map((item) => (
                            <MenuItemCard key={item._id} item={item} />
                        ))}
                    </div>
                )}
            </div>

            <Footer />

            {/* Mobile category FAB */}
            <CategoryFAB
                categories={catNames}
                activeCat={activeCat}
                onSelect={(cat) => { setActiveCat(cat); window.scrollTo({ top: 0, behavior: 'instant' }); }}
            />

            {/* Search overlay */}
            {searchOpen && (
                <SearchOverlay
                    items={items}
                    vegOnly={vegOnly}
                    onClose={() => setSearchOpen(false)}
                />
            )}

            <TrackOrderFAB />
        </div>
    );
}
