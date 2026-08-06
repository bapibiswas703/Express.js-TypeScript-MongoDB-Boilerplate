# Authentication System

The auth system uses short-lived JWT access tokens paired with long-lived, rotating refresh tokens stored in MongoDB. Every auth event (login, register, refresh, logout) also manages the associated device/session record.

## Token Architecture

| Token | Type | Storage | Lifetime | Purpose |
|---|---|---|---|---|
| Access Token | JWT (signed) | Client-side only | 15 minutes | Authenticate API requests |
| Refresh Token | Random hex string (80 chars) | MongoDB `refreshtokens` collection | 7 days | Obtain new access tokens |

Access token lifetime and refresh token lifetime are configured via `JWT_EXPIRES_IN` and `JWT_REFRESH_EXPIRES_IN` environment variables.

## Auth Flows

### Registration

```
POST /api/auth/register
Body: { email, password, name }

1. Validate input (Joi schema — email, password strength, name)
2. Check email uniqueness (409 if duplicate)
3. Assign default "user" role
4. Create user (password auto-hashed by Mongoose pre-save hook)
5. Generate access token (JWT) + refresh token (random hex)
6. Store refresh token in MongoDB with expiry
7. Create device record (parsed from User-Agent header)
8. Queue welcome email (background job)
9. Return { accessToken, refreshToken, user }
```

**Response (201):**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "a1b2c3d4...",
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John",
      "role": "user"
    }
  }
}
```

### Login

```
POST /api/auth/login
Body: { email, password }

1. Validate input
2. Find user by email (with password field selected)
3. Compare password with bcrypt (401 if invalid)
4. Generate access + refresh token pair
5. Create new device record
6. Return { accessToken, refreshToken, user }
```

### Token Refresh (Rotation)

```
POST /api/auth/refresh
Body: { refreshToken }

1. Find refresh token in database
2. If token not found → 401
3. If token was already revoked → TOKEN REUSE DETECTED:
   - Revoke ALL tokens for this user
   - Deactivate ALL devices for this user
   - Return 401
4. If token is expired → 401
5. Revoke old token (mark as revoked, set replacedByToken)
6. Generate new token pair
7. Update existing device record (new refreshToken ref, lastActive, browser, os)
8. Return { accessToken, refreshToken }
```

Token rotation ensures each refresh token is single-use. If a previously revoked token is reused, it indicates the token was stolen, and all sessions are immediately invalidated.

### Logout (Single Session)

```
POST /api/auth/logout
Body: { refreshToken }

1. Find refresh token
2. Mark as revoked
3. Deactivate associated device
4. Return 204
```

### Logout All Devices

```
POST /api/auth/logout-all
Header: Authorization: Bearer <accessToken>

1. Authenticate via JWT
2. Revoke ALL refresh tokens for this user
3. Deactivate ALL devices for this user
4. Return 204
```

### Get Current User

```
GET /api/auth/me
Header: Authorization: Bearer <accessToken>

1. Authenticate via JWT
2. Return user with populated role
```

## How JWT Authentication Works

The `authenticate` middleware (`src/common/middlewares/auth.ts`):

```
1. Extract token from "Authorization: Bearer <token>" header
2. Verify JWT signature and expiry using jsonwebtoken
3. Set req.userId from the decoded payload
4. Call next()
```

If the token is missing, invalid, or expired, a `401 Unauthorized` error is returned.

## Refresh Token Model

Stored in the `refreshtokens` MongoDB collection:

```typescript
{
  token: string;           // Random 80-char hex string (unique)
  user: ObjectId;          // Reference to User
  expiresAt: Date;         // When the token expires
  revoked: boolean;        // Whether the token has been revoked
  revokedAt?: Date;        // When it was revoked
  replacedByToken?: string; // The new token that replaced this one
  userAgent?: string;      // Client user-agent string
  ip?: string;             // Client IP address
  createdAt: Date;         // Auto-managed by Mongoose
}
```

A TTL index automatically deletes expired tokens 7 days after their `expiresAt` date.

## Password Hashing

- Passwords are hashed with **bcrypt** (12 rounds) via a Mongoose `pre('save')` hook
- The `password` field uses `select: false` — it is excluded from queries by default
- To include it, use `findByEmail(email, true)` which adds `.select('+password')`

## Rate Limiting

Auth endpoints have their own rate limiter (separate from the global one):

- **Window:** 15 minutes
- **Max requests:** 20 per IP
- **Applied to:** `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`

## Related Docs

- [Device Management](./device-management.md) — How devices are tracked per session
- [Security](./security.md) — Password policy, rate limiting, input sanitization
- [RBAC](./rbac.md) — How roles and permissions work after authentication
