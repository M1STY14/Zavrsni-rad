const express = require('express');
const router = express.Router();
const { createMerkleTree, transformTree, generateMerkleProof } = require('../merkle.js');
const Client = require('bitcoin-core');

// Demo Bitcoin block data for testing when Bitcoin Core is not available
const demoBitcoinBlocks = {
    499999: {
        height: 499999,
        hash: '0000000000000000007962066dcd6675830131f2bc633f69057a7e72283e0187',
        tx: [
            { txid: 'd4a1e2b3c4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0' },
            { txid: 'e5b2f3c4d5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1' },
            { txid: 'f6c3a4d5e6f7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2' },
            { txid: 'a7d4b5e6f7a8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3' },
            { txid: 'b8e5c6f7a8b9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4' },
        ],
    },
    500001: {
        height: 500001,
        hash: '00000000000000000014e64e1e48e524b93ce5e1b3209b42ea93625553db7fc3',
        tx: [
            { txid: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a' },
            { txid: '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b' },
            { txid: '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c' },
        ],
    },
    500000: {
        height: 500000,
        hash: '00000000000000000024fb37364cbf81fd49cc2d51c09c75c35433c3a1945d04',
        tx: [
            { txid: '63479c5791566e0cada05762974c8cc23f607c7722d6c08835f8a7c0ec37c6d4' },
            { txid: '24b1f918035784c5f58406e8c94b1b58e2f124d8c1cc8f4ab82e0f8e95e76f42' },
            { txid: 'f3e7c5a8d2b1f4e6c9a8b7d5e3f2a1c8b9d6e4f3a2b1c9d8e7f6a5b4c3d2e1f0' },
            { txid: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2' },
        ],
    },
    99999: {
        height: 99999,
        hash: '000000000002d01c1fccc21636b607dfd930d31d01c3a62104612a1719011250',
        tx: [
            { txid: 'c9f6a7b8d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9' },
            { txid: 'da07b8c9e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0' },
            { txid: 'eb18c9daf7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1' },
        ],
    },
    100001: {
        height: 100001,
        hash: '00000000000080b66c911bd5ba14a74260057311eaeb1982802f7010f1a9f090',
        tx: [
            { txid: 'fc28d1a2b3c4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9' },
            { txid: 'ad39e2b3c4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0' },
            { txid: 'be4af3c4d5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1' },
            { txid: 'cf5ba4d5e6f7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2' },
        ],
    },
    100000: {
        height: 100000,
        hash: '000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506',
        tx: [
            { txid: '8c14f0db3df150123e6f3dbbf30f8b955a8249b62ac1d1ff16284aefa3d06d87' },
            { txid: 'fff2525b8931402dd09222c50775608f75787bd2b87e56995a7bdd30f79702c4' },
            { txid: '6359f0868171b1d194cbee1af2f16ea598ae8fad666d9b012c8ed2b79a236ec4' },
            { txid: 'e9a66845e05d5abc0ad04ec80f774a7e585c6e8db975962d069a522137b80c1d' },
            { txid: 'a8e0f165e0fc1c8e3e2b4e3f6d5c7b8a9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4' },
            { txid: 'b9f1e2d3c4b5a6978869584756473829105948372615849302918475661029384' },
        ],
    },
};

// Bitcoin Core RPC client
let client = null;
try {
    client = new Client({
        network: 'mainnet',
        username: 'yourrpcuser',
        password: 'yourrpcpassword',
        host: '127.0.0.1',
        port: 8332,
        timeout: 5000,
    });
} catch (err) {
    console.warn('Bitcoin Core client not configured. Using demo data.');
}

// Helper: get block data (real or demo)
async function getBlock(heightOrHash) {
    if (client) {
        try {
            let block;
            if (typeof heightOrHash === 'number') {
                const blockHash = await client.getBlockHash(heightOrHash);
                block = await client.getBlock(blockHash, 2);
            } else {
                block = await client.getBlock(heightOrHash, 2);
            }
            return block;
        } catch (err) {
            console.log(`Bitcoin Core error, falling back to demo data: ${err.message}`);
        }
    }

    // Fall back to demo data
    if (typeof heightOrHash === 'number') {
        return demoBitcoinBlocks[heightOrHash] || null;
    }
    return Object.values(demoBitcoinBlocks).find(b => b.hash === heightOrHash) || null;
}

// GET /block-by-height/:height
router.get('/block-by-height/:height', async (req, res) => {
    try {
        const height = parseInt(req.params.height);
        const block = await getBlock(height);

        if (!block) {
            return res.status(404).json({
                error: `Block at height ${height} not found. Try 100000 or 500000 for demo data.`,
            });
        }

        const txids = block.tx.map(tx => tx.txid || tx);
        const tree = createMerkleTree(txids);

        res.json({
            block,
            rootHash: tree.root.hash,
            tree: transformTree(tree.root),
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
            return res.status(404).json({
                error: 'Block not found. Try block height 100000 or 500000 for demo data.',
            });
        }

        const txids = block.tx.map(tx => tx.txid || tx);
        const tree = createMerkleTree(txids);

        res.json({
            block,
            rootHash: tree.root.hash,
            tree: transformTree(tree.root),
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
