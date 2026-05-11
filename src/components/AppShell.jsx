import React, { useEffect, useMemo, useState, useCallback } from 'react';
import MerkleScene3D from './MerkleScene3D.jsx';
import SceneErrorBoundary from './SceneErrorBoundary.jsx';
import FloatingInputPanel from './FloatingInputPanel.jsx';
import ProofVisualization from './ProofVisualization.jsx';
import InfoModal from './InfoModal.jsx';
import CloningModal from './modals/CloningModal.jsx';
import BlockFetchingModal from './modals/BlockFetchingModal.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import ClickHintToast from './ClickHintToast.jsx';
import TruncationBanner from './TruncationBanner.jsx';
import useAppPhase from '../hooks/useAppPhase.js';
import useVisualization from '../hooks/useVisualization.js';
import useProofClick from '../hooks/useProofClick.js';
import { useT } from '../i18n/index.jsx';

// Detect mobile viewport (used to flip a couple of camera/UI defaults in the
// scene). Kept inline because it's a single boolean with one effect.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

// True if the tree has any collapsed placeholders — drives the Bitcoin
// truncation banner.
function useIsTruncated(treeData) {
  return useMemo(() => {
    if (!treeData) return false;
    function walk(node) {
      if (!node) return false;
      if (node.collapsed) return true;
      return node.children?.some(walk) ?? false;
    }
    return walk(treeData);
  }, [treeData]);
}

export default function AppShell() {
  const t = useT();
  const isMobile = useIsMobile();

  const phase = useAppPhase();
  const viz = useVisualization(t);
  const proof = useProofClick({
    activeSystem: viz.state.activeSystem,
    treeData: viz.state.treeData,
    rootHash: viz.state.rootHash,
    inputValues: viz.state.inputValues,
    t,
  });

  const isTruncated = useIsTruncated(viz.state.treeData);

  // Composite handlers — actions that span hooks need a small bit of wiring.
  const handleSystemChange = useCallback((system) => {
    viz.actions.systemChanged(system);
    proof.clearProof();
  }, [viz.actions, proof]);

  const handleClear = useCallback(() => {
    viz.actions.cleared();
    proof.clearProof();
  }, [viz.actions, proof]);

  const handleBackToLanding = useCallback(() => {
    proof.clearProof();
    phase.backToLanding();
  }, [phase, proof]);

  const handleTransitionComplete = useCallback(() => {
    // Camera transition done — controls are now enabled. Hook for future use.
  }, []);

  const { state, actions, submit, expandCollapsed } = viz;
  const { activeSystem, inputValues, treeData, rootHash, loading, error, neighborBlocks, expandingHashes } = state;

  return (
    <div className="app-shell">
      <div className="scene-container">
        <SceneErrorBoundary>
          <MerkleScene3D
            phase={phase.phase}
            treeData={treeData}
            proofHighlight={proof.proofHighlight}
            onNodeClick={proof.handleNodeClick}
            onExpandCollapsed={expandCollapsed}
            expandingHashes={expandingHashes}
            isMobile={isMobile}
            onTransitionComplete={handleTransitionComplete}
            neighborBlocks={neighborBlocks}
            blockHeight={
              activeSystem.id === 'bitcoin' && inputValues.blockHeight
                ? parseInt(inputValues.blockHeight, 10)
                : activeSystem.id === 'git' && treeData
                  ? (inputValues.commitHash || 'HEAD').substring(0, 7)
                  : null
            }
          />
        </SceneErrorBoundary>
      </div>

      <div className={`hero-overlay ${phase.heroVisible ? 'hero-visible' : 'hero-exit'}`}>
        <div className="hero-content">
          <h1 className="naslov_zavrsnog_rada">
            {t('hero.title_line1')}
            <br />
            {t('hero.title_line2')}
          </h1>

          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 500, opacity: 0.9 }}>
            {t('hero.such_as')}
          </h1>

          <div className="Scroller">
            <span>
              <div style={{
                background: 'linear-gradient(135deg, #f7931a 0%, #ff9500 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Bitcoin</div>
              <div style={{
                background: 'linear-gradient(135deg, #6e5494 0%, #9b59b6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Git</div>
              <div style={{
                background: 'linear-gradient(135deg, #58d033 0%, #7bed9f 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>BitTorrent</div>
            </span>
          </div>

          <p style={{ marginTop: '2rem', fontSize: '1.15rem', maxWidth: '800px' }}>
            {t('hero.description')}
          </p>

          <button onClick={phase.enterExploring} style={{ marginTop: '2rem' }}>
            {t('hero.start')}
          </button>
        </div>

        <div className="main_footer">
          <p>Leo Kocijan &copy; {new Date().getFullYear()}</p>
          <p>{t('footer.rights')}</p>
        </div>
      </div>

      <FloatingInputPanel
        visible={phase.panelVisible}
        activeSystem={activeSystem}
        onSystemChange={handleSystemChange}
        inputValues={inputValues}
        onInputChange={actions.inputChanged}
        onSubmit={submit}
        onClear={handleClear}
        loading={loading}
        error={error}
        rootHash={rootHash}
      />

      {proof.proofData && (
        <div className="proof-panel-floating">
          <ProofVisualization proofData={proof.proofData} onClose={proof.handleCloseProof} />
        </div>
      )}

      <TruncationBanner
        visible={phase.phase === 'exploring' && activeSystem.id === 'bitcoin' && isTruncated}
      />

      <ClickHintToast message={proof.clickHint} />

      {phase.phase === 'exploring' && (
        <button className="back-home-btn" onClick={handleBackToLanding} title={t('buttons.back_home')}>
          &#8592;
        </button>
      )}

      <LanguageSwitcher phase={phase.phase} />

      <button
        className={`info-button ${phase.phase === 'landing' ? 'info-button-landing' : ''}`}
        onClick={() => phase.setShowInfoModal(true)}
        title={t('buttons.about')}
      >
        i
      </button>

      <InfoModal
        open={phase.showInfoModal}
        onClose={() => phase.setShowInfoModal(false)}
        phase={phase.phase}
        activeSystemId={activeSystem.id}
      />

      {loading && /^https?:\/\/|^git@/.test(inputValues.repoPath || '') && (
        <CloningModal repoUrl={inputValues.repoPath} />
      )}

      {loading && activeSystem.id === 'bitcoin' && (inputValues.blockHeight || inputValues.blockHash) && (
        <BlockFetchingModal
          label={
            inputValues.blockHeight
              ? `Block #${inputValues.blockHeight}`
              : `${inputValues.blockHash.substring(0, 16)}...`
          }
        />
      )}

      {phase.phase === 'exploring' && treeData && (
        <div className="controls-hint">
          <div><strong>{t('controls.title')}</strong></div>
          <div>{t('controls.rotate')}</div>
          <div>{t('controls.zoom')}</div>
          <div>{t('controls.pan')}</div>
          <div>{t('controls.proof')}</div>
        </div>
      )}
    </div>
  );
}
