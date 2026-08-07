import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { connectTestDb, closeTestDb, clearTestDb } from '../setup/test-db';
import { createTestRole } from '../setup/test-helpers';
import { DEFAULT_ROLES } from '../../src/common/constants/permissions';

jest.mock('../../src/common/queues', () => ({
  queueEmail: jest.fn().mockResolvedValue(undefined),
  queueBulkEmail: jest.fn().mockResolvedValue(undefined),
}));

const app = createTestApp();

beforeAll(async () => await connectTestDb());
afterEach(async () => await clearTestDb());
afterAll(async () => await closeTestDb());

describe('E2E: Auth Flow', () => {
  it('should complete full auth lifecycle: register → login → me → change password → login with new password → refresh → logout', async () => {
    await createTestRole(DEFAULT_ROLES.USER, ['user:read']);

    // 1. Register
    const registerRes = await request(app).post('/api/auth/register').send({
      email: 'alice@example.com',
      password: 'Password123',
      name: 'Alice',
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data.user.email).toBe('alice@example.com');
    const { accessToken } = registerRes.body.data;

    // 2. Get profile with the token from registration
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.name).toBe('Alice');

    // 3. Change password
    const changePwRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'Password123', newPassword: 'NewPass456' });

    expect(changePwRes.status).toBe(200);

    // 4. Login with new password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'NewPass456' });

    expect(loginRes.status).toBe(200);
    const newAccessToken = loginRes.body.data.accessToken;
    const newRefreshToken = loginRes.body.data.refreshToken;

    // 5. Old password should no longer work
    const oldPwRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'Password123' });

    expect(oldPwRes.status).toBe(401);

    // 6. Refresh tokens
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: newRefreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).not.toBe(newRefreshToken);

    // 7. Logout with the rotated refresh token
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: refreshRes.body.data.refreshToken });

    expect(logoutRes.status).toBe(204);

    // 8. Refresh should fail after logout
    const postLogoutRefresh = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshRes.body.data.refreshToken });

    expect(postLogoutRefresh.status).toBe(401);

    // 9. Access token still works (JWT is stateless until expiry)
    const stillAuthRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${newAccessToken}`);

    expect(stillAuthRes.status).toBe(200);
  });

  it('should handle multi-device logout-all flow', async () => {
    await createTestRole(DEFAULT_ROLES.USER, ['user:read']);

    // Register user
    await request(app).post('/api/auth/register').send({
      email: 'bob@example.com',
      password: 'Password123',
      name: 'Bob',
    });

    // Login from "device 1"
    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'Password123' });

    // Login from "device 2"
    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'Password123' });

    expect(login1.status).toBe(200);
    expect(login2.status).toBe(200);

    // Logout all from device 1
    const logoutAllRes = await request(app)
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${login1.body.data.accessToken}`);

    expect(logoutAllRes.status).toBe(204);

    // Both refresh tokens should be revoked
    const refresh1 = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: login1.body.data.refreshToken });

    const refresh2 = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: login2.body.data.refreshToken });

    expect(refresh1.status).toBe(401);
    expect(refresh2.status).toBe(401);
  });

  it('should prevent duplicate registration', async () => {
    await createTestRole(DEFAULT_ROLES.USER, ['user:read']);

    const first = await request(app).post('/api/auth/register').send({
      email: 'unique@example.com',
      password: 'Password123',
      name: 'First',
    });
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/auth/register').send({
      email: 'unique@example.com',
      password: 'Password456',
      name: 'Second',
    });
    expect(second.status).toBe(409);

    // Original user can still login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unique@example.com', password: 'Password123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.name).toBe('First');
  });

  it('should handle refresh token rotation correctly — old tokens become invalid', async () => {
    await createTestRole(DEFAULT_ROLES.USER, ['user:read']);

    const registerRes = await request(app).post('/api/auth/register').send({
      email: 'rotate@example.com',
      password: 'Password123',
      name: 'Rotate',
    });

    const token1 = registerRes.body.data.refreshToken;

    // Rotate: token1 → token2
    const refresh1 = await request(app).post('/api/auth/refresh').send({ refreshToken: token1 });

    expect(refresh1.status).toBe(200);
    const token2 = refresh1.body.data.refreshToken;

    // Rotate: token2 → token3
    const refresh2 = await request(app).post('/api/auth/refresh').send({ refreshToken: token2 });

    expect(refresh2.status).toBe(200);

    // Reuse token1 — should fail
    const reuse1 = await request(app).post('/api/auth/refresh').send({ refreshToken: token1 });

    expect(reuse1.status).toBe(401);

    // Reuse token2 — should fail
    const reuse2 = await request(app).post('/api/auth/refresh').send({ refreshToken: token2 });

    expect(reuse2.status).toBe(401);
  });
});
