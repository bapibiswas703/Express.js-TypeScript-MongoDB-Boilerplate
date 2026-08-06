import { Router } from 'express';
import { authRoutes } from './auth';
import { userRoutes } from './user';
import { roleRoutes } from './role';
import { categoryRoutes } from './category';
import { productRoutes } from './product';
import { deviceRoutes } from './device';
import { mediaRoutes } from './media';
import { ipBlocklistRoutes } from './ip-blocklist';
import { deadLetterRoutes } from './dead-letter';
import { jobRoutes } from './jobs';
import { webhookRoutes } from './webhook';

const router = Router();

// API v1 routes
const v1 = Router();
v1.use('/auth', authRoutes);
v1.use('/users', userRoutes);
v1.use('/roles', roleRoutes);
v1.use('/categories', categoryRoutes);
v1.use('/products', productRoutes);
v1.use('/devices', deviceRoutes);
v1.use('/media', mediaRoutes);
v1.use('/ip-blocklist', ipBlocklistRoutes);
v1.use('/dead-letter-jobs', deadLetterRoutes);
v1.use('/jobs', jobRoutes);
v1.use('/webhooks', webhookRoutes);

router.use('/v1', v1);

// Backward-compatible: also mount at root /api/*
router.use('/', v1);

export default router;
