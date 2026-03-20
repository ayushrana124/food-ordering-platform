import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import type { IMenuItem, ISelectedCustomization, ICustomizationGroup } from '@/types';
import toast from 'react-hot-toast';

interface CustomizationModalProps {
    item: IMenuItem;
    onClose: () => void;
}

export default function CustomizationModal({ item, onClose }: CustomizationModalProps) {
    const { addItem } = useCart();

    // Initialize: for required groups, pre-select the first option
    const initSelections = (): ISelectedCustomization[] => {
        const initial: ISelectedCustomization[] = [];
        for (const group of item.customizations) {
            if (group.required && group.options.length > 0) {
                initial.push({
                    groupName: group.name,
                    optionName: group.options[0].name,
                    price: group.options[0].price,
                });
            }
        }
        return initial;
    };

    const [selected, setSelected] = useState<ISelectedCustomization[]>(initSelections);

    const isOptionSelected = (groupName: string, optionName: string) =>
        selected.some((s) => s.groupName === groupName && s.optionName === optionName);

    const handleRadio = (group: ICustomizationGroup, optionName: string, price: number) => {
        setSelected((prev) => [
            ...prev.filter((s) => s.groupName !== group.name),
            { groupName: group.name, optionName, price },
        ]);
    };

    const handleCheckbox = (group: ICustomizationGroup, optionName: string, price: number) => {
        setSelected((prev) => {
            const exists = prev.some((s) => s.groupName === group.name && s.optionName === optionName);
            if (exists) {
                return prev.filter((s) => !(s.groupName === group.name && s.optionName === optionName));
            }
            return [...prev, { groupName: group.name, optionName, price }];
        });
    };

    // Check if all required groups have a selection
    const allRequiredSelected = item.customizations
        .filter((g) => g.required)
        .every((g) => selected.some((s) => s.groupName === g.name));

    const extraPrice = selected.reduce((s, c) => s + c.price, 0);
    const totalPrice = item.price + extraPrice;

    const handleAdd = () => {
        if (!allRequiredSelected) {
            toast.error('Please select all required options');
            return;
        }
        addItem({
            menuItemId: item._id,
            selectedCustomizations: selected.map((s) => ({ groupName: s.groupName, optionName: s.optionName })),
        });
        toast.success(`${item.name} added — ₹${totalPrice}`);
        onClose();
    };

    const modal = (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                background: 'rgba(15,15,15,0.5)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                animation: 'fadeIn 0.2s ease',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 480,
                    maxHeight: '90vh',
                    background: 'white',
                    borderRadius: '24px 24px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
                    animation: 'slideUp 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle on mobile */}
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-[#E0E0DC]" />
                </div>

                {/* Header */}
                <div className="flex justify-between items-start p-6 pb-3 shrink-0">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-outfit font-bold text-[1.25rem] text-[#0F0F0F] leading-tight">{item.name}</h3>
                        <p className="text-[#8E8E8E] text-[0.82rem] mt-0.5">Customize your order</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg border border-[#EEEEEE] bg-white cursor-pointer flex items-center justify-center text-[#4A4A4A] transition-colors hover:bg-[#F7F7F5] shrink-0 ml-3"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Customization Groups */}
                <div className="flex-1 overflow-y-auto px-6 pb-2">
                    {item.customizations.map((group) => (
                        <div key={group.name} className="mb-5">
                            {/* Group Header */}
                            <div className="flex items-center gap-2 mb-2.5">
                                <h4 className="font-semibold text-[0.88rem] text-[#0F0F0F]">{group.name}</h4>
                                {group.required ? (
                                    <span className="text-[0.65rem] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded bg-[#FEF2F2] text-[#DC2626]">
                                        Required
                                    </span>
                                ) : (
                                    <span className="text-[0.65rem] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded bg-[#F7F7F5] text-[#8E8E8E]">
                                        Optional
                                    </span>
                                )}
                            </div>

                            {/* Options */}
                            <div className="flex flex-col gap-[0.45rem]">
                                {group.options.map((opt) => {
                                    const isActive = isOptionSelected(group.name, opt.name);
                                    return (
                                        <label
                                            key={opt.name}
                                            className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all duration-200"
                                            style={{
                                                border: `1.5px solid ${isActive ? '#E8A317' : '#E0E0DC'}`,
                                                background: isActive ? '#FFFBF0' : 'white',
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                {group.required ? (
                                                    /* Radio circle */
                                                    <div
                                                        className="w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all shrink-0"
                                                        style={{ borderColor: isActive ? '#E8A317' : '#D4D4D0' }}
                                                    >
                                                        {isActive && (
                                                            <div className="w-[10px] h-[10px] rounded-full bg-[#E8A317]" />
                                                        )}
                                                    </div>
                                                ) : (
                                                    /* Checkbox */
                                                    <div
                                                        className="w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center transition-all shrink-0"
                                                        style={{
                                                            borderColor: isActive ? '#E8A317' : '#D4D4D0',
                                                            background: isActive ? '#E8A317' : 'transparent',
                                                        }}
                                                    >
                                                        {isActive && <Check size={12} className="text-white" strokeWidth={3} />}
                                                    </div>
                                                )}
                                                <input
                                                    type={group.required ? 'radio' : 'checkbox'}
                                                    name={group.name}
                                                    checked={isActive}
                                                    onChange={() =>
                                                        group.required
                                                            ? handleRadio(group, opt.name, opt.price)
                                                            : handleCheckbox(group, opt.name, opt.price)
                                                    }
                                                    className="sr-only"
                                                />
                                                <span className="font-medium text-[0.88rem] text-[#0F0F0F]">{opt.name}</span>
                                            </div>
                                            <span
                                                className="font-bold text-[0.88rem] shrink-0 ml-2"
                                                style={{ color: opt.price > 0 ? '#E8A317' : '#8E8E8E' }}
                                            >
                                                {opt.price > 0 ? `+₹${opt.price}` : 'Included'}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 pt-3 border-t border-[#EEEEEE] shrink-0">
                    <button
                        className="btn-primary w-full justify-center text-[0.95rem] py-3.5 disabled:opacity-50"
                        onClick={handleAdd}
                        disabled={!allRequiredSelected}
                    >
                        Add to Cart — ₹{totalPrice}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
