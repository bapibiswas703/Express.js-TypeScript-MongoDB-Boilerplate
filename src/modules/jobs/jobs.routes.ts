import { Router } from 'express';
import { getJobs, getJob, cancelJob, requeueJob, getJobStats } from './jobs.controller';
import { authenticate } from '../../common/middlewares/auth';
import { authorize } from '../../common/middlewares/rbac';
import { validateId } from '../../common/middlewares/validateId';
import { PERMISSIONS } from '../../common/constants/permissions';
import { userRateLimiter } from '../../common/middlewares/user-rate-limit';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Background job monitoring and management
 */

router.use(authenticate);
router.use(userRateLimiter);

/**
 * @swagger
 * /jobs/stats:
 *   get:
 *     tags: [Jobs]
 *     summary: Get job statistics (counts by status)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Job statistics
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         stats:
 *                           $ref: '#/components/schemas/JobStats'
 */
router.get('/stats', authorize(PERMISSIONS.JOB_READ), getJobStats);

/**
 * @swagger
 * /jobs:
 *   get:
 *     tags: [Jobs]
 *     summary: List background jobs (paginated, filterable)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by job name (e.g., send-email)
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *           enum: [scheduled, queued, running, completed, failed, repeating]
 *         description: Filter by job state
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [nextRunAt, lastRunAt, name, priority]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Paginated job list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/', authorize(PERMISSIONS.JOB_READ), getJobs);

/**
 * @swagger
 * /jobs/{id}:
 *   get:
 *     tags: [Jobs]
 *     summary: Get a job by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         job:
 *                           $ref: '#/components/schemas/AgendaJob'
 *       404:
 *         description: Job not found
 */
router.get('/:id', authorize(PERMISSIONS.JOB_READ), validateId, getJob);

/**
 * @swagger
 * /jobs/{id}/requeue:
 *   post:
 *     tags: [Jobs]
 *     summary: Requeue a job (create a new job with same name and data)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job requeued
 *       404:
 *         description: Job not found
 */
router.post('/:id/requeue', authorize(PERMISSIONS.JOB_MANAGE), validateId, requeueJob);

/**
 * @swagger
 * /jobs/{id}:
 *   delete:
 *     tags: [Jobs]
 *     summary: Cancel and remove a job
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Job cancelled
 *       404:
 *         description: Job not found
 */
router.delete('/:id', authorize(PERMISSIONS.JOB_MANAGE), validateId, cancelJob);

export default router;
