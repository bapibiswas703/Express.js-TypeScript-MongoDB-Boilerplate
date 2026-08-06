export const PERMISSIONS = {
  // User
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  // Role
  ROLE_READ: 'role:read',
  ROLE_CREATE: 'role:create',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',

  // Category
  CATEGORY_READ: 'category:read',
  CATEGORY_CREATE: 'category:create',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',

  // Product
  PRODUCT_READ: 'product:read',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',

  // Device
  DEVICE_READ: 'device:read',
  DEVICE_UPDATE: 'device:update',
  DEVICE_DELETE: 'device:delete',

  // Media
  MEDIA_READ: 'media:read',
  MEDIA_CREATE: 'media:create',
  MEDIA_DELETE: 'media:delete',

  // IP Blocklist
  IP_BLOCKLIST_READ: 'ip-blocklist:read',
  IP_BLOCKLIST_CREATE: 'ip-blocklist:create',
  IP_BLOCKLIST_DELETE: 'ip-blocklist:delete',

  // Dead Letter Queue
  DLQ_READ: 'dlq:read',
  DLQ_RETRY: 'dlq:retry',
  DLQ_DELETE: 'dlq:delete',

  // Jobs
  JOB_READ: 'job:read',
  JOB_MANAGE: 'job:manage',

  // Webhooks
  WEBHOOK_READ: 'webhook:read',
  WEBHOOK_CREATE: 'webhook:create',
  WEBHOOK_UPDATE: 'webhook:update',
  WEBHOOK_DELETE: 'webhook:delete',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const DEFAULT_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  USER: 'user',
} as const;
