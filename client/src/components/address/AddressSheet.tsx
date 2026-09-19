import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Plus, Home, Briefcase, Navigation, Loader2, Check, Trash2, AlertTriangle } from 'lucide-react';
import { userService } from '@/services/userService';
import type { IAddress, IRestaurant } from '@/types';
import Sheet from '@/components/ui/Sheet';
import { Tag } from '@/components/ui/Bits';
import { useT } from '@/i18n';
import { distanceKm } from '@/utils/delivery';
import toast from 'react-hot-toast';

// Leaflet ships its marker images via CSS-relative URLs that bundlers break.
const markerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = markerIcon;

type Mode = 'list' | 'form';
type LabelOption = IAddress['label'];

interface AddressSheetProps {
    open: boolean;
    onClose: () => void;
    addresses: IAddress[];
    selectedId?: string;
    restaurant: IRestaurant | null;
    onSelect: (address: IAddress) => void;
    onChanged: (addresses: IAddress[]) => void;
}

/**
 * Address picking and creation, in one sheet.
 *
 * The radius check runs here, live, as the pin moves — so an out-of-range
 * customer finds out while they are placing the pin rather than at the moment
 * they try to pay. The server re-checks on order creation and remains the
 * authority; this is purely so the rejection is not a surprise.
 */
export default function AddressSheet({
    open, onClose, addresses, selectedId, restaurant, onSelect, onChanged,
}: AddressSheetProps) {
    const t = useT();
    const [mode, setMode] = useState<Mode>('list');

    useEffect(() => { if (open) setMode(addresses.length === 0 ? 'form' : 'list'); }, [open, addresses.length]);

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title={mode === 'form' ? t('address.new') : t('address.title')}
        >
            {mode === 'list' ? (
                <AddressList
                    addresses={addresses}
                    selectedId={selectedId}
                    restaurant={restaurant}
                    onSelect={(a) => { onSelect(a); onClose(); }}
                    onAddNew={() => setMode('form')}
                    onChanged={onChanged}
                />
            ) : (
                <AddressForm
                    restaurant={restaurant}
                    onCancel={() => (addresses.length > 0 ? setMode('list') : onClose())}
                    onSaved={(address, all) => {
                        onChanged(all);
                        onSelect(address);
                        onClose();
                    }}
                />
            )}
        </Sheet>
    );
}

// ── Saved addresses ──────────────────────────────────────────────────────────

function AddressList({ addresses, selectedId, restaurant, onSelect, onAddNew, onChanged }: {
    addresses: IAddress[];
    selectedId?: string;
    restaurant: IRestaurant | null;
    onSelect: (a: IAddress) => void;
    onAddNew: () => void;
    onChanged: (all: IAddress[]) => void;
}) {
    const t = useT();
    const [busy, setBusy] = useState<string | null>(null);

    const shopCoords = restaurant?.address?.coordinates;

    const remove = async (address: IAddress) => {
        if (!window.confirm(t('address.deleteConfirm'))) return;
        setBusy(address._id);
        try {
            await userService.deleteAddress(address._id);
            const profile = await userService.getProfile();
            onChanged(profile.addresses);
            toast.success(t('address.deleted'));
        } catch {
            toast.error(t('common.somethingWrong'));
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="c-wrap" style={{ paddingBottom: 20 }}>
            {addresses.map((address) => {
                const coords = address.coordinates;
                const km = coords && shopCoords
                    ? distanceKm(shopCoords.lat, shopCoords.lng, coords.lat, coords.lng)
                    : null;
                const outOfRange = km !== null && restaurant ? km > restaurant.deliveryRadius : false;

                return (
                    <div
                        key={address._id}
                        style={{
                            display: 'flex', gap: 12, alignItems: 'flex-start',
                            paddingBlock: 14, borderBottom: '1px solid var(--c-line)',
                            opacity: outOfRange ? .6 : 1,
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => !outOfRange && onSelect(address)}
                            disabled={outOfRange}
                            style={{
                                flex: 1, minWidth: 0, textAlign: 'left', border: 0, background: 'none',
                                cursor: outOfRange ? 'not-allowed' : 'pointer', padding: 0,
                                display: 'flex', gap: 12,
                            }}
                        >
                            <span
                                style={{
                                    width: 20, height: 20, marginTop: 2, flex: 'none', borderRadius: 999,
                                    display: 'grid', placeItems: 'center',
                                    background: selectedId === address._id ? 'var(--c-brand)' : 'transparent',
                                    boxShadow: selectedId === address._id ? 'none' : 'inset 0 0 0 1.5px var(--c-line-strong)',
                                    color: 'var(--c-ink)',
                                }}
                            >
                                {selectedId === address._id && <Check size={12} strokeWidth={3.5} />}
                            </span>

                            <span style={{ minWidth: 0 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <span style={{ font: '800 .88rem/1.2 "DM Sans", sans-serif', color: 'var(--c-ink)' }}>
                                        {address.label}
                                    </span>
                                    {address.isDefault && <Tag>{t('address.default')}</Tag>}
                                    {km !== null && !outOfRange && <Tag tone="brand">{km} km</Tag>}
                                    {outOfRange && <Tag tone="danger">{km} km</Tag>}
                                </span>
                                <span style={{ display: 'block', marginTop: 3, font: '400 .82rem/1.45 "DM Sans", sans-serif', color: 'var(--c-ink-2)' }}>
                                    {address.addressLine}
                                    {address.landmark ? ` · ${address.landmark}` : ''}
                                </span>
                                {!address.coordinates && (
                                    <span style={{ display: 'block', marginTop: 4, font: '600 .74rem/1.3 "DM Sans", sans-serif', color: 'var(--c-danger)' }}>
                                        {t('address.locationNeeded')}
                                    </span>
                                )}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => remove(address)}
                            disabled={busy === address._id}
                            aria-label={t('address.deleteConfirm')}
                            style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--c-ink-3)', padding: 4, flex: 'none' }}
                        >
                            {busy === address._id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                    </div>
                );
            })}

            <button
                type="button"
                className="c-btn c-btn--line c-btn--block"
                style={{ marginTop: 16 }}
                onClick={onAddNew}
            >
                <Plus size={16} />
                {t('checkout.addAddress')}
            </button>
        </div>
    );
}

// ── New address ──────────────────────────────────────────────────────────────

function AddressForm({ restaurant, onCancel, onSaved }: {
    restaurant: IRestaurant | null;
    onCancel: () => void;
    onSaved: (address: IAddress, all: IAddress[]) => void;
}) {
    const t = useT();
    const shop = restaurant?.address?.coordinates;

    const [label, setLabel] = useState<LabelOption>('Home');
    const [line, setLine] = useState('');
    const [landmark, setLandmark] = useState('');
    const [pin, setPin] = useState<[number, number] | null>(shop ? [shop.lat, shop.lng] : null);
    const [locating, setLocating] = useState(false);
    const [saving, setSaving] = useState(false);

    const km = useMemo(() => {
        if (!pin || !shop) return null;
        return distanceKm(shop.lat, shop.lng, pin[0], pin[1]);
    }, [pin, shop]);

    const radius = restaurant?.deliveryRadius ?? 10;
    const outOfRange = km !== null && km > radius;

    const locate = useCallback(() => {
        if (!navigator.geolocation) {
            toast.error(t('common.somethingWrong'));
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setPin([position.coords.latitude, position.coords.longitude]);
                setLocating(false);
            },
            () => {
                setLocating(false);
                toast.error(t('address.locationNeeded'));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }, [t]);

    const save = async () => {
        if (!line.trim()) { toast.error(t('address.line')); return; }
        if (!pin) { toast.error(t('address.locationNeeded')); return; }
        if (outOfRange) {
            toast.error(t('address.outOfRange', { km: radius, dist: km ?? 0 }));
            return;
        }

        setSaving(true);
        try {
            await userService.addAddress({
                label,
                addressLine: line.trim(),
                landmark: landmark.trim() || undefined,
                coordinates: { lat: pin[0], lng: pin[1] },
            });
            // Re-read the profile so the saved address carries its server _id,
            // which is what the order endpoint resolves against.
            const profile = await userService.getProfile();
            const saved = profile.addresses[profile.addresses.length - 1];
            toast.success(t('address.saved'));
            onSaved(saved, profile.addresses);
        } catch {
            toast.error(t('common.somethingWrong'));
        } finally {
            setSaving(false);
        }
    };

    const LABELS: { value: LabelOption; icon: typeof Home }[] = [
        { value: 'Home', icon: Home },
        { value: 'Work', icon: Briefcase },
        { value: 'Other', icon: MapPin },
    ];

    return (
        <div style={{ paddingBottom: 20 }}>
            {/* Map */}
            <div style={{ position: 'relative', height: 220, margin: '0 16px', borderRadius: 'var(--c-r-lg)', overflow: 'hidden' }}>
                {pin ? (
                    <MapContainer
                        center={pin}
                        zoom={16}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={false}
                    >
                        <TileLayer
                            attribution='&copy; OpenStreetMap'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <PinDropper position={pin} onChange={(lat, lng) => setPin([lat, lng])} />
                        <Recenter position={pin} />
                    </MapContainer>
                ) : (
                    <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: 'var(--c-surface-2)', color: 'var(--c-ink-3)' }}>
                        <MapPin size={26} />
                    </div>
                )}

                <button
                    type="button"
                    onClick={locate}
                    disabled={locating}
                    style={{
                        position: 'absolute', right: 10, bottom: 10, zIndex: 500,
                        display: 'flex', alignItems: 'center', gap: 6,
                        height: 36, paddingInline: 12, borderRadius: 999, border: 0, cursor: 'pointer',
                        background: 'var(--c-surface)', color: 'var(--c-ink)', boxShadow: 'var(--c-sh-2)',
                        font: '700 .76rem/1 "DM Sans", sans-serif',
                    }}
                >
                    {locating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                    {locating ? t('address.locating') : t('address.useCurrent')}
                </button>
            </div>

            <p className="c-wrap" style={{ marginTop: 8, font: '500 .76rem/1.4 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>
                {t('address.locationNeeded')}
            </p>

            {/* Live radius feedback */}
            {km !== null && (
                <div className="c-wrap" style={{ marginTop: 10 }}>
                    <div
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                            borderRadius: 'var(--c-r-md)',
                            background: outOfRange ? 'var(--c-danger-wash)' : 'var(--c-ok-wash)',
                            color: outOfRange ? 'var(--c-danger)' : 'var(--c-ok)',
                            font: '600 .78rem/1.4 "DM Sans", sans-serif',
                        }}
                    >
                        {outOfRange ? <AlertTriangle size={15} style={{ flex: 'none' }} /> : <Check size={15} style={{ flex: 'none' }} />}
                        {outOfRange
                            ? t('address.outOfRange', { km: radius, dist: km })
                            : `${km} km`}
                    </div>
                </div>
            )}

            {/* Fields */}
            <div className="c-wrap" style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                <div>
                    <label style={{ display: 'block', marginBottom: 6, font: '700 .78rem/1 "DM Sans", sans-serif', color: 'var(--c-ink-2)' }}>
                        {t('address.label')}
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {LABELS.map(({ value, icon: Icon }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setLabel(value)}
                                style={{
                                    flex: 1, minHeight: 42, borderRadius: 'var(--c-r-md)', border: 0, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    background: label === value ? 'var(--c-brand-wash)' : 'var(--c-surface)',
                                    boxShadow: `inset 0 0 0 1.5px ${label === value ? 'var(--c-brand)' : 'var(--c-line)'}`,
                                    color: label === value ? 'var(--c-brand-deep)' : 'var(--c-ink-2)',
                                    font: '700 .8rem/1 "DM Sans", sans-serif',
                                }}
                            >
                                <Icon size={14} />
                                {value === 'Home' ? t('address.home') : value === 'Work' ? t('address.work') : t('address.other')}
                            </button>
                        ))}
                    </div>
                </div>

                <input
                    className="c-field"
                    placeholder={t('address.line')}
                    value={line}
                    onChange={(e) => setLine(e.target.value)}
                    maxLength={200}
                />
                <input
                    className="c-field"
                    placeholder={`${t('address.landmark')} (${t('common.optional')})`}
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    maxLength={120}
                />

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button type="button" className="c-btn c-btn--ghost" style={{ flex: 1 }} onClick={onCancel}>
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        className="c-btn c-btn--primary"
                        style={{ flex: 2 }}
                        onClick={save}
                        disabled={saving || outOfRange || !line.trim() || !pin}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : t('common.save')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function PinDropper({ position, onChange }: { position: [number, number]; onChange: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) { onChange(e.latlng.lat, e.latlng.lng); },
    });
    return (
        <Marker
            position={position}
            draggable
            eventHandlers={{
                dragend(e) {
                    const { lat, lng } = (e.target as L.Marker).getLatLng();
                    onChange(lat, lng);
                },
            }}
        />
    );
}

/** Keeps the viewport with the pin when it jumps to the device's location. */
function Recenter({ position }: { position: [number, number] }) {
    const map = useMap();
    useEffect(() => { map.setView(position, map.getZoom()); }, [position, map]);
    return null;
}
