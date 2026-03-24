import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { User, MapPin, Package, LogOut, Trash2, ArrowRight, CreditCard, Banknote, Mail, Phone, Shield, Clock, ChefHat } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch } from '@/redux/hooks';
import { updateUser } from '@/redux/slices/authSlice';
import { userService } from '@/services/userService';
import { orderService } from '@/services/orderService';
import type { IOrder, IAddress } from '@/types';
import toast from 'react-hot-toast';

type Tab = 'profile' | 'addresses' | 'orders';

const ORDER_STATUS_COLORS: Record<string, { color: string; bg: string }> = {
    PENDING: { color: '#D97706', bg: '#FFFBEB' },
    ACCEPTED: { color: '#2563EB', bg: '#EFF6FF' },
    PREPARING: { color: '#7C3AED', bg: '#F5F3FF' },
    OUT_FOR_DELIVERY: { color: '#EA580C', bg: '#FFF7ED' },
    DELIVERED: { color: '#16A34A', bg: '#F0FDF4' },
    CANCELLED: { color: '#DC2626', bg: '#FEF2F2' },
};

export default function ProfilePage() {
    const { user, signOut } = useAuth();
    const dispatch = useAppDispatch();
    const [searchParams] = useSearchParams();
    const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) ?? 'profile');
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<IOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [name, setName] = useState(user?.name ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [addresses, setAddresses] = useState<IAddress[]>(user?.addresses ?? []);

    // Sync state when user loads after initial render
    useEffect(() => {
        if (user) {
            setName((prev) => prev || user.name || '');
            setEmail((prev) => prev || user.email || '');
            setAddresses((prev) => prev.length ? prev : user.addresses ?? []);
        }
    }, [user]);

    useEffect(() => {
        if (tab === 'orders') {
            setOrdersLoading(true);
            orderService.getUserOrders().then((r) => setOrders(r.orders)).catch(() => toast.error('Failed to load orders')).finally(() => setOrdersLoading(false));
        }
    }, [tab]);

    useEffect(() => {
        if (tab === 'addresses') {
            userService.getProfile().then((u) => setAddresses(u.addresses)).catch(() => { });
        }
    }, [tab]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updated = await userService.updateProfile({ name, email });
            dispatch(updateUser(updated));
            toast.success('Profile updated!');
        } catch { toast.error('Update failed'); }
        finally { setLoading(false); }
    };

    const handleDeleteAddress = async (id: string) => {
        try {
            await userService.deleteAddress(id);
            const updated = await userService.getProfile();
            setAddresses(updated.addresses);
            dispatch(updateUser(updated));
            toast.success('Address removed');
        } catch { toast.error('Failed to remove address'); }
    };

    const tabs: { key: Tab; label: string; icon: any }[] = [
        { key: 'profile', label: 'Profile', icon: User },
        { key: 'addresses', label: 'Addresses', icon: MapPin },
        { key: 'orders', label: 'Orders', icon: Package },
    ];

    if (!user) {
        return (
            <div className="min-h-screen bg-[#FAFAF8]">
                <Navbar />
                <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            </div>
        );
    }

    const initial = (user.name || user.phone || '?')[0].toUpperCase();
    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
        : '';

    return (
        <div className="min-h-screen bg-[#FAFAF8] page-enter">
            <Navbar />

            {/* Hero header */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #FFFBF0 0%, #FFF4D6 50%, #FFE8A8 100%)',
                    borderBottom: '1px solid #F0CA5A40',
                }}
            >
                <div
                    className="container max-w-[880px]"
                    style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2rem)' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.75rem, 3vw, 1.25rem)' }}>
                        {/* Avatar */}
                        <div
                            style={{
                                width: 'clamp(52px, 12vw, 72px)',
                                height: 'clamp(52px, 12vw, 72px)',
                                borderRadius: 18,
                                background: 'linear-gradient(135deg, #E8A317 0%, #F0B429 100%)',
                                boxShadow: '0 6px 20px rgba(232,163,23,0.3)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 'clamp(1.2rem, 4vw, 1.75rem)',
                                fontWeight: 800,
                                fontFamily: 'var(--font-display)',
                                flexShrink: 0,
                            }}
                        >
                            {initial}
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h1
                                className="font-outfit"
                                style={{
                                    fontSize: 'clamp(1.15rem, 4vw, 1.6rem)',
                                    fontWeight: 800,
                                    color: '#0F0F0F',
                                    lineHeight: 1.15,
                                    letterSpacing: '-0.02em',
                                    margin: 0,
                                }}
                            >
                                {user?.name || 'Pizza Lover'}
                            </h1>
                            <p style={{ fontSize: 'clamp(0.75rem, 2.5vw, 0.88rem)', color: '#9A7209', margin: '2px 0 0', fontWeight: 500 }}>
                                +91 {user?.phone}
                            </p>
                            {memberSince && (
                                <p style={{ fontSize: 'clamp(0.65rem, 2vw, 0.75rem)', color: '#B8960F', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={11} /> Member since {memberSince}
                                </p>
                            )}
                        </div>
                        {/* Logout */}
                        <button
                            onClick={signOut}
                            style={{
                                background: 'white',
                                border: '1.5px solid #FCA5A5',
                                color: '#DC2626',
                                borderRadius: 12,
                                padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.75rem, 2.5vw, 1rem)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                flexShrink: 0,
                                transition: 'background 0.2s, box-shadow 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(220,38,38,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <LogOut size={15} />
                            <span className="hide-mobile">Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ background: 'white', borderBottom: '1px solid #EEEEEE', position: 'sticky', top: 60, zIndex: 10 }}>
                <div
                    className="container max-w-[880px]"
                    style={{ display: 'flex', gap: 0, padding: '0 clamp(1rem, 4vw, 2rem)', overflowX: 'auto' }}
                >
                    {tabs.map((t) => {
                        const isActive = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                style={{
                                    position: 'relative',
                                    padding: 'clamp(0.7rem, 2vw, 0.85rem) clamp(0.75rem, 3vw, 1.25rem)',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: 'clamp(0.8rem, 2.5vw, 0.88rem)',
                                    color: isActive ? '#E8A317' : '#8E8E8E',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    whiteSpace: 'nowrap',
                                    borderBottom: `2.5px solid ${isActive ? '#E8A317' : 'transparent'}`,
                                    transition: 'color 0.2s, border-color 0.2s',
                                    marginBottom: -1,
                                }}
                            >
                                <t.icon size={16} /> {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div
                className="container max-w-[880px]"
                style={{ padding: 'clamp(1rem, 4vw, 2rem) clamp(1rem, 4vw, 2rem) clamp(3rem, 6vw, 4rem)' }}
            >
                {/* ─── Profile Tab ─── */}
                {tab === 'profile' && (
                    <div
                        style={{
                            background: 'white',
                            borderRadius: 18,
                            border: '1px solid #EEEEEE',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{ padding: 'clamp(1rem, 3vw, 1.5rem) clamp(1.25rem, 4vw, 2rem)', borderBottom: '1px solid #F5F5F3' }}>
                            <h3
                                className="font-outfit"
                                style={{
                                    fontWeight: 700,
                                    fontSize: 'clamp(1rem, 3vw, 1.15rem)',
                                    margin: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    color: '#0F0F0F',
                                }}
                            >
                                <Shield size={18} style={{ color: '#E8A317' }} /> Edit Profile
                            </h3>
                        </div>
                        <form
                            onSubmit={handleSaveProfile}
                            style={{
                                padding: 'clamp(1.25rem, 3vw, 2rem) clamp(1.25rem, 4vw, 2rem)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'clamp(1rem, 3vw, 1.5rem)',
                                maxWidth: 460,
                            }}
                        >
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 'clamp(0.78rem, 2.5vw, 0.875rem)', color: '#0F0F0F', marginBottom: 6 }}>
                                    <User size={14} style={{ color: '#8E8E8E' }} /> Name
                                </label>
                                <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" id="profile-name" />
                            </div>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 'clamp(0.78rem, 2.5vw, 0.875rem)', color: '#0F0F0F', marginBottom: 6 }}>
                                    <Mail size={14} style={{ color: '#8E8E8E' }} /> Email
                                </label>
                                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="yourname@email.com" id="profile-email" />
                            </div>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 'clamp(0.78rem, 2.5vw, 0.875rem)', color: '#0F0F0F', marginBottom: 6 }}>
                                    <Phone size={14} style={{ color: '#8E8E8E' }} /> Phone
                                </label>
                                <input
                                    className="input"
                                    type="text"
                                    value={user?.phone ?? ''}
                                    disabled
                                    style={{ background: '#F7F7F5', color: '#8E8E8E', cursor: 'not-allowed' }}
                                />
                                <p style={{ fontSize: 'clamp(0.65rem, 2vw, 0.75rem)', color: '#B0B0B0', marginTop: 6 }}>Phone number cannot be changed</p>
                            </div>
                            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }} disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                )}

                {/* ─── Addresses Tab ─── */}
                {tab === 'addresses' && (
                    <div>
                        {addresses.length === 0 ? (
                            <div
                                style={{
                                    background: 'white',
                                    borderRadius: 18,
                                    border: '1px solid #EEEEEE',
                                    padding: 'clamp(2.5rem, 8vw, 4rem) clamp(1rem, 4vw, 2rem)',
                                    textAlign: 'center',
                                }}
                            >
                                <div
                                    style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 18,
                                        background: '#F7F7F5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#B0B0B0',
                                        margin: '0 auto 16px',
                                    }}
                                >
                                    <MapPin size={28} />
                                </div>
                                <p style={{ fontWeight: 600, color: '#4A4A4A', fontSize: 'clamp(0.88rem, 3vw, 1rem)', marginBottom: 4 }}>No saved addresses</p>
                                <p style={{ color: '#8E8E8E', fontSize: 'clamp(0.78rem, 2.5vw, 0.88rem)' }}>Add an address during checkout</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.6rem, 2vw, 0.85rem)' }}>
                                {addresses.map((addr) => (
                                    <div
                                        key={addr._id}
                                        style={{
                                            background: 'white',
                                            borderRadius: 16,
                                            border: addr.isDefault ? '1.5px solid #E8A317' : '1px solid #EEEEEE',
                                            padding: 'clamp(0.85rem, 3vw, 1.25rem) clamp(1rem, 3vw, 1.5rem)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'clamp(0.6rem, 2.5vw, 1rem)',
                                            transition: 'box-shadow 0.2s',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 'clamp(36px, 8vw, 44px)',
                                                height: 'clamp(36px, 8vw, 44px)',
                                                borderRadius: 12,
                                                background: addr.isDefault ? '#FFFBF0' : '#F7F7F5',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: addr.isDefault ? '#E8A317' : '#8E8E8E',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <MapPin size={18} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                                <span style={{ fontWeight: 700, fontSize: 'clamp(0.82rem, 2.5vw, 0.92rem)', color: '#0F0F0F' }}>{addr.label}</span>
                                                {addr.isDefault && (
                                                    <span style={{ background: '#DCFCE7', color: '#16A34A', fontSize: 'clamp(0.6rem, 1.8vw, 0.68rem)', fontWeight: 700, padding: '1px 8px', borderRadius: 6 }}>
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: 'clamp(0.75rem, 2.3vw, 0.85rem)', color: '#4A4A4A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {addr.addressLine}
                                            </p>
                                            {addr.landmark && (
                                                <p style={{ fontSize: 'clamp(0.68rem, 2vw, 0.78rem)', color: '#8E8E8E', margin: '2px 0 0' }}>Near {addr.landmark}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteAddress(addr._id)}
                                            style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 10,
                                                border: 'none',
                                                background: '#FEF2F2',
                                                color: '#DC2626',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                transition: 'background 0.2s',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE2E2'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = '#FEF2F2'; }}
                                            title="Remove"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Orders Tab ─── */}
                {tab === 'orders' && (
                    <div>
                        {ordersLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                                <LoadingSpinner size="lg" />
                            </div>
                        ) : orders.length === 0 ? (
                            <div
                                style={{
                                    background: 'white',
                                    borderRadius: 18,
                                    border: '1px solid #EEEEEE',
                                    padding: 'clamp(2.5rem, 8vw, 4rem) clamp(1rem, 4vw, 2rem)',
                                    textAlign: 'center',
                                }}
                            >
                                <div
                                    style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 18,
                                        background: 'linear-gradient(135deg, #FFFBF0, #FFE8A8)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#E8A317',
                                        margin: '0 auto 16px',
                                    }}
                                >
                                    <ChefHat size={28} />
                                </div>
                                <p style={{ fontWeight: 700, color: '#0F0F0F', fontSize: 'clamp(0.95rem, 3vw, 1.1rem)', marginBottom: 4 }}>No orders yet!</p>
                                <p style={{ color: '#8E8E8E', fontSize: 'clamp(0.78rem, 2.5vw, 0.88rem)', marginBottom: 20 }}>Your delicious journey starts here</p>
                                <Link to="/menu" className="btn-primary no-underline" style={{ display: 'inline-flex' }}>
                                    Order Now <ArrowRight size={16} />
                                </Link>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.6rem, 2vw, 0.85rem)' }}>
                                {orders.map((order) => {
                                    const statusStyle = ORDER_STATUS_COLORS[order.orderStatus] ?? { color: '#8E8E8E', bg: '#F7F7F5' };
                                    return (
                                        <div
                                            key={order._id}
                                            style={{
                                                background: 'white',
                                                borderRadius: 16,
                                                border: '1px solid #EEEEEE',
                                                overflow: 'hidden',
                                                transition: 'box-shadow 0.2s',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                                        >
                                            {/* Order header */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: 'clamp(0.75rem, 2.5vw, 1rem) clamp(1rem, 3vw, 1.5rem)',
                                                    borderBottom: '1px solid #F5F5F3',
                                                    flexWrap: 'wrap',
                                                    gap: 8,
                                                }}
                                            >
                                                <div>
                                                    <p className="font-outfit" style={{ fontWeight: 700, fontSize: 'clamp(0.82rem, 2.5vw, 0.95rem)', margin: 0, color: '#0F0F0F' }}>
                                                        Order #{order.orderId}
                                                    </p>
                                                    <p style={{ fontSize: 'clamp(0.68rem, 2vw, 0.78rem)', color: '#8E8E8E', margin: '2px 0 0' }}>
                                                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <span
                                                    style={{
                                                        background: statusStyle.bg,
                                                        color: statusStyle.color,
                                                        padding: '4px 12px',
                                                        borderRadius: 8,
                                                        fontSize: 'clamp(0.62rem, 1.8vw, 0.72rem)',
                                                        fontWeight: 700,
                                                        letterSpacing: '0.02em',
                                                    }}
                                                >
                                                    {order.orderStatus.replace(/_/g, ' ')}
                                                </span>
                                            </div>

                                            {/* Order body */}
                                            <div style={{ padding: 'clamp(0.75rem, 2.5vw, 1rem) clamp(1rem, 3vw, 1.5rem)' }}>
                                                <p style={{ fontSize: 'clamp(0.75rem, 2.3vw, 0.85rem)', color: '#4A4A4A', margin: '0 0 10px', lineHeight: 1.5 }}>
                                                    {order.items.map((i) => `${i.name} ×${i.quantity}`).join(' · ')}
                                                </p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                                    <span
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            fontSize: 'clamp(0.62rem, 1.8vw, 0.7rem)',
                                                            fontWeight: 600,
                                                            padding: '2px 8px',
                                                            borderRadius: 6,
                                                            background: order.paymentMethod === 'COD' ? '#FFF7ED' : '#EFF6FF',
                                                            color: order.paymentMethod === 'COD' ? '#EA580C' : '#2563EB',
                                                        }}
                                                    >
                                                        {order.paymentMethod === 'COD' ? <Banknote size={11} /> : <CreditCard size={11} />}
                                                        {order.paymentMethod === 'COD' ? 'COD' : 'Online'}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize: 'clamp(0.62rem, 1.8vw, 0.7rem)',
                                                            fontWeight: 600,
                                                            padding: '2px 8px',
                                                            borderRadius: 6,
                                                            background: order.paymentStatus === 'PAID' ? '#F0FDF4' : '#FFFBEB',
                                                            color: order.paymentStatus === 'PAID' ? '#16A34A' : '#D97706',
                                                        }}
                                                    >
                                                        {order.paymentStatus === 'PAID' ? 'Paid' : 'Pending'}
                                                    </span>
                                                </div>

                                                {/* Footer row */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 800, color: '#E8A317', fontSize: 'clamp(0.92rem, 3vw, 1.05rem)', fontFamily: 'var(--font-display)' }}>
                                                        ₹{order.total}
                                                    </span>
                                                    <Link
                                                        to={`/order/${order._id}`}
                                                        style={{
                                                            color: '#E8A317',
                                                            textDecoration: 'none',
                                                            fontWeight: 600,
                                                            fontSize: 'clamp(0.78rem, 2.5vw, 0.88rem)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            padding: '6px 14px',
                                                            borderRadius: 10,
                                                            background: '#FFFBF0',
                                                            border: '1px solid #F0CA5A60',
                                                            transition: 'background 0.2s, box-shadow 0.2s',
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF4D6'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(232,163,23,0.15)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFBF0'; e.currentTarget.style.boxShadow = 'none'; }}
                                                    >
                                                        Track <ArrowRight size={14} />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
