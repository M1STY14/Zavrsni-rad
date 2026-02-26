const bittorrent = {
    id: 'bittorrent',
    name: 'BitTorrent',
    color: '#58d033',
    icon: '\uD83C\uDF10',
    description: 'Visualize Merkle hash trees used for BitTorrent piece verification',

    inputs: [
        { key: 'torrentFile', label: 'Torrent File Path', type: 'text', placeholder: 'Path to .torrent file...' },
        { key: 'magnetLink', label: 'Magnet Link', type: 'text', placeholder: 'magnet:?xt=urn:btih:...' },
    ],

    hint: 'Provide a .torrent file path or magnet link to visualize the piece hash tree',

    validate(params) {
        return !!(params.torrentFile || params.magnetLink);
    },

    async fetchTree(params) {
        const res = await fetch('/api/bittorrent/tree', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                torrentFile: params.torrentFile,
                magnetLink: params.magnetLink,
            }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        return {
            tree: data.tree,
            rootHash: data.rootHash,
            metadata: data.torrent || null,
        };
    },
};

export default bittorrent;
