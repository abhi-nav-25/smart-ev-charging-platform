import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdmin } from '../src/middleware/requireAdmin.js';
import { authenticate } from '../src/middleware/authenticate.js';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler.js';
import { sendSuccess, sendError } from '../src/utils/response.js';
import { simulatePayment } from '../src/controllers/payment.controller.js';

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

test('Unit 10: requireAdmin blocks non-admin roles and malformed users', () => {
  const invalidUsers = [
    { id: '1', role: 'driver' },
    { id: '2', role: 'operator' },
    { id: '3', role: null },
    { id: '4', role: undefined },
    { id: '5' }
  ];

  for (const user of invalidUsers) {
    let statusCode = null;
    let nextCalled = false;
    const res = {
      status(c) { statusCode = c; return this; },
      json() { return this; }
    };
    requireAdmin({ user }, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false, `Expected user with role ${user.role} to be blocked`);
    assert.equal(statusCode, 403);
  }
});

test('Unit 11: authenticate middleware rejects non-existent tokens with 401', async () => {
  const req = { headers: { authorization: 'Bearer completely-invalid-fake-jwt-token' } };
  let statusCode = null;
  let responsePayload = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json(p) { responsePayload = p; return this; }
  };
  await authenticate(req, res, () => {});
  assert.equal(statusCode, 401);
  assert.equal(responsePayload.success, false);
});

test('Unit 12: simulatePayment controller validates input fields', async () => {
  const createMockRes = () => {
    return {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      }
    };
  };

  // 1. Missing booking_id
  const res1 = createMockRes();
  await simulatePayment({ body: {}, user: { id: 'u1' } }, res1);
  assert.equal(res1.statusCode, 400);
  assert.match(res1.body.message, /Missing required payment field/i);

  // 2. Invalid UUID
  const res2 = createMockRes();
  await simulatePayment({ body: { booking_id: 'bad-uuid' }, user: { id: 'u1' } }, res2);
  assert.equal(res2.statusCode, 400);
  assert.match(res2.body.message, /Invalid booking_id format/i);

  // 3. Invalid status
  const res3 = createMockRes();
  await simulatePayment(
    { body: { booking_id: '11111111-1111-1111-1111-111111111111', status: 'unknown' }, user: { id: 'u1' } },
    res3
  );
  assert.equal(res3.statusCode, 400);
  assert.match(res3.body.message, /must be either 'success' or 'failed'/i);
});

