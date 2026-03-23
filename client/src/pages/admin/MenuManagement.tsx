import { useState, useEffect, useCallback } from 'react';
import { UtensilsCrossed, Plus, Search, Pencil, Trash2, RotateCcw, Archive, Grid3X3, Settings2 } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminCard from '@/components/admin/ui/AdminCard';
import AdminBadge from '@/components/admin/ui/AdminBadge';
import AdminToggle from '@/components/admin/ui/AdminToggle';
import AdminPageHeader from '@/components/admin/ui/AdminPageHeader';
import AdminEmptyState from '@/components/admin/ui/AdminEmptyState';
import AdminSkeleton from '@/components/admin/ui/AdminSkeleton';
import MenuItemForm from '@/components/admin/MenuItemForm';
import { getMenuItems, getDeletedMenuItems, deleteMenuItem, toggleAvailability, restoreMenuItem } from '@/services/adminApi';
import type { IMenuItem } from '@/types';
import toast from 'react-hot-toast';

export default function MenuManagement() {
    const [items, setItems] = useState<IMenuItem[]>([]);
    const [deletedItems, setDeletedItems] = useState<IMenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<IMenuItem | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
    const [categoryFilter, setCategoryFilter] = useState('');

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getMenuItems();
            setItems(data.menuItems);
        } catch { toast.error('Failed to load menu'); }
        finally { setLoading(false); }
    }, []);

    const fetchDeletedItems = useCallback(async () => {
        try {
            const data = await getDeletedMenuItems();
            setDeletedItems(data.menuItems);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { fetchItems(); fetchDeletedItems(); }, [fetchItems, fetchDeletedItems]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Move this item to trash? You can restore it later.')) return;
        try {
            await deleteMenuItem(id);
            setItems(prev => prev.filter(i => i._id !== id));
            toast.success('Item moved to trash');
            fetchDeletedItems();
        } catch { toast.error('Failed to delete'); }
    };

    const handleToggle = async (id: string) => {
        try {
            const res = await toggleAvailability(id);
            setItems(prev => prev.map(i => i._id === id ? { ...i, isAvailable: res.menuItem.isAvailable } : i));
            toast.success('Availability updated');
        } catch { toast.error('Failed to toggle'); }
    };

    const handleRestore = async (id: string) => {
        try {
            await restoreMenuItem(id);
            setDeletedItems(prev => prev.filter(i => i._id !== id));
            toast.success('Item restored');
            fetchItems();
        } catch { toast.error('Failed to restore'); }
    };

    const categories = [...new Set(items.map(i => i.category))].sort();

    const filtered = items.filter((i) => {
        const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
            i.category.toLowerCase().includes(search.toLowerCase());
        const matchCategory = !categoryFilter || i.category === categoryFilter;
        return matchSearch && matchCategory;
    });

    return (
        <AdminLayout>
            <AdminPageHeader
                title="Menu Management"
                subtitle={`${items.length} items`}
                icon={UtensilsCrossed}
                actions={
                    <button
                        onClick={() => { setEditingItem(null); setShowForm(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E8A317] text-white font-bold text-[0.85rem] border-none cursor-pointer hover:bg-[#D49516] transition-colors shadow-[0_2px_12px_rgba(232,163,23,0.25)]"
                    >
                        <Plus size={18} /> Add Item
                    </button>
                }
            />

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-5">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[0.82rem] font-semibold border cursor-pointer transition-all ${
                        activeTab === 'active'
                            ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]'
                            : 'bg-white text-[#4A4A4A] border-[#EEEEEE] hover:bg-[#F5F5F3]'
                    }`}
                >
                    <Grid3X3 size={16} /> Active ({items.length})
                </button>
                <button
                    onClick={() => setActiveTab('trash')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[0.82rem] font-semibold border cursor-pointer transition-all ${
                        activeTab === 'trash'
                            ? 'bg-[#DC2626] text-white border-[#DC2626]'
                            : 'bg-white text-[#4A4A4A] border-[#EEEEEE] hover:bg-[#F5F5F3]'
                    }`}
                >
                    <Archive size={16} /> Trash ({deletedItems.length})
                </button>
            </div>

            {activeTab === 'active' && (
                <>
                    {/* Search + Filter */}
                    <AdminCard className="mb-5 !p-4">
                        <div className="flex flex-wrap gap-3">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C4C4C0]" />
                                <input
                                    className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#EEEEEE] bg-white text-[0.82rem] outline-none focus:border-[#E8A317] transition-colors"
                                    type="text"
                                    placeholder="Search items..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="h-10 px-3 rounded-xl border border-[#EEEEEE] bg-white text-[0.82rem] font-medium text-[#0F0F0F] outline-none focus:border-[#E8A317] transition-colors"
                            >
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </AdminCard>

                    {/* Card Grid */}
                    {loading ? (
                        <AdminSkeleton count={6} type="card" />
                    ) : filtered.length === 0 ? (
                        <AdminEmptyState
                            icon={UtensilsCrossed}
                            title="No menu items found"
                            description={search ? 'Try a different search term' : 'Add your first menu item'}
                            action={!search ? { label: 'Add Item', onClick: () => { setEditingItem(null); setShowForm(true); } } : undefined}
                        />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filtered.map((item) => (
                                <AdminCard key={item._id} padding={false} className="overflow-hidden group">
                                    {/* Image */}
                                    <div className="relative h-40 bg-[#F5F5F3] overflow-hidden">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#C4C4C0]">
                                                <UtensilsCrossed size={32} />
                                            </div>
                                        )}
                                        {/* Badges overlay */}
                                        <div className="absolute top-3 left-3 flex gap-1.5">
                                            <AdminBadge label={item.isVeg ? 'VEG' : 'NON-VEG'} />
                                            <AdminBadge label={item.category} color="#4A4A4A" bg="#F0F0EE" />
                                        </div>
                                        {!item.isAvailable && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <span className="bg-white/90 text-[#DC2626] font-bold text-[0.82rem] px-4 py-1.5 rounded-lg">
                                                    Unavailable
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-outfit font-bold text-[0.95rem] text-[#0F0F0F] leading-tight">{item.name}</h3>
                                            <span className="font-outfit font-extrabold text-[1.05rem] text-[#E8A317] shrink-0">{'\u20B9'}{item.price}</span>
                                        </div>

                                        {item.description && (
                                            <p className="text-[0.78rem] text-[#8E8E8E] line-clamp-2 mb-3">{item.description}</p>
                                        )}

                                        {item.customizations && item.customizations.length > 0 && (
                                            <div className="flex items-center gap-1.5 mb-3">
                                                <Settings2 size={13} className="text-[#8E8E8E]" />
                                                <span className="text-[0.72rem] text-[#8E8E8E]">
                                                    {item.customizations.length} customization{item.customizations.length > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center justify-between pt-3 border-t border-[#F0F0EE]">
                                            <div className="flex items-center gap-2">
                                                <AdminToggle checked={item.isAvailable} onChange={() => handleToggle(item._id)} size="sm" />
                                                <span className="text-[0.75rem] text-[#8E8E8E]">
                                                    {item.isAvailable ? 'Available' : 'Hidden'}
                                                </span>
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => { setEditingItem(item); setShowForm(true); }}
                                                    className="w-8 h-8 rounded-lg border border-[#EEEEEE] bg-white flex items-center justify-center cursor-pointer text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item._id)}
                                                    className="w-8 h-8 rounded-lg border border-[#EEEEEE] bg-white flex items-center justify-center cursor-pointer text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                                                    title="Move to trash"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </AdminCard>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Trash View */}
            {activeTab === 'trash' && (
                <>
                    {deletedItems.length === 0 ? (
                        <AdminEmptyState
                            icon={Archive}
                            title="Trash is empty"
                            description="Deleted menu items will appear here"
                        />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {deletedItems.map((item) => (
                                <AdminCard key={item._id} padding={false} className="overflow-hidden opacity-70">
                                    <div className="relative h-32 bg-[#F5F5F3] overflow-hidden">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover grayscale" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#C4C4C0]">
                                                <UtensilsCrossed size={28} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-outfit font-bold text-[0.9rem] text-[#0F0F0F] line-through">{item.name}</h3>
                                            <span className="font-bold text-[0.9rem] text-[#8E8E8E]">{'\u20B9'}{item.price}</span>
                                        </div>
                                        {item.deletedAt && (
                                            <p className="text-[0.72rem] text-[#DC2626] mb-3">
                                                Deleted {new Date(item.deletedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                            </p>
                                        )}
                                        <button
                                            onClick={() => handleRestore(item._id)}
                                            className="w-full h-9 rounded-xl bg-[#0F0F0F] text-white font-semibold text-[0.82rem] border-none cursor-pointer flex items-center justify-center gap-2 hover:bg-[#2A2A2A] transition-colors"
                                        >
                                            <RotateCcw size={14} /> Restore
                                        </button>
                                    </div>
                                </AdminCard>
                            ))}
                        </div>
                    )}
                </>
            )}

            {showForm && (
                <MenuItemForm
                    item={editingItem}
                    onClose={() => { setShowForm(false); setEditingItem(null); }}
                    onSaved={() => { setShowForm(false); setEditingItem(null); fetchItems(); }}
                />
            )}
        </AdminLayout>
    );
}
