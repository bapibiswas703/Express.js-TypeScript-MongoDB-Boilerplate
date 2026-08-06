import mongoose, { Schema, type Document } from 'mongoose';

export interface IBlockedIp extends Document {
  ip: string;
  reason?: string;
  blockedBy?: mongoose.Types.ObjectId;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const blockedIpSchema = new Schema<IBlockedIp>(
  {
    ip: { type: String, required: true, unique: true, trim: true },
    reason: { type: String, trim: true, maxlength: 500 },
    blockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// TTL index: auto-remove expired entries
blockedIpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

export default mongoose.model<IBlockedIp>('BlockedIp', blockedIpSchema);
