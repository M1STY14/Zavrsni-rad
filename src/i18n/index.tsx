import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import en from './en';
import hr from './hr';

type Dict = Record<string, unknown>;
const DICTS: Record<string, Dict> = { en, hr };
const STORAGE_KEY = 'merkle.lang';
const LANGS = ['en', 'hr'] as const;
export type Lang = typeof LANGS[number];

// `t` returns whatever the dict has at that key: a string, a function (which
// is invoked with the trailing args), JSX, or undefined. Callers cast or
// String() at the use site as needed.
export type TFunction = (key: string, ...args: unknown[]) => unknown;

export interface LangApi {
    lang: Lang;
    setLang: (next: string) => void;
    t: TFunction;
    dict: Dict;
    langs: readonly Lang[];
}

const LanguageContext = createContext<LangApi | null>(null);

function readStoredLang(): Lang {
    if (typeof window === 'undefined') return 'en';
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored && (LANGS as readonly string[]).includes(stored)) return stored as Lang;
    } catch {
        // ignore — localStorage unavailable
    }
    return 'en';
}

// Walk a dotted key like 'panel.title' into the dictionary.
function resolveKey(dict: Dict | undefined, key: string): unknown {
    const parts = key.split('.');
    let cur: unknown = dict;
    for (const part of parts) {
        if (cur == null) return undefined;
        cur = (cur as Record<string, unknown>)[part];
    }
    return cur;
}

interface LanguageProviderProps {
    children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
    const [lang, setLangState] = useState<Lang>(readStoredLang);

    const setLang = (next: string) => {
        if (!(LANGS as readonly string[]).includes(next)) return;
        setLangState(next as Lang);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = lang;
        }
    }, [lang]);

    const value = useMemo<LangApi>(() => {
        const dict = DICTS[lang] || DICTS.en!;
        const t: TFunction = (key, ...args) => {
            const v = resolveKey(dict, key);
            if (v === undefined) {
                const fallback = resolveKey(DICTS.en, key);
                if (typeof fallback === 'function') return (fallback as (...a: unknown[]) => unknown)(...args);
                return fallback ?? key;
            }
            if (typeof v === 'function') return (v as (...a: unknown[]) => unknown)(...args);
            return v;
        };
        return { lang, setLang, t, dict, langs: LANGS };
    }, [lang]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLang(): LangApi {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
    return ctx;
}

export function useT(): TFunction {
    return useLang().t;
}
