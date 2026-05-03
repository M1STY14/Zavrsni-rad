const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// System route modules
const bitcoinRoutes = require('./systems/bitcoin');
const gitRoutes = require('./systems/git');
const bittorrentRoutes = require('./systems/bittorrent');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// Mount system routes under /api/<system>/
app.use('/api/bitcoin', bitcoinRoutes);
app.use('/api/git', gitRoutes);
app.use('/api/bittorrent', bittorrentRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', systems: ['bitcoin', 'git', 'bittorrent'] });
});

// Serve the built frontend if it exists (production / Docker mode).
// In dev, Vite serves the frontend on :3000 and proxies /api here, so this
// branch is a no-op.
const buildDir = path.resolve(__dirname, '..', 'build');
if (fs.existsSync(buildDir)) {
    app.use(express.static(buildDir));
    app.get(/^\/(?!api\/).*/, (req, res) => {
        res.sendFile(path.join(buildDir, 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
