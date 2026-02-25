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
            className="fixed inset-0 z-[1000] bg-[rgba(28,28,30,0.55)] backdrop-blur-[4px] flex items-center justify-center p-4"
        >
            <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
            <div
                className="bg-white rounded-[22px] p-6 w-full max-w-[400px] shadow-[0_12px_36px_rgba(0,0,0,0.12)]"
                style={{ animation: 'slideUp 0.25s ease' }}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-5">
                    <div>
                        <h3 className="font-outfit font-bold text-[1.2rem] text-[#111]">{item.name}</h3>
                        <p className="text-[#555] text-[0.85rem]">Choose add-ons</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="border-none bg-none text-[1.1rem] cursor-pointer text-[#555]"
                    >
                        ✕
                    </button>
                </div>

                {/* Options */}
                <div className="flex flex-col gap-[0.6rem] mb-5">
                    {item.customizations.map((c) => {
                        const isSelected = selected.some((s) => s.name === c.name);
                        return (
                            <label
                                key={c.name}
                                className="flex items-center justify-between px-4 py-3 rounded-[10px] cursor-pointer transition-all duration-150"
                                style={{
                                    border: `1.5px solid ${isSelected ? '#D4920A' : '#D0CFC9'}`,
                                    background: isSelected ? '#FFF6DC' : 'white',
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleCustomization(c)}
                                        className="w-4 h-4 accent-[#D4920A]"
                                    />
                                    <span className="font-medium text-[0.9rem] text-[#111]">{c.name}</span>
                                </div>
                                <span className="font-bold text-[#D4920A] text-[0.9rem]">+₹{c.price}</span>
                            </label>
                        );
                    })}
                </div>

                <button
                    className="btn-primary w-full justify-center text-base"
                    onClick={handleAdd}
                >
                    Add to Cart — ₹{totalPrice}
                </button>
            </div>
        </div>
    );
}
