// Tests for the Merkle core (server/merkle.js).
//
// These tests use node:test (built into Node 18+), so no extra dev dependency
// is required. Run with `npm test` from the project root, or:
//     node --test server/merkle.test.js
//
// Note on the hashing convention validated here: this implementation is the
// *didactic* one described in ARCHITECTURE.md — single SHA-256 over UTF-8
// hex strings, with the duplicate-last-leaf rule on odd levels. It is NOT
// bit-for-bit Bitcoin (which uses double-SHA-256 over little-endian binary
// txids). The tests therefore verify the algorithm as documented, not the
// real Bitcoin block-merkle output.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const {
    createMerkleTree,
    generateMerkleProof,
    verifyMerkleProof,
    transformTree,
    findSubtreeByHash,
} = require('./merkle.js');

// Independent reference implementation — duplicated on purpose so the tests
// would fail if the production code's hash convention drifted.
function refSha256(s) {
    return crypto.createHash('sha256').update(s).digest('hex');
}

describe('createMerkleTree — basic shape', () => {
    test('returns null for an empty input', () => {
        assert.equal(createMerkleTree([]), null);
    });

    test('single leaf: root hash equals sha256(leaf)', () => {
        const { root, tree } = createMerkleTree(['a']);
        assert.equal(root.hash, refSha256('a'));
        assert.equal(tree.length, 1);
        assert.equal(tree[0].length, 1);
    });

    test('two leaves: root = sha256(h(a) + h(b))', () => {
        const { root, tree } = createMerkleTree(['a', 'b']);
        const expected = refSha256(refSha256('a') + refSha256('b'));
        assert.equal(root.hash, expected);
        assert.equal(tree.length, 2);
        assert.equal(tree[0].length, 1); // root level
        assert.equal(tree[1].length, 2); // leaf level
    });

    test('four leaves: balanced tree, hashes computed bottom-up', () => {
        const leaves = ['a', 'b', 'c', 'd'];
        const { root } = createMerkleTree(leaves);

        const ha = refSha256('a'), hb = refSha256('b');
        const hc = refSha256('c'), hd = refSha256('d');
        const hab = refSha256(ha + hb);
        const hcd = refSha256(hc + hd);
        const expected = refSha256(hab + hcd);

        assert.equal(root.hash, expected);
        assert.equal(root.left.hash, hab);
        assert.equal(root.right.hash, hcd);
    });
});

describe('createMerkleTree — odd-leaf duplication rule', () => {
    test('three leaves: last leaf is duplicated to pair with itself', () => {
        // Per ARCHITECTURE.md: when a level has an odd number of nodes, the
        // last node is duplicated. So for [a, b, c]:
        //   level 0 (after duplication): a, b, c, c
        //   level 1: hash(a||b), hash(c||c)
        //   root:    hash(hash(a||b) || hash(c||c))
        const { root } = createMerkleTree(['a', 'b', 'c']);

        const ha = refSha256('a'), hb = refSha256('b'), hc = refSha256('c');
        const hab = refSha256(ha + hb);
        const hcc = refSha256(hc + hc);
        const expected = refSha256(hab + hcc);

        assert.equal(root.hash, expected);
    });

    test('five leaves: duplication propagates across levels', () => {
        // [a,b,c,d,e] → [a,b,c,d,e,e] → [ab, cd, ee] → [ab,cd,ee,ee] → [abcd, eeee] → root
        const { root } = createMerkleTree(['a', 'b', 'c', 'd', 'e']);

        const h = refSha256;
        const ab = h(h('a') + h('b'));
        const cd = h(h('c') + h('d'));
        const ee = h(h('e') + h('e'));
        const abcd = h(ab + cd);
        const eeee = h(ee + ee);
        const expected = h(abcd + eeee);

        assert.equal(root.hash, expected);
    });
});

describe('generateMerkleProof + verifyMerkleProof — round trip', () => {
    const sizes = [1, 2, 3, 4, 5, 7, 8, 16];

    for (const n of sizes) {
        test(`every leaf in a ${n}-leaf tree has a verifiable proof`, () => {
            const leaves = Array.from({ length: n }, (_, i) => `tx${i}`);
            const treeObj = createMerkleTree(leaves);
            const rootHash = treeObj.root.hash;

            for (const leaf of leaves) {
                const proof = generateMerkleProof(treeObj, leaf);
                assert.ok(
                    verifyMerkleProof(leaf, proof, rootHash),
                    `proof for leaf ${leaf} (n=${n}) should verify`
                );
            }
        });
    }

    test('proof for the only leaf in a 1-leaf tree is empty', () => {
        const treeObj = createMerkleTree(['only']);
        const proof = generateMerkleProof(treeObj, 'only');
        assert.deepEqual(proof, []);
        assert.ok(verifyMerkleProof('only', proof, treeObj.root.hash));
    });

    test('proof step uses correct sibling position', () => {
        // For [a, b]: a is index 0 (left), so its proof contains b on the right.
        const treeObj = createMerkleTree(['a', 'b']);
        const proof = generateMerkleProof(treeObj, 'a');
        assert.equal(proof.length, 1);
        assert.equal(proof[0].position, 'right');
        assert.equal(proof[0].hash, refSha256('b'));
    });
});

describe('verifyMerkleProof — rejection cases', () => {
    test('returns false when verifying against the wrong root', () => {
        const treeObj = createMerkleTree(['a', 'b', 'c', 'd']);
        const proof = generateMerkleProof(treeObj, 'a');
        const wrongRoot = refSha256('not the real root');
        assert.equal(verifyMerkleProof('a', proof, wrongRoot), false);
    });

    test('returns false when the leaf value is wrong', () => {
        const treeObj = createMerkleTree(['a', 'b', 'c', 'd']);
        const proof = generateMerkleProof(treeObj, 'a');
        assert.equal(verifyMerkleProof('z', proof, treeObj.root.hash), false);
    });

    test('returns false when a proof step has been tampered with', () => {
        const treeObj = createMerkleTree(['a', 'b', 'c', 'd']);
        const proof = generateMerkleProof(treeObj, 'a');
        const tampered = proof.map((step, i) =>
            i === 0 ? { ...step, hash: refSha256('tampered') } : step
        );
        assert.equal(verifyMerkleProof('a', tampered, treeObj.root.hash), false);
    });
});

describe('generateMerkleProof — error cases', () => {
    test('throws when the leaf is not in the tree', () => {
        const treeObj = createMerkleTree(['a', 'b', 'c']);
        assert.throws(
            () => generateMerkleProof(treeObj, 'missing'),
            /Leaf not found/
        );
    });
});

describe('findSubtreeByHash', () => {
    test('locates the root by its own hash', () => {
        const { root } = createMerkleTree(['a', 'b', 'c', 'd']);
        assert.equal(findSubtreeByHash(root, root.hash), root);
    });

    test('locates an intermediate node', () => {
        const { root } = createMerkleTree(['a', 'b', 'c', 'd']);
        const leftChild = root.left;
        const found = findSubtreeByHash(root, leftChild.hash);
        assert.equal(found, leftChild);
    });

    test('locates a leaf node', () => {
        const { root } = createMerkleTree(['a', 'b']);
        const leafHash = refSha256('a');
        const found = findSubtreeByHash(root, leafHash);
        assert.ok(found);
        assert.equal(found.hash, leafHash);
        assert.equal(found.value, 'a');
    });

    test('returns null when the hash is unknown', () => {
        const { root } = createMerkleTree(['a', 'b']);
        assert.equal(findSubtreeByHash(root, refSha256('not in tree')), null);
    });
});

describe('transformTree', () => {
    test('without maxDepth: full structure is preserved', () => {
        const { root } = createMerkleTree(['a', 'b', 'c', 'd']);
        const out = transformTree(root);

        assert.equal(out.name, root.hash);
        assert.equal(out.children.length, 2);
        assert.equal(out.children[0].children.length, 2);
        // Leaves carry their original value
        assert.equal(out.children[0].children[0].value, 'a');
    });

    test('with maxDepth: deep subtrees collapse with leafCount', () => {
        // 8-leaf balanced tree → depth 3 below root. maxDepth=1 collapses
        // both children of the root.
        const leaves = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const { root } = createMerkleTree(leaves);
        const out = transformTree(root, 1);

        assert.equal(out.children.length, 2);
        for (const child of out.children) {
            assert.equal(child.collapsed, true);
            assert.equal(child.leafCount, 4);
        }
    });

    test('maxDepth deeper than the tree leaves it intact', () => {
        const { root } = createMerkleTree(['a', 'b']);
        const out = transformTree(root, 99);
        assert.equal(out.children.length, 2);
        assert.equal(out.children[0].value, 'a');
        assert.equal(out.children[1].value, 'b');
        // No collapse markers anywhere
        assert.equal(out.collapsed, undefined);
    });
});
