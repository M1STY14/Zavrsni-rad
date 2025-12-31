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

function transformTree(node) {
    if (!node) return null;
    return {
        name: node.hash,
        children: node.left && node.right
            ? [transformTree(node.left), transformTree(node.right)]
            : []
    };
}

// Export funkcija
module.exports = {
    createMerkleTree,
    generateMerkleProof,
    verifyMerkleProof,
    transformTree
};