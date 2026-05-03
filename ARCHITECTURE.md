# Architecture

This document explains how the Merkle Tree Visualizer works under the hood:
the data flow for each of the three systems (Bitcoin, Git, BitTorrent), the
hashing rules used, the rendering and proof pipeline, and the deliberate
simplifications that a careful reader (or thesis evaluator) should be aware of.

It is the long-form companion to the in-app **About** modal. The modal is a
short, language-aware tour of the same material; this document is the
definitive reference.

> **Audience:** an engineer who has just cloned the repository and wants to
> understand what happens between *"I clicked Generate"* and *"a 3D tree
> appeared on screen"*, plus a thesis reader who needs the exact mapping
> between the visualisation and the underlying protocols.

---

## 1. High-level shape

```
   browser (React + R3F)            Node/Express on :4000
   ┌─────────────────────┐          ┌─────────────────────────┐
   │  AppShell           │  fetch   │  /api/bitcoin/...       │  → mempool.space
   │   ├─ FloatingPanel  │ ───────▶ │  /api/git/...           │  → git CLI
   │   ├─ MerkleScene3D  │          │  /api/bittorrent/...    │  → HTTP download
   │   ├─ ProofPanel     │ ◀─────── │                         │     + bencode
   │   └─ InfoModal      │   tree   │  merkle.js (hash core)  │
   └─────────────────────┘          └─────────────────────────┘
```

The frontend never talks directly to mempool.space, GitHub, or any tracker.
Every external request flows through the Node server, which is also the only
place where SHA-256 hashing actually happens. The frontend works on a
ready-built `{ name, value, children }` tree and computes proof *paths*
(siblings along a route) — it does not re-hash anything.

This split has two consequences:

1. The browser bundle stays free of `crypto`/native modules.
2. Anything that requires a binary or a CLI (`git`, an HTTP fetch of a
   `.torrent`, talking to mempool.space) is centralised in `server/`.

---

## 2. The Merkle core (`server/merkle.js`)

All three systems eventually hit `createMerkleTree(leaves)`. The function:

1. Hashes every input leaf with `sha256(leaf)` to produce the bottom level.
2. While the current level has more than one node:
   - If the count is odd, **duplicate the last node** so pairs are clean.
   - For each consecutive pair `(L, R)`, emit a parent node with hash
     `sha256(L.hash + R.hash)` (concatenation as **hex strings**, then
     hashed once).
   - Prepend the new level to the tree array.
3. Return `{ root, tree }` where `tree` is an array of levels indexed from
   root (`tree[0]`) down to leaves (`tree[length-1]`).

The odd-leaf duplication rule is deliberately the same one Bitcoin uses; the
single-vs-double SHA-256 difference is discussed in §3.4.

`transformTree(node, maxDepth)` flattens the linked structure into the JSON
shape the client renders:

```js
{ name: <hash>, value?: <leafValue>, children?: [...], collapsed?: true, leafCount?: N }
```

Once a node hits `maxDepth`, it is replaced by a `collapsed: true` placeholder
that carries the number of leaves underneath. This is what lets the UI render
4096-tx blocks without freezing the renderer.

`generateMerkleProof(treeObj, leafValue)` and `verifyMerkleProof(...)` are
included in the module but, in the current build, the **frontend** does proof
extraction by walking the JSON tree directly (`src/utils/merkle.js`
`findProofPath`). The server-side functions remain available for the
`/merkle-proof` endpoint and for any future SPV-style flow.

---

## 3. Bitcoin

### 3.1 What's actually being visualised

A Bitcoin block contains an ordered list of transactions. The block header
includes a single 32-byte field — the **Merkle root** — that commits to the
list. Light clients ("SPV wallets") trust block headers from the longest
chain and verify membership of a transaction by asking a full node for the
`O(log n)` sibling hashes that connect that transaction to the root.

### 3.2 Endpoints (`server/systems/bitcoin.js`)

| Method | Path                                | Purpose                                                    |
|--------|-------------------------------------|------------------------------------------------------------|
| GET    | `/api/bitcoin/block-by-height/:n`   | Resolve height → hash, fetch txids, build tree.            |
| GET    | `/api/bitcoin/block/:hash`          | Same as above starting from a hash.                        |
| POST   | `/api/bitcoin/expand-subtree`       | Drill 4 more levels into a previously collapsed subtree.   |
| POST   | `/api/bitcoin/merkle-from-list`     | Build a tree from a user-supplied transaction list.        |
| POST   | `/api/bitcoin/merkle-proof`         | Stateless proof for one txid given the full transaction list. |

### 3.3 Data flow for a block

1. Client posts `block-by-height/800000`.
2. Server calls `mempool.space/api/block-height/800000` → block hash.
3. In parallel: `mempool.space/api/block/<hash>` (metadata) and
   `…/block/<hash>/txids` (ordered txid list).
4. `createMerkleTree(txids)` builds the full internal tree.
5. The internal `root` (linked-node form) is stashed in an in-memory
   **LRU cache** keyed by root hash — capacity 16 blocks.
6. `transformTree(root, BLOCK_RENDER_MAX_DEPTH=4)` produces the client JSON,
   collapsing anything past level 4.
7. Response: `{ block, rootHash, tree }`.

When the user clicks a collapsed placeholder in the 3D scene, the client
posts `{ rootHash, parentHash }` to `/expand-subtree`. The server fetches the
linked tree from the cache, finds the matching subtree (`findSubtreeByHash`),
and runs `transformTree` again with `EXPAND_DEPTH=4` starting from that node.
The frontend splices the result into the existing client tree via
`replaceSubtree(...)` (in `src/utils/merkle.js`).

If the cache evicted that block in the meantime, the server returns
**HTTP 410 Gone**; the UI surfaces the error and the user can reload.

### 3.4 Limitation: hashing is *not* byte-identical to Bitcoin

This is the single most important caveat for a thesis reader:

| Step                       | This app                                       | Real Bitcoin                                         |
|----------------------------|------------------------------------------------|------------------------------------------------------|
| Leaf encoding              | hex string of the txid                         | 32-byte binary, **byte-reversed** ("internal" order) |
| Pair hash function         | `SHA-256(hexL + hexR)`                         | `SHA-256(SHA-256(binL ‖ binR))` (double hash)        |
| Result format              | hex string                                     | 32-byte binary                                       |

Consequence: the **root hash this app shows for block 800000 will not
byte-match the merkle root in the actual Bitcoin block header**. The
*structure* of the tree, the odd-leaf duplication rule, and the proof
mechanics are all correct; only the hash function differs. This is an
educational simplification — using the real double-SHA-256 with
byte-reversal would not change anything visible in the visualisation but
would make the codebase harder to read.

If a future change wanted full fidelity, only `merkle.js#sha256` and the
combination step would need to be replaced — the rest of the pipeline is
hash-agnostic.

### 3.5 Other limitations

- **Render depth cap:** the JSON shipped to the client is capped at 4 levels.
  Users explore deeper subtrees by clicking collapsed placeholders.
- **LRU size:** 16 blocks. After eviction, expanding a subtree requires
  reloading the block.
- **Custom transaction list cap:** 1024 entries (`MAX_TX_LIST_SIZE`); larger
  lists should use a real block.
- **No mempool data:** unconfirmed transactions are out of scope; the mempool
  endpoint is only used for block lookups.

### 3.6 Adjacent-block navigation

When the user loads a block by height, the client also fires
`fetchAdjacentBlocks(height)` which fetches `height-1` and `height+1` in
parallel. The 3D scene renders the neighbours as smaller "satellite" trees
on either side, so the user can step one block forwards or backwards
without re-typing.

---

## 4. Git

### 4.1 What's actually being visualised

A Git repository **is already a Merkle DAG**. Every commit object stores
the SHA-1 of the root tree it points at. Every tree object stores the SHA-1s
of its entries (sub-trees and blobs), each tagged with their mode and name.
A blob's SHA-1 is `sha1("blob " + size + "\0" + contents)`. Change one byte
in any blob and every SHA-1 from that blob up through every parent tree to
the commit changes too. That is the Merkle property.

The Git tab is the most "honest" of the three: the hashes shown are the
real SHA-1s and match `git ls-tree` output exactly.

### 4.2 Endpoints (`server/systems/git.js`)

| Method | Path                                        | Purpose                                              |
|--------|---------------------------------------------|------------------------------------------------------|
| POST   | `/api/git/tree`                             | Build a tree for a given repo path / commit ref.     |
| GET    | `/api/git/commit/:sha/adjacent`             | Return the parent and child commits as neighbour trees. |

### 4.3 Resolving the repository

Two modes, dispatched by `resolveRepoPath`:

1. **URL** (`https://…` or `git@…`):
   - Hash the URL → use as a stable subdirectory name under
     `$TMPDIR/merkle-git-clones/`.
   - If the directory exists, `git fetch --filter=blob:none` and update
     `refs/heads/<branch>` to track the remote (no working tree to reset —
     the clone is `--no-checkout`).
   - Otherwise `git clone --filter=blob:none --no-checkout --single-branch <url>`.
     `--filter=blob:none` is a [partial clone] that only fetches commit and
     tree objects, never blob contents. This is fast even for large
     repositories because the visualisation never reads file contents,
     only SHAs.
2. **Local path:** `git rev-parse --git-dir` validates that the path is
   actually a git repository.

[partial clone]: https://git-scm.com/docs/partial-clone

### 4.4 Building the tree

Given a commit SHA:

1. `git cat-file -p <sha>` returns the raw commit text. The header lines
   (`tree`, `parent`, `author`, `committer`) are parsed manually; everything
   after the blank line is the commit message.
2. `buildGitTree` recurses on the root tree SHA. For each node:
   - `git ls-tree <treeSha>` produces lines of the form
     `<mode> <type> <hash>\t<name>`.
   - Entries are sorted (directories first, then alphabetical).
   - Up to `MAX_ENTRIES_PER_DIR = 12` entries are emitted; anything beyond
     becomes a single `... N more` placeholder leaf.
   - Sub-trees recurse up to `MAX_DEPTH = 4`. Beyond that, the directory is
     replaced with a leaf labelled `(max depth)`.
3. The final tree wraps the root tree under a synthetic commit node:
   `{ name: <commitSha>, value: 'commit', children: [<rootDir>] }`.

### 4.5 Adjacent commits

`/commit/:sha/adjacent` returns up to two neighbours:

- **Parent (left):** taken from `info.parentShas[0]`. Merge commits collapse
  to their first parent for navigation purposes.
- **Child (right):** found with
  `git log --all --format=%H --ancestry-path <sha>..HEAD | tail -1`. This
  finds the next commit on a path that ends at `HEAD`. If `<sha>` is `HEAD`
  itself, the result is empty and the right neighbour is omitted.

### 4.6 Limitations

- **Render caps:** depth ≤ 4, ≤ 12 entries per directory. The exact same
  caps as Bitcoin's render depth, but enforced at construction time rather
  than via a placeholder + expand round-trip — Git trees are usually small
  enough that on-demand expansion isn't needed.
- **Submodules** appear as `commit`-typed entries from `git ls-tree`; the
  current parser ignores them silently (the `^(\d+)\s+(blob|tree)\s+…`
  regex only matches blobs and trees).
- **Demo fallback:** when the user submits an empty path *and* the server
  isn't running inside a git repository (or the local default fails for
  any other reason), the server returns a hard-coded snapshot of this
  project's HEAD as a fallback. This is intentionally limited to the empty
  default — an explicit user-supplied path that fails returns a 400 error
  with a hint.
- **`gitExec` timeouts:** every shell call has a 5 s default timeout
  (60 s for clone). Repositories that take longer to fetch will produce
  an error rather than hanging the request.

### 4.7 What a Git "Merkle proof" really is

A proof that file `src/foo.js` is part of commit `c0ffee` is the chain:

```
blob<src/foo.js> → tree<src/> → tree<root> → commit<c0ffee>
```

at each step the verifier needs:

- The full set of entries in the parent tree, **so it can recompute the
  parent's SHA-1 exactly**. Git's tree-hash input is the byte sequence
  `mode<space>name\0sha20bytes` for each entry, sorted in Git's canonical
  order, then hashed as `sha1("tree " + size + "\0" + contents)`.

The proof animation in this app uses the same "list of siblings up to the
root" structure, but the *combination function* it animates is the
simplified `SHA-256(hexL + hexR)`, not Git's mode/name/sha encoding. So the
animation is *structurally* correct but not bytewise faithful to how `git
fsck` actually verifies an object. This is intentional — the visualisation
is one consistent abstraction across all three systems.

---

## 5. BitTorrent

### 5.1 What's actually being visualised

A `.torrent` file describes a payload split into pieces of a fixed length
(commonly 256 KB or 1 MB). The receiver verifies pieces as they arrive.

There are two protocol versions to be aware of:

- **BitTorrent v1** — the version that essentially every torrent in the wild
  uses. The `.torrent`'s `info.pieces` field is **one long byte string**:
  the concatenation of every piece's 20-byte SHA-1 hash. **No tree.** The
  receiver verifies a piece by hashing it and looking up the matching slot
  in the flat array.
- **BitTorrent v2** ([BEP 52], standardised 2020) — replaces the flat list
  with a per-file Merkle tree of 32-byte BLAKE2b hashes over fixed-size
  blocks. Only the per-file root hashes are stored in the `.torrent`; peers
  exchange the rest of the tree on demand. v2 is the version that genuinely
  uses the Merkle structure.

[BEP 52]: https://www.bittorrent.org/beps/bep_0052.html

### 5.2 What this app does

The parser reads any `.torrent` as v1: it slices `info.pieces` into 20-byte
SHA-1s and **constructs a Merkle tree on top of those hashes** for
visualisation. The resulting tree does not exist in the actual torrent
metadata — it's a synthetic Merkle-ization for educational purposes.

For a v2 torrent the per-file Merkle structure already exists and would be
the more authentic thing to render; the parser does not currently
distinguish v2 hybrid metadata.

### 5.3 Endpoints (`server/systems/bittorrent.js`)

| Method | Path                          | Purpose                                          |
|--------|-------------------------------|--------------------------------------------------|
| POST   | `/api/bittorrent/tree`        | Download/parse a `.torrent` URL, or load a demo. |
| GET    | `/api/bittorrent/demos`       | List the bundled demo torrents.                  |

### 5.4 Bencode parser

The server ships with a ~50-line bencode decoder (`bdecode`) instead of
adding a dependency. The format:

| Type    | Encoding                               | Example          |
|---------|----------------------------------------|------------------|
| Integer | `i<digits>e`                           | `i42e`           |
| String  | `<length>:<bytes>`                     | `5:hello`        |
| List    | `l<items>e`                            | `li1ei2ee`       |
| Dict    | `d<key><value>…e`, keys sorted, strings only | `d3:fooi1ee` |

The decoder returns `Buffer` objects for byte-strings (so `info.pieces` and
binary names survive intact) and converts to UTF-8 strings only at the
edges where it makes sense (`name`, `path` segments).

### 5.5 Data flow

1. Client posts `{ torrentUrl, demo }`. URL takes priority; if neither is
   given, the first demo loads.
2. **URL path:** `fetchTorrentFromUrl` validates the protocol (HTTP/HTTPS),
   follows redirects, enforces a 10 MB cap and a 15 s timeout, and returns
   the raw `Buffer`.
3. **Demo path:** the in-memory `demoTorrents` map provides three
   hand-authored fixtures (Ubuntu desktop ISO, Sintel trailer, multi-file
   sample). These contain placeholder hashes — they aren't computed from
   real bytes.
4. `parseTorrentBuffer(raw)` runs `bdecode`, validates the `info`
   dictionary, and slices `info.pieces` into 20-byte SHA-1 hex strings.
5. `buildTreeResponse` truncates to the first `MAX_PIECES = 64` hashes and
   calls `createMerkleTree`. The resulting tree, the root, and torrent
   metadata (name, piece length, total size, file list) are returned to
   the client.

### 5.6 Limitations

- **The Merkle tree is constructed for visualisation.** It is *not* part of
  the torrent metadata for v1 (which is the version every demo here
  represents).
- **Display cap:** 64 leaves. A real Ubuntu ISO torrent has on the order of
  20,000 pieces — only the first 64 are shown.
- **Demo hashes** are placeholder values, not computed from real file
  bytes. The visualisation is realistic in *shape* but not in *origin*.
- **No DHT, no tracker, no swarm.** The system reads metadata files only;
  it never participates in a torrent.
- **Download caps:** 10 MB total file size, 15 s timeout, HTTP/HTTPS only,
  one redirect hop is followed recursively.

---

## 6. The 3D scene and proof animation

### 6.1 Layout

`MerkleScene3D` (React Three Fiber) lays out the JSON tree as a
**radial fractal**: each parent places its children on an arc whose radius
shrinks with depth. Sibling spread is driven by a depth-dependent angle
which keeps subtrees from overlapping at any depth observed in practice (4
levels for Bitcoin, sometimes more for Git). Leaves are coloured by their
host system; collapsed placeholders use a distinct desaturated material.

### 6.2 Click to inspect

Two click outcomes:

- **Internal node** clicked — no proof; selection is cleared.
- **Leaf** clicked — `findProofPath(tree, leafHash)` walks the tree from
  the root and recurses into the first branch that contains the target.
  As the recursion unwinds, every parent on the path is added to a
  `pathHashes` set and every off-path child is added to a `siblingHashes`
  set, with a `step` recorded:
  ```js
  { level, nodeHash, siblingHash, siblingPosition: 'left' | 'right', parentHash }
  ```
  The steps come back in **leaf-to-root order** (recursion unwinds
  bottom-up), which is the same order the proof is verified in.

### 6.3 Animated proof panel

`ProofVisualization` consumes `{ selectedLeaf, rootHash, steps }` and
reveals the steps one at a time with a 400 ms cadence. Visually each step
shows the current hash on the left, the sibling hash on the side indicated
by `siblingPosition`, and the resulting parent hash. The final
parent — the root — is compared against the block/commit/torrent root and
the panel renders **Proof verified** or **Verification failed** based on
that equality check.

### 6.4 Complexity

For a tree of *n* leaves:

- `findProofPath` is `O(n)` worst case (it traverses the tree once); on a
  balanced tree it visits ≈ `2 · log₂(n)` nodes on average.
- The proof itself is `log₂(n)` sibling hashes — for `n = 4096`, that's 12
  hashes (~384 B as hex strings, ~48 B as raw 32-byte SHAs).
- Verification is `log₂(n)` hash combinations.

This is the headline property of Merkle trees and is the same complexity
across all three systems.

---

## 7. Frontend internationalisation

The app is bilingual (English default, Croatian secondary) with the
language toggle stored in `localStorage` under `merkle.lang`.

- `src/i18n/en.js` and `src/i18n/hr.js` are flat dotted-key dictionaries.
- `src/i18n/index.js` exposes `LanguageProvider`, `useLang()`, and
  `useT()`. Missing keys in Croatian fall back to English silently;
  missing keys in both fall back to the key itself (so a developer
  notices).
- The language `<select>` in the top-right (just left of the info button)
  is rendered by `AppShell.jsx`. It is visible in both the landing and
  exploring phases.
- The **In-app About modal** (`InfoModal.jsx`) uses the active system to
  pre-select a tab — if the user is on the Bitcoin system and presses
  "i", the modal opens directly to the Bitcoin section. The General tab
  is the default on the landing page.

---

## 8. File map

```
server/
  server.js                  Express bootstrap — mounts /api/<system>/
  merkle.js                  createMerkleTree, transformTree, generate/verify proof
  systems/
    bitcoin.js               mempool.space client, LRU cache, expand-subtree
    git.js                   blobless clone manager, ls-tree walker, neighbour resolver
    bittorrent.js            bencode decoder, .torrent fetcher, demo fixtures

src/
  App.jsx                    Wraps AppShell in <LanguageProvider>
  components/
    AppShell.jsx             App phases (landing/exploring), top-level state, modals
    FloatingInputPanel.jsx   System pills + per-system input form
    MerkleScene3D.jsx        React Three Fiber scene, fractal layout, click handling
    ProofVisualization.jsx   Animated step-by-step proof panel
    InfoModal.jsx            Tabbed, system-aware, bilingual help modal
  systems/
    index.js                 systems = [bitcoin, git, bittorrent]
    bitcoin.js               Frontend adapter, expandSubtree, fetchAdjacentBlocks
    git.js                   Frontend adapter, fetchAdjacentCommits
    bittorrent.js            Frontend adapter
  utils/
    merkle.js                findProofPath, isLeafNode, replaceSubtree, getAllLeaves
  i18n/
    index.jsx                LanguageProvider, useLang, useT, localStorage persistence
    en.js                    English dictionary
    hr.js                    Croatian dictionary
```

---

## 9. Running and extending

```bash
npm install
npm run server     # Express on :4000
npm run dev        # Vite on :3000
```

Adding a new system would touch four places:

1. `server/systems/<name>.js` — endpoints + leaf collection logic. Reuse
   `createMerkleTree` and `transformTree` from `merkle.js`.
2. `server/server.js` — mount the new router.
3. `src/systems/<name>.js` — adapter (id, color, icon, inputs, fetchTree).
4. `src/systems/index.js` — register in the `systems` array.
5. `src/i18n/{en,hr}.js` — display strings under `systems.<id>` and
   optionally a new info-modal tab.

Adding a new language:

1. Drop `src/i18n/<code>.js` next to `en.js`/`hr.js` with the same key
   shape.
2. Register the code in `src/i18n/index.js` (`DICTS`, `LANGS`).
3. Add a label in the `LanguageSwitcher` `labels` map in `AppShell.jsx`.

---

© Leo Kocijan. Final-year thesis project: *Vizualizacija Merkle stabla u
stvarnim sustavima.*
