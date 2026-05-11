import React from 'react';
import { useT } from '../i18n/index.jsx';

export default function TruncationBanner({ visible }) {
  const t = useT();
  if (!visible) return null;
  return <div className="truncation-banner">{t('proof.banner_truncated')}</div>;
}
