import React from 'react';

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
        rotate: 'Click & Drag. Rotate',
        zoom: 'Scroll. Zoom',
        pan: 'Arrow Keys. Pan',
        proof: 'Click a leaf. Show proof',
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
            'Building the Merkle tree. Large blocks can contain thousands of transactions',
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
        step_count: (n: number) => `${n} ${n === 1 ? 'step' : 'steps'}`,
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
        git_chain_count: (n: number) => `${n} ${n === 1 ? 'tree' : 'trees'} + commit`,
        git_tree_at: 'tree at',
        git_root_path: '(root)',
        git_entries_count: (n: number, name: string) => `contains ${n} entries (incl. ${name})`,
        git_sha1_bytes: (n: number) => `SHA-1 of ${n} bytes`,
        git_matches: 'matches',
        git_mismatch: 'mismatch',
        git_references_root: 'references root tree',
        git_commit_label: 'commit',
        git_legend_blob: 'blob',
        git_legend_tree: 'tree on path',
        git_legend_commit: 'commit',
        hint_internal_node: 'Internal nodes don\'t have individual proofs. Click a leaf to generate one.',
        hint_max_depth: 'Reached the visualization depth limit. Click a "… more" placeholder to drill into a truncated branch.',
        banner_truncated: 'This block has many transactions. Only the top levels are rendered. Click any "… more" placeholder to expand a deeper branch.',
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
        sections: {
            overview: 'Overview',
            endpoints: 'HTTP endpoints',
            dataflow: 'Data flow',
            limitations: 'Known limitations',
            proof: 'Proof generation & verification',
        },
        footer_line2: 'Bachelor thesis. Visualization of Merkle Trees in Real-World Systems',

        general: {
            what_is_merkle_title: 'What is a Merkle tree?',
            what_is_merkle: (
                <>
                    <p>
                        A Merkle tree is a binary tree built over a dataset by hashing each leaf's data
                        and recursively hashing the concatenation of every two children. A single bit change
                        anywhere in the input propagates to the root, so one hash <em>commits to</em> the
                        integrity of the entire dataset.
                    </p>
                    <p style={{ marginTop: '0.6rem' }}>
                        The headline benefit: proving that a specific leaf is in the tree only requires
                        <code> log₂(n) </code>
                        sibling hashes along the path to the root, regardless of dataset size. This is what
                        enables <strong>SPV-style</strong> verification. Light clients check membership
                        without downloading the whole dataset.
                    </p>
                </>
            ),
            what_app_does_title: 'What does this app do?',
            what_app_does: (
                <p>
                    The app pulls real data from three systems (Bitcoin, Git, BitTorrent), builds the
                    corresponding Merkle tree, and renders it as a 3D fractal structure via Three.js.
                    Clicking a leaf triggers an animated Merkle proof: the path from the leaf to the
                    root is highlighted, the sibling hashes used at each level are surfaced, and the
                    rehash is replayed step by step until it matches the root.
                </p>
            ),
            three_systems_title: 'The three systems',
            three_systems: (
                <>
                    <ul className="info-apps-list" style={{ marginTop: 0 }}>
                        <li style={{ background: 'rgba(247, 147, 26, 0.1)', borderLeftColor: '#f7931a' }}>
                            <strong style={{ color: '#f7931a' }}>Bitcoin:</strong> the Merkle root in the block
                            header commits to every transaction in the block.
                        </li>
                        <li style={{ background: 'rgba(110, 84, 148, 0.1)', borderLeftColor: '#6e5494' }}>
                            <strong style={{ color: '#6e5494' }}>Git:</strong> commit → tree → blob is already
                            a Merkle DAG; every SHA-1 commits to the entire directory state below it.
                        </li>
                        <li style={{ background: 'rgba(88, 208, 51, 0.1)', borderLeftColor: '#58d033' }}>
                            <strong style={{ color: '#58d033' }}>BitTorrent:</strong> piece hashes guarantee
                            integrity of files as they arrive over a peer-to-peer swarm.
                        </li>
                    </ul>
                    <p style={{ marginTop: '0.6rem', fontSize: '0.85rem', opacity: 0.7 }}>
                        Open a system tab to see the exact data flow and limitations.
                    </p>
                </>
            ),
            architecture_title: 'High-level architecture',
            architecture: (
                <>
                    <p>
                        The browser never talks directly to mempool.space, GitHub, or any BitTorrent tracker.
                        Every external request flows through a Node/Express server on port 4000, which is also
                        the only place where SHA-256 actually runs. The frontend works on a ready-built{' '}
                        <code>{'{ name, value, children }'}</code> JSON tree and only computes proof <em>paths</em>{' '}
                        (siblings along a route). It does not re-hash anything from scratch.
                    </p>
                    <p style={{ marginTop: '0.6rem' }}>
                        Two consequences: (1) the browser bundle stays free of <code>crypto</code> and native
                        modules, and (2) anything that needs a binary or a CLI (<code>git</code>, an HTTP fetch
                        of a <code>.torrent</code>, talking to mempool.space) is centralised under{' '}
                        <code>server/</code>. The frontend is React + React Three Fiber; state is managed with
                        React Query so identical inputs share a cache across navigations.
                    </p>
                </>
            ),
            merkle_core_title: 'The Merkle core algorithm',
            merkle_core: (
                <>
                    <p>
                        All three systems eventually call <code>createMerkleTree(leaves)</code> on the server.
                        It hashes every input leaf with <code>SHA-256</code>, then walks up level by level: if
                        a level has an odd number of nodes, the last one is <strong>duplicated</strong> so
                        pairs are clean (the same rule Bitcoin uses), and for each consecutive pair{' '}
                        <code>(L, R)</code> a parent node is emitted with hash{' '}
                        <code>SHA-256(L.hash + R.hash)</code> — concatenation as hex strings, then hashed once.
                    </p>
                    <p style={{ marginTop: '0.6rem' }}>
                        The result is shipped to the client as a JSON tree of{' '}
                        <code>{'{ name, value?, children?, collapsed?, leafCount? }'}</code>. Once a node hits
                        a render depth cap (4 levels for Bitcoin, 4 levels and 12 entries per directory for
                        Git, the full tree for BitTorrent), it becomes a <code>collapsed</code> placeholder
                        carrying the number of leaves underneath. This is what lets the UI render 4096-tx
                        blocks without freezing the renderer.
                    </p>
                </>
            ),
            scene_proof_title: '3D scene & proof animation',
            scene_proof: (
                <>
                    <p>
                        <strong>Layout.</strong> <code>MerkleScene3D</code> lays out the JSON tree as a{' '}
                        <em>radial fractal</em>: every parent places its children on an arc whose radius
                        shrinks with depth, and a depth-dependent angle keeps subtrees from overlapping at any
                        depth seen in practice. Leaves are coloured by their host system; collapsed
                        placeholders use a distinct desaturated material.
                    </p>
                    <p style={{ marginTop: '0.6rem' }}>
                        <strong>Click to inspect.</strong> Clicking an internal node clears selection.
                        Clicking a leaf runs <code>findProofPath(tree, leafHash)</code>, which walks from the
                        root, recurses into the first branch containing the target, and on unwind records one
                        step per level:{' '}
                        <code>{'{ level, nodeHash, siblingHash, siblingPosition, parentHash }'}</code>. The
                        steps come back in leaf-to-root order, which is the same order verification uses.
                    </p>
                    <p style={{ marginTop: '0.6rem' }}>
                        <strong>Complexity.</strong> For <em>n</em> leaves: path-finding is <code>O(n)</code>{' '}
                        worst case but ≈ <code>2·log₂(n)</code> on a balanced tree; the proof itself is{' '}
                        <code>log₂(n)</code> sibling hashes (≈ 12 hashes / ~384 B of hex for a 4096-tx block);
                        verification is <code>log₂(n)</code> hash combinations. This logarithmic proof size is
                        the headline property of Merkle trees and is identical across all three systems.
                    </p>
                </>
            ),
            tree_vs_dag_title: 'Merkle tree vs. Merkle DAG',
            tree_vs_dag: (
                <>
                    <p>
                        All three systems share the Merkle property (changing any leaf changes the root), but{' '}
                        <strong>the structures are not the same</strong>. And that changes the proof shape.
                    </p>
                    <p style={{ marginTop: '0.6rem' }}>
                        <strong>Bitcoin and BitTorrent</strong> build a <em>classic binary Merkle tree</em>{' '}
                        over a flat list of values (txids, piece hashes). Every internal node has exactly two
                        children; the parent is computed as <code>hash(left || right)</code>. The proof is{' '}
                        <code>O(log n)</code> hashes. One sibling per level on the leaf-to-root path.
                    </p>
                    <p style={{ marginTop: '0.6rem' }}>
                        <strong>Git</strong> is not a binary tree but a <em>Merkle DAG of typed objects</em>:
                        tree objects (directory listings) link to blob objects (file contents). A tree's hash
                        is computed over the <em>entire serialized entry list</em> (mode, name, child sha).
                        Not over pairs. So a proof that a blob belongs to a commit must reveal{' '}
                        <em>the full entry list</em> of every tree on the path, not just sibling hashes. That's{' '}
                        <code>O(depth × fanout)</code> bytes, but it also proves the file's exact path in the
                        repository.
                    </p>
                    <p style={{ marginTop: '0.6rem' }}>
                        The visualization tries to make the contrast tangible: the Bitcoin / BitTorrent panels
                        show pair-and-hash steps, while the Git panel shows full tree-object reconstruction
                        with the recomputed SHA-1 compared against the one git reports.
                    </p>
                </>
            ),
        },

        bitcoin: {
            overview: (
                <p>
                    A Bitcoin block contains an ordered list of transactions. The block header includes a{' '}
                    <strong>Merkle root</strong> of every txid. A single hash that commits to the block's
                    contents. Anyone holding the root and a short proof can verify a single transaction is
                    in the block without downloading the rest (this is what powers <em>Simplified Payment
                    Verification</em>, SPV).
                </p>
            ),
            endpoints: (
                <table className="info-endpoints">
                    <thead>
                        <tr><th>Method</th><th>Path</th><th>Purpose</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>GET</td><td><code>/api/bitcoin/block-by-height/:n</code></td><td>Resolve height → hash, fetch txids, build tree.</td></tr>
                        <tr><td>GET</td><td><code>/api/bitcoin/block/:hash</code></td><td>Same as above starting from a hash.</td></tr>
                        <tr><td>POST</td><td><code>/api/bitcoin/expand-subtree</code></td><td>Drill 4 more levels into a previously collapsed subtree.</td></tr>
                        <tr><td>POST</td><td><code>/api/bitcoin/merkle-from-list</code></td><td>Build a tree from a user-supplied transaction list.</td></tr>
                        <tr><td>POST</td><td><code>/api/bitcoin/merkle-proof</code></td><td>Stateless proof for one txid given the full transaction list.</td></tr>
                    </tbody>
                </table>
            ),
            dataflow: (
                <ul>
                    <li>Frontend posts a block height or hash to <code>/api/bitcoin/...</code>.</li>
                    <li>
                        Server calls <code>mempool.space/api/block/&lt;hash&gt;/txids</code> to fetch the
                        ordered txid list.
                    </li>
                    <li>
                        Leaves are hashed, then parents are built with{' '}
                        <code>SHA-256(hexL + hexR)</code> all the way to the root.
                    </li>
                    <li>
                        The full tree is cached in memory (LRU, 16 entries). Only the top 4 levels are
                        shipped to the client; deeper subtrees become <em>collapsed</em> placeholders
                        tagged with their leaf count.
                    </li>
                    <li>
                        Clicking a collapsed placeholder hits <code>/expand-subtree</code>, which returns
                        the next 4 levels from the cached tree.
                    </li>
                </ul>
            ),
            limitations: (
                <ul>
                    <li>
                        <strong>Two hashing modes:</strong> when a real block is loaded by height or hash,
                        the app uses the <em>actual Bitcoin algorithm</em>.{' '}
                        <code>SHA-256(SHA-256(left_bin || right_bin))</code> over txids in their internal byte
                        order. The root the app displays byte-matches the merkle root in the block header
                        exactly. When the user supplies a custom transaction list, the app falls back to a{' '}
                        <em>didactic</em> variant. Single SHA-256 over hex-string concatenation. Because
                        user-typed input isn't real Bitcoin txids.
                    </li>
                    <li>
                        Bitcoin's odd-leaf rule (duplicate the last hash if a level has an odd count) is
                        implemented exactly, in both modes.
                    </li>
                    <li>
                        Render depth is capped at 4 levels; anything deeper loads on demand via{' '}
                        <code>/expand-subtree</code>.
                    </li>
                    <li>
                        The server cache holds 16 most-recent trees. After eviction, generating a proof
                        requires reloading the block.
                    </li>
                </ul>
            ),
            proof: (
                <p>
                    Clicking a leaf asks the server for an authoritative proof, which it generates from the
                    cached full tree. The proof is <code>O(log n)</code> hashes. For a 4096-tx block that's
                    ~12 hashes (≈384 bytes). The client then <strong>re-runs</strong> the hash chain itself
                    using Web Crypto (double SHA-256 over binary pairs in internal byte order) and confirms
                    the result matches the stated root. The animated panel walks step by step through that
                    verification.
                </p>
            ),
        },

        git: {
            overview: (
                <p>
                    A Git repository is already a <strong>Merkle DAG</strong>. Every commit references a
                    tree (the root directory); every tree references blobs (file contents) and
                    sub-trees. Every reference is by SHA-1 hash; if one byte of any blob changes, every
                    parent SHA-1 up to the commit changes too. That is the Merkle property.
                </p>
            ),
            endpoints: (
                <table className="info-endpoints">
                    <thead>
                        <tr><th>Method</th><th>Path</th><th>Purpose</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>POST</td><td><code>/api/git/tree</code></td><td>Build a tree for a given repo path / commit ref.</td></tr>
                        <tr><td>GET</td><td><code>/api/git/commit/:sha/adjacent</code></td><td>Return the parent and child commits as neighbour trees.</td></tr>
                    </tbody>
                </table>
            ),
            dataflow: (
                <ul>
                    <li>User submits a GitHub URL or a local path (empty falls back to a demo).</li>
                    <li>
                        URL → <code>git clone --filter=blob:none --no-checkout</code> into a temp
                        directory. <em>Blobless</em> means only commit/tree objects are downloaded, not
                        file contents. Clones are reused on subsequent calls.
                    </li>
                    <li>
                        Local path → server validates with <code>git rev-parse --git-dir</code>.
                    </li>
                    <li>
                        <code>git cat-file -p &lt;commit&gt;</code> yields the tree SHA, parents, and
                        message; <code>git ls-tree</code> recursively walks the directory hierarchy.
                    </li>
                    <li>
                        Neighbor commits: parent comes from the commit header; child via{' '}
                        <code>git log --ancestry-path &lt;commit&gt;..HEAD</code>.
                    </li>
                </ul>
            ),
            limitations: (
                <ul>
                    <li>
                        Render caps: ≤ 4 directories deep, ≤ 12 entries per directory. Anything beyond is
                        collapsed into <code>... N more</code>.
                    </li>
                    <li>Submodules are not specially handled.</li>
                    <li>
                        Hashes shown in the Git tab are the <strong>real</strong> SHA-1s. They match{' '}
                        <code>git ls-tree</code> output exactly.
                    </li>
                    <li>
                        A demo fallback kicks in when the default empty path can't be resolved (e.g. the
                        server isn't run from a git repo).
                    </li>
                </ul>
            ),
            proof: (
                <p>
                    A proof that a blob belongs to a commit is: the commit object's content, the chain of
                    tree objects from the blob's parent up to the root tree (each with its full entry
                    list), and the blob's sha. The client <strong>itself</strong> reconstructs each tree's
                    binary serialization (<code>&lt;mode&gt; &lt;name&gt;\0&lt;binary-hash&gt;</code>,
                    sorted by git's rule, prefixed with <code>tree &lt;size&gt;\0</code>), runs SHA-1, and
                    asserts the result matches the SHA git reports. Finally it hashes the commit object
                    and confirms it references the root tree. This proof is byte-for-byte faithful to
                    git's on-disk format. The animation shows real hashes, not illustrative ones.
                </p>
            ),
        },

        bittorrent: {
            overview: (
                <p>
                    A <code>.torrent</code> file describes a payload split into fixed-size pieces. Each
                    piece has a hash; the receiver verifies pieces as they arrive. In{' '}
                    <strong>BitTorrent v1</strong> (almost every torrent in the wild), the{' '}
                    <code>.torrent</code> stores a <em>flat</em> concatenated list of 20-byte SHA-1
                    piece hashes. There is no tree. <strong>BitTorrent v2 (BEP 52, 2020)</strong> uses
                    per-file Merkle trees (32-byte BLAKE2b hashes over fixed-size blocks) and only
                    stores the per-file root in the metadata.
                </p>
            ),
            endpoints: (
                <table className="info-endpoints">
                    <thead>
                        <tr><th>Method</th><th>Path</th><th>Purpose</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>POST</td><td><code>/api/bittorrent/tree</code></td><td>Download/parse a <code>.torrent</code> URL, or load a demo.</td></tr>
                        <tr><td>GET</td><td><code>/api/bittorrent/demos</code></td><td>List the bundled demo torrents.</td></tr>
                    </tbody>
                </table>
            ),
            dataflow: (
                <ul>
                    <li>
                        User pastes a <code>.torrent</code> URL or picks a demo (empty → first demo loads).
                    </li>
                    <li>
                        Server downloads the file (10 MB cap, 15 s timeout, follows redirects).
                    </li>
                    <li>
                        A custom <strong>bencode</strong> decoder parses the file: dicts (<code>d…e</code>),
                        lists (<code>l…e</code>), integers (<code>i…e</code>), and length-prefixed strings
                        (<code>&lt;n&gt;:&lt;bytes&gt;</code>).
                    </li>
                    <li>
                        The <code>info.pieces</code> field is one long byte string. Every 20 bytes is one
                        piece's SHA-1. The decoder slices it into the piece-hash array.
                    </li>
                    <li>
                        The first 64 piece hashes are taken as leaves and{' '}
                        <code>createMerkleTree</code> builds a Merkle tree on top.
                    </li>
                    <li>
                        Demo torrents use hand-authored representative piece hashes.
                    </li>
                </ul>
            ),
            limitations: (
                <ul>
                    <li>
                        <strong>The Merkle tree shown here is constructed for visualization purposes.</strong>{' '}
                        Real v1 torrents <em>don't</em> organize their piece hashes into a Merkle tree.
                        They store a flat list. v2 (BEP 52) is the version that genuinely uses Merkle
                        trees, but the parser here treats every torrent as v1.
                    </li>
                    <li>
                        Display is capped at 64 pieces; large torrents (a real Ubuntu ISO has ~22,000
                        pieces) are truncated for the visualization.
                    </li>
                    <li>
                        Demo torrents use placeholder hashes that aren't computed from actual file bytes.
                    </li>
                    <li>Downloads are limited to 10 MB and 15 s.</li>
                </ul>
            ),
            proof: (
                <p>
                    Same <code>O(log n)</code> proof structure as the other systems. In a v2 torrent the
                    per-file Merkle root is exactly what's published in the metadata, so a peer can
                    verify any piece against the root in <code>log₂(n)</code> hashes. That is the
                    protocol-level use case. The animation here demonstrates that mechanic on the
                    constructed v1-style tree.
                </p>
            ),
        },
    },
};

export default en;
