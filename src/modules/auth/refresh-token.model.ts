import type { Document, Types } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

export interface IRefreshToken extends Document {
  token: string;
  user: Types.ObjectId;
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  replacedByToken?: string;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    replacedByToken: { type: String },
    userAgent: { type: String },
    ip: { type: String },
  },
  { timestamps: true },
);

RefreshTokenSchema.index({ user: 1, revoked: 1 });

// Auto-delete expired tokens after 7 days past expiry
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export default mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
