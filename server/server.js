const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// System route modules
const bitcoinRoutes = require('./systems/bitcoin');
const gitRoutes = require('./systems/git');
const bittorrentRoutes = require('./systems/bittorrent');

const app = express();
const PORT = process.env.PORT || 4000;

// Trust the reverse proxy (nginx/caddy on the VPS) so rate-limit sees real client IPs.
app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ORIGINS || 'https://mtv.leokocijan.dev,http://localhost:3000')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

// CSP disabled — Three.js + Vite assets need permissive script/style/image rules
// that the default policy blocks. The app is read-only and serves no user HTML,
// so the other helmet defaults (HSTS, nosniff, frameguard, referrer policy) are
// the ones doing real work here.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: allowedOrigins }));
app.use(bodyParser.json());

app.use('/api/', rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
}));

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
