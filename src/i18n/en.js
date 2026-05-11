const en = {
    hero: {
        title_line1: 'Merkle Tree Visualization',
        title_line2: 'in real-world systems',
        such_as: 'such as:',
        description:
            'This application visualizes Merkle trees using React and Three.js. Explore how Merkle trees are used in modern distributed systems to guarantee data integrity.',
        start: 'Start exploring',
    },
    footer: {
        rights: 'All rights reserved.',
    },
    controls: {
        title: 'Controls',
        rotate: 'Click & Drag — Rotate',
        zoom: 'Scroll — Zoom',
        pan: 'Arrow Keys — Pan',
        proof: 'Click a leaf — Show proof',
    },
    panel: {
        title: 'Merkle Tree',
        expand_title: 'Expand',
        collapse_title: 'Collapse',
        generate: 'Generate',
        loading: 'Loading…',
        clear: 'Clear',
        root_hash: 'Root hash',
    },
    modals: {
        cloning_title: 'Cloning repository…',
        cloning_hint: 'This may take a few seconds for large repositories',
        fetching_title: 'Fetching block from mempool.space',
        fetching_hint:
            'Building the Merkle tree — large blocks can contain thousands of transactions',
    },
    buttons: {
        back_home: 'Back to home',
        about: 'About this project',
        language: 'Language',
        close: 'Close',
    },
    errors: {
        fill_one: 'Please fill in at least one input field.',
        server: 'Error connecting to server',
    },
    proof: {
        title: 'Merkle Proof',
        selected_leaf: 'Selected leaf',
        proof_path: 'Proof path',
        step_count: (n) => `${n} ${n === 1 ? 'step' : 'steps'}`,
        node: 'Node',
        sibling: 'Sibling',
        sibling_left: 'left',
        sibling_right: 'right',
        parent: 'Parent',
        root: 'Root',
        verified: 'Proof verified',
        failed: 'Verification failed',
        legend_leaf: 'Selected leaf',
        legend_path: 'Proof path',
        legend_sibling: 'Sibling (evidence)',
        git_chain_title: 'Git tree chain',
        git_chain_count: (n) => `${n} ${n === 1 ? 'tree' : 'trees'} + commit`,
        git_tree_at: 'tree at',
        git_root_path: '(root)',
        git_entries_count: (n, name) => `contains ${n} entries (incl. ${name})`,
        git_sha1_bytes: (n) => `SHA-1 of ${n} bytes`,
        git_matches: 'matches',
        git_mismatch: 'mismatch',
        git_references_root: 'references root tree',
        git_commit_label: 'commit',
        git_legend_blob: 'blob',
        git_legend_tree: 'tree on path',
        git_legend_commit: 'commit',
        hint_internal_node: 'Internal nodes don\'t have individual proofs — click a leaf to generate one.',
        hint_max_depth: 'Reached the visualization depth limit. Click a "… more" placeholder to drill into a truncated branch.',
        banner_truncated: 'This block has many transactions — only the top levels are rendered. Click any "… more" placeholder to expand a deeper branch.',
    },
    systems: {
        bitcoin: {
            name: 'Bitcoin',
            description: 'Visualize Merkle trees built from Bitcoin block transactions',
            hint: 'Enter any real Bitcoin block height or hash (fetched from mempool.space), or a custom transaction list.',
            inputs: {
                blockHeight: { label: 'Block height', placeholder: 'e.g. 800000' },
                blockHash: { label: 'Block hash', placeholder: '0000000000…' },
                transactions: {
                    label: 'Transaction list (comma-separated)',
                    placeholder: 'tx1, tx2, tx3, tx4…',
                },
            },
        },
        git: {
            name: 'Git',
            description: 'Visualize Merkle trees from Git repository objects',
            hint: 'Paste a GitHub URL or a local path. Leave empty to visualize this project at HEAD.',
            inputs: {
                repoPath: { label: 'Repository path', placeholder: 'GitHub URL or local path' },
                commitHash: { label: 'Commit hash', placeholder: 'HEAD or a commit SHA…' },
            },
        },
        bittorrent: {
            name: 'BitTorrent',
            description: 'Visualize Merkle hash trees used for BitTorrent piece verification',
            hint: 'Paste a URL to a .torrent file or pick a demo torrent.',
            inputs: {
                torrentUrl: {
                    label: 'Torrent URL',
                    placeholder: 'https://example.com/file.torrent',
                },
                demo: {
                    label: 'Demo torrent',
                    options: {
                        '': 'Select a demo torrent…',
                        'ubuntu-24.04-desktop': 'Ubuntu 24.04 Desktop (8 pieces)',
                        'sintel-trailer': 'Sintel Trailer (5 pieces)',
                        'sample-multi': 'Multi-file project (6 pieces)',
                    },
                },
            },
        },
    },
    info: {
        title: 'About this project',
        tabs: {
            general: 'General',
            bitcoin: 'Bitcoin',
            git: 'Git',
            bittorrent: 'BitTorrent',
        },
        full_doc_link: 'Read the full architecture reference (ARCHITECTURE.md)',
        sections: {
            overview: 'Overview',
            dataflow: 'Data flow',
            limitations: 'Known limitations',
            proof: 'Proof generation & verification',
        },
        footer_line1: 'Leo Kocijan © 2025',
        footer_line2: 'Bachelor thesis — Visualization of Merkle Trees in Real-World Systems',
    },
};

export default en;
