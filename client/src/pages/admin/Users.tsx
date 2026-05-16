import { useState, useEffect, useCallback } from 'react';
import { Users as UsersIcon, Search, Shield, Banknote, Phone, Mail, Calendar } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminCard from '@/components/admin/ui/AdminCard';
import AdminBadge from '@/components/admin/ui/AdminBadge';
import AdminPageHeader from '@/components/admin/ui/AdminPageHeader';
import AdminPagination from '@/components/admin/ui/AdminPagination';
import AdminEmptyState from '@/components/admin/ui/AdminEmptyState';
import AdminSkeleton from '@/components/admin/ui/AdminSkeleton';
import { getUsers, toggleUserBlock, toggleCODBlock, type UserFilters } from '@/services/adminApi';
import type { IUser } from '@/types';
import toast from 'react-hot-toast';

export default function Users() {
    const [users, setUsers] = useState<IUser[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<UserFilters>({ search: '', page: 1, limit: 15 });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const clean: Record<string, string | number> = { page: filters.page ?? 1, limit: filters.limit ?? 15 };
            if (filters.search) clean.search = filters.search;
            const data = await getUsers(clean as UserFilters);
            setUsers(data.users);
            setTotalPages(data.totalPages);
            setTotalUsers(data.totalUsers ?? data.users.length);
        } catch { toast.error('Failed to load users'); }
        finally { setLoading(false); }
    }, [filters]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setFilters((p) => ({ ...p, search: searchInput, page: 1 })), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const handleToggleBlock = async (id: string) => {
        try {
            await toggleUserBlock(id);
            setUsers(prev => prev.map(u => u._id === id ? { ...u, isBlocked: !u.isBlocked } : u));
            toast.success('User status updated');
        } catch { toast.error('Failed to update'); }
    };

    const handleToggleCOD = async (id: string) => {
        try {
            await toggleCODBlock(id);
            setUsers(prev => prev.map(u => u._id === id ? { ...u, isCODBlocked: !u.isCODBlocked } : u));
            toast.success('COD status updated');
        } catch { toast.error('Failed to update'); }
    };

    return (
        <AdminLayout>
            <AdminPageHeader
                title="Users"
                subtitle={`${totalUsers} registered users`}
                icon={UsersIcon}
            />

            {/* Search */}
            <AdminCard className="mb-5 !p-4">
                <div className="relative max-w-[360px]">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C4C4C0]" />
                    <input
                        className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.82rem] outline-none focus:border-[#E8A317] transition-colors"
                        type="text"
                        placeholder="Search by name or phone..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </div>
            </AdminCard>

            {/* Desktop Table */}
            <div className="hidden md:block min-w-0">
                <AdminCard padding={false}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[0.85rem]">
                            <thead>
                                <tr className="bg-[#FAFAF8] text-[#8E8E8E] text-[0.73rem] uppercase tracking-wider">
                                    <th className="text-left px-6 py-3 font-semibold">User</th>
                                    <th className="text-left px-6 py-3 font-semibold">Contact</th>
                                    <th className="text-left px-6 py-3 font-semibold">Status</th>
                                    <th className="text-left px-6 py-3 font-semibold">COD</th>
                                    <th className="text-left px-6 py-3 font-semibold">Joined</th>
                                    <th className="text-left px-6 py-3 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-14 text-center text-[#8E8E8E]">Loading...</td></tr>
                                ) : users.length === 0 ? (
                                    <tr><td colSpan={6}><AdminEmptyState icon={UsersIcon} title="No users found" description="Try a different search" /></td></tr>
                                ) : users.map((user) => (
                                    <tr key={user._id} className="border-t border-[#F0F0EE] hover:bg-[#FAFAF8] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-[#F5F3FF] flex items-center justify-center text-[#7C3AED] font-bold text-[0.8rem] shrink-0">
                                                    {(user.name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-[#0F0F0F]">{user.name || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-[#4A4A4A]">{user.phone}</p>
                                            <p className="text-[0.75rem] text-[#8E8E8E]">{user.email || '—'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <AdminBadge label={user.isBlocked ? 'Blocked' : 'Active'} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <AdminBadge label={user.isCODBlocked ? 'Blocked' : 'Allowed'} />
                                        </td>
                                        <td className="px-6 py-4 text-[#8E8E8E] text-[0.8rem] whitespace-nowrap">
                                            {new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleToggleBlock(user._id)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[0.78rem] font-semibold cursor-pointer transition-colors ${
                                                        user.isBlocked
                                                            ? 'border-[#16A34A] text-[#16A34A] bg-[#F0FDF4] hover:bg-[#DCFCE7]'
                                                            : 'border-[#DC2626] text-[#DC2626] bg-[#FEF2F2] hover:bg-[#FEE2E2]'
                                                    }`}
                                                >
                                                    <Shield size={13} />
                                                    {user.isBlocked ? 'Unblock' : 'Block'}
                                                </button>
                                                <button
                                                    onClick={() => handleToggleCOD(user._id)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[0.78rem] font-semibold cursor-pointer transition-colors ${
                                                        user.isCODBlocked
                                                            ? 'border-[#16A34A] text-[#16A34A] bg-[#F0FDF4] hover:bg-[#DCFCE7]'
                                                            : 'border-[#D97706] text-[#D97706] bg-[#FFFBEB] hover:bg-[#FEF3C7]'
                                                    }`}
                                                >
                                                    <Banknote size={13} />
                                                    {user.isCODBlocked ? 'Allow COD' : 'Block COD'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <AdminPagination
                        currentPage={filters.page ?? 1}
                        totalPages={totalPages}
                        onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))}
                    />
                </AdminCard>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-3">
                {loading ? (
                    <AdminSkeleton count={5} type="card" />
                ) : users.length === 0 ? (
                    <AdminEmptyState icon={UsersIcon} title="No users found" description="Try a different search" />
                ) : users.map((user) => (
                    <AdminCard key={user._id} className="!p-4">
                        <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] flex items-center justify-center text-[#7C3AED] font-bold text-[0.9rem] shrink-0">
                                {(user.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-[0.9rem] text-[#0F0F0F]">{user.name || 'N/A'}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <AdminBadge label={user.isBlocked ? 'Blocked' : 'Active'} size="sm" />
                                    <AdminBadge label={user.isCODBlocked ? 'COD Blocked' : 'COD OK'} size="sm" />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5 mb-3 text-[0.78rem]">
                            <div className="flex items-center gap-2 text-[#4A4A4A]">
                                <Phone size={12} className="text-[#8E8E8E]" /> {user.phone}
                            </div>
                            {user.email && (
                                <div className="flex items-center gap-2 text-[#4A4A4A]">
                                    <Mail size={12} className="text-[#8E8E8E]" /> {user.email}
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-[#8E8E8E]">
                                <Calendar size={12} />
                                Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-[#F0F0EE]">
                            <button
                                onClick={() => handleToggleBlock(user._id)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[0.78rem] font-semibold cursor-pointer transition-colors ${
                                    user.isBlocked
                                        ? 'border-[#16A34A] text-[#16A34A] bg-[#F0FDF4]'
                                        : 'border-[#DC2626] text-[#DC2626] bg-[#FEF2F2]'
                                }`}
                            >
                                <Shield size={13} />
                                {user.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                            <button
                                onClick={() => handleToggleCOD(user._id)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[0.78rem] font-semibold cursor-pointer transition-colors ${
                                    user.isCODBlocked
                                        ? 'border-[#16A34A] text-[#16A34A] bg-[#F0FDF4]'
                                        : 'border-[#D97706] text-[#D97706] bg-[#FFFBEB]'
                                }`}
                            >
                                <Banknote size={13} />
                                {user.isCODBlocked ? 'Allow COD' : 'Block COD'}
                            </button>
                        </div>
                    </AdminCard>
                ))}
                {!loading && totalPages > 1 && (
                    <AdminPagination
                        currentPage={filters.page ?? 1}
                        totalPages={totalPages}
                        onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
