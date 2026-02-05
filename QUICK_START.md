# Quick Start Guide

Get the AI Compiler IDE running locally in under 5 minutes!

## Prerequisites

- **Docker & Docker Compose** - [Install Docker](https://docs.docker.com/get-docker/)
- **Node.js 18+** - [Install Node.js](https://nodejs.org/)
- **Git** - [Install Git](https://git-scm.com/)

## 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd ai-compiler-ide

# Run the setup script
npm run setup
```

The setup script will:
- ✅ Check prerequisites
- ✅ Create environment configuration
- ✅ Install dependencies
- ✅ Configure services

## 2. Configure OAuth & AI Keys

Edit the `.env` file and add your credentials:

```bash
# GitHub OAuth (Create at: https://github.com/settings/developers)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Google OAuth (Create at: https://console.developers.google.com/)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI API Keys (Optional for shared AI)
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
```

### Quick OAuth Setup

**GitHub OAuth App:**
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Set Authorization callback URL: `http://localhost:3000/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`

**Google OAuth App:**
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:3000/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

## 3. Start the Application

```bash
# Start all services
npm run dev

# Or start in background
npm run dev:detached
```

This starts:
- 🌐 **Frontend** at http://localhost:3000
- 🔧 **Backend API** at http://localhost:8000
- 🗄️ **PostgreSQL** database
- 🚀 **Redis** cache
- ⚖️ **Judge0** compilation service

## 4. Initialize Database

```bash
# Run database migrations
npm run migrate

# (Optional) Seed with sample data
npm run seed
```

## 5. Access the IDE

Open http://localhost:3000 in your browser:

1. **Sign in** with GitHub or Google
2. **Create a workspace** (Python, JavaScript, C++, Java)
3. **Write code** in the Monaco editor
4. **Compile & run** with Ctrl+Enter
5. **Chat with AI** using the right panel

## Sample Code to Try

### Python Hello World
```python
print("Hello from AI Compiler IDE!")
name = input("What's your name? ")
print(f"Nice to meet you, {name}!")
```

### JavaScript Fibonacci
```javascript
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci sequence:");
for (let i = 0; i < 10; i++) {
    console.log(`F(${i}) = ${fibonacci(i)}`);
}
```

### C++ Quick Sort
```cpp
#include <iostream>
#include <vector>
using namespace std;

void quickSort(vector<int>& arr, int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

int main() {
    vector<int> arr = {64, 34, 25, 12, 22, 11, 90};
    quickSort(arr, 0, arr.size() - 1);
    
    cout << "Sorted array: ";
    for (int x : arr) cout << x << " ";
    cout << endl;
    
    return 0;
}
```

## Useful Commands

```bash
# View logs
npm run logs

# Stop all services
npm run stop

# Rebuild containers
npm run build

# Clean everything (removes data!)
npm run clean

# Run tests
npm run test
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
lsof -i :3000
lsof -i :8000

# Kill the process
kill -9 <PID>
```

### Docker Issues
```bash
# Restart Docker
# On Mac: Docker Desktop -> Restart
# On Linux: sudo systemctl restart docker

# Clean Docker cache
docker system prune -a
```

### Database Connection Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres redis
npm run migrate
```

### Judge0 Not Working
```bash
# Check Judge0 status
curl http://localhost:2358/system_info

# Restart Judge0
docker-compose restart judge0
```

## Development Workflow

1. **Make changes** to frontend/backend code
2. **Hot reload** automatically updates the app
3. **Test compilation** with different languages
4. **Use AI chat** to get coding help
5. **Check logs** if something breaks

## Next Steps

- 📖 Read the [Architecture Documentation](docs/architecture.md)
- 🔧 Check out [Extension Development](docs/extension-system.md)
- 🚀 Deploy to production with [Deployment Guide](docs/deployment.md)
- 🤝 Contribute to the project

## Need Help?

- 📚 Check the [full documentation](docs/)
- 🐛 Report issues on GitHub
- 💬 Join our Discord community
- 📧 Email support@ai-compiler-ide.com

Happy coding! 🎉