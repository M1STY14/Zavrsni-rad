# Merkle Tree Visualizer

Interactive 3D visualization of Merkle trees in real-world systems including Bitcoin, Git, and BitTorrent.

## Project Structure

```
merkle_visualizer/
├── src/               # Frontend React application
│   ├── components/    # UI and 3D visualization components
│   ├── systems/       # System configs (Bitcoin, Git, BitTorrent)
│   └── utils/         # Merkle proof utilities
├── server/            # Backend Express server
│   ├── systems/       # System-specific route handlers
│   └── merkle.js      # Core Merkle tree algorithms
└── index.html         # Main HTML entry point
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
npm install
```

### Running the Application

You'll need to run both the frontend and backend servers:

1. **Start the backend server (Terminal 1):**
   ```bash
   npm run server
   ```
   Server will run on http://localhost:4000

2. **Start the frontend dev server (Terminal 2):**
   ```bash
   npm run dev
   ```
   Frontend will run on http://localhost:3000

## Features

- Interactive 3D Merkle tree visualization with Three.js
- Merkle proof generation, verification, and animated step-by-step visualization
- Three real-world system integrations:
  - **Bitcoin** — visualize block transaction trees (demo blocks or Bitcoin Core RPC)
  - **Git** — visualize commit/tree/blob object hierarchy (local repos or GitHub URLs)
  - **BitTorrent** — visualize piece hash trees (demo torrents or .torrent URLs)
- Click leaf nodes to highlight proof paths from leaf to root
- Adjacent block/commit navigation
- Fractal tree layout with camera controls (rotate, zoom, pan)

## Technology Stack

### Frontend
- **React 18** — UI library
- **Three.js / React Three Fiber** — 3D visualization
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Styling
- **Motion** — Animations

### Backend
- **Express** — Web server
- **Bitcoin Core RPC** — Bitcoin blockchain integration (optional)
- **Git CLI** — Git repository parsing
- **Custom bencode decoder** — Torrent file parsing

## License

Leo Kocijan. All rights reserved.
