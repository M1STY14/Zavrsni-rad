const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// Limits
const MAX_ENTRIES_PER_DIR = 12;
const MAX_DEPTH = 4;
const CLONE_DIR = path.join(os.tmpdir(), 'merkle-git-clones');
const CLONE_TIMEOUT = 60000; // 60s for clone operations

// --- Helpers ---

function gitExec(cmd, cwd, timeout = 5000) {
    return execSync(cmd, {
        cwd,
        timeout,
        encoding: 'utf-8',
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    }).trim();
}

function isGitUrl(str) {
    return /^https?:\/\//.test(str) || /^git@/.test(str);
}

function cloneUrl(url) {
    const hash = crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
    const cloneDir = path.join(CLONE_DIR, hash);

    // Reuse existing clone
    if (fs.existsSync(path.join(cloneDir, '.git'))) {
        try {
            gitExec('git fetch --filter=blob:none', cloneDir, CLONE_TIMEOUT);
            // Update local HEAD to match remote after fetch (no working tree to reset)
            const branch = gitExec('git symbolic-ref --short HEAD', cloneDir);
            gitExec(`git update-ref refs/heads/${branch} origin/${branch}`, cloneDir);
        } catch {
            // fetch failed, still use stale clone
        }
        return cloneDir;
    }

    // Fresh blobless clone — we only need tree/commit objects, not file contents
    fs.mkdirSync(CLONE_DIR, { recursive: true });
    execSync(`git clone --filter=blob:none --no-checkout --single-branch ${JSON.stringify(url)} ${JSON.stringify(cloneDir)}`, {
        timeout: CLONE_TIMEOUT,
        encoding: 'utf-8',
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });

    return cloneDir;
}

// Resolve a user-provided path: URL → clone, local path → validate
function resolveRepoPath(repoPath) {
    if (isGitUrl(repoPath)) {
        return cloneUrl(repoPath);
    }
    return validateRepoPath(repoPath);
}

function sanitizeRef(ref) {
    if (/^[0-9a-fA-F]{4,40}$/.test(ref)) return ref;
    if (ref === 'HEAD') return ref;
    if (/^[a-zA-Z0-9_\-/.]+$/.test(ref) && !ref.includes('..') && !ref.includes(';') && !ref.includes('|') && !ref.includes('`')) {
        return ref;
    }
    throw new Error('Invalid ref: ' + ref);
}

function validateRepoPath(repoPath) {
    const abs = path.resolve(repoPath);
    gitExec('git rev-parse --git-dir', abs);
    return abs;
}

function resolveRef(repoPath, ref) {
    const safe = sanitizeRef(ref);
    return gitExec(`git rev-parse ${safe}`, repoPath);
}

// --- Core Git functions ---

function getCommitInfo(repoPath, sha) {
    const raw = gitExec(`git cat-file -p ${sha}`, repoPath);
    const lines = raw.split('\n');
    let treeSha = null;
    const parentShas = [];
    let message = '';
    let headerDone = false;

    for (const line of lines) {
        if (!headerDone) {
            if (line === '') {
                headerDone = true;
                continue;
            }
            if (line.startsWith('tree ')) treeSha = line.slice(5);
            if (line.startsWith('parent ')) parentShas.push(line.slice(7));
        } else {
            message += (message ? '\n' : '') + line;
        }
    }

    return { sha, treeSha, parentShas, message: message.trim() };
}

function readTreeEntries(repoPath, treeSha) {
    const raw = gitExec(`git ls-tree ${treeSha}`, repoPath);
    if (!raw) return [];
    return raw.split('\n').map(line => {
        const match = line.match(/^(\d+)\s+(blob|tree)\s+([0-9a-f]+)\t(.+)$/);
        if (!match) return null;
        return { mode: match[1], type: match[2], hash: match[3], name: match[4] };
    }).filter(Boolean);
}

function buildGitTree(repoPath, treeSha, dirName, depth = 0) {
    if (depth >= MAX_DEPTH) {
        return { name: treeSha, value: dirName + '/ (max depth)', children: [] };
    }

    const entries = readTreeEntries(repoPath, treeSha);

    // Sort: dirs first, then alphabetical
    entries.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    const children = [];
    const limit = Math.min(entries.length, MAX_ENTRIES_PER_DIR);

    for (let i = 0; i < limit; i++) {
        const entry = entries[i];
        if (entry.type === 'tree') {
            children.push(buildGitTree(repoPath, entry.hash, entry.name, depth + 1));
        } else {
            // Blob leaf — path-qualified name for uniqueness
            children.push({
                name: `${entry.hash}/${entry.name}`,
                value: entry.name,
            });
        }
    }

    if (entries.length > MAX_ENTRIES_PER_DIR) {
        const remaining = entries.length - MAX_ENTRIES_PER_DIR;
        children.push({
            name: `${treeSha}/overflow`,
            value: `... ${remaining} more`,
        });
    }

    return {
        name: treeSha,
        value: dirName + '/',
        children,
    };
}

function buildCommitTree(repoPath, commitSha) {
    const info = getCommitInfo(repoPath, commitSha);
    const gitTree = buildGitTree(repoPath, info.treeSha, 'root', 0);

    return {
        tree: {
            name: commitSha,
            value: 'commit',
            children: [gitTree],
        },
        rootHash: commitSha,
        commit: {
            sha: commitSha,
            message: info.message,
            treeSha: info.treeSha,
            parentShas: info.parentShas,
        },
    };
}

// --- Demo fallback data ---
// Snapshot of this repo's HEAD, used when git commands fail

const DEMO_COMMIT_SHA = '75a098b74e715f70ded848abbadd63bec4b6df20';
const DEMO_PARENT_SHA = 'e420829d5d877bc080fffac7576379c2ca5f758e';

const DEMO_TREE = {
    name: DEMO_COMMIT_SHA,
    value: 'commit',
    children: [{
        name: '449fb4e0046196fdb7bfc89c0069c68a05d176ea',
        value: 'root/',
        children: [
            {
                name: '7d228e59c4ab830cfd6dba08543024f2109a18ff',
                value: 'server/',
                children: [
                    { name: 'dfd1db6f9a0dec255de0743319c15b653335ae99/merkle.js', value: 'merkle.js' },
                    { name: '3eb333a40ec01545be66896919bcdb6fff0f817b/server.js', value: 'server.js' },
                    {
                        name: '09f46c1fda16bd7c260d1cdf1ccb4a58b33bc4ec',
                        value: 'systems/',
                        children: [
                            { name: '4890e5333c17de503cad83874da215cc1a4c9923/bitcoin.js', value: 'bitcoin.js' },
                            { name: '504622f3af214c4de985e5b325cbf82a4ecde19f/bittorrent.js', value: 'bittorrent.js' },
                            { name: '3d808219fd3c6b956cdb5abf59c9bfdf7839dc78/git.js', value: 'git.js' },
                        ],
                    },
                ],
            },
            {
                name: '7cb60fe3fd843fb35b6ff537907076df48045586',
                value: 'src/',
                children: [
                    { name: 'bc4ca08848bb7b94bb115ef5b76bea4945901805/App.css', value: 'App.css' },
                    { name: '8f39ef554cb08bd5d8cb9aa30a624da140d875a3/App.jsx', value: 'App.jsx' },
                    {
                        name: '024e2aa719cf5fa0d82ef2076da53220dc6a3cbf',
                        value: 'components/',
                        children: [
                            { name: 'ed0f5f6b3a84ba1bb31336fb3c0e95e0774cf494/AppShell.jsx', value: 'AppShell.jsx' },
                            { name: 'bc45cb74035ea89c75de1bc18da83b36600c98d5/BackgroundVisualization3D.jsx', value: 'BackgroundVisualization3D.jsx' },
                            { name: 'a78755594065d134b35ea18df7c064f4acede49e/FloatingInputPanel.jsx', value: 'FloatingInputPanel.jsx' },
                            { name: 'c44bc8d983d02441cd54d6acb52400e390e88288/InfoModal.jsx', value: 'InfoModal.jsx' },
                            { name: '642af27b6d27b6762eaba0eabcb6959c22c8caa2/MerkleScene3D.jsx', value: 'MerkleScene3D.jsx' },
                        ],
                    },
                    {
                        name: '448d3d4a78a8a61d0f5e3bd536cb4428503c7832',
                        value: 'systems/',
                        children: [
                            { name: '4890e5333c17de503cad83874da215cc1a4c9923/bitcoin.js', value: 'bitcoin.js' },
                            { name: '504622f3af214c4de985e5b325cbf82a4ecde19f/bittorrent.js', value: 'bittorrent.js' },
                            { name: '3d808219fd3c6b956cdb5abf59c9bfdf7839dc78/git.js', value: 'git.js' },
                        ],
                    },
                ],
            },
            { name: '9243bab9f53513abef3a38d392adbac38de98aba/.gitignore', value: '.gitignore' },
            { name: 'fe5851a1622359de2570b58de08b8c916a4d602c/index.html', value: 'index.html' },
            { name: '10de87e32f1f0e36f9ed3e4fa2b247a5ad816734/package.json', value: 'package.json' },
            { name: '0eb278de6d10f870eb98704b4c595b214614ea45/vite.config.js', value: 'vite.config.js' },
        ],
    }],
};

const DEMO_PARENT_TREE = {
    name: DEMO_PARENT_SHA,
    value: 'commit',
    children: [{
        name: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
        value: 'root/',
        children: [
            {
                name: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1',
                value: 'server/',
                children: [
                    { name: 'c3d4e5f6a7b8c9d0e1f2/merkle.js', value: 'merkle.js' },
                    { name: 'd4e5f6a7b8c9d0e1f2a3/server.js', value: 'server.js' },
                ],
            },
            {
                name: 'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
                value: 'src/',
                children: [
                    { name: 'f6a7b8c9d0e1f2a3b4c5/App.jsx', value: 'App.jsx' },
                    { name: 'a7b8c9d0e1f2a3b4c5d6/App.css', value: 'App.css' },
                ],
            },
            { name: 'b8c9d0e1f2a3b4c5d6e7/package.json', value: 'package.json' },
        ],
    }],
};

function getDemoData() {
    return {
        tree: DEMO_TREE,
        rootHash: DEMO_COMMIT_SHA,
        commit: {
            sha: DEMO_COMMIT_SHA,
            message: 'Added fractal tree layout',
            treeSha: '449fb4e0046196fdb7bfc89c0069c68a05d176ea',
            parentShas: [DEMO_PARENT_SHA],
        },
    };
}

// --- Routes ---

// POST /tree — main endpoint
router.post('/tree', (req, res) => {
    const repoPath = req.body.repoPath || '.';
    const commitRef = req.body.commitHash || 'HEAD';
    const userProvidedPath = req.body.repoPath && req.body.repoPath.trim() !== '';

    try {
        const absPath = resolveRepoPath(repoPath);
        const commitSha = resolveRef(absPath, commitRef);
        const result = buildCommitTree(absPath, commitSha);

        res.json(result);
    } catch (err) {
        // Only use demo fallback when no explicit path was given (default ".")
        if (!userProvidedPath) {
            console.log(`Git tree error on default path (falling back to demo): ${err.message}`);
            res.json(getDemoData());
        } else {
            const hint = isGitUrl(repoPath)
                ? 'Make sure the URL is public and accessible.'
                : 'Make sure the path points to a local git repository.';
            console.log(`Git tree error: ${err.message}`);
            res.status(400).json({
                error: `Could not read git repository at "${repoPath}". ${hint}`,
            });
        }
    }
});

// GET /commit/:sha/adjacent — neighbor commits
router.get('/commit/:sha/adjacent', (req, res) => {
    try {
        const repoPath = req.query.repoPath || '.';

        const absPath = resolveRepoPath(repoPath);
        const sha = sanitizeRef(req.params.sha);
        const commitSha = resolveRef(absPath, sha);

        const neighbors = [];
        const info = getCommitInfo(absPath, commitSha);

        // Parent commit (left neighbor)
        if (info.parentShas.length > 0) {
            try {
                const parentResult = buildCommitTree(absPath, info.parentShas[0]);
                neighbors.push({
                    label: info.parentShas[0].substring(0, 7),
                    tree: parentResult.tree,
                    rootHash: parentResult.rootHash,
                    side: 'left',
                });
            } catch (e) {
                // skip
            }
        }

        // Child commit (right neighbor)
        try {
            const childSha = gitExec(
                `git log --all --format=%H --ancestry-path ${commitSha}..HEAD | tail -1`,
                absPath
            );
            if (childSha && childSha !== commitSha) {
                const childResult = buildCommitTree(absPath, childSha);
                neighbors.push({
                    label: childSha.substring(0, 7),
                    tree: childResult.tree,
                    rootHash: childResult.rootHash,
                    side: 'right',
                });
            }
        } catch (e) {
            // no child commit
        }

        res.json({ neighbors });
    } catch (err) {
        console.log(`Git adjacent error (falling back to demo): ${err.message}`);
        // Demo fallback
        res.json({
            neighbors: [{
                label: DEMO_PARENT_SHA.substring(0, 7),
                tree: DEMO_PARENT_TREE,
                rootHash: DEMO_PARENT_SHA,
                side: 'left',
            }],
        });
    }
});

module.exports = router;
