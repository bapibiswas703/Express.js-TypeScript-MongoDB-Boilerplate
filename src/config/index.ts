export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  appName: process.env.APP_NAME || 'NodeJS Backend',
  nodeEnv: process.env.NODE_ENV || 'development',

  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/demo',

  log: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
    serviceName: process.env.SERVICE_NAME || 'express-api',
    enableLoki: process.env.ENABLE_LOKI === 'true',
    lokiUrl: process.env.LOKI_URL || 'http://loki:3100/loki/api/v1/push',
    retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '30', 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-to-a-secure-random-string',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    prefix: process.env.METRICS_PREFIX || 'app_',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    userWindowMs: parseInt(process.env.RATE_LIMIT_USER_WINDOW_MS || String(15 * 60 * 1000), 10),
    userMax: parseInt(process.env.RATE_LIMIT_USER_MAX || '200', 10),
  },

  security: {
    ipBlocklist: process.env.IP_BLOCKLIST || '',
    ipBlocklistCacheInterval: parseInt(process.env.IP_BLOCKLIST_CACHE_INTERVAL || '300000', 10),
  },

  storage: {
    disk: (process.env.FILESYSTEM_DISK || 'local') as 'local' | 's3',
    localUploadDir: process.env.LOCAL_UPLOAD_DIR || 'public/uploads',
  },

  s3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET || '',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@example.com',
  },

  fcm: {
    projectId: process.env.FCM_PROJECT_ID || '',
    privateKey: (process.env.FCM_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    clientEmail: process.env.FCM_CLIENT_EMAIL || '',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },

  tracing: {
    enabled: process.env.TRACING_ENABLED === 'true',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    serviceName: process.env.OTEL_SERVICE_NAME || process.env.SERVICE_NAME || 'express-api',
  },
};

// Aliases for backward compatibility
export const { jwt: jwtConfig } = config;
export const jwtSecret = config.jwt.secret;
export const jwtExpiresIn = config.jwt.expiresIn;
