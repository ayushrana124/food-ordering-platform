import { useState } from 'react';
import { Heart, SlidersHorizontal } from 'lucide-react';
import type { IMenuItem } from '@/types';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import { useT, money } from '@/i18n';
import { VegMark, Stepper, DishFallback } from '@/components/ui/Bits';
import toast from 'react-hot-toast';

interface DishCardProps {
    item: IMenuItem;
    onOpen: (item: IMenuItem) => void;
    /** Raised when the customer tries to favourite while signed out. */
    onNeedSignIn?: () => void;
}

/**
 * One row in the menu.
 *
 * A row rather than a grid tile: at 360px a two-column grid leaves ~160px per
 * card, which truncates dish names and pushes the price and Add control into a
 * cramped stack. A full-width row gives the name room to breathe and puts a
 * 104px photo — big enough to judge the food by — next to a comfortable
 * tap target.
 */
export default function DishCard({ item, onOpen, onNeedSignIn }: DishCardProps) {
    const { addItem, setQuantity, getItemCount, getSoleLine } = useCart();
    const { isFavorite, toggle, canFavorite } = useFavorites();
    const t = useT();
    const [imgFailed, setImgFailed] = useState(false);

    const count = getItemCount(item._id);
    const soleLine = getSoleLine(item._id);
    const hasOptions = (item.customizations?.length ?? 0) > 0;
    const faved = isFavorite(item._id);

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!item.isAvailable) return;

        // Anything with options opens the sheet, so the customer sees what they
        // are choosing instead of silently getting defaults.
        if (hasOptions) { onOpen(item); return; }

        addItem({ menuItemId: item._id });
        toast.success(t('dish.addedToCart', { name: item.name }));
    };

    const handleStep = (next: number) => {
        // With several option combinations of the same dish in the basket there
        // is no single line to step, so send them to the cart to be explicit.
        if (!soleLine) { onOpen(item); return; }
        setQuantity(soleLine.cartItemId, next);
    };

    const handleHeart = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canFavorite) { onNeedSignIn?.(); return; }
        const nowFaved = !faved;
        toggle(item._id);
        toast.success(nowFaved ? t('fav.added') : t('fav.removed'));
    };

    return (
        <article
            className="c-dish"
            data-out={!item.isAvailable}
            onClick={() => onOpen(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item); } }}
            aria-label={item.name}
        >
            {/* ── Text column ── */}
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <VegMark isVeg={item.isVeg} />
                    {hasOptions && (
                        <span
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                font: '700 .62rem/1 "DM Sans", sans-serif',
                                color: 'var(--c-brand-deep)', letterSpacing: '.04em', textTransform: 'uppercase',
                            }}
                        >
                            <SlidersHorizontal size={9} />
                            {t('menu.customisable')}
                        </span>
                    )}
                </div>

                <h3 className="c-dish__name">{item.name}</h3>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span className="c-dish__price">{money(item.price)}</span>
                    {!item.isAvailable && (
                        <span style={{ font: '700 .7rem/1 "DM Sans", sans-serif', color: 'var(--c-danger)' }}>
                            {t('menu.unavailable')}
                        </span>
                    )}
                </div>

                {item.description && <p className="c-dish__desc">{item.description}</p>}
            </div>

            {/* ── Media column, with the add control overlapping its lower edge ── */}
            <div style={{ position: 'relative', paddingBottom: 14 }}>
                <div className="c-dish__media">
                    {item.image && !imgFailed ? (
                        <img
                            src={item.image}
                            alt=""
                            className="c-dish__img"
                            loading="lazy"
                            decoding="async"
                            onError={() => setImgFailed(true)}
                        />
                    ) : (
                        <DishFallback name={item.name} />
                    )}

                    <button
                        type="button"
                        onClick={handleHeart}
                        aria-label={faved ? t('fav.removed') : t('fav.added')}
                        aria-pressed={faved}
                        style={{
                            position: 'absolute', top: 5, right: 5, zIndex: 2,
                            width: 28, height: 28, borderRadius: 999, border: 0, cursor: 'pointer',
                            display: 'grid', placeItems: 'center',
                            background: 'rgba(255,255,255,.92)',
                            backdropFilter: 'blur(4px)',
                            color: faved ? 'var(--c-danger)' : 'var(--c-ink-3)',
                            boxShadow: 'var(--c-sh-1)',
                        }}
                    >
                        <Heart size={14} fill={faved ? 'currentColor' : 'none'} strokeWidth={2.4} />
                    </button>
                </div>

                <div className="c-dish__action">
                    {count > 0 && item.isAvailable ? (
                        <Stepper value={count} onChange={handleStep} min={0} />
                    ) : (
                        <button
                            type="button"
                            className="c-add"
                            onClick={handleAdd}
                            disabled={!item.isAvailable}
                        >
                            {item.isAvailable ? t('common.add') : t('menu.unavailable')}
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}
