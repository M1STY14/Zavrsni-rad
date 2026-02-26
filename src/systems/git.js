const git = {
    id: 'git',
    name: 'Git',
    color: '#6e5494',
    icon: '\uD83D\uDD00',
    description: 'Visualize Merkle trees from Git repository objects',

    inputs: [
        { key: 'repoPath', label: 'Repository Path', type: 'text', placeholder: '/path/to/repo or use current' },
        { key: 'commitHash', label: 'Commit Hash', type: 'text', placeholder: 'HEAD or a commit SHA...' },
    ],

    hint: 'Enter a local Git repository path and commit hash to visualize the tree object structure',

    validate(params) {
        return !!(params.commitHash);
    },

    async fetchTree(params) {
        const res = await fetch('/api/git/tree', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                repoPath: params.repoPath || '.',
                commitHash: params.commitHash || 'HEAD',
            }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        return {
            tree: data.tree,
            rootHash: data.rootHash,
            metadata: data.commit || null,
        };
    },
};

export default git;
