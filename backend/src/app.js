import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import stationRoutes from './routes/station.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import adminRoutes from './routes/admin.routes.js';

import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { sendSuccess } from './utils/response.js';

dotenv.config();

const app = express();

// Trust proxy for reverse proxy setups (Nginx, AWS ALB, EC2)
app.set('trust proxy', 1);

// Security Headers
app.use(helmet());

// CORS Configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : ['*'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or if wildcard
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Body Parsing Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate Limiter
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again later.'
  },
  skip: (req) => req.path === '/api/health' // Don't rate limit health checks
});
app.use('/api', limiter);

// ============================================================================
// 1. HEALTH CHECK ENDPOINT
// GET /api/health
// Used to verify deployment, EC2 instance health, and cloud monitoring
// ============================================================================
app.get('/api/health', (req, res) => {
  const uptimeSeconds = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  return sendSuccess(
    res,
    {
      status: 'healthy',
      uptime: `${hours}h ${minutes}m ${seconds}s`,
      uptime_seconds: uptimeSeconds,
      timestamp: new Date().toISOString(),
      service: 'Smart EV Charging & Reservation API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    },
    'Server is running and operational.'
  );
});

// ============================================================================
// API ROUTES
// ============================================================================
app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Root route welcome message
app.get('/', (req, res) => {
  return sendSuccess(
    res,
    {
      project: 'Cloud-Based Smart EV Charging and Reservation Platform',
      health_check: '/api/health',
      documentation: 'See README.md and postman_collection.json'
    },
    'EV Charging Platform Backend API'
  );
});

// 404 and Global Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
