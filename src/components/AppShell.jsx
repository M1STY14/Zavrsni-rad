import React, { useState, useCallback, useEffect } from 'react';
import MerkleScene3D, { DEMO_TREE } from './MerkleScene3D.jsx';
import FloatingInputPanel from './FloatingInputPanel.jsx';
import ProofVisualization from './ProofVisualization.jsx';
import InfoModal from './InfoModal.jsx';
import { systems } from '../systems/index.js';
import { fetchAdjacentBlocks, expandSubtree } from '../systems/bitcoin.js';
import { fetchAdjacentCommits } from '../systems/git.js';
import { findProofPath, isLeafNode, replaceSubtree } from '../utils/merkle.js';
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

  const handleNodeClick = useCallback((hash) => {
    const currentTree = treeData || DEMO_TREE;
    const currentRoot = rootHash || DEMO_TREE.name;

    if (!isLeafNode(currentTree, hash)) {
      setProofHighlight(null);
      setProofData(null);
      return;
    }

    const { pathHashes, siblingHashes, steps } = findProofPath(currentTree, hash);
    setProofHighlight({ selectedLeaf: hash, pathHashes, siblingHashes });
    setProofData({ selectedLeaf: hash, rootHash: currentRoot, steps });
  }, [treeData, rootHash]);

  const handleCloseProof = () => {
    setProofHighlight(null);
    setProofData(null);
  };

  return (
    <div className="app-shell">
      {/* Full-screen 3D canvas - always mounted */}
      <div className="scene-container">
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
