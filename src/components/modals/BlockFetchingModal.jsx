import React from 'react';
import { useT } from '../../i18n/index.jsx';

export default function BlockFetchingModal({ label }) {
  const t = useT();
  return (
    <div className="info-modal-backdrop">
      <div className="cloning-modal">
        <div className="cloning-spinner" />
        <h3>{t('modals.fetching_title')}</h3>
        <p className="cloning-url">{label}</p>
        <p className="cloning-hint">{t('modals.fetching_hint')}</p>
      </div>
    </div>
  );
}
