import { useState, useEffect, useCallback } from 'react';
import { IndianRupee, ShoppingBag, Clock, Users, RefreshCw } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { getOrderStats, getOrders, type IOrderStats, type IAdminOrder } from '@/services/adminApi';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import toast from 'react-hot-toast';

const STAT_CARDS = [
    { key: 'todayRevenue', label: "Today's Revenue", icon: IndianRupee, color: '#16A34A', bg: '#F0FDF4', prefix: '₹' },
    { key: 'todayOrders', label: "Today's Orders", icon: ShoppingBag, color: '#2563EB', bg: '#EFF6FF', prefix: '' },
    { key: 'pendingOrders', label: 'Pending Orders', icon: Clock, color: '#E8A317', bg: '#FFFBF0', prefix: '' },
    { key: 'activeUsers', label: 'Active Users', icon: Users, color: '#7C3AED', bg: '#F5F3FF', prefix: '' },
] as const;

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
    PENDING: { color: '#D97706', bg: '#FFFBEB' },
    ACCEPTED: { color: '#2563EB', bg: '#EFF6FF' },
    PREPARING: { color: '#7C3AED', bg: '#F5F3FF' },
    OUT_FOR_DELIVERY: { color: '#EA580C', bg: '#FFF7ED' },
    DELIVERED: { color: '#16A34A', bg: '#F0FDF4' },
    CANCELLED: { color: '#DC2626', bg: '#FEF2F2' },
};

export default function Dashboard() {
    const [stats, setStats] = useState<IOrderStats | null>(null);
    const [recentOrders, setRecentOrders] = useState<IAdminOrder[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);

    const fetchData = useCallback(async () => {
        setLoadingStats(true);
        try {
            const [statsData, ordersData] = await Promise.all([
                getOrderStats(),
                getOrders({ limit: 8 }),
            ]);
            setStats(statsData);
            setRecentOrders(ordersData.orders);
        } catch {
            toast.error('Failed to load dashboard data');
        } finally {
            setLoadingStats(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Real-time: auto-refresh on new orders
    const { onRefresh } = useAdminSocket({
        onNewOrder: (data) => {
            toast.success(`🆕 New order #${data.orderNumber || ''}`, { duration: 5000 });
        },
    });
    useEffect(() => { onRefresh(fetchData); }, [onRefresh, fetchData]);

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-7">
                <h1 className="font-outfit font-extrabold text-[1.5rem] text-[#0F0F0F] tracking-[-0.02em]">Dashboard</h1>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EEEEEE] rounded-xl cursor-pointer text-[0.85rem] font-medium text-[#4A4A4A] hover:bg-[#F5F5F3] transition-colors"
                >
                    <RefreshCw size={16} className={loadingStats ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {STAT_CARDS.map((card) => {
                    const value = stats ? stats[card.key] : 0;
                    return (
                        <div key={card.key} className="bg-white rounded-2xl p-6 border border-[#EEEEEE]" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-[0.8rem] text-[#8E8E8E] font-medium">{card.label}</p>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg, color: card.color }}>
                                    <card.icon size={20} />
                                </div>
                            </div>
                            <p className="font-outfit font-extrabold text-[1.6rem] text-[#0F0F0F] tracking-[-0.02em]">
                                {loadingStats ? '--' : `${card.prefix}${value.toLocaleString('en-IN')}`}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="px-6 py-5 border-b border-[#EEEEEE]">
                    <h2 className="font-outfit font-bold text-[1.05rem] text-[#0F0F0F]">Recent Orders</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-[0.85rem]">
                        <thead>
                            <tr className="bg-[#F9F9F7] text-[#8E8E8E] text-[0.75rem] uppercase tracking-wider">
                                <th className="text-left px-6 py-3 font-semibold">Order ID</th>
                                <th className="text-left px-6 py-3 font-semibold">Customer</th>
                                <th className="text-left px-6 py-3 font-semibold">Items</th>
                                <th className="text-left px-6 py-3 font-semibold">Total</th>
                                <th className="text-left px-6 py-3 font-semibold">Status</th>
                                <th className="text-left px-6 py-3 font-semibold">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-[#8E8E8E]">
                                        {loadingStats ? 'Loading...' : 'No orders yet'}
                                    </td>
                                </tr>
                            ) : recentOrders.map((order) => {
                                const st = STATUS_COLORS[order.orderStatus] || STATUS_COLORS.PENDING;
                                return (
                                    <tr key={order._id} className="border-t border-[#F0F0EE] hover:bg-[#FAFAF8] transition-colors">
                                        <td className="px-6 py-4 font-semibold text-[#0F0F0F]">#{order.orderId}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-[#0F0F0F]">{order.userId?.name || 'Guest'}</p>
                                            <p className="text-[0.75rem] text-[#8E8E8E]">{order.userId?.phone}</p>
                                        </td>
                                        <td className="px-6 py-4 text-[#4A4A4A] max-w-[200px] truncate">
                                            {order.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-[#0F0F0F]">₹{order.total}</td>
                                        <td className="px-6 py-4">
                                            <span
                                                className="px-2.5 py-[0.2rem] rounded-md text-[0.7rem] font-bold inline-block"
                                                style={{ background: st.bg, color: st.color }}
                                            >
                                                {(order.orderStatus).replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[#8E8E8E] text-[0.8rem] whitespace-nowrap">
                                            {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
