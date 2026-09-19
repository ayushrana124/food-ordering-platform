import express, { Request, Response, NextFunction, Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import hpp from 'hpp';
import compression from 'compression';
import http from 'http';

// Load environment variables before anything reads process.env
dotenv.config();

import connectDB from './config/db';
import config from './config/config';
import { initializeSocket, isOriginAllowed } from './config/socket';
import { apiLimiter } from './middleware/rateLimiter';
import { startBackgroundJobs, stopBackgroundJobs } from './jobs';

const app: Application = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

// Connect to database
connectDB();

// Trust proxy for correct rate limiting behind reverse proxies (nginx, cloudflare)
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Middleware
app.use(helmet());

app.use(cors({
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) return callback(null, true);
        return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
}));

// gzip JSON responses — menu and order lists compress well and this is the
// cheapest bandwidth win available on a small server.
app.use(compression());

// Raw body for Razorpay webhook signature verification (must come BEFORE json parser)
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Custom NoSQL injection sanitizer (express-mongo-sanitize is incompatible with Express 5)
function sanitizeValue(val: any): any {
    if (typeof val === 'string') return val;
    if (val === null || val === undefined) return val;
    if (Array.isArray(val)) return val.map(sanitizeValue);
    if (typeof val === 'object') {
        const clean: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
            if (!k.startsWith('$') && !k.includes('.')) clean[k] = sanitizeValue(v);
        }
        return clean;
    }
    return val;
}
app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        req.body = sanitizeValue(req.body);
    }
    if (req.params) {
        for (const key of Object.keys(req.params)) {
            req.params[key] = sanitizeValue(req.params[key]);
        }
    }
    next();
});

app.use(hpp());           // Prevent HTTP parameter pollution

// Request logging: verbose in dev, concise and error-only in production so the
// log file doesn't grow unbounded on a small disk.
app.use(
    config.isProduction
        ? morgan('tiny', { skip: (_req, res) => res.statusCode < 400 })
        : morgan('dev')
);

// General API rate limiting — applied to all /api routes except the Razorpay
// webhook, which is a server-to-server callback we must never throttle.
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.startsWith('/api/payment/webhook')) return next();
    return apiLimiter(req, res, next);
});

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
    startBackgroundJobs();
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
// Lets in-flight orders finish instead of being cut off mid-write on redeploy.
const shutdown = (signal: string) => {
    console.log(`${signal} received — shutting down gracefully.`);
    stopBackgroundJobs();
    io.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
