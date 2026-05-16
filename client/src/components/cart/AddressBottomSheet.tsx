import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    X, MapPin, Navigation, Loader2, Home, Briefcase,
    Plus, Check, AlertTriangle, Phone, User, LocateFixed, Building2, Landmark,
} from 'lucide-react';
import { userService, type AddAddressPayload } from '@/services/userService';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateUser } from '@/redux/slices/authSlice';
import { fetchRestaurant } from '@/redux/slices/menuSlice';
import type { IAddress } from '@/types';
import toast from 'react-hot-toast';

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

type Step = 'list' | 'gpsLoading' | 'gpsDenied' | 'form' | 'outOfRange';

interface Props {
    addresses: IAddress[];
    selectedId: string;
    onSelect: (id: string) => void;
    onAddressesUpdate: (addresses: IAddress[]) => void;
    onClose: () => void;
}

export default function AddressBottomSheet({ addresses, selectedId, onSelect, onAddressesUpdate, onClose }: Props) {
    const dispatch = useAppDispatch();
    const [step, setStep] = useState<Step>(addresses.length > 0 ? 'list' : 'gpsLoading');
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [permDenied, setPermDenied] = useState(false);
    const [distanceInfo, setDistanceInfo] = useState<{ distance: number } | null>(null);

    const restaurant = useAppSelector(s => s.menu.restaurant);
    const RESTAURANT = restaurant?.coordinates ?? { lat: 28.6139, lng: 77.209 };
    const MAX_DELIVERY_KM = restaurant?.deliveryRadius ?? 10;

    useEffect(() => {
        if (!restaurant) {
            dispatch(fetchRestaurant());
        }
    }, []);

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
    const [addressLine, setAddressLine] = useState('');
    const [cityVillage, setCityVillage] = useState('');
    const [nearbyPlace, setNearbyPlace] = useState('');
    const [saving, setSaving] = useState(false);
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

    // ── Auto-trigger GPS when entering gpsLoading step ──
    useEffect(() => {
        if (step !== 'gpsLoading') return;
        if (!navigator.geolocation) {
            setPermDenied(true);
            setStep('gpsDenied');
            return;
        }

        const tryGps = () => {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    const dist = haversineKm(latitude, longitude, RESTAURANT.lat, RESTAURANT.lng);
                    if (dist > MAX_DELIVERY_KM) {
                        setDistanceInfo({ distance: Math.round(dist * 10) / 10 });
                        setStep('outOfRange');
                    } else {
                        setCoords({ lat: latitude, lng: longitude });
                        setStep('form');
                        toast.success('Location detected!');
                    }
                },
                (err) => {
                    if (err.code === err.PERMISSION_DENIED) {
                        setPermDenied(true);
                    }
                    setStep('gpsDenied');
                },
                { enableHighAccuracy: true, timeout: 10000 },
            );
        };

        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                if (result.state === 'denied') {
                    setPermDenied(true);
                    setStep('gpsDenied');
                } else {
                    tryGps();
                }
            }).catch(() => {
                tryGps();
            });
        } else {
            tryGps();
        }
    }, [step, RESTAURANT.lat, RESTAURANT.lng, MAX_DELIVERY_KM]);

    // ── Listen for permission state changes (user resets in browser settings) ──
    useEffect(() => {
        if (!navigator.permissions) return;

        let permStatus: PermissionStatus | null = null;

        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
            permStatus = result;
            const onChange = () => {
                if (result.state === 'granted' || result.state === 'prompt') {
                    // Permission was reset — auto-retry GPS if we're on the denied step
                    setPermDenied(false);
                    if (step === 'gpsDenied') {
                        setStep('gpsLoading');
                        toast('Location permission updated! Retrying...', { icon: '📍' });
                    }
                }
            };
            result.addEventListener('change', onChange);
            return () => result.removeEventListener('change', onChange);
        }).catch(() => {});

        return () => {
            // Cleanup is handled inside the promise
        };
    }, [step]);

    const handleRetryGps = () => {
        // Check if permission is still denied before retrying
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                if (result.state === 'denied') {
                    toast('Location is still blocked. Please reset it in browser settings (click 🔒 icon in address bar).', { icon: '⚠️', duration: 5000 });
                } else {
                    setPermDenied(false);
                    setStep('gpsLoading');
                }
            }).catch(() => {
                setStep('gpsLoading');
            });
        } else {
            setStep('gpsLoading');
        }
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = 'Name is required';
        else if (name.trim().length < 2) errs.name = 'Name too short';
        if (!phone.trim()) errs.phone = 'Phone number is required';
        else if (!/^[6-9]\d{9}$/.test(phone.trim())) errs.phone = 'Enter valid 10-digit number';
        if (!addressLine.trim()) errs.addressLine = 'Detailed address is required';
        else if (addressLine.trim().length < 5) errs.addressLine = 'Address too short';
        if (!cityVillage.trim()) errs.cityVillage = 'City / Village is required';
        else if (cityVillage.trim().length < 2) errs.cityVillage = 'Too short';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;

        setSaving(true);
        try {
            // Combine the 3 address fields into a single addressLine for the backend
            const fullAddress = [
                addressLine.trim(),
                cityVillage.trim(),
                nearbyPlace.trim() ? `Near ${nearbyPlace.trim()}` : '',
            ].filter(Boolean).join(', ');

            const payload: AddAddressPayload = {
                label,
                addressLine: fullAddress,
                landmark: nearbyPlace.trim() || undefined,
                ...(coords && { coordinates: coords }),
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

    const inputStyle = (hasError: boolean): React.CSSProperties => ({
        width: '100%', border: `1.5px solid ${hasError ? '#DC2626' : '#E0E0DC'}`, borderRadius: 10,
        padding: '0.6rem 0.9rem', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif',
        outline: 'none', color: '#0F0F0F', boxSizing: 'border-box',
        transition: 'border-color 0.15s',
    });

    const errorText = (msg?: string) =>
        msg ? <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 3, fontWeight: 500 }}>{msg}</p> : null;

    const getStepTitle = () => {
        switch (step) {
            case 'list': return 'Select Delivery Address';
            case 'gpsLoading': return 'Fetching Location';
            case 'gpsDenied': return 'Location Access Required';
            case 'form': return 'Complete Address';
            case 'outOfRange': return 'Out of Delivery Range';
        }
    };

    const getStepSubtitle = () => {
        switch (step) {
            case 'list': return 'Choose or add a new address';
            case 'gpsLoading': return 'Please wait, fetching your location...';
            case 'gpsDenied': return 'Please allow location access to continue';
            case 'form': return 'Fill in your delivery details';
            case 'outOfRange': return 'Your location is too far';
        }
    };

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
                            {getStepTitle()}
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: '#8E8E8E', marginTop: 2 }}>
                            {getStepSubtitle()}
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
                                onClick={() => setStep('gpsLoading')}
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

                    {/* ─── STEP: GPS LOADING ────────────────────────────── */}
                    {step === 'gpsLoading' && (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            textAlign: 'center', padding: '2.5rem 1rem',
                        }}>
                            <span style={{
                                width: 64, height: 64, borderRadius: 20, background: '#EFF6FF',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#2563EB', marginBottom: '1.25rem',
                            }}>
                                <Loader2 size={28} className="animate-spin" />
                            </span>
                            <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#0F0F0F', marginBottom: 6 }}>
                                Fetching your location...
                            </h4>
                            <p style={{ fontSize: '0.82rem', color: '#8E8E8E', lineHeight: 1.5, maxWidth: 280 }}>
                                Please allow location access when prompted by your browser
                            </p>
                        </div>
                    )}

                    {/* ─── STEP: GPS DENIED ────────────────────────────── */}
                    {step === 'gpsDenied' && (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            textAlign: 'center', padding: '1.5rem 0.5rem',
                        }}>
                            <span style={{
                                width: 60, height: 60, borderRadius: 20, background: '#FEF2F2',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#DC2626', marginBottom: '1rem',
                            }}>
                                <LocateFixed size={28} />
                            </span>
                            <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#0F0F0F', marginBottom: 6 }}>
                                Location Access Required
                            </h4>
                            <p style={{ fontSize: '0.82rem', color: '#4A4A4A', lineHeight: 1.5, maxWidth: 300 }}>
                                Please allow location access to proceed with your order. We need your location to check if delivery is available in your area.
                            </p>

                            {/* Instructions to reset browser permission */}
                            <div style={{
                                marginTop: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: 12,
                                background: '#FFFBEB', border: '1px solid #FDE68A',
                                textAlign: 'left', width: '100%',
                            }}>
                                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
                                    💡 How to enable location:
                                </p>
                                <ol style={{ fontSize: '0.7rem', color: '#78350F', lineHeight: 1.6, margin: 0, paddingLeft: '1.1rem' }}>
                                    <li>Click the 🔒 lock icon in your browser's address bar</li>
                                    <li>Find <b>Location</b> and change it to <b>Allow</b></li>
                                    <li>Refresh the page and try again</li>
                                </ol>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', width: '100%' }}>
                                <button
                                    onClick={handleRetryGps}
                                    style={{
                                        flex: 1, padding: '0.7rem', borderRadius: 12,
                                        border: 'none', background: '#E8A317', color: 'white',
                                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    }}
                                >
                                    <Navigation size={15} /> Try Again
                                </button>
                            </div>
                            {addresses.length > 0 && (
                                <button
                                    onClick={() => setStep('list')}
                                    style={{
                                        fontSize: '0.8rem', color: '#2563EB', fontWeight: 600,
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        padding: '0.75rem 0 0', textAlign: 'center',
                                    }}
                                >
                                    ← Back to saved addresses
                                </button>
                            )}
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
                                Sorry, your location is <strong>{distanceInfo ? `${distanceInfo.distance} km` : 'too far'}</strong> away from our restaurant.
                                We only deliver within {MAX_DELIVERY_KM} km.
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', width: '100%' }}>
                                <button
                                    onClick={handleRetryGps}
                                    style={{
                                        flex: 1, padding: '0.65rem', borderRadius: 12,
                                        border: '1.5px solid #E0E0DC', background: 'white',
                                        color: '#4A4A4A', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                    }}
                                >
                                    Try GPS Again
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─── STEP: FORM ─────────────────────────────────── */}
                    {step === 'form' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '0.25rem' }}>

                            {/* Location detected badge */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 0.75rem', borderRadius: 10,
                                background: '#F0FDF4', border: '1px solid #BBF7D0',
                            }}>
                                <MapPin size={13} style={{ color: '#16A34A' }} />
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#16A34A' }}>
                                    Location verified — delivery available
                                </span>
                                <Check size={12} style={{ color: '#16A34A', marginLeft: 'auto' }} />
                            </div>

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

                            {/* Detailed Address */}
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 600, color: '#4A4A4A', marginBottom: 6 }}>
                                    <Home size={12} /> Detailed Address *
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

                            {/* City / Village */}
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 600, color: '#4A4A4A', marginBottom: 6 }}>
                                    <Building2 size={12} /> City / Village Name *
                                </label>
                                <input
                                    type="text"
                                    value={cityVillage}
                                    onChange={(e) => { setCityVillage(e.target.value); setErrors((p) => ({ ...p, cityVillage: '' })); }}
                                    placeholder="e.g. Bijnor, Nagina, Najibabad..."
                                    maxLength={100}
                                    style={inputStyle(!!errors.cityVillage)}
                                />
                                {errorText(errors.cityVillage)}
                            </div>

                            {/* Famous Nearby Place */}
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 600, color: '#4A4A4A', marginBottom: 6 }}>
                                    <Landmark size={12} /> Famous Nearby Place (optional)
                                </label>
                                <input
                                    type="text"
                                    value={nearbyPlace}
                                    onChange={(e) => setNearbyPlace(e.target.value)}
                                    placeholder="Near temple, school, park, hospital..."
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
                                onClick={() => {
                                    if (addresses.length > 0) setStep('list');
                                    else setStep('gpsLoading');
                                }}
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
