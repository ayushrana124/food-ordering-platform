import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { User, MapPin, Package, LogOut, Trash2, ArrowRight } from 'lucide-react';
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
        <div className="min-h-screen bg-white page-enter">
            <Navbar />
            <div className="container py-8 px-4 pb-16 max-w-[880px]">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div
                        className="w-[60px] h-[60px] rounded-2xl text-white flex items-center justify-center text-[1.5rem] font-extrabold font-outfit shrink-0"
                        style={{
                            background: 'linear-gradient(135deg, #E8A317 0%, #F0B429 100%)',
                            boxShadow: '0 4px 16px rgba(232,163,23,0.25)',
                        }}
                    >
                        {(user?.name || user?.phone || '?')[0].toUpperCase()}
                    </div>
                    <div>
                        <h1 className="font-outfit font-extrabold text-[1.5rem] leading-[1.1] tracking-[-0.02em]">
                            {user?.name || 'Pizza Lover'}
                        </h1>
                        <p className="text-[#8E8E8E] text-[0.9rem]">+91 {user?.phone}</p>
                    </div>
                    <button
                        onClick={signOut}
                        className="ml-auto bg-none border-[1.5px] border-[#DC2626] text-[#DC2626] px-4 py-[0.45rem] rounded-xl cursor-pointer font-semibold text-[0.875rem] hover:bg-[#FEF2F2] transition-colors duration-200 flex items-center gap-2"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-7 border-b border-[#EEEEEE]">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className="relative px-5 py-3 border-none bg-none cursor-pointer font-semibold text-[0.9rem] transition-all duration-250 -mb-[1px] flex items-center gap-2 rounded-t-lg"
                            style={{
                                color: tab === t.key ? '#E8A317' : '#8E8E8E',
                                borderBottom: `2px solid ${tab === t.key ? '#E8A317' : 'transparent'}`,
                                background: tab === t.key ? '#FFFBF0' : 'transparent',
                            }}
                        >
                            <t.icon size={17} /> {t.label}
                        </button>
                    ))}
                </div>

                {/* Profile Tab */}
                {tab === 'profile' && (
                    <div className="card p-7">
                        <h3 className="font-outfit font-bold mb-5">Edit Profile</h3>
                        <form onSubmit={handleSaveProfile} className="flex flex-col gap-5 max-w-[420px]">
                            <div>
                                <label className="block font-semibold text-[0.875rem] mb-[0.4rem] text-[#0F0F0F]">Name</label>
                                <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" id="profile-name" />
                            </div>
                            <div>
                                <label className="block font-semibold text-[0.875rem] mb-[0.4rem] text-[#0F0F0F]">Email</label>
                                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="yourname@email.com" id="profile-email" />
                            </div>
                            <div>
                                <label className="block font-semibold text-[0.875rem] mb-[0.4rem] text-[#0F0F0F]">Phone</label>
                                <input className="input bg-[#F7F7F5] text-[#8E8E8E]" type="text" value={user?.phone ?? ''} disabled />
                                <p className="text-[0.75rem] text-[#8E8E8E] mt-1.5">Phone cannot be changed</p>
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
                            <div className="card p-10 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-[#F7F7F5] flex items-center justify-center text-[#8E8E8E] mx-auto mb-4">
                                    <MapPin size={26} />
                                </div>
                                <p className="text-[#4A4A4A] mb-1 font-semibold">No saved addresses yet.</p>
                                <p className="text-[#8E8E8E] text-[0.85rem]">Add an address during checkout.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {addresses.map((addr) => (
                                    <div key={addr._id} className="card p-5 pl-6 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-[#FFFBF0] flex items-center justify-center text-[#E8A317] shrink-0">
                                            <MapPin size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex gap-2 items-center mb-[0.2rem]">
                                                <span className="font-bold text-[0.9rem]">{addr.label}</span>
                                                {addr.isDefault && (
                                                    <span className="bg-[#DCFCE7] text-[#16A34A] text-[0.7rem] font-semibold px-2 py-[0.15rem] rounded-md">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[0.875rem] text-[#4A4A4A]">{addr.addressLine}</p>
                                            {addr.landmark && <p className="text-[0.8rem] text-[#8E8E8E]">Near {addr.landmark}</p>}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteAddress(addr._id)}
                                            className="p-2 border-none bg-[#FEF2F2] text-[#DC2626] rounded-xl cursor-pointer hover:bg-[#FEE2E2] transition-colors duration-200"
                                            title="Remove"
                                        >
                                            <Trash2 size={17} />
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
                            <div className="card p-10 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-[#F7F7F5] flex items-center justify-center text-[#8E8E8E] mx-auto mb-4">
                                    <Package size={26} />
                                </div>
                                <p className="text-[#4A4A4A] font-semibold mb-4">No orders yet!</p>
                                <Link to="/menu" className="btn-primary no-underline">Order Now</Link>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {orders.map((order) => {
                                    const statusStyle = ORDER_STATUS_COLORS[order.status] ?? { color: '#8E8E8E', bg: '#F7F7F5' };
                                    return (
                                        <div key={order._id} className="card p-6 transition-all duration-200 hover:shadow-md">
                                            <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                                                <div>
                                                    <p className="font-bold text-[0.9rem] font-outfit">Order #{order.orderId}</p>
                                                    <p className="text-[0.775rem] text-[#8E8E8E]">
                                                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <span
                                                    className="px-3 py-1 rounded-lg text-[0.72rem] font-bold"
                                                    style={{ background: statusStyle.bg, color: statusStyle.color }}
                                                >
                                                    {order.status.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            <p className="text-[0.85rem] text-[#4A4A4A] mb-3">
                                                {order.items.map((i) => `${i.name} ×${i.quantity}`).join(' · ')}
                                            </p>
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-[#E8A317] text-[1rem]">₹{order.total}</span>
                                                <Link
                                                    to={`/order/${order._id}`}
                                                    className="text-[#E8A317] no-underline font-semibold text-[0.875rem] hover:underline flex items-center gap-1"
                                                >
                                                    Track <ArrowRight size={14} />
                                                </Link>
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
