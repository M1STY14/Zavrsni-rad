const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// System route modules
const bitcoinRoutes = require('./systems/bitcoin');
const gitRoutes = require('./systems/git');
const bittorrentRoutes = require('./systems/bittorrent');

const app = express();
const PORT = 4000;

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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
