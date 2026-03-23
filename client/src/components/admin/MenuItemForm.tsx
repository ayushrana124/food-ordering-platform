import { useState, useEffect } from 'react';
import { X, Upload, Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { addMenuItem, updateMenuItem } from '@/services/adminApi';
import { useAdminContext } from '@/contexts/AdminContext';
import type { IMenuItem, ICustomizationGroup } from '@/types';
import toast from 'react-hot-toast';

interface Props {
    item: IMenuItem | null;
    onClose: () => void;
    onSaved: () => void;
}

export default function MenuItemForm({ item, onClose, onSaved }: Props) {
    const isEdit = !!item;
    const { categories, fetchCategories } = useAdminContext();

    const [name, setName] = useState(item?.name ?? '');
    const [description, setDescription] = useState(item?.description ?? '');
    const [price, setPrice] = useState(item?.price?.toString() ?? '');
    const [isVeg, setIsVeg] = useState(item?.isVeg ?? true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState(item?.image ?? '');
    const [loading, setLoading] = useState(false);
    const [category, setCategory] = useState(item?.category ?? '');
    const [customizations, setCustomizations] = useState<ICustomizationGroup[]>(item?.customizations ?? []);
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

    useEffect(() => {
        fetchCategories(true).then((cats) => {
            if (!item?.category && cats.length > 0) {
                setCategory(cats[0].name);
            }
        });
    }, [fetchCategories]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleGroupExpand = (idx: number) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    };

    const addGroup = () => {
        const idx = customizations.length;
        setCustomizations([...customizations, { name: '', options: [{ name: '', price: 0 }], required: false }]);
        setExpandedGroups(prev => new Set(prev).add(idx));
    };

    const removeGroup = (idx: number) => {
        setCustomizations(customizations.filter((_, i) => i !== idx));
    };

    const updateGroup = (idx: number, field: keyof ICustomizationGroup, value: unknown) => {
        setCustomizations(customizations.map((g, i) => i === idx ? { ...g, [field]: value } : g));
    };

    const addOption = (groupIdx: number) => {
        const updated = [...customizations];
        updated[groupIdx] = { ...updated[groupIdx], options: [...updated[groupIdx].options, { name: '', price: 0 }] };
        setCustomizations(updated);
    };

    const removeOption = (groupIdx: number, optIdx: number) => {
        const updated = [...customizations];
        updated[groupIdx] = { ...updated[groupIdx], options: updated[groupIdx].options.filter((_, i) => i !== optIdx) };
        setCustomizations(updated);
    };

    const updateOption = (groupIdx: number, optIdx: number, field: 'name' | 'price', value: string | number) => {
        const updated = [...customizations];
        updated[groupIdx] = {
            ...updated[groupIdx],
            options: updated[groupIdx].options.map((o, i) => i === optIdx ? { ...o, [field]: value } : o),
        };
        setCustomizations(updated);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const cleanCustomizations = (): ICustomizationGroup[] => {
        return customizations
            .filter((g) => g.name.trim() !== '')
            .map((g) => ({
                ...g, name: g.name.trim(),
                options: g.options.filter((o) => o.name.trim() !== '').map((o) => ({ name: o.name.trim(), price: Number(o.price) || 0 })),
            }))
            .filter((g) => g.options.length > 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !price) { toast.error('Name and price are required'); return; }

        setLoading(true);
        try {
            const cleanCusts = cleanCustomizations();

            if (isEdit) {
                await updateMenuItem(item._id, {
                    name, description, category, price: Number(price), isVeg,
                    customizations: cleanCusts,
                });
                toast.success('Item updated!');
            } else {
                const fd = new FormData();
                fd.append('name', name);
                fd.append('description', description);
                fd.append('category', category);
                fd.append('price', price);
                fd.append('isVeg', String(isVeg));
                fd.append('customizations', JSON.stringify(cleanCusts));
                if (imageFile) fd.append('image', imageFile);
                await addMenuItem(fd);
                toast.success('Item added!');
            }
            onSaved();
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : 'Operation failed';
            toast.error(msg ?? 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex justify-end"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="bg-white h-full w-full max-w-[560px] flex flex-col shadow-[-8px_0_40px_rgba(0,0,0,0.12)]"
                style={{ animation: 'slideInRight 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#EEEEEE] shrink-0">
                    <div>
                        <h2 className="font-outfit font-bold text-[1.1rem] text-[#0F0F0F]">
                            {isEdit ? 'Edit Item' : 'Add New Item'}
                        </h2>
                        <p className="text-[0.78rem] text-[#8E8E8E] mt-0.5">
                            {isEdit ? 'Update menu item details' : 'Fill in the details below'}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-xl border border-[#EEEEEE] flex items-center justify-center bg-white cursor-pointer text-[#4A4A4A] hover:bg-[#F5F5F3] transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 flex flex-col gap-5">
                        {/* Image upload */}
                        <div>
                            <label className="block font-semibold text-[0.82rem] mb-2 text-[#4A4A4A]">Image</label>
                            <label className="flex flex-col items-center justify-center w-full h-[140px] rounded-xl border-2 border-dashed border-[#D4D4D0] cursor-pointer hover:border-[#E8A317] hover:bg-[#FFFBF0] transition-colors overflow-hidden">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-[#C4C4C0]">
                                        <Upload size={24} />
                                        <span className="text-[0.8rem] font-medium">Click or drag to upload</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                            </label>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block font-semibold text-[0.82rem] mb-1.5 text-[#4A4A4A]">Name *</label>
                            <input
                                className="w-full h-11 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                value={name} onChange={(e) => setName(e.target.value)} placeholder="Margherita Pizza" required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block font-semibold text-[0.82rem] mb-1.5 text-[#4A4A4A]">Description</label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors resize-y"
                                rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
                                placeholder="Classic Italian pizza with fresh basil..."
                            />
                        </div>

                        {/* Category + Price */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block font-semibold text-[0.82rem] mb-1.5 text-[#4A4A4A]">Category *</label>
                                <select
                                    className="w-full h-11 px-3 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                    value={category} onChange={(e) => setCategory(e.target.value)}
                                >
                                    {categories.length === 0 && <option value="">Loading...</option>}
                                    {categories.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block font-semibold text-[0.82rem] mb-1.5 text-[#4A4A4A]">Price *</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E8E] text-[0.85rem] font-medium">{'\u20B9'}</span>
                                    <input
                                        className="w-full h-11 pl-8 pr-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                        type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="299" required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Veg toggle */}
                        <div>
                            <label className="block font-semibold text-[0.82rem] mb-2 text-[#4A4A4A]">Type</label>
                            <div className="flex gap-2">
                                {[true, false].map((v) => (
                                    <button
                                        key={String(v)}
                                        type="button"
                                        onClick={() => setIsVeg(v)}
                                        className={`px-5 py-2 rounded-xl text-[0.82rem] font-bold border-2 cursor-pointer transition-all ${
                                            isVeg === v
                                                ? (v ? 'border-[#16A34A] bg-[#F0FDF4] text-[#16A34A]' : 'border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]')
                                                : 'border-[#EEEEEE] bg-white text-[#8E8E8E]'
                                        }`}
                                    >
                                        {v ? 'VEG' : 'NON-VEG'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Customizations */}
                        <div className="border-t border-[#EEEEEE] pt-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-outfit font-bold text-[0.95rem] text-[#0F0F0F]">Customizations</h3>
                                <button
                                    type="button"
                                    onClick={addGroup}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFBF0] border border-[#F0CA5A] text-[#E8A317] text-[0.78rem] font-bold cursor-pointer hover:bg-[#FFF3D6] transition-colors"
                                >
                                    <Plus size={14} /> Add Group
                                </button>
                            </div>
                            <p className="text-[0.78rem] text-[#8E8E8E] mb-4">
                                Add option groups like Size, Crust, Toppings with pricing.
                            </p>

                            {customizations.length === 0 ? (
                                <div className="text-center py-8 text-[#8E8E8E] text-[0.82rem] bg-[#FAFAF8] rounded-xl border border-dashed border-[#D4D4D0]">
                                    No customizations yet
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {customizations.map((group, gIdx) => {
                                        const isExpanded = expandedGroups.has(gIdx);
                                        return (
                                            <div key={gIdx} className="rounded-xl border border-[#EEEEEE] bg-[#FAFAF8] overflow-hidden">
                                                {/* Group header */}
                                                <div
                                                    className="flex items-center gap-2 p-3 cursor-pointer hover:bg-[#F5F5F3] transition-colors"
                                                    onClick={() => toggleGroupExpand(gIdx)}
                                                >
                                                    <GripVertical size={14} className="text-[#D4D4D0] shrink-0" />
                                                    <input
                                                        className="flex-1 bg-transparent border-none outline-none font-semibold text-[0.85rem] text-[#0F0F0F] placeholder:text-[#C4C4C0]"
                                                        placeholder="Group name (e.g. Size)"
                                                        value={group.name}
                                                        onChange={(e) => { e.stopPropagation(); updateGroup(gIdx, 'name', e.target.value); }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <label className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-[#4A4A4A] cursor-pointer whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox" checked={group.required}
                                                            onChange={(e) => updateGroup(gIdx, 'required', e.target.checked)}
                                                            className="w-3.5 h-3.5 accent-[#E8A317]"
                                                        />
                                                        Required
                                                    </label>
                                                    <span className="text-[0.72rem] text-[#8E8E8E]">{group.options.length} opt</span>
                                                    {isExpanded ? <ChevronUp size={16} className="text-[#8E8E8E]" /> : <ChevronDown size={16} className="text-[#8E8E8E]" />}
                                                    <button
                                                        type="button" onClick={(e) => { e.stopPropagation(); removeGroup(gIdx); }}
                                                        className="p-1 rounded-lg hover:bg-red-50 text-red-400 cursor-pointer bg-transparent border-none"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>

                                                {/* Options (collapsible) */}
                                                {isExpanded && (
                                                    <div className="px-3 pb-3 border-t border-[#EEEEEE]">
                                                        <div className="flex flex-col gap-2 mt-3 ml-5">
                                                            {group.options.map((opt, oIdx) => (
                                                                <div key={oIdx} className="flex items-center gap-2">
                                                                    <input
                                                                        className="flex-1 h-9 px-3 rounded-lg border border-[#EEEEEE] bg-white text-[0.82rem] outline-none focus:border-[#E8A317] transition-colors"
                                                                        placeholder="Option name"
                                                                        value={opt.name}
                                                                        onChange={(e) => updateOption(gIdx, oIdx, 'name', e.target.value)}
                                                                    />
                                                                    <div className="relative shrink-0 w-[85px]">
                                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#8E8E8E] text-[0.75rem]">+{'\u20B9'}</span>
                                                                        <input
                                                                            className="w-full h-9 pl-7 pr-2 rounded-lg border border-[#EEEEEE] bg-white text-[0.82rem] outline-none focus:border-[#E8A317] transition-colors"
                                                                            type="number" min={0} placeholder="0"
                                                                            value={opt.price || ''}
                                                                            onChange={(e) => updateOption(gIdx, oIdx, 'price', Number(e.target.value) || 0)}
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        type="button" onClick={() => removeOption(gIdx, oIdx)}
                                                                        className="p-1 rounded hover:bg-red-50 text-red-300 cursor-pointer bg-transparent border-none"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                type="button" onClick={() => addOption(gIdx)}
                                                                className="self-start flex items-center gap-1 text-[0.78rem] font-semibold text-[#E8A317] cursor-pointer bg-transparent border-none p-0 hover:underline"
                                                            >
                                                                <Plus size={12} /> Add option
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="sticky bottom-0 px-6 py-4 border-t border-[#EEEEEE] bg-white">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 rounded-xl bg-[#E8A317] text-white font-bold text-[0.88rem] border-none cursor-pointer hover:bg-[#D49516] disabled:opacity-50 transition-colors shadow-[0_2px_12px_rgba(232,163,23,0.25)]"
                        >
                            {loading ? 'Saving...' : isEdit ? 'Update Item' : 'Add Item'}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}
