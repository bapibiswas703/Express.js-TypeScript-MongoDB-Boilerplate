import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { connectTestDb, closeTestDb, clearTestDb } from '../setup/test-db';
import { createTestRole, createTestUser, generateToken } from '../setup/test-helpers';
import { DEFAULT_ROLES } from '../../src/common/constants/permissions';

jest.mock('../../src/common/queues', () => ({
  queueEmail: jest.fn().mockResolvedValue(undefined),
  queueBulkEmail: jest.fn().mockResolvedValue(undefined),
}));

const app = createTestApp();

beforeAll(async () => await connectTestDb());
afterEach(async () => await clearTestDb());
afterAll(async () => await closeTestDb());

describe('E2E: RBAC Enforcement', () => {
  it('should allow admin to manage categories but deny role management', async () => {
    // Create admin role (has category permissions but not role permissions)
    const adminRole = await createTestRole(DEFAULT_ROLES.ADMIN, [
      'category:read',
      'category:create',
      'category:update',
      'category:delete',
      'product:read',
      'user:read',
    ]);
    const adminUser = await createTestUser(adminRole._id.toString(), {
      email: 'admin@example.com',
    });
    const adminToken = generateToken(adminUser._id.toString());

    // Admin CAN create categories
    const catRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Admin Category' });

    expect(catRes.status).toBe(201);

    // Admin CANNOT create roles
    const roleRes = await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'newrole', permissions: ['user:read'] });

    expect(roleRes.status).toBe(403);

    // Admin CANNOT delete users
    const deleteRes = await request(app)
      .delete('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(403);
  });

  it('should restrict read-only user from write operations', async () => {
    // Create read-only user role
    const readOnlyRole = await createTestRole('readonly', [
      'category:read',
      'product:read',
      'user:read',
    ]);
    const readOnlyUser = await createTestUser(readOnlyRole._id.toString(), {
      email: 'reader@example.com',
    });
    const readOnlyToken = generateToken(readOnlyUser._id.toString());

    // CAN read categories
    const readRes = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${readOnlyToken}`);

    expect(readRes.status).toBe(200);

    // CANNOT create categories
    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${readOnlyToken}`)
      .send({ name: 'Unauthorized Category' });

    expect(createRes.status).toBe(403);

    // CANNOT create products
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${readOnlyToken}`)
      .send({ name: 'Unauthorized', price: 10, category: '507f1f77bcf86cd799439011' });

    expect(productRes.status).toBe(403);
  });

  it('should deny unauthenticated access to protected endpoints', async () => {
    const endpoints = [
      { method: 'get' as const, url: '/api/users' },
      { method: 'get' as const, url: '/api/categories' },
      { method: 'get' as const, url: '/api/products' },
      { method: 'get' as const, url: '/api/roles' },
      { method: 'post' as const, url: '/api/categories' },
      { method: 'post' as const, url: '/api/products' },
      { method: 'post' as const, url: '/api/roles' },
    ];

    for (const { method, url } of endpoints) {
      const res = await request(app)[method](url);
      expect(res.status).toBe(401);
    }
  });

  it('should allow superadmin full access across all modules', async () => {
    // Create superadmin with all permissions
    const superRole = await createTestRole(DEFAULT_ROLES.SUPERADMIN, [
      'user:read',
      'user:create',
      'user:update',
      'user:delete',
      'role:read',
      'role:create',
      'role:update',
      'role:delete',
      'category:read',
      'category:create',
      'category:update',
      'category:delete',
      'product:read',
      'product:create',
      'product:update',
      'product:delete',
    ]);
    const superUser = await createTestUser(superRole._id.toString(), {
      email: 'super@example.com',
    });
    const superToken = generateToken(superUser._id.toString());

    // Create role
    const roleRes = await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ name: 'editor', permissions: ['product:read', 'product:update'] });

    expect(roleRes.status).toBe(201);

    // Create category
    const catRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ name: 'Electronics' });

    expect(catRes.status).toBe(201);

    // Create product
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        name: 'Phone',
        price: 999,
        category: catRes.body.data.category._id,
        stock: 10,
      });

    expect(productRes.status).toBe(201);

    // List users
    const usersRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${superToken}`);

    expect(usersRes.status).toBe(200);

    // Delete the product
    const deleteRes = await request(app)
      .delete(`/api/products/${productRes.body.data.product._id}`)
      .set('Authorization', `Bearer ${superToken}`);

    expect(deleteRes.status).toBe(204);
  });

  it('should enforce different permission levels between registered user and admin', async () => {
    // Create user role (read-only) and admin role (read + write)
    await createTestRole(DEFAULT_ROLES.USER, ['category:read', 'product:read']);
    const adminRole = await createTestRole(DEFAULT_ROLES.ADMIN, [
      'user:read',
      'category:read',
      'category:create',
      'category:delete',
      'product:read',
      'product:create',
    ]);

    // Regular user registers (gets "user" role by default)
    const registerRes = await request(app).post('/api/auth/register').send({
      email: 'viewer@example.com',
      password: 'Password123',
      name: 'Viewer',
    });

    expect(registerRes.status).toBe(201);
    const viewerToken = registerRes.body.data.accessToken;

    // Admin user created directly
    const admin = await createTestUser(adminRole._id.toString(), {
      email: 'admin@example.com',
    });
    const adminToken = generateToken(admin._id.toString());

    // Admin creates a category
    const catRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Shared Category' });

    expect(catRes.status).toBe(201);
    const catId = catRes.body.data.category._id;

    // Viewer CAN read the category
    const readRes = await request(app)
      .get(`/api/categories/${catId}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(readRes.status).toBe(200);
    expect(readRes.body.data.category.name).toBe('Shared Category');

    // Viewer CANNOT create a category
    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Unauthorized' });

    expect(createRes.status).toBe(403);

    // Viewer CANNOT delete the category
    const deleteRes = await request(app)
      .delete(`/api/categories/${catId}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(deleteRes.status).toBe(403);

    // Admin CAN delete the category
    const adminDeleteRes = await request(app)
      .delete(`/api/categories/${catId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminDeleteRes.status).toBe(204);
  });
});
