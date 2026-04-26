// Client-side Merkle tree utilities for proof path computation
// These work on the tree structure returned from the server: { name: hash, children: [...], value?: string }

/**
 * Find the proof path from a target node to the root.
 * Returns the set of hashes on the path, sibling hashes, and detailed steps.
 */
export function findProofPath(tree, targetHash) {
    const pathHashes = new Set();
    const siblingHashes = new Set();
    const steps = [];

    function search(node, depth) {
        if (!node) return false;

        if (node.name === targetHash) {
            pathHashes.add(node.name);
            return true;
        }

        if (node.children && node.children.length > 0) {
            for (let i = 0; i < node.children.length; i++) {
                if (search(node.children[i], depth + 1)) {
                    pathHashes.add(node.name);

                    for (let j = 0; j < node.children.length; j++) {
                        if (i !== j) {
                            siblingHashes.add(node.children[j].name);
                            steps.push({
                                level: depth,
                                nodeHash: node.children[i].name,
                                siblingHash: node.children[j].name,
                                siblingPosition: j < i ? 'left' : 'right',
                                parentHash: node.name,
                            });
                        }
                    }
                    return true;
                }
            }
        }
        return false;
    }

    search(tree, 0);

    // Steps are already in leaf-to-root order (recursion unwinds bottom-up)
    return { pathHashes, siblingHashes, steps };
}

/**
 * Check if a node hash corresponds to a leaf node in the tree.
 */
export function isLeafNode(tree, hash) {
    function search(node) {
        if (!node) return false;
        if (node.name === hash) {
            return !node.children || node.children.length === 0;
        }
        if (node.children) {
            for (const child of node.children) {
                const result = search(child);
                if (result !== false) return result;
            }
        }
        return false;
    }
    return search(tree);
}

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
