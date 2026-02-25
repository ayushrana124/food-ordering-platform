import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

const ORDER_STATUS_COLORS: Record<string, string> = {
    PENDING: '#B45309',
    ACCEPTED: '#1D4ED8',
    PREPARING: '#7C3AED',
    OUT_FOR_DELIVERY: '#C2410C',
    DELIVERED: '#15803D',
    CANCELLED: '#DC2626',
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

    // Load orders
    useEffect(() => {
        if (tab === 'orders') {
            setOrdersLoading(true);
            orderService.getUserOrders().then((r) => setOrders(r.orders)).catch(() => toast.error('Failed to load orders')).finally(() => setOrdersLoading(false));
        }
    }, [tab]);

    // Load latest addresses
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
            setAddresses((prev) => prev.filter((a) => a._id !== id));
            toast.success('Address removed');
        } catch { toast.error('Failed to remove address'); }
    };

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: 'profile', label: 'Profile', icon: '👤' },
        { key: 'addresses', label: 'Addresses', icon: '📍' },
        { key: 'orders', label: 'Orders', icon: '📦' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }} className="page-enter">
            <Navbar />
            <div className="container" style={{ padding: '2rem 1rem 4rem', maxWidth: 860 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{
                        width: 60, height: 60, borderRadius: '50%', background: 'var(--color-accent)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', flexShrink: 0,
                    }}>
                        {(user?.name || user?.phone || '?')[0].toUpperCase()}
                    </div>
                    <div>
                        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.1 }}>
                            {user?.name || 'Pizza Lover'}
                        </h1>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>+91 {user?.phone}</p>
                    </div>
                    <button
                        onClick={signOut}
                        style={{ marginLeft: 'auto', background: 'none', border: '1.5px solid var(--color-error)', color: 'var(--color-error)', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
                    >
                        Logout
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0' }}>
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            style={{
                                padding: '0.625rem 1.25rem',
                                border: 'none', background: 'none', cursor: 'pointer',
                                fontWeight: 600, fontSize: '0.9rem',
                                color: tab === t.key ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                borderBottom: `2px solid ${tab === t.key ? 'var(--color-accent)' : 'transparent'}`,
                                marginBottom: '-1px',
                                transition: 'all 0.2s',
                            }}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* Profile Tab */}
                {tab === 'profile' && (
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, marginBottom: '1.25rem' }}>Edit Profile</h3>
                        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem' }}>Name</label>
                                <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" id="profile-name" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem' }}>Email</label>
                                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="yourname@email.com" id="profile-email" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem' }}>Phone</label>
                                <input className="input" type="text" value={user?.phone ?? ''} disabled style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }} />
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Phone cannot be changed</p>
                            </div>
                            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }} disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Addresses Tab */}
                {tab === 'addresses' && (
                    <div>
                        {addresses.length === 0 ? (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>No saved addresses yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                                {addresses.map((addr) => (
                                    <div key={addr._id} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.2rem' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{addr.label}</span>
                                                {addr.isDefault && (
                                                    <span style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-sm)' }}>
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{addr.addressLine}</p>
                                            {addr.landmark && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Near {addr.landmark}</p>}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteAddress(addr._id)}
                                            style={{ padding: '0.35rem 0.75rem', border: '1.5px solid var(--color-error)', background: 'white', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Orders Tab */}
                {tab === 'orders' && (
                    <div>
                        {ordersLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                                <LoadingSpinner size="lg" />
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>No orders yet! 🍕</p>
                                <Link to="/menu" className="btn-primary">Order Now</Link>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                                {orders.map((order) => (
                                    <div key={order._id} className="card" style={{ padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <div>
                                                <p style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: 'Outfit' }}>Order #{order.orderId}</p>
                                                <p style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)' }}>
                                                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                            <span style={{
                                                background: ORDER_STATUS_COLORS[order.status] + '18',
                                                color: ORDER_STATUS_COLORS[order.status],
                                                padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700,
                                            }}>
                                                {order.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                                            {order.items.map((i) => `${i.name} ×${i.quantity}`).join(' · ')}
                                        </p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>₹{order.total}</span>
                                            <Link
                                                to={`/order/${order._id}`}
                                                style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}
                                            >
                                                Track →
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
