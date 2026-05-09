// Smoke tests for the per-system route modules.
//
// These exercise the happy path of each /api/<system>/ endpoint without
// hitting any external network: bitcoin uses /merkle-from-list (pure CPU),
// git relies on the in-handler demo fallback, and bittorrent returns its
// bundled demo torrents. Each test boots a tiny Express app on a random
// port and talks to it over loopback.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bodyParser = require('body-parser');

const bitcoinRoutes = require('./systems/bitcoin');
const gitRoutes = require('./systems/git');
const bittorrentRoutes = require('./systems/bittorrent');

let server;
let baseUrl;

before(async () => {
    const app = express();
    app.use(bodyParser.json());
    app.use('/api/bitcoin', bitcoinRoutes);
    app.use('/api/git', gitRoutes);
    app.use('/api/bittorrent', bittorrentRoutes);

    await new Promise(resolve => {
        server = app.listen(0, () => {
            baseUrl = `http://127.0.0.1:${server.address().port}`;
            resolve();
        });
    });
});

after(() => new Promise(resolve => server.close(resolve)));

test('bitcoin: /merkle-from-list returns tree + rootHash', async () => {
    const res = await fetch(`${baseUrl}/api/bitcoin/merkle-from-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: ['aa', 'bb', 'cc', 'dd'] }),
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.rootHash, 'rootHash present');
    assert.match(body.rootHash, /^[0-9a-f]{64}$/, 'rootHash is sha256 hex');
    assert.ok(body.tree, 'tree present');
    assert.ok(body.tree.name, 'tree has root node');
});

test('bitcoin: /merkle-from-list rejects empty array', async () => {
    const res = await fetch(`${baseUrl}/api/bitcoin/merkle-from-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: [] }),
    });
    assert.equal(res.status, 400);
});

test('git: /tree on default repo returns commit + tree', async () => {
    const res = await fetch(`${baseUrl}/api/git/tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.rootHash, 'rootHash present');
    assert.ok(body.commit, 'commit info present');
    assert.ok(body.commit.sha, 'commit.sha present');
    assert.ok(body.tree, 'tree present');
});

test('bittorrent: /tree with no body returns default demo', async () => {
    const res = await fetch(`${baseUrl}/api/bittorrent/tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.rootHash, 'rootHash present');
    assert.ok(body.tree, 'tree present');
});

test('bittorrent: /demos lists available demos', async () => {
    const res = await fetch(`${baseUrl}/api/bittorrent/demos`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.demos) || Array.isArray(body), 'returns demo list');
});
