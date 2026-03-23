import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Search, Filter } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminCard from '@/components/admin/ui/AdminCard';
import AdminBadge from '@/components/admin/ui/AdminBadge';
import AdminPageHeader from '@/components/admin/ui/AdminPageHeader';
import AdminPagination from '@/components/admin/ui/AdminPagination';
import AdminEmptyState from '@/components/admin/ui/AdminEmptyState';
import OrderDetailModal from '@/components/admin/OrderDetailModal';
import { getOrders, type IAdminOrder, type OrderFilters } from '@/services/adminApi';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['', 'PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
const PAYMENT_OPTIONS = ['', 'COD', 'ONLINE'];

export default function Orders() {
    const [orders, setOrders] = useState<IAdminOrder[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<OrderFilters>({ status: '', paymentMethod: '', search: '', page: 1, limit: 15 });
    const [selectedOrder, setSelectedOrder] = useState<IAdminOrder | null>(null);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const clean: Record<string, string | number> = { page: filters.page ?? 1, limit: filters.limit ?? 15 };
            if (filters.status) clean.status = filters.status;
            if (filters.paymentMethod) clean.paymentMethod = filters.paymentMethod;
            const data = await getOrders(clean as OrderFilters);
            setOrders(data.orders);
            setTotalPages(data.totalPages);
            setTotalOrders(data.totalOrders);
        } catch { toast.error('Failed to load orders'); }
        finally { setLoading(false); }
    }, [filters]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const { onRefresh } = useAdminSocket({
        onNewOrder: (data) => {
            toast.success(`New order #${data.orderNumber || ''}`, { duration: 5000 });
        },
        onOrderCancelled: (data) => {
            toast.error(`Order #${data.orderNumber || ''} cancelled`, { duration: 5000 });
        },
    });
    useEffect(() => { onRefresh(fetchOrders); }, [onRefresh, fetchOrders]);

    const setFilter = (key: keyof OrderFilters, value: string | number) => {
        setFilters((prev) => ({ ...prev, [key]: value, page: key === 'page' ? Number(value) : 1 }));
    };

    return (
        <AdminLayout>
            <AdminPageHeader
                title="Orders"
                subtitle={`${totalOrders} total orders`}
                icon={ClipboardList}
            />

            {/* Filters */}
            <AdminCard className="mb-5">
                <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-2 text-[#8E8E8E] shrink-0">
                        <Filter size={16} />
                        <span className="text-[0.8rem] font-medium hidden sm:inline">Filters</span>
                    </div>
                    <select
                        value={filters.status ?? ''}
                        onChange={(e) => setFilter('status', e.target.value)}
                        className="h-9 px-2 sm:px-3 rounded-xl border border-[#EEEEEE] bg-white text-[0.78rem] sm:text-[0.82rem] font-medium text-[#0F0F0F] outline-none focus:border-[#E8A317] transition-colors flex-1 min-w-0"
                    >
                        <option value="">All Statuses</option>
                        {STATUS_OPTIONS.filter(Boolean).map((s) => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                    <select
                        value={filters.paymentMethod ?? ''}
                        onChange={(e) => setFilter('paymentMethod', e.target.value)}
                        className="h-9 px-2 sm:px-3 rounded-xl border border-[#EEEEEE] bg-white text-[0.78rem] sm:text-[0.82rem] font-medium text-[#0F0F0F] outline-none focus:border-[#E8A317] transition-colors flex-1 min-w-0"
                    >
                        <option value="">All Payments</option>
                        {PAYMENT_OPTIONS.filter(Boolean).map((p) => (
                            <option key={p} value={p}>{p === 'COD' ? 'COD' : 'Online'}</option>
                        ))}
                    </select>
                </div>
            </AdminCard>

            {/* Desktop Table */}
            <div className="hidden md:block">
                <AdminCard padding={false}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[0.85rem]">
                            <thead>
                                <tr className="bg-[#FAFAF8] text-[#8E8E8E] text-[0.73rem] uppercase tracking-wider">
                                    <th className="text-left px-6 py-3 font-semibold">Order</th>
                                    <th className="text-left px-6 py-3 font-semibold">Customer</th>
                                    <th className="text-left px-6 py-3 font-semibold">Items</th>
                                    <th className="text-left px-6 py-3 font-semibold">Total</th>
                                    <th className="text-left px-6 py-3 font-semibold">Payment</th>
                                    <th className="text-left px-6 py-3 font-semibold">Status</th>
                                    <th className="text-left px-6 py-3 font-semibold">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="px-6 py-14 text-center text-[#8E8E8E]">Loading...</td></tr>
                                ) : orders.length === 0 ? (
                                    <tr><td colSpan={7}><AdminEmptyState icon={ClipboardList} title="No orders found" description="Try adjusting your filters" /></td></tr>
                                ) : orders.map((order) => {
                                    const statusColorMap: Record<string, string> = {
                                        PENDING: '#D97706', ACCEPTED: '#2563EB', PREPARING: '#7C3AED',
                                        OUT_FOR_DELIVERY: '#EA580C', DELIVERED: '#16A34A', CANCELLED: '#DC2626',
                                    };
                                    return (
                                        <tr
                                            key={order._id}
                                            className="border-t border-[#F0F0EE] hover:bg-[#FAFAF8] transition-colors cursor-pointer"
                                            onClick={() => setSelectedOrder(order)}
                                            style={{ borderLeft: `3px solid ${statusColorMap[order.orderStatus] || '#D4D4D0'}` }}
                                        >
                                            <td className="px-6 py-4 font-semibold text-[#0F0F0F]">#{order.orderId}</td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-[#0F0F0F]">{order.userId?.name || 'Guest'}</p>
                                                <p className="text-[0.73rem] text-[#8E8E8E]">{order.userId?.phone}</p>
                                            </td>
                                            <td className="px-6 py-4 text-[#4A4A4A] max-w-[180px] truncate">
                                                {order.items.map((i) => i.name).join(', ')}
                                            </td>
                                            <td className="px-6 py-4 font-bold">{'\u20B9'}{order.total}</td>
                                            <td className="px-6 py-4">
                                                <AdminBadge label={order.paymentMethod} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <AdminBadge label={order.orderStatus} />
                                            </td>
                                            <td className="px-6 py-4 text-[#8E8E8E] text-[0.8rem] whitespace-nowrap">
                                                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <AdminPagination currentPage={filters.page ?? 1} totalPages={totalPages} onPageChange={(p) => setFilter('page', p)} />
                </AdminCard>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-3">
                {loading ? (
                    <div className="py-14 text-center text-[#8E8E8E]">Loading...</div>
                ) : orders.length === 0 ? (
                    <AdminEmptyState icon={ClipboardList} title="No orders found" description="Try adjusting your filters" />
                ) : orders.map((order) => (
                    <AdminCard key={order._id} hover onClick={() => setSelectedOrder(order)} className="!p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                                <p className="font-bold text-[0.9rem] text-[#0F0F0F]">#{order.orderId}</p>
                                <p className="text-[0.78rem] text-[#8E8E8E]">{order.userId?.name || 'Guest'}</p>
                            </div>
                            <AdminBadge label={order.orderStatus} />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-[0.82rem] text-[#4A4A4A] truncate flex-1 mr-3">
                                {order.items.map((i) => i.name).join(', ')}
                            </p>
                            <p className="font-bold text-[0.9rem] text-[#0F0F0F] shrink-0">{'\u20B9'}{order.total}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[0.72rem] text-[#8E8E8E]">
                            <AdminBadge label={order.paymentMethod} size="sm" />
                            <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </AdminCard>
                ))}
                {!loading && totalPages > 1 && (
                    <AdminPagination currentPage={filters.page ?? 1} totalPages={totalPages} onPageChange={(p) => setFilter('page', p)} />
                )}
            </div>

            {selectedOrder && (
                <OrderDetailModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onRefresh={fetchOrders}
                />
            )}
        </AdminLayout>
    );
}
