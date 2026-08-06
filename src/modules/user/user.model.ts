import type { Document, Types } from 'mongoose';
import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  name: string;
  password: string;
  role: Types.ObjectId;
  avatar?: string;
  authProvider: string;
  firebaseUid?: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  failedLoginAttempts: number;
  lockUntil?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
  isLocked(): boolean;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    password: { type: String, select: false },
    role: { type: Schema.Types.ObjectId, ref: 'Role' },
    avatar: { type: String },
    authProvider: { type: String, default: 'local' },
    firebaseUid: { type: String, select: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    twoFactorBackupCodes: { type: [String], select: false },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Exclude soft-deleted users from all queries by default
UserSchema.pre('find', function () {
  if (!this.getFilter().includeSoftDeleted) {
    this.where({ deletedAt: null });
  } else {
    delete this.getFilter().includeSoftDeleted;
  }
});
UserSchema.pre('findOne', function () {
  if (!this.getFilter().includeSoftDeleted) {
    this.where({ deletedAt: null });
  } else {
    delete this.getFilter().includeSoftDeleted;
  }
});
UserSchema.pre('countDocuments', function () {
  if (!this.getFilter().includeSoftDeleted) {
    this.where({ deletedAt: null });
  } else {
    delete this.getFilter().includeSoftDeleted;
  }
});

UserSchema.pre('save', async function () {
  if (this.isNew && this.authProvider === 'local' && !this.password) {
    throw new Error('Password is required for local authentication');
  }
});

UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

UserSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

UserSchema.index({ name: 'text', email: 'text' });
UserSchema.index({ deletedAt: 1, email: 1 });
UserSchema.index({ passwordResetToken: 1 }, { sparse: true });
UserSchema.index({ emailVerificationToken: 1 }, { sparse: true });
UserSchema.index({ firebaseUid: 1 }, { sparse: true });
UserSchema.index({ deletedAt: 1 });

UserSchema.set('toJSON', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(_doc: any, ret: any) {
    delete ret.password;
    delete ret.failedLoginAttempts;
    delete ret.lockUntil;
    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpires;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.firebaseUid;
    delete ret.twoFactorSecret;
    delete ret.twoFactorBackupCodes;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model<IUser>('User', UserSchema);
