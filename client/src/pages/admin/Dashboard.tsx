import { useState, useEffect, useCallback } from 'react';
import { IndianRupee, ShoppingBag, Clock, Users, RefreshCw, Store, Power, TrendingUp, CreditCard, Award } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminCard from '@/components/admin/ui/AdminCard';
import AdminBadge from '@/components/admin/ui/AdminBadge';
import AdminPageHeader from '@/components/admin/ui/AdminPageHeader';
import { getDetailedOrderStats, getOrders, getRestaurantInfo, toggleRestaurantOpen, type IDetailedStats, type IAdminOrder } from '@/services/adminApi';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import { useAdminContext } from '@/contexts/AdminContext';
import toast from 'react-hot-toast';

const STAT_CARDS = [
    { key: 'todayRevenue' as const, label: "Today's Revenue", icon: IndianRupee, color: '#16A34A', bg: '#F0FDF4', prefix: '\u20B9' },
    { key: 'todayOrders' as const, label: "Today's Orders", icon: ShoppingBag, color: '#2563EB', bg: '#EFF6FF', prefix: '' },
    { key: 'pendingOrders' as const, label: 'Pending Orders', icon: Clock, color: '#E8A317', bg: '#FFFBF0', prefix: '' },
    { key: 'activeUsers' as const, label: 'Active Users', icon: Users, color: '#7C3AED', bg: '#F5F3FF', prefix: '' },
];

const PIE_COLORS = ['#D97706', '#2563EB', '#7C3AED', '#0891B2', '#EA580C', '#16A34A', '#DC2626'];

export default function Dashboard() {
    const [stats, setStats] = useState<IDetailedStats | null>(null);
    const [recentOrders, setRecentOrders] = useState<IAdminOrder[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [isOpen, setIsOpen] = useState(true);
    const [toggling, setToggling] = useState(false);
    const { setPendingOrderCount, fetchRestaurant } = useAdminContext();

    const fetchData = useCallback(async () => {
        setLoadingStats(true);
        try {
            const [detailedStats, ordersData, restData] = await Promise.all([
                getDetailedOrderStats(),
                getOrders({ limit: 6 }),
                fetchRestaurant(true),
            ]);
            setStats(detailedStats);
            setRecentOrders(ordersData.orders);
            setIsOpen(restData?.isOpen ?? true);
            setPendingOrderCount(detailedStats.pendingOrders);
        } catch {
            toast.error('Failed to load dashboard data');
        } finally {
            setLoadingStats(false);
        }
    }, [fetchRestaurant, setPendingOrderCount]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const { onRefresh } = useAdminSocket({
        onNewOrder: (data) => {
            toast.success(`New order #${data.orderNumber || ''}`, { duration: 5000 });
        },
    });
    useEffect(() => { onRefresh(fetchData); }, [onRefresh, fetchData]);

    const handleToggleOpen = async () => {
        setToggling(true);
        try {
            const res = await toggleRestaurantOpen(isOpen);
            setIsOpen(res.restaurant?.isOpen ?? !isOpen);
            toast.success(res.restaurant?.isOpen ? 'Restaurant is now OPEN' : 'Restaurant is now CLOSED');
        } catch {
            toast.error('Failed to toggle restaurant status');
        } finally {
            setToggling(false);
        }
    };

    // Prepare pie chart data
    const pieData = stats?.ordersByStatus
        ? Object.entries(stats.ordersByStatus).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
        : [];

    return (
        <AdminLayout>
            <AdminPageHeader
                title="Dashboard"
                subtitle="Overview of your restaurant performance"
                actions={
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#EEEEEE] rounded-xl cursor-pointer text-[0.85rem] font-medium text-[#4A4A4A] hover:bg-[#F5F5F3] transition-colors"
                    >
                        <RefreshCw size={16} className={loadingStats ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                }
            />

            {/* Restaurant Status */}
            <div
                className="rounded-2xl p-4 sm:p-5 mb-6 transition-all duration-300"
                style={{
                    background: isOpen
                        ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)'
                        : 'linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%)',
                    border: `1.5px solid ${isOpen ? '#86EFAC' : '#FCA5A5'}`,
                }}
            >
                <div className="flex items-center gap-3 sm:gap-4">
                    <div
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                            background: isOpen ? '#16A34A' : '#DC2626',
                            boxShadow: isOpen ? '0 4px 16px rgba(22,163,74,0.3)' : '0 4px 16px rgba(220,38,38,0.3)',
                        }}
                    >
                        <Store size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-outfit font-bold text-[0.95rem] sm:text-[1.05rem] text-[#0F0F0F]">
                            Restaurant is {isOpen ? 'Open' : 'Closed'}
                        </p>
                        <p className="text-[0.75rem] sm:text-[0.82rem]" style={{ color: isOpen ? '#16A34A' : '#DC2626' }}>
                            {isOpen ? 'Accepting orders from customers' : 'No orders will be accepted'}
                        </p>
                    </div>
                    <button
                        onClick={handleToggleOpen}
                        disabled={toggling}
                        className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-[0.8rem] sm:text-[0.85rem] cursor-pointer transition-all duration-200 border-none text-white disabled:opacity-50 shrink-0 whitespace-nowrap"
                        style={{
                            background: isOpen ? '#DC2626' : '#16A34A',
                            boxShadow: isOpen ? '0 2px 12px rgba(220,38,38,0.25)' : '0 2px 12px rgba(22,163,74,0.25)',
                        }}
                    >
                        <Power size={16} />
                        <span className="hidden xs:inline">{toggling ? 'Updating...' : isOpen ? 'Close' : 'Open'}</span>
                        <span className="xs:hidden">{toggling ? '...' : isOpen ? 'Close' : 'Open'}</span>
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                {STAT_CARDS.map((card) => {
                    const value = stats ? stats[card.key] : 0;
                    const isPending = card.key === 'pendingOrders' && value > 0;
                    return (
                        <AdminCard key={card.key} className={`!p-3 sm:!p-5 ${isPending ? 'ring-2 ring-[#E8A317]/30' : ''}`}>
                            <div className="flex items-center justify-between mb-2 sm:mb-4">
                                <p className="text-[0.68rem] sm:text-[0.78rem] text-[#8E8E8E] font-medium">{card.label}</p>
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center" style={{ background: card.bg, color: card.color }}>
                                    <card.icon size={16} className="sm:hidden" />
                                    <card.icon size={20} className="hidden sm:block" />
                                </div>
                            </div>
                            <p className={`font-outfit font-extrabold text-[1.15rem] sm:text-[1.6rem] text-[#0F0F0F] tracking-[-0.02em] ${isPending ? 'animate-pulse' : ''}`}>
                                {loadingStats ? '--' : `${card.prefix}${value.toLocaleString('en-IN')}`}
                            </p>
                        </AdminCard>
                    );
                })}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
                {/* Revenue Chart */}
                <AdminCard className="lg:col-span-2" padding={false}>
                    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
                        <h3 className="font-outfit font-bold text-[0.9rem] sm:text-[1rem] text-[#0F0F0F] mb-1">Revenue Trend</h3>
                        <p className="text-[0.72rem] sm:text-[0.78rem] text-[#8E8E8E]">Last 7 days</p>
                    </div>
                    <div className="px-1 sm:px-2 pb-3 sm:pb-4 h-[180px] sm:h-[240px]">
                        {!loadingStats && stats ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.weeklyRevenue || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#E8A317" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#E8A317" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        tick={{ fontSize: 10, fill: '#8E8E8E' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 10, fill: '#8E8E8E' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => `\u20B9${v}`}
                                        width={40}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#0F0F0F', border: 'none', borderRadius: 12,
                                            fontSize: '0.78rem', color: 'white', padding: '6px 12px',
                                        }}
                                        formatter={(value: any) => [`\u20B9${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                                        labelFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                                    />
                                    <Area
                                        type="monotone" dataKey="revenue" stroke="#E8A317" strokeWidth={2.5}
                                        fill="url(#revenueGrad)" dot={false} activeDot={{ r: 5, fill: '#E8A317', stroke: 'white', strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-[#8E8E8E] text-[0.82rem]">Loading...</div>
                        )}
                    </div>
                </AdminCard>

                {/* Order Status Pie */}
                <AdminCard padding={false}>
                    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
                        <h3 className="font-outfit font-bold text-[0.9rem] sm:text-[1rem] text-[#0F0F0F] mb-1">Order Status</h3>
                        <p className="text-[0.72rem] sm:text-[0.78rem] text-[#8E8E8E]">Distribution</p>
                    </div>
                    <div className="px-4 pb-3 sm:pb-4 h-[170px] sm:h-[200px]">
                        {!loadingStats && pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData} dataKey="value" nameKey="name"
                                        cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                                        paddingAngle={3} strokeWidth={0}
                                    >
                                        {pieData.map((_, idx) => (
                                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: '#0F0F0F', border: 'none', borderRadius: 10,
                                            fontSize: '0.78rem', color: 'white', padding: '6px 12px',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-[#8E8E8E] text-[0.82rem]">
                                No data
                            </div>
                        )}
                    </div>
                    {/* Legend */}
                    <div className="px-4 sm:px-6 pb-4 sm:pb-5 flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1.5">
                        {pieData.map((entry, idx) => (
                            <div key={entry.name} className="flex items-center gap-1.5 text-[0.68rem] sm:text-[0.72rem] text-[#4A4A4A]">
                                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                {entry.name} ({entry.value})
                            </div>
                        ))}
                    </div>
                </AdminCard>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                <AdminCard className="!p-3 sm:!p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#FFFBF0] flex items-center justify-center text-[#E8A317] shrink-0">
                            <TrendingUp size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[0.7rem] sm:text-[0.75rem] text-[#8E8E8E]">Avg Order Value</p>
                            <p className="font-outfit font-bold text-[1rem] sm:text-[1.15rem] text-[#0F0F0F]">
                                {loadingStats ? '--' : `\u20B9${(stats?.avgOrderValue || 0).toLocaleString('en-IN')}`}
                            </p>
                        </div>
                    </div>
                </AdminCard>
                <AdminCard className="!p-3 sm:!p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] shrink-0">
                            <CreditCard size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[0.7rem] sm:text-[0.75rem] text-[#8E8E8E]">COD vs Online</p>
                            <p className="font-outfit font-bold text-[0.85rem] sm:text-[1.15rem] text-[#0F0F0F] truncate">
                                {loadingStats ? '--' : (
                                    <>
                                        <span className="text-[#16A34A]">{'\u20B9'}{(stats?.revenueByPayment?.cod || 0).toLocaleString('en-IN')}</span>
                                        <span className="text-[#8E8E8E] font-medium mx-1">/</span>
                                        <span className="text-[#2563EB]">{'\u20B9'}{(stats?.revenueByPayment?.online || 0).toLocaleString('en-IN')}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </AdminCard>
                <AdminCard className="!p-3 sm:!p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#F5F3FF] flex items-center justify-center text-[#7C3AED] shrink-0">
                            <Award size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[0.7rem] sm:text-[0.75rem] text-[#8E8E8E]">Top Seller</p>
                            <p className="font-outfit font-bold text-[0.9rem] sm:text-[1rem] text-[#0F0F0F] truncate">
                                {loadingStats ? '--' : (stats?.topItems?.[0]?.name || 'N/A')}
                            </p>
                        </div>
                    </div>
                </AdminCard>
            </div>

            {/* Recent Orders — Desktop table */}
            <AdminCard padding={false} className="hidden sm:block">
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[#EEEEEE]">
                    <h2 className="font-outfit font-bold text-[0.95rem] sm:text-[1.05rem] text-[#0F0F0F]">Recent Orders</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-[0.82rem] sm:text-[0.85rem]">
                        <thead>
                            <tr className="bg-[#FAFAF8] text-[#8E8E8E] text-[0.7rem] sm:text-[0.73rem] uppercase tracking-wider">
                                <th className="text-left px-3 sm:px-6 py-3 font-semibold">Order ID</th>
                                <th className="text-left px-3 sm:px-6 py-3 font-semibold">Customer</th>
                                <th className="text-left px-3 sm:px-6 py-3 font-semibold hidden md:table-cell">Items</th>
                                <th className="text-left px-3 sm:px-6 py-3 font-semibold">Total</th>
                                <th className="text-left px-3 sm:px-6 py-3 font-semibold">Status</th>
                                <th className="text-left px-3 sm:px-6 py-3 font-semibold hidden md:table-cell">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-[#8E8E8E]">
                                        {loadingStats ? 'Loading...' : 'No orders yet'}
                                    </td>
                                </tr>
                            ) : recentOrders.map((order) => (
                                <tr key={order._id} className="border-t border-[#F0F0EE] hover:bg-[#FAFAF8] transition-colors">
                                    <td className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-[#0F0F0F]">#{order.orderId}</td>
                                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                                        <p className="font-medium text-[#0F0F0F]">{order.userId?.name || 'Guest'}</p>
                                        <p className="text-[0.7rem] sm:text-[0.73rem] text-[#8E8E8E]">{order.userId?.phone}</p>
                                    </td>
                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-[#4A4A4A] max-w-[200px] truncate hidden md:table-cell">
                                        {order.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                                    </td>
                                    <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold text-[#0F0F0F]">{'\u20B9'}{order.total}</td>
                                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                                        <AdminBadge label={order.orderStatus} />
                                    </td>
                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-[#8E8E8E] text-[0.8rem] whitespace-nowrap hidden md:table-cell">
                                        {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </AdminCard>

            {/* Recent Orders — Mobile cards */}
            <div className="sm:hidden">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-outfit font-bold text-[0.95rem] text-[#0F0F0F]">Recent Orders</h2>
                </div>
                {recentOrders.length === 0 ? (
                    <p className="text-center text-[#8E8E8E] text-[0.82rem] py-8">
                        {loadingStats ? 'Loading...' : 'No orders yet'}
                    </p>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {recentOrders.map((order) => (
                            <AdminCard key={order._id} className="!p-3.5">
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div className="min-w-0">
                                        <p className="font-bold text-[0.85rem] text-[#0F0F0F]">#{order.orderId}</p>
                                        <p className="text-[0.72rem] text-[#8E8E8E] truncate">{order.userId?.name || 'Guest'}</p>
                                    </div>
                                    <AdminBadge label={order.orderStatus} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="font-bold text-[0.88rem] text-[#0F0F0F]">{'\u20B9'}{order.total}</p>
                                    <p className="text-[0.7rem] text-[#8E8E8E]">
                                        {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </AdminCard>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
