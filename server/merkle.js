const crypto = require('crypto');
//funkcija za hashiranje podataka
function sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}


// Kreiranje Merkle stabla
function createMerkleTree(leaves) {
    if (leaves.length === 0) return null;
    // inicijalizacija lista listova
    let level = leaves.map(leaf => ({ hash: sha256(leaf), left: null, right: null, value: leaf }));

    const tree = [level]; // stablo se gradi od dna prema vrhu

    while (level.length > 1) {
        // Ako je broj čvorova neparan, dupliciraj zadnji čvor
        if (level.length % 2 === 1) {
            level.push(level[level.length - 1]);
        }

        const nextLevel = [];

        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];
            const right = level[i + 1];

            const combinedHash = sha256(left.hash + right.hash);

            nextLevel.push({
                hash: combinedHash,
                left: left,
                right: right,
            });
        }

        tree.unshift(nextLevel);// dodavanje novog nivoa na početak stabla
        level = nextLevel;
    }

    return { root: tree[0][0], tree }; // vraća korijen stabla i cijelo stablo
}

// Generiranje Merkle proof-a
function generateMerkleProof(treeObj, leafValue) {
    const targetHash = sha256(leafValue);// hashiranje vrijednosti lista
    let proof = [];// inicijalizacija dokaza

    // treeObj has structure { root, tree } where tree is an array of levels
    // tree[0] is the root level, tree[tree.length-1] is the leaf level
    const levels = treeObj.tree;

    // Prvo pronalazimo indeks lista u posljednjem nivou stabla (listovi)
    const leafLevel = levels[levels.length - 1];
    let index = leafLevel.findIndex(node => node.hash === targetHash);

    if (index === -1) {
        throw new Error('Leaf not found in tree.');
    }

    // Traverse od dna prema vrhu (od listova prema korijenu)
    for (let i = levels.length - 1; i > 0; i--) {
        const level = levels[i];// trenutni nivo

        const isRightNode = index % 2;// da li je trenutni čvor desni čvor
        // Ako je desni čvor, uzmi lijevi čvor kao par
        // Ako je lijevi čvor, uzmi desni čvor kao par
        const pairIndex = isRightNode ? index - 1 : index + 1;

        // Ako postoji par, dodaj ga u dokaz
        if (pairIndex < level.length) {
            proof.push({
                position: isRightNode ? 'left' : 'right',
                hash: level[pairIndex].hash
            });
        }

        index = Math.floor(index / 2);//roditelj čvora
    }

    return proof;
}

// Frontend-shaped proof: each step is {nodeHash, siblingHash, siblingPosition,
// parentHash} so the visualizer can render the leaf-to-root chain directly.
// Same correctness guarantees as generateMerkleProof — just packaged richer.
function generateRichProof(treeObj, leafValue) {
    const targetHash = sha256(leafValue);
    const levels = treeObj.tree;
    const leafLevel = levels[levels.length - 1];
    let index = leafLevel.findIndex(node => node.hash === targetHash);
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
    return { leafHash: targetHash, steps };
}

// Verifikacija Merkle dokaza
function verifyMerkleProof(leafValue, proof, rootHash) {
    let computedHash = sha256(leafValue);
    // Prolazimo kroz svaki korak dokaza
    // Ako je pozicija lijeva, hashiramo lijevi čvor i trenutni hash
    // Ako je pozicija desna, hashiramo trenutni hash i desni čvor
    // Na kraju, upoređujemo izračunati hash sa korijenskim hashom
    // Ako su jednaki, dokaz je validan
    // Ako nisu jednaki, dokaz nije validan
    for (const step of proof) {
        if (step.position === 'left') {
            computedHash = sha256(step.hash + computedHash);
        } else {
            computedHash = sha256(computedHash + step.hash);
        }
    }

    return computedHash === rootHash;
}

function countLeaves(node) {
    if (!node) return 0;
    if (!node.left && !node.right) return 1;
    return countLeaves(node.left) + countLeaves(node.right);
}

function transformTree(node, maxDepth, depth = 0) {
    if (!node) return null;
    const result = { name: node.hash };
    if (node.value !== undefined) result.value = node.value;
    const hasChildren = node.left || node.right;
    if (hasChildren) {
        if (maxDepth !== undefined && depth >= maxDepth) {
            // Collapse deep subtree into a placeholder leaf with a count.
            result.collapsed = true;
            result.leafCount = countLeaves(node);
            return result;
        }
        result.children = [];
        if (node.left) result.children.push(transformTree(node.left, maxDepth, depth + 1));
        if (node.right) result.children.push(transformTree(node.right, maxDepth, depth + 1));
    }
    return result;
}

// Locate a subtree by its root hash inside a fully-built internal tree
// (the structure produced by createMerkleTree, with `hash`, `left`, `right`).
function findSubtreeByHash(node, hash) {
    if (!node) return null;
    if (node.hash === hash) return node;
    return findSubtreeByHash(node.left, hash) || findSubtreeByHash(node.right, hash);
}

// Export funkcija
module.exports = {
    createMerkleTree,
    generateMerkleProof,
    generateRichProof,
    verifyMerkleProof,
    transformTree,
    findSubtreeByHash
};