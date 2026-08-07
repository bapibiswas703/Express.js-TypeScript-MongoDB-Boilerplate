# System Architecture

This project follows a **modular monolith** pattern built with Express.js, TypeScript, and MongoDB. Code is organized by feature module rather than by technical layer.

## Design Patterns

This project combines three well-established design patterns:

### 1. Repository Pattern

The `BaseRepository<T>` (`src/common/repositories/base.repository.ts`) abstracts all database operations behind a generic interface. Each module extends it with module-specific queries:

```
BaseRepository<T>  (generic: create, findById, paginate, updateById, deleteById)
    ├── UserRepository
    ├── RoleRepository
    ├── CategoryRepository
    ├── ProductRepository
    └── DeviceRepository
```

The service layer never touches Mongoose directly — it always goes through the repository. This means you could swap MongoDB for another database by changing only the repository implementations, without modifying any service or controller code.

### 2. Service Layer Pattern

All business logic lives in the service layer (`*.service.ts`). Services orchestrate repository calls, enforce business rules, and throw `ApiError` for validation failures. Controllers are thin HTTP adapters that only parse requests and send responses — they contain zero business logic.

```
Controller (HTTP concern)  →  Service (business logic)  →  Repository (data access)
```

### 3. Modular Monolith

Code is organized by **feature module** (`auth/`, `user/`, `device/`, etc.) rather than by **technical layer** (`controllers/`, `services/`, `models/`). Each module is a self-contained vertical slice with its own model, repository, service, controller, and routes.

This gives you the organizational benefits of microservices (clear boundaries, independent modules) without the operational complexity (no inter-service communication, no distributed transactions, single deployment).

## High-Level Overview

```
Client Request
    |
    v
Express Middleware Stack (helmet, cors, compression, rate limiter)
    |
    v
Router (/api) --> Module Routes
    |
    v
Controller (parses request, calls service, sends response)
    |
    v
Service (business logic, validation, throws ApiError)
    |
    v
Repository (database operations via BaseRepository)
    |
    v
MongoDB (via Mongoose)
```

## Folder Structure

```
src/
├── app.ts                              # Entry point — boots the server
├── instrumentation.ts                  # OpenTelemetry setup (loaded first)
├── config/
│   ├── index.ts                        # Nested env-based config object
│   └── swagger.ts                      # OpenAPI 3.0 spec (swagger-jsdoc)
├── scripts/                            # CLI scripts
│   ├── seed.ts                         # Database seeding CLI (npm run seed)
│   └── seed-data.ts                    # Seed data definitions
├── services/                           # Infrastructure services
│   ├── Database.ts                     # MongoDB connection (mongoose.connect)
│   ├── ExpressApp.ts                   # Express setup + middleware stack
│   └── seed.ts                         # Default role seeding on startup
├── common/                             # Shared across all modules
│   ├── constants/
│   │   └── permissions.ts              # RBAC permissions & role names
│   ├── logger/                         # Pino logger, sanitizer, middleware
│   ├── middlewares/
│   │   ├── auth.ts                     # JWT authentication
│   │   ├── rbac.ts                     # Permission & role authorization
│   │   ├── validate.ts                 # Joi request body validation
│   │   ├── validateId.ts              # MongoDB ObjectId param validation
│   │   ├── error.ts                    # Global error handler
│   │   └── upload.ts                   # Multer file upload
│   ├── repositories/
│   │   └── base.repository.ts          # Generic CRUD repository
│   ├── queues/                         # Agenda background jobs
│   ├── services/                       # Email, FCM, S3 services
│   ├── types/index.ts                  # Shared interfaces
│   └── utils/                          # ApiError, ApiResponse, pagination, parseUserAgent
└── modules/                            # Feature modules
    ├── index.ts                        # Route aggregator
    ├── auth/                           # JWT auth + refresh tokens
    ├── user/                           # User CRUD
    ├── role/                           # Role CRUD + permissions
    ├── category/                       # Category CRUD
    ├── product/                        # Product CRUD with filtering
    └── device/                         # Device/session management
```

## Boot Sequence

The application starts in `src/app.ts` and follows this sequence:

```
1. Initialize OpenTelemetry (if TRACING_ENABLED=true)
2. Load environment variables (dotenv)
3. Connect to MongoDB
4. Seed default roles (superadmin, admin, user)
5. Start Agenda job processor
6. Setup Express middleware stack
7. Listen on configured port
8. Register graceful shutdown handlers (SIGTERM, SIGINT)
```

On shutdown, Agenda stops first, then the HTTP server closes gracefully.

## Layered Architecture Per Module

Each module follows a strict layered pattern:

```
Route  -->  Controller  -->  Service  -->  Repository  -->  MongoDB
```

| Layer          | Responsibility                               | File              |
| -------------- | -------------------------------------------- | ----------------- |
| **Route**      | HTTP method, path, middleware chain          | `*.routes.ts`     |
| **Controller** | Parse request, call service, send response   | `*.controller.ts` |
| **Service**    | Business logic, validation, throw `ApiError` | `*.service.ts`    |
| **Repository** | Database operations via `BaseRepository<T>`  | `*.repository.ts` |

Supporting files:

| File              | Purpose                                                     |
| ----------------- | ----------------------------------------------------------- |
| `*.model.ts`      | Mongoose schema and `I<Name>` interface                     |
| `*.types.ts`      | DTOs (Data Transfer Objects)                                |
| `*.validation.ts` | Joi schemas for request validation                          |
| `index.ts`        | Public API — exports routes and anything other modules need |

## Module Files (Standard Template)

Every module directory contains these files:

```
src/modules/<name>/
├── <name>.model.ts          # Mongoose model + interface
├── <name>.repository.ts     # Extends BaseRepository
├── <name>.service.ts        # Business logic
├── <name>.controller.ts     # HTTP handlers
├── <name>.routes.ts         # Express router + Swagger JSDoc
├── <name>.validation.ts     # Joi schemas
├── <name>.types.ts          # DTOs
└── index.ts                 # Public API exports
```

## Express Middleware Stack

Applied in order by `src/services/ExpressApp.ts`:

```
1. helmet()              — Security headers
2. cors()                — Cross-Origin Resource Sharing
3. compression()         — gzip response compression
4. requestIdMiddleware   — UUID v4 per request (x-request-id)
5. httpLogger            — pino-http request/response logging
6. express.json()        — Body parser (10mb limit)
7. express.urlencoded()  — URL-encoded body parser
8. rateLimit             — 100 req/15min on /api
9. /health               — Health check endpoint
10. /api-docs            — Swagger UI
11. /api                 — Module routes
12. errorLogger          — Categorized error logging
13. errorHandler         — Standardized error responses
```

## Configuration

All configuration is in `src/config/index.ts` as a nested object:

```typescript
config.port           // Server port (default: 8000)
config.mongoUri       // MongoDB connection string
config.jwt.secret     // JWT signing secret
config.jwt.expiresIn  // Access token expiry (default: 15m)
config.jwt.refreshExpiresIn  // Refresh token expiry (default: 7d)
config.smtp.*         // Email SMTP settings
config.s3.*           // AWS S3 settings
config.fcm.*          // Firebase Cloud Messaging settings
config.log.*          // Logging configuration
```

All values are read from environment variables with sensible fallbacks. See `.env.example` for the full list.

## Module Boundaries

- Modules import from `common/` freely
- Cross-module imports **must** go through the module's `index.ts`
- Example: auth module imports `{ userRepository }` from `../user`
- Each module's `index.ts` defines its public API — only export what other modules need

## Related Docs

- [Auth System](./auth-system.md) — JWT, refresh tokens, login/register flow
- [RBAC](./rbac.md) — Roles, permissions, authorization middleware
- [Adding Modules](./adding-modules.md) — Step-by-step guide for new modules
- [Security](./security.md) — Rate limiting, input validation, password policy
