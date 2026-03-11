import { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Save, Loader2, AlertTriangle } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { getAdminOffers, createOffer, updateOffer, deleteOffer, toggleOfferActive } from '@/services/adminApi';
import type { IOffer } from '@/types';
import toast from 'react-hot-toast';

const MAX_OFFERS = 3;

type OfferForm = {
    title: string;
    description: string;
    code: string;
    discountType: 'percentage' | 'flat';
    discountValue: number;
    minOrderAmount: number;
    maxDiscount: number;
    validFrom: string;
    validTill: string;
    label: string;
    headline: string;
    ctaText: string;
    colorTheme: string;
};

const emptyForm: OfferForm = {
    title: '', description: '', code: '', discountType: 'percentage',
    discountValue: 10, minOrderAmount: 0, maxDiscount: 0,
    validFrom: new Date().toISOString().slice(0, 10),
    validTill: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    label: '', headline: '', ctaText: 'Order Now', colorTheme: '#E8A317',
};

export default function OfferManagement() {
    const [offers, setOffers] = useState<IOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<OfferForm>(emptyForm);
    const [saving, setSaving] = useState(false);

    const fetchOffers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAdminOffers();
            setOffers(data.offers);
        } catch { toast.error('Failed to load offers'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchOffers(); }, [fetchOffers]);

    const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };

    const openEdit = (offer: IOffer) => {
        setForm({
            title: offer.title,
            description: offer.description || '',
            code: offer.code || '',
            discountType: offer.discountType as 'percentage' | 'flat',
            discountValue: offer.discountValue,
            minOrderAmount: offer.minOrderAmount,
            maxDiscount: (offer as any).maxDiscount || 0,
            validFrom: offer.validTill ? new Date(offer.validTill).toISOString().slice(0, 10) : '',
            validTill: offer.validTill ? new Date(offer.validTill).toISOString().slice(0, 10) : '',
            label: offer.label || '',
            headline: offer.headline || '',
            ctaText: offer.ctaText || 'Order Now',
            colorTheme: offer.colorTheme || '#E8A317',
        });
        setEditingId(offer._id);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) { toast.error('Title is required'); return; }
        setSaving(true);
        try {
            if (editingId) {
                await updateOffer(editingId, form as any);
                toast.success('Offer updated');
            } else {
                await createOffer(form as any);
                toast.success('Offer created');
            }
            setShowForm(false);
            fetchOffers();
        } catch { toast.error('Failed to save offer'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this offer?')) return;
        try {
            await deleteOffer(id);
            toast.success('Offer deleted');
            fetchOffers();
        } catch { toast.error('Failed to delete'); }
    };

    const handleToggle = async (id: string) => {
        try {
            await toggleOfferActive(id);
            fetchOffers();
        } catch { toast.error('Failed to toggle'); }
    };

    const update = (key: keyof OfferForm, value: unknown) => setForm((p) => ({ ...p, [key]: value }));

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h1 className="font-outfit font-extrabold text-[1.5rem] text-[#0F0F0F] tracking-[-0.02em] flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#FFF7ED] flex items-center justify-center text-[#EA580C]">
                        <Tag size={20} />
                    </span>
                    Offers
                </h1>
                <button
                    onClick={openCreate}
                    disabled={offers.length >= MAX_OFFERS}
                    className="btn-primary flex items-center gap-2 text-[0.85rem]"
                    title={offers.length >= MAX_OFFERS ? 'Maximum 3 offers. Delete one first.' : ''}
                    style={offers.length >= MAX_OFFERS ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                    <Plus size={16} /> New Offer
                </button>
            </div>

            {/* 3-offer limit warning */}
            {offers.length >= MAX_OFFERS && (
                <div className="flex items-center gap-3 p-4 rounded-xl mb-5" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
                    <AlertTriangle size={18} className="text-[#D97706] shrink-0" />
                    <span className="text-[0.84rem] text-[#92400E] font-medium">
                        Maximum of {MAX_OFFERS} offers reached. Delete an existing offer to add a new one.
                    </span>
                </div>
            )}

            {/* Create / Edit form */}
            {showForm && (
                <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6 mb-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="font-outfit font-bold">{editingId ? 'Edit Offer' : 'New Offer'}</h3>
                        <button onClick={() => setShowForm(false)} className="text-[#8E8E8E] hover:text-[#4A4A4A]"><X size={18} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-1">Title *</label>
                            <input className="input" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Weekend Special" />
                        </div>
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-1">Code</label>
                            <input className="input uppercase" value={form.code} onChange={(e) => update('code', e.target.value.toUpperCase())} placeholder="e.g. SAVE20" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block font-semibold text-[0.85rem] mb-1">Description</label>
                            <input className="input" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Offer details..." />
                        </div>
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-1">Discount Type</label>
                            <select className="input" value={form.discountType} onChange={(e) => update('discountType', e.target.value)}>
                                <option value="percentage">Percentage (%)</option>
                                <option value="flat">Flat (₹)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-1">Discount Value</label>
                            <input className="input" type="number" min={0} value={form.discountValue} onChange={(e) => update('discountValue', Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-1">Min Order Amount (₹)</label>
                            <input className="input" type="number" min={0} value={form.minOrderAmount} onChange={(e) => update('minOrderAmount', Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-1">Max Discount (₹)</label>
                            <input className="input" type="number" min={0} value={form.maxDiscount} onChange={(e) => update('maxDiscount', Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-1">Valid From</label>
                            <input className="input" type="date" value={form.validFrom} onChange={(e) => update('validFrom', e.target.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-1">Valid Till</label>
                            <input className="input" type="date" value={form.validTill} onChange={(e) => update('validTill', e.target.value)} />
                        </div>
                    </div>
                    <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 mt-5 text-[0.85rem]">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {editingId ? 'Update Offer' : 'Create Offer'}
                    </button>
                </div>
            )}

            {/* Offers Table */}
            <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-[0.85rem]">
                        <thead>
                            <tr className="bg-[#F9F9F7] text-[#8E8E8E] text-[0.75rem] uppercase tracking-wider">
                                <th className="text-left px-6 py-3 font-semibold">Title</th>
                                <th className="text-left px-6 py-3 font-semibold">Code</th>
                                <th className="text-left px-6 py-3 font-semibold">Discount</th>
                                <th className="text-left px-6 py-3 font-semibold">Min Order</th>
                                <th className="text-left px-6 py-3 font-semibold">Valid Till</th>
                                <th className="text-left px-6 py-3 font-semibold">Status</th>
                                <th className="text-left px-6 py-3 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-10 text-center text-[#8E8E8E]">Loading...</td></tr>
                            ) : offers.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-10 text-center text-[#8E8E8E]">No offers yet. Click "New Offer" to create one.</td></tr>
                            ) : offers.map((offer) => {
                                const expired = new Date(offer.validTill) < new Date();
                                return (
                                    <tr key={offer._id} className="border-t border-[#F0F0EE] hover:bg-[#FAFAF8] transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-[#0F0F0F]">{offer.title}</p>
                                            {offer.description && <p className="text-[0.75rem] text-[#8E8E8E] truncate max-w-[200px]">{offer.description}</p>}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[0.85rem] font-bold text-[#7C3AED]">{offer.code || '—'}</td>
                                        <td className="px-6 py-4 font-bold">
                                            {offer.discountType === 'percentage' ? `${offer.discountValue}%` : `₹${offer.discountValue}`}
                                        </td>
                                        <td className="px-6 py-4">₹{offer.minOrderAmount}</td>
                                        <td className="px-6 py-4 text-[0.8rem] whitespace-nowrap">
                                            <span className={expired ? 'text-[#DC2626]' : 'text-[#4A4A4A]'}>
                                                {new Date(offer.validTill).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className="px-2.5 py-[0.2rem] rounded-md text-[0.7rem] font-bold"
                                                style={{
                                                    background: expired ? '#FEF2F2' : (offer as any).isActive !== false ? '#F0FDF4' : '#F9F9F7',
                                                    color: expired ? '#DC2626' : (offer as any).isActive !== false ? '#16A34A' : '#8E8E8E',
                                                }}
                                            >
                                                {expired ? 'EXPIRED' : (offer as any).isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleToggle(offer._id)}
                                                    title={`${(offer as any).isActive !== false ? 'Deactivate' : 'Activate'}`}
                                                    className="w-8 h-8 rounded-lg border border-[#EEEEEE] flex items-center justify-center hover:bg-[#F5F5F3] transition-colors cursor-pointer"
                                                >
                                                    {(offer as any).isActive !== false ? <ToggleRight size={16} className="text-[#16A34A]" /> : <ToggleLeft size={16} className="text-[#8E8E8E]" />}
                                                </button>
                                                <button
                                                    onClick={() => openEdit(offer)}
                                                    title="Edit"
                                                    className="w-8 h-8 rounded-lg border border-[#EEEEEE] flex items-center justify-center hover:bg-[#F5F5F3] transition-colors cursor-pointer"
                                                >
                                                    <Pencil size={14} className="text-[#2563EB]" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(offer._id)}
                                                    title="Delete"
                                                    className="w-8 h-8 rounded-lg border border-[#EEEEEE] flex items-center justify-center hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                                                >
                                                    <Trash2 size={14} className="text-[#DC2626]" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
