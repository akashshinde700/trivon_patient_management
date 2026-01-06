require('dotenv').config();

const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'patient_management',
    connectionLimit: Number(process.env.DB_POOL_LIMIT || 10)
  },
  email: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'no-reply@example.com'
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || null // Generate a secure key for production
  }
  // SMS and WhatsApp Cloud API removed - WhatsApp now uses direct links on frontend
};

module.exports = env;

