import mongoose, { Schema, type Document } from 'mongoose';

export interface IDeadLetterJob extends Document {
  jobName: string;
  data: Record<string, unknown>;
  failReason: string;
  failCount: number;
  failedAt: Date;
  originalJobId: string;
  lastRunAt?: Date;
  retriedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const deadLetterJobSchema = new Schema<IDeadLetterJob>(
  {
    jobName: { type: String, required: true, index: true },
    data: { type: Schema.Types.Mixed, default: {} },
    failReason: { type: String, required: true },
    failCount: { type: Number, required: true },
    failedAt: { type: Date, required: true },
    originalJobId: { type: String, required: true },
    lastRunAt: { type: Date },
    retriedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model<IDeadLetterJob>('DeadLetterJob', deadLetterJobSchema);
