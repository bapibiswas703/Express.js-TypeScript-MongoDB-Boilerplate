import path from 'path';
import crypto from 'crypto';
import mediaRepository from './media.repository';
import { storageUpload, storageDelete } from '../../common/services/storage.service';
import { ApiError } from '../../common/utils/ApiError';
import type { IMedia } from './media.model';
import type { PaginationMeta, CursorPaginationMeta } from '../../common/types';

interface PaginatedMedia {
  docs: IMedia[];
  pagination: PaginationMeta;
}

interface CursorPaginatedMedia {
  docs: IMedia[];
  pagination: CursorPaginationMeta;
}

const generateFilename = (originalName: string): string => {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(16).toString('hex');
  return `${Date.now()}-${hash}${ext}`;
};

export const uploadFile = async (
  file: Express.Multer.File,
  userId: string,
  folder: string = 'general',
): Promise<IMedia> => {
  const filename = generateFilename(file.originalname);
  const result = await storageUpload(folder, filename, file.buffer, file.mimetype);

  const media = await mediaRepository.create({
    filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    folder,
    key: result.key,
    url: result.url,
    disk: result.disk,
    uploadedBy: userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return media;
};

export const getMediaById = async (id: string): Promise<IMedia> => {
  const media = await mediaRepository.findById(id);
  if (!media) throw new ApiError(404, 'Media not found');
  return media;
};

export const getMediaByUser = async (
  userId: string,
  page: number,
  limit: number,
  folder?: string,
  sort?: Record<string, 1 | -1>,
): Promise<PaginatedMedia> => {
  const { docs, ...pagination } = await mediaRepository.findByUser(
    userId,
    page,
    limit,
    folder,
    sort,
  );
  return { docs, pagination };
};

export const getMediaByUserCursor = async (
  userId: string,
  cursor: string | undefined,
  limit: number,
  folder?: string,
  sort?: Record<string, 1 | -1>,
): Promise<CursorPaginatedMedia> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { uploadedBy: userId };
  if (folder) filter.folder = folder;
  return mediaRepository.cursorPaginate(filter, cursor, limit, sort);
};

export const deleteMedia = async (id: string, userId: string): Promise<void> => {
  const media = await mediaRepository.findById(id);
  if (!media) throw new ApiError(404, 'Media not found');
  if (media.uploadedBy.toString() !== userId) {
    throw new ApiError(403, 'Not authorized to delete this media');
  }
  await storageDelete(media.key, media.disk);
  await mediaRepository.deleteById(id);
};
