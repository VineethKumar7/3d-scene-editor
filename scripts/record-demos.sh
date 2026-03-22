#!/bin/bash
# Record demo GIFs for README
# Usage: ./scripts/record-demos.sh [demo-name]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check if server is running
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "🚀 Starting dev server..."
    ./start.sh
    sleep 3
fi

echo "🎬 Recording demos..."
npx ts-node --esm scripts/record-demos.ts "$@"

echo ""
echo "📁 GIFs in: assets/"
ls -lh assets/*.gif 2>/dev/null
