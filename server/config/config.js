module.exports = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpire: process.env.JWT_EXPIRE || '7d',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

    // SMS Configuration
    smsApiKey: process.env.SMS_API_KEY,
    smsApiUrl: process.env.SMS_API_URL,

    // Razorpay Configuration
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,

    // Cloudinary Configuration
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,

    // Business Logic
    maxDeliveryDistance: 10, // km
    otpExpiry: 5, // minutes
    maxOtpAttempts: 3,
    otpCooldown: 10 // minutes
};
