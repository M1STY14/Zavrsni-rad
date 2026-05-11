const express = require('express');
const router = express.Router();
const { createMerkleTree, transformTree, generateRichProof, findSubtreeByHash } = require('../merkle.js');
const { buildBitcoinMerkleTree, generateBitcoinProof } = require('./bitcoin-merkle.js');

const MEMPOOL_API = 'https://mempool.space/api';
const FETCH_TIMEOUT_MS = 10_000;

function fetchWithTimeout(url) {
    return fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

// Cap render depth for on-chain blocks so huge trees (thousands of txs) stay
// interactive in the 3D scene. Top 4 levels render directly; anything deeper
// collapses into placeholder leaves tagged with the underlying tx count and
// can be expanded on demand via /expand-subtree.
const BLOCK_RENDER_MAX_DEPTH = 4;
const EXPAND_DEPTH = 4;

// In-memory LRU cache of full Merkle trees keyed by block hash. Lets us serve
// /expand-subtree requests without re-fetching txids and re-hashing.
const TREE_CACHE_SIZE = 16;
const treeCache = new Map();
function cacheGet(key) {
    if (!treeCache.has(key)) return null;
    const value = treeCache.get(key);
    treeCache.delete(key);
    treeCache.set(key, value);
    return value;
}
function cacheSet(key, value) {
    if (treeCache.has(key)) treeCache.delete(key);
    treeCache.set(key, value);
    while (treeCache.size > TREE_CACHE_SIZE) {
        const oldest = treeCache.keys().next().value;
        treeCache.delete(oldest);
    }
}

async function getBlock(heightOrHash) {
    let hash;
    if (typeof heightOrHash === 'number') {
        const res = await fetchWithTimeout(`${MEMPOOL_API}/block-height/${heightOrHash}`);
        if (!res.ok) return null;
        hash = (await res.text()).trim();
    } else {
        hash = heightOrHash;
    }

    const [metaRes, txidsRes] = await Promise.all([
        fetchWithTimeout(`${MEMPOOL_API}/block/${hash}`),
        fetchWithTimeout(`${MEMPOOL_API}/block/${hash}/txids`),
    ]);

    if (!metaRes.ok || !txidsRes.ok) return null;

    const meta = await metaRes.json();
    const txids = await txidsRes.json();

    return {
        height: meta.height,
        hash: meta.id,
        timestamp: meta.timestamp,
        tx: txids.map(txid => ({ txid })),
    };
}

// GET /block-by-height/:height
router.get('/block-by-height/:height', async (req, res) => {
    try {
        const height = parseInt(req.params.height);
        const block = await getBlock(height);

        if (!block) {
            return res.status(404).json({ error: `Block at height ${height} not found.` });
        }

        const txids = block.tx.map(tx => tx.txid || tx);
        const tree = buildBitcoinMerkleTree(txids);
        cacheSet(tree.root.hash, { tree, algo: 'bitcoin' });

        res.json({
            block,
            rootHash: tree.root.hash,
            tree: transformTree(tree.root, BLOCK_RENDER_MAX_DEPTH),
        });
    } catch (err) {
        console.error('Error in block-by-height:', err);
        res.status(500).json({ error: 'Error fetching block by height: ' + err.message });
    }
});

// GET /block/:hash
router.get('/block/:hash', async (req, res) => {
    try {
        const block = await getBlock(req.params.hash);

        if (!block) {
            return res.status(404).json({ error: 'Block not found.' });
        }

        const txids = block.tx.map(tx => tx.txid || tx);
        const tree = buildBitcoinMerkleTree(txids);
        cacheSet(tree.root.hash, { tree, algo: 'bitcoin' });

        res.json({
            block,
            rootHash: tree.root.hash,
            tree: transformTree(tree.root, BLOCK_RENDER_MAX_DEPTH),
        });
    } catch (err) {
        console.error('Error in block by hash:', err);
        res.status(500).json({ error: 'Error fetching block by hash: ' + err.message });
    }
});

// POST /expand-subtree — expand a collapsed node into 4 more levels.
// Body: { rootHash, parentHash } where rootHash identifies the cached full tree
// and parentHash is the (collapsed) node the client wants to drill into.
router.post('/expand-subtree', (req, res) => {
    try {
        const { rootHash, parentHash } = req.body || {};
        if (!rootHash || !parentHash) {
            return res.status(400).json({ error: 'rootHash and parentHash are required.' });
        }

        const cached = cacheGet(rootHash);
        if (!cached) {
            return res.status(410).json({ error: 'Tree no longer cached — please reload the block.' });
        }

        const subtreeRoot = findSubtreeByHash(cached.tree.root, parentHash);
        if (!subtreeRoot) {
            return res.status(404).json({ error: 'Subtree not found in cached tree.' });
        }

        res.json({
            parentHash,
            subtree: transformTree(subtreeRoot, EXPAND_DEPTH),
        });
    } catch (err) {
        console.error('Error in expand-subtree:', err);
        res.status(500).json({ error: 'Error expanding subtree: ' + err.message });
    }
});

// POST /merkle-from-list
router.post('/merkle-from-list', (req, res) => {
    try {
        const { transactions } = req.body;
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ error: 'Transactions array is required.' });
        }

        const tree = createMerkleTree(transactions);
        cacheSet(tree.root.hash, { tree, algo: 'didactic' });

        res.json({
            rootHash: tree.root.hash,
            tree: transformTree(tree.root),
        });
    } catch (err) {
        console.error('Error in merkle-from-list:', err);
        res.status(500).json({ error: 'Error generating tree: ' + err.message });
    }
});

// POST /proof — server-authoritative Merkle proof for a cached tree.
// Body: { rootHash, txid }. Looks up the full tree cached by /block-by-* or
// /merkle-from-list, runs generateRichProof, returns the binary-merkle envelope
// the client renders + verifies via Web Crypto.
router.post('/proof', (req, res) => {
    try {
        const { rootHash, txid } = req.body || {};
        if (!rootHash || !txid) {
            return res.status(400).json({ error: 'rootHash and txid are required.' });
        }

        const cached = cacheGet(rootHash);
        if (!cached) {
            return res.status(410).json({ error: 'Tree no longer cached — please reload the block.' });
        }

        // Real Bitcoin trees use double-SHA-256 over binary pairs; the didactic
        // path (custom tx lists) keeps merkle.js's single-SHA-256-over-hex.
        // Each branch returns its own envelope kind so the verifier knows which
        // hash chain to re-run.
        if (cached.algo === 'bitcoin') {
            const { leafHash, steps } = generateBitcoinProof(cached.tree, txid);
            return res.json({
                kind: 'bitcoin-merkle',
                rootHash,
                leaf: { value: txid, hash: leafHash },
                steps,
            });
        }

        const { leafHash, steps } = generateRichProof(cached.tree, txid);

        res.json({
            kind: 'binary-merkle',
            rootHash,
            leaf: { value: txid, hash: leafHash },
            steps,
        });
    } catch (err) {
        if (err.message === 'Leaf not found in tree.') {
            return res.status(404).json({ error: `Transaction '${req.body?.txid}' not found in this tree.` });
        }
        console.error('Error in proof:', err);
        res.status(500).json({ error: 'Error generating proof: ' + err.message });
    }
});

// POST /merkle-proof (stateless - accepts transactions to rebuild tree)
router.post('/merkle-proof', (req, res) => {
    try {
        const { txid, transactions } = req.body;

        if (!txid) {
            return res.status(400).json({ error: 'Transaction ID is required.' });
        }

        if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ error: 'Transactions array is required to generate proof.' });
        }

        const tree = createMerkleTree(transactions);

        try {
            const proof = generateMerkleProof(tree, txid);
            res.json({
                rootHash: tree.root.hash,
                txid,
                proof,
                tree: transformTree(tree.root),
            });
        } catch (proofErr) {
            return res.status(404).json({
                error: `Transaction '${txid}' not found in the tree.`,
            });
        }
    } catch (err) {
        console.error('Error in merkle-proof:', err);
        res.status(500).json({ error: 'Error generating proof: ' + err.message });
    }
});

module.exports = router;
