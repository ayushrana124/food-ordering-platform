interface Config {
    port: number;
    nodeEnv: string;
    isProduction: boolean;
    mongodbUri: string;
    jwtSecret: string;
    jwtExpire: string;
    razorpayKeyId: string;
    razorpayKeySecret: string;
    razorpayWebhookSecret: string;
    cloudinaryCloudName: string;
    cloudinaryApiKey: string;
    cloudinaryApiSecret: string;
    clientUrl: string;
    extraOrigins: string[];
    useDummyPayment: boolean; // Set to true to bypass Razorpay (for dev/testing)
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const DEFAULT_JWT_SECRET = 'your-secret-key-change-in-production';

// Dummy payment is ONLY ever allowed outside production. Even if someone sets
// USE_DUMMY_PAYMENT=true on a production deploy, we refuse — the dummy path
// skips Razorpay signature verification and would make every order free.
const dummyRequested = process.env.USE_DUMMY_PAYMENT
    ? process.env.USE_DUMMY_PAYMENT === 'true'
    : !isProduction;

const config: Config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv,
    isProduction,
    mongodbUri: process.env.MONGODB_URI || '',
    jwtSecret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
    jwtExpire: process.env.JWT_EXPIRE || '7d',

    // Razorpay Configuration
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',

    // Cloudinary Configuration
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',

    // Client URL
    clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),

    // Optional extra allowed origins, comma-separated (e.g. a www. alias or preview domain)
    extraOrigins: (process.env.EXTRA_ORIGINS || '')
        .split(',')
        .map((o) => o.trim().replace(/\/$/, ''))
        .filter(Boolean),

    useDummyPayment: isProduction ? false : dummyRequested,
};

if (isProduction && dummyRequested) {
    console.warn('[config] USE_DUMMY_PAYMENT=true was ignored — dummy payments are disabled in production.');
}

// ─── Validate required environment variables ──────────────────────────────────
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    const msg = `Missing required environment variables: ${missingEnvVars.join(', ')}`;
    if (isProduction) {
        console.error(msg);
        process.exit(1);
    }
    console.warn(`[config] ${msg} — using development defaults.`);
}

// A weak/default signing key in production means anyone can mint admin tokens.
if (isProduction) {
    if (config.jwtSecret === DEFAULT_JWT_SECRET) {
        console.error('JWT_SECRET is still the built-in default. Set a strong, random JWT_SECRET.');
        process.exit(1);
    }
    if (config.jwtSecret.length < 32) {
        console.error('JWT_SECRET is too short. Use at least 32 random characters.');
        process.exit(1);
    }
}

export default config;
