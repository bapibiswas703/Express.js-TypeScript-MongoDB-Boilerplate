import { Router } from 'express';
import {
  getDevices,
  getDevice,
  updateDevice,
  revokeDevice,
  revokeAllOtherDevices,
} from './device.controller';
import { authenticate } from '../../common/middlewares/auth';
import { validate } from '../../common/middlewares/validate';
import { updateDeviceSchema } from './device.validation';
import { validateId } from '../../common/middlewares/validateId';
import { userRateLimiter } from '../../common/middlewares/user-rate-limit';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: User device / session management (requires authentication)
 */

router.use(authenticate);
router.use(userRateLimiter);

/**
 * @swagger
 * /devices:
 *   get:
 *     tags: [Devices]
 *     summary: List all active devices for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active devices
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         devices:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Device'
 *       401:
 *         description: Unauthorized
 */
router.get('/', getDevices);

/**
 * @swagger
 * /devices/revoke-others:
 *   delete:
 *     tags: [Devices]
 *     summary: Revoke all other devices except the current one
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: currentDeviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the current device to keep active
 *     responses:
 *       200:
 *         description: Other devices revoked
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         revokedCount:
 *                           type: integer
 *                           example: 2
 *       401:
 *         description: Unauthorized
 */
router.delete('/revoke-others', revokeAllOtherDevices);

/**
 * @swagger
 * /devices/{id}:
 *   get:
 *     tags: [Devices]
 *     summary: Get device by ID
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
 *         description: Device data
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         device:
 *                           $ref: '#/components/schemas/Device'
 *       404:
 *         description: Device not found
 */
router.get('/:id', validateId(), getDevice);

/**
 * @swagger
 * /devices/{id}:
 *   patch:
 *     tags: [Devices]
 *     summary: Rename a device
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
 *             $ref: '#/components/schemas/UpdateDeviceDto'
 *     responses:
 *       200:
 *         description: Device updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         device:
 *                           $ref: '#/components/schemas/Device'
 *       404:
 *         description: Device not found
 */
router.patch('/:id', validateId(), validate(updateDeviceSchema), updateDevice);

/**
 * @swagger
 * /devices/{id}:
 *   delete:
 *     tags: [Devices]
 *     summary: Revoke a device (logout session and deactivate)
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
 *         description: Device revoked
 *       404:
 *         description: Device not found
 */
router.delete('/:id', validateId(), revokeDevice);

export default router;
