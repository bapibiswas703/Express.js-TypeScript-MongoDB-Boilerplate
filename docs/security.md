# Security

This document covers all security measures implemented in the boilerplate.

## Password Policy

Enforced by Joi validation in `src/modules/auth/auth.validation.ts`:

| Rule | Value |
|---|---|
| Minimum length | 8 characters |
| Maximum length | 128 characters |
| Requires lowercase letter | At least one `[a-z]` |
| Requires uppercase letter | At least one `[A-Z]` |
| Requires digit | At least one `[0-9]` |

Passwords are hashed with **bcrypt** (12 salt rounds) before storage. The `password` field uses `select: false` in Mongoose, so it is never returned in API responses.

## Rate Limiting

### Global Rate Limiter

Applied to all `/api` routes:

- **Window:** 15 minutes
- **Max requests:** 100 per IP
- **Headers:** Standard rate-limit headers (`RateLimit-*`)

### Auth Rate Limiter

Applied to `register`, `login`, and `refresh` endpoints:

- **Window:** 15 minutes
- **Max requests:** 20 per IP
- Prevents brute-force and credential-stuffing attacks

## Input Validation & Sanitization

### Joi Validation

Every mutation endpoint uses Joi schemas via the `validate()` middleware:

```typescript
router.post('/register', validate(registerSchema), register);
```

Key features:
- `abortEarly: false` — returns all validation errors, not just the first
- `stripUnknown: true` — removes fields not defined in the schema
- `req.body = value` — replaces the original body with the validated/sanitized version

### ObjectId Validation

The `validateId()` middleware checks that route params are valid MongoDB ObjectIds before they reach the controller:

```typescript
router.get('/:id', validateId(), getDevice);
```

Returns `400 Bad Request` for invalid IDs instead of letting Mongoose throw a `CastError`.

### Email Normalization

Email fields are trimmed and lowercased by Joi (`trim().lowercase()`) to prevent duplicate accounts with different casing.

## Security Headers

`helmet()` sets secure HTTP headers including:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)
- `X-XSS-Protection`
- Content Security Policy
- And more (see [helmet docs](https://helmetjs.github.io/))

## CORS

`cors()` is enabled with default settings (allows all origins). For production, configure allowed origins:

```typescript
app.use(cors({
  origin: ['https://yourdomain.com'],
  credentials: true,
}));
```

## Token Security

### Access Tokens (JWT)
- Short-lived (15 minutes by default)
- Signed with `JWT_SECRET` (must be a strong, random string in production)
- Contains only the user ID — no sensitive data

### Refresh Tokens
- Cryptographically random 80-character hex strings (`crypto.randomBytes(40)`)
- Stored in MongoDB with expiry dates
- Single-use with rotation (old token is revoked when a new one is issued)
- Token reuse detection: if a revoked token is used, ALL tokens for that user are revoked

### Token Reuse Detection

```
1. User logs in → gets refreshToken-A
2. Attacker steals refreshToken-A
3. User refreshes → refreshToken-A is revoked, gets refreshToken-B
4. Attacker tries to use refreshToken-A
5. System detects reuse of revoked token
6. ALL tokens for user are revoked (including refreshToken-B)
7. ALL devices are deactivated
8. User must log in again on all devices
```

## Sensitive Data Protection

### API Response Stripping

Mongoose `toJSON` transforms remove sensitive fields before they reach the client:

| Model | Stripped Fields |
|---|---|
| User | `password`, `__v` |
| Device | `refreshToken`, `__v` |

### Log Sanitization

The Pino logger automatically redacts sensitive fields from log output:

- `password`, `token`, `refreshToken`
- `authorization`, `cookie`, `sessionId`
- `creditCard`, `cvv`, `ssn`
- `apiKey`, `secret`, `privateKey`

### Password Field Selection

The User model's `password` field uses `select: false`. It is only included when explicitly requested:

```typescript
const user = await User.findOne({ email }).select('+password');
```

## Cascade Deletion

When a user is deleted, all associated data is cleaned up:

1. All refresh tokens are revoked (`revoked: true`)
2. All devices are deactivated (`isActive: false`)

This prevents orphaned sessions from persisting after user removal.

## Max Active Devices

Users are limited to 10 active devices/sessions. When the limit is reached, the oldest device is evicted (its refresh token is revoked and the device is deactivated). This limits the attack surface if credentials are compromised.

## Error Handling

- The `authenticate` middleware uses `try/catch` with `next(err)` — never throws synchronously
- The `validate` middleware uses `next(err)` — never throws synchronously
- The global error handler returns standardized error responses without leaking stack traces in production
- Authorization failures return 404 (not 403) for resources to avoid leaking information about other users' data

## Docker Security

The production Dockerfile:
- Uses a multi-stage build (builder + runner)
- Creates a non-root user (`appuser`) to run the application
- Only copies production dependencies (`npm ci --omit=dev`)
- Includes a health check for container orchestration

## Recommendations for Production

Before deploying to production, make sure to:

1. **Set strong secrets:** `JWT_SECRET` and `JWT_REFRESH_SECRET` should be long, random strings
2. **Configure CORS:** Restrict allowed origins to your frontend domain(s)
3. **Enable HTTPS:** Use a reverse proxy (nginx, Caddy) with TLS certificates
4. **Set `NODE_ENV=production`:** This affects Express behavior and error detail
5. **Use MongoDB authentication:** Set username/password in `MONGODB_URI`
6. **Review rate limits:** Adjust limits based on your traffic patterns
7. **Set up monitoring:** Use the included Grafana/Loki stack to watch for anomalies

## Related Docs

- [Auth System](./auth-system.md) — Token lifecycle and authentication flows
- [Device Management](./device-management.md) — Session tracking and device limits
- [Deployment](./deployment.md) — Production deployment guide
