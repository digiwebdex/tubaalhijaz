#!/bin/bash
# Tuba Al Hijaz — VPS deployment helper.
# Run from /var/www/tubaalhijaz after `git clone`.
set -e
echo "VITE_API_URL=/api" > .env
mkdir -p logs server/uploads
npm install --no-audit --no-fund
npm run build
cd server && npm install --no-audit --no-fund
echo "Done. Now: cp server/.env.tubaalhijaz.example server/.env && nano server/.env"
echo "Then: pm2 start ../ecosystem.config.cjs && pm2 save"
