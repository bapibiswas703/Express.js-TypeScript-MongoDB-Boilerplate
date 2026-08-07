# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.18.0] - 2026-08-07

### Added
- **Database migrations** — Versioned schema changes using `migrate-mongo`
  - `migrate-mongo-config.js` — reads `MONGODB_URI` from `.env`
  - `migrations/20260807000001-initial-indexes.js` — codifies all 20 existing indexes from Mongoose schemas
  - `migrations/20260807000002-add-user-phone-field.js` — example migration template
  - npm scripts: `migrate:up`, `migrate:down`, `migrate:status`, `migrate:create`

## [1.17.0] - 2026-08-07

### Added
- **Kubernetes manifests** — Kustomize-based k8s deployment in `k8s/`
  - Base: Deployment, Service, Ingress, HPA, ConfigMap, Secret, MongoDB StatefulSet
  - Health/readiness probes on `/health` endpoint
  - Overlays for dev (1 replica, debug), staging (2 replicas, tracing), prod (3 replicas, TLS, pod spread, HPA 3-20)
  - `k8s/README.md` with full setup instructions

## [1.16.0] - 2026-08-07

### Added
- **Load / stress tests** — k6 performance test scripts in `tests/load/`
  - `smoke.test.js` — quick validation (1 VU, 30s)
  - `load.test.js` — sustained production traffic (20-50 VUs, 7min)
  - `spike.test.js` — sudden traffic surge (10-200 VUs, 3min)
  - `soak.test.js` — extended stability test (30 VUs, 29min)
  - Shared config and auth helpers
  - Targets auth, products, categories with filtering and pagination
  - `tests/load/README.md` with setup, thresholds, and usage

## [1.15.0] - 2026-08-07

### Added
- **E2E tests** — 13 end-to-end tests across 3 test suites in `tests/e2e/`
  - `auth-flow.e2e.test.ts` — full auth lifecycle, multi-device logout-all, duplicate registration, refresh token rotation chain
  - `product-lifecycle.e2e.test.ts` — category/product CRUD, filtering, pagination, cross-module data consistency
  - `rbac.e2e.test.ts` — permission enforcement, unauthenticated access denial, superadmin full access, role-based access control
  - npm script: `npm run test:e2e`
- **APM / distributed tracing** — OpenTelemetry integration with Jaeger
  - `src/instrumentation.ts` — auto-instrumentation for Express, MongoDB, HTTP (conditional via `TRACING_ENABLED`)
  - Trace ID correlation in Pino logs (`traceId`, `spanId` injected via mixin)
  - Jaeger service added to Docker Compose (UI at port 16686, OTLP receiver at 4318)
  - Env vars: `TRACING_ENABLED`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`
- **Seed script CLI** — `npm run seed` with selective seeding
  - Flags: `--roles`, `--users`, `--categories`, `--products`, `--fresh`, `--help`
  - Idempotent (skips existing records), dependency-aware (warns if roles missing for users)
  - Sample data: 3 roles, 4 users, 5 categories, 10 products

## [1.14.0] - 2026-08-06

### Added
- **Per-user rate limiting** — Authenticated endpoints now rate-limited per user ID (not just IP)
  - `userRateLimiter` middleware using `req.userId` as key, falls back to IP for unauthenticated requests
  - Configurable via `RATE_LIMIT_USER_WINDOW_MS` (default 15min) and `RATE_LIMIT_USER_MAX` (default 200)
  - Applied to all authenticated routes across all modules (users, roles, products, categories, devices, webhooks, jobs, DLQ, media, IP blocklist, auth)
  - Global IP-based rate limiter also made configurable via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`

## [1.13.0] - 2026-08-06

### Added
- **Database indexes review** — Added compound indexes for common query patterns
  - Product: `{category:1, price:1}`, `{isActive:1, price:1}` for filtered product listing
  - User: `{name:'text', email:'text'}` for search, `{deletedAt:1, email:1}` for unique lookups with soft delete, sparse indexes on `passwordResetToken`, `emailVerificationToken`, `firebaseUid`
  - Category: `{isActive:1}` for active category filtering
  - RefreshToken: `{user:1, revoked:1}` for token lookup by user and status

## [1.12.0] - 2026-08-06

### Added
- **Job monitoring dashboard (API)** — Admin endpoints to view and manage Agenda background jobs
  - `GET /api/jobs` — list jobs with pagination, filter by `?name=` and `?state=` (scheduled, queued, running, completed, failed, repeating)
  - `GET /api/jobs/stats` — job count breakdown by state (scheduled, queued, running, completed, failed, repeating, total)
  - `GET /api/jobs/:id` — get a single job's full details
  - `POST /api/jobs/:id/requeue` — create a new job with same name and data
  - `DELETE /api/jobs/:id` — cancel and remove a job
  - Sorting: `?sortBy=nextRunAt|lastRunAt|name|priority&order=asc|desc`
  - Permissions: `job:read`, `job:manage`
  - Audit logging for cancel and requeue operations

## [1.11.0] - 2026-08-06

### Added
- **Outgoing webhook system** — Subscribe external URLs to application events with signed delivery
  - Webhook model: `url`, `events[]`, `secret` (auto-generated 64-char hex), `isActive`, `description`, `createdBy`
  - 11 subscribable events: `user.created/updated/deleted`, `product.created/updated/deleted`, `category.created/updated/deleted`, `order.created/updated`
  - CRUD API: `POST /api/webhooks`, `GET /api/webhooks`, `GET /api/webhooks/:id`, `PATCH /api/webhooks/:id`, `DELETE /api/webhooks/:id`
  - `GET /api/webhooks/events` — lists all available events
  - HMAC-SHA256 payload signing via `X-Webhook-Signature` header for consumer verification
  - Background delivery via Agenda queue (`deliver-webhook` job) with dead letter support
  - `dispatchWebhookEvent(event, data)` utility for modules to fire events (dynamic import, fault-tolerant)
  - 10-second delivery timeout, non-2xx responses treated as failures (retried by Agenda)
  - Ownership-scoped: users can only manage their own webhooks
  - Permissions: `webhook:read`, `webhook:create`, `webhook:update`, `webhook:delete`
  - Audit logging for webhook create, update, delete operations

## [1.10.0] - 2026-08-06

### Added
- **SMS notifications (Twilio)** — Send SMS via Twilio with background queue support
  - `sendSms(payload)` — send a single SMS to a phone number
  - `sendBulkSms(payload)` — send the same message to multiple recipients (parallel, fault-tolerant via `Promise.allSettled`)
  - Background queue: `queueSms(payload, delay?)` and `queueBulkSms(payload)` via Agenda
  - Lazy Twilio client initialization (created on first use)
  - Configurable via `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` env vars
  - Service: `src/common/services/sms.service.ts`, Queue: `src/common/queues/sms.queue.ts`

## [1.9.0] - 2026-08-06

### Added
- **Dead letter queue** — Permanently failed background jobs are captured and manageable via admin API
  - Agenda `fail` event handler: tracks `failCount`, moves job to DLQ after max retries (default: 3)
  - `DeadLetterJob` MongoDB model with `jobName`, `data`, `failReason`, `failCount`, `originalJobId`, `retriedAt`
  - Admin API: `GET /api/dead-letter-jobs` (paginated), `POST /api/dead-letter-jobs/:id/retry`, `DELETE /api/dead-letter-jobs/:id`
  - Retry re-queues the original job via Agenda, marks DLQ entry with `retriedAt` timestamp
  - Prevents double-retry (409 if already retried)
  - Error-level logging when jobs hit DLQ, warn-level for retryable failures
  - Configurable via `DLQ_MAX_RETRIES` env var (default: 3)
  - Permissions: `dlq:read`, `dlq:retry`, `dlq:delete`
  - Audit logging for retry and delete operations

## [1.8.0] - 2026-08-06

### Added
- **Prometheus metrics endpoint** — `GET /metrics` for Prometheus scraping via `prom-client`
  - Default Node.js metrics: CPU, memory, event loop lag, GC, heap, active handles
  - Custom HTTP metrics: `http_request_duration_seconds` (histogram), `http_requests_total` (counter), `http_requests_in_flight` (gauge)
  - Business metrics: `active_users` (gauge), `auth_attempts_total` (counter with type/status labels)
  - Metrics middleware normalizes routes (ObjectIds → `:id`), skips `/metrics` and `/health`
  - Configurable via `METRICS_ENABLED` (default: true) and `METRICS_PREFIX` (default: `app_`)
  - Integrates with existing Grafana stack for dashboarding

## [1.7.0] - 2026-08-05

### Added
- **IP-based blocking** — Block malicious IPs/CIDRs via static env var or runtime MongoDB collection
  - Static blocklist: `IP_BLOCKLIST=1.2.3.4,10.0.0.0/24` env var, parsed once at startup
  - Dynamic blocklist: MongoDB `BlockedIp` collection, cached in-memory with configurable refresh interval
  - CIDR subnet support (e.g., `192.168.0.0/16`) using bitwise arithmetic, no external deps
  - Admin API: `POST /api/ip-blocklist`, `GET /api/ip-blocklist`, `DELETE /api/ip-blocklist/:ip`
  - Optional TTL expiry on blocked IPs (auto-removed via MongoDB TTL index)
  - Middleware placed early in stack (before rate limiter and body parsers)
  - Blocked requests return `403 IP_BLOCKED` with audit logging
  - Permissions: `ip-blocklist:read`, `ip-blocklist:create`, `ip-blocklist:delete`
  - IP utility: `getClientIp()`, `isIpInCidr()`, `isIpBlocked()` in `src/common/utils/ip.ts`

## [1.6.0] - 2026-08-05

### Added
- **Cursor-based pagination** — All list endpoints now support cursor-based pagination alongside offset pagination
  - Auto-detected: pass `?cursor=<token>&limit=10` for cursor mode, `?page=1&limit=10` for offset mode
  - Cursor is a base64-encoded `_id`, no `skip()` needed — efficient for large datasets
  - Response includes `{ hasMore, nextCursor }` for easy sequential page fetching
  - `cursorPaginate()` method added to `BaseRepository` — available to all modules
  - Utility functions: `parseCursorPagination()`, `isCursorPagination()`, `encodeCursor()`, `decodeCursor()`
  - `sendCursorPaginated()` response helper and `CursorPaginatedResponse` Swagger schema
  - Supported on: products, users, categories, roles, media endpoints

## [1.5.0] - 2026-08-05

### Added
- **Media module** — New `media` module for file upload and management with dual storage support
  - `POST /api/media/upload` — upload files with optional folder organization
  - `GET /api/media/my` — list own uploads (paginated, filterable by folder)
  - `GET /api/media/:id` — get media by ID
  - `DELETE /api/media/:id` — delete media (owner-only)
- **Storage service abstraction** — `FILESYSTEM_DISK=local|s3` env var switches between local filesystem (`public/uploads/{folder}/`) and AWS S3
- **User avatar upload** — `POST /api/users/:id/avatar` endpoint, stores in `avatars/` folder via media module
- Static file serving for local uploads at `/public/uploads/`
- Media permissions: `media:read`, `media:create`, `media:delete`
- Audit logging for media upload and delete events

## [1.4.0] - 2026-08-05

### Added
- **Login location (IP geolocation)** — Resolves client IP to country/region/city/coordinates on device creation using `geoip-lite`
- Device model: added `location` subdocument with `country`, `region`, `city`, `ll` (lat/lng), and `timezone` fields
- New device login notification emails now include location info
- Utility: `src/common/utils/geoip.ts` with `lookupIp()` — strips IPv6-mapped prefix, skips private IPs

## [1.3.0] - 2026-08-05

### Added
- **Two-factor authentication (TOTP)** — Full 2FA flow using `otpauth` and `qrcode`:
  - `POST /api/auth/2fa/setup` — generates TOTP secret and QR code
  - `POST /api/auth/2fa/verify` — verifies code and enables 2FA, returns 8 backup codes
  - `POST /api/auth/2fa/validate` — completes login with TOTP or backup code
  - `POST /api/auth/2fa/disable` — disables 2FA (requires password + code)
- Login returns `{ requiresTwoFactor: true }` when 2FA is enabled, requiring a second step
- Backup codes are SHA-256 hashed and consumed on use
- User model: added `twoFactorEnabled`, `twoFactorSecret`, `twoFactorBackupCodes` fields

## [1.2.0] - 2026-08-05

### Added
- **Social login via Firebase** — `POST /api/auth/social-login` accepts a Firebase ID token (from Google, GitHub, Facebook, etc.), verifies it, creates or links users, and returns application JWT tokens
- User model: added `authProvider` and `firebaseUid` fields to support social authentication
- Shared Firebase Admin initialization utility (`src/common/services/firebase.ts`)
- Auto-links existing local accounts when social login email matches
- Social users are auto-verified (email verified by provider)

## [1.1.0] - 2026-08-05

### Added
- **Forgot password / reset flow** — `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` with secure hashed tokens
- **Email verification** — Verification token sent on registration, `GET /api/auth/verify-email?token=...`, `POST /api/auth/resend-verification`
- **Change password** — `POST /api/auth/change-password` for authenticated users
- **Account lockout** — Locks account for 15 minutes after 5 failed login attempts
- **New device login notification** — Email alert when login from unrecognized device
- **API versioning** — Routes available at both `/api/v1/*` and `/api/*` (backward compatible)
- **XSS sanitization** — Global middleware sanitizes all request body strings
- **User search** — `GET /api/users?search=keyword` searches by name and email
- **Sorting** — `?sortBy=field&order=asc|desc` on all list endpoints (users, roles, categories, products)
- **Soft delete** — Users are soft-deleted (`deletedAt` timestamp) instead of permanently removed
- **Scheduled jobs** — Daily token cleanup cron job removes expired/revoked refresh tokens
- **Job retry configuration** — Priority and concurrency settings on email and notification queues
- **CI/CD pipeline** — GitHub Actions workflow for lint, typecheck, test, build, and Docker
- **Contributing guide** — `CONTRIBUTING.md` with workflow, code style, and PR process
- **Changelog** — `CHANGELOG.md` following Keep a Changelog format
- **Feature checklist** — `docs/features.md` tracking 131 features with status
- Email templates: `verify-email.ejs`, `new-device.ejs`

### Changed
- User model: added `avatar`, `isEmailVerified`, `emailVerificationToken`, `emailVerificationExpires`, `passwordResetToken`, `passwordResetExpires`, `failedLoginAttempts`, `lockUntil`, `deletedAt` fields
- User `toJSON` now strips `failedLoginAttempts`, `lockUntil`, and token fields
- `BaseRepository.paginate()` now accepts optional `sort` parameter
- Auth rate limiter now also covers `forgot-password` and `reset-password` endpoints

## [1.0.0] - 2026-08-04

### Added
- Modular monolith architecture with Express.js + TypeScript + MongoDB
- JWT access tokens (15m) with refresh token rotation (7d)
- Token reuse detection (revokes all tokens on reuse)
- RBAC with permissions (`module:action`) and three default roles (superadmin, admin, user)
- Device/session management with User-Agent parsing
- Max 10 active devices per user with oldest eviction
- Modules: auth, user, role, category, product, device
- BaseRepository pattern for generic CRUD operations
- Structured logging with Pino (JSON + file rotation + Loki integration)
- Audit logging for business events
- Background jobs with Agenda (email, push notifications)
- External services: email (SMTP), push notifications (FCM), file storage (S3)
- Swagger/OpenAPI documentation at `/api-docs`
- Docker + Docker Compose with Grafana/Loki monitoring
- 183 tests (unit + integration)
- Request ID tracking, rate limiting, Helmet security headers
- Joi input validation with `stripUnknown` and ObjectId param validation
