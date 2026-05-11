import React, { useEffect, useState } from 'react';
import { useT } from '../i18n/index.jsx';
import Card from './info/Card.jsx';
import Section from './info/Section.jsx';

const SYSTEM_COLORS = {
  general: '#00d4ff',
  bitcoin: '#f7931a',
  git: '#6e5494',
  bittorrent: '#58d033',
};

const TABS = ['general', 'bitcoin', 'git', 'bittorrent'];

export default function InfoModal({ open, onClose, phase, activeSystemId }) {
  const t = useT();
  const [tab, setTab] = useState('general');

  // When the modal opens, default the tab to the active system (general while
  // landing).
  useEffect(() => {
    if (!open) return;
    setTab(phase === 'exploring' && activeSystemId ? activeSystemId : 'general');
  }, [open, phase, activeSystemId]);

  if (!open) return null;

  return (
    <div className="info-modal-backdrop" onClick={onClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="info-modal-header">
          <h2 className="info-modal-title">{t('info.title')}</h2>
          <button
            className="info-modal-close"
            onClick={onClose}
            title={t('buttons.close')}
            aria-label={t('buttons.close')}
          >
            &times;
          </button>
        </div>

        <div className="info-modal-tabs" role="tablist">
          {TABS.map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={`info-modal-tab ${tab === id ? 'info-modal-tab-active' : ''}`}
              onClick={() => setTab(id)}
              style={
                tab === id
                  ? {
                      borderColor: SYSTEM_COLORS[id],
                      color: SYSTEM_COLORS[id],
                      background: `${SYSTEM_COLORS[id]}1f`,
                    }
                  : undefined
              }
            >
              {t(`info.tabs.${id}`)}
            </button>
          ))}
        </div>

        <div className="info-modal-body">
          {tab === 'general' && <GeneralTab t={t} />}
          {tab === 'bitcoin' && <SystemTab t={t} system="bitcoin" accent="#f7931a" title="Bitcoin" />}
          {tab === 'git' && <SystemTab t={t} system="git" accent="#9b7fc6" title="Git" />}
          {tab === 'bittorrent' && <SystemTab t={t} system="bittorrent" accent="#58d033" title="BitTorrent" />}

          <a
            href="https://github.com/"
            onClick={(e) => e.preventDefault()}
            className="info-doc-link"
            title="ARCHITECTURE.md"
          >
            {t('info.full_doc_link')}
          </a>
        </div>

        <div className="info-modal-footer">
          <p>{t('info.footer_line1')}</p>
          <p>{t('info.footer_line2')}</p>
        </div>
      </div>
    </div>
  );
}

// General tab — four cards explaining what a Merkle tree is, what the app does,
// the three systems, and how a binary Merkle tree differs from a Merkle DAG.
function GeneralTab({ t }) {
  const cards = [
    { accent: '#00d4ff', title: t('info.general.what_is_merkle_title'), body: t('info.general.what_is_merkle') },
    { accent: '#667eea', title: t('info.general.what_app_does_title'), body: t('info.general.what_app_does') },
    { accent: '#f7931a', title: t('info.general.three_systems_title'), body: t('info.general.three_systems') },
    { accent: '#9b7fc6', title: t('info.general.tree_vs_dag_title'), body: t('info.general.tree_vs_dag') },
  ];
  return (
    <>
      {cards.map((c, i) => (
        <Card key={i} accent={c.accent} title={c.title}>{c.body}</Card>
      ))}
    </>
  );
}

// System tab — one card with four standard sections sourced from the dict.
function SystemTab({ t, system, accent, title }) {
  const sections = ['overview', 'dataflow', 'limitations', 'proof'];
  return (
    <Card accent={accent} title={title}>
      {sections.map((s) => (
        <Section key={s} title={t(`info.sections.${s}`)}>
          {t(`info.${system}.${s}`)}
        </Section>
      ))}
    </Card>
  );
}
