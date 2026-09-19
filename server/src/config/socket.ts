import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import config from './config';
import Admin from '../models/Admin';
import User from '../models/User';

/** Origins allowed to open an HTTP or WebSocket connection. */
export const allowedOrigins: string[] = [
    config.clientUrl,
    ...config.extraOrigins,
    ...(config.isProduction ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173']),
];

export const isOriginAllowed = (origin?: string): boolean => {
    if (!origin) return true; // same-origin / curl / server-to-server
    return allowedOrigins.includes(origin.replace(/\/$/, ''));
};

// Socket.io stores our verified identity on `socket.data` during the handshake.
// Event handlers read it from there and never trust the payload a client sends.

export const initializeSocket = (server: HTTPServer): SocketIOServer => {
    const io = new SocketIOServer(server, {
        cors: {
            origin: (origin, callback) => {
                if (isOriginAllowed(origin ?? undefined)) return callback(null, true);
                return callback(new Error(`CORS blocked: ${origin}`));
            },
            methods: ['GET', 'POST'],
            credentials: true,
        },
        // A restaurant dashboard only receives small JSON events — cap the inbound
        // frame size so a rogue client can't push large payloads at the process.
        maxHttpBufferSize: 1e4, // 10 KB
        pingInterval: 25000,
        pingTimeout: 20000,
        // Drop half-open connections from flaky restaurant wifi reasonably fast.
        connectTimeout: 20000,
    });

    // ─── Handshake authentication ────────────────────────────────────────────
    // Previously any anonymous client could hold a socket open indefinitely and
    // only got checked when it emitted `join`. Now an unauthenticated socket is
    // rejected before it is ever established.
    io.use(async (socket: Socket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token || typeof token !== 'string') {
            return next(new Error('Authentication required'));
        }

        let decoded: { userId?: string; adminId?: string };
        try {
            decoded = jwt.verify(token, config.jwtSecret) as { userId?: string; adminId?: string };
        } catch {
            return next(new Error('Invalid or expired token'));
        }

        try {
            if (decoded.adminId) {
                // Confirm the admin still exists — a deleted admin's token must not
                // keep receiving live order feeds.
                const admin = await Admin.findById(decoded.adminId).select('_id').lean();
                if (!admin) return next(new Error('Admin no longer exists'));
                socket.data.adminId = decoded.adminId;
                return next();
            }

            if (decoded.userId) {
                const user = await User.findById(decoded.userId).select('_id isBlocked').lean();
                if (!user) return next(new Error('User no longer exists'));
                if (user.isBlocked) return next(new Error('Account blocked'));
                socket.data.userId = decoded.userId;
                return next();
            }
        } catch (err) {
            console.error('Socket auth lookup failed:', err);
            return next(new Error('Authentication failed'));
        }

        return next(new Error('Invalid token payload'));
    });

    io.on('connection', (socket: Socket) => {
        // Join the correct room immediately — no need to wait for a client event.
        if (socket.data.adminId) {
            socket.join('admin-room');
        } else if (socket.data.userId) {
            socket.join(socket.data.userId);
        }

        if (!config.isProduction) {
            console.log('Socket connected:', socket.id, socket.data.adminId ? '(admin)' : '(user)');
        }

        // Kept for backwards compatibility with existing clients that emit these.
        // The room comes from the verified handshake identity, never from the payload.
        socket.on('join', () => {
            if (socket.data.userId) socket.join(socket.data.userId);
        });

        socket.on('join-admin', () => {
            if (socket.data.adminId) socket.join('admin-room');
        });

        socket.on('disconnect', () => {
            if (!config.isProduction) {
                console.log('Socket disconnected:', socket.id);
            }
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
