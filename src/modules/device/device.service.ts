import type { UpdateQuery } from 'mongoose';
import deviceRepository from './device.repository';
import RefreshToken from '../auth/refresh-token.model';
import type { UpdateDeviceDto } from './device.types';
import type { IDevice } from './device.model';
import { ApiError } from '../../common/utils/ApiError';

export const getUserDevices = async (userId: string): Promise<IDevice[]> => {
  return deviceRepository.findByUser(userId);
};

export const getDeviceById = async (userId: string, deviceId: string): Promise<IDevice> => {
  const device = await deviceRepository.findById(deviceId);
  if (!device || device.user.toString() !== userId) {
    throw new ApiError(404, 'Device not found');
  }
  return device;
};

export const updateDevice = async (
  userId: string,
  deviceId: string,
  dto: UpdateDeviceDto,
): Promise<IDevice> => {
  const device = await deviceRepository.findById(deviceId);
  if (!device || device.user.toString() !== userId) {
    throw new ApiError(404, 'Device not found');
  }
  const updated = await deviceRepository.updateById(deviceId, dto);
  if (!updated) throw new ApiError(404, 'Device not found');
  return updated;
};

export const revokeDevice = async (userId: string, deviceId: string): Promise<void> => {
  const device = await deviceRepository.findById(deviceId);
  if (!device || device.user.toString() !== userId) {
    throw new ApiError(404, 'Device not found');
  }

  // Revoke the associated refresh token
  await RefreshToken.updateOne(
    { _id: device.refreshToken },
    { revoked: true, revokedAt: new Date() },
  );

  // Deactivate the device
  await deviceRepository.updateById(deviceId, { isActive: false } as UpdateQuery<IDevice>);
};

export const revokeAllOtherDevices = async (
  userId: string,
  currentDeviceId: string,
): Promise<number> => {
  const devices = await deviceRepository.findByUser(userId);
  const otherDevices = devices.filter((d) => d._id.toString() !== currentDeviceId);

  if (otherDevices.length === 0) return 0;

  // Revoke all refresh tokens for other devices
  const refreshTokenIds = otherDevices.map((d) => d.refreshToken);
  await RefreshToken.updateMany(
    { _id: { $in: refreshTokenIds } },
    { revoked: true, revokedAt: new Date() },
  );

  // Deactivate all other devices
  const deviceIds = otherDevices.map((d) => d._id.toString());
  await deviceRepository.deactivateByIds(deviceIds);

  return otherDevices.length;
};
