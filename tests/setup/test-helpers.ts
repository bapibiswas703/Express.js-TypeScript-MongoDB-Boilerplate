import jwt from 'jsonwebtoken';
import { config } from '../../src/config';
import User from '../../src/modules/user/user.model';
import Role from '../../src/modules/role/role.model';
import { ALL_PERMISSIONS } from '../../src/common/constants/permissions';

export const generateToken = (userId: string): string =>
  jwt.sign({ id: userId }, config.jwt.secret, { expiresIn: '1h' } as jwt.SignOptions);

export const createTestRole = async (
  name = 'testadmin',
  permissions: string[] = ALL_PERMISSIONS as unknown as string[],
) => {
  return Role.create({ name, permissions, description: 'Test role' });
};

export const createTestUser = async (
  roleId?: string,
  overrides: Partial<{ email: string; name: string; password: string }> = {},
) => {
  const userData = {
    email: overrides.email || 'test@example.com',
    name: overrides.name || 'Test User',
    password: overrides.password || 'Password123',
    ...(roleId && { role: roleId }),
  };
  return User.create(userData);
};

export const createAuthenticatedUser = async () => {
  const role = await createTestRole();
  const user = await createTestUser(role._id.toString());
  const token = generateToken(user._id.toString());
  return { user, role, token };
};
