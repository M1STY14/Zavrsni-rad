// Real Bitcoin Merkle tree.
//
// Bitcoin's Merkle tree differs from the didactic merkle.js implementation in
// three ways:
//
//   1. Hash function: double-SHA-256 (HASH256), not single SHA-256.
//   2. Pair input: raw 32-byte concatenation of binary txids, NOT hex strings.
//   3. Byte order: txids are stored and hashed in their natural ("internal")
//      byte order, but block explorers and the mempool.space API display them
//      reversed. So when we get "f4184fc5..." from the API, the real bytes
//      used in hashing are "169e1e83..." (the reverse).
//
// Reference: Bitcoin Core src/consensus/merkle.cpp ComputeMerkleRoot. Also
// covered in Antonopoulos, Mastering Bitcoin, ch. "Transactions" → "Merkle
// Trees", and developer.bitcoin.org's transaction reference.
//
// Output tree shape mirrors merkle.js's: { root, tree } where tree is an
// ordered array of levels (root → leaves), each node has { hash, value?, left,
// right }. `hash` is always the displayed hex (reversed bytes) so the 3D scene
// renders the same form a block explorer would show.

const crypto = require('crypto');

function hash256(buf) {
    const first = crypto.createHash('sha256').update(buf).digest();
    return crypto.createHash('sha256').update(first).digest();
}

// Convert displayed (block-explorer) hex to internal byte order. Both API
// inputs and our `hash` field use displayed form; the binary used in hashing
// is the reverse.
function displayedHexToBytes(hex) {
    return Buffer.from(hex, 'hex').reverse();
}

function bytesToDisplayedHex(buf) {
    return Buffer.from(buf).reverse().toString('hex');
}

function combinePair(leftDisplayedHex, rightDisplayedHex) {
    const concat = Buffer.concat([
        displayedHexToBytes(leftDisplayedHex),
        displayedHexToBytes(rightDisplayedHex),
    ]);
    return bytesToDisplayedHex(hash256(concat));
}

function buildBitcoinMerkleTree(txidHexArray) {
    if (txidHexArray.length === 0) return null;

    // Leaves: a Bitcoin txid IS already a hash (double-SHA of the serialized
    // transaction). The Merkle tree does NOT re-hash leaves — it pairs them.
    let level = txidHexArray.map(txid => ({ hash: txid, left: null, right: null, value: txid }));
    const tree = [level];

    while (level.length > 1) {
        if (level.length % 2 === 1) {
            level.push(level[level.length - 1]);
        }

        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];
            const right = level[i + 1];
            const combinedHash = combinePair(left.hash, right.hash);
            nextLevel.push({ hash: combinedHash, left, right });
        }

        tree.unshift(nextLevel);
        level = nextLevel;
    }

    return { root: tree[0][0], tree };
}

// Generate a frontend-shaped proof matching the rich-proof envelope (steps with
// nodeHash/siblingHash/siblingPosition/parentHash). Walks bottom-up like the
// didactic version, but the leaf hash equals the txid itself (no leaf hashing).
function generateBitcoinProof(treeObj, txidHex) {
    const levels = treeObj.tree;
    const leafLevel = levels[levels.length - 1];
    let index = leafLevel.findIndex(node => node.hash === txidHex);
    if (index === -1) throw new Error('Leaf not found in tree.');

    const steps = [];
    for (let i = levels.length - 1; i > 0; i--) {
        const level = levels[i];
        const parentLevel = levels[i - 1];
        const isRight = index % 2 === 1;
        const siblingIndex = isRight ? index - 1 : index + 1;
        const sibling = siblingIndex < level.length ? level[siblingIndex] : level[index];
        const parentIndex = Math.floor(index / 2);
        steps.push({
            nodeHash: level[index].hash,
            siblingHash: sibling.hash,
            siblingPosition: isRight ? 'left' : 'right',
            parentHash: parentLevel[parentIndex].hash,
        });
        index = parentIndex;
    }
    return { leafHash: txidHex, steps };
}

// Node-side verifier — used by tests and as a reference for the Web Crypto
// version in the frontend. Confirms the steps re-derive the stated rootHash
// using real Bitcoin double-SHA-256 over binary pairs.
function verifyBitcoinProof(txidHex, steps, rootHash) {
    let computed = txidHex;
    for (const step of steps) {
        if (step.nodeHash !== computed) return false;
        const left = step.siblingPosition === 'left' ? step.siblingHash : computed;
        const right = step.siblingPosition === 'left' ? computed : step.siblingHash;
        computed = combinePair(left, right);
        if (computed !== step.parentHash) return false;
    }
    return computed === rootHash;
}

module.exports = {
    buildBitcoinMerkleTree,
    generateBitcoinProof,
    verifyBitcoinProof,
    combinePair,
    hash256,
};
