import app from './app.js';
import dotenv from 'dotenv';
import { validateEnv } from './config/validateEnv.js';

dotenv.config();

// Run startup environment check without exposing sensitive values
validateEnv();

const PORT = parseInt(process.env.PORT, 10) || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log('⚡ Smart EV Charging & Reservation Platform Backend');
  console.log(`🚀 Server listening on: http://localhost:${PORT}`);
  console.log(`🩺 Health check URL:    http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment:         ${process.env.NODE_ENV || 'development'}`);
  console.log('====================================================');
});

// Graceful shutdown handling for Cloud/EC2/PM2 environments
const gracefulShutdown = (signal) => {
  console.log(`\n[${signal}] Received shutdown signal. Closing HTTP server gracefully...`);
  server.close(() => {
    console.log('[SUCCESS] HTTP server closed cleanly. Exiting process.');
    process.exit(0);
  });

  // Force close if graceful shutdown takes too long
  setTimeout(() => {
    console.error('[ERROR] Forceful shutdown initiated after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
