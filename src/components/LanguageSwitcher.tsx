import React from 'react';
import { useLang, useT } from '../i18n/index';
import type { AppPhase } from '../hooks/useAppPhase';

const LABELS: Record<string, string> = { en: 'EN', hr: 'HR' };

interface LanguageSwitcherProps {
  phase: AppPhase;
}

export default function LanguageSwitcher({ phase }: LanguageSwitcherProps) {
  const { lang, setLang, langs } = useLang();
  const t = useT();
  return (
    <select
      className={`lang-select ${phase === 'landing' ? 'lang-select-landing' : ''}`}
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      title={String(t('buttons.language'))}
      aria-label={String(t('buttons.language'))}
    >
      {langs.map((l) => (
        <option key={l} value={l}>{LABELS[l] || l.toUpperCase()}</option>
      ))}
    </select>
  );
}
