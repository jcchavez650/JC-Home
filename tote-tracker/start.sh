#!/bin/bash
# Start Tote Tracker (backend + frontend)

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "⚠️  ANTHROPIC_API_KEY is not set. AI scanning will fail."
  echo "   Set it as a Codespaces secret at:"
  echo "   github.com/settings/codespaces → New secret → ANTHROPIC_API_KEY"
  echo ""
fi

echo "Starting backend on port 3001..."
cd "$(dirname "$0")/backend" && node server.js &
BACKEND_PID=$!

echo "Starting frontend on port 5173..."
cd "$(dirname "$0")/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Tote Tracker running!"
echo "   Open the PORTS tab in VS Code and click the 🌐 globe icon next to port 5173"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
