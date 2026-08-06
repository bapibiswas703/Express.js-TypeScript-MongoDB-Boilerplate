import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: `${config.appName} API`,
      version: '1.0.0',
      description: 'Production-grade REST API with Express, TypeScript, MongoDB, JWT & RBAC',
    },
    servers: [
      {
        url: `/api`,
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            statusCode: { type: 'integer', example: 200 },
            code: { type: 'string', example: 'SUCCESS' },
            message: { type: 'string', example: 'Success' },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            statusCode: { type: 'integer', example: 400 },
            code: { type: 'string', example: 'API_ERROR' },
            message: { type: 'string', example: 'Error message' },
            errors: { type: 'array', items: { type: 'string' } },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            statusCode: { type: 'integer', example: 200 },
            code: { type: 'string', example: 'SUCCESS' },
            message: { type: 'string', example: 'Success' },
            data: {
              type: 'object',
              properties: {
                docs: { type: 'array', items: { type: 'object' } },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer', example: 1 },
                    limit: { type: 'integer', example: 10 },
                    total: { type: 'integer', example: 50 },
                    pages: { type: 'integer', example: 5 },
                  },
                },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        CursorPaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            statusCode: { type: 'integer', example: 200 },
            code: { type: 'string', example: 'SUCCESS' },
            message: { type: 'string', example: 'Success' },
            data: {
              type: 'object',
              properties: {
                docs: { type: 'array', items: { type: 'object' } },
                pagination: {
                  type: 'object',
                  properties: {
                    limit: { type: 'integer', example: 10 },
                    hasMore: { type: 'boolean', example: true },
                    nextCursor: {
                      type: 'string',
                      nullable: true,
                      example: 'NjRkZTdjYTM4ZjFhMmIwMDE3YzVlNzFi',
                    },
                  },
                },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        // Auth
        RegisterDto: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', minLength: 8, example: 'password123' },
            name: { type: 'string', minLength: 2, maxLength: 50, example: 'John Doe' },
          },
        },
        LoginDto: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', example: 'password123' },
          },
        },
        RefreshTokenDto: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', example: 'a1b2c3d4e5f6...' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
            refreshToken: { type: 'string', example: 'a1b2c3d4e5f6...' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                email: { type: 'string', example: 'user@example.com' },
                name: { type: 'string', example: 'John Doe' },
                role: { type: 'string', nullable: true, example: 'user' },
              },
            },
          },
        },
        TokenPair: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
            refreshToken: { type: 'string', example: 'a1b2c3d4e5f6...' },
          },
        },
        // User
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            role: { type: 'string', example: '507f1f77bcf86cd799439012' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        UpdateUserDto: {
          type: 'object',
          minProperties: 1,
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 50, example: 'Jane Doe' },
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
          },
        },
        // Role
        Role: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
            name: { type: 'string', example: 'admin' },
            description: { type: 'string', example: 'Administrator role' },
            permissions: {
              type: 'array',
              items: { type: 'string' },
              example: ['user:read', 'user:create'],
            },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateRoleDto: {
          type: 'object',
          required: ['name', 'permissions'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 50, example: 'editor' },
            description: { type: 'string', maxLength: 200, example: 'Can edit content' },
            permissions: {
              type: 'array',
              items: { type: 'string' },
              example: ['product:read', 'product:update'],
            },
          },
        },
        UpdateRoleDto: {
          type: 'object',
          minProperties: 1,
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 50 },
            description: { type: 'string', maxLength: 200 },
            permissions: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' },
          },
        },
        // Category
        Category: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439013' },
            name: { type: 'string', example: 'Electronics' },
            description: { type: 'string', example: 'Electronic devices' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateCategoryDto: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100, example: 'Electronics' },
            description: { type: 'string', maxLength: 500, example: 'Electronic devices' },
          },
        },
        UpdateCategoryDto: {
          type: 'object',
          minProperties: 1,
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            isActive: { type: 'boolean' },
          },
        },
        // Product
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439014' },
            name: { type: 'string', example: 'iPhone 15' },
            description: { type: 'string', example: 'Latest iPhone' },
            price: { type: 'number', example: 999.99 },
            category: { type: 'string', example: '507f1f77bcf86cd799439013' },
            stock: { type: 'integer', example: 50 },
            image: { type: 'string', example: 'https://example.com/image.jpg' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateProductDto: {
          type: 'object',
          required: ['name', 'price', 'category'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 200, example: 'iPhone 15' },
            description: { type: 'string', maxLength: 2000, example: 'Latest iPhone' },
            price: { type: 'number', minimum: 0, example: 999.99 },
            category: { type: 'string', example: '507f1f77bcf86cd799439013' },
            stock: { type: 'integer', minimum: 0, example: 50 },
            image: { type: 'string', format: 'uri', example: 'https://example.com/image.jpg' },
          },
        },
        UpdateProductDto: {
          type: 'object',
          minProperties: 1,
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 200 },
            description: { type: 'string', maxLength: 2000 },
            price: { type: 'number', minimum: 0 },
            category: { type: 'string' },
            stock: { type: 'integer', minimum: 0 },
            image: { type: 'string', format: 'uri' },
            isActive: { type: 'boolean' },
          },
        },
        // Device
        Device: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439015' },
            user: { type: 'string', example: '507f1f77bcf86cd799439011' },
            deviceName: { type: 'string', example: 'Chrome on Windows' },
            deviceType: { type: 'string', example: 'desktop' },
            browser: { type: 'string', example: 'Chrome 120' },
            os: { type: 'string', example: 'Windows 11' },
            ip: { type: 'string', example: '192.168.1.1' },
            lastActive: { type: 'string', format: 'date-time' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        UpdateDeviceDto: {
          type: 'object',
          required: ['deviceName'],
          properties: {
            deviceName: { type: 'string', minLength: 1, maxLength: 100, example: 'My Laptop' },
          },
        },
        // Media
        Media: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439016' },
            filename: { type: 'string', example: '1722864000000-abc123.jpg' },
            originalName: { type: 'string', example: 'photo.jpg' },
            mimeType: { type: 'string', example: 'image/jpeg' },
            size: { type: 'integer', example: 204800 },
            folder: { type: 'string', example: 'avatars' },
            key: { type: 'string', example: 'avatars/1722864000000-abc123.jpg' },
            url: { type: 'string', example: '/public/uploads/avatars/1722864000000-abc123.jpg' },
            disk: { type: 'string', enum: ['local', 's3'], example: 'local' },
            uploadedBy: { type: 'string', example: '507f1f77bcf86cd799439011' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        // IP Blocklist
        BlockIpDto: {
          type: 'object',
          required: ['ip'],
          properties: {
            ip: {
              type: 'string',
              example: '192.168.1.100',
              description: 'IPv4 address or CIDR range (e.g., 10.0.0.0/24)',
            },
            reason: { type: 'string', maxLength: 500, example: 'Suspicious activity' },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Optional expiry (auto-removed after this date)',
            },
          },
        },
        BlockedIp: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439017' },
            ip: { type: 'string', example: '192.168.1.100' },
            reason: { type: 'string', example: 'Suspicious activity' },
            blockedBy: { type: 'string', example: '507f1f77bcf86cd799439011' },
            expiresAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        // Jobs
        AgendaJob: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439021' },
            name: { type: 'string', example: 'send-email' },
            data: { type: 'object' },
            priority: { type: 'integer', example: 0 },
            nextRunAt: { type: 'string', format: 'date-time', nullable: true },
            lastRunAt: { type: 'string', format: 'date-time', nullable: true },
            lastFinishedAt: { type: 'string', format: 'date-time', nullable: true },
            failCount: { type: 'integer', example: 0 },
            failReason: { type: 'string', nullable: true },
            failedAt: { type: 'string', format: 'date-time', nullable: true },
            lockedAt: { type: 'string', format: 'date-time', nullable: true },
            disabled: { type: 'boolean', example: false },
            progress: { type: 'number', nullable: true },
            repeatInterval: { type: 'string', nullable: true, example: '0 3 * * *' },
          },
        },
        JobStats: {
          type: 'object',
          properties: {
            scheduled: { type: 'integer', example: 5 },
            queued: { type: 'integer', example: 2 },
            running: { type: 'integer', example: 1 },
            completed: { type: 'integer', example: 100 },
            failed: { type: 'integer', example: 3 },
            repeating: { type: 'integer', example: 1 },
            total: { type: 'integer', example: 112 },
          },
        },
        // Webhooks
        CreateWebhookDto: {
          type: 'object',
          required: ['url', 'events'],
          properties: {
            url: { type: 'string', format: 'uri', example: 'https://example.com/webhook' },
            events: {
              type: 'array',
              items: { type: 'string' },
              example: ['user.created', 'product.created'],
            },
            description: { type: 'string', maxLength: 500, example: 'My integration' },
          },
        },
        UpdateWebhookDto: {
          type: 'object',
          minProperties: 1,
          properties: {
            url: { type: 'string', format: 'uri' },
            events: { type: 'array', items: { type: 'string' } },
            description: { type: 'string', maxLength: 500 },
            isActive: { type: 'boolean' },
          },
        },
        Webhook: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439020' },
            url: { type: 'string', example: 'https://example.com/webhook' },
            events: {
              type: 'array',
              items: { type: 'string' },
              example: ['user.created'],
            },
            secret: { type: 'string', example: 'a1b2c3d4...' },
            isActive: { type: 'boolean', example: true },
            description: { type: 'string', example: 'My integration' },
            createdBy: { type: 'string', example: '507f1f77bcf86cd799439011' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        // Dead Letter Queue
        DeadLetterJob: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439018' },
            jobName: { type: 'string', example: 'send-email' },
            data: { type: 'object', example: { to: 'user@example.com' } },
            failReason: { type: 'string', example: 'SMTP connection refused' },
            failCount: { type: 'integer', example: 3 },
            failedAt: { type: 'string', format: 'date-time' },
            originalJobId: { type: 'string', example: '507f1f77bcf86cd799439019' },
            lastRunAt: { type: 'string', format: 'date-time', nullable: true },
            retriedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
