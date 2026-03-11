const bitcoin = {
    id: 'bitcoin',
    name: 'Bitcoin',
    color: '#f7931a',
    icon: '\u20BF',
    description: 'Visualize Merkle trees built from Bitcoin block transactions',

    inputs: [
        { key: 'blockHeight', label: 'Block Height', type: 'number', placeholder: '100000 or 500000' },
        { key: 'blockHash', label: 'Block Hash', type: 'text', placeholder: '0000000000...' },
        { key: 'transactions', label: 'Transaction List (comma-separated)', type: 'text', placeholder: 'tx1, tx2, tx3, tx4...' },
    ],

    hint: 'Try Bitcoin block 100000 or 500000 for demo data, or enter custom transactions (e.g., tx1, tx2, tx3, tx4)',

    validate(params) {
        return !!(params.blockHeight || params.blockHash || params.transactions);
    },

    async fetchTree(params) {
        let res;

        if (params.blockHeight) {
            res = await fetch(`/api/bitcoin/block-by-height/${params.blockHeight}`);
        } else if (params.blockHash) {
            res = await fetch(`/api/bitcoin/block/${params.blockHash}`);
        } else if (params.transactions) {
            const txs = params.transactions.split(',').map(s => s.trim()).filter(Boolean);
            res = await fetch('/api/bitcoin/merkle-from-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions: txs }),
            });
        } else {
            throw new Error('Please provide a block height, block hash, or transaction list.');
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        return {
            tree: data.tree,
            rootHash: data.rootHash,
            metadata: data.block || null,
        };
    },
};

export async function fetchAdjacentBlocks(height) {
    const neighbors = [];
    const targets = [
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
