# Logging & Monitoring

Production-grade logging system using Pino + Grafana + Loki + Promtail.

## Architecture

```
Express App (Pino) ──→ JSON logs to stdout + files
                           │
                           ├── logs/app.log      (all levels, daily rotation)
                           ├── logs/error.log    (error+fatal, daily rotation)
                           └── logs/combined.log (all levels, daily rotation)
                           │
                    Promtail ──→ Loki ──→ Grafana Dashboards
```

## Folder Structure

```
src/common/logger/
├── index.ts                    # Public exports
├── logger.ts                   # Pino instance (multistream, rotation, redaction)
├── sanitizer.ts                # Sensitive field masking utility
└── middleware/
    ├── request-id.ts           # UUID request correlation
    ├── http-logger.ts          # pino-http request/response logging
    ├── error-logger.ts         # Structured error logging by category
    └── audit-logger.ts         # Audit trail for business events

docker/
├── Dockerfile                  # Multi-stage Node.js build
├── docker-compose.yml          # Full stack: app, mongo, loki, promtail, grafana
├── loki/loki-config.yml        # Loki log aggregation config
├── promtail/promtail-config.yml # Promtail log shipping config
└── grafana/provisioning/
    ├── datasources/loki.yml    # Auto-configured Loki datasource
    └── dashboards/
        ├── dashboard.yml       # Dashboard provisioning config
        └── api-monitoring.json # Pre-built monitoring dashboard
```

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `LOG_LEVEL` | `info` | trace, debug, info, warn, error, fatal |
| `LOG_DIR` | `logs` | Directory for log files |
| `SERVICE_NAME` | `express-api` | Service identifier in logs |
| `LOG_RETENTION_DAYS` | `30` | Days to keep rotated logs |
| `ENABLE_LOKI` | `false` | Enable Loki push (Docker only) |
| `LOKI_URL` | `http://loki:3100/...` | Loki push endpoint |

## Log Levels

| Level | Use |
|---|---|
| `trace` | Extremely detailed debugging |
| `debug` | Development diagnostics |
| `info` | Normal operations, requests, audit events |
| `warn` | Client errors (4xx), auth failures, validation |
| `error` | Server errors (5xx), database errors, unhandled |
| `fatal` | Uncaught exceptions, unhandled rejections |

## Middleware Stack

```
Request → requestId → httpLogger → [...routes] → errorLogger → errorHandler → Response
```

1. **requestId** — Generates UUID v4, attaches to `req.id`, sets `x-request-id` response header. Accepts incoming `x-request-id` header for distributed tracing.
2. **httpLogger** — pino-http logs every request/response with method, URL, status, duration, IP, user agent. Skips `/health`. Auto-sets log level: 5xx=error, 4xx=warn, 2xx/3xx=info.
3. **errorLogger** — Categorizes errors (ApiError, JWT, Validation, MongoDB, unknown) and logs with full request context. Runs before errorHandler.

## Sensitive Data Masking

Pino's built-in `redact` masks these paths in log output:

- `req.headers.authorization`
- `req.headers.cookie` / `req.headers["set-cookie"]`
- `req.body.password`, `token`, `accessToken`, `refreshToken`
- `req.body.otp`, `creditCard`, `cardNumber`, `cvv`, `ssn`
- `req.body.apiKey`, `secret`, `privateKey`

All replaced with `********`. The `sanitize()` utility is also available for manual sanitization.

## Audit Logger

Logs business-critical events with structured context:

```typescript
import { auditLogger, AuditAction } from '../common/logger';

auditLogger.log(req, {
  action: AuditAction.USER_DELETE,
  module: 'user',
  description: `User deleted: ${id}`,
  targetId: id,
  targetType: 'User',
  metadata: { reason: 'admin action' },
});
```

Available actions: `LOGIN`, `LOGOUT`, `REGISTER`, `PASSWORD_CHANGE`, `PROFILE_UPDATE`, `USER_CREATE`, `USER_UPDATE`, `USER_DELETE`, `ROLE_CREATE`, `ROLE_UPDATE`, `ROLE_DELETE`, `PERMISSION_CHANGE`, `CATEGORY_CREATE/UPDATE/DELETE`, `PRODUCT_CREATE/UPDATE/DELETE`, `SETTINGS_CHANGE`, `EXPORT_REPORT`.

## Log Files

| File | Content | Rotation |
|---|---|---|
| `logs/app.log` | All logs at configured level | Daily, 30-day retention |
| `logs/error.log` | Error + fatal only | Daily, 30-day retention |
| `logs/combined.log` | All logs (trace+) | Daily, 30-day retention |

## Environment Behavior

**Development** (`NODE_ENV=development`):
- Pretty-printed colored console output via pino-pretty
- File logging active

**Production** (`NODE_ENV=production`):
- JSON output to stdout (for container log collection)
- File logging active
- Optimized serializers

## Docker Setup

One-command startup:

```bash
cd docker
docker compose up -d
```

Services:
- **app** — Express API on port `8000`
- **mongo** — MongoDB on port `27017`
- **loki** — Log aggregation on port `3100`
- **promtail** — Reads app logs + Docker logs, ships to Loki
- **grafana** — Dashboards on port `3000` (admin/admin)

## Grafana Dashboard

Auto-provisioned at `http://localhost:3000` with panels for:

- Requests Per Minute / Error Rate
- HTTP Status Code distribution
- Top Endpoints / Slowest Endpoints
- 500 / 404 / 401 error counts
- Login Activity timeline
- Audit Log viewer
- Top Errors table / Error Trend
- Top IP Addresses / User Agents / Most Active Users
- Database Errors / Server Errors (5xx) logs

### Loki Query Examples

```logql
# All errors
{service="express-api"} | json | level="error"

# Auth failures
{service="express-api"} | json | statusCode="401"

# Specific request
{service="express-api"} | json | requestId="abc-123"

# User activity
{service="express-api"} | json | userId="user-456"

# Audit events
{service="express-api"} | json | type="audit"

# POST requests
{service="express-api"} | json | method="POST"

# Slow requests (>1s)
{service="express-api"} | json | responseTime > 1000

# Module-specific
{service="express-api"} | json | type="audit" | audit_action="LOGIN"
```

## Using the Logger Directly

```typescript
import { logger } from '../common/logger';

logger.info({ userId, orderId }, 'Order placed');
logger.error({ err, requestId }, 'Payment failed');
logger.debug({ query }, 'Database query executed');
```

## Production Deployment

### Kubernetes

Mount a `PersistentVolumeClaim` for `/app/logs` or rely on stdout collection:

```yaml
containers:
  - name: express-api
    env:
      - name: LOG_LEVEL
        value: "info"
      - name: SERVICE_NAME
        value: "express-api"
```

Use a DaemonSet for Promtail or Fluentd to collect container stdout logs → Loki.

### Best Practices

1. Use structured logging (`logger.info({ data }, 'message')`) — not string interpolation
2. Include `requestId` in cross-service calls for distributed tracing
3. Never log sensitive data — rely on built-in redaction
4. Use `warn` for expected failures (validation, auth), `error` for unexpected
5. Use audit logger for all state-changing operations
6. Monitor error rate and response time dashboards
7. Set alerts on 5xx spike and auth failure patterns

## Troubleshooting

| Issue | Solution |
|---|---|
| No logs in Grafana | Check Promtail → Loki connectivity: `docker logs promtail` |
| Missing request IDs | Ensure `requestIdMiddleware` is before `httpLogger` |
| Logs too verbose | Raise `LOG_LEVEL` to `warn` or `error` |
| Disk filling up | Reduce `LOG_RETENTION_DAYS` or disable file logging in containers |
| Pino-pretty not working | Only active in `NODE_ENV=development` |
