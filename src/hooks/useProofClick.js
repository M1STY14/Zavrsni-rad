import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DEMO_TREE } from '../data/demo.js';
import { findNode } from '../utils/merkle.js';
import {
  verifyBinaryMerkleProof,
  verifyBitcoinMerkleProof,
  verifyGitProof,
} from '../utils/proof-verifier.js';

// Run a proof request through react-query so repeat clicks on the same leaf
// within the default staleTime are served from cache. The mutation cost on the
// server isn't huge, but it's free correctness.
async function fetchProof(queryClient, endpoint, body) {
  return queryClient.fetchQuery({
    queryKey: ['proof', endpoint, body],
    queryFn: async () => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Proof generation failed.');
      return data;
    },
  });
}

// Owns the proof flow: click → server-authoritative proof → client re-hash.
// Three state fields move together (highlight, panel data, transient hint),
// so they live here rather than in useVisualization where they'd complicate
// the reducer with cross-cutting concerns.
export default function useProofClick({ activeSystem, treeData, rootHash, inputValues, t }) {
  const queryClient = useQueryClient();
  const [proofHighlight, setProofHighlight] = useState(null);
  const [proofData, setProofData] = useState(null);
  const [clickHint, setClickHint] = useState(null);

  // Auto-dismiss the click hint after a few seconds, with a ref-tracked
  // timeout so a quick unmount or re-trigger doesn't leak.
  const hintTimeoutRef = useRef(null);
  useEffect(() => {
    if (!clickHint) return undefined;
    hintTimeoutRef.current = setTimeout(() => setClickHint(null), 3500);
    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = null;
      }
    };
  }, [clickHint]);

  const clearProof = useCallback(() => {
    setProofHighlight(null);
    setProofData(null);
  }, []);

  const handleNodeClick = useCallback(async (hash) => {
    const currentTree = treeData || DEMO_TREE;
    const currentRoot = rootHash || DEMO_TREE.name;

    const node = findNode(currentTree, hash);
    const isRealLeaf = node && !node.children?.length && !node.collapsed && node.value !== undefined;
    if (!isRealLeaf) {
      clearProof();
      const isMaxDepth = typeof node?.value === 'string' && node.value.endsWith('(max depth)');
      setClickHint(isMaxDepth ? t('proof.hint_max_depth') : t('proof.hint_internal_node'));
      return;
    }
    setClickHint(null);

    if (activeSystem.id === 'git') {
      try {
        if (!node.path) throw new Error('Selected leaf has no path metadata.');
        const proof = await fetchProof(queryClient, '/api/git/proof', {
          repoPath: inputValues.repoPath || '',
          commitRef: inputValues.commitHash || 'HEAD',
          blobPath: node.path,
        });

        const verification = await verifyGitProof(proof);
        const pathHashes = new Set([hash, ...proof.treeChain.map(tree => tree.sha), proof.commit.sha]);
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

    // Bitcoin / BitTorrent — same proof shape, different verifier based on the
    // server-declared kind.
    try {
      const endpoint = activeSystem.id === 'bitcoin'
        ? '/api/bitcoin/proof'
        : '/api/bittorrent/proof';
      const body = activeSystem.id === 'bitcoin'
        ? { rootHash: currentRoot, txid: node.value }
        : { rootHash: currentRoot, pieceHash: node.value };

      const proof = await fetchProof(queryClient, endpoint, body);

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
  }, [activeSystem, treeData, rootHash, inputValues, t, clearProof, queryClient]);

  return {
    proofHighlight,
    proofData,
    clickHint,
    handleNodeClick,
    handleCloseProof: clearProof,
    clearProof,
  };
}
