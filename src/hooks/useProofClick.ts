import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { DEMO_TREE } from '../data/demo';
import { buildStructuralProof, findNode } from '../utils/merkle';
import {
    verifyBinaryMerkleProof,
    verifyBitcoinMerkleProof,
    verifyGitProof,
} from '../utils/proof-verifier';
import type { System } from '../types/system';
import type { TreeNode } from '../types/tree';
import type {
    BinaryMerkleProof,
    BitcoinMerkleProof,
    GitTreeProof,
    Proof,
    VerificationResult,
} from '../types/proof';

interface FetchProofBody {
    rootHash?: string;
    txid?: string;
    pieceHash?: string;
    repoPath?: string;
    commitRef?: string;
    blobPath?: string;
}

// Run a proof request through react-query so repeat clicks on the same leaf
// within the default staleTime are served from cache.
async function fetchProof<P extends Proof>(
    queryClient: QueryClient,
    endpoint: string,
    body: FetchProofBody,
): Promise<P> {
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
            return data as P;
        },
    });
}

export interface ProofHighlight {
    selectedLeaf: string;
    pathHashes: Set<string>;
    siblingHashes: Set<string>;
}

interface BinaryProofData {
    selectedLeaf: string;
    rootHash: string;
    steps: BinaryMerkleProof['steps'];
    verified: boolean;
    verifyReason?: string;
}

interface GitProofData {
    kind: 'git-tree';
    proof: GitTreeProof;
    checks: VerificationResult['checks'];
    verified: boolean;
    verifyReason?: string;
}

export type ProofData = BinaryProofData | GitProofData;

export interface UseProofClickArgs {
    activeSystem: System;
    treeData: TreeNode | null;
    rootHash: string | null;
    inputValues: Record<string, string>;
    t: (key: string, ...args: unknown[]) => unknown;
}

export interface UseProofClickApi {
    proofHighlight: ProofHighlight | null;
    proofData: ProofData | null;
    clickHint: string | null;
    handleNodeClick: (hash: string) => Promise<void>;
    handleCloseProof: () => void;
    clearProof: () => void;
}

// Owns the proof flow: click → server-authoritative proof → client re-hash.
export default function useProofClick({
    activeSystem,
    treeData,
    rootHash,
    inputValues,
    t,
}: UseProofClickArgs): UseProofClickApi {
    const queryClient = useQueryClient();
    const [proofHighlight, setProofHighlight] = useState<ProofHighlight | null>(null);
    const [proofData, setProofData] = useState<ProofData | null>(null);
    const [clickHint, setClickHint] = useState<string | null>(null);

    const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

    const handleNodeClick = useCallback(async (hash: string) => {
        const isDemoMode = !treeData;
        const currentTree = treeData || (DEMO_TREE as TreeNode);
        const currentRoot = rootHash || DEMO_TREE.name;

        const node = findNode(currentTree, hash);
        const isLeaf = !!node && !node.children?.length && !node.collapsed;
        const isRealLeaf = isLeaf && (isDemoMode || node!.value !== undefined);
        if (!isRealLeaf) {
            clearProof();
            const isMaxDepth = typeof node?.value === 'string' && node.value.endsWith('(max depth)');
            setClickHint(String(isMaxDepth ? t('proof.hint_max_depth') : t('proof.hint_internal_node')));
            return;
        }
        setClickHint(null);

        if (isDemoMode) {
            const steps = buildStructuralProof(currentTree, hash) ?? [];
            const pathHashes = new Set<string>([hash, ...steps.map(s => s.parentHash)]);
            const siblingHashes = new Set<string>(steps.map(s => s.siblingHash));
            setProofHighlight({ selectedLeaf: hash, pathHashes, siblingHashes });
            setProofData({
                selectedLeaf: hash,
                rootHash: currentRoot,
                steps,
                verified: true,
            });
            return;
        }

        if (activeSystem.id === 'git') {
            try {
                if (!node!.path) throw new Error('Selected leaf has no path metadata.');
                const proof = await fetchProof<GitTreeProof>(queryClient, '/api/git/proof', {
                    repoPath: inputValues.repoPath || '',
                    commitRef: inputValues.commitHash || 'HEAD',
                    blobPath: node!.path,
                });

                const verification = await verifyGitProof(proof);
                const pathHashes = new Set<string>([hash, ...proof.treeChain.map(tree => tree.sha), proof.commit.sha]);
                setProofHighlight({ selectedLeaf: hash, pathHashes, siblingHashes: new Set() });
                setProofData({
                    kind: 'git-tree',
                    proof,
                    checks: verification.checks,
                    verified: verification.ok,
                    verifyReason: verification.reason,
                });
            } catch (err: unknown) {
                console.error('Git proof error:', err);
                const message = err instanceof Error ? err.message : String(err);
                setProofHighlight(null);
                setProofData({
                    kind: 'git-tree',
                    proof: { kind: 'git-tree', blob: { sha: '', path: node!.path || '?' }, commit: { sha: '', content: '' }, rootTreeSha: '', treeChain: [] },
                    checks: [],
                    verified: false,
                    verifyReason: message,
                });
            }
            return;
        }

        // Bitcoin / BitTorrent — same proof shape, different verifier based on
        // the server-declared kind.
        try {
            const endpoint = activeSystem.id === 'bitcoin' ? '/api/bitcoin/proof' : '/api/bittorrent/proof';
            const body: FetchProofBody = activeSystem.id === 'bitcoin'
                ? { rootHash: currentRoot, txid: node!.value }
                : { rootHash: currentRoot, pieceHash: node!.value };

            const proof = await fetchProof<BinaryMerkleProof | BitcoinMerkleProof>(queryClient, endpoint, body);

            const verification = proof.kind === 'bitcoin-merkle'
                ? await verifyBitcoinMerkleProof(proof)
                : await verifyBinaryMerkleProof(proof);

            const pathHashes = new Set<string>([proof.leaf.hash, ...proof.steps.map(s => s.parentHash)]);
            const siblingHashes = new Set<string>(proof.steps.map(s => s.siblingHash));

            setProofHighlight({ selectedLeaf: proof.leaf.hash, pathHashes, siblingHashes });
            setProofData({
                selectedLeaf: proof.leaf.hash,
                rootHash: proof.rootHash,
                steps: proof.steps,
                verified: verification.ok,
                verifyReason: verification.reason,
            });
        } catch (err: unknown) {
            console.error('Proof error:', err);
            const message = err instanceof Error ? err.message : String(err);
            setProofHighlight(null);
            setProofData({
                selectedLeaf: hash,
                rootHash: currentRoot,
                steps: [],
                verified: false,
                verifyReason: message,
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
