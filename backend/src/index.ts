import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { authRoutes } from './routes/auth';
import { workspaceRoutes } from './routes/workspace';
import { compileRoutes } from './routes/compile';
import { aiRoutes } from './routes/ai';
import { userRoutes } from './routes/user';
import { extensionRoutes } from './routes/extensions';

import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/v1/auth', authRoutes);
app.use('/v1/workspaces', workspaceRoutes);
app.use('/v1/compile', compileRoutes);
app.use('/v1/ai', aiRoutes);
app.use('/v1/users', userRoutes);
app.use('/v1/extensions', extensionRoutes);

// WebSocket setup
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-workspace', (workspaceId) => {
    socket.join(`workspace:${workspaceId}`);
    console.log(`User ${socket.id} joined workspace ${workspaceId}`);
  });

  socket.on('file-change', (data) => {
    socket.to(`workspace:${data.workspaceId}`).emit('file-changed', data);
  });

  socket.on('cursor-position', (data) => {
    socket.to(`workspace:${data.workspaceId}`).emit('cursor-moved', {
      userId: socket.id,
      ...data,
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

async function startServer() {
  try {
    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

startServer();