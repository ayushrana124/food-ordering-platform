import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Heart, LogOut, Languages, Phone, ChevronRight, Loader2, Check } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { logout, updateUser } from '@/redux/slices/authSlice';
import { hardResetCart } from '@/redux/slices/cartSlice';
import { resetFavorites } from '@/redux/slices/favoritesSlice';
import { userService } from '@/services/userService';
import type { IAddress } from '@/types';
import AppShell, { TopBar } from '@/components/layout/AppShell';
import AddressSheet from '@/components/address/AddressSheet';
import Sheet from '@/components/ui/Sheet';
import LoginModal from '@/components/common/LoginModal';
import { Empty, DishFallback } from '@/components/ui/Bits';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { useLang, useT, money, type Lang } from '@/i18n';
import toast from 'react-hot-toast';

export default function AccountPage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const t = useT();
    const { lang, setLang } = useLang();
    const { isAuthenticated, user } = useAuth();
    const restaurant = useAppSelector((s) => s.menu.restaurant);
    const { items: favItems, refresh: refreshFavorites, loaded: favLoaded } = useFavorites();

    const [addresses, setAddresses] = useState<IAddress[]>(user?.addresses ?? []);
    const [addressOpen, setAddressOpen] = useState(false);
    const [favOpen, setFavOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [showLogin, setShowLogin] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) return;
        userService.getProfile()
            .then((profile) => {
                setAddresses(profile.addresses);
                dispatch(updateUser(profile));
            })
            .catch(() => { /* the cached profile is good enough to render */ });
        if (!favLoaded) refreshFavorites();
    }, [isAuthenticated, dispatch, favLoaded, refreshFavorites]);

    const signOut = () => {
        dispatch(logout());
        dispatch(hardResetCart());
        dispatch(resetFavorites());
        navigate('/');
    };

    if (!isAuthenticated) {
        return (
            <AppShell>
                <TopBar title={t('account.title')} />
                <Empty
                    icon={User}
                    title={t('account.signIn')}
                    body={t('account.signInBody')}
                    action={
                        <button type="button" className="c-btn c-btn--primary" onClick={() => setShowLogin(true)}>
                            {t('account.signIn')}
                        </button>
                    }
                />

                <div className="c-wrap" style={{ marginTop: 8 }}>
                    <RowButton icon={Languages} label={t('account.language')} value={lang === 'hi' ? 'हिन्दी' : 'English'} onClick={() => setLangOpen(true)} />
                </div>

                <LanguageSheet open={langOpen} onClose={() => setLangOpen(false)} lang={lang} setLang={setLang} />
                {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
            </AppShell>
        );
    }

    return (
        <AppShell>
            <TopBar title={t('account.title')} />

            {/* ── Identity ── */}
            <div className="c-wrap" style={{ paddingTop: 16 }}>
                <div className="c-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                        style={{
                            width: 52, height: 52, flex: 'none', borderRadius: 999, display: 'grid', placeItems: 'center',
                            background: 'var(--c-brand-wash)', color: 'var(--c-brand-deep)',
                            font: '800 1.25rem/1 Outfit, sans-serif',
                        }}
                    >
                        {(user?.name?.trim()?.[0] ?? user?.phone?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ font: '800 1.02rem/1.25 Outfit, sans-serif', color: 'var(--c-ink)' }}>
                            {user?.name?.trim() || t('account.guest')}
                        </p>
                        <p style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 5, font: '500 .82rem/1.3 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>
                            <Phone size={12} />
                            {user?.phone}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setProfileOpen(true)}
                        style={{ border: 0, background: 'none', cursor: 'pointer', padding: 4, color: 'var(--c-brand-deep)', font: '700 .8rem/1 "DM Sans", sans-serif' }}
                    >
                        {t('common.save')}
                    </button>
                </div>
            </div>

            {/* ── Menu ── */}
            <div className="c-wrap" style={{ marginTop: 18 }}>
                <RowButton
                    icon={MapPin}
                    label={t('account.addresses')}
                    value={String(addresses.length)}
                    onClick={() => setAddressOpen(true)}
                />
                <RowButton
                    icon={Heart}
                    label={t('account.favourites')}
                    value={String(favItems.length)}
                    onClick={() => setFavOpen(true)}
                />
                <RowButton
                    icon={Languages}
                    label={t('account.language')}
                    value={lang === 'hi' ? 'हिन्दी' : 'English'}
                    onClick={() => setLangOpen(true)}
                />
            </div>

            <div className="c-wrap" style={{ marginTop: 22 }}>
                <button
                    type="button"
                    className="c-btn c-btn--block"
                    style={{ background: 'var(--c-danger-wash)', color: 'var(--c-danger)' }}
                    onClick={signOut}
                >
                    <LogOut size={16} />
                    {t('account.signOut')}
                </button>
            </div>

            {/* ── Sheets ── */}
            <AddressSheet
                open={addressOpen}
                onClose={() => setAddressOpen(false)}
                addresses={addresses}
                restaurant={restaurant}
                onSelect={() => { /* selection is only meaningful at checkout */ }}
                onChanged={(all) => {
                    setAddresses(all);
                    if (user) dispatch(updateUser({ ...user, addresses: all }));
                }}
            />

            <Sheet open={favOpen} onClose={() => setFavOpen(false)} title={t('account.favourites')}>
                {favItems.length === 0 ? (
                    <Empty icon={Heart} title={t('fav.empty')} body={t('fav.emptyBody')} />
                ) : (
                    <div className="c-wrap" style={{ paddingBottom: 20 }}>
                        {favItems.map((item) => (
                            <button
                                key={item._id}
                                type="button"
                                onClick={() => { setFavOpen(false); navigate('/menu'); }}
                                style={{
                                    width: '100%', display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left',
                                    paddingBlock: 12, borderBottom: '1px solid var(--c-line)',
                                    border: 0, borderBottomWidth: 1, borderBottomStyle: 'solid', background: 'none', cursor: 'pointer',
                                }}
                            >
                                <span style={{ width: 48, height: 48, flex: 'none', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface-2)' }}>
                                    {item.image
                                        ? <img src={item.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <DishFallback name={item.name} radius={0} />}
                                </span>
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ display: 'block', font: '700 .88rem/1.3 "DM Sans", sans-serif', color: 'var(--c-ink)' }}>
                                        {item.name}
                                    </span>
                                    <span style={{ display: 'block', font: '800 .84rem/1 Outfit, sans-serif', color: 'var(--c-ink)' }}>
                                        {money(item.price)}
                                    </span>
                                </span>
                                <ChevronRight size={16} style={{ color: 'var(--c-ink-3)', flex: 'none' }} />
                            </button>
                        ))}
                    </div>
                )}
            </Sheet>

            <LanguageSheet open={langOpen} onClose={() => setLangOpen(false)} lang={lang} setLang={setLang} />

            <ProfileSheet
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                name={user?.name ?? ''}
                email={user?.email ?? ''}
                onSaved={(profile) => { dispatch(updateUser(profile)); setProfileOpen(false); }}
            />
        </AppShell>
    );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function RowButton({ icon: Icon, label, value, onClick }: {
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    value?: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                padding: '14px 0', borderBottom: '1px solid var(--c-line)',
                border: 0, borderBottomWidth: 1, borderBottomStyle: 'solid', background: 'none', cursor: 'pointer',
            }}
        >
            <span style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--c-surface-2)', color: 'var(--c-ink-2)' }}>
                <Icon size={16} />
            </span>
            <span style={{ flex: 1, font: '600 .9rem/1.3 "DM Sans", sans-serif', color: 'var(--c-ink)' }}>{label}</span>
            {value && <span style={{ font: '600 .82rem/1 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>{value}</span>}
            <ChevronRight size={16} style={{ color: 'var(--c-ink-3)', flex: 'none' }} />
        </button>
    );
}

function LanguageSheet({ open, onClose, lang, setLang }: {
    open: boolean; onClose: () => void; lang: Lang; setLang: (l: Lang) => void;
}) {
    const t = useT();
    const OPTIONS: { value: Lang; label: string; native: string }[] = [
        { value: 'en', label: 'English', native: 'English' },
        { value: 'hi', label: 'Hindi', native: 'हिन्दी' },
    ];

    return (
        <Sheet open={open} onClose={onClose} title={t('account.language')}>
            <div className="c-wrap" style={{ paddingBottom: 20 }}>
                {OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => { setLang(option.value); onClose(); }}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                            padding: '14px 0', borderBottom: '1px solid var(--c-line)',
                            border: 0, borderBottomWidth: 1, borderBottomStyle: 'solid', background: 'none', cursor: 'pointer',
                        }}
                    >
                        <span style={{ flex: 1, font: '700 .95rem/1.3 "DM Sans", sans-serif', color: 'var(--c-ink)' }}>
                            {option.native}
                        </span>
                        {lang === option.value && <Check size={18} style={{ color: 'var(--c-brand-deep)' }} />}
                    </button>
                ))}
            </div>
        </Sheet>
    );
}

function ProfileSheet({ open, onClose, name, email, onSaved }: {
    open: boolean; onClose: () => void; name: string; email: string;
    onSaved: (profile: Parameters<typeof updateUser>[0]) => void;
}) {
    const t = useT();
    const [draftName, setDraftName] = useState(name);
    const [draftEmail, setDraftEmail] = useState(email);
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (open) { setDraftName(name); setDraftEmail(email); } }, [open, name, email]);

    const save = async () => {
        setSaving(true);
        try {
            const updated = await userService.updateProfile({
                name: draftName.trim(),
                email: draftEmail.trim() || undefined,
            });
            toast.success(t('account.profileSaved'));
            onSaved(updated);
        } catch {
            toast.error(t('common.somethingWrong'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title={t('account.title')}
            footer={
                <button type="button" className="c-btn c-btn--primary c-btn--block" onClick={save} disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : t('common.save')}
                </button>
            }
        >
            <div className="c-wrap" style={{ display: 'grid', gap: 12, paddingBottom: 16 }}>
                <input
                    className="c-field"
                    placeholder={t('account.name')}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    maxLength={60}
                />
                <input
                    className="c-field"
                    type="email"
                    placeholder={`${t('account.email')} (${t('common.optional')})`}
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                    maxLength={120}
                />
            </div>
        </Sheet>
    );
}
