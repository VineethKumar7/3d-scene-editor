#!/bin/bash
# 3D Scene Editor - Stop Script (Linux/macOS)
# Stops the development server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PID_FILE=".server.pid"

echo "🛑 3D Scene Editor - Stopping..."

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "   Stopping server (PID: $PID)..."
        kill "$PID" 2>/dev/null
        
        # Wait for graceful shutdown
        for i in {1..10}; do
            if ! kill -0 "$PID" 2>/dev/null; then
                break
            fi
            sleep 0.5
        done
        
        # Force kill if still running
        if kill -0 "$PID" 2>/dev/null; then
            echo "   Force stopping..."
            kill -9 "$PID" 2>/dev/null || true
        fi
        
        echo "✅ Server stopped"
    else
        echo "⚠️  Server not running (stale PID file)"
    fi
    rm -f "$PID_FILE"
else
    # Try to find and kill by port
    VITE_PID=$(lsof -ti:5173 2>/dev/null || true)
    if [ -n "$VITE_PID" ]; then
        echo "   Found server on port 5173 (PID: $VITE_PID)"
        kill "$VITE_PID" 2>/dev/null || true
        echo "✅ Server stopped"
    else
        echo "ℹ️  No server running"
    fi
fi
