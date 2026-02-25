import { useState } from 'react';
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

    const handleAddClick = () => {
        if (!isAuthenticated) { setShowLogin(true); return; }
        if (item.customizations.length > 0) {
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
                    className="relative overflow-hidden bg-[#F4F3EF] flex-shrink-0"
                    style={{ height: compact ? 140 : 180 }}
                >
                    {item.image && !imgError ? (
                        <img
                            src={item.image}
                            alt={item.name}
                            onError={() => setImgError(true)}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-[#D0CFC9]">
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
                    <span className="absolute top-2 left-2">
                        <span className={item.isVeg ? 'badge-veg' : 'badge-nonveg'}>
                            <span className="w-[6px] h-[6px] rounded-full bg-current inline-block" />
                            {item.isVeg ? 'VEG' : 'NON-VEG'}
                        </span>
                    </span>

                    {/* Unavailable overlay */}
                    {!item.isAvailable && (
                        <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
                            <span className="bg-[#1C1C1E] text-white px-3 py-1 rounded-full text-[0.8rem] font-semibold">
                                Currently Unavailable
                            </span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-[0.875rem] flex flex-col flex-1 gap-1">
                    <h3
                        className="font-ui font-bold text-[#111] leading-snug"
                        style={{ fontSize: compact ? '0.92rem' : '1rem' }}
                    >
                        {item.name}
                    </h3>
                    {!compact && (
                        <p
                            className="text-[0.8rem] text-[#555] leading-relaxed overflow-hidden"
                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                        >
                            {item.description}
                        </p>
                    )}
                    {item.customizations.length > 0 && (
                        <p className="text-[0.75rem] text-[#9B9B9B] italic">Customizable</p>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-2">
                        <span
                            className="font-outfit font-extrabold text-[#111]"
                            style={{ fontSize: compact ? '1.05rem' : '1.2rem' }}
                        >
                            ₹{item.price}
                        </span>

                        {item.isAvailable && (
                            countInCart > 0 ? (
                                <div className="flex items-center gap-2">
                                    <button className="qty-btn" onClick={handleDecrement}>−</button>
                                    <span className="font-extrabold text-[#111] min-w-[20px] text-center">{countInCart}</span>
                                    <button className="qty-btn" onClick={handleAddClick}>+</button>
                                </div>
                            ) : (
                                <button
                                    className="btn-dark"
                                    style={{ padding: '0.35rem 0.875rem', fontSize: '0.85rem' }}
                                    onClick={handleAddClick}
                                >
                                    + Add
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
