import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { addMenuItem, updateMenuItem } from '@/services/adminApi';
import type { IMenuItem } from '@/types';
import toast from 'react-hot-toast';

interface Props {
    item: IMenuItem | null;
    onClose: () => void;
    onSaved: () => void;
}

const CATEGORIES = ['Pizza', 'Sides', 'Beverages', 'Desserts', 'Combos'];

export default function MenuItemForm({ item, onClose, onSaved }: Props) {
    const isEdit = !!item;
    const [name, setName] = useState(item?.name ?? '');
    const [description, setDescription] = useState(item?.description ?? '');
    const [category, setCategory] = useState(item?.category ?? CATEGORIES[0]);
    const [price, setPrice] = useState(item?.price?.toString() ?? '');
    const [isVeg, setIsVeg] = useState(item?.isVeg ?? true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState(item?.image ?? '');
    const [loading, setLoading] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !price) { toast.error('Name and price are required'); return; }

        setLoading(true);
        try {
            if (isEdit) {
                await updateMenuItem(item._id, {
                    name, description, category, price: Number(price), isVeg,
                });
                toast.success('Item updated!');
            } else {
                const fd = new FormData();
                fd.append('name', name);
                fd.append('description', description);
                fd.append('category', category);
                fd.append('price', price);
                fd.append('isVeg', String(isVeg));
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
                className="bg-white rounded-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto"
                style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.15)', animation: 'slideUp 0.25s var(--ease-spring)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-[#EEEEEE]">
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
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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

                    <button type="submit" className="btn-primary w-full justify-center mt-1" disabled={loading}>
                        {loading ? 'Saving...' : isEdit ? 'Update Item' : 'Add Item'}
                    </button>
                </form>
            </div>
        </div>
    );
}
