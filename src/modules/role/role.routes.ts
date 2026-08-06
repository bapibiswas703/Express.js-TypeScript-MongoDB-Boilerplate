import { Router } from 'express';
import {
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
  getPermissions,
} from './role.controller';
import { authenticate } from '../../common/middlewares/auth';
import { authorize } from '../../common/middlewares/rbac';
import { validate } from '../../common/middlewares/validate';
import { createRoleSchema, updateRoleSchema } from './role.validation';
import { PERMISSIONS } from '../../common/constants/permissions';
import { validateId } from '../../common/middlewares/validateId';
import { userRateLimiter } from '../../common/middlewares/user-rate-limit';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Role & permission management (requires authentication & permissions)
 */

router.use(authenticate);
router.use(userRateLimiter);

/**
 * @swagger
 * /roles/permissions:
 *   get:
 *     tags: [Roles]
 *     summary: Get all available permissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all permissions
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ['user:read', 'user:create', 'product:read']
 */
router.get('/permissions', authorize(PERMISSIONS.ROLE_READ), getPermissions);

/**
 * @swagger
 * /roles:
 *   post:
 *     tags: [Roles]
 *     summary: Create a new role
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRoleDto'
 *     responses:
 *       201:
 *         description: Role created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         role:
 *                           $ref: '#/components/schemas/Role'
 *       409:
 *         description: Role already exists
 */
router.post('/', authorize(PERMISSIONS.ROLE_CREATE), validate(createRoleSchema), createRole);

/**
 * @swagger
 * /roles:
 *   get:
 *     tags: [Roles]
 *     summary: Get all roles (paginated)
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
 *         description: Paginated role list (offset or cursor-based)
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - $ref: '#/components/schemas/CursorPaginatedResponse'
 */
router.get('/', authorize(PERMISSIONS.ROLE_READ), getRoles);

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     tags: [Roles]
 *     summary: Get role by ID
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
 *         description: Role data
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         role:
 *                           $ref: '#/components/schemas/Role'
 *       404:
 *         description: Role not found
 */
router.get('/:id', validateId(), authorize(PERMISSIONS.ROLE_READ), getRole);

/**
 * @swagger
 * /roles/{id}:
 *   patch:
 *     tags: [Roles]
 *     summary: Update role by ID
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
 *             $ref: '#/components/schemas/UpdateRoleDto'
 *     responses:
 *       200:
 *         description: Role updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         role:
 *                           $ref: '#/components/schemas/Role'
 *       404:
 *         description: Role not found
 */
router.patch(
  '/:id',
  validateId(),
  authorize(PERMISSIONS.ROLE_UPDATE),
  validate(updateRoleSchema),
  updateRole,
);

/**
 * @swagger
 * /roles/{id}:
 *   delete:
 *     tags: [Roles]
 *     summary: Delete role by ID
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
 *         description: Role deleted
 *       404:
 *         description: Role not found
 */
router.delete('/:id', validateId(), authorize(PERMISSIONS.ROLE_DELETE), deleteRole);

export default router;
