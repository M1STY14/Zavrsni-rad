// Server-side git proof generation.
//
// Given a local repo path, a commit SHA, and a blob path, walks git's tree
// objects from root tree down to the blob, producing a proof envelope the
// client can independently verify. The verifier reconstructs each tree's
// canonical binary serialization, hashes it with SHA-1, and asserts equality
// with the SHA git reported — so the proof tests our serialization is
// byte-correct, which is the educational point.
//
// Git tree object format (used by both git's hashing and our verifier):
//
//   "tree <decimal-byte-size>\0<entry1><entry2>..."
//
// where each entry is:
//
//   <mode> <name>\0<20-byte-binary-hash>
//
// Modes are ASCII without leading zeros: "100644" (file), "100755" (exec),
// "120000" (symlink), "40000" (tree), "160000" (gitlink). git ls-tree prints
// them in this form, so we pass them through.
//
// Entry sort rule: byte-wise on `name`, but tree entries sort as if their name
// had a trailing "/". `git ls-tree` already emits entries sorted; we re-sort
// defensively so reconstruction never depends on input ordering.

const { execFileSync } = require('child_process');
const crypto = require('crypto');

function gitBufferOut(args, cwd) {
    return execFileSync('git', args, {
        cwd,
        encoding: 'buffer',
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        timeout: 15_000,
        maxBuffer: 64 * 1024 * 1024,
    });
}

// Parse `git ls-tree -z <sha>` output into [{mode, type, hash, name}, ...].
// -z uses a NUL between entries and disables tab-quoting of unusual names.
function getTreeEntries(repoPath, treeSha) {
    const buf = gitBufferOut(['ls-tree', '-z', treeSha], repoPath);
    if (buf.length === 0) return [];

    const entries = [];
    let start = 0;
    for (let i = 0; i < buf.length; i++) {
        if (buf[i] !== 0) continue;
        const record = buf.slice(start, i);
        start = i + 1;

        const tabIdx = record.indexOf(0x09); // \t
        if (tabIdx === -1) throw new Error('Malformed ls-tree record (no tab)');
        const header = record.slice(0, tabIdx).toString('utf-8');
        const name = record.slice(tabIdx + 1).toString('utf-8');

        const headerParts = header.split(' ');
        if (headerParts.length !== 3) throw new Error('Malformed ls-tree header: ' + header);
        const [mode, type, hash] = headerParts;
        entries.push({ mode, type, hash, name });
    }
    return entries;
}

function getCommitContent(repoPath, commitSha) {
    return gitBufferOut(['cat-file', 'commit', commitSha], repoPath);
}

// `git ls-tree` zero-pads the tree mode to 6 chars ("040000") for tabular
// output, but the on-disk binary tree object stores it without padding
// ("40000"). Normalize to git's stored form by reparsing as octal.
function normalizeMode(mode) {
    return parseInt(mode, 8).toString(8);
}

// Reconstruct a tree's canonical binary serialization (without git's framing).
function serializeTreeBinary(entries) {
    const sorted = [...entries].sort((a, b) => {
        const aName = Buffer.from(a.type === 'tree' ? a.name + '/' : a.name, 'utf-8');
        const bName = Buffer.from(b.type === 'tree' ? b.name + '/' : b.name, 'utf-8');
        return Buffer.compare(aName, bName);
    });

    const parts = [];
    for (const e of sorted) {
        parts.push(Buffer.from(`${normalizeMode(e.mode)} ${e.name}`, 'utf-8'));
        parts.push(Buffer.from([0]));
        parts.push(Buffer.from(e.hash, 'hex'));
    }
    return Buffer.concat(parts);
}

// Hash a git object the canonical way: "<type> <size>\0<content>", SHA-1 hex.
function gitObjectHash(type, contentBuffer) {
    const header = Buffer.from(`${type} ${contentBuffer.length}\0`, 'utf-8');
    return crypto.createHash('sha1').update(header).update(contentBuffer).digest('hex');
}

// Sanity check used by tests and at proof time: round-trip a tree's stated SHA
// against our reconstruction. Throws if it disagrees.
function assertTreeHash(entries, expectedSha) {
    const serialized = serializeTreeBinary(entries);
    const got = gitObjectHash('tree', serialized);
    if (got !== expectedSha) {
        throw new Error(`Tree hash mismatch: expected ${expectedSha}, got ${got}`);
    }
}

function validateBlobPath(blobPath) {
    if (typeof blobPath !== 'string' || blobPath.length === 0) {
        throw new Error('blobPath is required');
    }
    if (blobPath.startsWith('/') || blobPath.includes('..') || blobPath.includes('\0')) {
        throw new Error('Invalid blobPath');
    }
}

// Walk from the commit's root tree down to the blob, capturing every tree on
// the path. Returns the git-tree proof envelope.
function generateGitProof(repoPath, commitSha, blobPath) {
    validateBlobPath(blobPath);

    const commitContent = getCommitContent(repoPath, commitSha);
    const commitText = commitContent.toString('utf-8');
    const treeMatch = commitText.match(/^tree ([0-9a-f]{40})\b/m);
    if (!treeMatch) throw new Error('Commit has no tree line');
    const rootTreeSha = treeMatch[1];

    const segments = blobPath.split('/');
    const treeChain = []; // ordered root → leaf as we descend
    let currentTreeSha = rootTreeSha;
    let blob = null;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const entries = getTreeEntries(repoPath, currentTreeSha);
        treeChain.push({ sha: currentTreeSha, entries });

        const isLast = i === segments.length - 1;
        const entry = entries.find(e => e.name === segment);
        if (!entry) {
            throw new Error(`Path segment '${segment}' not found in tree ${currentTreeSha}`);
        }

        if (isLast) {
            if (entry.type !== 'blob') {
                throw new Error(`Path '${blobPath}' resolves to a ${entry.type}, not a blob`);
            }
            blob = { sha: entry.hash, path: blobPath };
        } else {
            if (entry.type !== 'tree') {
                throw new Error(`Path segment '${segment}' is a ${entry.type}, not a directory`);
            }
            currentTreeSha = entry.hash;
        }
    }

    // Verifier consumes inner→outer (blob's parent first, root last).
    treeChain.reverse();

    return {
        kind: 'git-tree',
        commit: { sha: commitSha, content: commitContent.toString('utf-8') },
        rootTreeSha,
        blob,
        treeChain,
    };
}

module.exports = {
    generateGitProof,
    serializeTreeBinary,
    gitObjectHash,
    assertTreeHash,
    getTreeEntries,
    getCommitContent,
};
