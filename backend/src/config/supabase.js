import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  (supabaseServiceRoleKey || supabaseAnonKey)
);

if (!isSupabaseConfigured) {
  console.warn(
    '[WARN] Supabase environment variables are missing or default. Database operations will require valid credentials in .env.'
  );
}

// Client for Auth user operations (signUp, signInWithPassword)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey || supabaseServiceRoleKey, {
      auth: {
        persistSession: false
      }
    })
  : null;

// Elevated Client with Service Role Key for backend administration and safe queries
export const supabaseAdmin = isSupabaseConfigured && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : supabase;
