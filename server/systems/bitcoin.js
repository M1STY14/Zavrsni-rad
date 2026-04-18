const express = require('express');
const router = express.Router();
const { createMerkleTree, transformTree, generateMerkleProof } = require('../merkle.js');

const MEMPOOL_API = 'https://mempool.space/api';

// Cap render depth for on-chain blocks so huge trees (thousands of txs) stay
// interactive in the 3D scene. Top 5 levels anything deeper
// collapses into placeholder leaves tagged with the underlying tx count.
const BLOCK_RENDER_MAX_DEPTH = 5;

async function getBlock(heightOrHash) {
    let hash;
    if (typeof heightOrHash === 'number') {
        const res = await fetch(`${MEMPOOL_API}/block-height/${heightOrHash}`);
        if (!res.ok) return null;
        hash = (await res.text()).trim();
    } else {
        hash = heightOrHash;
    }

    const [metaRes, txidsRes] = await Promise.all([
        fetch(`${MEMPOOL_API}/block/${hash}`),
        fetch(`${MEMPOOL_API}/block/${hash}/txids`),
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
        const tree = createMerkleTree(txids);

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
        const tree = createMerkleTree(txids);

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

// POST /merkle-from-list
router.post('/merkle-from-list', (req, res) => {
    try {
        const { transactions } = req.body;
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ error: 'Transactions array is required.' });
        }

        const tree = createMerkleTree(transactions);

        res.json({
            rootHash: tree.root.hash,
            tree: transformTree(tree.root),
        });
    } catch (err) {
        console.error('Error in merkle-from-list:', err);
        res.status(500).json({ error: 'Error generating tree: ' + err.message });
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
