const mockDeviceRepo = {
  findByUser: jest.fn(),
  findById: jest.fn(),
  updateById: jest.fn(),
  findByRefreshToken: jest.fn(),
  deactivateByUser: jest.fn(),
  deactivateByRefreshToken: jest.fn(),
  deactivateByIds: jest.fn(),
};

const mockRefreshTokenUpdateOne = jest.fn();
const mockRefreshTokenUpdateMany = jest.fn();

jest.mock('../../../src/modules/device/device.repository', () => ({
  __esModule: true,
  default: mockDeviceRepo,
}));
jest.mock('../../../src/modules/auth/refresh-token.model', () => ({
  __esModule: true,
  default: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateOne: (...args: any[]) => mockRefreshTokenUpdateOne(...args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateMany: (...args: any[]) => mockRefreshTokenUpdateMany(...args),
  },
}));

import * as deviceService from '../../../src/modules/device/device.service';

describe('DeviceService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('getUserDevices', () => {
    it('should return active devices for a user', async () => {
      const devices = [
        { _id: 'd1', deviceName: 'Chrome on Windows', isActive: true },
        { _id: 'd2', deviceName: 'Safari on Mac', isActive: true },
      ];
      mockDeviceRepo.findByUser.mockResolvedValue(devices);

      const result = await deviceService.getUserDevices('user-id');

      expect(result).toEqual(devices);
      expect(mockDeviceRepo.findByUser).toHaveBeenCalledWith('user-id');
    });
  });

  describe('getDeviceById', () => {
    it('should return device when found and owned by user', async () => {
      const device = { _id: 'd1', user: { toString: () => 'user-id' }, deviceName: 'Chrome' };
      mockDeviceRepo.findById.mockResolvedValue(device);

      const result = await deviceService.getDeviceById('user-id', 'd1');
      expect(result).toEqual(device);
    });

    it('should throw 404 when device not found', async () => {
      mockDeviceRepo.findById.mockResolvedValue(null);

      await expect(deviceService.getDeviceById('user-id', 'd1')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Device not found',
      });
    });

    it('should throw 404 when device belongs to another user', async () => {
      mockDeviceRepo.findById.mockResolvedValue({
        _id: 'd1',
        user: { toString: () => 'other-user' },
      });

      await expect(deviceService.getDeviceById('user-id', 'd1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('updateDevice', () => {
    it('should update device name', async () => {
      mockDeviceRepo.findById.mockResolvedValue({
        _id: 'd1',
        user: { toString: () => 'user-id' },
      });
      mockDeviceRepo.updateById.mockResolvedValue({
        _id: 'd1',
        deviceName: 'My Laptop',
      });

      const result = await deviceService.updateDevice('user-id', 'd1', {
        deviceName: 'My Laptop',
      });

      expect(result.deviceName).toBe('My Laptop');
      expect(mockDeviceRepo.updateById).toHaveBeenCalledWith('d1', { deviceName: 'My Laptop' });
    });

    it('should throw 404 when device not found', async () => {
      mockDeviceRepo.findById.mockResolvedValue(null);

      await expect(
        deviceService.updateDevice('user-id', 'd1', { deviceName: 'X' }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('revokeDevice', () => {
    it('should revoke refresh token and deactivate device', async () => {
      mockDeviceRepo.findById.mockResolvedValue({
        _id: 'd1',
        user: { toString: () => 'user-id' },
        refreshToken: 'rt-id',
      });
      mockRefreshTokenUpdateOne.mockResolvedValue({});
      mockDeviceRepo.updateById.mockResolvedValue({});

      await deviceService.revokeDevice('user-id', 'd1');

      expect(mockRefreshTokenUpdateOne).toHaveBeenCalledWith(
        { _id: 'rt-id' },
        expect.objectContaining({ revoked: true }),
      );
      expect(mockDeviceRepo.updateById).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should throw 404 when device not found', async () => {
      mockDeviceRepo.findById.mockResolvedValue(null);

      await expect(deviceService.revokeDevice('user-id', 'd1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('revokeAllOtherDevices', () => {
    it('should revoke all other devices except current', async () => {
      mockDeviceRepo.findByUser.mockResolvedValue([
        { _id: { toString: () => 'current' }, refreshToken: 'rt1' },
        { _id: { toString: () => 'other1' }, refreshToken: 'rt2' },
        { _id: { toString: () => 'other2' }, refreshToken: 'rt3' },
      ]);
      mockRefreshTokenUpdateMany.mockResolvedValue({});
      mockDeviceRepo.deactivateByIds.mockResolvedValue(undefined);

      const count = await deviceService.revokeAllOtherDevices('user-id', 'current');

      expect(count).toBe(2);
      expect(mockRefreshTokenUpdateMany).toHaveBeenCalledWith(
        { _id: { $in: ['rt2', 'rt3'] } },
        expect.objectContaining({ revoked: true }),
      );
      expect(mockDeviceRepo.deactivateByIds).toHaveBeenCalled();
    });

    it('should return 0 when no other devices', async () => {
      mockDeviceRepo.findByUser.mockResolvedValue([
        { _id: { toString: () => 'current' }, refreshToken: 'rt1' },
      ]);

      const count = await deviceService.revokeAllOtherDevices('user-id', 'current');
      expect(count).toBe(0);
    });
  });
});
