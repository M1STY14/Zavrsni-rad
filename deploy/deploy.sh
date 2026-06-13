#!/bin/bash
# Deploy the Merkle Tree Visualizer. Run manually or via the GitHub Actions
# workflow (which SSHes in and calls this script). Mirrors the portfolio's
# deploy pattern: pull, build, restart the service.
set -euo pipefail

# Node is installed via nvm, which only puts npm/node on PATH for interactive
# shells. The CI deploy runs this script non-interactively over SSH, so load nvm
# explicitly here — otherwise `npm` is "command not found".
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
set +u  # nvm.sh references unset vars; don't let `set -u` abort the source
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
set -u

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
