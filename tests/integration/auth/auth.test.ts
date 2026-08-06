import request from 'supertest';
import { createTestApp } from '../../setup/test-app';
import { connectTestDb, closeTestDb, clearTestDb } from '../../setup/test-db';
import { createTestRole, createTestUser } from '../../setup/test-helpers';
import { DEFAULT_ROLES } from '../../../src/common/constants/permissions';

// Mock queue to avoid actual email sending
jest.mock('../../../src/common/queues', () => ({
  queueEmail: jest.fn().mockResolvedValue(undefined),
  queueBulkEmail: jest.fn().mockResolvedValue(undefined),
}));

const app = createTestApp();

beforeAll(async () => await connectTestDb());
afterEach(async () => await clearTestDb());
afterAll(async () => await closeTestDb());

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      await createTestRole(DEFAULT_ROLES.USER, ['user:read']);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: 'Password123', name: 'New User' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe('new@example.com');
    });

    it('should return 409 for duplicate email', async () => {
      await createTestRole(DEFAULT_ROLES.USER, ['user:read']);
      await createTestUser(undefined, { email: 'dup@example.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@example.com', password: 'Password123', name: 'Dup' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid body', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const role = await createTestRole(DEFAULT_ROLES.USER, ['user:read']);
      await createTestUser(role._id.toString(), {
        email: 'login@example.com',
        password: 'Password123',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'Password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should return 401 for wrong password', async () => {
      await createTestUser(undefined, { email: 'login@example.com', password: 'Password123' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'Password123' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with a valid refresh token', async () => {
      const role = await createTestRole(DEFAULT_ROLES.USER, ['user:read']);
      await createTestUser(role._id.toString(), {
        email: 'refresh@example.com',
        password: 'Password123',
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'refresh@example.com', password: 'Password123' });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: loginRes.body.data.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.refreshToken).not.toBe(loginRes.body.data.refreshToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });

    it('should return 401 when reusing a rotated refresh token', async () => {
      const role = await createTestRole(DEFAULT_ROLES.USER, ['user:read']);
      await createTestUser(role._id.toString(), {
        email: 'reuse@example.com',
        password: 'Password123',
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'reuse@example.com', password: 'Password123' });

      const oldRefreshToken = loginRes.body.data.refreshToken;

      // Rotate the token
      await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefreshToken });

      // Try to reuse the old token (should be revoked)
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken });

      expect(res.status).toBe(401);
    });

    it('should return 400 for missing refreshToken field', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should revoke the refresh token', async () => {
      const role = await createTestRole(DEFAULT_ROLES.USER, ['user:read']);
      await createTestUser(role._id.toString(), {
        email: 'logout@example.com',
        password: 'Password123',
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'logout@example.com', password: 'Password123' });

      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: loginRes.body.data.refreshToken });

      expect(res.status).toBe(204);

      // Token should no longer work for refresh
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: loginRes.body.data.refreshToken });

      expect(refreshRes.status).toBe(401);
    });

    it('should return 400 for invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/logout-all', () => {
    it('should revoke all refresh tokens for the user', async () => {
      const role = await createTestRole(DEFAULT_ROLES.USER, ['user:read']);
      await createTestUser(role._id.toString(), {
        email: 'logoutall@example.com',
        password: 'Password123',
      });

      // Login twice to create two refresh tokens
      const loginRes1 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'logoutall@example.com', password: 'Password123' });

      const loginRes2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'logoutall@example.com', password: 'Password123' });

      // Logout all using access token
      const res = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${loginRes1.body.data.accessToken}`);

      expect(res.status).toBe(204);

      // Both refresh tokens should be revoked
      const refresh1 = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: loginRes1.body.data.refreshToken });
      const refresh2 = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: loginRes2.body.data.refreshToken });

      expect(refresh1.status).toBe(401);
      expect(refresh2.status).toBe(401);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).post('/api/auth/logout-all');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const role = await createTestRole(DEFAULT_ROLES.USER, ['user:read']);
      await createTestUser(role._id.toString());

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password123' });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken');

      expect(res.status).toBe(401);
    });
  });
});
