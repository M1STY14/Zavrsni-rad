import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.js';
import hr from './hr.js';

const DICTS = { en, hr };
const STORAGE_KEY = 'merkle.lang';
const LANGS = ['en', 'hr'];

const LanguageContext = createContext(null);

function readStoredLang() {
    if (typeof window === 'undefined') return 'en';
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored && LANGS.includes(stored)) return stored;
    } catch {
        // ignore — localStorage unavailable
    }
    return 'en';
}

// Walk a dotted key like 'panel.title' into the dictionary.
function resolveKey(dict, key) {
    const parts = key.split('.');
    let cur = dict;
    for (const part of parts) {
        if (cur == null) return undefined;
        cur = cur[part];
    }
    return cur;
}

export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState(readStoredLang);

    const setLang = (next) => {
        if (!LANGS.includes(next)) return;
        setLangState(next);
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

    const value = useMemo(() => {
        const dict = DICTS[lang] || DICTS.en;
        const t = (key, ...args) => {
            const v = resolveKey(dict, key);
            if (v === undefined) {
                // Fallback to English if translation missing
                const fallback = resolveKey(DICTS.en, key);
                if (typeof fallback === 'function') return fallback(...args);
                return fallback ?? key;
            }
            if (typeof v === 'function') return v(...args);
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

export function useLang() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
    return ctx;
}

export function useT() {
    return useLang().t;
}
