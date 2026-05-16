import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGrid } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

interface CategoryFABProps {
    categories: string[];
    activeCat: string;
    onSelect: (cat: string) => void;
}

export default function CategoryFAB({ categories, activeCat, onSelect }: CategoryFABProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const fabRef = useRef<HTMLButtonElement>(null);
    const { items: cartItems } = useCart();
    const hasCart = cartItems.length > 0;
    const fabBottom = hasCart ? 76 : 24;

    // Close on scroll
    useEffect(() => {
        if (!isOpen) return;
        const close = () => setIsOpen(false);
        window.addEventListener('scroll', close, { passive: true });
        return () => window.removeEventListener('scroll', close);
    }, [isOpen]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                fabRef.current && !fabRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const handleSelect = (cat: string) => {
        onSelect(cat);
        setIsOpen(false);
    };

    const fab = (
        <div className="sm:hidden">
            {/* Dropdown */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'fixed',
                        bottom: fabBottom + 56,
                        right: 20,
                        zIndex: 7500,
                        width: 200,
                        maxHeight: '60vh',
                        overflowY: 'auto',
                        background: 'white',
                        borderRadius: 18,
                        border: '1px solid #EEEEEE',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                        animation: 'slideUp 0.25s cubic-bezier(0.22, 0.61, 0.36, 1)',
                        padding: '6px',
                    }}
                >
                    {categories.map((cat) => {
                        const isActive = activeCat === cat;
                        return (
                            <button
                                key={cat}
                                onClick={() => handleSelect(cat)}
                                className="w-full text-left px-3.5 py-2.5 rounded-xl text-[0.84rem] font-semibold transition-colors cursor-pointer border-none"
                                style={{
                                    background: isActive ? '#FFFBF0' : 'transparent',
                                    color: isActive ? '#E8A317' : '#4A4A4A',
                                    fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                {cat}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* FAB Button */}
            <button
                ref={fabRef}
                onClick={() => setIsOpen((v) => !v)}
                aria-label="Select category"
                style={{
                    position: 'fixed',
                    bottom: fabBottom,
                    right: 20,
                    zIndex: 7500,
                    height: 44,
                    paddingLeft: 14,
                    paddingRight: 16,
                    borderRadius: 9999,
                    border: 'none',
                    background: 'linear-gradient(135deg, #E8A317 0%, #F0B429 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(232,163,23,0.4), 0 2px 6px rgba(0,0,0,0.1)',
                    animation: 'scaleIn 0.25s cubic-bezier(0.22, 0.61, 0.36, 1)',
                    whiteSpace: 'nowrap',
                }}
            >
                <LayoutGrid size={17} />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeCat}
                </span>
            </button>
        </div>
    );

    return createPortal(fab, document.body);
}
