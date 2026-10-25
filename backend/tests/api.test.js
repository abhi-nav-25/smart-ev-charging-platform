import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { isValidUUID, isValidEmail, isValidISODate, validateRequired } from '../src/utils/validator.js';

test('1. Health Check Endpoint (GET /api/health)', async () => {
  const res = await request(app).get('/api/health');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.status, 'healthy');
  assert.ok(res.body.data.uptime);
  assert.ok(res.body.data.timestamp);
  assert.equal(res.body.data.version, '1.0.0');
});

test('2. Root endpoint welcome message (GET /)', async () => {
  const res = await request(app).get('/');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.health_check);
});

test('3. 404 Not Found Handler for nonexistent route', async () => {
  const res = await request(app).get('/api/non-existent-endpoint');

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Route not found/);
});

test('4. Register Validation - Missing fields', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({});

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Missing required fields/);
});

test('5. Register Validation - Invalid email', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'invalid-email',
      password: 'password123'
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /valid email/i);
});

test('6. Register Validation - Short password', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'test@example.com',
      password: '123'
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /at least 6 characters/i);
});

test('7. Login Validation - Missing fields', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({});

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Missing required fields/);
});

test('8. Protected Route (GET /api/auth/me) rejects unauthenticated request', async () => {
  const res = await request(app).get('/api/auth/me');

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Authentication required/i);
});

test('9. Protected Route (POST /api/bookings) rejects unauthenticated request', async () => {
  const res = await request(app)
    .post('/api/bookings')
    .send({
      station_id: '11111111-1111-1111-1111-111111111111',
      slot_id: 'a1111111-1111-1111-1111-111111111111',
      booking_date: '2026-10-25',
      start_time: '2026-10-25T10:00:00Z',
      end_time: '2026-10-25T11:00:00Z'
    });

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('10. Protected Route (GET /api/bookings/my) rejects unauthenticated request', async () => {
  const res = await request(app).get('/api/bookings/my');

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('11. Protected Route (PATCH /api/bookings/:id/cancel) rejects unauthenticated request', async () => {
  const res = await request(app).patch('/api/bookings/11111111-1111-1111-1111-111111111111/cancel');

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('12. Protected Route (POST /api/payments/simulate) rejects unauthenticated request', async () => {
  const res = await request(app)
    .post('/api/payments/simulate')
    .send({
      booking_id: '11111111-1111-1111-1111-111111111111',
      status: 'success'
    });

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('13. Protected Admin Route (GET /api/admin/stats) rejects unauthenticated request', async () => {
  const res = await request(app).get('/api/admin/stats');

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('14. Protected Admin Route (POST /api/admin/stations) rejects unauthenticated request', async () => {
  const res = await request(app)
    .post('/api/admin/stations')
    .send({ name: 'Admin Test Station' });

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('15. Utility Validators - UUID, Email, Date checks', () => {
  assert.equal(isValidUUID('11111111-1111-1111-1111-111111111111'), true);
  assert.equal(isValidUUID('invalid-uuid-format'), false);
  assert.equal(isValidUUID(12345), false);

  assert.equal(isValidEmail('test@domain.com'), true);
  assert.equal(isValidEmail('bademail'), false);

  assert.equal(isValidISODate('2026-10-25T10:00:00Z'), true);
  assert.equal(isValidISODate('not-a-date'), false);

  const missing = validateRequired({ a: 1, b: '' }, ['a', 'b', 'c']);
  assert.deepEqual(missing, ['b', 'c']);
});
