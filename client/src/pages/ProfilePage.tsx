import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { User, MapPin, Package, LogOut, Trash2, Pizza } from 'lucide-react';
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
            setAddresses((prev) => prev.filter((a) => a._id !== id));
            toast.success('Address removed');
        } catch { toast.error('Failed to remove address'); }
    };

    const tabs: { key: Tab; label: string; icon: any }[] = [
        { key: 'profile', label: 'Profile', icon: User },
        { key: 'addresses', label: 'Addresses', icon: MapPin },
        { key: 'orders', label: 'Orders', icon: Package },
    ];

    return (
        <div className="min-h-screen bg-bg page-enter">
            <Navbar />
            <div className="container py-8 px-4 pb-16 max-w-[860px]">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-[60px] h-[60px] rounded-full bg-[#D4920A] text-white flex items-center justify-center text-[1.5rem] font-extrabold font-outfit shrink-0">
                        {(user?.name || user?.phone || '?')[0].toUpperCase()}
                    </div>
                    <div>
                        <h1 className="font-outfit font-extrabold text-[1.5rem] leading-[1.1]">
                            {user?.name || 'Pizza Lover'}
                        </h1>
                        <p className="text-[#555] text-[0.9rem]">+91 {user?.phone}</p>
                    </div>
                    <button
                        onClick={signOut}
                        className="ml-auto bg-none border-[1.5px] border-[#DC2626] text-[#DC2626] px-4 py-[0.4rem] rounded-full cursor-pointer font-semibold text-[0.875rem] hover:bg-[#FEF2F2] transition-colors flex items-center gap-2"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-border">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className="px-5 py-[0.625rem] border-none bg-none cursor-pointer font-semibold text-[0.9rem] transition-all duration-200 -mb-[1px] flex items-center gap-2"
                            style={{
                                color: tab === t.key ? '#D4920A' : '#555',
                                borderBottom: `2px solid ${tab === t.key ? '#D4920A' : 'transparent'}`,
                            }}
                        >
                            <t.icon size={18} /> {t.label}
                        </button>
                    ))}
                </div>

                {/* Profile Tab */}
                {tab === 'profile' && (
                    <div className="card p-6">
                        <h3 className="font-outfit font-bold mb-5">Edit Profile</h3>
                        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 max-w-[400px]">
                            <div>
                                <label className="block font-semibold text-[0.875rem] mb-[0.35rem]">Name</label>
                                <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" id="profile-name" />
                            </div>
                            <div>
                                <label className="block font-semibold text-[0.875rem] mb-[0.35rem]">Email</label>
                                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="yourname@email.com" id="profile-email" />
                            </div>
                            <div>
                                <label className="block font-semibold text-[0.875rem] mb-[0.35rem]">Phone</label>
                                <input className="input bg-[#F4F3EF] text-[#9B9B9B]" type="text" value={user?.phone ?? ''} disabled />
                                <p className="text-[0.75rem] text-[#9B9B9B] mt-1">Phone cannot be changed</p>
                            </div>
                            <button type="submit" className="btn-primary self-start" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Addresses Tab */}
                {tab === 'addresses' && (
                    <div>
                        {addresses.length === 0 ? (
                            <div className="card p-8 text-center">
                                <p className="text-[#555] mb-4">No saved addresses yet.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-[0.875rem]">
                                {addresses.map((addr) => (
                                    <div key={addr._id} className="card p-4 pl-5 flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex gap-2 items-center mb-[0.2rem]">
                                                <span className="font-bold text-[0.9rem]">{addr.label}</span>
                                                {addr.isDefault && (
                                                    <span className="bg-[#DCFCE7] text-[#15803D] text-[0.7rem] font-semibold px-[0.45rem] py-[0.1rem] rounded-[6px]">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[0.875rem] text-[#555]">{addr.addressLine}</p>
                                            {addr.landmark && <p className="text-[0.8rem] text-[#9B9B9B]">Near {addr.landmark}</p>}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteAddress(addr._id)}
                                            className="px-3 py-[0.35rem] border-[1.5px] border-[#DC2626] bg-white text-[#DC2626] rounded-[10px] cursor-pointer text-[0.8rem] font-semibold hover:bg-[#FEF2F2] transition-colors"
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
                            <div className="flex justify-center py-12">
                                <LoadingSpinner size="lg" />
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="card p-8 text-center">
                                <p className="text-[#555] mb-4">No orders yet! 🍕</p>
                                <Link to="/menu" className="btn-primary">Order Now</Link>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-[0.875rem]">
                                {orders.map((order) => (
                                    <div key={order._id} className="card p-5">
                                        <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                                            <div>
                                                <p className="font-bold text-[0.9rem] font-outfit">Order #{order.orderId}</p>
                                                <p className="text-[0.775rem] text-[#9B9B9B]">
                                                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                            <span
                                                className="px-3 py-1 rounded-full text-[0.75rem] font-bold"
                                                style={{
                                                    background: ORDER_STATUS_COLORS[order.status] + '18',
                                                    color: ORDER_STATUS_COLORS[order.status],
                                                }}
                                            >
                                                {order.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <p className="text-[0.85rem] text-[#555] mb-3">
                                            {order.items.map((i) => `${i.name} ×${i.quantity}`).join(' · ')}
                                        </p>
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-[#D4920A]">₹{order.total}</span>
                                            <Link
                                                to={`/order/${order._id}`}
                                                className="text-[#D4920A] no-underline font-semibold text-[0.875rem] hover:underline"
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
