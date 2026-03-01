import { useState, useEffect, useCallback } from 'react';
import { Users as UsersIcon, Search, ChevronLeft, ChevronRight, Shield, Banknote } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { getUsers, toggleUserBlock, toggleCODBlock, type UserFilters } from '@/services/adminApi';
import type { IUser } from '@/types';
import toast from 'react-hot-toast';

export default function Users() {
    const [users, setUsers] = useState<IUser[]>([]);
    const [totalPages, setTotalPages] = useState(1);
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
        } catch { toast.error('Failed to load users'); }
        finally { setLoading(false); }
    }, [filters]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Debounced search
    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setFilters((p) => ({ ...p, search: searchInput, page: 1 })), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const handleToggleBlock = async (id: string) => {
        try { await toggleUserBlock(id); toast.success('User status updated'); fetchUsers(); }
        catch { toast.error('Failed to update'); }
    };

    const handleToggleCOD = async (id: string) => {
        try { await toggleCODBlock(id); toast.success('COD status updated'); fetchUsers(); }
        catch { toast.error('Failed to update'); }
    };

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h1 className="font-outfit font-extrabold text-[1.5rem] text-[#0F0F0F] tracking-[-0.02em] flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#F5F3FF] flex items-center justify-center text-[#7C3AED]">
                        <UsersIcon size={20} />
                    </span>
                    User Management
                </h1>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl border border-[#EEEEEE] p-4 mb-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="relative max-w-[360px]">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E8E]" />
                    <input
                        className="input"
                        type="text"
                        placeholder="Search by name or phone..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        style={{ paddingLeft: '2.8rem' }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-[0.85rem]">
                        <thead>
                            <tr className="bg-[#F9F9F7] text-[#8E8E8E] text-[0.75rem] uppercase tracking-wider">
                                <th className="text-left px-6 py-3 font-semibold">Name</th>
                                <th className="text-left px-6 py-3 font-semibold">Phone</th>
                                <th className="text-left px-6 py-3 font-semibold">Email</th>
                                <th className="text-left px-6 py-3 font-semibold">Status</th>
                                <th className="text-left px-6 py-3 font-semibold">COD</th>
                                <th className="text-left px-6 py-3 font-semibold">Joined</th>
                                <th className="text-left px-6 py-3 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-10 text-center text-[#8E8E8E]">Loading...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-10 text-center text-[#8E8E8E]">No users found</td></tr>
                            ) : users.map((user) => (
                                <tr key={user._id} className="border-t border-[#F0F0EE] hover:bg-[#FAFAF8] transition-colors">
                                    <td className="px-6 py-4 font-semibold text-[#0F0F0F]">{user.name || 'N/A'}</td>
                                    <td className="px-6 py-4 text-[#4A4A4A]">{user.phone}</td>
                                    <td className="px-6 py-4 text-[#4A4A4A]">{user.email || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className="px-2.5 py-[0.2rem] rounded-md text-[0.7rem] font-bold"
                                            style={{
                                                background: user.isBlocked ? '#FEF2F2' : '#F0FDF4',
                                                color: user.isBlocked ? '#DC2626' : '#16A34A',
                                            }}
                                        >
                                            {user.isBlocked ? 'Blocked' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className="px-2.5 py-[0.2rem] rounded-md text-[0.7rem] font-bold"
                                            style={{
                                                background: user.isCODBlocked ? '#FEF2F2' : '#F0FDF4',
                                                color: user.isCODBlocked ? '#DC2626' : '#16A34A',
                                            }}
                                        >
                                            {user.isCODBlocked ? 'Blocked' : 'Allowed'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-[#8E8E8E] text-[0.8rem] whitespace-nowrap">
                                        {new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleToggleBlock(user._id)}
                                                className="flex items-center gap-1.5 px-3 py-[0.35rem] rounded-lg border text-[0.78rem] font-semibold cursor-pointer transition-colors"
                                                style={{
                                                    borderColor: user.isBlocked ? '#16A34A' : '#DC2626',
                                                    color: user.isBlocked ? '#16A34A' : '#DC2626',
                                                    background: user.isBlocked ? '#F0FDF4' : '#FEF2F2',
                                                }}
                                                title={user.isBlocked ? 'Unblock' : 'Block'}
                                            >
                                                <Shield size={13} />
                                                {user.isBlocked ? 'Unblock' : 'Block'}
                                            </button>
                                            <button
                                                onClick={() => handleToggleCOD(user._id)}
                                                className="flex items-center gap-1.5 px-3 py-[0.35rem] rounded-lg border text-[0.78rem] font-semibold cursor-pointer transition-colors"
                                                style={{
                                                    borderColor: user.isCODBlocked ? '#16A34A' : '#D97706',
                                                    color: user.isCODBlocked ? '#16A34A' : '#D97706',
                                                    background: user.isCODBlocked ? '#F0FDF4' : '#FFFBEB',
                                                }}
                                                title={user.isCODBlocked ? 'Allow COD' : 'Block COD'}
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center px-6 py-4 border-t border-[#F0F0EE]">
                        <p className="text-[0.8rem] text-[#8E8E8E]">Page {filters.page} of {totalPages}</p>
                        <div className="flex gap-2">
                            <button
                                disabled={(filters.page ?? 1) <= 1}
                                onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
                                className="w-8 h-8 rounded-lg border border-[#EEEEEE] bg-white flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-[#F5F5F3] transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                disabled={(filters.page ?? 1) >= totalPages}
                                onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                                className="w-8 h-8 rounded-lg border border-[#EEEEEE] bg-white flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-[#F5F5F3] transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
