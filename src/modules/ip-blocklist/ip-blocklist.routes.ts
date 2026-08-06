import { Router } from 'express';
import { blockIp, getBlockedIps, unblockIp } from './ip-blocklist.controller';
import { authenticate } from '../../common/middlewares/auth';
import { authorize } from '../../common/middlewares/rbac';
import { validate } from '../../common/middlewares/validate';
import { blockIpSchema } from './ip-blocklist.validation';
import { PERMISSIONS } from '../../common/constants/permissions';
import { userRateLimiter } from '../../common/middlewares/user-rate-limit';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: IP Blocklist
 *   description: IP-based blocking management (admin only)
 */

router.use(authenticate);
router.use(userRateLimiter);

/**
 * @swagger
 * /ip-blocklist:
 *   post:
 *     tags: [IP Blocklist]
 *     summary: Block an IP address or CIDR range
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BlockIpDto'
 *     responses:
 *       201:
 *         description: IP blocked
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         blockedIp:
 *                           $ref: '#/components/schemas/BlockedIp'
 *       409:
 *         description: IP already blocked
 */
router.post('/', authorize(PERMISSIONS.IP_BLOCKLIST_CREATE), validate(blockIpSchema), blockIp);

/**
 * @swagger
 * /ip-blocklist:
 *   get:
 *     tags: [IP Blocklist]
 *     summary: Get all blocked IPs (paginated)
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
 *     responses:
 *       200:
 *         description: Paginated blocked IP list
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - $ref: '#/components/schemas/CursorPaginatedResponse'
 */
router.get('/', authorize(PERMISSIONS.IP_BLOCKLIST_READ), getBlockedIps);

/**
 * @swagger
 * /ip-blocklist/{ip}:
 *   delete:
 *     tags: [IP Blocklist]
 *     summary: Unblock an IP address or CIDR range
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ip
 *         required: true
 *         schema:
 *           type: string
 *         description: IP address or CIDR to unblock
 *     responses:
 *       204:
 *         description: IP unblocked
 *       404:
 *         description: Blocked IP not found
 */
router.delete('/:ip', authorize(PERMISSIONS.IP_BLOCKLIST_DELETE), unblockIp);

export default router;
