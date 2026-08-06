import { ALL_PERMISSIONS } from '../../../src/common/constants/permissions';

const mockRoleRepo = {
  findByName: jest.fn(),
  create: jest.fn(),
  paginate: jest.fn(),
  findById: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
};

jest.mock('../../../src/modules/role/role.repository', () => ({
  __esModule: true,
  default: mockRoleRepo,
}));

import * as roleService from '../../../src/modules/role/role.service';

describe('RoleService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('createRole', () => {
    const dto = {
      name: 'editor',
      permissions: ['product:read' as const, 'product:update' as const],
    };

    it('should create a new role', async () => {
      mockRoleRepo.findByName.mockResolvedValue(null);
      mockRoleRepo.create.mockResolvedValue({ _id: '1', ...dto });

      const result = await roleService.createRole(dto);
      expect(result.name).toBe('editor');
    });

    it('should throw 409 if role already exists', async () => {
      mockRoleRepo.findByName.mockResolvedValue({ name: 'editor' });

      await expect(roleService.createRole(dto)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Role already exists',
      });
    });
  });

  describe('getAllRoles', () => {
    it('should return paginated roles', async () => {
      mockRoleRepo.paginate.mockResolvedValue({
        docs: [{ _id: '1', name: 'admin' }],
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      });

      const result = await roleService.getAllRoles(1, 10);
      expect(result.docs).toHaveLength(1);
    });
  });

  describe('getRoleById', () => {
    it('should return role when found', async () => {
      mockRoleRepo.findById.mockResolvedValue({ _id: '1', name: 'admin' });
      const result = await roleService.getRoleById('1');
      expect(result.name).toBe('admin');
    });

    it('should throw 404 when not found', async () => {
      mockRoleRepo.findById.mockResolvedValue(null);
      await expect(roleService.getRoleById('x')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('updateRoleById', () => {
    it('should return updated role', async () => {
      mockRoleRepo.updateById.mockResolvedValue({ _id: '1', name: 'updated' });
      const result = await roleService.updateRoleById('1', { name: 'updated' });
      expect(result.name).toBe('updated');
    });

    it('should throw 404 when not found', async () => {
      mockRoleRepo.updateById.mockResolvedValue(null);
      await expect(roleService.updateRoleById('1', { name: 'x' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('deleteRoleById', () => {
    it('should delete successfully', async () => {
      mockRoleRepo.deleteById.mockResolvedValue({ _id: '1' });
      await expect(roleService.deleteRoleById('1')).resolves.toBeUndefined();
    });

    it('should throw 404 when not found', async () => {
      mockRoleRepo.deleteById.mockResolvedValue(null);
      await expect(roleService.deleteRoleById('x')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getAllPermissions', () => {
    it('should return all permissions', () => {
      const result = roleService.getAllPermissions();
      expect(result).toEqual(ALL_PERMISSIONS);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
