#!/bin/bash
# 3D Scene Editor - Start Script (Linux/macOS)
# Ensures dependencies are installed and starts the dev server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PID_FILE=".server.pid"

echo "🏗️  3D Scene Editor - Starting..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "   Install from: https://nodejs.org/ (LTS recommended)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
elif [ "package.json" -nt "node_modules" ]; then
    echo "📦 Updating dependencies..."
    npm install
else
    echo "✅ Dependencies up to date"
fi

# Stop existing server if running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "🛑 Stopping existing server (PID: $OLD_PID)..."
        kill "$OLD_PID" 2>/dev/null || true
        sleep 1
    fi
    rm -f "$PID_FILE"
fi

# Start dev server in background
echo "🚀 Starting development server..."
npm run dev &
SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"

sleep 2

if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo ""
    echo "✅ Server started (PID: $SERVER_PID)"
    echo "🌐 Open http://localhost:5173 in your browser"
    echo ""
    echo "To stop: ./stop.sh"
else
    echo "❌ Server failed to start"
    rm -f "$PID_FILE"
    exit 1
fi
