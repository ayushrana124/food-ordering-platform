import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Store, Clock, MapPin, Save, Loader2, Truck } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminCard from '@/components/admin/ui/AdminCard';
import AdminPageHeader from '@/components/admin/ui/AdminPageHeader';
import AdminToggle from '@/components/admin/ui/AdminToggle';
import AdminSkeleton from '@/components/admin/ui/AdminSkeleton';
import { useAdminContext } from '@/contexts/AdminContext';
import { updateRestaurant } from '@/services/adminApi';
import toast from 'react-hot-toast';

type TabKey = 'general' | 'delivery' | 'hours';

// ── Local form shape (flat, easy to bind to inputs) ──────────────────────────
interface FormData {
    name: string;
    description: string;
    phone: string;
    addressLine: string;        // flat string from address.addressLine
    lat: number | '';                // from address.coordinates.lat
    lng: number | '';                // from address.coordinates.lng
    deliveryRadius: number | '';
    minOrderAmount: number | '';
    avgPreparationTime: number | ''; // backend calls it this, form shows as "Delivery Time"
    isOpen: boolean;
    openHour: string;           // simple open/close applied to all days
    closeHour: string;
}

/** Extract flat form data from the raw backend restaurant object */
function backendToForm(r: any): FormData {
    return {
        name: r.name ?? '',
        description: r.description ?? '',
        phone: r.phone ?? '',
        addressLine: typeof r.address === 'string' ? r.address : r.address?.addressLine ?? '',
        lat: r.address?.coordinates?.lat ?? r.coordinates?.lat ?? 0,
        lng: r.address?.coordinates?.lng ?? r.coordinates?.lng ?? 0,
        deliveryRadius: r.deliveryRadius ?? 10,
        minOrderAmount: r.minOrderAmount ?? 0,
        avgPreparationTime: r.avgPreparationTime ?? r.deliveryTime ?? 30,
        isOpen: r.isOpen ?? true,
        // Pull open/close from first available day, or fallback
        openHour: r.openingHours?.monday?.open ?? r.openingHours?.open ?? '10:00',
        closeHour: r.openingHours?.monday?.close ?? r.openingHours?.close ?? '23:00',
    };
}

/** Convert flat form data back into the shape the backend expects */
function formToPayload(f: FormData) {
    const hours = { open: f.openHour, close: f.closeHour, isOpen: true };
    return {
        name: f.name,
        description: f.description,
        phone: f.phone,
        address: {
            addressLine: f.addressLine,
            coordinates: { lat: Number(f.lat) || 0, lng: Number(f.lng) || 0 },
        },
        deliveryRadius: Number(f.deliveryRadius) || 0,
        minOrderAmount: Number(f.minOrderAmount) || 0,
        avgPreparationTime: Number(f.avgPreparationTime) || 0,
        isOpen: f.isOpen,
        openingHours: {
            monday: hours,
            tuesday: hours,
            wednesday: hours,
            thursday: hours,
            friday: hours,
            saturday: hours,
            sunday: hours,
        },
    };
}

export default function Settings() {
    const { fetchRestaurant, updateRestaurantCache } = useAdminContext();
    const [form, setForm] = useState<FormData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('general');

    useEffect(() => {
        (async () => {
            const r = await fetchRestaurant(true); // force fresh fetch
            if (r) setForm(backendToForm(r));
            setLoading(false);
        })();
    }, [fetchRestaurant]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form) return;
        setSaving(true);
        try {
            const payload = formToPayload(form);
            const res = await updateRestaurant(payload as any);
            // Update local form from the exact response the server returned
            setForm(backendToForm(res.restaurant));
            updateRestaurantCache(res.restaurant);
            toast.success('Settings saved!');
        } catch { toast.error('Failed to save'); }
        finally { setSaving(false); }
    };

    const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
        setForm((prev) => prev ? { ...prev, [key]: value } : prev);
    };

    const tabs: { key: TabKey; label: string; icon: typeof Store }[] = [
        { key: 'general', label: 'General', icon: Store },
        { key: 'delivery', label: 'Delivery', icon: Truck },
        { key: 'hours', label: 'Hours', icon: Clock },
    ];

    if (loading || !form) {
        return (
            <AdminLayout>
                <AdminPageHeader title="Settings" subtitle="Restaurant configuration" icon={SettingsIcon} />
                <AdminSkeleton count={3} type="card" />
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <AdminPageHeader
                title="Settings"
                subtitle="Restaurant configuration"
                icon={SettingsIcon}
            />

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-5">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[0.82rem] font-semibold border cursor-pointer transition-all ${
                                activeTab === tab.key
                                    ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]'
                                    : 'bg-white text-[#4A4A4A] border-[#EEEEEE] hover:bg-[#F5F5F3]'
                            }`}
                        >
                            <Icon size={16} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="max-w-[720px]">
                {/* General Tab */}
                {activeTab === 'general' && (
                    <AdminCard>
                        <h3 className="font-outfit font-bold text-[1rem] mb-5 flex items-center gap-2.5 text-[#0F0F0F]">
                            <Store size={18} className="text-[#E8A317]" /> General Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Restaurant Name</label>
                                <input
                                    className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                    value={form.name}
                                    onChange={(e) => set('name', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Phone</label>
                                <input
                                    className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => set('phone', e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Description</label>
                                <textarea
                                    className="w-full px-4 py-3 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors resize-y"
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) => set('description', e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Address</label>
                                <input
                                    className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                    value={form.addressLine}
                                    onChange={(e) => set('addressLine', e.target.value)}
                                />
                            </div>
                        </div>
                    </AdminCard>
                )}

                {/* Delivery Tab */}
                {activeTab === 'delivery' && (
                    <AdminCard>
                        <h3 className="font-outfit font-bold text-[1rem] mb-5 flex items-center gap-2.5 text-[#0F0F0F]">
                            <MapPin size={18} className="text-[#2563EB]" /> Delivery & Orders
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Delivery Radius (km)</label>
                                <input
                                    className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                    type="number"
                                    min={1}
                                    value={form.deliveryRadius}
                                    onChange={(e) => set('deliveryRadius', e.target.value === '' ? '' : Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Min Order (₹)</label>
                                <input
                                    className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                    type="number"
                                    min={0}
                                    value={form.minOrderAmount}
                                    onChange={(e) => set('minOrderAmount', e.target.value === '' ? '' : Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Avg Prep Time (min)</label>
                                <input
                                    className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                    type="number"
                                    min={5}
                                    value={form.avgPreparationTime}
                                    onChange={(e) => set('avgPreparationTime', e.target.value === '' ? '' : Number(e.target.value))}
                                />
                            </div>
                        </div>

                        {/* Coordinates */}
                        <div className="mt-5 pt-5 border-t border-[#F0F0EE]">
                            <h4 className="font-semibold text-[0.85rem] text-[#0F0F0F] mb-3">Restaurant Coordinates</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Latitude</label>
                                    <input
                                        className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                        type="number"
                                        step="any"
                                        value={form.lat}
                                        onChange={(e) => set('lat', e.target.value === '' ? '' : Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Longitude</label>
                                    <input
                                        className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                        type="number"
                                        step="any"
                                        value={form.lng}
                                        onChange={(e) => set('lng', e.target.value === '' ? '' : Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </AdminCard>
                )}

                {/* Hours Tab */}
                {activeTab === 'hours' && (
                    <AdminCard>
                        <h3 className="font-outfit font-bold text-[1rem] mb-5 flex items-center gap-2.5 text-[#0F0F0F]">
                            <Clock size={18} className="text-[#16A34A]" /> Hours & Status
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-end">
                            <div>
                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Opens at</label>
                                <input
                                    className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                    type="time"
                                    value={form.openHour}
                                    onChange={(e) => set('openHour', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Closes at</label>
                                <input
                                    className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                    type="time"
                                    value={form.closeHour}
                                    onChange={(e) => set('closeHour', e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-3 pb-1">
                                <AdminToggle
                                    checked={form.isOpen}
                                    onChange={() => set('isOpen', !form.isOpen)}
                                />
                                <span className={`font-semibold text-[0.85rem] ${form.isOpen ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                                    {form.isOpen ? 'Open Now' : 'Closed'}
                                </span>
                            </div>
                        </div>

                        {/* Quick hours */}
                        <div className="mt-4 pt-4 border-t border-[#F0F0EE]">
                            <p className="text-[0.78rem] text-[#8E8E8E] mb-2">Quick set:</p>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: '9 AM - 11 PM', open: '09:00', close: '23:00' },
                                    { label: '10 AM - 10 PM', open: '10:00', close: '22:00' },
                                    { label: '11 AM - 12 AM', open: '11:00', close: '00:00' },
                                    { label: '24 Hours', open: '00:00', close: '23:59' },
                                ].map(preset => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => setForm(prev => prev ? { ...prev, openHour: preset.open, closeHour: preset.close } : prev)}
                                        className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium border border-[#EEEEEE] bg-white text-[#4A4A4A] cursor-pointer hover:bg-[#F5F5F3] transition-colors"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </AdminCard>
                )}

                {/* Save Button */}
                <button
                    type="submit"
                    className="mt-5 flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E8A317] text-white font-bold text-[0.85rem] border-none cursor-pointer hover:bg-[#D49516] transition-colors shadow-[0_2px_12px_rgba(232,163,23,0.25)] disabled:opacity-50"
                    disabled={saving}
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </form>
        </AdminLayout>
    );
}
