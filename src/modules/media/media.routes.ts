import { Router } from 'express';
import { uploadMedia, getMedia, getMyMedia, deleteMediaById } from './media.controller';
import { authenticate } from '../../common/middlewares/auth';
import { authorize } from '../../common/middlewares/rbac';
import { validateId } from '../../common/middlewares/validateId';
import { PERMISSIONS } from '../../common/constants/permissions';
import { mediaUpload } from './media.upload';
import { userRateLimiter } from '../../common/middlewares/user-rate-limit';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Media
 *   description: File upload and media management
 */

router.use(authenticate);
router.use(userRateLimiter);

/**
 * @swagger
 * /media/upload:
 *   post:
 *     tags: [Media]
 *     summary: Upload a file
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (max 5MB, jpeg/png/webp/pdf)
 *               folder:
 *                 type: string
 *                 description: Subfolder name (alphanumeric, hyphens, underscores)
 *                 example: avatars
 *     responses:
 *       201:
 *         description: File uploaded
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         media:
 *                           $ref: '#/components/schemas/Media'
 *       400:
 *         description: No file or invalid file type
 */
router.post(
  '/upload',
  authorize(PERMISSIONS.MEDIA_CREATE),
  mediaUpload.single('file'),
  uploadMedia,
);

/**
 * @swagger
 * /media/my:
 *   get:
 *     tags: [Media]
 *     summary: Get my uploaded files (paginated)
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
 *         name: folder
 *         schema:
 *           type: string
 *         description: Filter by folder name
 *     responses:
 *       200:
 *         description: Paginated media list (offset or cursor-based)
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - $ref: '#/components/schemas/CursorPaginatedResponse'
 */
router.get('/my', authorize(PERMISSIONS.MEDIA_READ), getMyMedia);

/**
 * @swagger
 * /media/{id}:
 *   get:
 *     tags: [Media]
 *     summary: Get media by ID
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
 *         description: Media data
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         media:
 *                           $ref: '#/components/schemas/Media'
 *       404:
 *         description: Media not found
 */
router.get('/:id', validateId(), authorize(PERMISSIONS.MEDIA_READ), getMedia);

/**
 * @swagger
 * /media/{id}:
 *   delete:
 *     tags: [Media]
 *     summary: Delete media by ID
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
 *         description: Media deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Media not found
 */
router.delete('/:id', validateId(), authorize(PERMISSIONS.MEDIA_DELETE), deleteMediaById);

export default router;
