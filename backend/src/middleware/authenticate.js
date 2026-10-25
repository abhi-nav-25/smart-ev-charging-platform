import { supabase, supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { sendError } from '../utils/response.js';

/**
 * Authentication Middleware
 * Validates the Supabase JWT token passed in the Authorization header.
 * Attaches the authenticated user and their database profile to `req.user`.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication required. Missing or malformed Bearer token.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      return sendError(res, 'Authentication required. Bearer token cannot be empty.', 401);
    }

    if (!isSupabaseConfigured) {
      return sendError(
        res,
        'Supabase is not configured on the server. Please set valid credentials in .env.',
        503
      );
    }

    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return sendError(res, 'Invalid or expired authentication token.', 401);
    }

    // Retrieve user profile to get authorization role from database
    const dbClient = supabaseAdmin || supabase;
    const { data: profile, error: profileError } = await dbClient
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[AUTH_PROFILE_ERROR]', profileError);
    }

    // Attach user information to request
    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || 'user',
      profile: profile || null
    };

    next();
  } catch (error) {
    console.error('[AUTH_MIDDLEWARE_EXCEPTION]', error);
    return sendError(res, 'Failed to authenticate request', 401);
  }
};
