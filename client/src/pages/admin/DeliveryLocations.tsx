import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Pencil, Trash2, X, Save, Loader2, Navigation, ToggleLeft, ToggleRight } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminCard from '@/components/admin/ui/AdminCard';
import AdminPageHeader from '@/components/admin/ui/AdminPageHeader';
import AdminBadge from '@/components/admin/ui/AdminBadge';
import AdminToggle from '@/components/admin/ui/AdminToggle';
import AdminEmptyState from '@/components/admin/ui/AdminEmptyState';
import AdminSkeleton from '@/components/admin/ui/AdminSkeleton';
import { useAdminContext } from '@/contexts/AdminContext';
import {
    getDeliveryLocations,
    createDeliveryLocation,
    updateDeliveryLocation,
    deleteDeliveryLocation,
} from '@/services/adminApi';
import type { IDeliveryLocation } from '@/types';
import toast from 'react-hot-toast';

interface LocationForm {
    name: string;
    lat: number;
    lng: number;
    isActive: boolean;
    displayOrder: number;
}

const emptyForm: LocationForm = { name: '', lat: 0, lng: 0, isActive: true, displayOrder: 0 };

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DeliveryLocations() {
    const { restaurant, fetchRestaurant } = useAdminContext();
    const [locations, setLocations] = useState<IDeliveryLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<LocationForm>(emptyForm);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getDeliveryLocations();
            setLocations(data.locations);
        } catch { toast.error('Failed to load locations'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); fetchRestaurant(); }, [load, fetchRestaurant]);

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...emptyForm, displayOrder: locations.length });
        setShowForm(true);
    };

    const openEdit = (loc: IDeliveryLocation) => {
        setEditingId(loc._id);
        setForm({ name: loc.name, lat: loc.lat, lng: loc.lng, isActive: loc.isActive, displayOrder: loc.displayOrder });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Name is required'); return; }
        if (!form.lat || !form.lng) { toast.error('Coordinates are required'); return; }
        setSaving(true);
        try {
            if (editingId) {
                await updateDeliveryLocation(editingId, form);
                setLocations(prev => prev.map(l => l._id === editingId ? { ...l, ...form } : l));
                toast.success('Location updated');
            } else {
                await createDeliveryLocation(form);
                toast.success('Location created');
                load();
            }
            setShowForm(false);
        } catch { toast.error('Failed to save'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this delivery location?')) return;
        try {
            await deleteDeliveryLocation(id);
            setLocations(prev => prev.filter(l => l._id !== id));
            toast.success('Location deleted');
        } catch { toast.error('Failed to delete'); }
    };

    const update = (key: keyof LocationForm, value: unknown) => setForm(f => ({ ...f, [key]: value }));

    const restCoords = restaurant?.coordinates;

    return (
        <AdminLayout>
            <AdminPageHeader
                title="Delivery Locations"
                subtitle={`${locations.length} locations configured`}
                icon={MapPin}
                actions={
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E8A317] text-white font-bold text-[0.85rem] border-none cursor-pointer hover:bg-[#D49516] transition-colors shadow-[0_2px_12px_rgba(232,163,23,0.25)]"
                    >
                        <Plus size={18} /> Add Location
                    </button>
                }
            />

            {/* Restaurant Info */}
            {restCoords && (
                <AdminCard className="mb-5 !bg-[#FAFAF8]">
                    <div className="flex items-center gap-3 text-[0.82rem]">
                        <Navigation size={16} className="text-[#2563EB]" />
                        <span className="text-[#4A4A4A]">
                            Restaurant at <strong>{restCoords.lat.toFixed(4)}, {restCoords.lng.toFixed(4)}</strong>
                        </span>
                        <span className="text-[#8E8E8E]">·</span>
                        <span className="text-[#8E8E8E]">Delivery radius: <strong className="text-[#0F0F0F]">{restaurant?.deliveryRadius} km</strong></span>
                    </div>
                </AdminCard>
            )}

            {/* Locations Grid */}
            {loading ? (
                <AdminSkeleton count={6} type="card" />
            ) : locations.length === 0 ? (
                <AdminEmptyState
                    icon={MapPin}
                    title="No delivery locations"
                    description="Add locations where delivery is available. These appear in the checkout address selector."
                    action={{ label: 'Add Location', onClick: openCreate }}
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {locations.map((loc) => {
                        const dist = restCoords ? haversineDistance(restCoords.lat, restCoords.lng, loc.lat, loc.lng) : null;
                        const withinRadius = dist !== null && restaurant ? dist <= restaurant.deliveryRadius : true;

                        return (
                            <AdminCard key={loc._id} hover className="group">
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${loc.isActive ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F5F5F3] text-[#C4C4C0]'}`}>
                                        <MapPin size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-outfit font-bold text-[0.95rem] text-[#0F0F0F] truncate">{loc.name}</h3>
                                            <AdminBadge label={loc.isActive ? 'Active' : 'Inactive'} size="sm" />
                                        </div>
                                        <p className="text-[0.75rem] text-[#8E8E8E] font-mono">
                                            {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            {dist !== null && (
                                                <span className={`text-[0.72rem] font-medium ${withinRadius ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                                                    {dist.toFixed(1)} km from restaurant
                                                </span>
                                            )}
                                            <span className="text-[0.7rem] text-[#C4C4C0]">Order: {loc.displayOrder}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F0F0EE]">
                                    <AdminToggle
                                        checked={loc.isActive}
                                        onChange={async () => {
                                            try {
                                                await updateDeliveryLocation(loc._id, { isActive: !loc.isActive });
                                                setLocations(prev => prev.map(l => l._id === loc._id ? { ...l, isActive: !l.isActive } : l));
                                            } catch { toast.error('Failed to update'); }
                                        }}
                                        size="sm"
                                    />
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => openEdit(loc)}
                                            className="w-8 h-8 rounded-lg border border-[#EEEEEE] bg-white flex items-center justify-center cursor-pointer text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(loc._id)}
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

            {/* Add/Edit Modal */}
            {showForm && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
                >
                    <div
                        className="bg-white rounded-[20px] w-full max-w-[480px] flex flex-col max-h-[90vh]"
                        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'fadeInScale 0.2s ease-out' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EEEEEE] shrink-0">
                            <h3 className="font-outfit font-bold text-[1.1rem] text-[#0F0F0F]">
                                {editingId ? 'Edit' : 'Add'} Location
                            </h3>
                            <button
                                onClick={() => setShowForm(false)}
                                className="w-8 h-8 rounded-xl border border-[#EEEEEE] flex items-center justify-center bg-white cursor-pointer text-[#4A4A4A] hover:bg-[#F5F5F3] transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                            <div>
                                <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Location Name *</label>
                                <input
                                    className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                    value={form.name}
                                    onChange={e => update('name', e.target.value)}
                                    placeholder="e.g. Sector 21, Noida"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Latitude *</label>
                                    <input
                                        className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                        type="number"
                                        step="any"
                                        value={form.lat || ''}
                                        onChange={e => update('lat', Number(e.target.value))}
                                        placeholder="28.1234"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-[0.8rem] text-[#4A4A4A] mb-1.5">Longitude *</label>
                                    <input
                                        className="w-full h-10 px-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.85rem] outline-none focus:border-[#E8A317] transition-colors"
                                        type="number"
                                        step="any"
                                        value={form.lng || ''}
                                        onChange={e => update('lng', Number(e.target.value))}
                                        placeholder="77.1234"
                                    />
                                </div>
                            </div>

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

                            <div className="flex items-center gap-3">
                                <AdminToggle checked={form.isActive} onChange={() => update('isActive', !form.isActive)} />
                                <span className="text-[0.85rem] font-medium text-[#4A4A4A]">
                                    {form.isActive ? 'Active — visible to customers' : 'Inactive — hidden from customers'}
                                </span>
                            </div>

                            {/* Distance preview */}
                            {restCoords && form.lat && form.lng && (
                                <div className="bg-[#FAFAF8] rounded-xl p-3">
                                    {(() => {
                                        const d = haversineDistance(restCoords.lat, restCoords.lng, form.lat, form.lng);
                                        const within = restaurant ? d <= restaurant.deliveryRadius : true;
                                        return (
                                            <p className={`text-[0.82rem] font-medium ${within ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                                                {d.toFixed(1)} km from restaurant
                                                {!within && ` (outside ${restaurant?.deliveryRadius} km radius)`}
                                            </p>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#EEEEEE] shrink-0">
                            <button
                                onClick={() => setShowForm(false)}
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
