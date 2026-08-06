const mockUploadToS3 = jest.fn();
const mockDeleteFromS3 = jest.fn();
const mockWriteFile = jest.fn();
const mockUnlink = jest.fn();
const mockMkdir = jest.fn();

jest.mock('../../../src/common/services/s3.service', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uploadToS3: (...args: any[]) => mockUploadToS3(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteFromS3: (...args: any[]) => mockDeleteFromS3(...args),
}));

jest.mock('fs/promises', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  writeFile: (...args: any[]) => mockWriteFile(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unlink: (...args: any[]) => mockUnlink(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mkdir: (...args: any[]) => mockMkdir(...args),
}));

// Must set env BEFORE importing the module
process.env.FILESYSTEM_DISK = 'local';
process.env.LOCAL_UPLOAD_DIR = 'public/uploads';

import {
  storageUpload,
  storageDelete,
  getPublicUrl,
} from '../../../src/common/services/storage.service';

describe('StorageService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('storageUpload (local)', () => {
    it('should write file to local filesystem', async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const result = await storageUpload('avatars', 'test.jpg', Buffer.from('data'), 'image/jpeg');

      expect(mockMkdir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
      expect(result.key).toBe('avatars/test.jpg');
      expect(result.disk).toBe('local');
      expect(result.url).toContain('/public/uploads/avatars/test.jpg');
    });
  });

  describe('storageDelete (local)', () => {
    it('should delete file from local filesystem', async () => {
      mockUnlink.mockResolvedValue(undefined);

      await storageDelete('avatars/test.jpg', 'local');

      expect(mockUnlink).toHaveBeenCalled();
    });

    it('should not throw if file does not exist', async () => {
      mockUnlink.mockRejectedValue(new Error('ENOENT'));

      await expect(storageDelete('avatars/missing.jpg', 'local')).resolves.toBeUndefined();
    });
  });

  describe('storageDelete (s3)', () => {
    it('should call deleteFromS3', async () => {
      mockDeleteFromS3.mockResolvedValue(undefined);

      await storageDelete('avatars/test.jpg', 's3');

      expect(mockDeleteFromS3).toHaveBeenCalledWith('avatars/test.jpg');
    });
  });

  describe('getPublicUrl', () => {
    it('should return local URL for local disk', () => {
      const url = getPublicUrl('avatars/test.jpg', 'local');
      expect(url).toBe('/public/uploads/avatars/test.jpg');
    });

    it('should return S3 URL for s3 disk', () => {
      const url = getPublicUrl('avatars/test.jpg', 's3');
      expect(url).toContain('s3.');
      expect(url).toContain('avatars/test.jpg');
    });
  });
});
