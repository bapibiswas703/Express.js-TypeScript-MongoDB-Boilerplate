export interface UploadMediaDto {
  folder?: string;
}

export interface MediaResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  folder: string;
  key: string;
  url: string;
  disk: 'local' | 's3';
  uploadedBy: string;
}
