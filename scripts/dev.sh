#!/bin/bash
# Start both backend and frontend for development

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔭 Starting Meridian..."
echo ""

# Check if database exists, seed if not
if [ ! -f "$PROJECT_ROOT/meridian.db" ]; then
    echo "📦 Seeding database..."
    cd "$PROJECT_ROOT" && python3 -m backend.seed_db
    echo ""
fi

# Start backend
echo "🚀 Starting backend on http://localhost:8000"
cd "$PROJECT_ROOT" && python3 -m uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend
echo "🌐 Starting frontend on http://localhost:3000"
cd "$PROJECT_ROOT/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "Meridian is running!"
echo "  Dashboard: http://localhost:3000/dashboard"
echo "  API docs:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Trap Ctrl+C and kill both
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
