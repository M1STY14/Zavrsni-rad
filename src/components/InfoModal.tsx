import React, { useEffect, useState, type ReactNode } from 'react';
import { useT, type TFunction } from '../i18n/index';
import Card from './info/Card';
import Section from './info/Section';
import type { AppPhase } from '../hooks/useAppPhase';
import { useTheme } from '../theme';

const ACCENTS: Record<string, { dark: string; light: string }> = {
  cyan: { dark: '#00d4ff', light: '#026a8c' },
  indigo: { dark: '#667eea', light: '#3f4ba8' },
  bitcoin: { dark: '#f7931a', light: '#a35c00' },
  git: { dark: '#9b7fc6', light: '#6b4fa0' },
  bittorrent: { dark: '#58d033', light: '#3d7f1c' },
  amber: { dark: '#ffd479', light: '#8a4b00' },
  pink: { dark: '#ff6b9f', light: '#b0356a' },
};

const SYSTEM_COLORS: Record<string, string> = {
  general: '#00d4ff',
  bitcoin: '#f7931a',
  git: '#6e5494',
  bittorrent: '#58d033',
};

const TABS = ['general', 'bitcoin', 'git', 'bittorrent'] as const;
type Tab = typeof TABS[number];

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
  phase: AppPhase;
  activeSystemId: string;
}

export default function InfoModal({ open, onClose, phase, activeSystemId }: InfoModalProps) {
  const t = useT();
  const { theme } = useTheme();
  const accentFor = (key: string) => ACCENTS[key]![theme === 'light' ? 'light' : 'dark'];
  const [tab, setTab] = useState<Tab>('general');

  // When the modal opens, default the tab to the active system (general while
  // landing).
  useEffect(() => {
    if (!open) return;
    if (phase === 'exploring' && activeSystemId && (TABS as readonly string[]).includes(activeSystemId)) {
      setTab(activeSystemId as Tab);
    } else {
      setTab('general');
    }
  }, [open, phase, activeSystemId]);

  if (!open) return null;

  return (
    <div className="info-modal-backdrop" onClick={onClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="info-modal-header">
          <h2 className="info-modal-title">{String(t('info.title'))}</h2>
          <button
            className="info-modal-close"
            onClick={onClose}
            title={String(t('buttons.close'))}
            aria-label={String(t('buttons.close'))}
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
              {String(t(`info.tabs.${id}`))}
            </button>
          ))}
        </div>

        <div className="info-modal-body">
          {tab === 'general' && <GeneralTab t={t} accentFor={accentFor} />}
          {tab === 'bitcoin' && <SystemTab t={t} system="bitcoin" accent={accentFor('bitcoin')} title="Bitcoin" />}
          {tab === 'git' && <SystemTab t={t} system="git" accent={accentFor('git')} title="Git" />}
          {tab === 'bittorrent' && <SystemTab t={t} system="bittorrent" accent={accentFor('bittorrent')} title="BitTorrent" />}
        </div>

        <div className="info-modal-footer">
          <p>Leo Kocijan © {new Date().getFullYear()}</p>
          <p>{String(t('info.footer_line2'))}</p>
        </div>
      </div>
    </div>
  );
}

interface TabProps {
  t: TFunction;
}

function GeneralTab({ t, accentFor }: TabProps & { accentFor: (key: string) => string }) {
  const cards: Array<{ accent: string; title: ReactNode; body: ReactNode }> = [
    { accent: accentFor('cyan'), title: t('info.general.what_is_merkle_title') as ReactNode, body: t('info.general.what_is_merkle') as ReactNode },
    { accent: accentFor('indigo'), title: t('info.general.what_app_does_title') as ReactNode, body: t('info.general.what_app_does') as ReactNode },
    { accent: accentFor('bitcoin'), title: t('info.general.three_systems_title') as ReactNode, body: t('info.general.three_systems') as ReactNode },
    { accent: accentFor('git'), title: t('info.general.tree_vs_dag_title') as ReactNode, body: t('info.general.tree_vs_dag') as ReactNode },
    { accent: accentFor('bittorrent'), title: t('info.general.architecture_title') as ReactNode, body: t('info.general.architecture') as ReactNode },
    { accent: accentFor('amber'), title: t('info.general.merkle_core_title') as ReactNode, body: t('info.general.merkle_core') as ReactNode },
    { accent: accentFor('pink'), title: t('info.general.scene_proof_title') as ReactNode, body: t('info.general.scene_proof') as ReactNode },
  ];
  return (
    <div className="info-cards-grid">
      {cards.map((c, i) => (
        <Card key={i} accent={c.accent} title={c.title}>{c.body}</Card>
      ))}
    </div>
  );
}

interface SystemTabProps extends TabProps {
  system: 'bitcoin' | 'git' | 'bittorrent';
  accent: string;
  title: string;
}

function SystemTab({ t, system, accent, title }: SystemTabProps) {
  const sections = ['overview', 'endpoints', 'dataflow', 'limitations', 'proof'] as const;
  return (
    <Card accent={accent} title={title}>
      {sections.map((s) => (
        <Section key={s} title={String(t(`info.sections.${s}`))}>
          {t(`info.${system}.${s}`) as ReactNode}
        </Section>
      ))}
    </Card>
  );
}
