import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

test('1. Station Details - Rejects invalid UUID format', async () => {
  const res = await request(app).get('/api/stations/not-a-valid-uuid');
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Invalid station ID format/);
});

test('2. Rate Limiting - Health check is never rate limited', async () => {
  for (let i = 0; i < 5; i++) {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
  }
});
