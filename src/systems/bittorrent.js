const bittorrent = {
    id: 'bittorrent',
    name: 'BitTorrent',
    color: '#58d033',
    icon: '\uD83C\uDF10',
    description: 'Visualize Merkle hash trees used for BitTorrent piece verification',

    inputs: [
        { key: 'torrentUrl', label: 'Torrent URL', type: 'text', placeholder: 'https://example.com/file.torrent' },
        { key: 'demo', label: 'Demo Torrent', type: 'select',
          options: [
              { value: '', label: 'Select a demo torrent...' },
              { value: 'ubuntu-24.04-desktop', label: 'Ubuntu 24.04 Desktop (8 pieces)' },
              { value: 'sintel-trailer', label: 'Sintel Trailer (5 pieces)' },
              { value: 'sample-multi', label: 'Multi-file Project (6 pieces)' },
          ],
        },
    ],

    hint: 'Paste a URL to a .torrent file or pick a demo torrent',

    validate() {
        return true; // Always valid — empty submission loads the default demo
    },

    async fetchTree(params) {
        const res = await fetch('/api/bittorrent/tree', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                torrentUrl: params.torrentUrl || '',
                demo: params.demo || '',
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
