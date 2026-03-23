import { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Pencil, Trash2, X, Save, Loader2, GripVertical } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminCard from '@/components/admin/ui/AdminCard';
import AdminPageHeader from '@/components/admin/ui/AdminPageHeader';
import AdminEmptyState from '@/components/admin/ui/AdminEmptyState';
import AdminSkeleton from '@/components/admin/ui/AdminSkeleton';
import { useAdminContext } from '@/contexts/AdminContext';
import { createCategory, updateCategory, deleteCategory } from '@/services/adminApi';
import type { ICategory } from '@/types';
import toast from 'react-hot-toast';

const ICON_OPTIONS = [
    'Pizza', 'Utensils', 'Cake', 'Coffee', 'Tag', 'Package', 'Zap', 'Star',
    'Beef', 'IceCream', 'Salad', 'Wine', 'Soup', 'Sandwich', 'Popcorn',
];

const COLOR_PRESETS = [
    { label: 'Amber', bg: '#FFFCF5', border: '#F0CA5A', color: '#9A7209', iconBg: '#FFFBF0' },
    { label: 'Green', bg: '#F0FAF4', border: '#86EFAC', color: '#16A34A', iconBg: '#DCFCE7' },
    { label: 'Pink', bg: '#FDF2F8', border: '#F0ABFC', color: '#A21CAF', iconBg: '#FAE8FF' },
    { label: 'Blue', bg: '#EFF6FF', border: '#93C5FD', color: '#2563EB', iconBg: '#DBEAFE' },
    { label: 'Orange', bg: '#FFF7ED', border: '#FDBA74', color: '#EA580C', iconBg: '#FFEDD5' },
    { label: 'Purple', bg: '#F5F3FF', border: '#C4B5FD', color: '#7C3AED', iconBg: '#EDE9FE' },
    { label: 'Teal', bg: '#ECFDF5', border: '#6EE7B7', color: '#059669', iconBg: '#D1FAE5' },
    { label: 'Yellow', bg: '#FFFBEB', border: '#FCD34D', color: '#D97706', iconBg: '#FEF3C7' },
];

interface CategoryForm {
    name: string;
    icon: string;
    colorPresetIdx: number;
    displayOrder: number;
}

const emptyForm: CategoryForm = { name: '', icon: 'Utensils', colorPresetIdx: 0, displayOrder: 0 };

export default function CategoryManagement() {
    const { categories, fetchCategories, invalidateCategories } = useAdminContext();
    const [localCategories, setLocalCategories] = useState<ICategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<CategoryForm>(emptyForm);

    const load = useCallback(async () => {
        setLoading(true);
        const cats = await fetchCategories(true);
        setLocalCategories(cats);
        setLoading(false);
    }, [fetchCategories]);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...emptyForm, displayOrder: localCategories.length });
        setShowModal(true);
    };

    const openEdit = (cat: ICategory) => {
        const presetIdx = COLOR_PRESETS.findIndex(p => p.bg === cat.colorScheme?.bg);
        setEditingId(cat._id);
        setForm({ name: cat.name, icon: cat.icon, colorPresetIdx: presetIdx >= 0 ? presetIdx : 0, displayOrder: cat.displayOrder });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Name is required'); return; }
        setSaving(true);
        try {
            const preset = COLOR_PRESETS[form.colorPresetIdx];
            const payload = { name: form.name.trim(), icon: form.icon, colorScheme: preset, displayOrder: form.displayOrder };
            if (editingId) {
                await updateCategory(editingId, payload);
                toast.success('Category updated');
            } else {
                await createCategory(payload);
                toast.success('Category created');
            }
            setShowModal(false);
            invalidateCategories();
            load();
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : 'Save failed';
            toast.error(msg ?? 'Save failed');
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this category?')) return;
        try {
            await deleteCategory(id);
            setLocalCategories(prev => prev.filter(c => c._id !== id));
            toast.success('Deleted');
            invalidateCategories();
        } catch { toast.error('Delete failed'); }
    };

    const update = (key: keyof CategoryForm, value: unknown) => setForm(f => ({ ...f, [key]: value }));

    return (
        <AdminLayout>
            <AdminPageHeader
                title="Categories"
                subtitle={`${localCategories.length} categories`}
                icon={Layers}
                actions={
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E8A317] text-white font-bold text-[0.85rem] border-none cursor-pointer hover:bg-[#D49516] transition-colors shadow-[0_2px_12px_rgba(232,163,23,0.25)]"
                    >
                        <Plus size={18} /> Add Category
                    </button>
                }
            />

            {loading ? (
                <AdminSkeleton count={6} type="row" />
            ) : localCategories.length === 0 ? (
                <AdminEmptyState
                    icon={Layers}
                    title="No categories yet"
                    description="Add your first category to organize the menu"
                    action={{ label: 'Add Category', onClick: openCreate }}
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {localCategories.map(cat => {
                        const preset = cat.colorScheme;
                        return (
                            <AdminCard key={cat._id} hover className="group">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1 text-[#D4D4D0] shrink-0">
                                        <GripVertical size={16} />
                                        <span className="text-[0.7rem] font-semibold text-[#C4C4C0]">#{cat.displayOrder}</span>
                                    </div>

                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-[1rem] font-bold"
                                        style={{ background: preset?.iconBg || '#F0F0EE', color: preset?.color || '#4A4A4A' }}
                                    >
                                        {cat.icon?.charAt(0) || 'C'}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-outfit font-bold text-[0.95rem] text-[#0F0F0F]">{cat.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[0.72rem] text-[#8E8E8E]">{cat.icon}</span>
                                            <div
                                                className="w-5 h-5 rounded-md border"
                                                style={{ background: preset?.bg, borderColor: preset?.border }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEdit(cat)}
                                            className="w-8 h-8 rounded-lg border border-[#EEEEEE] bg-white flex items-center justify-center cursor-pointer text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat._id)}
                                            className="w-8 h-8 rounded-lg border border-[#EEEEEE] bg-white flex items-center justify-center cursor-pointer text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </AdminCard>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
                >
                    <div
                        className="bg-white rounded-[20px] w-full max-w-[500px] flex flex-col max-h-[90vh]"
                        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'fadeInScale 0.2s ease-out' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EEEEEE] shrink-0">
                            <h3 className="font-outfit font-bold text-[1.1rem] text-[#0F0F0F]">
                                {editingId ? 'Edit' : 'Add'} Category
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 rounded-xl border border-[#EEEEEE] flex items-center justify-center bg-white cursor-pointer text-[#4A4A4A] hover:bg-[#F5F5F3] transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                            {/* Name */}
                            <div>
                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Name</label>
                                <input
                                    className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                    value={form.name}
                                    onChange={e => update('name', e.target.value)}
                                    placeholder="e.g. Pizzas"
                                />
                            </div>

                            {/* Icon */}
                            <div>
                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Icon</label>
                                <div className="flex flex-wrap gap-2">
                                    {ICON_OPTIONS.map(ic => (
                                        <button
                                            key={ic}
                                            type="button"
                                            onClick={() => update('icon', ic)}
                                            className={`px-3 py-1.5 rounded-lg text-[0.75rem] font-medium border cursor-pointer transition-all ${
                                                form.icon === ic
                                                    ? 'bg-[#FFFBF0] border-[#E8A317] text-[#E8A317]'
                                                    : 'bg-white border-[#EEEEEE] text-[#4A4A4A] hover:bg-[#F5F5F3]'
                                            }`}
                                        >
                                            {ic}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color Preset */}
                            <div>
                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Color Theme</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_PRESETS.map((p, i) => (
                                        <button
                                            key={p.label}
                                            type="button"
                                            onClick={() => update('colorPresetIdx', i)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium border cursor-pointer transition-all ${
                                                form.colorPresetIdx === i
                                                    ? 'ring-2 ring-offset-1'
                                                    : 'hover:opacity-80'
                                            }`}
                                            style={{
                                                background: p.bg,
                                                borderColor: p.border,
                                                color: p.color,
                                                ...(form.colorPresetIdx === i ? { ringColor: p.border } : {}),
                                            }}
                                        >
                                            <span className="w-3 h-3 rounded-full" style={{ background: p.border }} />
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Display Order */}
                            <div>
                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Display Order</label>
                                <input
                                    className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                    type="number"
                                    min={0}
                                    value={form.displayOrder}
                                    onChange={e => update('displayOrder', Number(e.target.value))}
                                />
                            </div>

                            {/* Live Preview */}
                            <div>
                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Preview</label>
                                <div
                                    className="flex items-center gap-3 p-4 rounded-xl border"
                                    style={{
                                        background: COLOR_PRESETS[form.colorPresetIdx].bg,
                                        borderColor: COLOR_PRESETS[form.colorPresetIdx].border,
                                    }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[0.9rem]"
                                        style={{
                                            background: COLOR_PRESETS[form.colorPresetIdx].iconBg,
                                            color: COLOR_PRESETS[form.colorPresetIdx].color,
                                        }}
                                    >
                                        {form.icon.charAt(0)}
                                    </div>
                                    <span className="font-outfit font-bold text-[0.9rem]" style={{ color: COLOR_PRESETS[form.colorPresetIdx].color }}>
                                        {form.name || 'Category Name'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#EEEEEE] shrink-0">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] font-semibold text-[#4A4A4A] cursor-pointer hover:bg-[#F5F5F3] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E8A317] text-white font-bold text-[0.85rem] border-none cursor-pointer hover:bg-[#D49516] transition-colors disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </AdminLayout>
    );
}
