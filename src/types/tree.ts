// The on-screen tree node shape — what MerkleScene3D renders, what
// findNode/replaceSubtree walk, and what /tree endpoints return as `tree`.
// Hash-named, value-tagged on leaves, optional `path` for git blob leaves so
// the proof endpoint knows the full repo path on click.
export interface TreeNode {
    name: string;
    value?: string;
    path?: string;
    children?: TreeNode[];
    collapsed?: boolean;
    leafCount?: number;
}

// Standard response from every system's fetchTree() — what useVisualization
// dispatches under TREE_LOADED.
export interface TreeFetchResult {
    tree: TreeNode;
    rootHash: string;
    metadata?: unknown;
}
