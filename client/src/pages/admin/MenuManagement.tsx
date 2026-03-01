import { useState, useEffect, useCallback } from 'react';
import { UtensilsCrossed, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import MenuItemForm from '@/components/admin/MenuItemForm';
import { getMenuItems, deleteMenuItem, toggleAvailability } from '@/services/adminApi';
import type { IMenuItem } from '@/types';
import toast from 'react-hot-toast';

export default function MenuManagement() {
    const [items, setItems] = useState<IMenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<IMenuItem | null>(null);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getMenuItems();
            setItems(data.menuItems);
        } catch { toast.error('Failed to load menu'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await deleteMenuItem(id);
            toast.success('Item deleted');
            fetchItems();
        } catch { toast.error('Failed to delete'); }
    };

    const handleToggle = async (id: string) => {
        try {
            await toggleAvailability(id);
            toast.success('Availability updated');
            fetchItems();
        } catch { toast.error('Failed to toggle'); }
    };

    const filtered = items.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.category.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h1 className="font-outfit font-extrabold text-[1.5rem] text-[#0F0F0F] tracking-[-0.02em] flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#FFFBF0] flex items-center justify-center text-[#E8A317]">
                        <UtensilsCrossed size={20} />
                    </span>
                    Menu Management
                </h1>
                <button
                    onClick={() => { setEditingItem(null); setShowForm(true); }}
                    className="btn-primary flex items-center gap-2 text-[0.85rem]"
                >
                    <Plus size={18} /> Add Item
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl border border-[#EEEEEE] p-4 mb-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="relative max-w-[360px]">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E8E]" />
                    <input
                        className="input"
                        type="text"
                        placeholder="Search by name or category..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
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
                                <th className="text-left px-6 py-3 font-semibold">Item</th>
                                <th className="text-left px-6 py-3 font-semibold">Category</th>
                                <th className="text-left px-6 py-3 font-semibold">Price</th>
                                <th className="text-left px-6 py-3 font-semibold">Type</th>
                                <th className="text-left px-6 py-3 font-semibold">Available</th>
                                <th className="text-left px-6 py-3 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-10 text-center text-[#8E8E8E]">Loading...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-10 text-center text-[#8E8E8E]">No items found</td></tr>
                            ) : filtered.map((item) => (
                                <tr key={item._id} className="border-t border-[#F0F0EE] hover:bg-[#FAFAF8] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-11 h-11 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-11 h-11 rounded-lg bg-[#F5F5F3] flex items-center justify-center text-[#8E8E8E]">
                                                    <UtensilsCrossed size={16} />
                                                </div>
                                            )}
                                            <span className="font-semibold text-[#0F0F0F]">{item.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[#4A4A4A]">{item.category}</td>
                                    <td className="px-6 py-4 font-bold">₹{item.price}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className="px-2 py-[0.15rem] rounded-md text-[0.7rem] font-bold"
                                            style={{
                                                background: item.isVeg ? '#F0FDF4' : '#FEF2F2',
                                                color: item.isVeg ? '#16A34A' : '#DC2626',
                                            }}
                                        >
                                            {item.isVeg ? 'VEG' : 'NON-VEG'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggle(item._id)}
                                            className="relative w-11 h-6 rounded-full cursor-pointer border-none transition-colors duration-300"
                                            style={{ background: item.isAvailable ? '#16A34A' : '#D4D4D0' }}
                                        >
                                            <span
                                                className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-transform duration-300"
                                                style={{ left: item.isAvailable ? '22px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                                            />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
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
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

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
