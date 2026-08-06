import request from 'supertest';
import { createTestApp } from '../../setup/test-app';
import { connectTestDb, closeTestDb, clearTestDb } from '../../setup/test-db';
import { createAuthenticatedUser } from '../../setup/test-helpers';

const app = createTestApp();

beforeAll(async () => await connectTestDb());
afterEach(async () => await clearTestDb());
afterAll(async () => await closeTestDb());

describe('Role API', () => {
  describe('POST /api/roles', () => {
    it('should create a new role', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'editor', permissions: ['product:read', 'product:update'] });

      expect(res.status).toBe(201);
      expect(res.body.data.role.name).toBe('editor');
      expect(res.body.data.role.permissions).toContain('product:read');
    });

    it('should return 409 for duplicate role name', async () => {
      const { token } = await createAuthenticatedUser();

      // The "testadmin" role already exists from createAuthenticatedUser
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'testadmin', permissions: ['user:read'] });

      expect(res.status).toBe(409);
    });

    it('should return 400 for invalid body', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'x' }); // missing permissions

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/roles', () => {
    it('should return paginated roles', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app).get('/api/roles').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toBeInstanceOf(Array);
      expect(res.body.data.docs.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/roles/:id', () => {
    it('should return role by id', async () => {
      const { token, role } = await createAuthenticatedUser();

      const res = await request(app)
        .get(`/api/roles/${role._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.role.name).toBe('testadmin');
    });

    it('should return 404 for non-existent role', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .get('/api/roles/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/roles/:id', () => {
    it('should update role', async () => {
      const { token, role } = await createAuthenticatedUser();

      const res = await request(app)
        .patch(`/api/roles/${role._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Updated description' });

      expect(res.status).toBe(200);
      expect(res.body.data.role.description).toBe('Updated description');
    });
  });

  describe('DELETE /api/roles/:id', () => {
    it('should delete role', async () => {
      const { token } = await createAuthenticatedUser();

      // Create a role to delete
      const createRes = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'disposable', permissions: ['user:read'] });

      const res = await request(app)
        .delete(`/api/roles/${createRes.body.data.role._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
    });
  });

  describe('GET /api/roles/permissions', () => {
    it('should return all available permissions', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .get('/api/roles/permissions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.permissions).toBeInstanceOf(Array);
      expect(res.body.data.permissions).toContain('user:read');
      expect(res.body.data.permissions).toContain('product:create');
    });
  });
});
