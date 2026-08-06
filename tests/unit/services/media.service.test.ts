const mockMediaRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByKey: jest.fn(),
  findByUser: jest.fn(),
  deleteById: jest.fn(),
  paginate: jest.fn(),
};

const mockStorageUpload = jest.fn();
const mockStorageDelete = jest.fn();

jest.mock('../../../src/modules/media/media.repository', () => ({
  __esModule: true,
  default: mockMediaRepo,
}));
jest.mock('../../../src/common/services/storage.service', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storageUpload: (...args: any[]) => mockStorageUpload(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storageDelete: (...args: any[]) => mockStorageDelete(...args),
}));

import * as mediaService from '../../../src/modules/media/media.service';

const mockFile: Express.Multer.File = {
  fieldname: 'file',
  originalname: 'test-image.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  buffer: Buffer.from('fake-image-data'),
  size: 1024,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stream: null as any,
  destination: '',
  filename: '',
  path: '',
};

describe('MediaService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('uploadFile', () => {
    it('should upload file and create media record', async () => {
      const storageResult = {
        key: 'avatars/123-abc.jpg',
        url: '/public/uploads/avatars/123-abc.jpg',
        disk: 'local' as const,
      };
      mockStorageUpload.mockResolvedValue(storageResult);
      const createdMedia = {
        _id: 'media1',
        filename: '123-abc.jpg',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        folder: 'avatars',
        key: storageResult.key,
        url: storageResult.url,
        disk: 'local',
        uploadedBy: 'user1',
      };
      mockMediaRepo.create.mockResolvedValue(createdMedia);

      const result = await mediaService.uploadFile(mockFile, 'user1', 'avatars');

      expect(mockStorageUpload).toHaveBeenCalledWith(
        'avatars',
        expect.any(String),
        mockFile.buffer,
        'image/jpeg',
      );
      expect(mockMediaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          originalName: 'test-image.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          folder: 'avatars',
        }),
      );
      expect(result).toEqual(createdMedia);
    });

    it('should default folder to general', async () => {
      mockStorageUpload.mockResolvedValue({
        key: 'general/123.jpg',
        url: '/public/uploads/general/123.jpg',
        disk: 'local',
      });
      mockMediaRepo.create.mockResolvedValue({ _id: 'media1' });

      await mediaService.uploadFile(mockFile, 'user1');

      expect(mockStorageUpload).toHaveBeenCalledWith(
        'general',
        expect.any(String),
        expect.any(Buffer),
        'image/jpeg',
      );
    });
  });

  describe('getMediaById', () => {
    it('should return media when found', async () => {
      const media = { _id: 'media1', filename: 'test.jpg' };
      mockMediaRepo.findById.mockResolvedValue(media);

      const result = await mediaService.getMediaById('media1');
      expect(result).toEqual(media);
    });

    it('should throw 404 when not found', async () => {
      mockMediaRepo.findById.mockResolvedValue(null);

      await expect(mediaService.getMediaById('invalid')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Media not found',
      });
    });
  });

  describe('getMediaByUser', () => {
    it('should return paginated media for user', async () => {
      const mockData = {
        docs: [{ _id: 'media1' }],
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      };
      mockMediaRepo.findByUser.mockResolvedValue(mockData);

      const result = await mediaService.getMediaByUser('user1', 1, 10);

      expect(result.docs).toEqual(mockData.docs);
      expect(result.pagination.total).toBe(1);
      expect(mockMediaRepo.findByUser).toHaveBeenCalledWith('user1', 1, 10, undefined, undefined);
    });

    it('should pass folder filter', async () => {
      mockMediaRepo.findByUser.mockResolvedValue({
        docs: [],
        total: 0,
        page: 1,
        limit: 10,
        pages: 0,
      });

      await mediaService.getMediaByUser('user1', 1, 10, 'avatars');

      expect(mockMediaRepo.findByUser).toHaveBeenCalledWith('user1', 1, 10, 'avatars', undefined);
    });
  });

  describe('deleteMedia', () => {
    it('should delete media owned by user', async () => {
      const media = {
        _id: 'media1',
        key: 'avatars/test.jpg',
        disk: 'local',
        uploadedBy: { toString: () => 'user1' },
      };
      mockMediaRepo.findById.mockResolvedValue(media);
      mockStorageDelete.mockResolvedValue(undefined);
      mockMediaRepo.deleteById.mockResolvedValue(media);

      await expect(mediaService.deleteMedia('media1', 'user1')).resolves.toBeUndefined();
      expect(mockStorageDelete).toHaveBeenCalledWith('avatars/test.jpg', 'local');
      expect(mockMediaRepo.deleteById).toHaveBeenCalledWith('media1');
    });

    it('should throw 404 when media not found', async () => {
      mockMediaRepo.findById.mockResolvedValue(null);

      await expect(mediaService.deleteMedia('invalid', 'user1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should throw 403 when not the owner', async () => {
      const media = {
        _id: 'media1',
        key: 'test.jpg',
        disk: 'local',
        uploadedBy: { toString: () => 'other-user' },
      };
      mockMediaRepo.findById.mockResolvedValue(media);

      await expect(mediaService.deleteMedia('media1', 'user1')).rejects.toMatchObject({
        statusCode: 403,
        message: 'Not authorized to delete this media',
      });
    });
  });
});
