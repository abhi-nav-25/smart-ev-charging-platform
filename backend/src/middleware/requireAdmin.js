import { sendError } from '../utils/response.js';

/**
 * Authorization Middleware: Admin Guard
 * Enforces that only users with the 'admin' role in the database can access the route.
 * Never trusts a client-supplied role.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Authentication required before role verification.', 401);
  }

  if (req.user.role !== 'admin') {
    return sendError(
      res,
      'Access denied: Administrator privileges are required to perform this action.',
      403
    );
  }

  next();
};
