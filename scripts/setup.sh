#!/bin/bash

# AI Compiler IDE Setup Script
# This script sets up the development environment for the AI Compiler IDE

set -e

echo "🚀 Setting up AI Compiler IDE development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment configuration..."
    cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_ide
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)

# OAuth Configuration (Replace with your actual values)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# AI Provider Configuration (Replace with your actual keys)
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key

# Judge0 Configuration
JUDGE0_URL=http://localhost:2358

# Application Configuration
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:3000

# Encryption Key for API tokens
ENCRYPTION_KEY=$(openssl rand -base64 32)
EOF
    echo "✅ Environment file created (.env)"
    echo "⚠️  Please update the OAuth and AI API keys in .env file"
else
    echo "✅ Environment file already exists"
fi

# Create Judge0 configuration
if [ ! -f judge0.conf ]; then
    echo "📝 Creating Judge0 configuration..."
    cat > judge0.conf << EOF
# Judge0 Configuration
REDIS_HOST=redis
REDIS_PORT=6379
POSTGRES_HOST=postgres
POSTGRES_DB=judge0
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Security settings
ENABLE_WAIT_RESULT=true
ENABLE_COMPILER_OPTIONS=true
ALLOWED_LANGUAGES_FOR_COMPILE_OPTIONS=50,54,62,63,71,74

# Resource limits
MAX_QUEUE_SIZE=100
MAX_JOBS_IN_QUEUE=50
MAX_CPU_TIME_LIMIT=15
MAX_WALL_TIME_LIMIT=20
MAX_MEMORY_LIMIT=256000
EOF
    echo "✅ Judge0 configuration created"
fi

# Create database initialization script
mkdir -p database
if [ ! -f database/init.sql ]; then
    echo "📝 Creating database initialization script..."
    cat > database/init.sql << EOF
-- Create Judge0 database for compilation service
CREATE DATABASE judge0;

-- Create main application database
-- (Tables will be created by migrations)
EOF
    echo "✅ Database initialization script created"
fi

# Create nginx configuration for production
mkdir -p nginx
if [ ! -f nginx/nginx.conf ]; then
    echo "📝 Creating nginx configuration..."
    cat > nginx/nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }
    
    upstream backend {
        server backend:8000;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        # Backend API
        location /v1/ {
            proxy_pass http://backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        # WebSocket support
        location /ws {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF
    echo "✅ Nginx configuration created"
fi

# Install frontend dependencies
if [ -d "frontend" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    echo "✅ Frontend dependencies installed"
fi

# Install backend dependencies
if [ -d "backend" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    echo "✅ Backend dependencies installed"
fi

# Install extension host dependencies
if [ -d "extension-host" ]; then
    echo "📦 Installing extension host dependencies..."
    cd extension-host
    npm install
    cd ..
    echo "✅ Extension host dependencies installed"
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update OAuth credentials in .env file:"
echo "   - Get GitHub OAuth app credentials from: https://github.com/settings/developers"
echo "   - Get Google OAuth credentials from: https://console.developers.google.com/"
echo ""
echo "2. Add AI API keys to .env file:"
echo "   - OpenAI API key from: https://platform.openai.com/api-keys"
echo "   - Google Gemini API key from: https://makersuite.google.com/app/apikey"
echo ""
echo "3. Start the development environment:"
echo "   docker-compose up -d"
echo ""
echo "4. Access the application:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8000"
echo "   - Judge0 API: http://localhost:2358"
echo ""
echo "5. Run database migrations:"
echo "   docker-compose exec backend npm run migrate"
echo ""
echo "Happy coding! 🚀"
EOF