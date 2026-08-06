# Feature List & Checklist

Status legend: `Done` | `Partial` | `Pending` | `Blocked`

---

## Core Architecture

| #   | Feature                             | Status | Notes                                               |
| --- | ----------------------------------- | ------ | --------------------------------------------------- |
| 1   | Modular monolith structure          | Done   | Feature-based modules with clear boundaries         |
| 2   | Repository pattern (BaseRepository) | Done   | Generic CRUD with pagination, filtering, sorting    |
| 3   | Service layer pattern               | Done   | Business logic isolated from HTTP layer             |
| 4   | Layered architecture per module     | Done   | Route > Controller > Service > Repository           |
| 5   | TypeScript strict mode              | Done   | Full type safety across the codebase                |
| 6   | Environment-based config            | Done   | Nested config object with .env fallbacks            |
| 7   | Graceful shutdown                   | Done   | SIGTERM/SIGINT handlers for Agenda + server         |
| 8   | Uncaught exception handling         | Done   | `uncaughtException` + `unhandledRejection` handlers |

## Authentication

| #   | Feature                               | Status | Notes                                                                                |
| --- | ------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| 9   | JWT access tokens                     | Done   | Short-lived (15m), signed with HS256                                                 |
| 10  | Refresh token rotation                | Done   | Single-use, stored in MongoDB, 80-char hex                                           |
| 11  | Token reuse detection                 | Done   | Revokes all tokens + devices on reuse                                                |
| 12  | User registration                     | Done   | Auto-assigns default role, queues welcome email                                      |
| 13  | User login                            | Done   | Creates device record, returns token pair                                            |
| 14  | Logout (single session)               | Done   | Revokes refresh token + deactivates device                                           |
| 15  | Logout all devices                    | Done   | Revokes all tokens + deactivates all devices                                         |
| 16  | Get current user (me)                 | Done   | Returns user with populated role                                                     |
| 17  | Password hashing (bcrypt)             | Done   | 12 salt rounds, pre-save hook                                                        |
| 18  | Password strength validation          | Done   | Min 8, max 128, uppercase + lowercase + digit                                        |
| 19  | Forgot password / reset flow          | Done   | `POST /forgot-password` + `POST /reset-password` with SHA-256 hashed tokens          |
| 20  | Email verification                    | Done   | Verification email on register, `GET /verify-email`, `POST /resend-verification`     |
| 21  | Change password (authenticated)       | Done   | `POST /change-password` with current password verification                           |
| 22  | Account lockout after failed attempts | Done   | Locks after 5 failed attempts for 15 minutes                                         |
| 23  | OAuth / Social login                  | Done   | Firebase Auth social login (Google, GitHub, Facebook, etc.) via `POST /social-login` |
| 24  | Two-factor authentication (2FA)       | Done   | TOTP-based 2FA with setup, verify, validate login, disable + backup codes            |

## Authorization (RBAC)

| #   | Feature                          | Status  | Notes                                                          |
| --- | -------------------------------- | ------- | -------------------------------------------------------------- |
| 25  | Permission-based access control  | Done    | `module:action` format (e.g., `user:read`)                     |
| 26  | Role-based access control        | Done    | `authorizeRoles()` middleware                                  |
| 27  | Default role seeding             | Done    | superadmin, admin, user seeded on startup                      |
| 28  | Role CRUD API                    | Done    | Create, read, update, delete roles                             |
| 29  | Permissions list API             | Done    | `GET /api/roles/permissions` returns all available permissions |
| 30  | Role isActive flag               | Done    | Inactive roles are rejected by authorize middleware            |
| 31  | Auto-assign role on registration | Done    | New users get the `user` role                                  |
| 32  | Hierarchical roles               | Pending | No role inheritance (e.g., admin inherits user permissions)    |

## Device / Session Management

| #   | Feature                              | Status | Notes                                                                          |
| --- | ------------------------------------ | ------ | ------------------------------------------------------------------------------ |
| 33  | Device tracking on login/register    | Done   | Parses User-Agent for browser, OS, device type                                 |
| 34  | Device tracking on token refresh     | Done   | Updates device with new token ref + lastActive                                 |
| 35  | Device deactivation on logout        | Done   | isActive set to false                                                          |
| 36  | List active devices                  | Done   | Sorted by lastActive descending                                                |
| 37  | Get device by ID                     | Done   | Ownership check (returns 404 for other users)                                  |
| 38  | Rename device                        | Done   | PATCH with deviceName                                                          |
| 39  | Revoke single device                 | Done   | Revokes refresh token + deactivates device                                     |
| 40  | Revoke all other devices             | Done   | Keeps current device, revokes everything else                                  |
| 41  | Max active device limit (10)         | Done   | Oldest device evicted when limit reached                                       |
| 42  | Cascade on user deletion             | Done   | All tokens revoked + all devices deactivated                                   |
| 43  | Login location (geolocation from IP) | Done   | `geoip-lite` resolves IP to country/region/city/coordinates on device creation |
| 44  | New device login notification        | Done   | Email alert sent when login from unrecognized device                           |

## User Management

| #   | Feature                    | Status | Notes                                                                |
| --- | -------------------------- | ------ | -------------------------------------------------------------------- |
| 45  | List users (paginated)     | Done   | With page/limit query params                                         |
| 46  | Get user by ID             | Done   | With role populated                                                  |
| 47  | Update user                | Done   | Name and email, with Joi validation                                  |
| 48  | Delete user (with cascade) | Done   | Revokes all tokens + deactivates all devices                         |
| 49  | User search / filtering    | Done   | `?search=keyword` searches by name and email                         |
| 50  | User profile avatar upload | Done   | `POST /api/users/:id/avatar`, media module with local/S3 storage     |
| 51  | User soft delete           | Done   | `deletedAt` timestamp, Mongoose pre-query hooks filter deleted users |

## API Design

| #   | Feature                      | Status | Notes                                                           |
| --- | ---------------------------- | ------ | --------------------------------------------------------------- |
| 52  | Standardized response format | Done   | `{ success, statusCode, code, message, data, timestamp }`       |
| 53  | Standardized error format    | Done   | `{ success, statusCode, code, message, errors, timestamp }`     |
| 54  | Pagination                   | Done   | `page`, `limit` (capped at 100), returns `pagination` meta      |
| 55  | Input validation (Joi)       | Done   | `stripUnknown: true`, `abortEarly: false`, body replacement     |
| 56  | ObjectId param validation    | Done   | `validateId()` middleware on all `:id` routes                   |
| 57  | Swagger / OpenAPI docs       | Done   | Auto-generated from JSDoc, UI at `/api-docs`                    |
| 58  | Health check endpoint        | Done   | `GET /health` returns `{ status: "ok" }`                        |
| 59  | API versioning               | Done   | `/api/v1/*` + backward-compatible `/api/*`                      |
| 60  | Response compression         | Done   | gzip via `compression()` middleware                             |
| 61  | Request ID tracking          | Done   | UUID v4 per request via `x-request-id` header                   |
| 62  | Sorting support              | Done   | `?sortBy=field&order=asc\|desc` on all list endpoints           |
| 63  | Cursor-based pagination      | Done   | Auto-detected via `?cursor=` param, base64-encoded `_id` cursor |

## Security

| #   | Feature                                  | Status  | Notes                                                                 |
| --- | ---------------------------------------- | ------- | --------------------------------------------------------------------- |
| 64  | Helmet security headers                  | Done    | HSTS, X-Frame-Options, CSP, etc.                                      |
| 65  | CORS                                     | Done    | Enabled with defaults (configure for production)                      |
| 66  | Global rate limiting                     | Done    | 100 req/15min on `/api`                                               |
| 67  | Auth endpoint rate limiting              | Done    | 20 req/15min on register/login/refresh/forgot/reset                   |
| 68  | Input sanitization                       | Done    | Joi `stripUnknown` removes unknown fields                             |
| 69  | Password field hidden from queries       | Done    | `select: false` on User model                                         |
| 70  | Sensitive fields stripped from responses | Done    | toJSON transforms on User and Device models                           |
| 71  | Sensitive data redacted from logs        | Done    | Pino serializer redacts password, token, keys, etc.                   |
| 72  | CSRF protection                          | Pending | Not needed for pure API (no cookies), but consider if adding sessions |
| 73  | Request body size limit                  | Done    | 10mb limit on `express.json()`                                        |
| 74  | MongoDB injection prevention             | Done    | Mongoose schemas enforce types                                        |
| 75  | SQL injection                            | N/A     | MongoDB (NoSQL) — not applicable                                      |
| 76  | XSS in stored data                       | Done    | Global `sanitizeBody` middleware using `xss` package                  |
| 77  | IP-based blocking                        | Done    | Static (env var) + dynamic (MongoDB) IP/CIDR blocklist with admin API |
| 78  | API key authentication                   | Pending | No API key auth for service-to-service calls                          |

## Logging & Monitoring

| #   | Feature                        | Status  | Notes                                                           |
| --- | ------------------------------ | ------- | --------------------------------------------------------------- |
| 79  | Structured JSON logging (Pino) | Done    | Replaces morgan, production-ready                               |
| 80  | HTTP request/response logging  | Done    | pino-http auto-logs every request                               |
| 81  | Error categorization logging   | Done    | errorLogger middleware classifies errors before handler         |
| 82  | Audit logging                  | Done    | `auditLogger.log()` for business events                         |
| 83  | Log file rotation              | Done    | Daily rotation via pino-roll                                    |
| 84  | Request ID propagation         | Done    | UUID v4 in `x-request-id` header                                |
| 85  | Grafana dashboard              | Done    | Auto-provisioned with Loki datasource                           |
| 86  | Promtail log shipping          | Done    | Reads app logs + Docker logs, pushes to Loki                    |
| 87  | Dev pretty-print logging       | Done    | pino-pretty for colored console in development                  |
| 88  | APM / distributed tracing      | Pending | No OpenTelemetry or Datadog integration                         |
| 89  | Metrics endpoint (Prometheus)  | Done    | `prom-client` with `/metrics` endpoint, HTTP + business metrics |

## Background Jobs

| #   | Feature                       | Status | Notes                                                                                      |
| --- | ----------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| 90  | Job queue (Agenda + MongoDB)  | Done   | No Redis required                                                                          |
| 91  | Email queue                   | Done   | Single + bulk email, with optional delay                                                   |
| 92  | Push notification queue (FCM) | Done   | Single + multicast via Firebase Admin                                                      |
| 93  | Job retry / backoff           | Done   | Priority and concurrency configured on email/notification queues                           |
| 94  | Job monitoring dashboard      | Done   | Admin API: list/filter/get jobs, stats by state, cancel, requeue                           |
| 95  | Scheduled / cron jobs         | Done   | Daily token cleanup cron job at 3 AM                                                       |
| 96  | Dead letter queue             | Done   | Agenda `fail` handler moves jobs to DLQ after max retries, admin API for list/retry/delete |

## External Services

| #   | Feature                           | Status | Notes                                                                     |
| --- | --------------------------------- | ------ | ------------------------------------------------------------------------- |
| 97  | Email (SMTP via Nodemailer)       | Done   | EJS templates: welcome, reset-password, verify-email, new-device          |
| 98  | Push notifications (Firebase FCM) | Done   | Single + multicast via queue                                              |
| 99  | File storage (AWS S3)             | Done   | Upload, download, presigned URLs, delete                                  |
| 100 | File upload middleware (Multer)   | Done   | `upload.single()` / `upload.array()` ready                                |
| 101 | SMS notifications                 | Done   | Twilio integration: single + bulk SMS via background queue                |
| 102 | Webhook support                   | Done   | Outgoing webhooks: subscribe URLs to events, HMAC-signed, queued delivery |

## Testing

| #   | Feature                       | Status  | Notes                                                |
| --- | ----------------------------- | ------- | ---------------------------------------------------- |
| 103 | Unit tests                    | Done    | 106+ tests for services, utils, logger               |
| 104 | Integration tests             | Done    | 98+ tests with real MongoDB (MongoMemoryServer)      |
| 105 | Test setup (helpers, app, DB) | Done    | `createTestUser`, `createTestRole`, `createTestApp`  |
| 106 | Queue mocking in tests        | Done    | `jest.mock` for email/notification queues            |
| 107 | Coverage reporting            | Done    | `npm run test:coverage`                              |
| 108 | E2E tests                     | Pending | No end-to-end browser/client tests                   |
| 109 | Load / stress tests           | Pending | No k6, Artillery, or similar                         |
| 110 | CI/CD pipeline                | Done    | GitHub Actions: lint, typecheck, test, build, Docker |

## DevOps & Deployment

| #   | Feature                  | Status  | Notes                                              |
| --- | ------------------------ | ------- | -------------------------------------------------- |
| 111 | Dockerfile (multi-stage) | Done    | Builder + runner, non-root user, health check      |
| 112 | Docker Compose           | Done    | App + MongoDB + Loki + Promtail + Grafana          |
| 113 | .env.example             | Done    | All variables documented                           |
| 114 | ESLint + Prettier        | Done    | Flat config, auto-fixable                          |
| 115 | TypeScript compilation   | Done    | `npm run build` → `dist/`                          |
| 116 | Kubernetes manifests     | Pending | No k8s deployment/service/ingress configs          |
| 117 | Database migrations      | Pending | No migration framework (relies on Mongoose schema) |
| 118 | Seed script (CLI)        | Partial | Roles auto-seeded, but no CLI for custom seed data |

## Documentation

| #   | Feature                | Status | Notes                       |
| --- | ---------------------- | ------ | --------------------------- |
| 119 | Architecture docs      | Done   | `docs/architecture.md`      |
| 120 | Auth system docs       | Done   | `docs/auth-system.md`       |
| 121 | RBAC docs              | Done   | `docs/rbac.md`              |
| 122 | Device management docs | Done   | `docs/device-management.md` |
| 123 | Security docs          | Done   | `docs/security.md`          |
| 124 | API reference docs     | Done   | `docs/api-reference.md`     |
| 125 | Module creation guide  | Done   | `docs/adding-modules.md`    |
| 126 | Background jobs docs   | Done   | `docs/background-jobs.md`   |
| 127 | Deployment docs        | Done   | `docs/deployment.md`        |
| 128 | Logging docs           | Done   | `LOGGING.md`                |
| 129 | Swagger / OpenAPI      | Done   | Interactive at `/api-docs`  |
| 130 | Contributing guide     | Done   | `CONTRIBUTING.md`           |
| 131 | Changelog              | Done   | `CHANGELOG.md`              |

---

## Summary

| Status    | Count   |
| --------- | ------- |
| Done      | 121     |
| Partial   | 1       |
| Pending   | 8       |
| N/A       | 1       |
| **Total** | **131** |

---

## Suggested Features for Production Grade

The features below are recommended to bring this boilerplate to a fully production-ready state. They are ordered by priority.

### High Priority (Remaining)

| #   | Feature                     | Status | Why                                                                                                                                                  |
| --- | --------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Database indexes review** | Done   | Compound indexes on Product (category+price, isActive+price), User (text search, deletedAt+email), Category (isActive), RefreshToken (user+revoked). |

### Medium Priority

| #   | Feature                 | Status | Why                                                                                                     |
| --- | ----------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| 2   | **Rate limit per user** | Done   | Per-user rate limiting (200 req/15min) on all authenticated endpoints via `userRateLimiter` middleware. |

### Low Priority (Nice to Have)

| #   | Feature                       | Status  | Why                                                               |
| --- | ----------------------------- | ------- | ----------------------------------------------------------------- |
| 3   | **Webhook system**            | Done    | Outgoing webhooks with HMAC-signed delivery (see feature #102).   |
| 4   | **API key authentication**    | Pending | For service-to-service communication or third-party integrations. |
| 5   | **Kubernetes manifests**      | Pending | Deployment, Service, Ingress, HPA configs for k8s deployments.    |
| 6   | **Database migrations**       | Pending | Use `migrate-mongo` or similar for versioned schema changes.      |
| 7   | **APM / distributed tracing** | Pending | OpenTelemetry integration for request tracing across services.    |
| 8   | **E2E tests**                 | Pending | End-to-end browser/client tests with Playwright or Cypress.       |
| 9   | **Load / stress tests**       | Pending | Performance testing with k6 or Artillery.                         |
