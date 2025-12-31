const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createMerkleTree, generateMerkleProof } = require('./merkle.js');
const Client = require('bitcoin-core');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());

let currentTree = null;

// Demo Bitcoin block data for testing when Bitcoin Core is not available
const demoBitcoinBlocks = {
    500000: {
        height: 500000,
        hash: '00000000000000000024fb37364cbf81fd49cc2d51c09c75c35433c3a1945d04',
        tx: [
            { txid: '63479c5791566e0cada05762974c8cc23f607c7722d6c08835f8a7c0ec37c6d4' },
            { txid: '24b1f918035784c5f58406e8c94b1b58e2f124d8c1cc8f4ab82e0f8e95e76f42' },
            { txid: 'f3e7c5a8d2b1f4e6c9a8b7d5e3f2a1c8b9d6e4f3a2b1c9d8e7f6a5b4c3d2e1f0' },
            { txid: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2' }
        ]
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
            { txid: 'b9f1e2d3c4b5a6978869584756473829105948372615849302918475661029384' }
        ]
    }
};

// bitcoin-core RPC klijent (promeni podatke ako koristiš local node)
let client = null;
try {
    client = new Client({
        network: 'mainnet',
        username: 'yourrpcuser',
        password: 'yourrpcpassword',
        host: '127.0.0.1',
        port: 8332,
        timeout: 5000
    });
} catch (err) {
    console.warn('⚠️  Bitcoin Core client not configured. Bitcoin block endpoints will use demo data.');
}

// 🚀 POST /generate-tree
app.post('/generate-tree', (req, res) => {
    const { leaves } = req.body;
    if (!leaves || !Array.isArray(leaves)) {
        return res.status(400).json({ error: "Leaves must be an array of strings" });
    }

    currentTree = createMerkleTree(leaves);
    res.json({
        rootHash: currentTree.root.hash,
        tree: transformTree(currentTree.root)
    });
});

// 🚀 GET /proof/:leaf
app.get('/proof/:leaf', (req, res) => {
    const leaf = req.params.leaf;

    if (!currentTree) {
        return res.status(400).json({ error: "No tree generated yet." });
    }

    try {
        const proof = generateMerkleProof(currentTree, leaf);
        res.json({ proof });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// 🚀 GET /bitcoin-block (demo blok)
app.get('/bitcoin-block', (req, res) => {
    try {
        const bitcoinBlock = {
            transactions: ["e3c1a9f0", "7b125f3c", "a4d1bb99", "0c5423d1"]
        };

        const tree = createMerkleTree(bitcoinBlock.transactions);
        const transformed = transformTree(tree.root);

        res.json({
            block: bitcoinBlock,
            rootHash: tree.root.hash,
            tree: transformed
        });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ GET /api/block-by-height/:height
app.get('/api/block-by-height/:height', async (req, res) => {
    try {
        const height = parseInt(req.params.height);
        let block;

        // Try to use Bitcoin Core client if available, otherwise use demo data
        if (client) {
            try {
                const blockHash = await client.getBlockHash(height);
                block = await client.getBlock(blockHash, 2); // 2 = include txs
            } catch (err) {
                console.log(`Bitcoin Core error, falling back to demo data: ${err.message}`);
                block = demoBitcoinBlocks[height];
                if (!block) {
                    return res.status(404).json({
                        error: `Demo blok za visinu ${height} nije dostupan. Pokušajte 100000 ili 500000.`
                    });
                }
            }
        } else {
            block = demoBitcoinBlocks[height];
            if (!block) {
                return res.status(404).json({
                    error: `Demo blok za visinu ${height} nije dostupan. Pokušajte 100000 ili 500000.`
                });
            }
        }

        const txids = block.tx.map(tx => tx.txid);
        const tree = createMerkleTree(txids);

        res.json({
            block,
            rootHash: tree.root.hash,
            tree: transformTree(tree.root)
        });
    } catch (err) {
        console.error('Error in block-by-height:', err);
        res.status(500).json({ error: 'Greška pri dohvaćanju bloka po visini: ' + err.message });
    }
});

// ✅ GET /api/block/:hash
app.get('/api/block/:hash', async (req, res) => {
    try {
        const requestedHash = req.params.hash;
        let block;

        // Try to use Bitcoin Core client if available, otherwise use demo data
        if (client) {
            try {
                block = await client.getBlock(requestedHash, 2);
            } catch (err) {
                console.log(`Bitcoin Core error, falling back to demo data: ${err.message}`);
                // Try to find demo block by hash
                block = Object.values(demoBitcoinBlocks).find(b => b.hash === requestedHash);
                if (!block) {
                    return res.status(404).json({
                        error: 'Blok nije pronađen. Za demo, pokušajte sa brojem bloka 100000 ili 500000.'
                    });
                }
            }
        } else {
            // Try to find demo block by hash
            block = Object.values(demoBitcoinBlocks).find(b => b.hash === requestedHash);
            if (!block) {
                return res.status(404).json({
                    error: 'Blok nije pronađen. Za demo, pokušajte sa brojem bloka 100000 ili 500000.'
                });
            }
        }

        const txids = block.tx.map(tx => tx.txid);
        const tree = createMerkleTree(txids);

        res.json({
            block,
            rootHash: tree.root.hash,
            tree: transformTree(tree.root)
        });
    } catch (err) {
        console.error('Error in block by hash:', err);
        res.status(500).json({ error: 'Greška pri dohvaćanju bloka po hashu: ' + err.message });
    }
});

// ✅ POST /api/merkle-from-list
app.post('/api/merkle-from-list', (req, res) => {
    try {
        const { transactions } = req.body;
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ error: 'Nedostaju transakcije' });
        }

        const tree = createMerkleTree(transactions);
        currentTree = tree; // Store for proof generation

        res.json({
            rootHash: tree.root.hash,
            tree: transformTree(tree.root)
        });
    } catch (err) {
        console.error('Error in merkle-from-list:', err);
        res.status(500).json({ error: 'Greška pri generiranju stabla: ' + err.message });
    }
});

// ✅ POST /api/merkle-proof
app.post('/api/merkle-proof', (req, res) => {
    try {
        const { txid } = req.body;

        if (!txid) {
            return res.status(400).json({
                error: 'Transakcija ID je potreban. Prvo generirajte stablo koristeći "Popis transakcija", zatim kliknite na čvor u stablu za dokaz.'
            });
        }

        // Use the last generated tree from the transaction list
        if (!currentTree) {
            return res.status(400).json({
                error: 'Prvo generirajte stablo koristeći "Popis transakcija" polje.'
            });
        }

        // Generate proof for the transaction
        try {
            const proof = generateMerkleProof(currentTree, txid);

            // Create a visualization of the proof path
            res.json({
                rootHash: currentTree.root.hash,
                txid: txid,
                proof: proof,
                tree: transformTree(currentTree.root)
            });
        } catch (proofErr) {
            return res.status(404).json({
                error: `Transakcija '${txid}' nije pronađena u trenutnom stablu.`
            });
        }
    } catch (err) {
        console.error('Error in merkle-proof:', err);
        res.status(500).json({ error: 'Greška pri generiranju dokaza: ' + err.message });
    }
});

// Pretvori čvorove u JSON format za frontend
function transformTree(node) {
    if (!node) return null;

    const result = { name: node.hash };
    if (node.left || node.right) {
        result.children = [];
        if (node.left) result.children.push(transformTree(node.left));
        if (node.right) result.children.push(transformTree(node.right));
    }

    return result;
}

// Pokretanje servera
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
