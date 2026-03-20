import { useState } from 'react';
import { ShoppingCart, Sparkles } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import type { IMenuItem } from '@/types';
import CustomizationModal from './CustomizationModal';
import LoginModal from '@/components/common/LoginModal';
import toast from 'react-hot-toast';

interface MenuItemCardProps {
    item: IMenuItem;
    compact?: boolean;
}

export default function MenuItemCard({ item, compact = false }: MenuItemCardProps) {
    const { addItem, removeItem, getItemCount, items: cartItems } = useCart();
    const { isAuthenticated } = useAuth();
    const [showCustomize, setShowCustomize] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [imgError, setImgError] = useState(false);
    const countInCart = getItemCount(item._id);

    const hasCustomizations = item.customizations && item.customizations.length > 0;

    const handleAddClick = () => {
        if (!isAuthenticated) { setShowLogin(true); return; }
        if (hasCustomizations) {
            setShowCustomize(true);
        } else {
            addItem({ menuItemId: item._id });
            toast.success(`${item.name} added to cart!`);
        }
    };

    const handleDecrement = () => {
        const last = [...cartItems].reverse().find((i) => i.menuItemId === item._id);
        if (last) removeItem(last.cartItemId);
    };

    const VegBadge = () => (
        <span className={item.isVeg ? 'badge-veg' : 'badge-nonveg'}>
            <span className="w-[6px] h-[6px] rounded-full bg-current inline-block" />
            {item.isVeg ? 'VEG' : 'NON-VEG'}
        </span>
    );

    const PlaceholderImg = () => (
        <div className="flex items-center justify-center h-full text-[#D4D4D0]">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12l10 10 10-10" />
                <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="14" cy="8" r="1" fill="currentColor" stroke="none" />
                <circle cx="15" cy="13" r="0.9" fill="currentColor" stroke="none" />
            </svg>
        </div>
    );

    const AddButton = ({ size = 'md' }: { size?: 'sm' | 'md' }) => {
        if (!item.isAvailable) return null;
        const btnStyle = size === 'sm'
            ? { padding: '0.35rem 0.75rem', fontSize: '0.78rem' }
            : { padding: '0.4rem 1rem', fontSize: '0.82rem' };

        return countInCart > 0 ? (
            <div className="flex items-center gap-2">
                <button className="qty-btn" onClick={handleDecrement}>−</button>
                <span className="font-extrabold text-[#0F0F0F] min-w-[20px] text-center text-sm">{countInCart}</span>
                <button className="qty-btn" onClick={handleAddClick}>+</button>
            </div>
        ) : (
            <button
                className="btn-primary flex items-center gap-1.5 shrink-0"
                style={btnStyle}
                onClick={handleAddClick}
            >
                <ShoppingCart size={13} /> Add
            </button>
        );
    };

    return (
        <>
            {/* ── Desktop / tablet: vertical card ── */}
            <div className="card card-hover flex-col h-full hidden sm:flex">
                {/* Image */}
                <div
                    className="relative overflow-hidden bg-[#F7F7F5] flex-shrink-0"
                    style={{ height: compact ? 150 : 190 }}
                >
                    {item.image && !imgError ? (
                        <img
                            src={item.image}
                            alt={item.name}
                            onError={() => setImgError(true)}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.06]"
                        />
                    ) : (
                        <PlaceholderImg />
                    )}

                    {/* Veg/Non-veg badge */}
                    <span className="absolute top-2.5 left-2.5"><VegBadge /></span>

                    {/* Customizable badge */}
                    {hasCustomizations && (
                        <span className="absolute top-2.5 right-2.5">
                            <span
                                className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[0.6rem] font-bold uppercase tracking-wider"
                                style={{
                                    background: 'rgba(232,163,23,0.12)',
                                    color: '#E8A317',
                                    backdropFilter: 'blur(4px)',
                                    border: '1px solid rgba(232,163,23,0.2)',
                                }}
                            >
                                <Sparkles size={9} />
                                Options
                            </span>
                        </span>
                    )}

                    {/* Unavailable overlay */}
                    {!item.isAvailable && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="bg-[#0F0F0F] text-white px-4 py-1.5 rounded-full text-[0.8rem] font-semibold">
                                Currently Unavailable
                            </span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1 gap-1">
                    <h3
                        className="font-ui font-bold text-[#0F0F0F] leading-snug"
                        style={{ fontSize: compact ? '0.92rem' : '1rem' }}
                    >
                        {item.name}
                    </h3>
                    {!compact && (
                        <p
                            className="text-[0.8rem] text-[#4A4A4A] leading-relaxed overflow-hidden"
                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                        >
                            {item.description}
                        </p>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-3">
                        <span
                            className="font-outfit font-extrabold text-[#0F0F0F]"
                            style={{ fontSize: compact ? '1.05rem' : '1.2rem' }}
                        >
                            ₹{item.price}
                        </span>
                        <AddButton />
                    </div>
                </div>
            </div>

            {/* ── Mobile: horizontal card ── */}
            <div
                className="sm:hidden flex flex-row items-stretch rounded-2xl border border-[#EEEEEE] bg-white overflow-hidden transition-all duration-300 active:scale-[0.99]"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)', minHeight: 116 }}
            >
                {/* Left: text content */}
                <div className="flex flex-col justify-between p-3 flex-1 min-w-0">
                    {/* Veg badge */}
                    <div className="mb-1">
                        <VegBadge />
                        {hasCustomizations && (
                            <span
                                className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded text-[0.55rem] font-bold uppercase tracking-wide"
                                style={{ background: 'rgba(232,163,23,0.1)', color: '#E8A317', border: '1px solid rgba(232,163,23,0.18)' }}
                            >
                                <Sparkles size={8} /> Options
                            </span>
                        )}
                    </div>

                    <h3 className="font-ui font-bold text-[#0F0F0F] text-[0.88rem] leading-snug line-clamp-2">
                        {item.name}
                    </h3>

                    {item.description && (
                        <p
                            className="text-[0.73rem] text-[#8E8E8E] mt-0.5 leading-relaxed"
                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        >
                            {item.description}
                        </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                        <span className="font-outfit font-extrabold text-[#0F0F0F] text-[1rem]">
                            ₹{item.price}
                        </span>
                        <AddButton size="sm" />
                    </div>
                </div>

                {/* Right: image */}
                <div className="relative flex-shrink-0 bg-[#F7F7F5]" style={{ width: 110 }}>
                    {item.image && !imgError ? (
                        <img
                            src={item.image}
                            alt={item.name}
                            onError={() => setImgError(true)}
                            className="w-full h-full object-cover"
                            style={{ minHeight: 110 }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ minHeight: 110 }}>
                            <PlaceholderImg />
                        </div>
                    )}

                    {/* Unavailable overlay */}
                    {!item.isAvailable && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                            <span className="text-[0.65rem] font-semibold text-[#0F0F0F] text-center px-1">
                                Unavailable
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {showCustomize && (
                <CustomizationModal item={item} onClose={() => setShowCustomize(false)} />
            )}
            {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        </>
    );
}
