import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../../config';

const s3Client = new S3Client({
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
});

export const uploadToS3 = async (
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`;
};

export const getSignedDownloadUrl = async (key: string, expiresIn = 3600): Promise<string> => {
  return getSignedUrl(s3Client, new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }), {
    expiresIn,
  });
};

export const getSignedUploadUrl = async (
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<string> => {
  return getSignedUrl(
    s3Client,
    new PutObjectCommand({ Bucket: config.s3.bucket, Key: key, ContentType: contentType }),
    { expiresIn },
  );
};

export const deleteFromS3 = async (key: string): Promise<void> => {
  await s3Client.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key }));
};
