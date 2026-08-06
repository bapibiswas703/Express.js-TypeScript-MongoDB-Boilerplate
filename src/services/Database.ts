import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../common/logger';

const connectDatabase = async () => {
  await mongoose.connect(config.mongoUri);
  logger.info('MongoDB connected');
};

export default connectDatabase;
