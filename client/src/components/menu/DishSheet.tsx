import { useState, useMemo, useEffect } from 'react';
import { Heart, Check } from 'lucide-react';
import type { IMenuItem } from '@/types';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import { useT, money } from '@/i18n';
import Sheet from '@/components/ui/Sheet';
import { VegMark, Stepper, DishFallback, Tag } from '@/components/ui/Bits';
import toast from 'react-hot-toast';

interface DishSheetProps {
    item: IMenuItem | null;
    onClose: () => void;
    onNeedSignIn?: () => void;
}

/**
 * The dish detail sheet.
 *
 * Previously tapping a dish did nothing unless it happened to have options, so
 * there was no way to see a photo at any useful size or read a description past
 * two clipped lines. This is now the single place a dish is configured: photo,
 * full description, options and quantity, with a running total that updates as
 * choices are made — so nobody is surprised by the price after adding.
 */
export default function DishSheet({ item, onClose, onNeedSignIn }: DishSheetProps) {
    const { addItem } = useCart();
    const { isFavorite, toggle, canFavorite } = useFavorites();
    const t = useT();

    const [selections, setSelections] = useState<Record<string, string>>({});
    const [quantity, setQuantity] = useState(1);
    const [imgFailed, setImgFailed] = useState(false);

    // Reset per dish, and pre-select the first option of each required group so
    // the add button is reachable without hunting for what is missing.
    useEffect(() => {
        if (!item) return;
        const initial: Record<string, string> = {};
        for (const group of item.customizations ?? []) {
            if (group.required && group.options?.length) initial[group.name] = group.options[0].name;
        }
        setSelections(initial);
        setQuantity(1);
        setImgFailed(false);
    }, [item]);

    const unitPrice = useMemo(() => {
        if (!item) return 0;
        let price = item.price;
        for (const group of item.customizations ?? []) {
            const chosen = selections[group.name];
            if (!chosen) continue;
            const option = group.options?.find((o) => o.name === chosen);
            if (option) price += option.price;
        }
        return price;
    }, [item, selections]);

    if (!item) return null;

    const faved = isFavorite(item._id);
    const missingRequired = (item.customizations ?? [])
        .filter((g) => g.required && !selections[g.name])
        .map((g) => g.name);

    const handleAdd = () => {
        if (missingRequired.length > 0) return;

        addItem({
            menuItemId: item._id,
            quantity,
            selectedCustomizations: Object.entries(selections).map(([groupName, optionName]) => ({ groupName, optionName })),
        });

        toast.success(t('dish.addedToCart', { name: item.name }));
        onClose();
    };

    const handleHeart = () => {
        if (!canFavorite) { onNeedSignIn?.(); return; }
        const nowFaved = !faved;
        toggle(item._id);
        toast.success(nowFaved ? t('fav.added') : t('fav.removed'));
    };

    return (
        <Sheet
            open={!!item}
            onClose={onClose}
            footer={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Stepper value={quantity} onChange={(n) => setQuantity(Math.max(1, n))} min={1} max={20} />
                    <button
                        type="button"
                        className="c-btn c-btn--primary"
                        style={{ flex: 1, height: 50, borderRadius: 'var(--c-r-lg)', justifyContent: 'space-between' }}
                        onClick={handleAdd}
                        disabled={!item.isAvailable || missingRequired.length > 0}
                    >
                        <span>{t('dish.addToCart')}</span>
                        <span style={{ font: '800 1rem/1 Outfit, sans-serif' }}>{money(unitPrice * quantity)}</span>
                    </button>
                </div>
            }
        >
            {/* ── Photo ── */}
            <div style={{ position: 'relative', margin: '0 16px', borderRadius: 'var(--c-r-lg)', overflow: 'hidden', aspectRatio: '16 / 10' }}>
                {item.image && !imgFailed ? (
                    <img
                        src={item.image}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={() => setImgFailed(true)}
                    />
                ) : (
                    <DishFallback name={item.name} radius={0} />
                )}

                <button
                    type="button"
                    onClick={handleHeart}
                    aria-label={faved ? t('fav.removed') : t('fav.added')}
                    aria-pressed={faved}
                    style={{
                        position: 'absolute', top: 10, right: 10,
                        width: 38, height: 38, borderRadius: 999, border: 0, cursor: 'pointer',
                        display: 'grid', placeItems: 'center',
                        background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(6px)',
                        color: faved ? 'var(--c-danger)' : 'var(--c-ink-2)',
                        boxShadow: 'var(--c-sh-2)',
                    }}
                >
                    <Heart size={18} fill={faved ? 'currentColor' : 'none'} strokeWidth={2.3} />
                </button>
            </div>

            {/* ── Heading ── */}
            <div className="c-wrap" style={{ paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <VegMark isVeg={item.isVeg} size={16} />
                    {!item.isAvailable && <Tag tone="danger">{t('dish.soldOut')}</Tag>}
                </div>

                <h2 style={{ font: '800 1.32rem/1.25 Outfit, sans-serif', color: 'var(--c-ink)' }}>{item.name}</h2>
                <p style={{ marginTop: 4, font: '800 1.08rem/1 Outfit, sans-serif', color: 'var(--c-ink)' }}>
                    {money(item.price)}
                </p>

                {item.description && (
                    <p style={{ marginTop: 10, font: '400 .88rem/1.55 "DM Sans", sans-serif', color: 'var(--c-ink-2)' }}>
                        {item.description}
                    </p>
                )}
            </div>

            {/* ── Options ── */}
            {(item.customizations ?? []).map((group) => (
                <section key={group.name} style={{ marginTop: 22 }}>
                    <div
                        className="c-wrap"
                        style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingBottom: 8 }}
                    >
                        <h3 style={{ font: '800 .95rem/1.2 Outfit, sans-serif', color: 'var(--c-ink)' }}>
                            {group.name}
                        </h3>
                        <span style={{ font: '600 .72rem/1 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>
                            {group.required ? t('dish.chooseOne') : t('common.optional')}
                        </span>
                    </div>

                    <div style={{ borderTop: '1px solid var(--c-line)' }}>
                        {(group.options ?? []).map((option) => {
                            const checked = selections[group.name] === option.name;
                            return (
                                <label
                                    key={option.name}
                                    className="c-wrap"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        paddingBlock: 13, borderBottom: '1px solid var(--c-line)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name={`${item._id}-${group.name}`}
                                        checked={checked}
                                        onChange={() => setSelections((prev) => {
                                            // Tapping the chosen option in an optional
                                            // group clears it, which is the only way to
                                            // deselect without a separate "none" row.
                                            if (!group.required && prev[group.name] === option.name) {
                                                const next = { ...prev };
                                                delete next[group.name];
                                                return next;
                                            }
                                            return { ...prev, [group.name]: option.name };
                                        })}
                                        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                                    />
                                    <span
                                        aria-hidden="true"
                                        style={{
                                            width: 20, height: 20, flex: 'none', borderRadius: 999,
                                            display: 'grid', placeItems: 'center',
                                            background: checked ? 'var(--c-brand)' : 'transparent',
                                            boxShadow: checked ? 'none' : 'inset 0 0 0 1.5px var(--c-line-strong)',
                                            color: 'var(--c-ink)',
                                        }}
                                    >
                                        {checked && <Check size={13} strokeWidth={3.4} />}
                                    </span>

                                    <span style={{ flex: 1, font: '500 .9rem/1.3 "DM Sans", sans-serif', color: 'var(--c-ink)' }}>
                                        {option.name}
                                    </span>

                                    <span style={{ font: '700 .85rem/1 "DM Sans", sans-serif', color: option.price > 0 ? 'var(--c-ink)' : 'var(--c-ink-3)' }}>
                                        {option.price > 0 ? `+ ${money(option.price)}` : t('common.free')}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </section>
            ))}

            <div style={{ height: 12 }} />
        </Sheet>
    );
}
