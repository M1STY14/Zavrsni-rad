// Type declaration for the Three.js scene component.
//
// MerkleScene3D itself stays in JavaScript: it's a 1100+ line file of
// imperative WebGL/R3F code where ~80 implicit-any errors would each be
// resolved with a meaningless `any` cast for a Three.js mesh ref. The
// cost/benefit doesn't justify converting the body. Instead, we strongly
// type the external surface here — every prop the rest of the codebase
// passes is checked, and any change to that contract is a compile error.

import type { ComponentType } from 'react';
import type { TreeNode } from '../types/tree';
import type { ProofHighlight } from '../hooks/useProofClick';
import type { AppPhase } from '../hooks/useAppPhase';
import type { AdjacentBlock } from '../systems/bitcoin';

interface MerkleScene3DProps {
    phase: AppPhase;
    treeData: TreeNode | null;
    proofHighlight: ProofHighlight | null;
    onNodeClick: (hash: string) => void | Promise<void>;
    onExpandCollapsed: (parentHash: string) => void;
    expandingHashes: Record<string, boolean>;
    isMobile: boolean;
    onTransitionComplete: () => void;
    neighborBlocks: AdjacentBlock[];
    blockHeight: number | string | null;
}

declare const MerkleScene3D: ComponentType<MerkleScene3DProps>;
export default MerkleScene3D;
export const DEMO_TREE: TreeNode;
