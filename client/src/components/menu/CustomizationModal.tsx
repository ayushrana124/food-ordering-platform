import { useState } from 'react';
import { X } from 'lucide-react';
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
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            style={{
                background: 'rgba(15,15,15,0.5)',
                backdropFilter: 'blur(6px)',
                animation: 'fadeIn 0.2s ease',
            }}
        >
            <div
                className="bg-white rounded-[24px] p-7 w-full max-w-[420px] relative"
                style={{
                    boxShadow: '0 16px 48px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
                    animation: 'slideUp 0.25s var(--ease-spring)',
                }}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-5">
                    <div>
                        <h3 className="font-outfit font-bold text-[1.2rem] text-[#0F0F0F]">{item.name}</h3>
                        <p className="text-[#8E8E8E] text-[0.85rem]">Choose add-ons</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg border border-[#EEEEEE] bg-white cursor-pointer flex items-center justify-center text-[#4A4A4A] transition-colors hover:bg-[#F7F7F5]"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Options */}
                <div className="flex flex-col gap-[0.6rem] mb-6">
                    {item.customizations.map((c) => {
                        const isSelected = selected.some((s) => s.name === c.name);
                        return (
                            <label
                                key={c.name}
                                className="flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200"
                                style={{
                                    border: `1.5px solid ${isSelected ? '#E8A317' : '#E0E0DC'}`,
                                    background: isSelected ? '#FFFBF0' : 'white',
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleCustomization(c)}
                                        className="w-4 h-4 accent-[#E8A317]"
                                    />
                                    <span className="font-medium text-[0.9rem] text-[#0F0F0F]">{c.name}</span>
                                </div>
                                <span className="font-bold text-[#E8A317] text-[0.9rem]">+₹{c.price}</span>
                            </label>
                        );
                    })}
                </div>

                <button
                    className="btn-primary w-full justify-center text-base py-3"
                    onClick={handleAdd}
                >
                    Add to Cart — ₹{totalPrice}
                </button>
            </div>
        </div>
    );
}
