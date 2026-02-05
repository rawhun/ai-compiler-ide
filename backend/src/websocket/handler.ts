import { Server } from 'socket.io';

export const setupWebSocket = (io: Server) => {
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
};