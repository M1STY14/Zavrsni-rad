// Discriminated union of proof envelopes the server emits, plus the
// VerificationResult shape the client-side verifiers return.
//
// Each Proof.kind narrows the rest of the shape — switching on .kind in a
// renderer or verifier gives TypeScript enough to infer the right fields.

export interface ProofStep {
    nodeHash: string;
    siblingHash: string;
    siblingPosition: 'left' | 'right';
    parentHash: string;
}

// Didactic Merkle (custom tx list, BitTorrent): sha256(leafValue) for leaves,
// sha256(left.hash + right.hash) over hex strings for parents.
export interface BinaryMerkleProof {
    kind: 'binary-merkle';
    rootHash: string;
    leaf: { value: string; hash: string };
    steps: ProofStep[];
}

// Real Bitcoin Merkle: leaf hash IS the txid (no leaf re-hashing); parents
// computed as double-SHA-256 over binary pair concatenation in internal byte
// order.
export interface BitcoinMerkleProof {
    kind: 'bitcoin-merkle';
    rootHash: string;
    leaf: { value: string; hash: string };
    steps: ProofStep[];
}

export interface GitTreeEntry {
    mode: string;
    type: 'blob' | 'tree' | 'commit';
    hash: string;
    name: string;
}

// Git tree proof: chain of trees from blob's parent up to root tree, each
// with its full entry list; plus the commit object's content. The verifier
// reconstructs each tree's canonical binary serialization, runs SHA-1, and
// asserts equality with the SHA git reports.
export interface GitTreeProof {
    kind: 'git-tree';
    commit: { sha: string; content: string };
    rootTreeSha: string;
    blob: { sha: string; path: string };
    treeChain: Array<{ sha: string; entries: GitTreeEntry[] }>;
}

export type Proof = BinaryMerkleProof | BitcoinMerkleProof | GitTreeProof;

export interface VerificationCheck {
    kind: 'tree' | 'commit';
    sha: string;
    computed: string;
    ok: boolean;
    entryCount?: number;
    highlightedEntry?: string;
    byteSize?: number;
}

export interface VerificationResult {
    ok: boolean;
    reason?: string;
    computedRoot?: string | null;
    checks?: VerificationCheck[];
}
