import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
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
        // Verify JWT before allowing join
        socket.on('join', (data: { userId: string } | string) => {
            const userId = typeof data === 'string' ? data : data?.userId;
            const token = socket.handshake.auth?.token;
            if (!token) {
                socket.emit('error', { message: 'Authentication required' });
                return;
            }
            try {
                const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
                // Only allow joining own room
                if (decoded.userId === userId) {
                    socket.join(userId);
                    console.log(`User ${userId} joined their room`);
                } else {
                    socket.emit('error', { message: 'Forbidden' });
                }
            } catch {
                socket.emit('error', { message: 'Invalid token' });
            }
        });

        // Admin joins admin room — verify admin token
        socket.on('join-admin', () => {
            const token = socket.handshake.auth?.token;
            if (!token) {
                socket.emit('error', { message: 'Authentication required' });
                return;
            }
            try {
                const decoded = jwt.verify(token, config.jwtSecret) as { adminId?: string };
                if (decoded.adminId) {
                    socket.join('admin-room');
                    console.log('Admin joined admin room');
                } else {
                    socket.emit('error', { message: 'Not an admin' });
                }
            } catch {
                socket.emit('error', { message: 'Invalid token' });
            }
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
