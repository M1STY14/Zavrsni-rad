// Client-side tree-walking utilities. Proof generation lives on the server
// and is verified by Web Crypto in src/utils/proof-verifier.ts — this file
// only navigates the displayed tree structure.

import type { TreeNode } from '../types/tree';

export interface Leaf {
    hash: string;
    value: string | undefined;
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
