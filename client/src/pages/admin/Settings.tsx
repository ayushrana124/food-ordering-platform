import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Store, Clock, MapPin, Save } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { getRestaurantInfo, updateRestaurant } from '@/services/adminApi';
import type { IRestaurant } from '@/types';
import toast from 'react-hot-toast';

export default function Settings() {
    const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getRestaurantInfo()
            .then((d) => setRestaurant(d.restaurant))
            .catch(() => toast.error('Failed to load settings'))
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!restaurant) return;
        setSaving(true);
        try {
            const res = await updateRestaurant(restaurant);
            setRestaurant(res.restaurant);
            toast.success('Settings saved!');
        } catch { toast.error('Failed to save'); }
        finally { setSaving(false); }
    };

    const update = (key: keyof IRestaurant, value: unknown) => {
        setRestaurant((prev) => prev ? { ...prev, [key]: value } : prev);
    };

    if (loading || !restaurant) {
        return <AdminLayout><div className="flex justify-center py-20 text-[#8E8E8E]">Loading settings...</div></AdminLayout>;
    }

    return (
        <AdminLayout>
            <h1 className="font-outfit font-extrabold text-[1.5rem] text-[#0F0F0F] tracking-[-0.02em] flex items-center gap-3 mb-7">
                <span className="w-10 h-10 rounded-xl bg-[#F5F3FF] flex items-center justify-center text-[#7C3AED]">
                    <SettingsIcon size={20} />
                </span>
                Restaurant Settings
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-[720px]">
                {/* General */}
                <div className="bg-white rounded-2xl border border-[#EEEEEE] p-7" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <h3 className="font-outfit font-bold text-[1rem] mb-5 flex items-center gap-2.5">
                        <Store size={18} className="text-[#E8A317]" /> General
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-[0.3rem]">Restaurant Name</label>
                            <input className="input" value={restaurant.name} onChange={(e) => update('name', e.target.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-[0.3rem]">Phone</label>
                            <input className="input" type="tel" value={restaurant.phone} onChange={(e) => update('phone', e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block font-semibold text-[0.85rem] mb-[0.3rem]">Description</label>
                            <textarea className="input resize-y" rows={3} value={restaurant.description} onChange={(e) => update('description', e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block font-semibold text-[0.85rem] mb-[0.3rem]">Address</label>
                            <input className="input" value={restaurant.address} onChange={(e) => update('address', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Delivery */}
                <div className="bg-white rounded-2xl border border-[#EEEEEE] p-7" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <h3 className="font-outfit font-bold text-[1rem] mb-5 flex items-center gap-2.5">
                        <MapPin size={18} className="text-[#2563EB]" /> Delivery & Orders
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-[0.3rem]">Delivery Radius (km)</label>
                            <input className="input" type="number" min={1} value={restaurant.deliveryRadius} onChange={(e) => update('deliveryRadius', Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-[0.3rem]">Min Order (₹)</label>
                            <input className="input" type="number" min={0} value={restaurant.minOrderAmount} onChange={(e) => update('minOrderAmount', Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-[0.3rem]">Delivery Time (min)</label>
                            <input className="input" type="number" min={5} value={restaurant.deliveryTime} onChange={(e) => update('deliveryTime', Number(e.target.value))} />
                        </div>
                    </div>
                </div>

                {/* Hours & Status */}
                <div className="bg-white rounded-2xl border border-[#EEEEEE] p-7" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <h3 className="font-outfit font-bold text-[1rem] mb-5 flex items-center gap-2.5">
                        <Clock size={18} className="text-[#16A34A]" /> Hours & Status
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-[0.3rem]">Opens at</label>
                            <input className="input" type="time" value={restaurant.openingHours?.open || ''} onChange={(e) => update('openingHours', { ...restaurant.openingHours, open: e.target.value })} />
                        </div>
                        <div>
                            <label className="block font-semibold text-[0.85rem] mb-[0.3rem]">Closes at</label>
                            <input className="input" type="time" value={restaurant.openingHours?.close || ''} onChange={(e) => update('openingHours', { ...restaurant.openingHours, close: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-3 pb-1">
                            <button
                                type="button"
                                onClick={() => update('isOpen', !restaurant.isOpen)}
                                className="relative w-12 h-7 rounded-full cursor-pointer border-none transition-colors duration-300"
                                style={{ background: restaurant.isOpen ? '#16A34A' : '#D4D4D0' }}
                            >
                                <span
                                    className="absolute top-[3px] w-[21px] h-[21px] rounded-full bg-white transition-transform duration-300"
                                    style={{ left: restaurant.isOpen ? '25px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                                />
                            </button>
                            <span className="font-semibold text-[0.85rem]">{restaurant.isOpen ? 'Open' : 'Closed'}</span>
                        </div>
                    </div>
                </div>

                <button type="submit" className="btn-primary self-start flex items-center gap-2" disabled={saving}>
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </form>
        </AdminLayout>
    );
}
