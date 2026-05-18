import React, { useState, useEffect } from 'react';
import { useT } from '../i18n/index';
import type { ProofData } from '../hooks/useProofClick';

interface ViewProps {
    proofData: ProofData;
    onClose: () => void;
}

// Type guard — proofData has a distinguishable shape per kind.
function isGitProofData(p: ProofData): p is Extract<ProofData, { kind: 'git-tree' }> {
    return 'kind' in p && p.kind === 'git-tree';
}

function BinaryMerkleProofView({ proofData, onClose }: ViewProps) {
    if (isGitProofData(proofData)) return null;
    const t = useT();
    const [visibleSteps, setVisibleSteps] = useState(0);
    const { selectedLeaf, rootHash, steps, verified, verifyReason } = proofData;

    useEffect(() => {
        if (!steps || steps.length === 0) return;
        setVisibleSteps(0);
        const interval = setInterval(() => {
            setVisibleSteps(prev => {
                if (prev >= steps.length) {
                    clearInterval(interval);
                    return prev;
                }
                return prev + 1;
            });
        }, 400);
        return () => clearInterval(interval);
    }, [steps]);

    const isVerified = verified !== undefined
        ? verified
        : steps && steps.length > 0 && steps[steps.length - 1].parentHash === rootHash;

    const positionLabel = (pos: 'left' | 'right') =>
        String(pos === 'left' ? t('proof.sibling_left') : t('proof.sibling_right'));

    return (
        <div className="proof-panel">
            <div className="proof-header">
                <h3>{String(t('proof.title'))}</h3>
                <button onClick={onClose} className="proof-close-btn">&times;</button>
            </div>

            <div className="proof-selected-leaf">
                <span className="proof-label">{String(t('proof.selected_leaf'))}</span>
                <code className="proof-hash">{selectedLeaf?.substring(0, 16)}...</code>
            </div>

            <div className="proof-steps-container">
                <div className="proof-step-title">
                    {String(t('proof.proof_path'))} ({String(t('proof.step_count', steps?.length || 0))})
                </div>

                {steps?.map((step, index) => (
                    <div
                        key={index}
                        className={`proof-step ${index < visibleSteps ? 'proof-step-visible' : ''}`}
                        style={{ transitionDelay: `${index * 100}ms` }}
                    >
                        <div className="proof-step-number">{index + 1}</div>
                        <div className="proof-step-content">
                            <div className="proof-step-node">
                                <span className="proof-node-label">{String(t('proof.node'))}</span>
                                <code>{step.nodeHash?.substring(0, 12)}...</code>
                            </div>
                            <div className="proof-step-combine">
                                <span className="proof-combine-icon">
                                    {step.siblingPosition === 'left' ? '←' : '→'}
                                </span>
                                <div className="proof-step-sibling">
                                    <span className="proof-sibling-label">
                                        {String(t('proof.sibling'))} ({positionLabel(step.siblingPosition)})
                                    </span>
                                    <code>{step.siblingHash?.substring(0, 12)}...</code>
                                </div>
                            </div>
                            <div className="proof-step-result">
                                <span className="proof-result-arrow">&darr;</span>
                                <span className="proof-result-label">{String(t('proof.parent'))}</span>
                                <code>{step.parentHash?.substring(0, 12)}...</code>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {visibleSteps >= (steps?.length || 0) && (
                <div className={`proof-result-box ${isVerified ? 'proof-verified' : 'proof-failed'}`}>
                    <span className="proof-result-icon">{isVerified ? '✓' : '✗'}</span>
                    <div>
                        <div className="proof-result-text">
                            {String(isVerified ? t('proof.verified') : t('proof.failed'))}
                        </div>
                        <div className="proof-result-detail">
                            {String(t('proof.root'))}: <code>{rootHash?.substring(0, 16)}...</code>
                        </div>
                        {!isVerified && verifyReason && (
                            <div className="proof-result-detail" style={{ marginTop: '0.25rem', opacity: 0.85 }}>
                                {verifyReason}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="proof-legend">
                <div className="proof-legend-item">
                    <span className="proof-legend-dot" style={{ background: '#ff6f00' }} />
                    <span>{String(t('proof.legend_leaf'))}</span>
                </div>
                <div className="proof-legend-item">
                    <span className="proof-legend-dot" style={{ background: '#ffa726' }} />
                    <span>{String(t('proof.legend_path'))}</span>
                </div>
                <div className="proof-legend-item">
                    <span className="proof-legend-dot" style={{ background: '#66bb6a' }} />
                    <span>{String(t('proof.legend_sibling'))}</span>
                </div>
            </div>
        </div>
    );
}

function GitProofView({ proofData, onClose }: ViewProps) {
    if (!isGitProofData(proofData)) return null;
    const t = useT();
    const { proof, checks, verified, verifyReason } = proofData;
    const [visibleSteps, setVisibleSteps] = useState(0);

    useEffect(() => {
        if (!checks?.length) return;
        setVisibleSteps(0);
        const interval = setInterval(() => {
            setVisibleSteps(prev => {
                if (prev >= checks.length) {
                    clearInterval(interval);
                    return prev;
                }
                return prev + 1;
            });
        }, 500);
        return () => clearInterval(interval);
    }, [checks]);

    const segments: string[] = proof?.blob?.path?.split('/') || [];
    const treeCount = checks?.filter(c => c.kind === 'tree').length || 0;

    return (
        <div className="proof-panel">
            <div className="proof-header">
                <h3>{String(t('proof.title'))}</h3>
                <button onClick={onClose} className="proof-close-btn">&times;</button>
            </div>

            <div className="proof-selected-leaf">
                <span className="proof-label">{String(t('proof.selected_leaf'))}</span>
                <code className="proof-hash">{proof?.blob?.path}</code>
            </div>

            <div className="proof-steps-container">
                <div className="proof-step-title">
                    {String(t('proof.git_chain_title'))} ({String(t('proof.git_chain_count', treeCount))})
                </div>

                {checks?.map((check, index) => {
                    const visible = index < visibleSteps;
                    if (check.kind === 'tree') {
                        const segmentName = segments[segments.length - 1 - index];
                        const subdirPath = segments.slice(0, segments.length - 1 - index).join('/') || String(t('proof.git_root_path'));
                        return (
                            <div
                                key={index}
                                className={`proof-step ${visible ? 'proof-step-visible' : ''}`}
                                style={{ transitionDelay: `${index * 100}ms` }}
                            >
                                <div className="proof-step-number">{index + 1}</div>
                                <div className="proof-step-content">
                                    <div className="proof-step-node">
                                        <span className="proof-node-label">{String(t('proof.git_tree_at'))}</span>
                                        <code>{subdirPath}</code>
                                    </div>
                                    <div className="proof-step-combine">
                                        <span className="proof-combine-icon">↳</span>
                                        <div className="proof-step-sibling">
                                            <span className="proof-sibling-label">
                                                {String(t('proof.git_entries_count', check.entryCount, segmentName))}
                                            </span>
                                            <code>{String(t('proof.git_sha1_bytes', check.byteSize))}</code>
                                        </div>
                                    </div>
                                    <div className="proof-step-result">
                                        <span className="proof-result-arrow">{check.ok ? '✓' : '✗'}</span>
                                        <span className="proof-result-label">{String(check.ok ? t('proof.git_matches') : t('proof.git_mismatch'))}</span>
                                        <code>{check.computed?.substring(0, 12)}...</code>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    return (
                        <div
                            key={index}
                            className={`proof-step ${visible ? 'proof-step-visible' : ''}`}
                            style={{ transitionDelay: `${index * 100}ms` }}
                        >
                            <div className="proof-step-number">{index + 1}</div>
                            <div className="proof-step-content">
                                <div className="proof-step-node">
                                    <span className="proof-node-label">{String(t('proof.git_commit_label'))}</span>
                                    <code>{check.sha?.substring(0, 12)}...</code>
                                </div>
                                <div className="proof-step-combine">
                                    <span className="proof-combine-icon">↳</span>
                                    <div className="proof-step-sibling">
                                        <span className="proof-sibling-label">{String(t('proof.git_sha1_bytes', check.byteSize))}</span>
                                        <code>{String(t('proof.git_references_root'))}</code>
                                    </div>
                                </div>
                                <div className="proof-step-result">
                                    <span className="proof-result-arrow">{check.ok ? '✓' : '✗'}</span>
                                    <span className="proof-result-label">{String(check.ok ? t('proof.git_matches') : t('proof.git_mismatch'))}</span>
                                    <code>{check.computed?.substring(0, 12)}...</code>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {visibleSteps >= (checks?.length || 0) && (
                <div className={`proof-result-box ${verified ? 'proof-verified' : 'proof-failed'}`}>
                    <span className="proof-result-icon">{verified ? '✓' : '✗'}</span>
                    <div>
                        <div className="proof-result-text">
                            {String(verified ? t('proof.verified') : t('proof.failed'))}
                        </div>
                        <div className="proof-result-detail">
                            {String(t('proof.git_commit_label'))}: <code>{proof?.commit?.sha?.substring(0, 16)}...</code>
                        </div>
                        {!verified && verifyReason && (
                            <div className="proof-result-detail" style={{ marginTop: '0.25rem', opacity: 0.85 }}>
                                {verifyReason}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="proof-legend">
                <div className="proof-legend-item">
                    <span className="proof-legend-dot" style={{ background: '#ff6f00' }} />
                    <span>{String(t('proof.git_legend_blob'))}</span>
                </div>
                <div className="proof-legend-item">
                    <span className="proof-legend-dot" style={{ background: '#ffa726' }} />
                    <span>{String(t('proof.git_legend_tree'))}</span>
                </div>
                <div className="proof-legend-item">
                    <span className="proof-legend-dot" style={{ background: '#66bb6a' }} />
                    <span>{String(t('proof.git_legend_commit'))}</span>
                </div>
            </div>
        </div>
    );
}

interface ProofVisualizationProps {
    proofData: ProofData | null;
    onClose: () => void;
}

const ProofVisualization = ({ proofData, onClose }: ProofVisualizationProps) => {
    if (!proofData) return null;
    if (isGitProofData(proofData)) {
        return <GitProofView proofData={proofData} onClose={onClose} />;
    }
    return <BinaryMerkleProofView proofData={proofData} onClose={onClose} />;
};

export default ProofVisualization;
