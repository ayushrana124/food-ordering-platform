import { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import type { IMenuItem, IMenuItemCustomization } from '@/types';
import toast from 'react-hot-toast';

interface CustomizationModalProps {
    item: IMenuItem;
    onClose: () => void;
}

export default function CustomizationModal({ item, onClose }: CustomizationModalProps) {
    const { addItem } = useCart();
    const [selected, setSelected] = useState<IMenuItemCustomization[]>([]);

    const toggleCustomization = (c: IMenuItemCustomization) => {
        setSelected((prev) =>
            prev.some((s) => s.name === c.name)
                ? prev.filter((s) => s.name !== c.name)
                : [...prev, c]
        );
    };

    const handleAdd = () => {
        addItem({
            menuItemId: item._id,
            name: item.name,
            price: item.price,
            image: item.image,
            isVeg: item.isVeg,
            selectedCustomizations: selected,
        });
        const total = item.price + selected.reduce((s, c) => s + c.price, 0);
        toast.success(`${item.name} added — ₹${total}`);
        onClose();
    };

    const totalPrice = item.price + selected.reduce((s, c) => s + c.price, 0);

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(28,28,30,0.55)',
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <div style={{
                background: 'white', borderRadius: 'var(--radius-xl)',
                padding: '1.5rem', width: '100%', maxWidth: 400,
                boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.25s ease',
            }}>
                <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div>
                        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.2rem' }}>{item.name}</h3>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Choose add-ons</p>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    {item.customizations.map((c) => {
                        const isSelected = selected.some((s) => s.name === c.name);
                        return (
                            <label key={c.name} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: `1.5px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
                                background: isSelected ? 'var(--color-accent-light)' : 'white',
                                cursor: 'pointer', transition: 'all 0.15s ease',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleCustomization(c)}
                                        style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }}
                                    />
                                    <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{c.name}</span>
                                </div>
                                <span style={{ fontWeight: 700, color: 'var(--color-accent)', fontSize: '0.9rem' }}>+₹{c.price}</span>
                            </label>
                        );
                    })}
                </div>

                <button
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '1rem' }}
                    onClick={handleAdd}
                >
                    Add to Cart — ₹{totalPrice}
                </button>
            </div>
        </div>
    );
}
