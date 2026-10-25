import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdmin } from '../src/middleware/requireAdmin.js';
import { authenticate } from '../src/middleware/authenticate.js';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler.js';
import { sendSuccess, sendError } from '../src/utils/response.js';

test('Unit 1: requireAdmin middleware blocks non-admin user with 403', () => {
  const req = { user: { id: 'u1', role: 'user' } };
  let responseStatusCode = null;
  let responsePayload = null;

  const res = {
    status(code) {
      responseStatusCode = code;
      return this;
    },
    json(payload) {
      responsePayload = payload;
      return this;
    }
  };

  let nextCalled = false;
  requireAdmin(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(responseStatusCode, 403);
  assert.equal(responsePayload.success, false);
  assert.match(responsePayload.message, /Administrator privileges are required/i);
});

test('Unit 2: requireAdmin middleware allows admin user to proceed', () => {
  const req = { user: { id: 'admin1', role: 'admin' } };
  const res = {};
  let nextCalled = false;

  requireAdmin(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('Unit 3: requireAdmin middleware rejects request without req.user with 401', () => {
  const req = {};
  let responseStatusCode = null;
  let responsePayload = null;

  const res = {
    status(code) {
      responseStatusCode = code;
      return this;
    },
    json(payload) {
      responsePayload = payload;
      return this;
    }
  };

  requireAdmin(req, res, () => {});

  assert.equal(responseStatusCode, 401);
  assert.equal(responsePayload.success, false);
});

test('Unit 4: authenticate middleware rejects missing Authorization header with 401', async () => {
  const req = { headers: {} };
  let responseStatusCode = null;
  let responsePayload = null;

  const res = {
    status(code) {
      responseStatusCode = code;
      return this;
    },
    json(payload) {
      responsePayload = payload;
      return this;
    }
  };

  await authenticate(req, res, () => {});

  assert.equal(responseStatusCode, 401);
  assert.equal(responsePayload.success, false);
  assert.match(responsePayload.message, /Missing or malformed Bearer token/i);
});

test('Unit 5: authenticate middleware rejects non-Bearer Authorization header with 401', async () => {
  const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
  let responseStatusCode = null;
  let responsePayload = null;

  const res = {
    status(code) {
      responseStatusCode = code;
      return this;
    },
    json(payload) {
      responsePayload = payload;
      return this;
    }
  };

  await authenticate(req, res, () => {});

  assert.equal(responseStatusCode, 401);
  assert.equal(responsePayload.success, false);
  assert.match(responsePayload.message, /Missing or malformed Bearer token/i);
});

test('Unit 6: authenticate middleware rejects empty Bearer token with 401', async () => {
  const req = { headers: { authorization: 'Bearer ' } };
  let responseStatusCode = null;
  let responsePayload = null;

  const res = {
    status(code) {
      responseStatusCode = code;
      return this;
    },
    json(payload) {
      responsePayload = payload;
      return this;
    }
  };

  await authenticate(req, res, () => {});

  assert.equal(responseStatusCode, 401);
  assert.equal(responsePayload.success, false);
  assert.match(responsePayload.message, /token cannot be empty/i);
});

test('Unit 7: notFoundHandler returns 404 with structured message', () => {
  const req = { method: 'POST', originalUrl: '/api/unknown' };
  let responseStatusCode = null;
  let responsePayload = null;

  const res = {
    status(code) {
      responseStatusCode = code;
      return this;
    },
    json(payload) {
      responsePayload = payload;
      return this;
    }
  };

  notFoundHandler(req, res);

  assert.equal(responseStatusCode, 404);
  assert.equal(responsePayload.success, false);
  assert.match(responsePayload.message, /Route not found: POST \/api\/unknown/);
});

test('Unit 8: errorHandler hides stack trace in production environment', () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const err = new Error('Database connection timeout');
  err.stack = 'Secret stack trace with internal file paths';

  const req = { method: 'GET', originalUrl: '/api/sensitive' };
  let responseStatusCode = null;
  let responsePayload = null;

  const res = {
    status(code) {
      responseStatusCode = code;
      return this;
    },
    json(payload) {
      responsePayload = payload;
      return this;
    }
  };

  errorHandler(err, req, res, () => {});

  process.env.NODE_ENV = originalEnv;

  assert.equal(responseStatusCode, 500);
  assert.equal(responsePayload.success, false);
  assert.equal(responsePayload.errors, undefined);
  assert.match(responsePayload.message, /Internal server error occurred/i);
});

test('Unit 9: Standard response format helper (sendSuccess and sendError)', () => {
  let successStatus = null;
  let successBody = null;
  const mockRes1 = {
    status(c) { successStatus = c; return this; },
    json(p) { successBody = p; return this; }
  };

  sendSuccess(mockRes1, { id: 1 }, 'Data fetched', 200);
  assert.equal(successStatus, 200);
  assert.equal(successBody.success, true);
  assert.equal(successBody.message, 'Data fetched');
  assert.deepEqual(successBody.data, { id: 1 });

  let errorStatus = null;
  let errorBody = null;
  const mockRes2 = {
    status(c) { errorStatus = c; return this; },
    json(p) { errorBody = p; return this; }
  };

  sendError(mockRes2, 'Failed validation', 400, { field: 'email' });
  assert.equal(errorStatus, 400);
  assert.equal(errorBody.success, false);
  assert.equal(errorBody.message, 'Failed validation');
  assert.deepEqual(errorBody.errors, { field: 'email' });
});
