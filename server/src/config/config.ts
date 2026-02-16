interface Config {
    port: number;
    nodeEnv: string;
    mongodbUri: string;
    jwtSecret: string;
    jwtExpire: string;
    smsApiUrl: string;
    smsApiKey: string;
    razorpayKeyId: string;
    razorpayKeySecret: string;
    cloudinaryCloudName: string;
    cloudinaryApiKey: string;
    cloudinaryApiSecret: string;
    clientUrl: string;
    otpCooldown: number; // minutes
    otpExpiry: number; // minutes
}

const config: Config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    mongodbUri: process.env.MONGODB_URI || '',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    jwtExpire: process.env.JWT_EXPIRE || '7d',

    // SMS Configuration (2Factor.in)
    smsApiUrl: process.env.SMS_API_URL || 'https://2factor.in/API/V1/{api_key}/SMS/{phone}/{otp}',
    smsApiKey: process.env.SMS_API_KEY || '',

    // Razorpay Configuration
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',

    // Cloudinary Configuration
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',

    // Client URL
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

    // OTP Configuration
    otpCooldown: parseInt(process.env.OTP_COOLDOWN || '10', 10), // 10 minutes
    otpExpiry: parseInt(process.env.OTP_EXPIRY || '5', 10), // 5 minutes
};

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && config.nodeEnv === 'production') {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

export default config;
