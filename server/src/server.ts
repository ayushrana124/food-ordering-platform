import express, { Request, Response, NextFunction, Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import hpp from 'hpp';
import http from 'http';
import connectDB from './config/db';
import config from './config/config';
import { initializeSocket } from './config/socket';
import { apiLimiter } from './middleware/rateLimiter';

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
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Custom NoSQL injection sanitizer (express-mongo-sanitize is incompatible with Express 5)
function sanitizeValue(val: any): any {
    if (typeof val === 'string') return val;
    if (val === null || val === undefined) return val;
    if (Array.isArray(val)) return val.map(sanitizeValue);
    if (typeof val === 'object') {
        const clean: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
            if (!k.startsWith('$')) clean[k] = sanitizeValue(v);
        }
        return clean;
    }
    return val;
}
app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.body) req.body = sanitizeValue(req.body);
    if (req.params) {
        for (const key of Object.keys(req.params)) {
            req.params[key] = sanitizeValue(req.params[key]);
        }
    }
    next();
});

app.use(hpp());           // Prevent HTTP parameter pollution
app.use(morgan('dev'));

// General API rate limiting — applied to all /api routes
app.use('/api', apiLimiter);

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
import cartRoutes from './routes/cartRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);

// 404 handler — must be before the error handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// Error handler
import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);

const PORT = config.port;
server.listen(PORT, () => {
    console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});
