import React, { useEffect, useMemo, useState, useCallback } from 'react';
import MerkleScene3D from './MerkleScene3D.jsx';
import MerkleScene2D from './MerkleScene2D';
import SceneErrorBoundary from './SceneErrorBoundary';
import FloatingInputPanel from './FloatingInputPanel';
import ProofVisualization from './ProofVisualization';
import InfoModal from './InfoModal';
import CloningModal from './modals/CloningModal';
import BlockFetchingModal from './modals/BlockFetchingModal';
import LanguageSwitcher from './LanguageSwitcher';
import ViewModeToggle, { type ViewMode } from './ViewModeToggle';
import WebGLBanner from './WebGLBanner';
import ClickHintToast from './ClickHintToast';
import TruncationBanner from './TruncationBanner';
import { isWebGLAvailable } from '../utils/webgl';
import useAppPhase from '../hooks/useAppPhase';
import useVisualization from '../hooks/useVisualization';
import useProofClick from '../hooks/useProofClick';
import { useT } from '../i18n/index';
import type { System } from '../types/system';
import type { TreeNode } from '../types/tree';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

function useIsTruncated(treeData: TreeNode | null): boolean {
  return useMemo(() => {
    if (!treeData) return false;
    function walk(node: TreeNode | null | undefined): boolean {
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

  // Detected once: if the browser can't give us a WebGL context, lock to the
  // 2D view. Otherwise the user picks via the 2D/3D toggle (default 3D).
  const [webglAvailable] = useState<boolean>(() => isWebGLAvailable());
  const [viewMode, setViewMode] = useState<ViewMode>(webglAvailable ? '3d' : '2d');
  const effectiveView: ViewMode = webglAvailable ? viewMode : '2d';

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

  const handleSystemChange = useCallback((system: System) => {
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
        {effectiveView === '3d' ? (
          <SceneErrorBoundary onError={() => setViewMode('2d')}>
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
        ) : (
          <MerkleScene2D
            treeData={treeData}
            proofHighlight={proof.proofHighlight}
            onNodeClick={proof.handleNodeClick}
            onExpandCollapsed={expandCollapsed}
            expandingHashes={expandingHashes}
          />
        )}
      </div>

      <div className={`hero-overlay ${phase.heroVisible ? 'hero-visible' : 'hero-exit'}`}>
        <div className="hero-content">
          <h1 className="naslov_zavrsnog_rada">
            {String(t('hero.title_line1'))}
            <br />
            {String(t('hero.title_line2'))}
          </h1>

          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 500, opacity: 0.9 }}>
            {String(t('hero.such_as'))}
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
            {String(t('hero.description'))}
          </p>

          <button onClick={phase.enterExploring} style={{ marginTop: '2rem' }}>
            {String(t('hero.start'))}
          </button>
        </div>

        <div className="main_footer">
          <p>Leo Kocijan &copy; {new Date().getFullYear()}</p>
          <p>{String(t('footer.rights'))}</p>
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
        <button className="back-home-btn" onClick={handleBackToLanding} title={String(t('buttons.back_home'))}>
          &#8592;
        </button>
      )}

      <LanguageSwitcher phase={phase.phase} />

      <ViewModeToggle mode={viewMode} onChange={setViewMode} disabled={!webglAvailable} />

      <WebGLBanner visible={!webglAvailable} />

      <button
        className={`info-button ${phase.phase === 'landing' ? 'info-button-landing' : ''}`}
        onClick={() => phase.setShowInfoModal(true)}
        title={String(t('buttons.about'))}
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
        <CloningModal repoUrl={inputValues.repoPath || ''} />
      )}

      {loading && activeSystem.id === 'bitcoin' && (inputValues.blockHeight || inputValues.blockHash) && (
        <BlockFetchingModal
          label={
            inputValues.blockHeight
              ? `Block #${inputValues.blockHeight}`
              : `${inputValues.blockHash?.substring(0, 16)}...`
          }
        />
      )}

      {phase.phase === 'exploring' && treeData && (
        <div className="controls-hint">
          <div><strong>{String(t('controls.title'))}</strong></div>
          {effectiveView === '3d' ? (
            <>
              <div>{String(t('controls.rotate'))}</div>
              <div>{String(t('controls.zoom'))}</div>
              <div>{String(t('controls.pan'))}</div>
            </>
          ) : (
            <>
              <div>{String(t('controls.zoom2d'))}</div>
              <div>{String(t('controls.pan2d'))}</div>
            </>
          )}
          <div>{String(t('controls.proof'))}</div>
        </div>
      )}
    </div>
  );
}
