import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import config from './config';

export const initializeSocket = (server: HTTPServer): SocketIOServer => {
    const io = new SocketIOServer(server, {
        cors: {
            origin: config.clientUrl,
            methods: ['GET', 'POST']
        }
    });

    // Socket.io event handlers
    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        // User joins their personal room for notifications
        socket.on('join', (userId: string) => {
            socket.join(userId);
            console.log(`User ${userId} joined their room`);
        });

        // Admin joins admin room
        socket.on('join-admin', () => {
            socket.join('admin-room');
            console.log('Admin joined admin room');
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
};

// Type declaration for Express Request
declare global {
    namespace Express {
        interface Request {
            io: SocketIOServer;
        }
    }
}
