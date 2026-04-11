import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    X, MapPin, Navigation, Loader2, Home, Briefcase,
    ChevronRight, Plus, Check, AlertTriangle, Phone, User, Search, LocateFixed,
} from 'lucide-react';
import { userService, type AddAddressPayload } from '@/services/userService';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateUser } from '@/redux/slices/authSlice';
import type { IAddress, IDeliveryLocation } from '@/types';
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

type Step = 'list' | 'gpsLoading' | 'gpsDenied' | 'manual' | 'addressSearch' | 'form' | 'outOfRange';

interface PlacePrediction {
    placeId: string;
    text: string;
    mainText: string;
    secondaryText: string;
}

const GPLACES_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string;

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
    const [locationName, setLocationName] = useState('');
    const [selectedPredefinedLocation, setSelectedPredefinedLocation] = useState('');
    const [distanceInfo, setDistanceInfo] = useState<{ distance: number } | null>(null);

    // Fetch delivery locations & restaurant info from API
    const [predefinedLocations, setPredefinedLocations] = useState<IDeliveryLocation[]>([]);
    const restaurant = useAppSelector(s => s.menu.restaurant);
    const RESTAURANT = restaurant?.coordinates ?? { lat: 28.6139, lng: 77.209 };
    const MAX_DELIVERY_KM = restaurant?.deliveryRadius ?? 10;

    // Address autocomplete state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PlacePrediction[]>([]);
    const [searching, setSearching] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const searchCacheRef = useRef<Map<string, PlacePrediction[]>>(new Map());
    const searchInputRef = useRef<HTMLInputElement>(null);
    // Session token bundles autocomplete + place details into one billing event
    const sessionTokenRef = useRef(crypto.randomUUID());

    useEffect(() => {
        userService.getDeliveryLocations()
            .then(data => setPredefinedLocations(data.locations))
            .catch(() => {});
    }, []);

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
    const [addressLine, setAddressLine] = useState('');
    const [landmark, setLandmark] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (step === 'form') {
            setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 200);
        }
        if (step === 'addressSearch') {
            setTimeout(() => searchInputRef.current?.focus({ preventScroll: true }), 200);
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
            setStep('gpsDenied');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const dist = haversineKm(latitude, longitude, RESTAURANT.lat, RESTAURANT.lng);
                if (dist > MAX_DELIVERY_KM) {
                    setDistanceInfo({ distance: Math.round(dist * 10) / 10 });
                    setStep('outOfRange');
                } else {
                    setCoords({ lat: latitude, lng: longitude });
                    setLocationName('Current Location');
                    setStep('form');
                    toast.success('Location detected!');
                }
            },
            (err) => {
                if (err.code === err.PERMISSION_DENIED) {
                    toast.error('Please allow location access in your browser settings');
                }
                setStep('gpsDenied');
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    }, [step, RESTAURANT.lat, RESTAURANT.lng, MAX_DELIVERY_KM]);

    // ── Address autocomplete via Google Places API (New) ──
    const searchAddress = useCallback((query: string) => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (query.trim().length < 3) {
            setSearchResults([]);
            setSearching(false);
            return;
        }
        setSearching(true);

        const cacheKey = `${query}|${selectedPredefinedLocation}`;

        // Return cached results if available
        const cached = searchCacheRef.current.get(cacheKey);
        if (cached) {
            setSearchResults(cached);
            setSearching(false);
            return;
        }

        // 400ms debounce
        searchTimeoutRef.current = setTimeout(async () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
            abortControllerRef.current = new AbortController();

            try {
                const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
                    method: 'POST',
                    signal: abortControllerRef.current.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': GPLACES_KEY,
                    },
                    body: JSON.stringify({
                        input: selectedPredefinedLocation
                            ? `${query}, ${selectedPredefinedLocation}, Bijnor, Uttar Pradesh`
                            : `${query}, Bijnor, Uttar Pradesh`,
                        includedRegionCodes: ['in'],
                        languageCode: 'en',
                        sessionToken: sessionTokenRef.current,
                        locationBias: {
                            circle: {
                                center: { latitude: RESTAURANT.lat, longitude: RESTAURANT.lng },
                                radius: MAX_DELIVERY_KM * 1000, // meters
                            },
                        },
                    }),
                });
                const json = await res.json();
                const predictions: PlacePrediction[] = (json.suggestions || [])
                    .filter((s: any) => s.placePrediction)
                    .map((s: any) => ({
                        placeId: s.placePrediction.placeId,
                        text: s.placePrediction.text?.text || '',
                        mainText: s.placePrediction.structuredFormat?.mainText?.text || '',
                        secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || '',
                    }));

                searchCacheRef.current.set(cacheKey, predictions);
                if (searchCacheRef.current.size > 50) {
                    const firstKey = searchCacheRef.current.keys().next().value;
                    if (firstKey) searchCacheRef.current.delete(firstKey);
                }
                setSearchResults(predictions);
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 400);
    }, [selectedPredefinedLocation, RESTAURANT.lat, RESTAURANT.lng, MAX_DELIVERY_KM]);

    const handleSelectSearchResult = async (result: PlacePrediction) => {
        setSearching(true);
        try {
            // Fetch place details for coordinates — session token bundles this with autocomplete (1 billing event)
            const res = await fetch(
                `https://places.googleapis.com/v1/places/${result.placeId}?sessionToken=${sessionTokenRef.current}`,
                {
                    headers: {
                        'X-Goog-Api-Key': GPLACES_KEY,
                        'X-Goog-FieldMask': 'location,displayName,formattedAddress',
                    },
                },
            );
            const place = await res.json();
            // Reset session token for next search session
            sessionTokenRef.current = crypto.randomUUID();

            const lat = place.location?.latitude;
            const lng = place.location?.longitude;
            if (!lat || !lng) {
                toast.error('Could not get location coordinates');
                setSearching(false);
                return;
            }

            const dist = haversineKm(lat, lng, RESTAURANT.lat, RESTAURANT.lng);
            if (dist > MAX_DELIVERY_KM) {
                setDistanceInfo({ distance: Math.round(dist * 10) / 10 });
                setStep('outOfRange');
                setSearching(false);
                return;
            }

            setCoords({ lat, lng });
            setLocationName(result.mainText || result.text.split(',')[0]);
            setAddressLine(place.formattedAddress || result.secondaryText || '');
            setStep('form');
            toast.success('Address selected!');
        } catch {
            toast.error('Failed to fetch address details');
        } finally {
            setSearching(false);
        }
    };

    const handleSelectManualLocation = (loc: { name: string }) => {
        setSelectedPredefinedLocation(loc.name);
        setSearchQuery('');
        setSearchResults([]);
        setStep('addressSearch');
    };

    const handleRetryGps = () => {
        setStep('gpsLoading');
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
        if (!validate()) return;

        setSaving(true);
        try {
            const payload: AddAddressPayload = {
                label,
                addressLine: `${addressLine.trim()}${locationName && locationName !== 'Current Location' ? `, ${locationName}` : ''}`,
                landmark: landmark.trim() || undefined,
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
            case 'gpsDenied': return 'Location Access Denied';
            case 'manual': return 'Select Your Area';
            case 'addressSearch': return 'Search Your Address';
            case 'form': return 'Complete Address';
            case 'outOfRange': return 'Out of Delivery Range';
        }
    };

    const getStepSubtitle = () => {
        switch (step) {
            case 'list': return 'Choose or add a new address';
            case 'gpsLoading': return 'Please wait, fetching your location...';
            case 'gpsDenied': return 'We need location access to deliver to you';
            case 'manual': return 'Select your area to continue';
            case 'addressSearch': return `Searching in ${selectedPredefinedLocation}`;
            case 'form': return locationName ? `Delivering to ${locationName}` : 'Fill in your details';
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
                                Location Access Denied
                            </h4>
                            <p style={{ fontSize: '0.82rem', color: '#4A4A4A', lineHeight: 1.5, maxWidth: 300 }}>
                                We couldn't access your location. You can try again or select your address manually.
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', width: '100%' }}>
                                <button
                                    onClick={() => setStep('manual')}
                                    style={{
                                        flex: 1, padding: '0.7rem', borderRadius: 12,
                                        border: 'none', background: '#E8A317', color: 'white',
                                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    }}
                                >
                                    <MapPin size={15} /> Select Manually
                                </button>
                                <button
                                    onClick={handleRetryGps}
                                    style={{
                                        flex: 1, padding: '0.7rem', borderRadius: 12,
                                        border: '1.5px solid #E0E0DC', background: 'white',
                                        color: '#4A4A4A', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
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

                    {/* ─── STEP: MANUAL (predefined locations) ────────── */}
                    {step === 'manual' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <p style={{ fontSize: '0.78rem', color: '#8E8E8E', marginBottom: '0.25rem' }}>
                                Select your area to continue
                            </p>
                            {predefinedLocations.map((loc) => (
                                <button
                                    key={loc._id}
                                    onClick={() => handleSelectManualLocation(loc)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.85rem 1rem', borderRadius: 14,
                                        border: '1.5px solid #EEEEEE', background: 'white',
                                        cursor: 'pointer', width: '100%', textAlign: 'left',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <span style={{
                                        width: 36, height: 36, borderRadius: 10,
                                        background: '#F0FDF4',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#16A34A', flexShrink: 0,
                                    }}>
                                        <MapPin size={16} />
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F0F0F' }}>
                                            {loc.name}
                                        </p>
                                        <p style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 500, marginTop: 1 }}>
                                            Delivery available
                                        </p>
                                    </div>
                                    <ChevronRight size={16} style={{ color: '#D4D4D0', flexShrink: 0 }} />
                                </button>
                            ))}

                            <button
                                onClick={() => setStep('gpsDenied')}
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

                    {/* ─── STEP: ADDRESS SEARCH (autocomplete) ────────── */}
                    {step === 'addressSearch' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
                            {/* Location badge */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.45rem 0.75rem', borderRadius: 10,
                                background: '#F0FDF4', border: '1px solid #BBF7D0',
                            }}>
                                <MapPin size={13} style={{ color: '#16A34A' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16A34A' }}>
                                    {selectedPredefinedLocation}
                                </span>
                                <Check size={12} style={{ color: '#16A34A', marginLeft: 'auto' }} />
                            </div>

                            {/* Search input */}
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{
                                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                    color: '#8E8E8E', pointerEvents: 'none',
                                }} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        searchAddress(e.target.value);
                                    }}
                                    placeholder="Search your street, colony, area..."
                                    style={{
                                        width: '100%', border: '1.5px solid #E0E0DC', borderRadius: 12,
                                        padding: '0.7rem 0.9rem 0.7rem 2.4rem', fontSize: '0.85rem',
                                        fontFamily: 'Inter, sans-serif', outline: 'none', color: '#0F0F0F',
                                        boxSizing: 'border-box', transition: 'border-color 0.15s',
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = '#E8A317'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#E0E0DC'; }}
                                />
                                {searching && (
                                    <Loader2 size={16} className="animate-spin" style={{
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        color: '#E8A317',
                                    }} />
                                )}
                            </div>

                            {/* Results */}
                            {searchResults.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    {searchResults.map((result) => (
                                        <button
                                            key={result.placeId}
                                            onClick={() => handleSelectSearchResult(result)}
                                            style={{
                                                display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                                                padding: '0.7rem 0.85rem', borderRadius: 12,
                                                border: '1px solid #EEEEEE', background: 'white',
                                                cursor: 'pointer', width: '100%', textAlign: 'left',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#FAFAF8'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                                        >
                                            <MapPin size={16} style={{ color: '#E8A317', flexShrink: 0, marginTop: 2 }} />
                                            <div style={{ overflow: 'hidden', minWidth: 0 }}>
                                                <p style={{
                                                    fontSize: '0.82rem', fontWeight: 600, color: '#0F0F0F',
                                                    lineHeight: 1.3, margin: 0, whiteSpace: 'nowrap',
                                                    overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}>
                                                    {result.mainText}
                                                </p>
                                                <p style={{
                                                    fontSize: '0.72rem', color: '#8E8E8E', lineHeight: 1.3,
                                                    margin: '2px 0 0', whiteSpace: 'nowrap',
                                                    overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}>
                                                    {result.secondaryText}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Empty state */}
                            {searchQuery.length >= 3 && !searching && searchResults.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                                    <Search size={24} style={{ color: '#D4D4D0', margin: '0 auto 8px' }} />
                                    <p style={{ fontSize: '0.8rem', color: '#8E8E8E', fontWeight: 500 }}>
                                        No results found. Try a different search.
                                    </p>
                                </div>
                            )}

                            {/* Initial empty state */}
                            {searchQuery.length < 3 && searchResults.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                                    <Search size={24} style={{ color: '#D4D4D0', margin: '0 auto 8px' }} />
                                    <p style={{ fontSize: '0.8rem', color: '#8E8E8E', fontWeight: 500 }}>
                                        Type at least 3 characters to search
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => setStep('manual')}
                                style={{
                                    fontSize: '0.8rem', color: '#8E8E8E', fontWeight: 600,
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    padding: '0.25rem 0', textAlign: 'center', marginTop: '0.25rem',
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
                                Sorry, your selected location is {distanceInfo ? `${distanceInfo.distance} km` : 'too far'} away.
                                We only deliver within {MAX_DELIVERY_KM} km of our restaurant.
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', width: '100%' }}>
                                <button
                                    onClick={() => setStep('manual')}
                                    style={{
                                        flex: 1, padding: '0.65rem', borderRadius: 12,
                                        border: 'none', background: '#E8A317', color: 'white',
                                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                    }}
                                >
                                    Select Manually
                                </button>
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
                                onClick={() => {
                                    if (selectedPredefinedLocation) setStep('addressSearch');
                                    else if (addresses.length > 0) setStep('list');
                                    else setStep('gpsDenied');
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
