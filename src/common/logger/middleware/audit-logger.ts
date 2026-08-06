import type { Request } from 'express';
import { logger } from '../logger';

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  ROLE_CREATE = 'ROLE_CREATE',
  ROLE_UPDATE = 'ROLE_UPDATE',
  ROLE_DELETE = 'ROLE_DELETE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  CATEGORY_CREATE = 'CATEGORY_CREATE',
  CATEGORY_UPDATE = 'CATEGORY_UPDATE',
  CATEGORY_DELETE = 'CATEGORY_DELETE',
  PRODUCT_CREATE = 'PRODUCT_CREATE',
  PRODUCT_UPDATE = 'PRODUCT_UPDATE',
  PRODUCT_DELETE = 'PRODUCT_DELETE',
  MEDIA_UPLOAD = 'MEDIA_UPLOAD',
  MEDIA_DELETE = 'MEDIA_DELETE',
  IP_BLOCK = 'IP_BLOCK',
  IP_UNBLOCK = 'IP_UNBLOCK',
  DLQ_RETRY = 'DLQ_RETRY',
  DLQ_DELETE = 'DLQ_DELETE',
  JOB_CANCEL = 'JOB_CANCEL',
  JOB_REQUEUE = 'JOB_REQUEUE',
  WEBHOOK_CREATE = 'WEBHOOK_CREATE',
  WEBHOOK_UPDATE = 'WEBHOOK_UPDATE',
  WEBHOOK_DELETE = 'WEBHOOK_DELETE',
  SETTINGS_CHANGE = 'SETTINGS_CHANGE',
  EXPORT_REPORT = 'EXPORT_REPORT',
}

export interface AuditEvent {
  action: AuditAction;
  module: string;
  description: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
}

const auditChild = logger.child({ type: 'audit' });

export const auditLogger = {
  log: (req: Request, event: AuditEvent): void => {
    auditChild.info(
      {
        audit: {
          action: event.action,
          module: event.module,
          description: event.description,
          targetId: event.targetId,
          targetType: event.targetType,
          metadata: event.metadata,
        },
        userId: req.userId,
        requestId: req.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        method: req.method,
        url: req.originalUrl,
      },
      `AUDIT: ${event.action} - ${event.description}`,
    );
  },

  logSystem: (event: AuditEvent): void => {
    auditChild.info(
      {
        audit: {
          action: event.action,
          module: event.module,
          description: event.description,
          targetId: event.targetId,
          targetType: event.targetType,
          metadata: event.metadata,
        },
      },
      `AUDIT: ${event.action} - ${event.description}`,
    );
  },
};
