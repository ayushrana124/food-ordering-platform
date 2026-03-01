import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import OrderDetailModal from '@/components/admin/OrderDetailModal';
import { getOrders, type IAdminOrder, type OrderFilters } from '@/services/adminApi';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['', 'PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
const PAYMENT_OPTIONS = ['', 'COD', 'ONLINE'];

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
    PENDING: { color: '#D97706', bg: '#FFFBEB' },
    ACCEPTED: { color: '#2563EB', bg: '#EFF6FF' },
    PREPARING: { color: '#7C3AED', bg: '#F5F3FF' },
    OUT_FOR_DELIVERY: { color: '#EA580C', bg: '#FFF7ED' },
    DELIVERED: { color: '#16A34A', bg: '#F0FDF4' },
    CANCELLED: { color: '#DC2626', bg: '#FEF2F2' },
};

export default function Orders() {
    const [orders, setOrders] = useState<IAdminOrder[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<OrderFilters>({ status: '', paymentMethod: '', page: 1, limit: 15 });
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
        } catch { toast.error('Failed to load orders'); }
        finally { setLoading(false); }
    }, [filters]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const setFilter = (key: keyof OrderFilters, value: string | number) => {
        setFilters((prev) => ({ ...prev, [key]: value, page: key === 'page' ? Number(value) : 1 }));
    };

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h1 className="font-outfit font-extrabold text-[1.5rem] text-[#0F0F0F] tracking-[-0.02em] flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#FFFBF0] flex items-center justify-center text-[#E8A317]">
                        <ClipboardList size={20} />
                    </span>
                    Orders
                </h1>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-[#EEEEEE] p-4 mb-5 flex flex-wrap gap-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <select
                    value={filters.status ?? ''}
                    onChange={(e) => setFilter('status', e.target.value)}
                    className="input max-w-[180px]"
                >
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.filter(Boolean).map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                </select>
                <select
                    value={filters.paymentMethod ?? ''}
                    onChange={(e) => setFilter('paymentMethod', e.target.value)}
                    className="input max-w-[180px]"
                >
                    <option value="">All Payments</option>
                    {PAYMENT_OPTIONS.filter(Boolean).map((p) => (
                        <option key={p} value={p}>{p === 'COD' ? 'Cash on Delivery' : 'Online'}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-[0.85rem]">
                        <thead>
                            <tr className="bg-[#F9F9F7] text-[#8E8E8E] text-[0.75rem] uppercase tracking-wider">
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
                                <tr><td colSpan={7} className="px-6 py-10 text-center text-[#8E8E8E]">Loading...</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-10 text-center text-[#8E8E8E]">No orders found</td></tr>
                            ) : orders.map((order) => {
                                const st = STATUS_COLORS[order.orderStatus || order.status] || STATUS_COLORS.PENDING;
                                return (
                                    <tr
                                        key={order._id}
                                        className="border-t border-[#F0F0EE] hover:bg-[#FAFAF8] transition-colors cursor-pointer"
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <td className="px-6 py-4 font-semibold text-[#0F0F0F]">#{order.orderId}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-[#0F0F0F]">{order.userId?.name || 'Guest'}</p>
                                            <p className="text-[0.75rem] text-[#8E8E8E]">{order.userId?.phone}</p>
                                        </td>
                                        <td className="px-6 py-4 text-[#4A4A4A] max-w-[180px] truncate">
                                            {order.items.map((i) => i.name).join(', ')}
                                        </td>
                                        <td className="px-6 py-4 font-bold">₹{order.total}</td>
                                        <td className="px-6 py-4 text-[#4A4A4A]">{order.paymentMethod}</td>
                                        <td className="px-6 py-4">
                                            <span
                                                className="px-2.5 py-[0.2rem] rounded-md text-[0.7rem] font-bold"
                                                style={{ background: st.bg, color: st.color }}
                                            >
                                                {(order.orderStatus || order.status).replace(/_/g, ' ')}
                                            </span>
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center px-6 py-4 border-t border-[#F0F0EE]">
                        <p className="text-[0.8rem] text-[#8E8E8E]">Page {filters.page} of {totalPages}</p>
                        <div className="flex gap-2">
                            <button
                                disabled={(filters.page ?? 1) <= 1}
                                onClick={() => setFilter('page', (filters.page ?? 1) - 1)}
                                className="w-8 h-8 rounded-lg border border-[#EEEEEE] bg-white flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-[#F5F5F3] transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                disabled={(filters.page ?? 1) >= totalPages}
                                onClick={() => setFilter('page', (filters.page ?? 1) + 1)}
                                className="w-8 h-8 rounded-lg border border-[#EEEEEE] bg-white flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-[#F5F5F3] transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Order Detail Modal */}
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
