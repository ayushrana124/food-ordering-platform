import { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Pencil, Trash2, X, Save, Loader2, AlertTriangle, Percent, IndianRupee, Calendar, BadgePercent, ChevronDown } from 'lucide-react';
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
    discountType: 'FLAT' | 'PERCENTAGE';
    discountValue: number | '';
    minOrderAmount: number | '';
    maxDiscount: number | '';
    validFrom: string;
    validTill: string;
    label: string;
    headline: string;
    ctaText: string;
    colorTheme: string;
};

const emptyForm: OfferForm = {
    title: '', description: '', code: '', discountType: 'FLAT',
    discountValue: '', minOrderAmount: '', maxDiscount: '',
    validFrom: new Date().toISOString().slice(0, 10),
    validTill: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    label: '', headline: '', ctaText: 'Order Now', colorTheme: '#E8A317',
};

const THEME_COLORS = ['#E8A317', '#DC2626', '#2563EB', '#16A34A', '#7C3AED', '#EA580C'];

// Input style constant
const INPUT_CLS = "w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors";

export default function OfferManagement() {
    const [offers, setOffers] = useState<IOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<OfferForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [showLandingFields, setShowLandingFields] = useState(false);

    const fetchOffers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAdminOffers();
            setOffers(data.offers);
        } catch { toast.error('Failed to load offers'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchOffers(); }, [fetchOffers]);

    const openCreate = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowLandingFields(false);
        setShowForm(true);
    };

    const openEdit = (offer: IOffer) => {
        const dt = (offer.discountType || 'FLAT').toUpperCase() as 'FLAT' | 'PERCENTAGE';
        setForm({
            title: offer.title,
            description: offer.description || '',
            code: offer.code || '',
            discountType: dt,
            discountValue: offer.discountValue ?? '',
            minOrderAmount: offer.minOrderAmount ?? '',
            maxDiscount: (offer as any).maxDiscount || '',
            validFrom: offer.validTill ? new Date(offer.validTill).toISOString().slice(0, 10) : '',
            validTill: offer.validTill ? new Date(offer.validTill).toISOString().slice(0, 10) : '',
            label: offer.label || '',
            headline: offer.headline || '',
            ctaText: offer.ctaText || 'Order Now',
            colorTheme: offer.colorTheme || '#E8A317',
        });
        setEditingId(offer._id);
        setShowLandingFields(!!(offer.label || offer.headline));
        setShowForm(true);
    };

    const handleSave = async () => {
        const discountValue = Number(form.discountValue) || 0;
        const minOrderAmount = Number(form.minOrderAmount) || 0;
        const maxDiscount = Number(form.maxDiscount) || 0;

        if (!form.title.trim()) { toast.error('Title is required'); return; }
        if (!form.code.trim()) { toast.error('Coupon code is required'); return; }
        if (discountValue <= 0) { toast.error('Discount must be positive'); return; }
        if (form.discountType === 'PERCENTAGE' && discountValue > 100) { toast.error('Percentage cannot exceed 100'); return; }
        if (!form.validFrom || !form.validTill) { toast.error('Both dates are required'); return; }
        if (new Date(form.validTill) <= new Date(form.validFrom)) { toast.error('End date must be after start date'); return; }

        setSaving(true);
        try {
            // Send uppercase discountType to backend
            const payload = {
                ...form,
                code: form.code.trim().toUpperCase(),
                discountType: form.discountType,
                discountValue,
                minOrderAmount,
                maxDiscount: form.discountType === 'FLAT' ? undefined : maxDiscount,
            };

            if (editingId) {
                await updateOffer(editingId, payload as any);
                toast.success('Coupon updated');
            } else {
                await createOffer(payload as any);
                toast.success('Coupon created');
            }
            setShowForm(false);
            fetchOffers();
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to save coupon';
            toast.error(msg);
        }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this coupon?')) return;
        try {
            await deleteOffer(id);
            setOffers(prev => prev.filter(o => o._id !== id));
            toast.success('Coupon deleted');
        } catch { toast.error('Failed to delete'); }
    };

    const handleToggle = async (id: string) => {
        try {
            const res = await toggleOfferActive(id);
            setOffers(prev => prev.map(o => o._id === id ? { ...o, isActive: (res as any).offer?.isActive ?? !(o as any).isActive } : o));
        } catch { toast.error('Failed to toggle'); }
    };

    const set = <K extends keyof OfferForm>(key: K, value: OfferForm[K]) =>
        setForm((p) => ({ ...p, [key]: value }));

    /** Preview text for the discount */
    const discountPreview = form.discountType === 'FLAT'
        ? `₹${form.discountValue || 0} OFF`
        : `${form.discountValue || 0}% OFF${Number(form.maxDiscount) > 0 ? ` (up to ₹${form.maxDiscount})` : ''}`;

    return (
        <AdminLayout>
            <AdminPageHeader
                title="Coupons"
                subtitle={`${offers.length} / ${MAX_OFFERS} coupons`}
                icon={Tag}
                actions={
                    <button
                        onClick={openCreate}
                        disabled={offers.length >= MAX_OFFERS}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E8A317] text-white font-bold text-[0.85rem] border-none cursor-pointer hover:bg-[#D49516] transition-colors shadow-[0_2px_12px_rgba(232,163,23,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={18} /> New Coupon
                    </button>
                }
            />

            {offers.length >= MAX_OFFERS && (
                <AdminCard className="mb-5 !border-[#FCD34D] !bg-[#FFFBEB]">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={18} className="text-[#D97706] shrink-0" />
                        <span className="text-[0.84rem] text-[#92400E] font-medium">
                            Maximum of {MAX_OFFERS} coupons reached. Delete an existing one to add a new one.
                        </span>
                    </div>
                </AdminCard>
            )}

            {/* Coupon Cards */}
            {loading ? (
                <AdminSkeleton count={3} type="card" />
            ) : offers.length === 0 ? (
                <AdminEmptyState
                    icon={BadgePercent}
                    title="No coupons yet"
                    description="Create your first promotional coupon"
                    action={{ label: 'New Coupon', onClick: openCreate }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {offers.map((offer) => {
                        const expired = new Date(offer.validTill) < new Date();
                        const isActive = (offer as any).isActive !== false;
                        const themeColor = offer.colorTheme || '#E8A317';
                        const dt = (offer.discountType || 'FLAT').toUpperCase();

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
                                            {dt === 'PERCENTAGE' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
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
                                        <span className="text-[0.72rem] text-[#8E8E8E] bg-[#F5F5F3] px-2 py-1 rounded-lg">
                                            {dt === 'FLAT' ? 'Flat' : '%'}
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

            {/* ── Slide-over Form ──────────────────────────────────────────── */}
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
                                {editingId ? 'Edit Coupon' : 'New Coupon'}
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
                                {/* ── Step 1: Coupon Type ─────────────────────────── */}
                                <div>
                                    <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-2">Coupon Type</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Flat Card */}
                                        <button
                                            type="button"
                                            onClick={() => set('discountType', 'FLAT')}
                                            className="relative rounded-2xl border-2 p-4 text-left cursor-pointer transition-all"
                                            style={{
                                                borderColor: form.discountType === 'FLAT' ? '#E8A317' : '#EEEEEE',
                                                background: form.discountType === 'FLAT' ? '#FFFBF0' : 'white',
                                            }}
                                        >
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                                                 style={{ background: form.discountType === 'FLAT' ? '#E8A317' : '#F5F5F3', color: form.discountType === 'FLAT' ? 'white' : '#8E8E8E' }}>
                                                <IndianRupee size={20} />
                                            </div>
                                            <p className="font-bold text-[0.9rem] text-[#0F0F0F]">Flat Coupon</p>
                                            <p className="text-[0.72rem] text-[#8E8E8E] mt-0.5">Fixed ₹ amount off</p>
                                            {form.discountType === 'FLAT' && (
                                                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#E8A317] flex items-center justify-center">
                                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                </div>
                                            )}
                                        </button>

                                        {/* Percentage Card */}
                                        <button
                                            type="button"
                                            onClick={() => set('discountType', 'PERCENTAGE')}
                                            className="relative rounded-2xl border-2 p-4 text-left cursor-pointer transition-all"
                                            style={{
                                                borderColor: form.discountType === 'PERCENTAGE' ? '#2563EB' : '#EEEEEE',
                                                background: form.discountType === 'PERCENTAGE' ? '#EFF6FF' : 'white',
                                            }}
                                        >
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                                                 style={{ background: form.discountType === 'PERCENTAGE' ? '#2563EB' : '#F5F5F3', color: form.discountType === 'PERCENTAGE' ? 'white' : '#8E8E8E' }}>
                                                <Percent size={20} />
                                            </div>
                                            <p className="font-bold text-[0.9rem] text-[#0F0F0F]">Percentage Coupon</p>
                                            <p className="text-[0.72rem] text-[#8E8E8E] mt-0.5">% off with optional cap</p>
                                            {form.discountType === 'PERCENTAGE' && (
                                                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#2563EB] flex items-center justify-center">
                                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Live preview chip */}
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[#E8A317] bg-[#FFFBF0]">
                                    <BadgePercent size={16} className="text-[#E8A317] shrink-0" />
                                    <span className="font-outfit font-bold text-[0.9rem] text-[#E8A317]">{discountPreview}</span>
                                    {Number(form.minOrderAmount) > 0 && (
                                        <span className="text-[0.72rem] text-[#8E8E8E] ml-auto">on ₹{form.minOrderAmount}+</span>
                                    )}
                                </div>

                                {/* ── Coupon Details ─────────────────────────────── */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Title *</label>
                                        <input className={INPUT_CLS} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Weekend Special" />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Coupon Code *</label>
                                        <input className={`${INPUT_CLS} font-mono uppercase`} value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="e.g. SAVE50" maxLength={15} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Description</label>
                                    <input className={INPUT_CLS} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Short description for customers..." />
                                </div>

                                {/* Discount Value + Min Order + Max Discount (conditional) */}
                                <div className={`grid gap-4 ${form.discountType === 'PERCENTAGE' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                    <div>
                                        <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">
                                            {form.discountType === 'FLAT' ? 'Discount (₹)' : 'Discount (%)'}
                                        </label>
                                        <input
                                            className={INPUT_CLS}
                                            type="number"
                                            min={1}
                                            max={form.discountType === 'PERCENTAGE' ? 100 : undefined}
                                            value={form.discountValue}
                                            onChange={(e) => set('discountValue', e.target.value === '' ? '' : Number(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Min Order (₹)</label>
                                        <input className={INPUT_CLS} type="number" min={0} value={form.minOrderAmount} onChange={(e) => set('minOrderAmount', e.target.value === '' ? '' : Number(e.target.value))} />
                                    </div>
                                    {form.discountType === 'PERCENTAGE' && (
                                        <div>
                                            <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Max Discount (₹)</label>
                                            <input className={INPUT_CLS} type="number" min={0} value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value === '' ? '' : Number(e.target.value))} placeholder="No cap" />
                                        </div>
                                    )}
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Valid From</label>
                                        <input className={INPUT_CLS} type="date" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Valid Till</label>
                                        <input className={INPUT_CLS} type="date" value={form.validTill} onChange={(e) => set('validTill', e.target.value)} />
                                    </div>
                                </div>

                                {/* ── Landing Page Fields (collapsible) ────────── */}
                                <div className="border-t border-[#F0F0EE] pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowLandingFields(!showLandingFields)}
                                        className="flex items-center gap-2 w-full text-left bg-none border-none cursor-pointer p-0"
                                    >
                                        <h4 className="font-semibold text-[0.85rem] text-[#0F0F0F]">Landing Page Display</h4>
                                        <span className="text-[0.72rem] text-[#8E8E8E]">(optional)</span>
                                        <ChevronDown
                                            size={14}
                                            className="text-[#8E8E8E] ml-auto transition-transform"
                                            style={{ transform: showLandingFields ? 'rotate(180deg)' : 'rotate(0)' }}
                                        />
                                    </button>

                                    {showLandingFields && (
                                        <div className="flex flex-col gap-4 mt-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Badge Label</label>
                                                    <input className={INPUT_CLS} value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="e.g. LIMITED TIME" />
                                                </div>
                                                <div>
                                                    <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">CTA Text</label>
                                                    <input className={INPUT_CLS} value={form.ctaText} onChange={(e) => set('ctaText', e.target.value)} placeholder="e.g. Order Now" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Headline</label>
                                                <input className={INPUT_CLS} value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="e.g. Save big on your next order!" />
                                            </div>

                                        </div>
                                    )}
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
                                {editingId ? 'Update Coupon' : 'Create Coupon'}
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
