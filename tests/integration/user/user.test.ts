import request from 'supertest';
import { createTestApp } from '../../setup/test-app';
import { connectTestDb, closeTestDb, clearTestDb } from '../../setup/test-db';
import { createAuthenticatedUser, createTestUser } from '../../setup/test-helpers';

const app = createTestApp();

beforeAll(async () => await connectTestDb());
afterEach(async () => await clearTestDb());
afterAll(async () => await closeTestDb());

describe('User API', () => {
  describe('GET /api/users', () => {
    it('should return paginated users', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.docs).toBeInstanceOf(Array);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should support pagination query params', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .get('/api/users?page=1&limit=5')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.limit).toBe(5);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by id', async () => {
      const { token, user } = await createAuthenticatedUser();

      const res = await request(app)
        .get(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(user.email);
    });

    it('should return 404 for non-existent user', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .get('/api/users/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('should update user', async () => {
      const { token, user } = await createAuthenticatedUser();

      const res = await request(app)
        .patch(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.name).toBe('Updated Name');
    });

    it('should return 400 for empty body', async () => {
      const { token, user } = await createAuthenticatedUser();

      const res = await request(app)
        .patch(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user', async () => {
      const { token, role } = await createAuthenticatedUser();
      const otherUser = await createTestUser(role._id.toString(), { email: 'other@example.com' });

      const res = await request(app)
        .delete(`/api/users/${otherUser._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
    });

    it('should return 404 for non-existent user', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .delete('/api/users/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
