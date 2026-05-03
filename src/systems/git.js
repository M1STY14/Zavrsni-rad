const git = {
    id: 'git',
    name: 'Git',
    color: '#6e5494',
    icon: '\uD83D\uDD00',
    description: 'Visualize Merkle trees from Git repository objects',

    inputs: [
        { key: 'repoPath', label: 'Repository Path', type: 'text', placeholder: 'GitHub URL or local path' },
        { key: 'commitHash', label: 'Commit Hash', type: 'text', placeholder: 'HEAD or a commit SHA...' },
    ],

    hint: 'Paste a GitHub URL or local path. Leave empty to visualize this project at HEAD',

    validate() {
        return true;
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

export async function fetchAdjacentCommits(commitSha, repoPath = '.') {
    try {
        const res = await fetch(`/api/git/commit/${encodeURIComponent(commitSha)}/adjacent?repoPath=${encodeURIComponent(repoPath)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.neighbors || [];
    } catch {
        return [];
    }
}

export default git;
