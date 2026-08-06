import request from 'supertest';
import { createTestApp } from '../../setup/test-app';
import { connectTestDb, closeTestDb, clearTestDb } from '../../setup/test-db';
import { createAuthenticatedUser } from '../../setup/test-helpers';
import Category from '../../../src/modules/category/category.model';

const app = createTestApp();

beforeAll(async () => await connectTestDb());
afterEach(async () => await clearTestDb());
afterAll(async () => await closeTestDb());

describe('Category API', () => {
  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Electronics', description: 'Electronic devices' });

      expect(res.status).toBe(201);
      expect(res.body.data.category.name).toBe('Electronics');
    });

    it('should return 409 for duplicate category', async () => {
      const { token } = await createAuthenticatedUser();
      await Category.create({ name: 'Electronics' });

      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Electronics' });

      expect(res.status).toBe(409);
    });

    it('should return 400 for missing name', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No name' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/categories', () => {
    it('should return paginated categories', async () => {
      const { token } = await createAuthenticatedUser();
      await Category.create({ name: 'Cat1' });
      await Category.create({ name: 'Cat2' });

      const res = await request(app).get('/api/categories').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(2);
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should return category by id', async () => {
      const { token } = await createAuthenticatedUser();
      const category = await Category.create({ name: 'Electronics' });

      const res = await request(app)
        .get(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.category.name).toBe('Electronics');
    });

    it('should return 404 for non-existent category', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .get('/api/categories/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/categories/:id', () => {
    it('should update category', async () => {
      const { token } = await createAuthenticatedUser();
      const category = await Category.create({ name: 'Old Name' });

      const res = await request(app)
        .patch(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.category.name).toBe('New Name');
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete category', async () => {
      const { token } = await createAuthenticatedUser();
      const category = await Category.create({ name: 'ToDelete' });

      const res = await request(app)
        .delete(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
    });

    it('should return 404 for non-existent category', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .delete('/api/categories/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
