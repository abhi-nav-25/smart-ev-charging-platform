import { sendError } from '../utils/response.js';

/**
 * 404 Route Not Found Middleware
 */
export const notFoundHandler = (req, res) => {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};

/**
 * Global Centralized Error Handler
 * Hides stack traces and sensitive information in production.
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);

  const message = isProduction && statusCode === 500
    ? 'Internal server error occurred. Please contact the administrator.'
    : err.message || 'An unexpected error occurred';

  const errors = !isProduction && err.stack ? { stack: err.stack } : null;

  return sendError(res, message, statusCode, errors);
};
