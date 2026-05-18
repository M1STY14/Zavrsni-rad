import React from 'react';
import { useT } from '../../i18n/index';

interface CloningModalProps {
  repoUrl: string;
}

export default function CloningModal({ repoUrl }: CloningModalProps) {
  const t = useT();
  return (
    <div className="info-modal-backdrop">
      <div className="cloning-modal">
        <div className="cloning-spinner" />
        <h3>{String(t('modals.cloning_title'))}</h3>
        <p className="cloning-url">{repoUrl}</p>
        <p className="cloning-hint">{String(t('modals.cloning_hint'))}</p>
      </div>
    </div>
  );
}
