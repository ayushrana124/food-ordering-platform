import express, { Request, Response, NextFunction, Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import connectDB from './config/db';
import config from './config/config';
import { initializeSocket } from './config/socket';

// Load environment variables
dotenv.config();

const app: Application = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

// Connect to database
connectDB();

// Middleware
app.use(helmet());
app.use(cors({ origin: config.clientUrl }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Make io accessible to routes
app.use((req: Request, _res: Response, next: NextFunction) => {
    req.io = io;
    next();
});

// Health check route
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// API Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import menuRoutes from './routes/menuRoutes';
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import adminRoutes from './routes/adminRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Error handler
import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});


const PORT = config.port;
server.listen(PORT, () => {
    console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});
