import React, { useState, useCallback, useEffect, useMemo } from 'react';
import MerkleScene3D, { DEMO_TREE } from './MerkleScene3D.jsx';
import SceneErrorBoundary from './SceneErrorBoundary.jsx';
import FloatingInputPanel from './FloatingInputPanel.jsx';
import ProofVisualization from './ProofVisualization.jsx';
import InfoModal from './InfoModal.jsx';
import { systems } from '../systems/index.js';
import { fetchAdjacentBlocks, expandSubtree } from '../systems/bitcoin.js';
import { fetchAdjacentCommits } from '../systems/git.js';
import { findNode, replaceSubtree } from '../utils/merkle.js';
import { verifyBinaryMerkleProof, verifyBitcoinMerkleProof, verifyGitProof } from '../utils/proof-verifier.js';
import { useLang, useT } from '../i18n/index.jsx';

function CloningModal({ repoUrl }) {
  const t = useT();
  return (
    <div className="info-modal-backdrop">
      <div className="cloning-modal">
        <div className="cloning-spinner" />
        <h3>{t('modals.cloning_title')}</h3>
        <p className="cloning-url">{repoUrl}</p>
        <p className="cloning-hint">{t('modals.cloning_hint')}</p>
      </div>
    </div>
  );
}

function BlockFetchingModal({ label }) {
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

function LanguageSwitcher({ phase }) {
  const { lang, setLang, langs } = useLang();
  const t = useT();
  const labels = { en: 'EN', hr: 'HR' };
  return (
    <select
      className={`lang-select ${phase === 'landing' ? 'lang-select-landing' : ''}`}
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      title={t('buttons.language')}
      aria-label={t('buttons.language')}
    >
      {langs.map((l) => (
        <option key={l} value={l}>{labels[l] || l.toUpperCase()}</option>
      ))}
    </select>
  );
}

export default function AppShell() {
  const t = useT();

  // App phase
  const [phase, setPhase] = useState('landing');
  const [heroVisible, setHeroVisible] = useState(true);
  const [panelVisible, setPanelVisible] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Visualization state
  const [activeSystem, setActiveSystem] = useState(systems[0]);
  const [inputValues, setInputValues] = useState({});
  const [rootHash, setRootHash] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [proofHighlight, setProofHighlight] = useState(null);
  const [proofData, setProofData] = useState(null);
  const [clickHint, setClickHint] = useState(null);
  const [neighborBlocks, setNeighborBlocks] = useState([]);
  const [expandingHashes, setExpandingHashes] = useState(() => new Set());

  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Transition to exploring
  const handleStartExploring = () => {
    setPhase('exploring');
    setHeroVisible(false);
    setTimeout(() => setPanelVisible(true), 400);
  };

  // Transition back to landing
  const handleBackToLanding = () => {
    setPanelVisible(false);
    setProofData(null);
    setProofHighlight(null);
    setPhase('landing');
    setTimeout(() => setHeroVisible(true), 600);
  };

  const handleTransitionComplete = useCallback(() => {
    // Camera transition done — controls are now enabled
  }, []);

  // System handlers
  const handleSystemChange = (system) => {
    setActiveSystem(system);
    setInputValues({});
    setTreeData(null);
    setRootHash(null);
    setError(null);
    setProofHighlight(null);
    setProofData(null);
    setNeighborBlocks([]);
    setExpandingHashes(new Set());
  };

  const handleInputChange = (key, value) => {
    setInputValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!activeSystem.validate(inputValues)) {
      setError(t('errors.fill_one'));
      return;
    }

    setLoading(true);
    setError(null);
    setProofHighlight(null);
    setProofData(null);

    try {
      const result = await activeSystem.fetchTree(inputValues);
      setTreeData(result.tree);
      setRootHash(result.rootHash);

      if (activeSystem.id === 'bitcoin' && inputValues.blockHeight) {
        const height = parseInt(inputValues.blockHeight);
        fetchAdjacentBlocks(height).then(setNeighborBlocks);
      } else if (activeSystem.id === 'git') {
        const commitSha = result.rootHash;
        const repoPath = inputValues.repoPath || '.';
        fetchAdjacentCommits(commitSha, repoPath).then(neighbors => {
          setNeighborBlocks(neighbors.map(n => ({
            height: n.label,
            tree: n.tree,
            rootHash: n.rootHash,
            side: n.side,
          })));
        });
      } else {
        setNeighborBlocks([]);
      }
    } catch (err) {
      console.error('Error fetching tree:', err);
      setError(err.message || t('errors.server'));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInputValues({});
    setTreeData(null);
    setRootHash(null);
    setError(null);
    setProofHighlight(null);
    setProofData(null);
    setNeighborBlocks([]);
    setExpandingHashes(new Set());
  };

  const handleExpandCollapsed = useCallback(async (parentHash) => {
    if (!rootHash || activeSystem.id !== 'bitcoin') return;
    setExpandingHashes(prev => {
      const next = new Set(prev);
      next.add(parentHash);
      return next;
    });
    try {
      const subtree = await expandSubtree(rootHash, parentHash);
      setTreeData(prev => replaceSubtree(prev, parentHash, subtree));
    } catch (err) {
      console.error('Error expanding subtree:', err);
      setError(err.message || 'Failed to expand subtree.');
    } finally {
      setExpandingHashes(prev => {
        const next = new Set(prev);
        next.delete(parentHash);
        return next;
      });
    }
  }, [rootHash, activeSystem.id]);

  const handleNodeClick = useCallback(async (hash) => {
    const currentTree = treeData || DEMO_TREE;
    const currentRoot = rootHash || DEMO_TREE.name;

    const node = findNode(currentTree, hash);
    const isRealLeaf = node && !node.children?.length && !node.collapsed && node.value !== undefined;
    if (!isRealLeaf) {
      setProofHighlight(null);
      setProofData(null);
      // Tell the user why nothing happened. Max-depth placeholders carry a
      // "/ (max depth)" sentinel value from buildGitTree; everything else
      // with children is just an internal node.
      const isMaxDepth = typeof node?.value === 'string' && node.value.endsWith('(max depth)');
      setClickHint(isMaxDepth ? t('proof.hint_max_depth') : t('proof.hint_internal_node'));
      return;
    }
    setClickHint(null);

    // Git: server walks tree DAG with git's hash rules, client re-hashes each
    // tree's binary serialization with SHA-1 to verify byte-correctness.
    if (activeSystem.id === 'git') {
      try {
        if (!node.path) {
          throw new Error('Selected leaf has no path metadata.');
        }
        const res = await fetch('/api/git/proof', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoPath: inputValues.repoPath || '',
            commitRef: inputValues.commitHash || 'HEAD',
            blobPath: node.path,
          }),
        });
        const proof = await res.json();
        if (!res.ok) throw new Error(proof.error || 'Proof generation failed.');

        const verification = await verifyGitProof(proof);

        const pathHashes = new Set([hash, ...proof.treeChain.map(t => t.sha), proof.commit.sha]);
        setProofHighlight({ selectedLeaf: hash, pathHashes, siblingHashes: new Set() });
        setProofData({
          kind: 'git-tree',
          proof,
          checks: verification.checks,
          verified: verification.ok,
          verifyReason: verification.reason,
        });
      } catch (err) {
        console.error('Git proof error:', err);
        setProofHighlight(null);
        setProofData({
          kind: 'git-tree',
          proof: { blob: { path: node.path || '?' }, commit: { sha: '' }, treeChain: [] },
          checks: [],
          verified: false,
          verifyReason: err.message,
        });
      }
      return;
    }

    // Bitcoin / BitTorrent: ask the server for an authoritative proof, then
    // re-run the hash chain locally with Web Crypto so the green check is real.
    try {
      const endpoint = activeSystem.id === 'bitcoin'
        ? '/api/bitcoin/proof'
        : '/api/bittorrent/proof';
      const body = activeSystem.id === 'bitcoin'
        ? { rootHash: currentRoot, txid: node.value }
        : { rootHash: currentRoot, pieceHash: node.value };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const proof = await res.json();
      if (!res.ok) throw new Error(proof.error || 'Proof generation failed.');

      const verification = proof.kind === 'bitcoin-merkle'
        ? await verifyBitcoinMerkleProof(proof)
        : await verifyBinaryMerkleProof(proof);

      const pathHashes = new Set([proof.leaf.hash, ...proof.steps.map(s => s.parentHash)]);
      const siblingHashes = new Set(proof.steps.map(s => s.siblingHash));

      setProofHighlight({ selectedLeaf: proof.leaf.hash, pathHashes, siblingHashes });
      setProofData({
        selectedLeaf: proof.leaf.hash,
        rootHash: proof.rootHash,
        steps: proof.steps,
        verified: verification.ok,
        verifyReason: verification.reason,
      });
    } catch (err) {
      console.error('Proof error:', err);
      setProofHighlight(null);
      setProofData({
        selectedLeaf: hash,
        rootHash: currentRoot,
        steps: [],
        verified: false,
        verifyReason: err.message,
      });
    }
  }, [treeData, rootHash, activeSystem.id, inputValues.repoPath, inputValues.commitHash, t]);

  // Auto-dismiss the click hint after a few seconds.
  useEffect(() => {
    if (!clickHint) return;
    const id = setTimeout(() => setClickHint(null), 3500);
    return () => clearTimeout(id);
  }, [clickHint]);

  // A tree is truncated when any of its descendants is a `collapsed: true`
  // placeholder. Drives the "click `… more` to drill deeper" banner.
  const isTruncated = useMemo(() => {
    if (!treeData) return false;
    function walk(node) {
      if (!node) return false;
      if (node.collapsed) return true;
      return node.children?.some(walk) ?? false;
    }
    return walk(treeData);
  }, [treeData]);

  const handleCloseProof = () => {
    setProofHighlight(null);
    setProofData(null);
  };

  return (
    <div className="app-shell">
      {/* Full-screen 3D canvas - always mounted */}
      <div className="scene-container">
        <SceneErrorBoundary>
          <MerkleScene3D
            phase={phase}
            treeData={treeData}
            proofHighlight={proofHighlight}
            onNodeClick={handleNodeClick}
            onExpandCollapsed={handleExpandCollapsed}
            expandingHashes={expandingHashes}
            isMobile={isMobile}
            onTransitionComplete={handleTransitionComplete}
            neighborBlocks={neighborBlocks}
            blockHeight={
              activeSystem.id === 'bitcoin' && inputValues.blockHeight
                ? parseInt(inputValues.blockHeight)
                : activeSystem.id === 'git' && treeData
                  ? (inputValues.commitHash || 'HEAD').substring(0, 7)
                  : null
            }
          />
        </SceneErrorBoundary>
      </div>

      {/* Hero content overlay (landing phase) */}
      <div className={`hero-overlay ${heroVisible ? 'hero-visible' : 'hero-exit'}`}>
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
                backgroundClip: 'text'
              }}>Bitcoin</div>
              <div style={{
                background: 'linear-gradient(135deg, #6e5494 0%, #9b59b6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>Git</div>
              <div style={{
                background: 'linear-gradient(135deg, #58d033 0%, #7bed9f 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>BitTorrent</div>
            </span>
          </div>

          <p style={{ marginTop: '2rem', fontSize: '1.15rem', maxWidth: '800px' }}>
            {t('hero.description')}
          </p>

          <button onClick={handleStartExploring} style={{ marginTop: '2rem' }}>
            {t('hero.start')}
          </button>
        </div>

        <div className="main_footer">
          <p>Leo Kocijan &copy; {new Date().getFullYear()}</p>
          <p>{t('footer.rights')}</p>
        </div>
      </div>

      {/* Floating input panel (exploring phase) */}
      <FloatingInputPanel
        visible={panelVisible}
        activeSystem={activeSystem}
        onSystemChange={handleSystemChange}
        inputValues={inputValues}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        onClear={handleClear}
        loading={loading}
        error={error}
        rootHash={rootHash}
      />

      {/* Proof panel (right side) */}
      {proofData && (
        <div className="proof-panel-floating">
          <ProofVisualization proofData={proofData} onClose={handleCloseProof} />
        </div>
      )}

      {/* Truncation banner — shown when a Bitcoin block is too deep to render
          fully and the user needs to drill via "… more" placeholders. */}
      {phase === 'exploring' && activeSystem.id === 'bitcoin' && isTruncated && (
        <div className="truncation-banner" style={{
          position: 'fixed',
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '0.6rem 1.1rem',
          borderRadius: '0.5rem',
          background: 'rgba(20, 20, 20, 0.92)',
          color: '#eee',
          fontSize: '0.88rem',
          maxWidth: 'min(640px, calc(100vw - 2rem))',
          textAlign: 'center',
          border: '1px solid rgba(247, 147, 26, 0.4)',
          backdropFilter: 'blur(8px)',
          zIndex: 30,
          pointerEvents: 'none',
        }}>
          {t('proof.banner_truncated')}
        </div>
      )}

      {/* Click hint toast — shows briefly when a click can't produce a proof. */}
      {clickHint && (
        <div className="click-hint-toast" style={{
          position: 'fixed',
          bottom: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '0.65rem 1.1rem',
          borderRadius: '0.5rem',
          background: 'rgba(20, 20, 20, 0.94)',
          color: '#eee',
          fontSize: '0.9rem',
          maxWidth: 'min(560px, calc(100vw - 2rem))',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(8px)',
          zIndex: 40,
          pointerEvents: 'none',
        }}>
          {clickHint}
        </div>
      )}

      {/* Back to home button (exploring phase) */}
      {phase === 'exploring' && (
        <button className="back-home-btn" onClick={handleBackToLanding} title={t('buttons.back_home')}>
          &#8592;
        </button>
      )}

      {/* Language switcher (left of info button) */}
      <LanguageSwitcher phase={phase} />

      {/* Info button */}
      <button
        className={`info-button ${phase === 'landing' ? 'info-button-landing' : ''}`}
        onClick={() => setShowInfoModal(true)}
        title={t('buttons.about')}
      >
        i
      </button>

      {/* Info modal */}
      <InfoModal
        open={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        phase={phase}
        activeSystemId={activeSystem.id}
      />

      {/* Cloning progress modal */}
      {loading && /^https?:\/\/|^git@/.test(inputValues.repoPath || '') && (
        <CloningModal repoUrl={inputValues.repoPath} />
      )}

      {/* Bitcoin block fetching modal */}
      {loading && activeSystem.id === 'bitcoin' && (inputValues.blockHeight || inputValues.blockHash) && (
        <BlockFetchingModal
          label={
            inputValues.blockHeight
              ? `Block #${inputValues.blockHeight}`
              : `${inputValues.blockHash.substring(0, 16)}...`
          }
        />
      )}

      {/* Controls hint (exploring phase with tree) */}
      {phase === 'exploring' && treeData && (
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
