import type { Document, Types } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

export interface IMedia extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  folder: string;
  key: string;
  url: string;
  disk: 'local' | 's3';
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    folder: { type: String, required: true, default: 'general' },
    key: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    disk: { type: String, enum: ['local', 's3'], required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);

MediaSchema.set('toJSON', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(_doc: any, ret: any) {
    delete ret.__v;
    return ret;
  },
});

MediaSchema.index({ folder: 1, uploadedBy: 1 });

export default mongoose.model<IMedia>('Media', MediaSchema);
