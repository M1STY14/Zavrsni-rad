# Merkle Tree Visualizer

Interactive 3D visualization of Merkle trees in real-world systems — Bitcoin, Git, and BitTorrent.

This project is the implementation component of a bachelor's thesis (*završni rad*):
**"Vizualizacija Merkle stabla u stvarnim sustavima"** by Leo Kocijan.

## Project Structure

```
merkle_visualizer/
├── src/                # Frontend React application
│   ├── components/     # UI shell, 3D scene, proof view, info modal
│   ├── systems/        # Per-system client adapters (Bitcoin, Git, BitTorrent)
│   ├── utils/          # Merkle proof computation
│   └── lib/            # Shared helpers
├── server/             # Node/Express backend
│   ├── systems/        # Per-system route handlers
│   ├── merkle.js       # Core Merkle hashing / tree builders
│   └── server.js       # Entry point (PORT 4000)
└── index.html          # Vite entry point
```

## Getting Started

### Prerequisites

- Node.js v18+
- npm
- `git` CLI on `PATH` (only required for the Git visualization with local repos / cloning)

### Installation

```bash
npm install
```

### Running the Application

The app needs both servers running.

1. **Backend (Terminal 1):**
   ```bash
   npm run server
   ```
   Listens on `http://localhost:4000`.

2. **Frontend (Terminal 2):**
   ```bash
   npm run dev
   ```
   Vite dev server on `http://localhost:3000`.

No external API keys or local Bitcoin node are required — Bitcoin data is fetched from the public [mempool.space](https://mempool.space) API.

For a deep dive into how each system is fetched, hashed, rendered, and proven — including the deliberate simplifications you should be aware of — see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

### Running the test suite

The Merkle core (`server/merkle.js`) is covered by a unit-test suite that exercises tree construction, the duplicate-last-leaf rule on odd levels, proof generation and verification round-trips, rejection of tampered proofs, and the depth-cap collapsing used by the 3D renderer:

```bash
npm test
```

No additional dev dependencies are required — the suite uses Node's built-in `node:test` runner.

### Running with Docker

A multi-stage `Dockerfile` is provided that builds the Vite frontend and serves it from the Express backend on a single port (`4000`):

```bash
docker build -t merkle-visualizer .
docker run --rm -p 4000:4000 merkle-visualizer
```

Then open <http://localhost:4000>. The image includes the `git` CLI so the Git-system integration works for any clonable URL.

## Features

- **Interactive 3D Merkle tree** with fractal layout, rendered via Three.js / React Three Fiber
- **Merkle proof generation, verification, and animated step-by-step playback** — click any leaf to highlight its path to the root and inspect the sibling hashes used at each level
- **Adjacent-block / adjacent-commit navigation** — visually step through neighboring Bitcoin blocks or Git commits without leaving the scene
- **Tree collapsing** for large structures, so trees with thousands of leaves remain navigable
- **Three real-world system integrations**:
  - **Bitcoin** — block transaction trees from mempool.space, plus pre-bundled demo blocks for offline use
  - **Git** — commit / tree / blob object hierarchy for local repositories or any clonable GitHub URL
  - **BitTorrent** — piece-hash trees parsed from `.torrent` URLs or demo torrents
- **Camera & controls** — mouse drag to rotate, scroll to zoom, arrow keys to pan, with a one-key reset
- **Responsive layout** with a dedicated mobile detection path
- **Landing → exploration phase transition** with animated camera handoff

## Technology Stack

### Frontend
- **React 18** — UI
- **Three.js / @react-three/fiber / @react-three/drei** — 3D rendering
- **@react-spring/three** & **motion** — animations
- **Vite** — build & dev server
- **Tailwind CSS v4** — styling
- **D3** — auxiliary layout math
- **lucide-react** — icons

### Backend
- **Express** — HTTP server, mounting `/api/bitcoin`, `/api/git`, `/api/bittorrent`
- **mempool.space REST API** — Bitcoin block & transaction data
- **Git CLI** — local-repo and clone-on-demand parsing
- **Custom bencode decoder** — `.torrent` file parsing

## License

© Leo Kocijan. All rights reserved.
