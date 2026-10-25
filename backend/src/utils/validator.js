/**
 * Input validation helpers
 */

// Matches standard 8-4-4-4-12 hexadecimal UUID format used by PostgreSQL
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidUUID = (id) => {
  return typeof id === 'string' && UUID_REGEX.test(id);
};

export const isValidEmail = (email) => {
  return typeof email === 'string' && EMAIL_REGEX.test(email);
};

export const isValidISODate = (dateStr) => {
  if (typeof dateStr !== 'string') return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
};

export const validateRequired = (body, fields) => {
  const missing = [];
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missing.push(field);
    }
  }
  return missing;
};
