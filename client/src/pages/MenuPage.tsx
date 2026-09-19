import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Leaf, UtensilsCrossed } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchMenuItems, fetchCategories, fetchRestaurant } from '@/redux/slices/menuSlice';
import type { RootState } from '@/redux/store';
import type { IMenuItem } from '@/types';
import AppShell, { TopBar } from '@/components/layout/AppShell';
import DishCard from '@/components/menu/DishCard';
import DishSheet from '@/components/menu/DishSheet';
import LoginModal from '@/components/common/LoginModal';
import { Empty, Skeleton } from '@/components/ui/Bits';
import { useT } from '@/i18n';

/** Height of the sticky chrome above section headers, so they stack cleanly. */
const STICK_OFFSET = 104;

export default function MenuPage() {
    const dispatch = useAppDispatch();
    const { items, categories, restaurant, loading } = useAppSelector((s: RootState) => s.menu);
    const t = useT();

    const [params, setParams] = useSearchParams();
    const [query, setQuery] = useState('');
    const [vegOnly, setVegOnly] = useState(false);
    const [openDish, setOpenDish] = useState<IMenuItem | null>(null);
    const [showLogin, setShowLogin] = useState(false);
    const [activeCat, setActiveCat] = useState<string | null>(null);

    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
    const stripRef = useRef<HTMLDivElement>(null);
    // Suppresses scroll-spy while a tap-to-scroll is animating, otherwise the
    // sections passing under the observer fight the chip the user just pressed.
    const scrollLock = useRef(false);

    useEffect(() => {
        dispatch(fetchMenuItems({}));
        dispatch(fetchCategories());
        dispatch(fetchRestaurant());
    }, [dispatch]);

    // Deep link from the home screen's category tiles.
    useEffect(() => {
        const cat = params.get('category');
        if (cat) setActiveCat(cat);
    }, [params]);

    // ── Group into sections, preserving the admin's category order ───────────
    const sections = useMemo(() => {
        const q = query.trim().toLowerCase();

        const visible = items.filter((item) => {
            if (vegOnly && !item.isVeg) return false;
            if (!q) return true;
            return item.name.toLowerCase().includes(q) || (item.description ?? '').toLowerCase().includes(q);
        });

        const ordered = categories.length > 0
            ? categories.map((c) => c.name)
            : [...new Set(items.map((i) => i.category))];

        const grouped = ordered
            .map((name) => ({ name, items: visible.filter((i) => i.category === name) }))
            .filter((s) => s.items.length > 0);

        // Anything whose category was deleted still belongs on the menu.
        const known = new Set(ordered);
        const orphans = visible.filter((i) => !known.has(i.category));
        if (orphans.length > 0) grouped.push({ name: 'More', items: orphans });

        return grouped;
    }, [items, categories, vegOnly, query]);

    const totalShown = sections.reduce((n, s) => n + s.items.length, 0);

    // ── Scroll-spy: light the chip for whichever section is under the header ──
    useEffect(() => {
        if (sections.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (scrollLock.current) return;
                const onScreen = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (onScreen[0]) setActiveCat(onScreen[0].target.getAttribute('data-cat'));
            },
            { rootMargin: `-${STICK_OFFSET}px 0px -65% 0px`, threshold: 0 }
        );

        for (const section of sections) {
            const el = sectionRefs.current[section.name];
            if (el) observer.observe(el);
        }
        return () => observer.disconnect();
    }, [sections]);

    // Keep the active chip scrolled into view in the strip.
    useEffect(() => {
        if (!activeCat || !stripRef.current) return;
        const chip = stripRef.current.querySelector(`[data-chip="${CSS.escape(activeCat)}"]`);
        chip?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, [activeCat]);

    const jumpTo = useCallback((name: string) => {
        const el = sectionRefs.current[name];
        if (!el) return;

        setActiveCat(name);
        scrollLock.current = true;
        window.scrollTo({ top: el.offsetTop - STICK_OFFSET + 1, behavior: 'smooth' });
        window.setTimeout(() => { scrollLock.current = false; }, 700);
    }, []);

    const clearFilters = () => {
        setQuery('');
        setVegOnly(false);
        setParams({}, { replace: true });
    };

    const isClosed = restaurant?.isOpen === false;

    return (
        <AppShell>
            <TopBar
                title={t('menu.title')}
                below={
                    <>
                        {/* Search + veg filter */}
                        <div className="c-wrap" style={{ paddingBottom: 10, display: 'flex', gap: 8 }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search
                                    size={16}
                                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-ink-3)' }}
                                />
                                <input
                                    className="c-field"
                                    style={{ paddingLeft: 36, paddingRight: query ? 36 : 14, minHeight: 42 }}
                                    placeholder={t('home.searchPlaceholder')}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    aria-label={t('menu.searchTitle')}
                                />
                                {query && (
                                    <button
                                        type="button"
                                        onClick={() => setQuery('')}
                                        aria-label={t('common.close')}
                                        style={{
                                            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                            width: 26, height: 26, borderRadius: 999, border: 0, cursor: 'pointer',
                                            display: 'grid', placeItems: 'center',
                                            background: 'var(--c-surface-2)', color: 'var(--c-ink-2)',
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setVegOnly((v) => !v)}
                                aria-pressed={vegOnly}
                                style={{
                                    flex: 'none', minHeight: 42, paddingInline: 12, borderRadius: 'var(--c-r-md)',
                                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: 0,
                                    background: vegOnly ? '#ECFDF3' : 'var(--c-surface)',
                                    boxShadow: `inset 0 0 0 1.5px ${vegOnly ? 'var(--c-veg)' : 'var(--c-line)'}`,
                                    color: vegOnly ? 'var(--c-veg)' : 'var(--c-ink-2)',
                                    font: '700 .8rem/1 "DM Sans", sans-serif',
                                }}
                            >
                                <Leaf size={15} />
                                {t('common.veg')}
                            </button>
                        </div>

                        {/* Category strip */}
                        {sections.length > 1 && (
                            <div
                                ref={stripRef}
                                className="c-strip"
                                style={{ borderBottom: '1px solid var(--c-line)', paddingTop: 0 }}
                                role="tablist"
                                aria-label={t('home.categories')}
                            >
                                {sections.map((section) => (
                                    <button
                                        key={section.name}
                                        type="button"
                                        role="tab"
                                        data-chip={section.name}
                                        data-active={activeCat === section.name}
                                        aria-selected={activeCat === section.name}
                                        className="c-chip"
                                        onClick={() => jumpTo(section.name)}
                                    >
                                        {section.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                }
            />

            {isClosed && (
                <div
                    className="c-wrap"
                    style={{
                        marginTop: 12, padding: '10px 14px', borderRadius: 'var(--c-r-md)',
                        background: 'var(--c-danger-wash)', color: 'var(--c-danger)',
                        font: '700 .8rem/1.4 "DM Sans", sans-serif',
                        maxWidth: 'calc(520px - 0px)',
                    }}
                >
                    {t('closed.banner')}
                </div>
            )}

            <div className="c-wrap">
                {loading && items.length === 0 ? (
                    <div style={{ paddingTop: 20 }}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 104px', gap: 12, padding: '14px 0' }}>
                                <div>
                                    <Skeleton h={12} w="35%" />
                                    <Skeleton h={16} w="70%" style={{ marginTop: 10 }} />
                                    <Skeleton h={14} w="30%" style={{ marginTop: 10 }} />
                                    <Skeleton h={11} w="90%" style={{ marginTop: 12 }} />
                                </div>
                                <Skeleton h={104} w={104} r={14} />
                            </div>
                        ))}
                    </div>
                ) : totalShown === 0 ? (
                    <Empty
                        icon={UtensilsCrossed}
                        title={t('menu.noResults')}
                        body={t('menu.noResultsBody')}
                        action={
                            (query || vegOnly) && (
                                <button type="button" className="c-btn c-btn--ghost" onClick={clearFilters}>
                                    {t('menu.clearFilters')}
                                </button>
                            )
                        }
                    />
                ) : (
                    sections.map((section) => (
                        <section
                            key={section.name}
                            data-cat={section.name}
                            ref={(el) => { sectionRefs.current[section.name] = el; }}
                        >
                            <h2 className="c-sec" style={{ ['--c-stick' as string]: `${STICK_OFFSET}px` }}>
                                {section.name} · {section.items.length}
                            </h2>
                            {section.items.map((item) => (
                                <DishCard
                                    key={item._id}
                                    item={item}
                                    onOpen={setOpenDish}
                                    onNeedSignIn={() => setShowLogin(true)}
                                />
                            ))}
                        </section>
                    ))
                )}
            </div>

            <DishSheet item={openDish} onClose={() => setOpenDish(null)} onNeedSignIn={() => setShowLogin(true)} />
            {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        </AppShell>
    );
}
