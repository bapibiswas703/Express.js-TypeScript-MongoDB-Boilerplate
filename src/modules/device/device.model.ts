import type { Document, Types } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

export interface IDevice extends Document {
  user: Types.ObjectId;
  refreshToken: Types.ObjectId;
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
  ip: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    ll?: [number, number];
    timezone?: string;
  };
  lastActive: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshToken: { type: Schema.Types.ObjectId, ref: 'RefreshToken', required: true },
    deviceName: { type: String, default: 'Unknown Device', trim: true },
    deviceType: { type: String, default: 'unknown', trim: true },
    browser: { type: String, default: 'Unknown', trim: true },
    os: { type: String, default: 'Unknown', trim: true },
    ip: { type: String, default: '' },
    location: {
      country: { type: String },
      region: { type: String },
      city: { type: String },
      ll: { type: [Number] },
      timezone: { type: String },
    },
    lastActive: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

DeviceSchema.set('toJSON', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(_doc: any, ret: any) {
    delete ret.refreshToken;
    delete ret.__v;
    return ret;
  },
});

DeviceSchema.index({ user: 1, isActive: 1 });
DeviceSchema.index({ refreshToken: 1 });

export default mongoose.model<IDevice>('Device', DeviceSchema);
