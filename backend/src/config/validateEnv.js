/**
 * Startup Environment Configuration Validator
 * Ensures required settings are verified without ever leaking credentials or secrets.
 */

export const validateEnv = () => {
  const warnings = [];
  const errors = [];

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
    warnings.push('SUPABASE_URL is missing or using default placeholder.');
  }

  if (!anonKey || anonKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')) {
    warnings.push('SUPABASE_ANON_KEY is missing or using default placeholder.');
  }

  if (!serviceKey || serviceKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')) {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY is missing or using default placeholder.');
  }

  const isProduction = process.env.NODE_ENV === 'production';

  console.log('--- Environment Configuration Verification ---');
  console.log(`Node Environment:   ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server Port:        ${process.env.PORT || 5000}`);
  console.log(`CORS Origins:       ${process.env.CORS_ORIGIN || '*'}`);
  console.log(`Supabase URL:       ${supabaseUrl && !supabaseUrl.includes('your-project-id') ? '[CONFIGURED]' : '[MISSING/DEFAULT]'}`);
  console.log(`Supabase Anon Key:  ${anonKey && !anonKey.includes('...') ? '[CONFIGURED]' : '[MISSING/DEFAULT]'}`);
  console.log(`Supabase Admin Key: ${serviceKey && !serviceKey.includes('...') ? '[CONFIGURED]' : '[MISSING/DEFAULT]'}`);
  console.log('----------------------------------------------');

  if (warnings.length > 0) {
    console.warn('[NOTICE] The following database environment variables require configuration in .env:');
    warnings.forEach((w) => console.warn(`  - ${w}`));
    console.warn('  -> Database endpoints will return 503 until valid Supabase credentials are provided.');
  }

  return {
    valid: errors.length === 0,
    hasDatabase: warnings.length === 0,
    warnings,
    errors
  };
};
