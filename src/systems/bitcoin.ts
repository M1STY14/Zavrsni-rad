import type { System } from '../types/system';
import type { TreeFetchResult, TreeNode } from '../types/tree';

const MAX_TX_LIST_SIZE = 1024;

interface BitcoinTreeResponse {
    tree: TreeNode;
    rootHash: string;
    block?: unknown;
    error?: string;
}

const bitcoin: System = {
    id: 'bitcoin',
    name: 'Bitcoin',
    color: '#f7931a',
    icon: '₿',
    description: 'Visualize Merkle trees built from Bitcoin block transactions',

    inputs: [
        { key: 'blockHeight', label: 'Block Height', type: 'number', placeholder: 'e.g. 800000' },
        { key: 'blockHash', label: 'Block Hash', type: 'text', placeholder: '0000000000...' },
        { key: 'transactions', label: 'Transaction List (comma-separated)', type: 'text', placeholder: 'tx1, tx2, tx3, tx4...' },
    ],

    hint: 'Enter any real Bitcoin block height or hash (fetched from mempool.space), or a custom transaction list.',

    validate(params) {
        return !!(params.blockHeight || params.blockHash || params.transactions);
    },

    async fetchTree(params): Promise<TreeFetchResult> {
        let res: Response;

        if (params.blockHeight) {
            res = await fetch(`/api/bitcoin/block-by-height/${params.blockHeight}`);
        } else if (params.blockHash) {
            res = await fetch(`/api/bitcoin/block/${params.blockHash}`);
        } else if (params.transactions) {
            const txs = params.transactions.split(',').map(s => s.trim()).filter(Boolean);
            if (txs.length > MAX_TX_LIST_SIZE) {
                throw new Error(`Transaction list capped at ${MAX_TX_LIST_SIZE} entries (got ${txs.length}). For larger sets, load a real block by height or hash.`);
            }
            res = await fetch('/api/bitcoin/merkle-from-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions: txs }),
            });
        } else {
            throw new Error('Please provide a block height, block hash, or transaction list.');
        }

        const data: BitcoinTreeResponse = await res.json();
        if (data.error) throw new Error(data.error);

        return {
            tree: data.tree,
            rootHash: data.rootHash,
            metadata: data.block || null,
        };
    },
};

export async function expandSubtree(rootHash: string, parentHash: string): Promise<TreeNode> {
    const res = await fetch('/api/bitcoin/expand-subtree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootHash, parentHash }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Failed to expand subtree.');
    return data.subtree as TreeNode;
}

export interface AdjacentBlock {
    height: number;
    tree: TreeNode;
    rootHash: string;
    side: 'left' | 'right';
}

export async function fetchAdjacentBlocks(height: number): Promise<AdjacentBlock[]> {
    const neighbors: AdjacentBlock[] = [];
    const targets: Array<{ h: number; side: 'left' | 'right' }> = [
        { h: height - 1, side: 'left' },
        { h: height + 1, side: 'right' },
    ];
    await Promise.all(targets.map(async ({ h, side }) => {
        try {
            const res = await fetch(`/api/bitcoin/block-by-height/${h}`);
            if (res.ok) {
                const data = await res.json();
                neighbors.push({ height: h, tree: data.tree, rootHash: data.rootHash, side });
            }
        } catch {
            // silently ignore — neighbor block is optional
        }
    }));
    return neighbors;
}

export default bitcoin;
