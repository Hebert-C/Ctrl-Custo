#!/usr/bin/env bash
# Ctrl-Custo — deploy script (run from Oracle VM as deploy user)
# Usage: ./deploy.sh
set -euo pipefail

APP_DIR="/home/deploy/ctrl-custo"
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

echo "==> Pulling latest code"
cd "${APP_DIR}"
git pull origin main

echo "==> Installing production dependencies"
pnpm install --frozen-lockfile --prod

echo "==> Running database migrations"
pnpm --filter @ctrl-custo/api db:migrate

echo "==> Building web frontend"
pnpm --filter web build

echo "==> Restarting API via PM2"
pm2 restart ctrl-custo-api || pm2 start apps/api/ecosystem.config.js --env production

pm2 save

echo "==> Deploy complete"
pm2 status
