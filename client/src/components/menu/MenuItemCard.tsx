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
            addItem({ menuItemId: item._id, name: item.name, price: item.price, image: item.image, isVeg: item.isVeg, selectedCustomizations: [] });
            toast.success(`${item.name} added to cart!`);
        }
    };

    const handleDecrement = () => {
        const last = [...cartItems].reverse().find((i) => i.menuItemId === item._id);
        if (last) removeItem(last.cartId);
    };

    return (
        <>
            <div className="card card-hover flex flex-col h-full">
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
                        <div className="flex items-center justify-center h-full text-[#D4D4D0]">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12l10 10 10-10" />
                                <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none" />
                                <circle cx="14" cy="8" r="1" fill="currentColor" stroke="none" />
                                <circle cx="15" cy="13" r="0.9" fill="currentColor" stroke="none" />
                            </svg>
                        </div>
                    )}

                    {/* Veg/Non-veg badge */}
                    <span className="absolute top-2.5 left-2.5">
                        <span className={item.isVeg ? 'badge-veg' : 'badge-nonveg'}>
                            <span className="w-[6px] h-[6px] rounded-full bg-current inline-block" />
                            {item.isVeg ? 'VEG' : 'NON-VEG'}
                        </span>
                    </span>

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

                        {item.isAvailable && (
                            countInCart > 0 ? (
                                <div className="flex items-center gap-2">
                                    <button className="qty-btn" onClick={handleDecrement}>−</button>
                                    <span className="font-extrabold text-[#0F0F0F] min-w-[20px] text-center">{countInCart}</span>
                                    <button className="qty-btn" onClick={handleAddClick}>+</button>
                                </div>
                            ) : (
                                <button
                                    className="btn-primary flex items-center gap-1.5"
                                    style={{ padding: '0.4rem 1rem', fontSize: '0.82rem' }}
                                    onClick={handleAddClick}
                                >
                                    <ShoppingCart size={14} /> Add
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {showCustomize && (
                <CustomizationModal item={item} onClose={() => setShowCustomize(false)} />
            )}
            {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        </>
    );
}
