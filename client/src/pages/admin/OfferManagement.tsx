import { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Pencil, Trash2, X, Save, Loader2, AlertTriangle, Percent, IndianRupee, Calendar, BadgePercent } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminCard from '@/components/admin/ui/AdminCard';
import AdminPageHeader from '@/components/admin/ui/AdminPageHeader';
import AdminBadge from '@/components/admin/ui/AdminBadge';
import AdminToggle from '@/components/admin/ui/AdminToggle';
import AdminEmptyState from '@/components/admin/ui/AdminEmptyState';
import AdminSkeleton from '@/components/admin/ui/AdminSkeleton';
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

const THEME_COLORS = ['#E8A317', '#DC2626', '#2563EB', '#16A34A', '#7C3AED', '#EA580C'];

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
        if (form.discountValue <= 0) { toast.error('Discount must be positive'); return; }
        if (form.discountType === 'percentage' && form.discountValue > 100) { toast.error('Percentage cannot exceed 100'); return; }
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
            setOffers(prev => prev.filter(o => o._id !== id));
            toast.success('Offer deleted');
        } catch { toast.error('Failed to delete'); }
    };

    const handleToggle = async (id: string) => {
        try {
            const res = await toggleOfferActive(id);
            setOffers(prev => prev.map(o => o._id === id ? { ...o, isActive: (res as any).offer?.isActive ?? !(o as any).isActive } : o));
        } catch { toast.error('Failed to toggle'); }
    };

    const update = (key: keyof OfferForm, value: unknown) => setForm((p) => ({ ...p, [key]: value }));

    return (
        <AdminLayout>
            <AdminPageHeader
                title="Offers"
                subtitle={`${offers.length} / ${MAX_OFFERS} offers`}
                icon={Tag}
                actions={
                    <button
                        onClick={openCreate}
                        disabled={offers.length >= MAX_OFFERS}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E8A317] text-white font-bold text-[0.85rem] border-none cursor-pointer hover:bg-[#D49516] transition-colors shadow-[0_2px_12px_rgba(232,163,23,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={18} /> New Offer
                    </button>
                }
            />

            {offers.length >= MAX_OFFERS && (
                <AdminCard className="mb-5 !border-[#FCD34D] !bg-[#FFFBEB]">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={18} className="text-[#D97706] shrink-0" />
                        <span className="text-[0.84rem] text-[#92400E] font-medium">
                            Maximum of {MAX_OFFERS} offers reached. Delete an existing offer to add a new one.
                        </span>
                    </div>
                </AdminCard>
            )}

            {/* Offer Cards */}
            {loading ? (
                <AdminSkeleton count={3} type="card" />
            ) : offers.length === 0 ? (
                <AdminEmptyState
                    icon={BadgePercent}
                    title="No offers yet"
                    description="Create your first promotional offer"
                    action={{ label: 'New Offer', onClick: openCreate }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {offers.map((offer) => {
                        const expired = new Date(offer.validTill) < new Date();
                        const isActive = (offer as any).isActive !== false;
                        const themeColor = offer.colorTheme || '#E8A317';

                        return (
                            <AdminCard key={offer._id} padding={false} className="overflow-hidden group">
                                {/* Promo Banner Preview */}
                                <div
                                    className="px-5 py-4 text-white relative overflow-hidden"
                                    style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20" style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
                                    <div className="relative z-10">
                                        {offer.label && (
                                            <span className="inline-block text-[0.65rem] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md mb-2">
                                                {offer.label}
                                            </span>
                                        )}
                                        <div className="font-outfit font-extrabold text-[1.5rem] leading-tight">
                                            {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                                        </div>
                                        {offer.headline && (
                                            <p className="text-[0.8rem] opacity-90 mt-1">{offer.headline}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="font-outfit font-bold text-[0.95rem] text-[#0F0F0F]">{offer.title}</h3>
                                        <AdminBadge label={expired ? 'EXPIRED' : isActive ? 'ACTIVE' : 'INACTIVE'} />
                                    </div>

                                    {offer.description && (
                                        <p className="text-[0.78rem] text-[#8E8E8E] line-clamp-2 mb-3">{offer.description}</p>
                                    )}

                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {offer.code && (
                                            <span className="font-mono text-[0.75rem] font-bold text-[#7C3AED] bg-[#F5F3FF] px-2.5 py-1 rounded-lg border border-[#EDE9FE]">
                                                {offer.code}
                                            </span>
                                        )}
                                        <span className="text-[0.72rem] text-[#8E8E8E] bg-[#F5F5F3] px-2 py-1 rounded-lg flex items-center gap-1">
                                            <IndianRupee size={10} /> Min ₹{offer.minOrderAmount}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-[0.72rem] text-[#8E8E8E] mb-3">
                                        <Calendar size={12} />
                                        <span className={expired ? 'text-[#DC2626]' : ''}>
                                            Till {new Date(offer.validTill).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-between pt-3 border-t border-[#F0F0EE]">
                                        <div className="flex items-center gap-2">
                                            <AdminToggle
                                                checked={isActive && !expired}
                                                onChange={() => handleToggle(offer._id)}
                                                size="sm"
                                            />
                                            <span className="text-[0.75rem] text-[#8E8E8E]">
                                                {isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => openEdit(offer)}
                                                className="w-8 h-8 rounded-lg border border-[#EEEEEE] bg-white flex items-center justify-center cursor-pointer text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(offer._id)}
                                                className="w-8 h-8 rounded-lg border border-[#EEEEEE] bg-white flex items-center justify-center cursor-pointer text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </AdminCard>
                        );
                    })}
                </div>
            )}

            {/* Slide-over Form */}
            {showForm && (
                <div
                    className="fixed inset-0 z-[100] flex justify-end"
                    style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
                >
                    <div
                        className="bg-white h-full w-full max-w-[520px] flex flex-col shadow-[-8px_0_40px_rgba(0,0,0,0.12)]"
                        style={{ animation: 'slideInRight 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EEEEEE] shrink-0">
                            <h2 className="font-outfit font-bold text-[1.1rem] text-[#0F0F0F]">
                                {editingId ? 'Edit Offer' : 'New Offer'}
                            </h2>
                            <button
                                onClick={() => setShowForm(false)}
                                className="w-9 h-9 rounded-xl border border-[#EEEEEE] flex items-center justify-center bg-white cursor-pointer text-[#4A4A4A] hover:bg-[#F5F5F3] transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="flex flex-col gap-5">
                                {/* Title & Code */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Title *</label>
                                        <input
                                            className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                            value={form.title}
                                            onChange={(e) => update('title', e.target.value)}
                                            placeholder="e.g. Weekend Special"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Code</label>
                                        <input
                                            className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] font-mono uppercase outline-none focus:border-[#E8A317] transition-colors"
                                            value={form.code}
                                            onChange={(e) => update('code', e.target.value.toUpperCase())}
                                            placeholder="e.g. SAVE20"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Description</label>
                                    <input
                                        className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                        value={form.description}
                                        onChange={(e) => update('description', e.target.value)}
                                        placeholder="Offer details..."
                                    />
                                </div>

                                {/* Discount Type & Value */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Discount Type</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => update('discountType', 'percentage')}
                                                className={`flex-1 h-10 rounded-xl border text-[0.82rem] font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                                                    form.discountType === 'percentage'
                                                        ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]'
                                                        : 'bg-white text-[#4A4A4A] border-[#EEEEEE] hover:bg-[#F5F5F3]'
                                                }`}
                                            >
                                                <Percent size={14} /> %
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => update('discountType', 'flat')}
                                                className={`flex-1 h-10 rounded-xl border text-[0.82rem] font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                                                    form.discountType === 'flat'
                                                        ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]'
                                                        : 'bg-white text-[#4A4A4A] border-[#EEEEEE] hover:bg-[#F5F5F3]'
                                                }`}
                                            >
                                                <IndianRupee size={14} /> Flat
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Value</label>
                                        <input
                                            className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                            type="number"
                                            min={0}
                                            value={form.discountValue}
                                            onChange={(e) => update('discountValue', Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                {/* Min Order & Max Discount */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Min Order (₹)</label>
                                        <input
                                            className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                            type="number"
                                            min={0}
                                            value={form.minOrderAmount}
                                            onChange={(e) => update('minOrderAmount', Number(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Max Discount (₹)</label>
                                        <input
                                            className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                            type="number"
                                            min={0}
                                            value={form.maxDiscount}
                                            onChange={(e) => update('maxDiscount', Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Valid From</label>
                                        <input
                                            className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                            type="date"
                                            value={form.validFrom}
                                            onChange={(e) => update('validFrom', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Valid Till</label>
                                        <input
                                            className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                            type="date"
                                            value={form.validTill}
                                            onChange={(e) => update('validTill', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Landing Page Fields */}
                                <div className="pt-3 border-t border-[#F0F0EE]">
                                    <h4 className="font-semibold text-[0.85rem] text-[#0F0F0F] mb-3">Landing Page Display</h4>
                                    <div className="flex flex-col gap-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Label</label>
                                                <input
                                                    className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                                    value={form.label}
                                                    onChange={(e) => update('label', e.target.value)}
                                                    placeholder="e.g. LIMITED TIME"
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">CTA Text</label>
                                                <input
                                                    className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                                    value={form.ctaText}
                                                    onChange={(e) => update('ctaText', e.target.value)}
                                                    placeholder="e.g. Order Now"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Headline</label>
                                            <input
                                                className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                                value={form.headline}
                                                onChange={(e) => update('headline', e.target.value)}
                                                placeholder="e.g. Save big on your next order!"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Color Theme</label>
                                            <div className="flex gap-2">
                                                {THEME_COLORS.map(c => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        onClick={() => update('colorTheme', c)}
                                                        className={`w-8 h-8 rounded-lg cursor-pointer border-2 transition-all ${
                                                            form.colorTheme === c ? 'ring-2 ring-offset-2 scale-110' : 'opacity-70 hover:opacity-100'
                                                        }`}
                                                        style={{ background: c, borderColor: form.colorTheme === c ? c : 'transparent' }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-[#EEEEEE] px-6 py-4 shrink-0">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full h-11 rounded-xl bg-[#E8A317] text-white font-bold text-[0.85rem] border-none cursor-pointer flex items-center justify-center gap-2 hover:bg-[#D49516] transition-colors disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {editingId ? 'Update Offer' : 'Create Offer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </AdminLayout>
    );
}
