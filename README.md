# AI Compiler IDE

A modern, web-based integrated development environment with AI assistance, real-time compilation, and collaborative features.

## Features

- **Multi-language Support**: Python, JavaScript, TypeScript, Java, C++, and more
- **AI-Powered Assistant**: Integrated AI help for debugging, code explanations, and optimization
- **Real-time Compilation**: Execute code instantly with Judge0 integration
- **Monaco Editor**: Full-featured code editor with syntax highlighting and IntelliSense
- **OAuth Authentication**: Secure login with Google and GitHub
- **Workspace Management**: Organize projects and files efficiently
- **Terminal Integration**: Built-in terminal with command history
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Monaco Editor** for code editing
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Socket.io** for real-time features

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** for data persistence
- **Redis** for caching and sessions
- **JWT** for authentication
- **Winston** for logging

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL database
- Redis server
- Docker (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-compiler-ide.git
   cd ai-compiler-ide
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend && npm install
   
   # Install frontend dependencies
   cd ../frontend && npm install
   ```

4. **Set up the database**
   ```bash
   cd backend
   npm run migrate
   npm run seed
   ```

5. **Start the development servers**
   ```bash
   # Start backend (from backend directory)
   npm run dev
   
   # Start frontend (from frontend directory)
   npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

### Docker Setup (Alternative)

```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

- **Database**: PostgreSQL connection string
- **Redis**: Redis server URL
- **OAuth**: Google and GitHub OAuth credentials
- **AI Providers**: OpenAI and Gemini API keys
- **JWT**: Secret key for token signing

### AI Providers

The IDE supports multiple AI providers:

1. **Shared (Free)**: Built-in AI responses for basic assistance
2. **OpenAI**: GPT-3.5/GPT-4 integration with your API key
3. **Gemini**: Google's AI with your API key

Configure API keys in the settings panel or environment variables.

## Usage

### Creating a Workspace
1. Click "New Workspace" in the dashboard
2. Choose your programming language
3. Select a template or start blank

### Using the AI Assistant
1. Open the AI chat panel (right sidebar)
2. Select your preferred AI provider
3. Ask questions about your code or request help

### Running Code
1. Write your code in the editor
2. Press Ctrl+Enter or click the Run button
3. View output in the terminal panel

## API Documentation

The backend provides a RESTful API with the following endpoints:

- **Authentication**: `/v1/auth/*`
- **Workspaces**: `/v1/workspaces/*`
- **Files**: `/v1/workspaces/:id/files/*`
- **Compilation**: `/v1/compile/*`
- **AI Assistant**: `/v1/ai/*`
- **Extensions**: `/v1/extensions/*`

See `docs/api-specification.md` for detailed API documentation.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Check the `docs/` directory
- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Join our GitHub Discussions

## Acknowledgments

- Monaco Editor by Microsoft
- Judge0 for code execution
- OpenAI and Google for AI capabilities
- The open-source community for various libraries and tools