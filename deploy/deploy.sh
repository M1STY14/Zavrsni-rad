#!/bin/bash
# Deploy the Merkle Tree Visualizer. Run manually or via the GitHub Actions
# workflow (which SSHes in and calls this script). Mirrors the portfolio's
# deploy pattern: pull, build, restart the service.
set -euo pipefail

APP_DIR=/home/deploy/merkle_visualizer
cd "$APP_DIR"

echo "==> Pulling latest main"
git pull origin main

echo "==> Building frontend (vite -> build/)"
npm ci
npm run build

echo "==> Installing server production deps"
cd server
npm ci --omit=dev
cd "$APP_DIR"

echo "==> Restarting service"
sudo systemctl restart merkle

echo "==> Done."
systemctl --no-pager status merkle | head -5
