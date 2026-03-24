import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ArrowLeft } from 'lucide-react';
import type { IMenuItem } from '@/types';
import MenuItemCard from './MenuItemCard';
import EmptyState from '@/components/common/EmptyState';

interface SearchOverlayProps {
    items: IMenuItem[];
    vegOnly: boolean;
    onClose: () => void;
}

export default function SearchOverlay({ items, vegOnly, onClose }: SearchOverlayProps) {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Body scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    // Auto-focus
    useEffect(() => {
        const id = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 150);
        return () => clearTimeout(id);
    }, []);

    const results = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return items.filter((item) => {
            const matchSearch = item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
            const matchVeg = !vegOnly || item.isVeg;
            return matchSearch && matchVeg;
        });
    }, [query, items, vegOnly]);

    const hasQuery = query.trim().length > 0;

    const overlay = (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            className="search-overlay-backdrop"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div
                className="search-overlay-panel"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with search input */}
                <div
                    className="shrink-0 flex items-center gap-2.5 border-b border-[#EEEEEE]"
                    style={{ padding: '12px 16px' }}
                >
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl border border-[#EEEEEE] bg-white flex items-center justify-center cursor-pointer text-[#4A4A4A] hover:bg-[#F7F7F5] transition-colors shrink-0 sm:hidden"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl border border-[#EEEEEE] bg-white items-center justify-center cursor-pointer text-[#4A4A4A] hover:bg-[#F7F7F5] transition-colors shrink-0 hidden sm:flex"
                    >
                        <X size={16} />
                    </button>
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E8E] flex">
                            <Search size={15} strokeWidth={2.5} />
                        </span>
                        <input
                            ref={inputRef}
                            className="input pl-10 h-[40px] text-[0.85rem] rounded-full w-full"
                            placeholder="Search for items..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto" style={{ padding: '16px' }}>
                    {!hasQuery ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-[#F7F7F5] flex items-center justify-center text-[#C4C4C0] mb-4">
                                <Search size={24} />
                            </div>
                            <p className="text-[#8E8E8E] text-[0.88rem] font-medium">Start typing to search</p>
                            <p className="text-[#C4C4C0] text-[0.78rem] mt-1">Search for pizzas, sides, drinks...</p>
                        </div>
                    ) : results.length === 0 ? (
                        <EmptyState
                            title="No items found"
                            description={`No results for "${query}"`}
                            icon={Search}
                        />
                    ) : (
                        <>
                            <p className="text-[0.75rem] text-[#8E8E8E] mb-4 font-semibold font-ui tracking-[0.04em]">
                                {results.length} result{results.length !== 1 ? 's' : ''}
                            </p>
                            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                {results.map((item) => (
                                    <MenuItemCard key={item._id} item={item} compact />
                                ))}
                            </div>
                        </>
                    )}
                    {/* Bottom padding for StickyCartBar */}
                    <div style={{ height: 80 }} />
                </div>
            </div>
        </div>
    );

    return createPortal(overlay, document.body);
}
