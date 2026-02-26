import React, { useState, useCallback } from 'react';
import '../App.css';
import TreeVisualization2D from '../components/TreeVisualization2D.jsx';
import TreeVisualization3D from '../components/TreeVisualization3D.jsx';
import ProofVisualization from '../components/ProofVisualization.jsx';
import { systems } from '../systems/index.js';
import { findProofPath, isLeafNode } from '../utils/merkle.js';

const Visualizations = () => {
    const [activeSystem, setActiveSystem] = useState(systems[0]);
    const [inputValues, setInputValues] = useState({});
    const [rootHash, setRootHash] = useState(null);
    const [treeData, setTreeData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [view3D, setView3D] = useState(true);
    const [proofHighlight, setProofHighlight] = useState(null);
    const [proofData, setProofData] = useState(null);

    const handleSystemChange = (system) => {
        setActiveSystem(system);
        setInputValues({});
        setTreeData(null);
        setRootHash(null);
        setError(null);
        setProofHighlight(null);
        setProofData(null);
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
    };

    const handleNodeClick = useCallback((hash) => {
        if (!treeData) return;

        // Only generate proof for leaf nodes
        if (!isLeafNode(treeData, hash)) {
            setProofHighlight(null);
            setProofData(null);
            return;
        }

        const { pathHashes, siblingHashes, steps } = findProofPath(treeData, hash);

        setProofHighlight({
            selectedLeaf: hash,
            pathHashes,
            siblingHashes,
        });

        setProofData({
            selectedLeaf: hash,
            rootHash,
            steps,
        });
    }, [treeData, rootHash]);

    const handleCloseProof = () => {
        setProofHighlight(null);
        setProofData(null);
    };

    return (
        <>
            <div className="text_section" style={{ minHeight: 'auto', paddingTop: '140px', paddingBottom: '40px' }}>
                <h1 style={{ marginBottom: '0.5rem' }}>Merkle Tree Visualizations</h1>
                <p style={{ fontSize: '1rem', opacity: 0.8 }}>
                    Explore Merkle trees across different real-world systems
                </p>
            </div>

            {/* System Tabs */}
            <div className="system-tabs">
                {systems.map(system => (
                    <button
                        key={system.id}
                        className={`system-tab ${activeSystem.id === system.id ? 'system-tab-active' : ''}`}
                        onClick={() => handleSystemChange(system)}
                        style={{
                            '--system-color': system.color,
                            borderColor: activeSystem.id === system.id ? system.color : 'transparent',
                        }}
                    >
                        <span className="system-tab-icon">{system.icon}</span>
                        <span className="system-tab-name">{system.name}</span>
                    </button>
                ))}
            </div>

            {/* Input Panel */}
            <div className="InputContainer">
                <div className="system-hint" style={{ borderColor: `${activeSystem.color}33`, background: `${activeSystem.color}14` }}>
                    <strong>{activeSystem.name}:</strong> {activeSystem.hint}
                </div>

                <div className="system-inputs">
                    {activeSystem.inputs.map(input => (
                        <label key={input.key}>
                            {input.label}
                            <input
                                type={input.type}
                                value={inputValues[input.key] || ''}
                                onChange={(e) => handleInputChange(input.key, e.target.value)}
                                placeholder={input.placeholder}
                            />
                        </label>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button onClick={handleSubmit} disabled={loading} style={{ background: `linear-gradient(135deg, ${activeSystem.color} 0%, ${activeSystem.color}cc 100%)` }}>
                        {loading ? 'Loading...' : 'Generate Tree'}
                    </button>
                    <button onClick={handleClear} style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                        border: '2px solid rgba(255,255,255,0.2)',
                    }}>
                        Clear
                    </button>
                    <button
                        onClick={() => setView3D(!view3D)}
                        style={{
                            background: view3D
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : 'linear-gradient(135deg, rgba(102,126,234,0.3) 0%, rgba(118,75,162,0.3) 100%)',
                            border: '2px solid rgba(102,126,234,0.5)',
                        }}
                    >
                        {view3D ? '3D View' : '2D View'}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    padding: '1rem 2rem', background: 'rgba(255, 100, 100, 0.15)',
                    border: '2px solid rgba(255, 100, 100, 0.3)', borderRadius: '12px',
                    color: '#ff6b6b', maxWidth: '600px', margin: '2rem auto',
                }}>
                    {error}
                </div>
            )}

            {/* Root Hash */}
            {rootHash && (
                <div style={{
                    padding: '1.5rem 2rem', background: `${activeSystem.color}1a`,
                    border: `2px solid ${activeSystem.color}4d`, borderRadius: '12px',
                    maxWidth: '900px', margin: '2rem auto', wordBreak: 'break-all',
                }}>
                    <strong style={{ color: activeSystem.color }}>Root Hash:</strong>
                    <br />
                    <code style={{ fontSize: '0.9rem', color: '#e6e6e6', fontFamily: 'monospace' }}>
                        {rootHash}
                    </code>
                </div>
            )}

            {/* Visualization Area */}
            <div className="visualization-wrapper">
                <div className={`Visualization-canvas ${proofData ? 'visualization-with-proof' : ''}`} style={{
                    background: view3D ? '#000' : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 248, 255, 0.95) 100%)',
                }}>
                    {treeData ? (
                        view3D ? (
                            <TreeVisualization3D
                                data={treeData}
                                proofHighlight={proofHighlight}
                                onNodeClick={handleNodeClick}
                            />
                        ) : (
                            <TreeVisualization2D
                                data={treeData}
                                proofHighlight={proofHighlight}
                                onNodeClick={handleNodeClick}
                            />
                        )
                    ) : (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', height: '100%',
                            color: view3D ? '#00d4ff' : '#666',
                        }}>
                            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <p style={{ marginTop: '1.5rem', fontSize: '1.2rem', color: view3D ? '#00d4ff' : '#999' }}>
                                Enter data and generate a Merkle tree
                            </p>
                            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                                Click a leaf node to see its Merkle proof
                            </p>
                        </div>
                    )}
                </div>

                {proofData && (
                    <ProofVisualization proofData={proofData} onClose={handleCloseProof} />
                )}
            </div>
        </>
    );
};

export default Visualizations;
