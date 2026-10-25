import { supabase, supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { isValidEmail, validateRequired } from '../utils/validator.js';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { email, password, full_name, phone } = req.body;

    const missing = validateRequired(req.body, ['email', 'password']);
    if (missing.length > 0) {
      return sendError(res, `Missing required fields: ${missing.join(', ')}`, 400);
    }

    if (!isValidEmail(email)) {
      return sendError(res, 'Please provide a valid email address.', 400);
    }

    if (typeof password !== 'string' || password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters long.', 400);
    }

    if (!isSupabaseConfigured) {
      return sendError(res, 'Database service is not configured. Please check server environment.', 503);
    }

    // Sign up using Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || email.split('@')[0],
          phone: phone || null
        }
      }
    });

    if (error) {
      return sendError(res, error.message, 400);
    }

    const user = data.user;
    if (!user) {
      return sendError(res, 'Unable to create user account.', 400);
    }

    // Ensure profile entry exists in public.profiles table
    const dbClient = supabaseAdmin || supabase;
    const { data: profile, error: profileError } = await dbClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: full_name || email.split('@')[0],
        phone: phone || null,
        role: 'user'
      }, { onConflict: 'id' })
      .select('id, email, full_name, phone, role, created_at')
      .single();

    if (profileError) {
      console.warn('[AUTH_REGISTER_PROFILE_WARN]', profileError.message);
    }

    return sendSuccess(
      res,
      {
        user: {
          id: user.id,
          email: user.email,
          role: profile?.role || 'user',
          profile: profile || null
        },
        session: data.session || null
      },
      'User registered successfully.',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const missing = validateRequired(req.body, ['email', 'password']);
    if (missing.length > 0) {
      return sendError(res, `Missing required fields: ${missing.join(', ')}`, 400);
    }

    if (!isSupabaseConfigured) {
      return sendError(res, 'Database service is not configured. Please check server environment.', 503);
    }

    // Sign in using Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return sendError(res, error.message, 401);
    }

    const session = data.session;
    const user = data.user;

    // Fetch user profile from database to get the authorized role
    const dbClient = supabaseAdmin || supabase;
    const { data: profile } = await dbClient
      .from('profiles')
      .select('id, email, full_name, phone, role')
      .eq('id', user.id)
      .single();

    return sendSuccess(
      res,
      {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        token_type: session.token_type || 'bearer',
        expires_in: session.expires_in,
        user: {
          id: user.id,
          email: user.email,
          role: profile?.role || 'user',
          profile: profile || null
        }
      },
      'Login successful.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get profile of currently authenticated user
 * GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    const dbClient = supabaseAdmin || supabase;
    const { data: profile, error } = await dbClient
      .from('profiles')
      .select('id, email, full_name, phone, role, created_at, updated_at')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return sendError(res, 'User profile not found.', 404);
    }

    return sendSuccess(res, profile, 'Authenticated user profile retrieved.');
  } catch (error) {
    next(error);
  }
};
