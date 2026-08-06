# Express TypeScript Production-Ready REST API Boilerplate

Production-grade REST API boilerplate using modular monolith architecture — Express.js 5 + TypeScript 6 + MongoDB (Mongoose 9) + JWT + RBAC + Pino Logging + Grafana/Loki Monitoring.

## Tech Stack

| Category           | Technology                               |
| ------------------ | ---------------------------------------- |
| Runtime            | Node.js 18+                              |
| Framework          | Express.js 5                             |
| Language           | TypeScript 6                             |
| Database           | MongoDB + Mongoose 9                     |
| Authentication     | JWT (jsonwebtoken + bcryptjs)            |
| Authorization      | Role-Based Access Control (RBAC)         |
| Validation         | Joi                                      |
| Logging            | Pino + pino-http + pino-roll             |
| API Docs           | Swagger UI + swagger-jsdoc (OpenAPI 3.0) |
| File Upload        | Multer                                   |
| Background Jobs    | Agenda (MongoDB-backed)                  |
| Email              | Nodemailer (SMTP)                        |
| Push Notifications | Firebase Admin (FCM)                     |
| File Storage       | AWS S3 (@aws-sdk/client-s3)              |
| Security           | Helmet, CORS, Rate Limiting              |
| Monitoring         | Grafana + Loki + Promtail                |
| Testing            | Jest + Supertest + mongodb-memory-server |
| Containerization   | Docker + Docker Compose                  |

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)

### Installation

```bash
git clone https://github.com/bapibiswas703/express-ts-ejs-boilerplate.git
cd express-ts-ejs-boilerplate
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

```env
# App
PORT=8000
APP_NAME=NodeJS Backend
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/demo

# JWT
JWT_SECRET=change-this-to-a-secure-random-string
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=info
LOG_DIR=logs
SERVICE_NAME=express-api
LOG_RETENTION_DAYS=30

# Grafana + Loki (Docker only)
ENABLE_LOKI=false
LOKI_URL=http://loki:3100/loki/api/v1/push

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@example.com

# Firebase (FCM)
FCM_PROJECT_ID=your-firebase-project-id
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
FCM_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
```

### Run

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

The API starts on `http://localhost:8000`.

## Project Structure

```
src/
├── app.ts                              # Entry point + graceful shutdown
├── config/
│   ├── index.ts                        # Environment-based configuration
│   └── swagger.ts                      # OpenAPI 3.0 schema definitions
├── services/                           # Infrastructure services
│   ├── Database.ts                     # MongoDB connection
│   ├── ExpressApp.ts                   # Express middleware stack
│   └── seed.ts                         # Default role seeding
├── common/                             # Shared across all modules
│   ├── constants/permissions.ts        # RBAC permissions & role definitions
│   ├── logger/                         # Pino logging system
│   │   ├── logger.ts                   # Core logger (multistream, rotation, redaction)
│   │   ├── sanitizer.ts               # Sensitive data masking
│   │   ├── index.ts                    # Public exports
│   │   └── middleware/
│   │       ├── request-id.ts           # UUID request correlation
│   │       ├── http-logger.ts          # Request/response auto-logging
│   │       ├── error-logger.ts         # Categorized error logging
│   │       └── audit-logger.ts         # Business event audit trail
│   ├── middlewares/                    # Express middleware
│   │   ├── auth.ts                     # JWT authentication
│   │   ├── rbac.ts                     # Permission & role authorization
│   │   ├── error.ts                    # Global error handler
│   │   ├── validate.ts                 # Joi request validation
│   │   └── upload.ts                   # Multer file upload
│   ├── repositories/base.repository.ts # Generic CRUD repository
│   ├── queues/                         # Agenda background jobs
│   │   ├── queue.service.ts            # Agenda instance + lifecycle
│   │   ├── email.queue.ts             # Email job workers
│   │   └── notification.queue.ts      # FCM push notification workers
│   ├── services/                       # External service integrations
│   │   ├── email.service.ts            # Nodemailer SMTP
│   │   ├── notification.service.ts     # Firebase Admin FCM
│   │   └── s3.service.ts              # AWS S3 operations
│   ├── types/index.ts                  # Shared TypeScript interfaces
│   └── utils/
│       ├── ApiError.ts                 # Custom error class with status code
│       ├── ApiResponse.ts             # Response helpers (sendSuccess, sendCreated, etc.)
│       ├── pagination.ts              # Query pagination + sorting
│       └── template.ts               # EJS template renderer
└── modules/                            # Feature modules
    ├── index.ts                        # Route aggregator
    ├── auth/                           # Authentication module
    │   ├── auth.model.ts / auth.types.ts / auth.validation.ts
    │   ├── auth.routes.ts              # POST /register, POST /login, GET /me
    │   ├── auth.controller.ts          # Thin HTTP handler
    │   ├── auth.service.ts             # Business logic
    │   └── index.ts                    # Public API exports
    ├── user/                           # User management module
    ├── role/                           # Role & permissions module
    ├── category/                       # Category module
    └── product/                        # Product module (with filtering)

tests/
├── setup/
│   ├── jest.setup.ts                   # Global mocks (Agenda)
│   ├── test-app.ts                     # Express app factory for tests
│   ├── test-db.ts                      # MongoMemoryServer helpers
│   └── test-helpers.ts                # Auth token + user factories
├── unit/
│   ├── utils/                          # ApiResponse, ApiError, pagination tests
│   ├── services/                       # Service layer tests (mocked repos)
│   └── logger/                         # Logger, sanitizer, middleware tests
└── integration/
    ├── health.test.ts                  # Health endpoint
    ├── auth/auth.test.ts              # Auth API tests
    ├── user/user.test.ts              # User CRUD tests
    ├── role/role.test.ts              # Role CRUD tests
    ├── category/category.test.ts      # Category CRUD tests
    └── product/product.test.ts        # Product CRUD + filtering tests

docker/
├── Dockerfile                          # Multi-stage Node.js build
├── docker-compose.yml                 # Full stack (app, mongo, loki, promtail, grafana)
├── loki/loki-config.yml               # Loki log aggregation
├── promtail/promtail-config.yml       # Log shipping to Loki
└── grafana/provisioning/
    ├── datasources/loki.yml           # Auto-configured Loki datasource
    └── dashboards/
        ├── dashboard.yml              # Dashboard provisioning
        └── api-monitoring.json        # Pre-built monitoring dashboard
```

## Architecture

### Modular Monolith

Code is organized by **feature module**, not by technical layer. Each module contains its own model, repository, service, controller, routes, validation, and types.

### Layered Architecture (per module)

```
Route → Controller → Service → Repository → MongoDB
```

- **Route** — HTTP method, path, middleware chain (auth, rbac, validate)
- **Controller** — Thin HTTP handler: parses request, calls service, sends response, emits audit log
- **Service** — Business logic, validation, throws `ApiError`
- **Repository** — Data access via `BaseRepository<T>` (extends Mongoose)

### Middleware Stack

```
Request → Helmet → CORS → Compression → Request ID → HTTP Logger (Pino)
        → Body Parsers → Rate Limiter → Routes → Error Logger → Error Handler → Response
```

### Boot Sequence

```
dotenv → MongoDB connect → Seed default roles → Start Agenda → Setup Express → Listen
       → Register graceful shutdown (SIGTERM/SIGINT → stop Agenda → close server)
       → Register uncaughtException/unhandledRejection handlers
```

## API Endpoints

All routes are prefixed with `/api`. Auth endpoints are public; all others require JWT + RBAC permissions.

### Authentication

| Method | Endpoint             | Description                    |
| ------ | -------------------- | ------------------------------ |
| `POST` | `/api/auth/register` | Register a new user            |
| `POST` | `/api/auth/login`    | Login with email/password      |
| `GET`  | `/api/auth/me`       | Get current authenticated user |

### Users

| Method   | Endpoint         | Description                |
| -------- | ---------------- | -------------------------- |
| `GET`    | `/api/users`     | List all users (paginated) |
| `GET`    | `/api/users/:id` | Get user by ID             |
| `PATCH`  | `/api/users/:id` | Update user                |
| `DELETE` | `/api/users/:id` | Delete user                |

### Roles

| Method   | Endpoint                 | Description                    |
| -------- | ------------------------ | ------------------------------ |
| `GET`    | `/api/roles`             | List all roles (paginated)     |
| `GET`    | `/api/roles/:id`         | Get role by ID                 |
| `POST`   | `/api/roles`             | Create a new role              |
| `PATCH`  | `/api/roles/:id`         | Update role                    |
| `DELETE` | `/api/roles/:id`         | Delete role                    |
| `GET`    | `/api/roles/permissions` | List all available permissions |

### Categories

| Method   | Endpoint              | Description                     |
| -------- | --------------------- | ------------------------------- |
| `GET`    | `/api/categories`     | List all categories (paginated) |
| `GET`    | `/api/categories/:id` | Get category by ID              |
| `POST`   | `/api/categories`     | Create a new category           |
| `PATCH`  | `/api/categories/:id` | Update category                 |
| `DELETE` | `/api/categories/:id` | Delete category                 |

### Products

| Method   | Endpoint            | Description                           |
| -------- | ------------------- | ------------------------------------- |
| `GET`    | `/api/products`     | List products (paginated, filterable) |
| `GET`    | `/api/products/:id` | Get product by ID (with category)     |
| `POST`   | `/api/products`     | Create a new product                  |
| `PATCH`  | `/api/products/:id` | Update product                        |
| `DELETE` | `/api/products/:id` | Delete product                        |

**Product Filters:** `?category=id&minPrice=10&maxPrice=100&search=keyword`

### Other

| Method | Endpoint         | Description            |
| ------ | ---------------- | ---------------------- |
| `GET`  | `/health`        | Health check (no auth) |
| `GET`  | `/api-docs`      | Swagger UI             |
| `GET`  | `/api-docs.json` | OpenAPI 3.0 JSON spec  |

## API Response Format

All responses follow a consistent structure:

```json
{
  "success": true,
  "statusCode": 200,
  "code": "SUCCESS",
  "message": "Success",
  "data": { ... },
  "timestamp": "2026-08-05T10:30:00.000Z"
}
```

Error responses:

```json
{
  "success": false,
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": ["\"email\" is required"],
  "timestamp": "2026-08-05T10:30:00.000Z"
}
```

Paginated responses include:

```json
{
  "data": {
    "docs": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

## Authentication & Authorization

### JWT Authentication

- Register or login to receive a JWT token
- Include token in the `Authorization` header: `Bearer <token>`
- Tokens expire based on `JWT_EXPIRES_IN` (default: 7 days)

### RBAC (Role-Based Access Control)

Three default roles are seeded on startup:

| Role         | Permissions                            |
| ------------ | -------------------------------------- |
| `superadmin` | All permissions                        |
| `admin`      | User, category, and product management |
| `user`       | Read-only access                       |

Permissions follow the `module:action` pattern (e.g., `user:read`, `product:delete`).

**Middleware flow:** `authenticate` (JWT → `req.userId`) → `authorize` (fetch user role → check permissions)

## Logging

Production-grade structured logging powered by [Pino](https://github.com/pinojs/pino).

### Features

- **Structured JSON logs** with timestamp, level, service, hostname, PID
- **Request correlation** via UUID `x-request-id` header (auto-generated or forwarded)
- **HTTP request/response logging** with method, URL, status, duration, IP, user agent
- **Categorized error logging** — ApiError, JWT, Validation, MongoDB, unhandled
- **Audit trail** for business events (login, register, CRUD operations, role changes)
- **Sensitive data redaction** — passwords, tokens, API keys, credit cards auto-masked as `********`
- **Daily log rotation** with configurable retention (default: 30 days)
- **Environment-aware** — pretty console in development, JSON stdout in production

### Log Files

| File                | Content                      |
| ------------------- | ---------------------------- |
| `logs/app.log`      | All logs at configured level |
| `logs/error.log`    | Error and fatal logs only    |
| `logs/combined.log` | All logs (trace and above)   |

### Log Levels

`trace` → `debug` → `info` → `warn` → `error` → `fatal`

Set via `LOG_LEVEL` environment variable (default: `info`).

### Usage

```typescript
import { logger } from "../common/logger";

logger.info({ userId, orderId }, "Order placed");
logger.error({ err, requestId }, "Payment failed");
```

### Audit Logger

```typescript
import { auditLogger, AuditAction } from "../common/logger";

auditLogger.log(req, {
  action: AuditAction.USER_DELETE,
  module: "user",
  description: `User deleted: ${id}`,
  targetId: id,
  targetType: "User",
});
```

See [LOGGING.md](LOGGING.md) for full documentation including Loki queries and Grafana setup.

## Testing

140 tests across 18 test suites using Jest + Supertest + MongoMemoryServer.

### Commands

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Structure

| Suite                 | Count | Description                                            |
| --------------------- | ----- | ------------------------------------------------------ |
| **Unit Tests**        | 91    | Service layer (mocked repositories), utilities, logger |
| **Integration Tests** | 49    | Full API tests with MongoMemoryServer                  |

**Unit Tests:**

- `ApiResponse` — success, error, created, paginated, ack responses
- `ApiError` — custom error with status code
- `pagination` — query parsing, limits, sorting
- `auth.service` — register, login, getMe with mocked repos
- `user.service` — CRUD with mocked repos
- `role.service` — CRUD + permissions listing
- `category.service` — CRUD with duplicate checking
- `product.service` — CRUD with category validation
- `sanitizer` — sensitive field masking (passwords, tokens, cards, nested objects)
- `request-id` — UUID generation, header passthrough
- `error-logger` — error categorization (ApiError, JWT, Validation, Mongo)
- `audit-logger` — event logging with request context

**Integration Tests:**

- `health` — health check endpoint
- `auth` — register, login, me with real MongoDB
- `user` — CRUD operations with auth
- `role` — CRUD + permissions endpoint
- `category` — CRUD with duplicate detection
- `product` — CRUD with filtering (category, price range, search)

## Swagger / API Documentation

Interactive API documentation is auto-generated from JSDoc annotations in route files.

- **Swagger UI:** `http://localhost:8000/api-docs`
- **OpenAPI JSON:** `http://localhost:8000/api-docs.json`

All endpoints, request/response schemas, and authentication requirements are documented.

## Background Jobs

Agenda (backed by MongoDB) handles background job processing. No Redis required.

| Job                                   | Description                  |
| ------------------------------------- | ---------------------------- |
| `queueEmail(payload)`                 | Send email via SMTP          |
| `queueBulkEmail(payloads)`            | Send batch emails            |
| `queuePushNotification(payload)`      | Send FCM push notification   |
| `queueMulticastNotification(payload)` | Send FCM to multiple devices |

Jobs retry 3 times with exponential backoff.

## External Services

| Service            | Provider             | Config Prefix   |
| ------------------ | -------------------- | --------------- |
| Email              | Nodemailer (SMTP)    | `config.smtp.*` |
| Push Notifications | Firebase Admin (FCM) | `config.fcm.*`  |
| File Storage       | AWS S3               | `config.s3.*`   |

## Docker

### Full Stack (with Monitoring)

One command to start the entire stack — API, MongoDB, Loki, Promtail, and Grafana:

```bash
cd docker
docker compose up -d
```

| Service     | Port    | Description              |
| ----------- | ------- | ------------------------ |
| Express API | `8000`  | REST API                 |
| MongoDB     | `27017` | Database                 |
| Grafana     | `3000`  | Dashboards (admin/admin) |
| Loki        | `3100`  | Log aggregation          |
| Promtail    | —       | Log shipping agent       |

### Grafana Dashboard

Auto-provisioned at `http://localhost:3000` with 16 panels:

- Request Rate / Error Rate (time series)
- HTTP Status Code distribution (pie chart)
- Top Endpoints / Slowest Endpoints
- 500 / 404 / 401 error counts
- Login Activity timeline
- Audit Log viewer
- Top Errors / Error Trend
- Top IP Addresses / User Agents / Most Active Users
- Database Errors / Server Errors (5xx)

### Loki Query Examples

```logql
{service="express-api"} | json | level="error"
{service="express-api"} | json | statusCode="401"
{service="express-api"} | json | requestId="abc-123"
{service="express-api"} | json | type="audit" | audit_action="LOGIN"
{service="express-api"} | json | method="POST"
```

## Scripts

| Script             | Command                    | Description                                          |
| ------------------ | -------------------------- | ---------------------------------------------------- |
| `dev`              | `npm run dev`              | Start dev server with hot reload (nodemon + ts-node) |
| `build`            | `npm run build`            | Compile TypeScript to `dist/`                        |
| `start`            | `npm start`                | Run compiled production build                        |
| `test`             | `npm test`                 | Run all tests                                        |
| `test:unit`        | `npm run test:unit`        | Run unit tests only                                  |
| `test:integration` | `npm run test:integration` | Run integration tests only                           |
| `test:coverage`    | `npm run test:coverage`    | Run tests with coverage report                       |
| `test:watch`       | `npm run test:watch`       | Run tests in watch mode                              |

## Adding a New Module

1. Create `src/modules/<name>/` with files:
   - `<name>.model.ts` — Mongoose schema + interface
   - `<name>.repository.ts` — extends `BaseRepository`
   - `<name>.service.ts` — business logic
   - `<name>.controller.ts` — thin HTTP handler + audit logging
   - `<name>.routes.ts` — route definitions + Swagger JSDoc
   - `<name>.validation.ts` — Joi schemas
   - `<name>.types.ts` — DTOs and interfaces
   - `index.ts` — public API exports

2. Register routes in `src/modules/index.ts`

3. Add permissions to `src/common/constants/permissions.ts`

4. Add Swagger schemas to `src/config/swagger.ts`

5. Add audit actions to `src/common/logger/middleware/audit-logger.ts`

6. Add tests in `tests/unit/services/` and `tests/integration/`

## Security

- **Helmet** — HTTP security headers
- **CORS** — Cross-origin resource sharing
- **Rate Limiting** — 100 requests per 15 minutes per IP on `/api`
- **JWT** — Stateless token-based authentication
- **RBAC** — Fine-grained permission-based authorization
- **Password Hashing** — bcryptjs with auto-salt
- **Input Validation** — Joi schema validation on all inputs
- **Log Redaction** — Sensitive fields (passwords, tokens, API keys, credit cards) auto-masked in logs

## Author

**Bapi Biswas**

- Email: bapibiswas703@gmail.com
- Portfolio: [bapi-biswas-portfolio.vercel.app](https://bapi-biswas-portfolio.vercel.app/)

## License

This project is licensed under the MIT License.
