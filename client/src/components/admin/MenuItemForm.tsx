import { useState, useEffect } from 'react';
import { X, Upload, Plus, Trash2, GripVertical } from 'lucide-react';
import { addMenuItem, updateMenuItem, getAdminCategories } from '@/services/adminApi';
import type { IMenuItem, ICategory, ICustomizationGroup } from '@/types';
import toast from 'react-hot-toast';

interface Props {
    item: IMenuItem | null;
    onClose: () => void;
    onSaved: () => void;
}

export default function MenuItemForm({ item, onClose, onSaved }: Props) {
    const isEdit = !!item;
    const [name, setName] = useState(item?.name ?? '');
    const [description, setDescription] = useState(item?.description ?? '');
    const [price, setPrice] = useState(item?.price?.toString() ?? '');
    const [isVeg, setIsVeg] = useState(item?.isVeg ?? true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState(item?.image ?? '');
    const [loading, setLoading] = useState(false);

    // Dynamic categories
    const [categories, setCategories] = useState<ICategory[]>([]);
    const [category, setCategory] = useState(item?.category ?? '');

    useEffect(() => {
        getAdminCategories().then((res) => {
            setCategories(res.categories);
            if (!item?.category && res.categories.length > 0) {
                setCategory(res.categories[0].name);
            }
        }).catch(() => { });
    }, [item]);

    // Customizations
    const [customizations, setCustomizations] = useState<ICustomizationGroup[]>(
        item?.customizations ?? []
    );

    const addGroup = () => {
        setCustomizations([...customizations, { name: '', options: [{ name: '', price: 0 }], required: false }]);
    };

    const removeGroup = (idx: number) => {
        setCustomizations(customizations.filter((_, i) => i !== idx));
    };

    const updateGroup = (idx: number, field: keyof ICustomizationGroup, value: unknown) => {
        setCustomizations(customizations.map((g, i) => i === idx ? { ...g, [field]: value } : g));
    };

    const addOption = (groupIdx: number) => {
        const updated = [...customizations];
        updated[groupIdx] = {
            ...updated[groupIdx],
            options: [...updated[groupIdx].options, { name: '', price: 0 }],
        };
        setCustomizations(updated);
    };

    const removeOption = (groupIdx: number, optIdx: number) => {
        const updated = [...customizations];
        updated[groupIdx] = {
            ...updated[groupIdx],
            options: updated[groupIdx].options.filter((_, i) => i !== optIdx),
        };
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

    // Clean up customizations: remove empty groups and empty options
    const cleanCustomizations = (): ICustomizationGroup[] => {
        return customizations
            .filter((g) => g.name.trim() !== '')
            .map((g) => ({
                ...g,
                name: g.name.trim(),
                options: g.options
                    .filter((o) => o.name.trim() !== '')
                    .map((o) => ({ name: o.name.trim(), price: Number(o.price) || 0 })),
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto"
                style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.15)', animation: 'slideUp 0.25s var(--ease-spring)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-[#EEEEEE] sticky top-0 bg-white z-10">
                    <h2 className="font-outfit font-bold text-[1.1rem]">{isEdit ? 'Edit Item' : 'Add New Item'}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg border border-[#EEEEEE] flex items-center justify-center bg-white cursor-pointer text-[#4A4A4A] hover:bg-[#F5F5F3] transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-7 flex flex-col gap-5">
                    {/* Image upload */}
                    <div>
                        <label className="block font-semibold text-[0.85rem] mb-2">Image</label>
                        <label className="flex flex-col items-center justify-center w-full h-[140px] rounded-xl border-2 border-dashed border-[#D4D4D0] cursor-pointer hover:border-[#E8A317] hover:bg-[#FFFBF0] transition-colors overflow-hidden">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-[#8E8E8E]">
                                    <Upload size={24} />
                                    <span className="text-[0.8rem]">Click to upload</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        </label>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block font-semibold text-[0.85rem] mb-[0.3rem]">Name</label>
                        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Margherita Pizza" required />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block font-semibold text-[0.85rem] mb-[0.3rem]">Description</label>
                        <textarea className="input resize-y" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Classic Italian pizza with fresh basil..." />
                    </div>

                    {/* Category + Price */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-[0.3rem]">Category</label>
                            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                                {categories.length === 0 && <option value="">Loading...</option>}
                                {categories.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-[0.3rem]">Price (₹)</label>
                            <input className="input" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="299" required />
                        </div>
                    </div>

                    {/* Veg toggle */}
                    <div className="flex items-center gap-3">
                        <label className="font-semibold text-[0.85rem]">Type</label>
                        <div className="flex gap-2">
                            {[true, false].map((v) => (
                                <button
                                    key={String(v)}
                                    type="button"
                                    onClick={() => setIsVeg(v)}
                                    className="px-4 py-[0.4rem] rounded-lg text-[0.8rem] font-bold border-2 cursor-pointer transition-all"
                                    style={{
                                        borderColor: isVeg === v ? (v ? '#16A34A' : '#DC2626') : '#EEEEEE',
                                        background: isVeg === v ? (v ? '#F0FDF4' : '#FEF2F2') : 'white',
                                        color: isVeg === v ? (v ? '#16A34A' : '#DC2626') : '#8E8E8E',
                                    }}
                                >
                                    {v ? 'VEG' : 'NON-VEG'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Customizations Section ── */}
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
                            Add option groups like Size, Crust, Toppings. Mark as required if the customer must pick one.
                        </p>

                        {customizations.length === 0 ? (
                            <div className="text-center py-6 text-[#8E8E8E] text-[0.82rem] bg-[#F9F9F7] rounded-xl border border-dashed border-[#D4D4D0]">
                                No customizations. Click "Add Group" to add options like Size or Toppings.
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {customizations.map((group, gIdx) => (
                                    <div key={gIdx} className="rounded-xl border border-[#EEEEEE] bg-[#FAFAF8] p-4">
                                        {/* Group header */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <GripVertical size={14} className="text-[#D4D4D0] shrink-0" />
                                            <input
                                                className="input flex-1"
                                                style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                                                placeholder="Group name (e.g. Size, Crust)"
                                                value={group.name}
                                                onChange={(e) => updateGroup(gIdx, 'name', e.target.value)}
                                            />
                                            <label className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-[#4A4A4A] cursor-pointer whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={group.required}
                                                    onChange={(e) => updateGroup(gIdx, 'required', e.target.checked)}
                                                    className="w-3.5 h-3.5 accent-[#E8A317]"
                                                />
                                                Required
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => removeGroup(gIdx)}
                                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 cursor-pointer bg-transparent border-none"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {/* Options */}
                                        <div className="flex flex-col gap-2 ml-5">
                                            {group.options.map((opt, oIdx) => (
                                                <div key={oIdx} className="flex items-center gap-2">
                                                    <input
                                                        className="input flex-1"
                                                        style={{ fontSize: '0.82rem', padding: '0.4rem 0.7rem' }}
                                                        placeholder="Option name"
                                                        value={opt.name}
                                                        onChange={(e) => updateOption(gIdx, oIdx, 'name', e.target.value)}
                                                    />
                                                    <div className="relative shrink-0 w-[90px]">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#8E8E8E] text-[0.78rem]">+₹</span>
                                                        <input
                                                            className="input"
                                                            style={{ fontSize: '0.82rem', padding: '0.4rem 0.7rem', paddingLeft: '1.8rem', width: '100%' }}
                                                            type="number"
                                                            min={0}
                                                            placeholder="0"
                                                            value={opt.price || ''}
                                                            onChange={(e) => updateOption(gIdx, oIdx, 'price', Number(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOption(gIdx, oIdx)}
                                                        className="p-1 rounded hover:bg-red-50 text-red-300 cursor-pointer bg-transparent border-none"
                                                        title="Remove option"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => addOption(gIdx)}
                                                className="self-start flex items-center gap-1 text-[0.78rem] font-semibold text-[#E8A317] cursor-pointer bg-transparent border-none p-0 hover:underline"
                                            >
                                                <Plus size={12} /> Add option
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button type="submit" className="btn-primary w-full justify-center mt-1" disabled={loading}>
                        {loading ? 'Saving...' : isEdit ? 'Update Item' : 'Add Item'}
                    </button>
                </form>
            </div>
        </div>
    );
}
