// Client-side tree-walking utilities. Proof generation lives on the server
// and is verified by Web Crypto in src/utils/proof-verifier.js — this file
// only navigates the displayed tree structure: { name: hash, children?: [...],
// value?: string, path?: string }.

/**
 * Get all leaf nodes from the tree.
 */
export function getAllLeaves(tree) {
    const leaves = [];
    function collect(node) {
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

/**
 * Find a node in the tree by hash.
 */
export function findNode(tree, hash) {
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

/**
 * Get the depth of the tree.
 */
export function getTreeDepth(tree) {
    if (!tree) return 0;
    if (!tree.children || tree.children.length === 0) return 0;
    return 1 + Math.max(...tree.children.map(getTreeDepth));
}

/**
 * Return a new tree where the node with `targetHash` is replaced by `replacement`.
 * Used by the Bitcoin click-to-expand flow to splice a deeper subtree into a
 * previously collapsed placeholder node.
 */
export function replaceSubtree(tree, targetHash, replacement) {
    if (!tree) return tree;
    if (tree.name === targetHash) return replacement;
    if (!tree.children) return tree;
    let changed = false;
    const newChildren = tree.children.map(child => {
        const next = replaceSubtree(child, targetHash, replacement);
        if (next !== child) changed = true;
        return next;
    });
    if (!changed) return tree;
    return { ...tree, children: newChildren };
}

/**
 * Get tree statistics: max depth and max branching factor.
 */
export function getTreeStats(tree) {
    let maxBranching = 0;
    function walk(node) {
        if (!node?.children?.length) return;
        maxBranching = Math.max(maxBranching, node.children.length);
        node.children.forEach(walk);
    }
    walk(tree);
    return { maxDepth: getTreeDepth(tree), maxBranching };
}
