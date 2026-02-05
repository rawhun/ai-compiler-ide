#!/bin/bash

# Start AI Compiler IDE Development Environment

echo "🚀 Starting AI Compiler IDE..."

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend
echo "📡 Starting backend server..."
cd backend
npm install
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend..."
cd ../frontend
npm install
npm start &
FRONTEND_PID=$!

echo "✅ Services started!"
echo "📡 Backend: http://localhost:8000"
echo "🎨 Frontend: http://localhost:3001"
echo "Press Ctrl+C to stop all services"

# Wait for background processes
wait