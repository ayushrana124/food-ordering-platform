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
        // Find the last added cart item for this menu item and decrement it
        const last = [...cartItems].reverse().find((i) => i.menuItemId === item._id);
        if (last) {
            if (last.quantity > 1) {
                // updateQuantity is exposed via setQuantity in useCart
                // We remove the item and let the decrement happen via removeItem for qty=1
            }
            removeItem(last.cartId);
        }
    };

    return (
        <>
            <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Image */}
                <div style={{ position: 'relative', height: compact ? 140 : 180, overflow: 'hidden', background: 'var(--color-surface-alt)', flexShrink: 0 }}>
                    {item.image && !imgError ? (
                        <img
                            src={item.image}
                            alt={item.name}
                            onError={() => setImgError(true)}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--border-strong)' }}>
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
                    <span style={{ position: 'absolute', top: 8, left: 8 }}>
                        <span className={item.isVeg ? 'badge-veg' : 'badge-nonveg'}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                            {item.isVeg ? 'VEG' : 'NON-VEG'}
                        </span>
                    </span>
                    {/* Unavailable overlay */}
                    {!item.isAvailable && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(255,255,255,0.75)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span style={{ background: '#1C1C1E', color: 'white', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600 }}>
                                Currently Unavailable
                            </span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.25rem' }}>
                    <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: compact ? '0.92rem' : '1rem', color: 'var(--text-1)', lineHeight: 1.3 }}>
                        {item.name}
                    </h3>
                    {!compact && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.description}
                        </p>
                    )}
                    {item.customizations.length > 0 && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            Customizable
                        </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.5rem' }}>
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: compact ? '1.05rem' : '1.2rem', fontWeight: 800, color: '#111' }}>
                            ₹{item.price}
                        </span>

                        {item.isAvailable && (
                            countInCart > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <button className="qty-btn" onClick={handleDecrement}>−</button>
                                    <span style={{ fontWeight: 800, color: '#111', minWidth: 20, textAlign: 'center' }}>{countInCart}</span>
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
