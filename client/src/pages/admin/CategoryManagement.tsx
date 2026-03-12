import { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Pencil, Trash2, X, Save, Loader2, GripVertical } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { getAdminCategories, createCategory, updateCategory, deleteCategory } from '@/services/adminApi';
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
    const [categories, setCategories] = useState<ICategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<CategoryForm>(emptyForm);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAdminCategories();
            setCategories(res.categories);
        } catch { toast.error('Failed to load categories'); }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => { setEditingId(null); setForm({ ...emptyForm, displayOrder: categories.length }); setShowModal(true); };
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
        try { await deleteCategory(id); toast.success('Deleted'); load(); }
        catch { toast.error('Delete failed'); }
    };

    const update = (key: keyof CategoryForm, value: unknown) => setForm(f => ({ ...f, [key]: value }));

    return (
        <AdminLayout>
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h1 className="font-outfit font-extrabold text-[1.5rem] text-[#0F0F0F] tracking-[-0.02em] flex items-center gap-3 mb-1">
                        <span className="w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED]">
                            <Layers size={20} />
                        </span>
                        Categories
                    </h1>
                    <p className="text-[0.84rem] text-[#8E8E8E] ml-[52px]">Manage menu categories displayed on the landing page</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[#8E8E8E] text-[0.84rem]">{categories.length} categories</span>
                    <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-[0.84rem] py-2 px-4">
                        <Plus size={16} /> Add Category
                    </button>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#E8A317]" /></div>
            ) : categories.length === 0 ? (
                <div className="text-center py-16 text-[#8E8E8E]">No categories yet. Add your first one!</div>
            ) : (
                <div className="grid gap-3">
                    {categories.map(cat => (
                        <div key={cat._id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-[#EEEEEE] hover:border-[#E8A317] transition-colors group">
                            <GripVertical size={16} className="text-[#D4D4D0] shrink-0" />
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[0.9rem] font-bold"
                                style={{ background: cat.colorScheme?.iconBg || '#F0F0EE', color: cat.colorScheme?.color || '#4A4A4A' }}
                            >
                                {cat.icon?.charAt(0) || 'C'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-outfit font-bold text-[0.95rem] text-[#0F0F0F]">{cat.name}</div>
                                <div className="text-[0.75rem] text-[#8E8E8E]">Icon: {cat.icon} · Order: {cat.displayOrder}</div>
                            </div>
                            <div
                                className="w-6 h-6 rounded-md border"
                                style={{ background: cat.colorScheme?.bg, borderColor: cat.colorScheme?.border }}
                                title="Color scheme"
                            />
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(cat)} className="p-2 rounded-lg hover:bg-[#F7F7F5] text-[#4A4A4A]"><Pencil size={15} /></button>
                                <button onClick={() => handleDelete(cat._id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <div className="bg-white rounded-[20px] w-full max-w-[480px] p-6" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-outfit font-bold text-[1.15rem]">{editingId ? 'Edit' : 'Add'} Category</h3>
                            <button onClick={() => setShowModal(false)} className="bg-transparent border-none cursor-pointer p-1"><X size={20} /></button>
                        </div>

                        <div className="flex flex-col gap-4">
                            {/* Name */}
                            <div>
                                <label className="block font-semibold text-[0.8rem] mb-1">Name</label>
                                <input className="input" value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Pizzas" id="cat-name" />
                            </div>

                            {/* Icon */}
                            <div>
                                <label className="block font-semibold text-[0.8rem] mb-1">Icon</label>
                                <div className="flex flex-wrap gap-2">
                                    {ICON_OPTIONS.map(ic => (
                                        <button
                                            key={ic}
                                            type="button"
                                            onClick={() => update('icon', ic)}
                                            className="px-3 py-[0.35rem] rounded-lg text-[0.75rem] font-medium border cursor-pointer transition-all"
                                            style={{
                                                background: form.icon === ic ? '#FFFBF0' : 'white',
                                                borderColor: form.icon === ic ? '#E8A317' : '#EEEEEE',
                                                color: form.icon === ic ? '#E8A317' : '#4A4A4A',
                                            }}
                                        >
                                            {ic}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color Preset */}
                            <div>
                                <label className="block font-semibold text-[0.8rem] mb-1">Color Theme</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_PRESETS.map((p, i) => (
                                        <button
                                            key={p.label}
                                            type="button"
                                            onClick={() => update('colorPresetIdx', i)}
                                            className="flex items-center gap-[0.3rem] px-3 py-[0.35rem] rounded-lg text-[0.75rem] font-medium border cursor-pointer transition-all"
                                            style={{
                                                background: form.colorPresetIdx === i ? p.bg : 'white',
                                                borderColor: form.colorPresetIdx === i ? p.border : '#EEEEEE',
                                                color: p.color,
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
                                <label className="block font-semibold text-[0.8rem] mb-1">Display Order</label>
                                <input className="input" type="number" min={0} value={form.displayOrder} onChange={e => update('displayOrder', Number(e.target.value))} id="cat-order" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="btn-outline text-[0.84rem] py-2 px-5">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-[0.84rem] py-2 px-5">
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
