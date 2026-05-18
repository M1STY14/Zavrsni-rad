// Smoke tests for the per-system route modules.
//
// These exercise the happy path of each /api/<system>/ endpoint without
// hitting any external network: bitcoin uses /merkle-from-list (pure CPU),
// git relies on the in-handler demo fallback, and bittorrent returns its
// bundled demo torrents. Each test boots a tiny Express app on a random
// port and talks to it over loopback.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const express = require('express');
const bodyParser = require('body-parser');

const bitcoinRoutes = require('./systems/bitcoin');
const gitRoutes = require('./systems/git');
const bittorrentRoutes = require('./systems/bittorrent');
const { verifyMerkleProof } = require('./merkle.js');
const { assertTreeHash } = require('./systems/git-proof.js');
const { buildBitcoinMerkleTree, verifyBitcoinProof } = require('./systems/bitcoin-merkle.js');

let server;
let baseUrl;

before(async () => {
    const app = express();
    app.use(bodyParser.json());
    app.use('/api/bitcoin', bitcoinRoutes);
    app.use('/api/git', gitRoutes);
    app.use('/api/bittorrent', bittorrentRoutes);

    await new Promise(resolve => {
        server = app.listen(0, () => {
            baseUrl = `http://127.0.0.1:${server.address().port}`;
            resolve();
        });
    });
});

after(() => new Promise(resolve => server.close(resolve)));

test('bitcoin: /merkle-from-list returns tree + rootHash', async () => {
    const res = await fetch(`${baseUrl}/api/bitcoin/merkle-from-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: ['aa', 'bb', 'cc', 'dd'] }),
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.rootHash, 'rootHash present');
    assert.match(body.rootHash, /^[0-9a-f]{64}$/, 'rootHash is sha256 hex');
    assert.ok(body.tree, 'tree present');
    assert.ok(body.tree.name, 'tree has root node');
});

test('bitcoin: /merkle-from-list rejects empty array', async () => {
    const res = await fetch(`${baseUrl}/api/bitcoin/merkle-from-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: [] }),
    });
    assert.equal(res.status, 400);
});

test('git: /tree on default repo returns commit + tree', async () => {
    const res = await fetch(`${baseUrl}/api/git/tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.rootHash, 'rootHash present');
    assert.ok(body.commit, 'commit info present');
    assert.ok(body.commit.sha, 'commit.sha present');
    assert.ok(body.tree, 'tree present');
});

test('bittorrent: /tree with no body returns default demo', async () => {
    const res = await fetch(`${baseUrl}/api/bittorrent/tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.rootHash, 'rootHash present');
    assert.ok(body.tree, 'tree present');
});

test('bittorrent: /demos lists available demos', async () => {
    const res = await fetch(`${baseUrl}/api/bittorrent/demos`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.demos) || Array.isArray(body), 'returns demo list');
});

// --- Proof round-trip tests ---
//
// Each system's /proof endpoint must return a proof that re-hashes back to the
// stated root using the same hash convention the server used to build it.

test('bitcoin proof: round-trip via /merkle-from-list cache', async () => {
    const transactions = ['aa', 'bb', 'cc', 'dd', 'ee', 'ff', 'gg'];
    const buildRes = await fetch(`${baseUrl}/api/bitcoin/merkle-from-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions }),
    });
    const built = await buildRes.json();
    const rootHash = built.rootHash;

    for (const txid of transactions) {
        const proofRes = await fetch(`${baseUrl}/api/bitcoin/proof`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rootHash, txid }),
        });
        assert.equal(proofRes.status, 200, `proof for ${txid} returned 200`);
        const proof = await proofRes.json();
        assert.equal(proof.kind, 'binary-merkle');
        assert.equal(proof.rootHash, rootHash);

        // Verify with the production verifier — recompute the root from sibling hashes.
        const flat = proof.steps.map(s => ({ position: s.siblingPosition, hash: s.siblingHash }));
        assert.ok(verifyMerkleProof(txid, flat, rootHash), `proof for ${txid} verifies`);
    }
});

test('bitcoin proof: 410 when rootHash is unknown', async () => {
    const res = await fetch(`${baseUrl}/api/bitcoin/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootHash: '0'.repeat(64), txid: 'aa' }),
    });
    assert.equal(res.status, 410);
});

test('bittorrent proof: round-trip via /tree cache', async () => {
    // Load default demo (caches the tree) and grab its rootHash.
    const treeRes = await fetch(`${baseUrl}/api/bittorrent/tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
    });
    const tree = await treeRes.json();
    const rootHash = tree.rootHash;

    // Walk the tree to collect leaf values (piece hashes).
    const leaves = [];
    function collect(node) {
        if (!node.children?.length && node.value !== undefined) leaves.push(node.value);
        else node.children?.forEach(collect);
    }
    collect(tree.tree);
    assert.ok(leaves.length >= 2, 'demo torrent has multiple pieces');

    // Sample a couple of leaves to keep the test fast.
    for (const pieceHash of leaves.slice(0, 3)) {
        const proofRes = await fetch(`${baseUrl}/api/bittorrent/proof`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rootHash, pieceHash }),
        });
        assert.equal(proofRes.status, 200);
        const proof = await proofRes.json();
        const flat = proof.steps.map(s => ({ position: s.siblingPosition, hash: s.siblingHash }));
        assert.ok(verifyMerkleProof(pieceHash, flat, rootHash), `proof for ${pieceHash.substring(0, 8)} verifies`);
    }
});

test('git proof: tree chain and commit re-hash via git-proof helpers', async () => {
    // Use this repo's HEAD against a known stable file as the fixture.
    const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).trim();
    const blobPath = 'server/merkle.js';

    const res = await fetch(`${baseUrl}/api/git/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath: '.', commitRef: headSha, blobPath }),
    });
    assert.equal(res.status, 200);
    const proof = await res.json();
    assert.equal(proof.kind, 'git-tree');
    assert.equal(proof.blob.path, blobPath);

    // Each tree's reconstructed binary must hash to its stated SHA.
    for (const tree of proof.treeChain) {
        assertTreeHash(tree.entries, tree.sha);
    }

    // Commit content must hash to the commit SHA.
    const commitBytes = Buffer.from(proof.commit.content, 'utf-8');
    const header = Buffer.from(`commit ${commitBytes.length}\0`, 'utf-8');
    const computed = crypto.createHash('sha1').update(header).update(commitBytes).digest('hex');
    assert.equal(computed, proof.commit.sha, 'commit re-hashes correctly');

    // Commit references the root tree.
    assert.match(proof.commit.content, new RegExp(`^tree ${proof.rootTreeSha}\\b`, 'm'));

    // Inner→outer chain ordering: each tree should contain an entry pointing to
    // the previously-verified hash, named after the path segment at that depth.
    const segments = blobPath.split('/');
    let prevSha = proof.blob.sha;
    for (let i = 0; i < proof.treeChain.length; i++) {
        const tree = proof.treeChain[i];
        const segmentName = segments[segments.length - 1 - i];
        const entry = tree.entries.find(e => e.name === segmentName);
        assert.ok(entry, `tree depth ${i} has entry '${segmentName}'`);
        assert.equal(entry.hash, prevSha, `entry hash links upward at depth ${i}`);
        prevSha = tree.sha;
    }
    assert.equal(prevSha, proof.rootTreeSha, 'chain terminates at root tree');
});

test('bitcoin-merkle: matches Bitcoin block 170 root byte-for-byte', () => {
    // Block 170 (the first spend tx — Satoshi → Hal Finney) is the canonical
    // small-block test vector. coinbase + 1 spend = 2 txs.
    const txids = [
        'b1fea52486ce0c62bb442b530a3f0132b826c74e473d1f2c220bfa78111c5082',
        'f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16',
    ];
    const expectedRoot = '7dac2c5666815c17a3b36427de37bb9d2e2c5ccec3f8633eb91a4205cb4c10ff';
    const tree = buildBitcoinMerkleTree(txids);
    assert.equal(tree.root.hash, expectedRoot, 'real Bitcoin Merkle root matches block 170');
});

test('bitcoin-merkle: round-trip proofs verify against the real algorithm', () => {
    // Larger fixture: 5 txids ensures odd-level duplicate-last-leaf rule fires.
    const txids = [
        'b1fea52486ce0c62bb442b530a3f0132b826c74e473d1f2c220bfa78111c5082',
        'f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16',
        'a0b1c2d3e4f5060708091a2b3c4d5e6f7081928374a5b6c7d8e9f0a1b2c3d4e5',
        '0123456789abcdeffedcba98765432101122334455667788998877665544332f',
        'deadbeefcafebabe00112233445566778899aabbccddeeff00112233445566aa',
    ];
    const tree = buildBitcoinMerkleTree(txids);
    const { generateBitcoinProof } = require('./systems/bitcoin-merkle.js');

    for (const txid of txids) {
        const { steps } = generateBitcoinProof(tree, txid);
        assert.ok(verifyBitcoinProof(txid, steps, tree.root.hash), `proof for ${txid.substring(0, 10)} verifies`);
    }
});

test('git proof: rejects bad blobPath', async () => {
    const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).trim();
    const res = await fetch(`${baseUrl}/api/git/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath: '.', commitRef: headSha, blobPath: '../etc/passwd' }),
    });
    assert.equal(res.status, 400);
});
