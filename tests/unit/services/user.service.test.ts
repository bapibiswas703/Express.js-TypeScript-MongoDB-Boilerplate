const mockUserRepo = {
  paginate: jest.fn(),
  search: jest.fn(),
  findById: jest.fn(),
  updateById: jest.fn(),
  softDelete: jest.fn(),
};

const mockRefreshTokenUpdateMany = jest.fn();
const mockDeviceRepo = {
  deactivateByUser: jest.fn(),
};
const mockMediaUploadFile = jest.fn();

jest.mock('../../../src/modules/user/user.repository', () => ({
  __esModule: true,
  default: mockUserRepo,
}));
jest.mock('../../../src/modules/auth/refresh-token.model', () => ({
  __esModule: true,
  default: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateMany: (...args: any[]) => mockRefreshTokenUpdateMany(...args),
  },
}));
jest.mock('../../../src/modules/device', () => ({
  deviceRepository: mockDeviceRepo,
}));
jest.mock('../../../src/common/services/storage.service', () => ({
  storageUpload: jest.fn(),
  storageDelete: jest.fn(),
}));
jest.mock('../../../src/modules/media/media.service', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uploadFile: (...args: any[]) => mockMediaUploadFile(...args),
}));

import * as userService from '../../../src/modules/user/user.service';

describe('UserService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('getAllUsers', () => {
    it('should return paginated users', async () => {
      const mockData = {
        docs: [{ _id: '1', name: 'Test' }],
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      };
      mockUserRepo.search.mockResolvedValue(mockData);

      const result = await userService.getAllUsers(1, 10);

      expect(result.docs).toEqual(mockData.docs);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = { _id: '1', name: 'Test' };
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById('1');
      expect(result).toEqual(mockUser);
    });

    it('should throw 404 when not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(userService.getUserById('invalid')).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
    });
  });

  describe('updateUserById', () => {
    it('should return updated user', async () => {
      const updated = { _id: '1', name: 'Updated' };
      mockUserRepo.updateById.mockResolvedValue(updated);

      const result = await userService.updateUserById('1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw 404 when not found', async () => {
      mockUserRepo.updateById.mockResolvedValue(null);

      await expect(userService.updateUserById('1', { name: 'x' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('deleteUserById', () => {
    it('should soft delete user successfully', async () => {
      mockUserRepo.softDelete.mockResolvedValue({ _id: '1' });
      mockRefreshTokenUpdateMany.mockResolvedValue({ modifiedCount: 0 });
      mockDeviceRepo.deactivateByUser.mockResolvedValue(undefined);

      await expect(userService.deleteUserById('1')).resolves.toBeUndefined();
      expect(mockUserRepo.softDelete).toHaveBeenCalledWith('1');
      expect(mockRefreshTokenUpdateMany).toHaveBeenCalled();
      expect(mockDeviceRepo.deactivateByUser).toHaveBeenCalledWith('1');
    });

    it('should throw 404 when not found', async () => {
      mockUserRepo.softDelete.mockResolvedValue(null);

      await expect(userService.deleteUserById('invalid')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('updateAvatar', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'avatar',
      originalname: 'photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('data'),
      size: 1024,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    it('should upload avatar and update user', async () => {
      mockUserRepo.findById.mockResolvedValue({ _id: 'user1' });
      mockMediaUploadFile.mockResolvedValue({
        _id: 'media1',
        url: '/public/uploads/avatars/123.jpg',
      });
      mockUserRepo.updateById.mockResolvedValue({
        _id: 'user1',
        avatar: '/public/uploads/avatars/123.jpg',
      });

      const result = await userService.updateAvatar('user1', mockFile);

      expect(mockMediaUploadFile).toHaveBeenCalledWith(mockFile, 'user1', 'avatars');
      expect(mockUserRepo.updateById).toHaveBeenCalledWith('user1', {
        avatar: '/public/uploads/avatars/123.jpg',
      });
      expect(result.avatar).toBe('/public/uploads/avatars/123.jpg');
    });

    it('should throw 404 when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(userService.updateAvatar('invalid', mockFile)).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
    });
  });
});
