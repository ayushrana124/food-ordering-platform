import { useState, useEffect, useCallback } from 'react';
import { IndianRupee, ShoppingBag, Clock, Users, RefreshCw, Store, Power, TrendingUp, CreditCard, Award, ChevronDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminCard from '@/components/admin/ui/AdminCard';
import AdminBadge from '@/components/admin/ui/AdminBadge';
import AdminPageHeader from '@/components/admin/ui/AdminPageHeader';
import { getDetailedOrderStats, getOrders, toggleRestaurantOpen, type IDetailedStats, type IAdminOrder } from '@/services/adminApi';
import { useAdminContext } from '@/contexts/AdminContext';
import toast from 'react-hot-toast';

type TimeRange = 'today' | 'week' | 'month' | '3months';

const STAT_CARDS = [
    { key: 'revenue' as const, label: "Revenue", icon: IndianRupee, color: '#0F0F0F', bg: '#FAFAF8', prefix: '\u20B9' },
    { key: 'orders' as const, label: "Total Orders", icon: ShoppingBag, color: '#0F0F0F', bg: '#FAFAF8', prefix: '' },
    { key: 'pendingOrders' as const, label: 'Pending Orders', icon: Clock, color: '#E8A317', bg: '#FFFBF0', prefix: '' },
    { key: 'activeUsers' as const, label: 'Total Active Users', icon: Users, color: '#0F0F0F', bg: '#FAFAF8', prefix: '' },
];

const PIE_COLORS = ['#E8A317', '#F0CA5A', '#0F0F0F', '#4A4A4A', '#8E8E8E', '#EEEEEE'];

export default function Dashboard() {
    const [stats, setStats] = useState<IDetailedStats | null>(null);
    const [recentOrders, setRecentOrders] = useState<IAdminOrder[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [isOpen, setIsOpen] = useState(true);
    const [toggling, setToggling] = useState(false);
    const [timeRange, setTimeRange] = useState<TimeRange>('today');
    
    const { setPendingOrderCount, fetchRestaurant } = useAdminContext();

    const fetchData = useCallback(async () => {
        setLoadingStats(true);
        try {
            const [detailedStats, ordersData, restData] = await Promise.all([
                getDetailedOrderStats(timeRange),
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
    }, [fetchRestaurant, setPendingOrderCount, timeRange]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const handler = () => { fetchData(); };
        window.addEventListener('focus', handler);
        return () => window.removeEventListener('focus', handler);
    }, [fetchData]);

    useEffect(() => {
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

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

    const pieData = stats?.ordersByStatus
        ? Object.entries(stats.ordersByStatus).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
        : [];

    return (
        <AdminLayout>
            <AdminPageHeader
                title="Dashboard Overview"
                subtitle="Monitor your restaurant's performance and orders in real-time."
                actions={
                    <div className="flex items-center gap-3">
                        <div className="bg-white border border-[#E5E7EB] rounded-xl flex items-center p-1 shadow-sm">
                            {(['today', 'week', 'month', '3months'] as TimeRange[]).map((tr) => (
                                <button
                                    key={tr}
                                    onClick={() => setTimeRange(tr)}
                                    className={`px-4 py-1.5 text-[0.8rem] rounded-lg font-medium transition-all ${
                                        timeRange === tr 
                                            ? 'bg-[#0F0F0F] text-white shadow-md' 
                                            : 'text-[#4A4A4A] hover:text-[#0F0F0F] hover:bg-[#F9FAFB]'
                                    }`}
                                >
                                    {tr === 'today' ? 'Today' : tr === 'week' ? 'Last 7 Days' : tr === 'month' ? 'Last 30 Days' : 'Last 3 Months'}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={fetchData}
                            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-white border border-[#E5E7EB] rounded-xl cursor-pointer text-[#4A4A4A] hover:bg-[#F9FAFB] hover:text-[#0F0F0F] shadow-sm transition-colors"
                        >
                            <RefreshCw size={16} className={loadingStats ? 'animate-spin' : ''} />
                        </button>
                    </div>
                }
            />

            {/* Restaurant Status - Slim & Modern */}
            <div
                className="rounded-[1.25rem] p-4 sm:px-6 sm:py-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300"
                style={{
                    background: isOpen ? '#FFFFFF' : '#FEF2F2',
                    border: `1px solid ${isOpen ? '#E5E7EB' : '#FCA5A5'}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
            >
                <div className="flex items-center gap-4">
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border"
                        style={{
                            background: isOpen ? '#F0FDF4' : '#FEF2F2',
                            borderColor: isOpen ? '#BBF7D0' : '#FECACA',
                            color: isOpen ? '#16A34A' : '#DC2626'
                        }}
                    >
                        <Store size={22} />
                    </div>
                    <div>
                        <h3 className="font-outfit font-bold text-[1.1rem] text-[#0F0F0F]">
                            {isOpen ? 'Accepting Orders' : 'Restaurant Closed'}
                        </h3>
                        <p className="text-[0.85rem] text-[#8E8E8E] mt-0.5">
                            {isOpen ? 'Your online store is currently live and customers can place orders.' : 'Customers cannot place new orders right now.'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleToggleOpen}
                    disabled={toggling}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-[0.85rem] cursor-pointer transition-all duration-200 border text-[#0F0F0F] bg-white disabled:opacity-50 hover:bg-[#FAFAF8] shadow-sm"
                    style={{
                        borderColor: isOpen ? '#E5E7EB' : '#FCA5A5',
                    }}
                >
                    <Power size={16} className={isOpen ? 'text-[#DC2626]' : 'text-[#16A34A]'} />
                    {toggling ? 'Updating...' : isOpen ? 'Close Restaurant' : 'Open Restaurant'}
                </button>
            </div>

            {/* Stats Grid - 4 Columns */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
                {STAT_CARDS.map((card) => {
                    const value = stats ? stats[card.key] : 0;
                    const isPending = card.key === 'pendingOrders' && value > 0;
                    return (
                        <div key={card.key} className={`bg-white rounded-[1.25rem] p-5 sm:p-6 border ${isPending ? 'border-[#E8A317]' : 'border-[#E5E7EB]'} shadow-sm relative overflow-hidden transition-all hover:shadow-md`}>
                            {isPending && <div className="absolute top-0 right-0 w-16 h-16 bg-[#FFFBF0] rounded-bl-full -z-0" />}
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-[#EEEEEE]" style={{ background: card.bg, color: card.color }}>
                                    <card.icon size={18} />
                                </div>
                            </div>
                            <div className="relative z-10">
                                <p className="text-[0.8rem] text-[#8E8E8E] font-medium mb-1">{card.label}</p>
                                <p className={`font-outfit font-extrabold text-[1.4rem] sm:text-[1.8rem] text-[#0F0F0F] tracking-tight ${isPending ? 'text-[#E8A317]' : ''}`}>
                                    {loadingStats ? '--' : `${card.prefix}${value.toLocaleString('en-IN')}`}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Middle Section: Quick Highlights & Order Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
                {/* Highlights Left Column (2-span) */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Revenue Trend Outline */}
                    <div className="bg-white rounded-[1.25rem] border border-[#E5E7EB] shadow-sm flex flex-col col-span-1 sm:col-span-2 p-6 h-[300px]">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h3 className="font-outfit font-bold text-[1.05rem] text-[#0F0F0F] mb-1">Revenue Trend</h3>
                                <p className="text-[0.8rem] text-[#8E8E8E]">{timeRange === 'today' ? 'Hourly Performance' : 'Daily Performance'}</p>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0">
                            {!loadingStats && stats?.trendData ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="revenueGrad2" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#0F0F0F" stopOpacity={0.15} />
                                                <stop offset="100%" stopColor="#0F0F0F" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(d) => timeRange === 'today' ? d : new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                            tick={{ fontSize: 11, fill: '#8E8E8E' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickMargin={10}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#8E8E8E' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => `\u20B9${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8,
                                                fontSize: '0.8rem', color: '#0F0F0F', padding: '8px 12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                            formatter={(value: any) => [`\u20B9${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                                            labelFormatter={(d) => timeRange === 'today' ? d : new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                                        />
                                        <Area
                                            type="monotone" dataKey="revenue" stroke="#0F0F0F" strokeWidth={3}
                                            fill="url(#revenueGrad2)" dot={false} activeDot={{ r: 6, fill: '#0F0F0F', stroke: '#FFFFFF', strokeWidth: 3 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-[#8E8E8E] text-[0.85rem]">Loading trend...</div>
                            )}
                        </div>
                    </div>

                    {/* Best Seller */}
                    <div className="bg-white rounded-[1.25rem] border border-[#E5E7EB] shadow-sm p-6 flex flex-col justify-center">
                        <div className="w-10 h-10 rounded-full bg-[#FFFBF0] flex items-center justify-center text-[#E8A317] mb-4">
                            <Award size={18} />
                        </div>
                        <p className="text-[0.8rem] text-[#8E8E8E] font-medium mb-1">Top Selling Item</p>
                        <p className="font-outfit font-bold text-[1.1rem] sm:text-[1.2rem] text-[#0F0F0F] leading-tight truncate">
                            {loadingStats ? '--' : (stats?.topItems?.[0]?.name || 'N/A')}
                        </p>
                    </div>

                    {/* Avg Order Value */}
                    <div className="bg-white rounded-[1.25rem] border border-[#E5E7EB] shadow-sm p-6 flex flex-col justify-center">
                        <div className="w-10 h-10 rounded-full bg-[#F9FAFB] flex items-center justify-center text-[#4A4A4A] mb-4">
                            <TrendingUp size={18} />
                        </div>
                        <p className="text-[0.8rem] text-[#8E8E8E] font-medium mb-1">Avg Order Value</p>
                        <p className="font-outfit font-bold text-[1.4rem] sm:text-[1.6rem] text-[#0F0F0F] tracking-tight">
                            {loadingStats ? '--' : `\u20B9${(stats?.avgOrderValue || 0).toLocaleString('en-IN')}`}
                        </p>
                    </div>
                </div>

                {/* Right Column: Order Status Pie */}
                <div className="bg-white rounded-[1.25rem] border border-[#E5E7EB] shadow-sm p-6 flex flex-col h-full">
                    <h3 className="font-outfit font-bold text-[1.05rem] text-[#0F0F0F] mb-1">Order Status</h3>
                    <p className="text-[0.8rem] text-[#8E8E8E] mb-6">Distribution overview</p>
                    
                    <div className="flex-1 min-h-[220px] relative">
                        {!loadingStats && pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData} dataKey="value" nameKey="name"
                                        cx="50%" cy="50%" innerRadius={60} outerRadius={85}
                                        paddingAngle={5} strokeWidth={0} cornerRadius={4}
                                    >
                                        {pieData.map((_, idx) => (
                                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8,
                                            fontSize: '0.8rem', color: '#0F0F0F', padding: '6px 10px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                        itemStyle={{ color: '#0F0F0F' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-[#8E8E8E] text-[0.85rem]">
                                No data available
                            </div>
                        )}
                        {/* Inner text overlay */}
                        {pieData.length > 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[0.7rem] text-[#8E8E8E] font-medium">Orders</span>
                                <span className="font-outfit font-bold text-[1.2rem] text-[#0F0F0F]">{stats?.orders || 0}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 flex flex-col gap-2.5">
                        {pieData.slice(0, 4).map((entry, idx) => (
                            <div key={entry.name} className="flex items-center justify-between text-[0.8rem]">
                                <div className="flex items-center gap-2 text-[#4A4A4A]">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                    {entry.name}
                                </div>
                                <span className="font-semibold text-[#0F0F0F]">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Recent Orders */}
            <div className="bg-white rounded-[1.25rem] border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-[#F9FAFB] flex items-center justify-between">
                    <div>
                        <h2 className="font-outfit font-bold text-[1.1rem] text-[#0F0F0F]">Recent Orders</h2>
                        <p className="text-[0.8rem] text-[#8E8E8E] mt-0.5">Your latest customer orders</p>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-[0.85rem]">
                        <thead>
                            <tr className="bg-[#FAFAF8] text-[#8E8E8E] text-[0.75rem] uppercase tracking-wider font-semibold border-b border-[#F0F0EE]">
                                <th className="text-left px-6 py-3.5 font-medium w-[15%]">Order ID</th>
                                <th className="text-left px-6 py-3.5 font-medium w-[25%]">Customer</th>
                                <th className="text-left px-6 py-3.5 font-medium max-w-[200px] hidden md:table-cell">Items</th>
                                <th className="text-left px-6 py-3.5 font-medium">Total</th>
                                <th className="text-left px-6 py-3.5 font-medium">Status</th>
                                <th className="text-right px-6 py-3.5 font-medium hidden md:table-cell">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-[#8E8E8E]">
                                        {loadingStats ? 'Loading latest orders...' : 'No orders found.'}
                                    </td>
                                </tr>
                            ) : recentOrders.map((order) => (
                                <tr key={order._id} className="border-b border-[#F9FAFB] last:border-0 hover:bg-[#FAFAF8] transition-colors">
                                    <td className="px-6 py-4 font-semibold text-[#0F0F0F] align-middle">#{order.orderId}</td>
                                    <td className="px-6 py-4 align-middle">
                                        <p className="font-medium text-[#0F0F0F]">{order.userId?.name || 'Guest User'}</p>
                                        <p className="text-[0.75rem] text-[#8E8E8E] tracking-wide">{order.userId?.phone}</p>
                                    </td>
                                    <td className="px-6 py-4 text-[#4A4A4A] max-w-[200px] truncate hidden md:table-cell align-middle">
                                        {order.items.map((i) => `${i.name} (${i.quantity})`).join(', ')}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-[#0F0F0F] align-middle">{'\u20B9'}{order.total}</td>
                                    <td className="px-6 py-4 align-middle">
                                        <AdminBadge label={order.orderStatus} />
                                    </td>
                                    <td className="px-6 py-4 text-[#8E8E8E] text-[0.8rem] whitespace-nowrap hidden md:table-cell align-middle text-right">
                                        {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
