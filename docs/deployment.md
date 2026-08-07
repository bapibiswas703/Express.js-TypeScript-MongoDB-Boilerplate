# Deployment & Environment Setup

## Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- Docker + Docker Compose (optional, for containerized deployment)

## Local Development

### 1. Clone and Install

```bash
git clone <repo-url>
cd express-ts-ejs-boilerplate
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values. At minimum, set:

```
MONGODB_URI=mongodb://localhost:27017/your-db-name
JWT_SECRET=your-strong-random-secret
JWT_REFRESH_SECRET=another-strong-random-secret
```

### 3. Seed Sample Data (Optional)

```bash
# Seed all sample data (roles, users, categories, products)
npm run seed

# Or drop existing data and re-seed
npm run seed:fresh

# Seed specific targets
npm run seed -- --roles --users
```

This creates sample roles (superadmin, admin, user), demo users, categories, and products. The seeder is idempotent — running it again won't create duplicates.

### 4. Start Development Server

```bash
npm run dev
```

This starts the server with `nodemon` + `ts-node` on port 8000 with hot-reloading.

### 5. Verify

```bash
curl http://localhost:8000/health
# { "status": "ok" }
```

Open `http://localhost:8000/api-docs` for the Swagger UI.

## Available Commands

| Command                    | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `npm run dev`              | Start dev server with hot-reload (port 8000)                        |
| `npm run build`            | Compile TypeScript to `dist/`                                       |
| `npm start`                | Run compiled JS from `dist/` (production)                           |
| `npx tsc --noEmit`         | Type-check without emitting                                         |
| `npm test`                 | Run all tests (jest --runInBand --forceExit)                        |
| `npm run test:unit`        | Run unit tests only                                                 |
| `npm run test:integration` | Run integration tests only                                          |
| `npm run test:e2e`         | Run end-to-end tests only                                           |
| `npm run test:coverage`    | Run tests with coverage report                                      |
| `npm run lint`             | Lint with ESLint                                                    |
| `npm run lint:fix`         | Auto-fix lint issues                                                |
| `npm run format`           | Format with Prettier                                                |
| `npm run format:check`     | Check formatting                                                    |
| `npm run seed`             | Seed database with sample data (roles, users, categories, products) |
| `npm run seed:fresh`       | Drop existing data and re-seed                                      |
| `npm run migrate:up`       | Run pending database migrations                                     |
| `npm run migrate:down`     | Rollback last applied migration                                     |
| `npm run migrate:status`   | Show migration status                                               |
| `npm run migrate:create`   | Create a new migration file                                         |

## Environment Variables

### Required

| Variable             | Description                  | Default                                 |
| -------------------- | ---------------------------- | --------------------------------------- |
| `MONGODB_URI`        | MongoDB connection string    | `mongodb://127.0.0.1:27017/demo`        |
| `JWT_SECRET`         | JWT signing secret           | `change-this-to-a-secure-random-string` |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | `change-this-refresh-secret`            |

### Optional

| Variable                 | Description                              | Default                             |
| ------------------------ | ---------------------------------------- | ----------------------------------- |
| `PORT`                   | Server port                              | `8000`                              |
| `APP_NAME`               | Application name (used in emails)        | `NodeJS Backend`                    |
| `NODE_ENV`               | Environment (`development`/`production`) | `development`                       |
| `JWT_EXPIRES_IN`         | Access token expiry                      | `15m`                               |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry                     | `7d`                                |
| `LOG_LEVEL`              | Pino log level                           | `info`                              |
| `LOG_DIR`                | Log file directory                       | `logs`                              |
| `SERVICE_NAME`           | Service name for logs                    | `express-api`                       |
| `LOG_RETENTION_DAYS`     | Days to keep log files                   | `30`                                |
| `ENABLE_LOKI`            | Enable Loki log shipping                 | `false`                             |
| `LOKI_URL`               | Loki push endpoint                       | `http://loki:3100/loki/api/v1/push` |

### Email (SMTP)

| Variable    | Description                  | Default               |
| ----------- | ---------------------------- | --------------------- |
| `SMTP_HOST` | SMTP server host             | `smtp.gmail.com`      |
| `SMTP_PORT` | SMTP server port             | `587`                 |
| `SMTP_USER` | SMTP username                | ``                    |
| `SMTP_PASS` | SMTP password / app password | ``                    |
| `SMTP_FROM` | Default sender address       | `noreply@example.com` |

### AWS S3

| Variable                | Description    | Default     |
| ----------------------- | -------------- | ----------- |
| `AWS_ACCESS_KEY_ID`     | AWS access key | ``          |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | ``          |
| `AWS_REGION`            | AWS region     | `us-east-1` |
| `AWS_S3_BUCKET`         | S3 bucket name | ``          |

### Firebase (FCM)

| Variable           | Description                    | Default |
| ------------------ | ------------------------------ | ------- |
| `FCM_PROJECT_ID`   | Firebase project ID            | ``      |
| `FCM_PRIVATE_KEY`  | Firebase private key (with \n) | ``      |
| `FCM_CLIENT_EMAIL` | Firebase service account email | ``      |

### OpenTelemetry Tracing

| Variable                       | Description                  | Default                  |
| ------------------------------ | ---------------------------- | ------------------------ |
| `TRACING_ENABLED`              | Enable OpenTelemetry tracing | `false`                  |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint      | `http://localhost:4318`  |
| `OTEL_SERVICE_NAME`            | Service name for traces      | `express-api`            |

## Docker Deployment

The project includes a full Docker setup with monitoring.

### Quick Start

```bash
cd docker
docker compose up -d
```

This starts 6 services:

| Service     | Container     | Port  | Description            |
| ----------- | ------------- | ----- | ---------------------- |
| Express API | `express-api` | 8000  | Your application       |
| MongoDB     | `mongo`       | 27017 | Database (mongo:8)     |
| Jaeger      | `jaeger`      | 16686 | Distributed tracing UI |
| Loki        | `loki`        | 3100  | Log aggregation        |
| Promtail    | `promtail`    | -     | Log shipper            |
| Grafana     | `grafana`     | 3000  | Dashboards             |

### Dockerfile

The Dockerfile (`docker/Dockerfile`) uses a multi-stage build:

1. **Builder stage** — Installs all dependencies, compiles TypeScript
2. **Runner stage** — Copies compiled JS + production dependencies only

Security features:

- Non-root user (`appuser`)
- Alpine base image (minimal attack surface)
- Health check (`/health` endpoint)
- Production-only dependencies

### Custom Environment

Override environment variables in `docker-compose.yml` or use a `.env` file:

```bash
# docker/.env
JWT_SECRET=my-super-secret-production-key
MONGODB_URI=mongodb://mongo:27017/production
```

## Monitoring (Grafana + Loki)

### Access Grafana

Open `http://localhost:3000` after `docker compose up`.

- **Username:** `admin`
- **Password:** `admin`

### Pre-configured Dashboard

The API monitoring dashboard is auto-provisioned and includes:

| Panel         | Shows                                            |
| ------------- | ------------------------------------------------ |
| Request Rate  | Requests per second over time                    |
| Error Rate    | 4xx/5xx responses over time                      |
| Top Endpoints | Most-hit API endpoints                           |
| Status Codes  | Distribution of HTTP status codes                |
| Auth Failures | Failed login/auth attempts                       |
| Top IPs       | Most active client IPs                           |
| Audit Log     | Business event trail (login, CRUD, role changes) |

### Log Flow

```
Express App (Pino JSON logs)
    |
    v
Log Files (logs/app.log, logs/error.log, logs/combined.log)
    |
    v
Promtail (reads log files + Docker container logs)
    |
    v
Loki (stores + indexes logs)
    |
    v
Grafana (queries Loki, renders dashboards)
```

## Logging

The application uses **Pino** for structured JSON logging. See `LOGGING.md` in the project root for full logging documentation.

Key points:

- **Development:** Pretty-printed colored console output
- **Production:** JSON to stdout + rotated log files
- **Request ID:** UUID v4 per request, propagated via `x-request-id` header
- **HTTP logging:** Every request/response is auto-logged
- **Audit logging:** Business events (login, CRUD, role changes) are logged
- **Sensitive data:** Automatically redacted (passwords, tokens, keys)

## Production Checklist

- [ ] Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET` (use `openssl rand -hex 64`)
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS to restrict allowed origins
- [ ] Enable HTTPS via reverse proxy (nginx/Caddy)
- [ ] Use MongoDB authentication (`mongodb://user:pass@host/db`)
- [ ] Configure SMTP credentials for transactional email
- [ ] Review and adjust rate limits for your traffic
- [ ] Set up log rotation and retention
- [ ] Enable monitoring (Grafana + Loki or your preferred stack)
- [ ] Set up health check monitoring/alerting on `/health`
- [ ] Back up MongoDB on a schedule

## Kubernetes Deployment

Kustomize-based manifests are available in `k8s/` with overlays for dev, staging, and production.

```bash
# Preview
kubectl kustomize k8s/overlays/prod

# Deploy
kubectl apply -k k8s/overlays/prod
```

See [`k8s/README.md`](../k8s/README.md) for full setup instructions, environment differences, and MongoDB options.

## Related Docs

- [Architecture](./architecture.md) — System overview and boot sequence
- [Security](./security.md) — Production security recommendations
- [Background Jobs](./background-jobs.md) — Agenda, email, FCM, S3
