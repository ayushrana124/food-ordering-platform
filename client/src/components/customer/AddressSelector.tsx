import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Plus, X, Home, Briefcase, Navigation, Loader2, Check } from 'lucide-react';
import { userService, type AddAddressPayload } from '@/services/userService';
import type { IAddress } from '@/types';
import toast from 'react-hot-toast';

// Fix default marker icon for Leaflet (broken in bundlers)
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface Props {
    addresses: IAddress[];
    selectedId: string;
    onSelect: (id: string) => void;
    onAddressesUpdate: (addresses: IAddress[]) => void;
}

// ── Leaflet sub-components ───────────────────────────────────────────────────

function ClickMarker({
    position,
    onChange,
}: {
    position: [number, number] | null;
    onChange: (lat: number, lng: number) => void;
}) {
    useMapEvents({
        click(e) {
            onChange(e.latlng.lat, e.latlng.lng);
        },
    });
    return position ? <Marker position={position} /> : null;
}

function FlyTo({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, 15, { duration: 1 });
    }, [center, map]);
    return null;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AddressSelector({ addresses, selectedId, onSelect, onAddressesUpdate }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [locating, setLocating] = useState(false);

    const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
    const [addressLine, setAddressLine] = useState('');
    const [landmark, setLandmark] = useState('');
    const [pin, setPin] = useState<[number, number] | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.209]); // Delhi default

    const resetForm = () => {
        setLabel('Home');
        setAddressLine('');
        setLandmark('');
        setPin(null);
        setShowForm(false);
    };

    const handlePinChange = useCallback((lat: number, lng: number) => {
        setPin([lat, lng]);
    }, []);

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                setPin(coords);
                setMapCenter(coords);
                setLocating(false);
                toast.success('Location detected!');
            },
            () => {
                setLocating(false);
                toast.error('Could not detect your location. Please pin manually.');
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    };

    const handleSave = async () => {
        if (!addressLine.trim()) { toast.error('Please enter your address'); return; }
        if (!pin) { toast.error('Please pin your location on the map'); return; }

        setSaving(true);
        try {
            const payload: AddAddressPayload = {
                label,
                addressLine: addressLine.trim(),
                landmark: landmark.trim() || undefined,
                coordinates: { lat: pin[0], lng: pin[1] },
                isDefault: addresses.length === 0,
            };
            await userService.addAddress(payload);
            const user = await userService.getProfile();
            onAddressesUpdate(user.addresses);
            const newAddr = user.addresses[user.addresses.length - 1];
            if (newAddr) onSelect(newAddr._id);
            toast.success('Address saved!');
            resetForm();
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : 'Failed to save address';
            toast.error(msg ?? 'Failed to save address');
        } finally {
            setSaving(false);
        }
    };

    const labelIcons: Record<string, typeof Home> = { Home, Work: Briefcase, Other: MapPin };

    return (
        <div className="card p-7">
            <h3 className="font-outfit font-bold mb-5 flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#FFFBF0] flex items-center justify-center text-[#E8A317]">
                    <MapPin size={18} />
                </span>
                Delivery Address
            </h3>

            {/* Saved addresses */}
            {addresses.length > 0 && (
                <div className="flex flex-col gap-3 mb-4">
                    {addresses.map((addr) => {
                        const Icon = labelIcons[addr.label] ?? MapPin;
                        return (
                            <label
                                key={addr._id}
                                className="flex gap-4 px-5 py-4 rounded-xl cursor-pointer transition-all duration-200"
                                style={{
                                    border: `2px solid ${selectedId === addr._id ? '#E8A317' : '#E0E0DC'}`,
                                    background: selectedId === addr._id ? '#FFFBF0' : 'white',
                                }}
                            >
                                <input
                                    type="radio"
                                    name="addr"
                                    value={addr._id}
                                    checked={selectedId === addr._id}
                                    onChange={() => onSelect(addr._id)}
                                    className="accent-[#E8A317] mt-[2px]"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex gap-2 items-center mb-[0.2rem]">
                                        <Icon size={14} className="text-[#E8A317] shrink-0" />
                                        <span className="font-bold text-[0.875rem]">{addr.label}</span>
                                        {addr.isDefault && (
                                            <span className="bg-[#DCFCE7] text-[#16A34A] text-[0.7rem] font-semibold px-2 py-[0.15rem] rounded-md">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[0.875rem] text-[#4A4A4A] truncate">{addr.addressLine}</p>
                                    {addr.landmark && <p className="text-[0.8rem] text-[#8E8E8E]">Near {addr.landmark}</p>}
                                </div>
                            </label>
                        );
                    })}
                </div>
            )}

            {addresses.length === 0 && !showForm && (
                <p className="text-[#8E8E8E] text-[0.9rem] mb-4">
                    No saved addresses. Add one below to continue.
                </p>
            )}

            {/* Toggle button */}
            {!showForm && (
                <button
                    type="button"
                    className="flex items-center gap-2 text-[#E8A317] font-semibold text-[0.9rem] hover:text-[#CB8D10] transition-colors"
                    onClick={() => setShowForm(true)}
                >
                    <Plus size={16} /> Add New Address
                </button>
            )}

            {/* Add address form */}
            {showForm && (
                <div className="mt-4 rounded-xl border-2 border-[#E8A317]/30 bg-[#FFFBF0]/40 p-5 space-y-4 animate-in fade-in-0 slide-in-from-top-2">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <h4 className="font-outfit font-bold text-[0.95rem]">New Address</h4>
                        <button type="button" onClick={resetForm} className="text-[#8E8E8E] hover:text-[#4A4A4A]">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Label selector */}
                    <div>
                        <label className="text-[0.8rem] font-semibold text-[#4A4A4A] mb-2 block">Label</label>
                        <div className="flex gap-2">
                            {(['Home', 'Work', 'Other'] as const).map((l) => {
                                const Icon = labelIcons[l] ?? MapPin;
                                return (
                                    <button
                                        key={l}
                                        type="button"
                                        onClick={() => setLabel(l)}
                                        className="px-4 py-2 rounded-lg text-[0.85rem] font-semibold flex items-center gap-1.5 transition-all"
                                        style={{
                                            border: `2px solid ${label === l ? '#E8A317' : '#E0E0DC'}`,
                                            background: label === l ? '#FFFBF0' : 'white',
                                            color: label === l ? '#CB8D10' : '#4A4A4A',
                                        }}
                                    >
                                        <Icon size={14} /> {l}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Address input */}
                    <div>
                        <label className="text-[0.8rem] font-semibold text-[#4A4A4A] mb-2 block">Full Address *</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g. 42, Sector 15, near Metro Station"
                            value={addressLine}
                            onChange={(e) => setAddressLine(e.target.value)}
                        />
                    </div>

                    {/* Landmark */}
                    <div>
                        <label className="text-[0.8rem] font-semibold text-[#4A4A4A] mb-2 block">Landmark (optional)</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Near mall, temple, park..."
                            value={landmark}
                            onChange={(e) => setLandmark(e.target.value)}
                        />
                    </div>

                    {/* Map */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[0.8rem] font-semibold text-[#4A4A4A]">
                                Pin Location on Map *
                            </label>
                            <button
                                type="button"
                                onClick={handleLocateMe}
                                disabled={locating}
                                className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors disabled:opacity-50"
                            >
                                {locating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                                {locating ? 'Detecting...' : 'Use My Location'}
                            </button>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-[#E0E0DC]" style={{ height: 260 }}>
                            <MapContainer
                                center={mapCenter}
                                zoom={13}
                                style={{ height: '100%', width: '100%' }}
                                scrollWheelZoom
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                />
                                <ClickMarker position={pin} onChange={handlePinChange} />
                                {pin && <FlyTo center={pin} />}
                            </MapContainer>
                        </div>
                        {pin && (
                            <p className="text-[0.75rem] text-[#8E8E8E] mt-1.5 flex items-center gap-1">
                                <Check size={12} className="text-[#16A34A]" />
                                Location pinned: {pin[0].toFixed(5)}, {pin[1].toFixed(5)}
                            </p>
                        )}
                        {!pin && (
                            <p className="text-[0.75rem] text-[#8E8E8E] mt-1.5">
                                Click on the map to pin your delivery location
                            </p>
                        )}
                    </div>

                    {/* Save */}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !addressLine.trim() || !pin}
                        className="btn-primary w-full justify-center py-[0.7rem] text-[0.9rem] flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <>
                                <Check size={16} /> Save Address
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
