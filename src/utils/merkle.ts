// Client-side tree-walking utilities. Proof generation lives on the server
// and is verified by Web Crypto in src/utils/proof-verifier.ts — this file
// only navigates the displayed tree structure.

import type { TreeNode } from '../types/tree';
import type { ProofStep } from '../types/proof';

export interface Leaf {
    hash: string;
    value: string | undefined;
}

// Walks the tree once and returns [root, ..., leaf] for the leaf with the given
// hash, or null if not found.
export function findPathToLeaf(tree: TreeNode | null | undefined, leafHash: string): TreeNode[] | null {
    if (!tree) return null;
    if (tree.name === leafHash) return [tree];
    if (!tree.children) return null;
    for (const child of tree.children) {
        const sub = findPathToLeaf(child, leafHash);
        if (sub) return [tree, ...sub];
    }
    return null;
}

// Builds ProofStep[] (leaf-up) from a tree's own structure. Used by the demo
// tree, which has no backing server endpoint: the steps reference the tree's
// existing node names verbatim, so the proof "verifies" against the same tree
// the user is looking at.
export function buildStructuralProof(tree: TreeNode, leafHash: string): ProofStep[] | null {
    const path = findPathToLeaf(tree, leafHash);
    if (!path || path.length < 2) return null;
    const steps: ProofStep[] = [];
    let currentHash = leafHash;
    for (let i = path.length - 1; i > 0; i--) {
        const parent = path[i - 1]!;
        const node = path[i]!;
        const siblings = parent.children ?? [];
        const idx = siblings.findIndex(c => c.name === node.name);
        const siblingIdx = idx === 0 ? 1 : 0;
        const sibling = siblings[siblingIdx];
        if (!sibling) return null;
        steps.push({
            nodeHash: currentHash,
            siblingHash: sibling.name,
            siblingPosition: siblingIdx === 0 ? 'left' : 'right',
            parentHash: parent.name,
        });
        currentHash = parent.name;
    }
    return steps;
}

export function getAllLeaves(tree: TreeNode | null | undefined): Leaf[] {
    const leaves: Leaf[] = [];
    function collect(node: TreeNode | null | undefined): void {
        if (!node) return;
        if (!node.children || node.children.length === 0) {
            leaves.push({ hash: node.name, value: node.value });
        } else {
            node.children.forEach(collect);
        }
    }
    collect(tree);
    return leaves;
}

export function findNode(tree: TreeNode | null | undefined, hash: string): TreeNode | null {
    if (!tree) return null;
    if (tree.name === hash) return tree;
    if (tree.children) {
        for (const child of tree.children) {
            const found = findNode(child, hash);
            if (found) return found;
        }
    }
    return null;
}

export function getTreeDepth(tree: TreeNode | null | undefined): number {
    if (!tree) return 0;
    if (!tree.children || tree.children.length === 0) return 0;
    return 1 + Math.max(...tree.children.map(getTreeDepth));
}

// Returns a new tree where the node with `targetHash` is replaced by
// `replacement`. Used by the Bitcoin click-to-expand flow to splice a deeper
// subtree into a previously collapsed placeholder node.
export function replaceSubtree(
    tree: TreeNode | null | undefined,
    targetHash: string,
    replacement: TreeNode,
): TreeNode | null | undefined {
    if (!tree) return tree;
    if (tree.name === targetHash) return replacement;
    if (!tree.children) return tree;
    let changed = false;
    const newChildren = tree.children.map(child => {
        const next = replaceSubtree(child, targetHash, replacement);
        if (next !== child) changed = true;
        return next as TreeNode;
    });
    if (!changed) return tree;
    return { ...tree, children: newChildren };
}

export interface TreeStats {
    maxDepth: number;
    maxBranching: number;
}

export function getTreeStats(tree: TreeNode | null | undefined): TreeStats {
    let maxBranching = 0;
    function walk(node: TreeNode | null | undefined): void {
        if (!node?.children?.length) return;
        maxBranching = Math.max(maxBranching, node.children.length);
        node.children.forEach(walk);
    }
    walk(tree);
    return { maxDepth: getTreeDepth(tree), maxBranching };
}
