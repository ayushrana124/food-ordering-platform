import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, X, Loader2, Pencil, Trash2, RotateCcw, UtensilsCrossed, AlertTriangle } from 'lucide-react';
import AdminShell from '@/components/admin/AdminShell';
import MenuItemForm from '@/components/admin/MenuItemForm';
import {
    getMenuItems, getDeletedMenuItems, deleteMenuItem, toggleAvailability, restoreMenuItem,
} from '@/services/adminApi';
import type { IMenuItem } from '@/types';
import { money } from '@/i18n';
import { VegMark, DishFallback } from '@/components/ui/Bits';
import toast from 'react-hot-toast';

type Tab = 'active' | 'trash';

export default function MenuManagement() {
    const [items, setItems] = useState<IMenuItem[]>([]);
    const [trash, setTrash] = useState<IMenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('active');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<IMenuItem | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [active, removed] = await Promise.all([
                getMenuItems(),
                getDeletedMenuItems().catch(() => ({ menuItems: [] as IMenuItem[] })),
            ]);
            setItems(active.menuItems ?? []);
            setTrash(removed.menuItems ?? []);
        } catch {
            toast.error('Could not load the menu');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const categories = useMemo(
        () => [...new Set(items.map((i) => i.category))].sort(),
        [items]
    );

    // Group into category sections so the screen mirrors how the menu is printed.
    const sections = useMemo(() => {
        const q = search.trim().toLowerCase();
        const source = tab === 'active' ? items : trash;

        const visible = source.filter((i) => {
            if (category && i.category !== category) return false;
            if (!q) return true;
            return i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q);
        });

        const names = [...new Set(visible.map((i) => i.category))].sort();
        return names.map((name) => ({
            name,
            items: visible.filter((i) => i.category === name).sort((a, b) => a.name.localeCompare(b.name)),
        }));
    }, [items, trash, tab, search, category]);

    const shown = sections.reduce((n, s) => n + s.items.length, 0);
    const soldOut = items.filter((i) => !i.isAvailable).length;

    // ── Actions ──────────────────────────────────────────────────────────────
    const onToggle = async (item: IMenuItem) => {
        setBusy(item._id);
        // Optimistic: the kitchen taps this mid-rush and must see it land at once.
        setItems((prev) => prev.map((i) => (i._id === item._id ? { ...i, isAvailable: !i.isAvailable } : i)));
        try {
            const res = await toggleAvailability(item._id);
            const truth = res.menuItem?.isAvailable;
            if (typeof truth === 'boolean') {
                setItems((prev) => prev.map((i) => (i._id === item._id ? { ...i, isAvailable: truth } : i)));
            }
            toast.success(`${item.name} · ${truth === false ? 'sold out' : 'back on'}`);
        } catch {
            setItems((prev) => prev.map((i) => (i._id === item._id ? { ...i, isAvailable: item.isAvailable } : i)));
            toast.error('Could not update availability');
        } finally {
            setBusy(null);
        }
    };

    const onDelete = async (item: IMenuItem) => {
        if (!window.confirm(`Move "${item.name}" to trash? Customers will stop seeing it.`)) return;
        setBusy(item._id);
        try {
            await deleteMenuItem(item._id);
            setItems((prev) => prev.filter((i) => i._id !== item._id));
            setTrash((prev) => [{ ...item, isDeleted: true }, ...prev]);
            toast.success(`${item.name} moved to trash`);
        } catch {
            toast.error('Could not remove the item');
        } finally {
            setBusy(null);
        }
    };

    const onRestore = async (item: IMenuItem) => {
        setBusy(item._id);
        try {
            await restoreMenuItem(item._id);
            setTrash((prev) => prev.filter((i) => i._id !== item._id));
            await load();
            toast.success(`${item.name} restored`);
        } catch {
            toast.error('Could not restore the item');
        } finally {
            setBusy(null);
        }
    };

    return (
        <AdminShell
            title="Menu"
            actions={
                <button
                    type="button"
                    className="a-pill"
                    style={{ background: 'var(--c-ink)', color: '#fff' }}
                    onClick={() => { setEditing(null); setShowForm(true); }}
                >
                    <Plus size={14} />
                    <span className="hidden-xs">New dish</span>
                </button>
            }
        >
            <div className="a-wrap">
                {/* ── Counts ── */}
                <div className="a-today">
                    <Cell k="On the menu" v={String(items.length)} />
                    <Cell k="Sold out" v={String(soldOut)} alert={soldOut > 0} />
                    <Cell k="Categories" v={String(categories.length)} />
                    <Cell k="In trash" v={String(trash.length)} />
                </div>

                {/* ── Controls ── */}
                <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
                        <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-ink-3)' }} />
                        <input
                            className="c-field"
                            style={{ paddingLeft: 34, paddingRight: search ? 34 : 12, minHeight: 40 }}
                            placeholder="Search dishes…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                aria-label="Clear search"
                                style={{
                                    position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
                                    width: 24, height: 24, borderRadius: 999, border: 0, cursor: 'pointer',
                                    display: 'grid', placeItems: 'center', background: 'var(--c-surface-2)', color: 'var(--c-ink-2)',
                                }}
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <div className="a-seg">
                        <button type="button" className="a-seg__b" data-on={tab === 'active'} onClick={() => setTab('active')}>
                            Menu
                        </button>
                        <button type="button" className="a-seg__b" data-on={tab === 'trash'} onClick={() => setTab('trash')}>
                            Trash{trash.length ? ` (${trash.length})` : ''}
                        </button>
                    </div>
                </div>

                {/* ── Category filter ── */}
                {tab === 'active' && categories.length > 1 && (
                    <div className="c-strip" style={{ paddingInline: 0, paddingBottom: 0 }}>
                        <button type="button" className="c-chip" data-active={category === ''} onClick={() => setCategory('')}>
                            All
                        </button>
                        {categories.map((c) => (
                            <button key={c} type="button" className="c-chip" data-active={category === c} onClick={() => setCategory(c)}>
                                {c}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── List ── */}
                {loading ? (
                    <div style={{ display: 'grid', placeItems: 'center', padding: '64px 0' }}>
                        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--c-ink-3)' }} />
                    </div>
                ) : shown === 0 ? (
                    <div style={{ padding: '56px 20px', textAlign: 'center' }}>
                        <div
                            style={{
                                width: 58, height: 58, margin: '0 auto 14px', borderRadius: 18, display: 'grid', placeItems: 'center',
                                background: 'var(--c-surface-2)', color: 'var(--c-ink-3)',
                            }}
                        >
                            <UtensilsCrossed size={25} />
                        </div>
                        <p style={{ font: '800 1rem/1.3 Outfit, sans-serif', color: 'var(--c-ink)' }}>
                            {tab === 'trash' ? 'Trash is empty' : 'Nothing matches'}
                        </p>
                        <p style={{ marginTop: 5, font: '400 .85rem/1.5 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>
                            {tab === 'trash' ? 'Removed dishes collect here and can be restored.' : 'Try a different search or category.'}
                        </p>
                    </div>
                ) : (
                    sections.map((section) => (
                        <section key={section.name} style={{ marginTop: 18 }}>
                            <div className="a-row" style={{ marginBottom: 8 }}>
                                <span className="a-col__title a-grow">{section.name}</span>
                                <span className="a-col__n">{section.items.length}</span>
                            </div>

                            <div className="a-grid">
                                {section.items.map((item) => (
                                    <div key={item._id} className="a-dish" data-off={tab === 'active' && !item.isAvailable}>
                                        <div style={{ width: 64, height: 64 }}>
                                            {item.image
                                                ? <img src={item.image} alt="" loading="lazy" className="a-dish__img" />
                                                : <DishFallback name={item.name} radius={10} />}
                                        </div>

                                        <div style={{ minWidth: 0 }}>
                                            <div className="a-row" style={{ gap: 6 }}>
                                                <VegMark isVeg={item.isVeg} size={12} />
                                                <span className="a-grow a-trunc" style={{ font: '700 .88rem/1.3 "DM Sans", sans-serif', color: 'var(--c-ink)' }}>
                                                    {item.name}
                                                </span>
                                            </div>

                                            <div className="a-row" style={{ marginTop: 3, gap: 8 }}>
                                                <span style={{ font: '800 .9rem/1 Outfit, sans-serif', color: 'var(--c-ink)' }}>
                                                    {money(item.price)}
                                                </span>
                                                {tab === 'active' && !item.isAvailable && (
                                                    <span className="a-pill a-pill--bad" style={{ height: 22, cursor: 'default' }}>
                                                        <AlertTriangle size={11} />
                                                        Sold out
                                                    </span>
                                                )}
                                            </div>

                                            <div className="a-row" style={{ marginTop: 8, gap: 6 }}>
                                                {tab === 'active' ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="a-pill"
                                                            style={{
                                                                flex: 1, justifyContent: 'center', height: 36,
                                                                background: item.isAvailable ? 'var(--c-danger-wash)' : 'var(--c-ok-wash)',
                                                                color: item.isAvailable ? 'var(--c-danger)' : 'var(--c-ok)',
                                                            }}
                                                            disabled={busy === item._id}
                                                            onClick={() => onToggle(item)}
                                                        >
                                                            {busy === item._id
                                                                ? <Loader2 size={13} className="animate-spin" />
                                                                : item.isAvailable ? 'Mark sold out' : 'Back on menu'}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="a-pill a-pill--quiet"
                                                            style={{ height: 36, width: 36, justifyContent: 'center', padding: 0 }}
                                                            aria-label={`Edit ${item.name}`}
                                                            onClick={() => { setEditing(item); setShowForm(true); }}
                                                        >
                                                            <Pencil size={14} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="a-pill a-pill--quiet"
                                                            style={{ height: 36, width: 36, justifyContent: 'center', padding: 0, color: 'var(--c-danger)' }}
                                                            aria-label={`Delete ${item.name}`}
                                                            disabled={busy === item._id}
                                                            onClick={() => onDelete(item)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="a-pill a-pill--ok"
                                                        style={{ flex: 1, justifyContent: 'center', height: 36 }}
                                                        disabled={busy === item._id}
                                                        onClick={() => onRestore(item)}
                                                    >
                                                        {busy === item._id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                                                        Restore
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </div>

            {showForm && (
                <MenuItemForm
                    item={editing}
                    onClose={() => { setShowForm(false); setEditing(null); }}
                    onSaved={() => { setShowForm(false); setEditing(null); load(); }}
                />
            )}
        </AdminShell>
    );
}

function Cell({ k, v, alert }: { k: string; v: string; alert?: boolean }) {
    return (
        <div className="a-today__cell" style={alert ? { borderColor: '#FCA5A5', background: 'var(--c-danger-wash)' } : undefined}>
            <p className="a-today__k">{k}</p>
            <p className="a-today__v" style={alert ? { color: 'var(--c-danger)' } : undefined}>{v}</p>
        </div>
    );
}
