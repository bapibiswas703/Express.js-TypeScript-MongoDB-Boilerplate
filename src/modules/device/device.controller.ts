import type { Request, Response, NextFunction } from 'express';
import * as deviceService from './device.service';
import type { UpdateDeviceDto } from './device.types';
import { sendSuccess, sendNoContent } from '../../common/utils/ApiResponse';
import { auditLogger, AuditAction } from '../../common/logger';

export const getDevices = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const devices = await deviceService.getUserDevices(req.userId!);
    sendSuccess(res, { devices });
  } catch (err) {
    next(err);
  }
};

export const getDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const device = await deviceService.getDeviceById(req.userId!, req.params.id as string);
    sendSuccess(res, { device });
  } catch (err) {
    next(err);
  }
};

export const updateDevice = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: UpdateDeviceDto = req.body;
    const device = await deviceService.updateDevice(req.userId!, req.params.id as string, dto);
    auditLogger.log(req, {
      action: AuditAction.SETTINGS_CHANGE,
      module: 'device',
      description: `Device renamed: ${req.params.id}`,
      targetId: req.params.id as string,
      targetType: 'Device',
    });
    sendSuccess(res, { device }, 'Device updated');
  } catch (err) {
    next(err);
  }
};

export const revokeDevice = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await deviceService.revokeDevice(req.userId!, req.params.id as string);
    auditLogger.log(req, {
      action: AuditAction.LOGOUT,
      module: 'device',
      description: `Device revoked: ${req.params.id}`,
      targetId: req.params.id as string,
      targetType: 'Device',
    });
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};

export const revokeAllOtherDevices = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const currentDeviceId = req.query.currentDeviceId as string;
    const count = await deviceService.revokeAllOtherDevices(req.userId!, currentDeviceId || '');
    auditLogger.log(req, {
      action: AuditAction.LOGOUT,
      module: 'device',
      description: `Revoked ${count} other devices`,
    });
    sendSuccess(res, { revokedCount: count }, 'Other devices revoked');
  } catch (err) {
    next(err);
  }
};
