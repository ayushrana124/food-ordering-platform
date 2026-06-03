import { useState, useEffect, useCallback } from 'react';
import {
    Banknote,
    CheckCircle,
    ClipboardList,
    Clock,
    CreditCard,
    Filter,
    Truck,
    Utensils,
    XCircle,
    type LucideIcon,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminCard from '@/components/admin/ui/AdminCard';
import AdminBadge from '@/components/admin/ui/AdminBadge';
import AdminPageHeader from '@/components/admin/ui/AdminPageHeader';
import AdminPagination from '@/components/admin/ui/AdminPagination';
import AdminEmptyState from '@/components/admin/ui/AdminEmptyState';
import OrderDetailModal from '@/components/admin/OrderDetailModal';
import { getOrders, type IAdminOrder, type OrderFilters } from '@/services/adminApi';
import { useAdminContext } from '@/contexts/AdminContext';
import toast from 'react-hot-toast';

const STATUS_OPTIONS: Array<{ value: string; label: string; icon: LucideIcon; color: string; bg: string }> = [
    { value: '', label: 'All', icon: Filter, color: '#4A4A4A', bg: '#F5F5F3' },
    { value: 'PENDING', label: 'Pending', icon: Clock, color: '#B45309', bg: '#FFF7ED' },
    { value: 'ACCEPTED', label: 'Accepted', icon: CheckCircle, color: '#2563EB', bg: '#EFF6FF' },
    { value: 'PREPARING', label: 'Preparing', icon: Utensils, color: '#7C3AED', bg: '#F5F3FF' },
    { value: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: Truck, color: '#EA580C', bg: '#FFF7ED' },
    { value: 'DELIVERED', label: 'Delivered', icon: CheckCircle, color: '#16A34A', bg: '#F0FDF4' },
    { value: 'CANCELLED', label: 'Cancelled', icon: XCircle, color: '#DC2626', bg: '#FEF2F2' },
];

const PAYMENT_OPTIONS: Array<{ value: string; label: string; icon: LucideIcon; color: string; bg: string }> = [
    { value: '', label: 'All payments', icon: Filter, color: '#4A4A4A', bg: '#F5F5F3' },
    { value: 'COD', label: 'COD', icon: Banknote, color: '#B45309', bg: '#FFF7ED' },
    { value: 'ONLINE', label: 'Online', icon: CreditCard, color: '#2563EB', bg: '#EFF6FF' },
];

/** Background color based on order status — each status gets its own tint */
const getRowBg = (status: string): string => {
    switch (status) {
        case 'PENDING': return '#FFFDE7';        // yellow — unaccepted
        case 'ACCEPTED': return '#EFF6FF';        // blue
        case 'PREPARING': return '#F5F3FF';       // purple
        case 'OUT_FOR_DELIVERY': return '#FFF7ED'; // orange
        case 'DELIVERED': return '#F0FDF4';        // green
        case 'CANCELLED': return '#FEF2F2';       // red
        default: return 'white';
    }
};

/** Border accent for pending (unaccepted) orders */
const getPendingHighlight = (status: string) =>
    status === 'PENDING'
        ? { borderLeft: '4px solid #D97706', boxShadow: '0 0 0 1px #FDE68A inset' }
        : {};

interface FilterChipProps {
    option: {
        value: string;
        label: string;
        icon: LucideIcon;
        color: string;
        bg: string;
    };
    active: boolean;
    onClick: () => void;
}

function FilterChip({ option, active, onClick }: FilterChipProps) {
    const Icon = option.icon;

    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={[
                'h-10 shrink-0 rounded-lg border px-3 text-[0.78rem] font-semibold transition-all duration-200',
                'flex items-center gap-2 whitespace-nowrap outline-none',
                'focus-visible:ring-2 focus-visible:ring-[#E8A317]/30 focus-visible:ring-offset-1',
                active
                    ? 'border-transparent bg-[#0F0F0F] text-white shadow-[0_8px_20px_rgba(15,15,15,0.12)]'
                    : 'border-[#EEEEEE] bg-white text-[#4A4A4A] hover:border-[#D8D8D3] hover:bg-[#FAFAF8]',
            ].join(' ')}
        >
            <span
                className="grid h-6 w-6 place-items-center rounded-md"
                style={{
                    background: active ? 'rgba(255,255,255,0.14)' : option.bg,
                    color: active ? '#FFFFFF' : option.color,
                }}
            >
                <Icon size={14} strokeWidth={2.4} />
            </span>
            <span>{option.label}</span>
        </button>
    );
}

export default function Orders() {
    const [orders, setOrders] = useState<IAdminOrder[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<OrderFilters>({ status: '', paymentMethod: '', search: '', page: 1, limit: 15 });
    const [selectedOrder, setSelectedOrder] = useState<IAdminOrder | null>(null);
    const { refreshActiveOrders } = useAdminContext();

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

    // Listen for context-level refreshes (socket events trigger refreshActiveOrders in context,
    // but we also need to refresh our local order list)
    useEffect(() => {
        // Poll for updates alongside context socket — re-fetch when window regains focus
        const handler = () => { fetchOrders(); };
        window.addEventListener('focus', handler);
        return () => window.removeEventListener('focus', handler);
    }, [fetchOrders]);

    // Also re-fetch orders whenever context refreshes active orders (socket events)
    // We use a custom event to bridge context socket → Orders page
    useEffect(() => {
        const handler = () => { fetchOrders(); refreshActiveOrders(); };
        window.addEventListener('admin:orders-changed', handler);
        return () => window.removeEventListener('admin:orders-changed', handler);
    }, [fetchOrders, refreshActiveOrders]);

    const setFilter = (key: keyof OrderFilters, value: string | number) => {
        setFilters((prev) => ({ ...prev, [key]: value, page: key === 'page' ? Number(value) : 1 }));
    };

    const handleOrderRefresh = () => {
        fetchOrders();
        refreshActiveOrders();
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
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#FFF7ED] text-[#D97706]">
                                <Filter size={17} />
                            </span>
                            <div>
                                <p className="text-[0.86rem] font-bold text-[#0F0F0F]">Filters</p>
                                <p className="text-[0.72rem] text-[#8E8E8E] hidden sm:block">Refine orders by progress and payment method</p>
                            </div>
                        </div>
                        {(filters.status || filters.paymentMethod) && (
                            <button
                                type="button"
                                onClick={() => setFilters((prev) => ({ ...prev, status: '', paymentMethod: '', page: 1 }))}
                                className="h-9 rounded-lg border border-[#EEEEEE] bg-white px-3 text-[0.76rem] font-semibold text-[#4A4A4A] transition-colors hover:border-[#D8D8D3] hover:bg-[#FAFAF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A317]/30"
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="min-w-0">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-[0.7rem] font-bold uppercase tracking-wider text-[#8E8E8E]">Order status</span>
                                {filters.status && (
                                    <span className="hidden rounded-md bg-[#FAFAF8] px-2 py-1 text-[0.68rem] font-semibold text-[#4A4A4A] sm:inline">
                                        {STATUS_OPTIONS.find((option) => option.value === filters.status)?.label}
                                    </span>
                                )}
                            </div>
                            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                                {STATUS_OPTIONS.map((option) => (
                                    <FilterChip
                                        key={option.value || 'all-statuses'}
                                        option={option}
                                        active={(filters.status ?? '') === option.value}
                                        onClick={() => setFilter('status', option.value)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="min-w-0 border-t border-[#F0F0EE] pt-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-[0.7rem] font-bold uppercase tracking-wider text-[#8E8E8E]">Payment</span>
                                {filters.paymentMethod && (
                                    <span className="hidden rounded-md bg-[#FAFAF8] px-2 py-1 text-[0.68rem] font-semibold text-[#4A4A4A] sm:inline">
                                        {PAYMENT_OPTIONS.find((option) => option.value === filters.paymentMethod)?.label}
                                    </span>
                                )}
                            </div>
                            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                                {PAYMENT_OPTIONS.map((option) => (
                                    <FilterChip
                                        key={option.value || 'all-payments'}
                                        option={option}
                                        active={(filters.paymentMethod ?? '') === option.value}
                                        onClick={() => setFilter('paymentMethod', option.value)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </AdminCard>

            {/* Desktop Table */}
            <div className="hidden md:block min-w-0">
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
                                    const isPending = order.orderStatus === 'PENDING';
                                    return (
                                        <tr
                                            key={order._id}
                                            className="border-t border-[#F0F0EE] transition-colors cursor-pointer"
                                            onClick={() => setSelectedOrder(order)}
                                            style={{
                                                background: getRowBg(order.orderStatus),
                                                borderLeft: `3px solid ${statusColorMap[order.orderStatus] || '#D4D4D0'}`,
                                                ...getPendingHighlight(order.orderStatus),
                                                animation: isPending ? 'pendingPulse 3s ease-in-out infinite' : 'none',
                                            }}
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
                                                {order.orderStatus === 'CANCELLED' && (
                                                    <p className="text-[0.65rem] font-semibold mt-1" style={{ color: order.cancelledBy === 'CUSTOMER' ? '#D97706' : '#DC2626' }}>
                                                        {order.cancelledBy === 'CUSTOMER' ? 'By Customer' : order.cancelledBy === 'RESTAURANT' ? 'By Restaurant' : 'Unknown'}
                                                    </p>
                                                )}
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
                    <AdminCard
                        key={order._id}
                        hover
                        onClick={() => setSelectedOrder(order)}
                        className="!p-4"
                        style={{
                            background: getRowBg(order.orderStatus),
                            ...getPendingHighlight(order.orderStatus),
                            animation: order.orderStatus === 'PENDING' ? 'pendingPulse 3s ease-in-out infinite' : 'none',
                        }}
                    >
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                                <p className="font-bold text-[0.9rem] text-[#0F0F0F]">#{order.orderId}</p>
                                <p className="text-[0.78rem] text-[#8E8E8E]">{order.userId?.name || 'Guest'}</p>
                            </div>
                            <div className="text-right">
                                <AdminBadge label={order.orderStatus} />
                                {order.orderStatus === 'CANCELLED' && (
                                    <p className="text-[0.62rem] font-semibold mt-0.5" style={{ color: order.cancelledBy === 'CUSTOMER' ? '#D97706' : '#DC2626' }}>
                                        {order.cancelledBy === 'CUSTOMER' ? 'By Customer' : order.cancelledBy === 'RESTAURANT' ? 'By Restaurant' : 'Unknown'}
                                    </p>
                                )}
                            </div>
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
                    onRefresh={handleOrderRefresh}
                />
            )}

            <style>{`
                @keyframes pendingPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0); }
                    50% { box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.12); }
                }
            `}</style>
        </AdminLayout>
    );
}
