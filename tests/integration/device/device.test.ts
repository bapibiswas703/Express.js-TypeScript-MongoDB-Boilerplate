import request from 'supertest';
import { createTestApp } from '../../setup/test-app';
import { connectTestDb, closeTestDb, clearTestDb } from '../../setup/test-db';
import { createTestRole, createTestUser } from '../../setup/test-helpers';
import { DEFAULT_ROLES } from '../../../src/common/constants/permissions';
import Device from '../../../src/modules/device/device.model';

// Mock queue to avoid actual email sending
jest.mock('../../../src/common/queues', () => ({
  queueEmail: jest.fn().mockResolvedValue(undefined),
  queueBulkEmail: jest.fn().mockResolvedValue(undefined),
}));

const app = createTestApp();

beforeAll(async () => await connectTestDb());
afterEach(async () => await clearTestDb());
afterAll(async () => await closeTestDb());

const loginUser = async (email = 'device@example.com', password = 'Password123') => {
  const role = await createTestRole(DEFAULT_ROLES.USER, [
    'user:read',
    'device:read',
    'device:update',
    'device:delete',
  ]);
  await createTestUser(role._id.toString(), { email, password });

  const res = await request(app).post('/api/auth/login').send({ email, password });

  return {
    accessToken: res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
  };
};

describe('Device API', () => {
  describe('GET /api/devices', () => {
    it('should return active devices for authenticated user', async () => {
      const { accessToken } = await loginUser();

      const res = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.devices).toBeInstanceOf(Array);
      expect(res.body.data.devices.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.devices[0].deviceName).toBeDefined();
      expect(res.body.data.devices[0].browser).toBeDefined();
      expect(res.body.data.devices[0].os).toBeDefined();
      expect(res.body.data.devices[0].isActive).toBe(true);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/devices');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/devices/:id', () => {
    it('should return a specific device', async () => {
      const { accessToken } = await loginUser();

      // Get device list first
      const listRes = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${accessToken}`);

      const deviceId = listRes.body.data.devices[0]._id;

      const res = await request(app)
        .get(`/api/devices/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.device._id).toBe(deviceId);
    });

    it('should return 404 for non-existent device', async () => {
      const { accessToken } = await loginUser();

      const res = await request(app)
        .get('/api/devices/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/devices/:id', () => {
    it('should rename a device', async () => {
      const { accessToken } = await loginUser();

      const listRes = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${accessToken}`);

      const deviceId = listRes.body.data.devices[0]._id;

      const res = await request(app)
        .patch(`/api/devices/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceName: 'My Work Laptop' });

      expect(res.status).toBe(200);
      expect(res.body.data.device.deviceName).toBe('My Work Laptop');
    });

    it('should return 400 for invalid body', async () => {
      const { accessToken } = await loginUser();

      const res = await request(app)
        .patch('/api/devices/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/devices/:id', () => {
    it('should revoke a device and its refresh token', async () => {
      const { accessToken, refreshToken } = await loginUser();

      const listRes = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${accessToken}`);

      const deviceId = listRes.body.data.devices[0]._id;

      const res = await request(app)
        .delete(`/api/devices/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(204);

      // The refresh token should now be revoked
      const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken });

      expect(refreshRes.status).toBe(401);
    });

    it('should return 404 for non-existent device', async () => {
      const { accessToken } = await loginUser();

      const res = await request(app)
        .delete('/api/devices/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/devices/revoke-others', () => {
    it('should revoke all other devices', async () => {
      // Login twice to create two devices
      const role = await createTestRole(DEFAULT_ROLES.USER, [
        'user:read',
        'device:read',
        'device:update',
        'device:delete',
      ]);
      await createTestUser(role._id.toString(), {
        email: 'multi@example.com',
        password: 'Password123',
      });

      const login1 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'multi@example.com', password: 'Password123' });

      const login2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'multi@example.com', password: 'Password123' });

      // Use login2 as the "current" session (most recent)
      const accessToken = login2.body.data.accessToken;

      // Get devices — sorted by lastActive desc, so login2's device is first
      const listRes = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${accessToken}`);

      const currentDeviceId = listRes.body.data.devices[0]._id;

      const res = await request(app)
        .delete(`/api/devices/revoke-others?currentDeviceId=${currentDeviceId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.revokedCount).toBeGreaterThanOrEqual(1);

      // login1's refresh token should be revoked (it's the "other" device)
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: login1.body.data.refreshToken });

      expect(refreshRes.status).toBe(401);
    });
  });

  describe('Auth flow creates devices', () => {
    it('should create a device on registration', async () => {
      await createTestRole(DEFAULT_ROLES.USER, ['user:read', 'device:read']);

      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'newdev@example.com', password: 'Password123', name: 'New Dev' });

      expect(regRes.status).toBe(201);

      const devicesRes = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${regRes.body.data.accessToken}`);

      expect(devicesRes.status).toBe(200);
      expect(devicesRes.body.data.devices.length).toBe(1);
    });

    it('should create a new device on each login', async () => {
      const role = await createTestRole(DEFAULT_ROLES.USER, ['user:read', 'device:read']);
      await createTestUser(role._id.toString(), {
        email: 'logins@example.com',
        password: 'Password123',
      });

      // Login twice
      const login1 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'logins@example.com', password: 'Password123' });

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'logins@example.com', password: 'Password123' });

      const devicesRes = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${login1.body.data.accessToken}`);

      expect(devicesRes.body.data.devices.length).toBe(2);
    });

    it('should deactivate device on logout', async () => {
      const { refreshToken } = await loginUser('logout-dev@example.com');

      await request(app).post('/api/auth/logout').send({ refreshToken });

      // Device should no longer appear in active list
      // Need a new token - register fresh to get one
      const count = await Device.countDocuments({ isActive: true });
      expect(count).toBe(0);
    });
  });
});
