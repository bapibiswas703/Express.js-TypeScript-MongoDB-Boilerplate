import { Router } from 'express';
import {
  getDeadLetterJobs,
  retryDeadLetterJob,
  deleteDeadLetterJob,
} from './dead-letter.controller';
import { authenticate } from '../../common/middlewares/auth';
import { authorize } from '../../common/middlewares/rbac';
import { validateId } from '../../common/middlewares/validateId';
import { PERMISSIONS } from '../../common/constants/permissions';
import { userRateLimiter } from '../../common/middlewares/user-rate-limit';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Dead Letter Queue
 *   description: Manage permanently failed background jobs
 */

router.use(authenticate);
router.use(userRateLimiter);

/**
 * @swagger
 * /dead-letter-jobs:
 *   get:
 *     tags: [Dead Letter Queue]
 *     summary: List all dead letter jobs (paginated)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (offset pagination)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for cursor-based pagination (use instead of page)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [failedAt, jobName, failCount, createdAt]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Paginated dead letter job list
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - $ref: '#/components/schemas/CursorPaginatedResponse'
 */
router.get('/', authorize(PERMISSIONS.DLQ_READ), getDeadLetterJobs);

/**
 * @swagger
 * /dead-letter-jobs/{id}/retry:
 *   post:
 *     tags: [Dead Letter Queue]
 *     summary: Retry a dead letter job
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dead letter job ID
 *     responses:
 *       200:
 *         description: Job re-queued for retry
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         deadLetterJob:
 *                           $ref: '#/components/schemas/DeadLetterJob'
 *       404:
 *         description: Dead letter job not found
 *       409:
 *         description: Job has already been retried
 */
router.post('/:id/retry', authorize(PERMISSIONS.DLQ_RETRY), validateId, retryDeadLetterJob);

/**
 * @swagger
 * /dead-letter-jobs/{id}:
 *   delete:
 *     tags: [Dead Letter Queue]
 *     summary: Delete a dead letter job
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dead letter job ID
 *     responses:
 *       204:
 *         description: Dead letter job deleted
 *       404:
 *         description: Dead letter job not found
 */
router.delete('/:id', authorize(PERMISSIONS.DLQ_DELETE), validateId, deleteDeadLetterJob);

export default router;
