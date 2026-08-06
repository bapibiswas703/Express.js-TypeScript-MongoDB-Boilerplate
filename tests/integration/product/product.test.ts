import request from 'supertest';
import { createTestApp } from '../../setup/test-app';
import { connectTestDb, closeTestDb, clearTestDb } from '../../setup/test-db';
import { createAuthenticatedUser } from '../../setup/test-helpers';
import Category from '../../../src/modules/category/category.model';
import Product from '../../../src/modules/product/product.model';

const app = createTestApp();

beforeAll(async () => await connectTestDb());
afterEach(async () => await clearTestDb());
afterAll(async () => await closeTestDb());

describe('Product API', () => {
  const createCategory = async () => Category.create({ name: 'Electronics' });

  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const { token } = await createAuthenticatedUser();
      const category = await createCategory();

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'iPhone 15',
          price: 999,
          category: category._id.toString(),
          stock: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.product.name).toBe('iPhone 15');
      expect(res.body.data.product.price).toBe(999);
    });

    it('should return 400 for invalid category', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'iPhone 15',
          price: 999,
          category: '507f1f77bcf86cd799439011',
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'iPhone' }); // missing price and category

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/products', () => {
    it('should return paginated products', async () => {
      const { token } = await createAuthenticatedUser();
      const category = await createCategory();
      await Product.create({ name: 'Product 1', price: 10, category: category._id });
      await Product.create({ name: 'Product 2', price: 20, category: category._id });

      const res = await request(app).get('/api/products').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(2);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should filter by category', async () => {
      const { token } = await createAuthenticatedUser();
      const cat1 = await Category.create({ name: 'Cat1' });
      const cat2 = await Category.create({ name: 'Cat2' });
      await Product.create({ name: 'P1', price: 10, category: cat1._id });
      await Product.create({ name: 'P2', price: 20, category: cat2._id });

      const res = await request(app)
        .get(`/api/products?category=${cat1._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].name).toBe('P1');
    });

    it('should filter by price range', async () => {
      const { token } = await createAuthenticatedUser();
      const category = await createCategory();
      await Product.create({ name: 'Cheap', price: 5, category: category._id });
      await Product.create({ name: 'Mid', price: 50, category: category._id });
      await Product.create({ name: 'Expensive', price: 500, category: category._id });

      const res = await request(app)
        .get('/api/products?minPrice=10&maxPrice=100')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].name).toBe('Mid');
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return product with populated category', async () => {
      const { token } = await createAuthenticatedUser();
      const category = await createCategory();
      const product = await Product.create({ name: 'iPhone', price: 999, category: category._id });

      const res = await request(app)
        .get(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.product.name).toBe('iPhone');
    });

    it('should return 404 for non-existent product', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .get('/api/products/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/products/:id', () => {
    it('should update product', async () => {
      const { token } = await createAuthenticatedUser();
      const category = await createCategory();
      const product = await Product.create({ name: 'Old', price: 100, category: category._id });

      const res = await request(app)
        .patch(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated', price: 200 });

      expect(res.status).toBe(200);
      expect(res.body.data.product.name).toBe('Updated');
      expect(res.body.data.product.price).toBe(200);
    });

    it('should validate category on update', async () => {
      const { token } = await createAuthenticatedUser();
      const category = await createCategory();
      const product = await Product.create({ name: 'P1', price: 10, category: category._id });

      const res = await request(app)
        .patch(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ category: '507f1f77bcf86cd799439011' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete product', async () => {
      const { token } = await createAuthenticatedUser();
      const category = await createCategory();
      const product = await Product.create({ name: 'ToDelete', price: 10, category: category._id });

      const res = await request(app)
        .delete(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
    });

    it('should return 404 for non-existent product', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .delete('/api/products/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
