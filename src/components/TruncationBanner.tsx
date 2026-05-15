import React from 'react';
import { useT } from '../i18n/index';

interface TruncationBannerProps {
  visible: boolean;
}

export default function TruncationBanner({ visible }: TruncationBannerProps) {
  const t = useT();
  if (!visible) return null;
  return <div className="truncation-banner">{String(t('proof.banner_truncated'))}</div>;
}
