import path from 'path';
import fs from 'fs/promises';
import { config } from '../../config';
import { uploadToS3, deleteFromS3 } from './s3.service';

export interface StorageResult {
  key: string;
  url: string;
  disk: 'local' | 's3';
}

const ensureDir = async (dir: string): Promise<void> => {
  await fs.mkdir(dir, { recursive: true });
};

const uploadLocal = async (
  folder: string,
  filename: string,
  buffer: Buffer,
): Promise<StorageResult> => {
  const dir = path.join(config.storage.localUploadDir, folder);
  await ensureDir(dir);
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);
  const key = `${folder}/${filename}`;
  const url = `/${config.storage.localUploadDir}/${key}`;
  return { key, url, disk: 'local' };
};

const uploadS3 = async (
  folder: string,
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<StorageResult> => {
  const key = `${folder}/${filename}`;
  const url = await uploadToS3(key, buffer, contentType);
  return { key, url, disk: 's3' };
};

export const storageUpload = async (
  folder: string,
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<StorageResult> => {
  if (config.storage.disk === 's3') {
    return uploadS3(folder, filename, buffer, contentType);
  }
  return uploadLocal(folder, filename, buffer);
};

export const storageDelete = async (key: string, disk?: 'local' | 's3'): Promise<void> => {
  const targetDisk = disk || config.storage.disk;
  if (targetDisk === 's3') {
    await deleteFromS3(key);
  } else {
    const filePath = path.join(config.storage.localUploadDir, key);
    await fs.unlink(filePath).catch(() => {});
  }
};

export const getPublicUrl = (key: string, disk: 'local' | 's3'): string => {
  if (disk === 's3') {
    return `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`;
  }
  return `/${config.storage.localUploadDir}/${key}`;
};
