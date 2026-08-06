import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const app = createTestApp();

describe('Health Check', () => {
  it('GET /health should return ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
