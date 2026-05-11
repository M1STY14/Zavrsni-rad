// Client-side Merkle proof verification using Web Crypto.
//
// The server is the proof authority: it generates the proof using the
// system-correct hash function and returns enough state for us to re-run the
// hash chain locally. This file is purely a verifier — it never *generates*
// proofs. Each verifier returns enough detail for the UI to show every step
// alongside the recomputed and expected hashes.

const encoder = new TextEncoder();

async function sha256Hex(input) {
    const bytes = typeof input === 'string' ? encoder.encode(input) : input;
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return bufferToHex(buf);
}

function bufferToHex(buf) {
    const view = new Uint8Array(buf);
    let out = '';
    for (let i = 0; i < view.length; i++) {
        out += view[i].toString(16).padStart(2, '0');
    }
    return out;
}

async function sha1Hex(bytes) {
    const buf = await crypto.subtle.digest('SHA-1', bytes);
    return bufferToHex(buf);
}

function hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
}

function concatBytes(parts) {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of parts) {
        out.set(p, off);
        off += p.length;
    }
    return out;
}

function compareUtf8(a, b) {
    const ab = encoder.encode(a);
    const bb = encoder.encode(b);
    const len = Math.min(ab.length, bb.length);
    for (let i = 0; i < len; i++) {
        if (ab[i] !== bb[i]) return ab[i] - bb[i];
    }
    return ab.length - bb.length;
}

// Match git's stored mode form: ls-tree pads tree entries to "040000", but the
// on-disk binary uses "40000". Reparse as octal to drop the leading zero.
function normalizeGitMode(mode) {
    return parseInt(mode, 8).toString(8);
}

function serializeGitTreeBinary(entries) {
    const sorted = [...entries].sort((a, b) => {
        const aName = a.type === 'tree' ? a.name + '/' : a.name;
        const bName = b.type === 'tree' ? b.name + '/' : b.name;
        return compareUtf8(aName, bName);
    });

    const parts = [];
    for (const e of sorted) {
        parts.push(encoder.encode(`${normalizeGitMode(e.mode)} ${e.name}`));
        parts.push(new Uint8Array([0]));
        parts.push(hexToBytes(e.hash));
    }
    return concatBytes(parts);
}

async function gitObjectHash(type, content) {
    const header = encoder.encode(`${type} ${content.length}\0`);
    return sha1Hex(concatBytes([header, content]));
}

// Verify a git-tree proof. Walks bottom-up: confirm each tree's entry on the
// path points to the previously-verified hash, then reconstruct the tree's
// canonical binary serialization and assert SHA-1 equals the stated tree SHA.
// Finally, hash the commit object and confirm it references the root tree.
export async function verifyGitProof(proof) {
    const segments = proof.blob.path.split('/');
    if (segments.length !== proof.treeChain.length) {
        return { ok: false, reason: 'tree chain length mismatches blob path depth', checks: [] };
    }

    const checks = [];
    let prevSha = proof.blob.sha;

    for (let i = 0; i < proof.treeChain.length; i++) {
        const tree = proof.treeChain[i];
        const segmentName = segments[segments.length - 1 - i];

        const entry = tree.entries.find(e => e.name === segmentName);
        if (!entry) {
            return { ok: false, reason: `tree at depth ${i}: entry '${segmentName}' missing`, checks };
        }
        if (entry.hash !== prevSha) {
            return { ok: false, reason: `tree at depth ${i}: entry '${segmentName}' hash mismatch`, checks };
        }

        const serialized = serializeGitTreeBinary(tree.entries);
        const computed = await gitObjectHash('tree', serialized);
        checks.push({
            kind: 'tree',
            sha: tree.sha,
            computed,
            ok: computed === tree.sha,
            entryCount: tree.entries.length,
            highlightedEntry: segmentName,
            byteSize: serialized.length,
        });
        if (computed !== tree.sha) {
            return { ok: false, reason: `tree at depth ${i}: SHA-1 mismatch`, checks };
        }

        prevSha = tree.sha;
    }

    if (prevSha !== proof.rootTreeSha) {
        return { ok: false, reason: 'root tree SHA mismatch', checks };
    }

    const commitBytes = encoder.encode(proof.commit.content);
    const commitComputed = await gitObjectHash('commit', commitBytes);
    checks.push({
        kind: 'commit',
        sha: proof.commit.sha,
        computed: commitComputed,
        ok: commitComputed === proof.commit.sha,
        byteSize: commitBytes.length,
    });
    if (commitComputed !== proof.commit.sha) {
        return { ok: false, reason: 'commit SHA-1 mismatch', checks };
    }

    if (!proof.commit.content.includes(`tree ${proof.rootTreeSha}`)) {
        return { ok: false, reason: 'commit does not reference root tree', checks };
    }

    return { ok: true, checks };
}

// Real Bitcoin Merkle pair hash: reverse displayed hex into internal byte
// order, concatenate, run SHA-256 twice, reverse the result for display.
async function bitcoinCombinePair(leftDisplayedHex, rightDisplayedHex) {
    const left = hexToBytes(leftDisplayedHex).reverse();
    const right = hexToBytes(rightDisplayedHex).reverse();
    const concat = concatBytes([left, right]);
    const first = await crypto.subtle.digest('SHA-256', concat);
    const second = await crypto.subtle.digest('SHA-256', first);
    const reversed = new Uint8Array(second).reverse();
    return bufferToHex(reversed);
}

// Verify a real Bitcoin Merkle proof. Leaves are txids (themselves already
// hashes — no leaf re-hashing). Each step pairs hashes using double-SHA-256
// over binary in internal byte order.
export async function verifyBitcoinMerkleProof(proof) {
    const { leaf, steps, rootHash } = proof;

    if (leaf.hash !== leaf.value) {
        return { ok: false, reason: 'leaf hash should equal txid for Bitcoin', computedRoot: null };
    }

    let computed = leaf.hash;
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.nodeHash !== computed) {
            return { ok: false, reason: `step ${i} node hash mismatch`, computedRoot: null };
        }
        const left = step.siblingPosition === 'left' ? step.siblingHash : computed;
        const right = step.siblingPosition === 'left' ? computed : step.siblingHash;
        computed = await bitcoinCombinePair(left, right);
        if (computed !== step.parentHash) {
            return { ok: false, reason: `step ${i} parent hash mismatch`, computedRoot: computed };
        }
    }

    return { ok: computed === rootHash, computedRoot: computed };
}

// Verify a binary-merkle proof (didactic — Bitcoin custom-list, BitTorrent).
// Mirrors merkle.js's convention: sha256(leafValue) for leaves,
// sha256(left.hash + right.hash) for parents, all applied to UTF-8 hex strings.
export async function verifyBinaryMerkleProof(proof) {
    const { leaf, steps, rootHash } = proof;

    const expectedLeafHash = await sha256Hex(leaf.value);
    if (expectedLeafHash !== leaf.hash) {
        return { ok: false, reason: 'leaf hash mismatch', computedRoot: null };
    }

    let computed = leaf.hash;
    for (const step of steps) {
        if (step.nodeHash !== computed) {
            return { ok: false, reason: `step ${steps.indexOf(step)} node hash mismatch`, computedRoot: null };
        }
        const combined = step.siblingPosition === 'left'
            ? step.siblingHash + computed
            : computed + step.siblingHash;
        computed = await sha256Hex(combined);
        if (computed !== step.parentHash) {
            return { ok: false, reason: `step ${steps.indexOf(step)} parent hash mismatch`, computedRoot: computed };
        }
    }

    return { ok: computed === rootHash, computedRoot: computed };
}
