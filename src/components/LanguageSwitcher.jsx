import React from 'react';
import { useLang, useT } from '../i18n/index.jsx';

const LABELS = { en: 'EN', hr: 'HR' };

export default function LanguageSwitcher({ phase }) {
  const { lang, setLang, langs } = useLang();
  const t = useT();
  return (
    <select
      className={`lang-select ${phase === 'landing' ? 'lang-select-landing' : ''}`}
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      title={t('buttons.language')}
      aria-label={t('buttons.language')}
    >
      {langs.map((l) => (
        <option key={l} value={l}>{LABELS[l] || l.toUpperCase()}</option>
      ))}
    </select>
  );
}
