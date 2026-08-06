# Documentation

Welcome to the project documentation. These guides are designed to help developers understand the architecture, systems, and conventions used in this boilerplate so you can start building on it quickly.

## Guides

| Document | Description |
|---|---|
| [Architecture](./architecture.md) | System overview, folder structure, boot sequence, layered pattern, middleware stack |
| [Auth System](./auth-system.md) | JWT access tokens, refresh token rotation, registration, login, logout, token reuse detection |
| [RBAC](./rbac.md) | Roles, permissions, authorization middleware, default roles, adding new permissions |
| [Device Management](./device-management.md) | Session tracking, device lifecycle, max device limit, revoke devices |
| [Security](./security.md) | Password policy, rate limiting, input validation, CORS, sensitive data redaction, cascade deletion |
| [API Reference](./api-reference.md) | All endpoints, request/response format, pagination, error codes, Swagger UI |
| [Adding Modules](./adding-modules.md) | Step-by-step guide to create a new feature module with code examples |
| [Background Jobs](./background-jobs.md) | Agenda job queue, email service, FCM push notifications, S3 file storage |
| [Deployment](./deployment.md) | Local setup, Docker, environment variables, monitoring with Grafana/Loki, production checklist |
| [Features & Checklist](./features.md) | 131 features tracked with Done/Partial/Pending status + suggested improvements |

## Quick Start

```bash
# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets

# Run
npm run dev

# Open
# API:     http://localhost:8000/api
# Swagger: http://localhost:8000/api-docs
# Health:  http://localhost:8000/health
```

## Where to Start

- **New to the project?** Start with [Architecture](./architecture.md) to understand the overall structure.
- **Building a feature?** Follow the [Adding Modules](./adding-modules.md) guide.
- **Setting up auth?** Read [Auth System](./auth-system.md) and [RBAC](./rbac.md).
- **Deploying?** See [Deployment](./deployment.md) and [Security](./security.md).

## Additional Resources

- `CLAUDE.md` — Project instructions for Claude Code AI assistant
- `LOGGING.md` — Detailed logging configuration and usage
- `.env.example` — All available environment variables
- `/api-docs` — Interactive Swagger UI (when server is running)
