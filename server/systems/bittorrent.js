const express = require('express');
const router = express.Router();
const { createMerkleTree, transformTree, generateRichProof } = require('../merkle.js');

// Limits
const MAX_DOWNLOAD_SIZE = 10 * 1024 * 1024; // 10 MB max .torrent file
const MAX_PIECES = 64;                       // Max pieces to visualize
const DOWNLOAD_TIMEOUT = 15000;              // 15s download timeout

// LRU cache of full Merkle trees keyed by rootHash so /proof can rebuild
// proofs without re-downloading the torrent. Same pattern as bitcoin.js.
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

// --- Minimal bencode decoder ---
// Bencode format: strings="len:data", ints="iNe", lists="l...e", dicts="d...e"

function bdecode(buf, offset = 0) {
    const byte = buf[offset];

    // Dictionary: d<key><value>...e
    if (byte === 0x64) { // 'd'
        const result = {};
        let pos = offset + 1;
        while (buf[pos] !== 0x65) { // 'e'
            const [key, nextPos] = bdecode(buf, pos);
            const keyStr = Buffer.isBuffer(key) ? key.toString() : key;
            const [value, nextPos2] = bdecode(buf, nextPos);
            result[keyStr] = value;
            pos = nextPos2;
        }
        return [result, pos + 1];
    }

    // List: l<item>...e
    if (byte === 0x6c) { // 'l'
        const result = [];
        let pos = offset + 1;
        while (buf[pos] !== 0x65) { // 'e'
            const [item, nextPos] = bdecode(buf, pos);
            result.push(item);
            pos = nextPos;
        }
        return [result, pos + 1];
    }

    // Integer: i<number>e
    if (byte === 0x69) { // 'i'
        let end = offset + 1;
        while (buf[end] !== 0x65) end++; // 'e'
        const num = parseInt(buf.slice(offset + 1, end).toString(), 10);
        return [num, end + 1];
    }

    // String (byte string): <length>:<data>
    if (byte >= 0x30 && byte <= 0x39) { // '0'-'9'
        let colonPos = offset;
        while (buf[colonPos] !== 0x3a) colonPos++; // ':'
        const len = parseInt(buf.slice(offset, colonPos).toString(), 10);
        const data = buf.slice(colonPos + 1, colonPos + 1 + len);
        return [data, colonPos + 1 + len];
    }

    throw new Error(`Invalid bencode at offset ${offset}: 0x${byte.toString(16)}`);
}

function bencodeDecode(buf) {
    const [result] = bdecode(buf, 0);
    return result;
}

// --- Demo torrent data ---
// Simulates parsed .torrent metadata with piece hashes for when no file is provided

const demoTorrents = {
    'ubuntu-24.04-desktop': {
        name: 'ubuntu-24.04-desktop-amd64.iso',
        pieceLength: 262144, // 256 KB pieces
        totalSize: 5765611520, // ~5.4 GB
        files: [{ path: 'ubuntu-24.04-desktop-amd64.iso', length: 5765611520 }],
        // 8 representative SHA1 piece hashes (real torrents have thousands)
        pieceHashes: [
            'a3f1e2d4b5c6a7890123456789abcdef01234567',
            'b4c2f3e5a6d7b8901234567890abcdef12345678',
            'c5d3a4f6b7e8c9012345678901abcdef23456789',
            'd6e4b5a7c8f9d0123456789012abcdef34567890',
            'e7f5c6b8d9a0e1234567890123abcdef45678901',
            'f8a6d7c9e0b1f2345678901234abcdef56789012',
            'a9b7e8d0f1c2a3456789012345abcdef67890123',
            'b0c8f9e1a2d3b4567890123456abcdef78901234',
        ],
    },
    'sintel-trailer': {
        name: 'Sintel (2010) Trailer.mp4',
        pieceLength: 65536, // 64 KB pieces
        totalSize: 6291456, // ~6 MB
        files: [{ path: 'Sintel (2010) Trailer.mp4', length: 6291456 }],
        pieceHashes: [
            '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
            '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
            '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
            '4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e',
            '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f',
        ],
    },
    'sample-multi': {
        name: 'sample-project',
        pieceLength: 131072, // 128 KB pieces
        totalSize: 1572864, // ~1.5 MB
        files: [
            { path: 'README.md', length: 2048 },
            { path: 'src/main.py', length: 524288 },
            { path: 'src/utils.py', length: 262144 },
            { path: 'data/dataset.csv', length: 784384 },
        ],
        pieceHashes: [
            'aa11bb22cc33dd44ee55ff66aa77bb88cc99dd00',
            'bb22cc33dd44ee55ff66aa77bb88cc99dd00ee11',
            'cc33dd44ee55ff66aa77bb88cc99dd00ee11ff22',
            'dd44ee55ff66aa77bb88cc99dd00ee11ff22aa33',
            'ee55ff66aa77bb88cc99dd00ee11ff22aa33bb44',
            'ff66aa77bb88cc99dd00ee11ff22aa33bb44cc55',
        ],
    },
};

const DEMO_LIST = Object.keys(demoTorrents);

// --- Helpers ---

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function parseTorrentBuffer(raw) {
    const decoded = bencodeDecode(raw);

    if (!decoded.info) {
        throw new Error('Invalid torrent file: missing info dictionary');
    }

    const info = decoded.info;
    const piecesBuffer = info.pieces;

    if (!piecesBuffer || !Buffer.isBuffer(piecesBuffer) || piecesBuffer.length === 0) {
        throw new Error('Invalid torrent file: no piece hashes found');
    }

    if (piecesBuffer.length % 20 !== 0) {
        throw new Error('Invalid torrent file: pieces field has unexpected length');
    }

    // Extract individual 20-byte SHA1 hashes
    const pieceHashes = [];
    for (let i = 0; i < piecesBuffer.length; i += 20) {
        pieceHashes.push(piecesBuffer.slice(i, i + 20).toString('hex'));
    }

    // Extract file info — decoded values may be Buffers
    const name = Buffer.isBuffer(info.name) ? info.name.toString() : (info.name || 'Unknown');
    const pieceLength = info['piece length'] || 0;

    let files = [];
    let totalSize = 0;

    if (info.files) {
        // Multi-file torrent
        files = info.files.map(f => ({
            path: (f.path || []).map(p => Buffer.isBuffer(p) ? p.toString() : p).join('/'),
            length: f.length,
        }));
        totalSize = files.reduce((sum, f) => sum + f.length, 0);
    } else {
        // Single-file torrent
        totalSize = info.length || 0;
        files = [{ path: name, length: totalSize }];
    }

    return { name, pieceLength, totalSize, files, pieceHashes };
}

async function fetchTorrentFromUrl(url) {
    // Validate URL
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error('Invalid URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
    }

    const http = parsed.protocol === 'https:' ? require('https') : require('http');

    return new Promise((resolve, reject) => {
        const req = http.get(url, { timeout: DOWNLOAD_TIMEOUT }, (res) => {
            // Follow redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchTorrentFromUrl(res.headers.location).then(resolve).catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download torrent: HTTP ${res.statusCode}`));
                return;
            }

            const chunks = [];
            let totalBytes = 0;

            res.on('data', (chunk) => {
                totalBytes += chunk.length;
                if (totalBytes > MAX_DOWNLOAD_SIZE) {
                    req.destroy();
                    reject(new Error('Torrent file too large (max 10 MB)'));
                    return;
                }
                chunks.push(chunk);
            });

            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Download timed out'));
        });
        req.on('error', reject);
    });
}

function buildTreeResponse(torrentData) {
    const { name, pieceLength, totalSize, files, pieceHashes } = torrentData;

    // Limit pieces for visualization (large torrents can have thousands)
    const displayHashes = pieceHashes.length > MAX_PIECES
        ? pieceHashes.slice(0, MAX_PIECES)
        : pieceHashes;

    const tree = createMerkleTree(displayHashes);
    cacheSet(tree.root.hash, tree);

    return {
        tree: transformTree(tree.root),
        rootHash: tree.root.hash,
        torrent: {
            name,
            pieceLength,
            pieceCount: pieceHashes.length,
            displayedPieces: displayHashes.length,
            totalSize: formatBytes(totalSize),
            fileCount: files.length,
            files: files.slice(0, 20), // Limit file list
        },
    };
}

// --- Routes ---

// POST /tree — main endpoint
router.post('/tree', async (req, res) => {
    const { torrentUrl, demo } = req.body;

    try {
        // If a torrent URL is provided, download and parse it
        if (torrentUrl && torrentUrl.trim()) {
            const buf = await fetchTorrentFromUrl(torrentUrl.trim());
            const torrentData = parseTorrentBuffer(buf);
            return res.json(buildTreeResponse(torrentData));
        }

        // If a demo name is provided, use that
        if (demo && demoTorrents[demo]) {
            return res.json(buildTreeResponse(demoTorrents[demo]));
        }

        // Default: return the first demo torrent
        return res.json(buildTreeResponse(demoTorrents[DEMO_LIST[0]]));
    } catch (err) {
        console.error('BitTorrent error:', err.message);
        res.status(400).json({
            error: err.message,
            availableDemos: DEMO_LIST,
        });
    }
});

// POST /proof — server-authoritative Merkle proof for a cached torrent tree.
// Body: { rootHash, pieceHash } where pieceHash is the 40-char SHA-1 hex of the
// target piece (i.e. the leaf value).
router.post('/proof', (req, res) => {
    try {
        const { rootHash, pieceHash } = req.body || {};
        if (!rootHash || !pieceHash) {
            return res.status(400).json({ error: 'rootHash and pieceHash are required.' });
        }

        const cached = cacheGet(rootHash);
        if (!cached) {
            return res.status(410).json({ error: 'Tree no longer cached — please reload the torrent.' });
        }

        const { leafHash, steps } = generateRichProof(cached, pieceHash);

        res.json({
            kind: 'binary-merkle',
            rootHash,
            leaf: { value: pieceHash, hash: leafHash },
            steps,
        });
    } catch (err) {
        if (err.message === 'Leaf not found in tree.') {
            return res.status(404).json({ error: `Piece '${req.body?.pieceHash}' not found in this tree.` });
        }
        console.error('Error in proof:', err);
        res.status(500).json({ error: 'Error generating proof: ' + err.message });
    }
});

// GET /demos — list available demo torrents
router.get('/demos', (req, res) => {
    const demos = DEMO_LIST.map(key => ({
        id: key,
        name: demoTorrents[key].name,
        pieces: demoTorrents[key].pieceHashes.length,
        totalSize: formatBytes(demoTorrents[key].totalSize),
        fileCount: demoTorrents[key].files.length,
    }));
    res.json({ demos });
});

module.exports = router;
