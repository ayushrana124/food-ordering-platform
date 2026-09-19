import { createContext, useContext, useCallback, useMemo, useState, useEffect, type ReactNode } from 'react';
import { en, hi, type StringKey } from './strings';

export type Lang = 'en' | 'hi';

const TABLES: Record<Lang, Record<StringKey, string>> = { en, hi };
const STORAGE_KEY = 'bp_lang';

export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

interface LangContextValue {
    lang: Lang;
    setLang: (lang: Lang) => void;
    t: Translate;
}

const LangContext = createContext<LangContextValue | null>(null);

const readStoredLang = (): Lang => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'en' || saved === 'hi') return saved;
        // First visit: follow the device, since a Hindi-locale phone in Noorpur
        // is a strong signal. The toggle in Account overrides this for good.
        if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('hi')) return 'hi';
    } catch {
        // Private mode or blocked storage — English is a safe default.
    }
    return 'en';
};

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(readStoredLang);

    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    const setLang = useCallback((next: Lang) => {
        setLangState(next);
        try { localStorage.setItem(STORAGE_KEY, next); } catch { /* non-fatal */ }
    }, []);

    const t = useCallback<Translate>((key, vars) => {
        const template = TABLES[lang][key] ?? en[key] ?? key;
        if (!vars) return template;
        return template.replace(/\{(\w+)\}/g, (match, name: string) =>
            name in vars ? String(vars[name]) : match
        );
    }, [lang]);

    const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

    return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/**
 * Falls back to English rather than throwing when used outside the provider,
 * so a stray component can never white-screen the app over a missing wrapper.
 */
const FALLBACK: LangContextValue = {
    lang: 'en',
    setLang: () => {},
    t: (key, vars) => {
        const template = en[key] ?? key;
        if (!vars) return template;
        return template.replace(/\{(\w+)\}/g, (m, n: string) => (n in vars ? String(vars[n]) : m));
    },
};

export const useLang = (): LangContextValue => useContext(LangContext) ?? FALLBACK;

/** Convenience for components that only need the translate function. */
export const useT = (): Translate => useLang().t;

/** Indian-format currency, e.g. ₹1,299. Prices here are always whole rupees. */
export const money = (amount: number): string =>
    `₹${Math.round(amount).toLocaleString('en-IN')}`;
