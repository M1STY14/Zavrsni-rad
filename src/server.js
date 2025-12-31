const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createMerkleTree, generateMerkleProof } = require('./komponente/merkle.js');
const Client = require('bitcoin-core');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());

let currentTree = null;

// bitcoin-core RPC klijent (promeni podatke ako koristiš local node)
const client = new Client({
    network: 'mainnet',
    username: 'yourrpcuser',
    password: 'yourrpcpassword',
    host: '127.0.0.1',
    port: 8332
});

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
        const blockHash = await client.getBlockHash(height);
        const block = await client.getBlock(blockHash, 2); // 2 = include txs
        const txids = block.tx.map(tx => tx.txid);
        const tree = createMerkleTree(txids);

        res.json({
            block,
            rootHash: tree.root.hash,
            tree: transformTree(tree.root)
        });
    } catch (err) {
        res.status(500).json({ error: 'Greška pri dohvaćanju bloka po visini' });
    }
});

// ✅ GET /api/block/:hash
app.get('/api/block/:hash', async (req, res) => {
    try {
        const block = await client.getBlock(req.params.hash, 2);
        const txids = block.tx.map(tx => tx.txid);
        const tree = createMerkleTree(txids);

        res.json({
            block,
            rootHash: tree.root.hash,
            tree: transformTree(tree.root)
        });
    } catch (err) {
        res.status(500).json({ error: 'Greška pri dohvaćanju bloka po hashu' });
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
        res.json({
            rootHash: tree.root.hash,
            tree: transformTree(tree.root)
        });
    } catch (err) {
        res.status(500).json({ error: 'Greška pri generiranju stabla' });
    }
});

// ✅ POST /api/merkle-proof
app.post('/api/merkle-proof', (req, res) => {
    try {
        const { transactions, txid } = req.body;
        if (!Array.isArray(transactions) || !txid) {
            return res.status(400).json({ error: 'Nedostaju podaci' });
        }

        const fullTree = createMerkleTree(transactions);
        const proof = generateMerkleProof(fullTree, txid);

        res.json({
            rootHash: fullTree.root.hash,
            proof
        });
    } catch (err) {
        res.status(500).json({ error: 'Greška pri generiranju dokaza' });
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
