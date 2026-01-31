import express, { Request, Response, NextFunction, Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import connectDB from './config/db';
import config from './config/config';

// Load environment variables
dotenv.config();

const app: Application = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: { origin: config.clientUrl }
});

// Connect to database
connectDB();

// Middleware
app.use(helmet());
app.use(cors({ origin: config.clientUrl }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Make io accessible to routes
declare global {
    namespace Express {
        interface Request {
            io: SocketIOServer;
        }
    }
}

app.use((req: Request, res: Response, next: NextFunction) => {
    req.io = io;
    next();
});

// Health check route
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Routes (will be added in Phase 2)
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/users', require('./routes/userRoutes'));
// app.use('/api/menu', require('./routes/menuRoutes'));
// app.use('/api/orders', require('./routes/orderRoutes'));
// app.use('/api/payment', require('./routes/paymentRoutes'));
// app.use('/api/admin', require('./routes/adminRoutes'));

// Socket.io connection
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join', (userId: string) => {
        socket.join(userId);
        console.log(`User ${userId} joined`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: config.nodeEnv === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ message: 'Route not found' });
});

const PORT = config.port;
server.listen(PORT, () => {
    console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});
