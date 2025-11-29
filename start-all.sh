#!/bin/bash
echo "Starting Backend and Frontend..."
echo ""
echo "Starting Backend..."
cd ev-guardian-platform
python3 backend_api.py &
BACKEND_PID=$!
cd ..

echo "Waiting for backend to start..."
sleep 3

echo "Starting Frontend..."
pnpm dev &
FRONTEND_PID=$!

echo ""
echo "Both servers are running!"
echo "Backend: http://localhost:5000 (PID: $BACKEND_PID)"
echo "Frontend: http://localhost:5173 (PID: $FRONTEND_PID)"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait

