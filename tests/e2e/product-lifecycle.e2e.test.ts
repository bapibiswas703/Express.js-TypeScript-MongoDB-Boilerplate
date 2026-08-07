import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { connectTestDb, closeTestDb, clearTestDb } from '../setup/test-db';
import { createAuthenticatedUser } from '../setup/test-helpers';

const app = createTestApp();

beforeAll(async () => await connectTestDb());
afterEach(async () => await clearTestDb());
afterAll(async () => await closeTestDb());

describe('E2E: Product Lifecycle', () => {
  it('should complete full product lifecycle: create categories → create products → list/filter → update → delete', async () => {
    const { token } = await createAuthenticatedUser();

    // 1. Create two categories
    const cat1Res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Electronics', description: 'Electronic devices' });

    const cat2Res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Books', description: 'Books and publications' });

    expect(cat1Res.status).toBe(201);
    expect(cat2Res.status).toBe(201);

    const electronicsId = cat1Res.body.data.category._id;
    const booksId = cat2Res.body.data.category._id;

    // 2. Create products in each category
    const p1Res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Laptop', price: 1200, category: electronicsId, stock: 10 });

    const p2Res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Phone', price: 800, category: electronicsId, stock: 25 });

    const p3Res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'TypeScript Handbook', price: 40, category: booksId, stock: 100 });

    expect(p1Res.status).toBe(201);
    expect(p2Res.status).toBe(201);
    expect(p3Res.status).toBe(201);

    // 3. List all products — should return 3
    const allProducts = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`);

    expect(allProducts.status).toBe(200);
    expect(allProducts.body.data.docs).toHaveLength(3);

    // 4. Filter by category — electronics only
    const electronicsOnly = await request(app)
      .get(`/api/products?category=${electronicsId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(electronicsOnly.status).toBe(200);
    expect(electronicsOnly.body.data.docs).toHaveLength(2);
    const catIds = electronicsOnly.body.data.docs.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => (typeof p.category === 'string' ? p.category : p.category._id),
    );
    expect(catIds.every((id: string) => id === electronicsId)).toBe(true);

    // 5. Filter by price range — only the book ($40)
    const cheapProducts = await request(app)
      .get('/api/products?maxPrice=100')
      .set('Authorization', `Bearer ${token}`);

    expect(cheapProducts.status).toBe(200);
    expect(cheapProducts.body.data.docs).toHaveLength(1);
    expect(cheapProducts.body.data.docs[0].name).toBe('TypeScript Handbook');

    // 6. Get single product
    const singleProduct = await request(app)
      .get(`/api/products/${p1Res.body.data.product._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(singleProduct.status).toBe(200);
    expect(singleProduct.body.data.product.name).toBe('Laptop');

    // 7. Update product
    const updateRes = await request(app)
      .patch(`/api/products/${p1Res.body.data.product._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Gaming Laptop', price: 1500 });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.product.name).toBe('Gaming Laptop');
    expect(updateRes.body.data.product.price).toBe(1500);

    // 8. Move product to different category
    const moveRes = await request(app)
      .patch(`/api/products/${p1Res.body.data.product._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category: booksId });

    expect(moveRes.status).toBe(200);

    // Verify category filter reflects the change
    const electronicsAfterMove = await request(app)
      .get(`/api/products?category=${electronicsId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(electronicsAfterMove.body.data.docs).toHaveLength(1);

    // 9. Delete product
    const deleteRes = await request(app)
      .delete(`/api/products/${p2Res.body.data.product._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(204);

    // 10. Verify deletion — should be 404
    const afterDelete = await request(app)
      .get(`/api/products/${p2Res.body.data.product._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(afterDelete.status).toBe(404);

    // 11. Total products should now be 2
    const finalList = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`);

    expect(finalList.body.data.docs).toHaveLength(2);
  });

  it('should enforce category existence when creating products', async () => {
    const { token } = await createAuthenticatedUser();

    // Create product with non-existent category
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Orphan Product', price: 10, category: '507f1f77bcf86cd799439011' });

    expect(res.status).toBe(400);
  });

  it('should handle category CRUD lifecycle', async () => {
    const { token } = await createAuthenticatedUser();

    // Create
    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Toys', description: 'Children toys' });

    expect(createRes.status).toBe(201);
    const catId = createRes.body.data.category._id;

    // Read
    const getRes = await request(app)
      .get(`/api/categories/${catId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.category.name).toBe('Toys');

    // Update
    const updateRes = await request(app)
      .patch(`/api/categories/${catId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Kids Toys' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.category.name).toBe('Kids Toys');

    // List — should show 1
    const listRes = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.body.data.docs).toHaveLength(1);

    // Delete
    const deleteRes = await request(app)
      .delete(`/api/categories/${catId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(204);

    // Verify deleted
    const afterDelete = await request(app)
      .get(`/api/categories/${catId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(afterDelete.status).toBe(404);
  });

  it('should support pagination when listing products', async () => {
    const { token } = await createAuthenticatedUser();

    // Create a category
    const catRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Gadgets' });

    const catId = catRes.body.data.category._id;

    // Create 5 products
    for (let i = 1; i <= 5; i++) {
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Gadget ${i}`, price: i * 10, category: catId, stock: i });
    }

    // Request page 1 with limit 2
    const page1 = await request(app)
      .get('/api/products?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(page1.status).toBe(200);
    expect(page1.body.data.docs).toHaveLength(2);
    expect(page1.body.data.pagination.total).toBe(5);
    expect(page1.body.data.pagination.page).toBe(1);

    // Request page 3 with limit 2 — should return 1 product
    const page3 = await request(app)
      .get('/api/products?page=3&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(page3.status).toBe(200);
    expect(page3.body.data.docs).toHaveLength(1);
  });
});
