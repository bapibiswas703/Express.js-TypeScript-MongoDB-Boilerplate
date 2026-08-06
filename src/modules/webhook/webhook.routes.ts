import { Router } from 'express';
import {
  createWebhook,
  getWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  getAvailableEvents,
} from './webhook.controller';
import { authenticate } from '../../common/middlewares/auth';
import { authorize } from '../../common/middlewares/rbac';
import { validate } from '../../common/middlewares/validate';
import { validateId } from '../../common/middlewares/validateId';
import { createWebhookSchema, updateWebhookSchema } from './webhook.validation';
import { PERMISSIONS } from '../../common/constants/permissions';
import { userRateLimiter } from '../../common/middlewares/user-rate-limit';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Webhooks
 *   description: Outgoing webhook subscription management
 */

router.use(authenticate);
router.use(userRateLimiter);

/**
 * @swagger
 * /webhooks/events:
 *   get:
 *     tags: [Webhooks]
 *     summary: List all available webhook events
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available events
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         events:
 *                           type: array
 *                           items:
 *                             type: string
 */
router.get('/events', authorize(PERMISSIONS.WEBHOOK_READ), getAvailableEvents);

/**
 * @swagger
 * /webhooks:
 *   post:
 *     tags: [Webhooks]
 *     summary: Create a webhook subscription
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateWebhookDto'
 *     responses:
 *       201:
 *         description: Webhook created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         webhook:
 *                           $ref: '#/components/schemas/Webhook'
 */
router.post(
  '/',
  authorize(PERMISSIONS.WEBHOOK_CREATE),
  validate(createWebhookSchema),
  createWebhook,
);

/**
 * @swagger
 * /webhooks:
 *   get:
 *     tags: [Webhooks]
 *     summary: List own webhook subscriptions (paginated)
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
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for cursor-based pagination
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, url]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Paginated webhook list
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - $ref: '#/components/schemas/CursorPaginatedResponse'
 */
router.get('/', authorize(PERMISSIONS.WEBHOOK_READ), getWebhooks);

/**
 * @swagger
 * /webhooks/{id}:
 *   get:
 *     tags: [Webhooks]
 *     summary: Get a webhook by ID
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
 *         description: Webhook details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         webhook:
 *                           $ref: '#/components/schemas/Webhook'
 *       404:
 *         description: Webhook not found
 */
router.get('/:id', authorize(PERMISSIONS.WEBHOOK_READ), validateId, getWebhook);

/**
 * @swagger
 * /webhooks/{id}:
 *   patch:
 *     tags: [Webhooks]
 *     summary: Update a webhook
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateWebhookDto'
 *     responses:
 *       200:
 *         description: Webhook updated
 *       404:
 *         description: Webhook not found
 */
router.patch(
  '/:id',
  authorize(PERMISSIONS.WEBHOOK_UPDATE),
  validateId,
  validate(updateWebhookSchema),
  updateWebhook,
);

/**
 * @swagger
 * /webhooks/{id}:
 *   delete:
 *     tags: [Webhooks]
 *     summary: Delete a webhook
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
 *         description: Webhook deleted
 *       404:
 *         description: Webhook not found
 */
router.delete('/:id', authorize(PERMISSIONS.WEBHOOK_DELETE), validateId, deleteWebhook);

export default router;
