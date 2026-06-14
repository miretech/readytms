#!/bin/bash
set -e
echo "🔄 Post-merge: rebuilding ReadyTMS..."
npm install --silent
npm run build
npm run db:push
echo "✅ Build complete — restarting server..."
kill 1
