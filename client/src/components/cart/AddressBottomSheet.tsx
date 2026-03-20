import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    X, MapPin, Navigation, Loader2, Home, Briefcase,
    ChevronRight, Plus, Check, AlertTriangle, Phone, User,
} from 'lucide-react';
import { userService, type AddAddressPayload } from '@/services/userService';
import { useAppDispatch } from '@/redux/hooks';
import { updateUser } from '@/redux/slices/authSlice';
import type { IAddress } from '@/types';
import toast from 'react-hot-toast';

// Restaurant coordinates (source of truth for 10km check)
const RESTAURANT = { lat: 28.6139, lng: 77.209 };
const MAX_DELIVERY_KM = 10;

// Predefined manual locations (will come from backend in future)
const PREDEFINED_LOCATIONS = [
    { name: 'Noorpur', lat: 28.6139, lng: 77.209 },
    { name: 'Tajpur', lat: 29.2099, lng: 78.2999 },
    { name: 'Dolhagarh', lat: 29.2231, lng: 78.2758 },
    { name: 'Dhampur Choraha', lat: 29.3082, lng: 78.5110 },
];

/** Haversine distance in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type Step = 'list' | 'method' | 'manual' | 'form' | 'outOfRange';

interface Props {
    addresses: IAddress[];
    selectedId: string;
    onSelect: (id: string) => void;
    onAddressesUpdate: (addresses: IAddress[]) => void;
    onClose: () => void;
}

export default function AddressBottomSheet({ addresses, selectedId, onSelect, onAddressesUpdate, onClose }: Props) {
    const dispatch = useAppDispatch();
    const [step, setStep] = useState<Step>(addresses.length > 0 ? 'list' : 'method');
    const [locating, setLocating] = useState(false);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [locationName, setLocationName] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
    const [addressLine, setAddressLine] = useState('');
    const [landmark, setLandmark] = useState('');
    const [saving, setSaving] = useState(false);

    // Validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (step === 'form') {
            setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 200);
        }
    }, [step]);

    // Prevent body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation not supported');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const dist = haversineKm(latitude, longitude, RESTAURANT.lat, RESTAURANT.lng);
                setLocating(false);
                if (dist > MAX_DELIVERY_KM) {
                    setStep('outOfRange');
                } else {
                    setCoords({ lat: latitude, lng: longitude });
                    setLocationName('Current Location');
                    setStep('form');
                    toast.success('Location detected!');
                }
            },
            () => {
                setLocating(false);
                toast.error('Could not detect location. Try selecting manually.');
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    };

    const handleSelectManualLocation = (loc: typeof PREDEFINED_LOCATIONS[0]) => {
        const dist = haversineKm(loc.lat, loc.lng, RESTAURANT.lat, RESTAURANT.lng);
        if (dist > MAX_DELIVERY_KM) {
            setStep('outOfRange');
        } else {
            setCoords({ lat: loc.lat, lng: loc.lng });
            setLocationName(loc.name);
            setStep('form');
        }
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = 'Name is required';
        else if (name.trim().length < 2) errs.name = 'Name too short';
        if (!phone.trim()) errs.phone = 'Phone number is required';
        else if (!/^[6-9]\d{9}$/.test(phone.trim())) errs.phone = 'Enter valid 10-digit number';
        if (!addressLine.trim()) errs.addressLine = 'Address is required';
        else if (addressLine.trim().length < 5) errs.addressLine = 'Address too short';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validate() || !coords) return;

        setSaving(true);
        try {
            const payload: AddAddressPayload = {
                label,
                addressLine: `${addressLine.trim()}${locationName && locationName !== 'Current Location' ? `, ${locationName}` : ''}`,
                landmark: landmark.trim() || undefined,
                coordinates: coords,
                isDefault: addresses.length === 0,
            };
            await userService.addAddress(payload);
            const updatedUser = await userService.getProfile();
            dispatch(updateUser(updatedUser));
            onAddressesUpdate(updatedUser.addresses);
            const newAddr = updatedUser.addresses[updatedUser.addresses.length - 1];
            if (newAddr) onSelect(newAddr._id);
            toast.success('Address saved!');
            onClose();
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : 'Failed to save address';
            toast.error(msg ?? 'Failed to save address');
        } finally {
            setSaving(false);
        }
    };

    const handleSelectExisting = (id: string) => {
        onSelect(id);
        onClose();
    };

    const labelIcons: Record<string, typeof Home> = { Home, Work: Briefcase, Other: MapPin };

    // Inline input style helper
    const inputStyle = (hasError: boolean): React.CSSProperties => ({
        width: '100%', border: `1.5px solid ${hasError ? '#DC2626' : '#E0E0DC'}`, borderRadius: 10,
        padding: '0.6rem 0.9rem', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif',
        outline: 'none', color: '#0F0F0F', boxSizing: 'border-box',
        transition: 'border-color 0.15s',
    });

    const errorText = (msg?: string) =>
        msg ? <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 3, fontWeight: 500 }}>{msg}</p> : null;

    const sheet = (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                background: 'rgba(15,15,15,0.5)',
                backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                animation: 'fadeIn 0.2s ease',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 480, maxHeight: '92vh',
                    background: 'white', borderRadius: '24px 24px 0 0',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
                    animation: 'slideUp 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)',
                }}
            >
                {/* Drag handle */}
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-[#E0E0DC]" />
                </div>

                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1rem 1.5rem 0.5rem', flexShrink: 0,
                }}>
                    <div>
                        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#0F0F0F' }}>
                            {step === 'list' && 'Select Delivery Address'}
                            {step === 'method' && 'Add Delivery Address'}
                            {step === 'manual' && 'Select Your Area'}
                            {step === 'form' && 'Complete Address'}
                            {step === 'outOfRange' && 'Out of Delivery Range'}
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: '#8E8E8E', marginTop: 2 }}>
                            {step === 'list' && 'Choose or add a new address'}
                            {step === 'method' && 'How would you like to set your location?'}
                            {step === 'manual' && 'Select your area to continue'}
                            {step === 'form' && (locationName ? `Delivering to ${locationName}` : 'Fill in your details')}
                            {step === 'outOfRange' && 'Your location is too far'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 32, height: 32, borderRadius: 8, border: '1px solid #EEEEEE',
                            background: 'white', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: '#4A4A4A', flexShrink: 0,
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.5rem 1.5rem' }}>

                    {/* ─── STEP: LIST ─────────────────────────────────── */}
                    {step === 'list' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {addresses.map((addr) => {
                                const Icon = labelIcons[addr.label] ?? MapPin;
                                const active = selectedId === addr._id;
                                return (
                                    <button
                                        key={addr._id}
                                        onClick={() => handleSelectExisting(addr._id)}
                                        style={{
                                            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                                            padding: '0.85rem 1rem', borderRadius: 14, textAlign: 'left',
                                            border: `2px solid ${active ? '#E8A317' : '#EEEEEE'}`,
                                            background: active ? '#FFFBF0' : 'white',
                                            cursor: 'pointer', width: '100%',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <span style={{
                                            width: 32, height: 32, borderRadius: 10,
                                            background: active ? '#E8A317' : '#F7F7F5',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: active ? 'white' : '#8E8E8E', flexShrink: 0,
                                        }}>
                                            <Icon size={15} />
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F0F0F' }}>
                                                {addr.label}
                                                {addr.isDefault && (
                                                    <span style={{
                                                        marginLeft: 6, fontSize: '0.6rem', background: '#DCFCE7',
                                                        color: '#16A34A', fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                                                    }}>DEFAULT</span>
                                                )}
                                            </p>
                                            <p style={{ fontSize: '0.78rem', color: '#4A4A4A', lineHeight: 1.4, marginTop: 2 }}>
                                                {addr.addressLine}
                                            </p>
                                            {addr.landmark && (
                                                <p style={{ fontSize: '0.72rem', color: '#8E8E8E', marginTop: 1 }}>
                                                    Near {addr.landmark}
                                                </p>
                                            )}
                                        </div>
                                        {active && (
                                            <span style={{ color: '#E8A317', flexShrink: 0, marginTop: 6 }}>
                                                <Check size={18} strokeWidth={3} />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}

                            {/* Add new button */}
                            <button
                                onClick={() => setStep('method')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.8rem 1rem', borderRadius: 14,
                                    border: '2px dashed #D4D4D0', background: '#FAFAF8',
                                    cursor: 'pointer', width: '100%', color: '#E8A317',
                                }}
                            >
                                <Plus size={16} />
                                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Add New Address</span>
                            </button>
                        </div>
                    )}

                    {/* ─── STEP: METHOD ───────────────────────────────── */}
                    {step === 'method' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
                            {/* Use current location */}
                            <button
                                onClick={handleUseCurrentLocation}
                                disabled={locating}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.85rem',
                                    padding: '1rem 1.1rem', borderRadius: 16,
                                    border: '2px solid #EEEEEE', background: 'white',
                                    cursor: locating ? 'wait' : 'pointer', width: '100%',
                                    textAlign: 'left', transition: 'all 0.15s',
                                }}
                            >
                                <span style={{
                                    width: 44, height: 44, borderRadius: 14,
                                    background: '#EFF6FF', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    color: '#2563EB', flexShrink: 0,
                                }}>
                                    {locating ? <Loader2 size={20} className="animate-spin" /> : <Navigation size={20} />}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F0F0F' }}>
                                        {locating ? 'Detecting location...' : 'Use Current Location'}
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: '#8E8E8E', marginTop: 2 }}>
                                        Allow location access to auto-detect
                                    </p>
                                </div>
                                <ChevronRight size={18} style={{ color: '#D4D4D0', flexShrink: 0 }} />
                            </button>

                            {/* Select manually */}
                            <button
                                onClick={() => setStep('manual')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.85rem',
                                    padding: '1rem 1.1rem', borderRadius: 16,
                                    border: '2px solid #EEEEEE', background: 'white',
                                    cursor: 'pointer', width: '100%',
                                    textAlign: 'left', transition: 'all 0.15s',
                                }}
                            >
                                <span style={{
                                    width: 44, height: 44, borderRadius: 14,
                                    background: '#FFFBF0', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    color: '#E8A317', flexShrink: 0,
                                }}>
                                    <MapPin size={20} />
                                </span>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F0F0F' }}>Select Manually</p>
                                    <p style={{ fontSize: '0.75rem', color: '#8E8E8E', marginTop: 2 }}>
                                        Choose from predefined areas
                                    </p>
                                </div>
                                <ChevronRight size={18} style={{ color: '#D4D4D0', flexShrink: 0 }} />
                            </button>

                            {addresses.length > 0 && (
                                <button
                                    onClick={() => setStep('list')}
                                    style={{
                                        fontSize: '0.8rem', color: '#2563EB', fontWeight: 600,
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        padding: '0.5rem 0', textAlign: 'center',
                                    }}
                                >
                                    ← Back to saved addresses
                                </button>
                            )}
                        </div>
                    )}

                    {/* ─── STEP: MANUAL ───────────────────────────────── */}
                    {step === 'manual' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <p style={{ fontSize: '0.78rem', color: '#8E8E8E', marginBottom: '0.25rem' }}>
                                Select your area to check delivery availability
                            </p>
                            {PREDEFINED_LOCATIONS.map((loc) => {
                                const dist = haversineKm(loc.lat, loc.lng, RESTAURANT.lat, RESTAURANT.lng);
                                const deliverable = dist <= MAX_DELIVERY_KM;
                                return (
                                    <button
                                        key={loc.name}
                                        onClick={() => handleSelectManualLocation(loc)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            padding: '0.85rem 1rem', borderRadius: 14,
                                            border: '1.5px solid #EEEEEE', background: 'white',
                                            cursor: 'pointer', width: '100%', textAlign: 'left',
                                            opacity: deliverable ? 1 : 0.5,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <span style={{
                                            width: 36, height: 36, borderRadius: 10,
                                            background: deliverable ? '#F0FDF4' : '#FEF2F2',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: deliverable ? '#16A34A' : '#DC2626', flexShrink: 0,
                                        }}>
                                            <MapPin size={16} />
                                        </span>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F0F0F' }}>
                                                {loc.name}
                                            </p>
                                            <p style={{ fontSize: '0.7rem', color: deliverable ? '#16A34A' : '#DC2626', fontWeight: 500, marginTop: 1 }}>
                                                {deliverable ? `${Math.round(dist)} km away — Delivery available` : `${Math.round(dist)} km — Out of range`}
                                            </p>
                                        </div>
                                        <ChevronRight size={16} style={{ color: '#D4D4D0', flexShrink: 0 }} />
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => setStep('method')}
                                style={{
                                    fontSize: '0.8rem', color: '#8E8E8E', fontWeight: 600,
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    padding: '0.5rem 0', textAlign: 'center', marginTop: '0.25rem',
                                }}
                            >
                                ← Back
                            </button>
                        </div>
                    )}

                    {/* ─── STEP: OUT OF RANGE ────────────────────────── */}
                    {step === 'outOfRange' && (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            textAlign: 'center', padding: '1.5rem 0.5rem',
                        }}>
                            <span style={{
                                width: 60, height: 60, borderRadius: 20, background: '#FEF2F2',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#DC2626', marginBottom: '1rem',
                            }}>
                                <AlertTriangle size={28} />
                            </span>
                            <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#0F0F0F', marginBottom: 6 }}>
                                Delivery Only Within {MAX_DELIVERY_KM} km
                            </h4>
                            <p style={{ fontSize: '0.82rem', color: '#4A4A4A', lineHeight: 1.5, maxWidth: 300 }}>
                                Sorry, your selected location is beyond our delivery range. Please choose a location within {MAX_DELIVERY_KM} km of our restaurant.
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', width: '100%' }}>
                                <button
                                    onClick={() => setStep('manual')}
                                    style={{
                                        flex: 1, padding: '0.65rem', borderRadius: 12,
                                        border: '1.5px solid #E0E0DC', background: 'white',
                                        color: '#4A4A4A', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                    }}
                                >
                                    Try Another Area
                                </button>
                                <button
                                    onClick={() => setStep('method')}
                                    style={{
                                        flex: 1, padding: '0.65rem', borderRadius: 12,
                                        border: '1.5px solid #E8A317', background: '#FFFBF0',
                                        color: '#E8A317', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                    }}
                                >
                                    Use GPS Instead
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─── STEP: FORM ─────────────────────────────────── */}
                    {step === 'form' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '0.25rem' }}>

                            {/* Location badge */}
                            {locationName && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.5rem 0.75rem', borderRadius: 10,
                                    background: '#F0FDF4', border: '1px solid #BBF7D0',
                                }}>
                                    <MapPin size={13} style={{ color: '#16A34A' }} />
                                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#16A34A' }}>
                                        {locationName}
                                    </span>
                                    <Check size={12} style={{ color: '#16A34A', marginLeft: 'auto' }} />
                                </div>
                            )}

                            {/* Name */}
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 600, color: '#4A4A4A', marginBottom: 6 }}>
                                    <User size={12} /> Full Name *
                                </label>
                                <input
                                    ref={nameRef}
                                    type="text"
                                    value={name}
                                    onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                                    placeholder="John Doe"
                                    maxLength={50}
                                    style={inputStyle(!!errors.name)}
                                />
                                {errorText(errors.name)}
                            </div>

                            {/* Phone */}
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 600, color: '#4A4A4A', marginBottom: 6 }}>
                                    <Phone size={12} /> Phone Number *
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => {
                                        const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setPhone(v);
                                        setErrors((p) => ({ ...p, phone: '' }));
                                    }}
                                    placeholder="9876543210"
                                    style={inputStyle(!!errors.phone)}
                                />
                                {errorText(errors.phone)}
                            </div>

                            {/* Label selector */}
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#4A4A4A', marginBottom: 6, display: 'block' }}>
                                    Save As
                                </label>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    {(['Home', 'Work', 'Other'] as const).map((l) => {
                                        const Icon = labelIcons[l] ?? MapPin;
                                        const active = label === l;
                                        return (
                                            <button
                                                key={l}
                                                type="button"
                                                onClick={() => setLabel(l)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 5,
                                                    padding: '0.4rem 0.75rem', borderRadius: 8,
                                                    border: `1.5px solid ${active ? '#E8A317' : '#E0E0DC'}`,
                                                    background: active ? '#FFFBF0' : 'white',
                                                    color: active ? '#CB8D10' : '#4A4A4A',
                                                    fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                                                }}
                                            >
                                                <Icon size={13} /> {l}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Full Address */}
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#4A4A4A', marginBottom: 6, display: 'block' }}>
                                    Full Address *
                                </label>
                                <input
                                    type="text"
                                    value={addressLine}
                                    onChange={(e) => { setAddressLine(e.target.value); setErrors((p) => ({ ...p, addressLine: '' })); }}
                                    placeholder="House no., street, colony..."
                                    maxLength={200}
                                    style={inputStyle(!!errors.addressLine)}
                                />
                                {errorText(errors.addressLine)}
                            </div>

                            {/* Landmark */}
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#4A4A4A', marginBottom: 6, display: 'block' }}>
                                    Landmark (optional)
                                </label>
                                <input
                                    type="text"
                                    value={landmark}
                                    onChange={(e) => setLandmark(e.target.value)}
                                    placeholder="Near temple, school, park..."
                                    maxLength={100}
                                    style={inputStyle(false)}
                                />
                            </div>

                            {/* Save button */}
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: 14,
                                    border: 'none', background: '#E8A317', color: 'white',
                                    fontWeight: 800, fontSize: '0.9rem', cursor: saving ? 'wait' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    marginTop: '0.25rem',
                                }}
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                {saving ? 'Saving...' : 'Save Address'}
                            </button>

                            <button
                                onClick={() => setStep('method')}
                                style={{
                                    fontSize: '0.78rem', color: '#8E8E8E', fontWeight: 600,
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    padding: '0.25rem 0', textAlign: 'center',
                                }}
                            >
                                ← Back
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(sheet, document.body);
}
