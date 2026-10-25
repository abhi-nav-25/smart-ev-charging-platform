import api from './api.js';

/**
 * Authentication Service
 * Communicates with backend /api/auth routes.
 */
export const authService = {
  /**
   * Register a new user account
   * POST /api/auth/register
   */
  async register({ email, password, full_name, phone }) {
    const res = await api.post('/auth/register', {
      email: email.trim(),
      password,
      full_name: full_name?.trim() || undefined,
      phone: phone?.trim() || undefined,
    });
    return res;
  },

  /**
   * Log in an existing user
   * POST /api/auth/login
   */
  async login({ email, password }) {
    const res = await api.post('/auth/login', {
      email: email.trim(),
      password,
    });
    return res;
  },

  /**
   * Get authenticated user profile
   * GET /api/auth/me
   */
  async getMe() {
    const res = await api.get('/auth/me');
    return res;
  },

  /**
   * Check backend health and uptime
   * GET /api/health
   */
  async getHealth() {
    const res = await api.get('/health');
    return res;
  },
};
