import React, { useState, useCallback, useEffect } from 'react';
import MerkleScene3D, { DEMO_TREE } from './MerkleScene3D.jsx';
import FloatingInputPanel from './FloatingInputPanel.jsx';
import ProofVisualization from './ProofVisualization.jsx';
import InfoModal from './InfoModal.jsx';
import { systems } from '../systems/index.js';
import { fetchAdjacentBlocks } from '../systems/bitcoin.js';
import { findProofPath, isLeafNode } from '../utils/merkle.js';

export default function AppShell() {
  // App phase
  const [phase, setPhase] = useState('landing');
  const [heroVisible, setHeroVisible] = useState(true);
  const [panelVisible, setPanelVisible] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Visualization state (from Visualizations.jsx)
  const [activeSystem, setActiveSystem] = useState(systems[0]);
  const [inputValues, setInputValues] = useState({});
  const [rootHash, setRootHash] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [proofHighlight, setProofHighlight] = useState(null);
  const [proofData, setProofData] = useState(null);
  const [neighborBlocks, setNeighborBlocks] = useState([]);

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
    // Panel slides in after a short delay
    setTimeout(() => setPanelVisible(true), 400);
  };

  // Transition back to landing
  const handleBackToLanding = () => {
    setPanelVisible(false);
    setProofData(null);
    setProofHighlight(null);
    setPhase('landing');
    // Hero fades back in after camera transition starts
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
  };

  const handleInputChange = (key, value) => {
    setInputValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!activeSystem.validate(inputValues)) {
      setError('Please fill in at least one input field.');
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

      // Fetch adjacent blocks for Bitcoin block height queries
      if (activeSystem.id === 'bitcoin' && inputValues.blockHeight) {
        const height = parseInt(inputValues.blockHeight);
        fetchAdjacentBlocks(height).then(setNeighborBlocks);
      } else {
        setNeighborBlocks([]);
      }
    } catch (err) {
      console.error('Error fetching tree:', err);
      setError(err.message || 'Error connecting to server');
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
  };

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
          isMobile={isMobile}
          onTransitionComplete={handleTransitionComplete}
          neighborBlocks={neighborBlocks}
          blockHeight={activeSystem.id === 'bitcoin' && inputValues.blockHeight ? parseInt(inputValues.blockHeight) : null}
        />
      </div>

      {/* Hero content overlay (landing phase) */}
      <div className={`hero-overlay ${heroVisible ? 'hero-visible' : 'hero-exit'}`}>
        <div className="hero-content">
          <h1 className="naslov_zavrsnog_rada">
            Vizualizacija Merkle stabla
            <br />
            u stvarnim sustavima
          </h1>

          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 500, opacity: 0.9 }}>
            kao sto su:
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
            Ova aplikacija vizualizira Merkle stablo koristeci React i Three.js.
            Istrazi kako se Merkle stabla koriste u modernim distribuiranim sustavima
            za osiguravanje integriteta podataka.
          </p>

          <button onClick={handleStartExploring} style={{ marginTop: '2rem' }}>
            Pocni istrazivati
          </button>
        </div>

        <div className="main_footer">
          <p>Leo Kocijan &copy; 2025</p>
          <p>All rights reserved.</p>
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
        <button className="back-home-btn" onClick={handleBackToLanding} title="Back to Home">
          &#8592;
        </button>
      )}

      {/* Info button */}
      <button
        className={`info-button ${phase === 'landing' ? 'info-button-landing' : ''}`}
        onClick={() => setShowInfoModal(true)}
        title="About this project"
      >
        i
      </button>

      {/* Info modal */}
      <InfoModal open={showInfoModal} onClose={() => setShowInfoModal(false)} />

      {/* Controls hint (exploring phase with tree) */}
      {phase === 'exploring' && treeData && (
        <div className="controls-hint">
          <div><strong>Controls:</strong></div>
          <div>Click & Drag - Rotate</div>
          <div>Scroll - Zoom</div>
          <div>Click Leaf - Show Proof</div>
        </div>
      )}
    </div>
  );
}
