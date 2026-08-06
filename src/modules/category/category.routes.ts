import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} from './category.controller';
import { authenticate } from '../../common/middlewares/auth';
import { authorize } from '../../common/middlewares/rbac';
import { validate } from '../../common/middlewares/validate';
import { createCategorySchema, updateCategorySchema } from './category.validation';
import { validateId } from '../../common/middlewares/validateId';
import { PERMISSIONS } from '../../common/constants/permissions';
import { userRateLimiter } from '../../common/middlewares/user-rate-limit';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category management (requires authentication & permissions)
 */

router.use(authenticate);
router.use(userRateLimiter);

/**
 * @swagger
 * /categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a new category
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryDto'
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         category:
 *                           $ref: '#/components/schemas/Category'
 *       409:
 *         description: Category already exists
 */
router.post(
  '/',
  authorize(PERMISSIONS.CATEGORY_CREATE),
  validate(createCategorySchema),
  createCategory,
);

/**
 * @swagger
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: Get all categories (paginated)
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
 *         description: Paginated category list (offset or cursor-based)
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - $ref: '#/components/schemas/CursorPaginatedResponse'
 */
router.get('/', authorize(PERMISSIONS.CATEGORY_READ), getCategories);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Get category by ID
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
 *         description: Category data
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         category:
 *                           $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 */
router.get('/:id', validateId(), authorize(PERMISSIONS.CATEGORY_READ), getCategory);

/**
 * @swagger
 * /categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     summary: Update category by ID
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
 *             $ref: '#/components/schemas/UpdateCategoryDto'
 *     responses:
 *       200:
 *         description: Category updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         category:
 *                           $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 */
router.patch(
  '/:id',
  validateId(),
  authorize(PERMISSIONS.CATEGORY_UPDATE),
  validate(updateCategorySchema),
  updateCategory,
);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete category by ID
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
 *         description: Category deleted
 *       404:
 *         description: Category not found
 */
router.delete('/:id', validateId(), authorize(PERMISSIONS.CATEGORY_DELETE), deleteCategory);

export default router;
