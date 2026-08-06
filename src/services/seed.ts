import Role from '../modules/role/role.model';
import { ALL_PERMISSIONS, PERMISSIONS, DEFAULT_ROLES } from '../common/constants/permissions';
import { logger } from '../common/logger';

const SEED_ROLES = [
  {
    name: DEFAULT_ROLES.SUPERADMIN,
    description: 'Full system access',
    permissions: ALL_PERMISSIONS,
  },
  {
    name: DEFAULT_ROLES.ADMIN,
    description: 'Manage users, categories, and products',
    permissions: [
      PERMISSIONS.USER_READ,
      PERMISSIONS.USER_CREATE,
      PERMISSIONS.USER_UPDATE,
      PERMISSIONS.USER_DELETE,
      PERMISSIONS.CATEGORY_READ,
      PERMISSIONS.CATEGORY_CREATE,
      PERMISSIONS.CATEGORY_UPDATE,
      PERMISSIONS.CATEGORY_DELETE,
      PERMISSIONS.PRODUCT_READ,
      PERMISSIONS.PRODUCT_CREATE,
      PERMISSIONS.PRODUCT_UPDATE,
      PERMISSIONS.PRODUCT_DELETE,
      PERMISSIONS.DEVICE_READ,
      PERMISSIONS.DEVICE_UPDATE,
      PERMISSIONS.DEVICE_DELETE,
      PERMISSIONS.MEDIA_READ,
      PERMISSIONS.MEDIA_CREATE,
      PERMISSIONS.MEDIA_DELETE,
      PERMISSIONS.IP_BLOCKLIST_READ,
      PERMISSIONS.IP_BLOCKLIST_CREATE,
      PERMISSIONS.IP_BLOCKLIST_DELETE,
      PERMISSIONS.DLQ_READ,
      PERMISSIONS.DLQ_RETRY,
      PERMISSIONS.DLQ_DELETE,
      PERMISSIONS.JOB_READ,
      PERMISSIONS.JOB_MANAGE,
      PERMISSIONS.WEBHOOK_READ,
      PERMISSIONS.WEBHOOK_CREATE,
      PERMISSIONS.WEBHOOK_UPDATE,
      PERMISSIONS.WEBHOOK_DELETE,
    ],
  },
  {
    name: DEFAULT_ROLES.USER,
    description: 'Read-only access',
    permissions: [
      PERMISSIONS.USER_READ,
      PERMISSIONS.CATEGORY_READ,
      PERMISSIONS.PRODUCT_READ,
      PERMISSIONS.DEVICE_READ,
      PERMISSIONS.DEVICE_UPDATE,
      PERMISSIONS.DEVICE_DELETE,
      PERMISSIONS.MEDIA_READ,
      PERMISSIONS.MEDIA_CREATE,
      PERMISSIONS.WEBHOOK_READ,
      PERMISSIONS.WEBHOOK_CREATE,
      PERMISSIONS.WEBHOOK_UPDATE,
      PERMISSIONS.WEBHOOK_DELETE,
    ],
  },
];

export const seedRoles = async () => {
  for (const roleData of SEED_ROLES) {
    const exists = await Role.findOne({ name: roleData.name });
    if (!exists) {
      await Role.create(roleData);
      logger.info(`Seeded role: ${roleData.name}`);
    }
  }
};
