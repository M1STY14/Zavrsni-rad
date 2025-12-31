# Merkle Tree Visualizer

Interactive visualization of Merkle trees in real-world systems including Bitcoin, Git, and BitTorrent.

## Project Structure

```
merkle_visualizer/
├── src/               # Frontend React application
├── server/            # Backend Express server
├── public/            # Static assets
└── index.html         # Main HTML entry point
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Install frontend dependencies:**
   ```bash
   npm install
   ```

2. **Install backend dependencies:**
   ```bash
   cd server
   npm install
   cd ..
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

### Available Scripts

#### Frontend
- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production
- `npm run preview` - Preview production build

#### Backend
- `npm run server` - Start the Express backend server
- `cd server && npm run dev` - Start backend with nodemon (auto-reload)

## Technology Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool and dev server
- **D3.js** - Data visualization
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Motion** - Animations

### Backend
- **Express** - Web server
- **Bitcoin Core** - Bitcoin blockchain integration
- **CORS** - Cross-origin resource sharing

## Features

- Interactive Merkle tree visualization
- Bitcoin block analysis
- Custom transaction list visualization
- Merkle proof generation and verification
- Zoom and pan capabilities
- Click to view node details

## Assignment Requirements

This project fulfills the requirement to visualize Merkle trees in at least two real-world systems:
- ✅ Bitcoin blocks
- 🚧 Git commits (planned)
- 🚧 BitTorrent files (planned)

## Development

Built with ⚡ Vite for fast HMR (Hot Module Replacement) and optimized builds.

## License

© 2025 Leo Kocijan. All rights reserved.
