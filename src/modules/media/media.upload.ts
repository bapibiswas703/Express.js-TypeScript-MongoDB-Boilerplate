import multer from 'multer';
import { ApiError } from '../../common/utils/ApiError';

const storage = multer.memoryStorage();

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

export const mediaUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cb(new ApiError(400, 'File type not allowed. Allowed: jpeg, png, webp, gif, pdf') as any);
    }
  },
});

export const avatarUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (imageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cb(new ApiError(400, 'Avatar must be jpeg, png, or webp (max 2MB)') as any);
    }
  },
});
