# API Reference

All API routes are prefixed with `/api`. Interactive documentation is available at `/api-docs` (Swagger UI) when the server is running.

## Response Format

### Success Response

```json
{
  "success": true,
  "statusCode": 200,
  "code": "SUCCESS",
  "message": "Success",
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "statusCode": 400,
  "code": "INTERNAL_SERVER_ERROR",
  "message": "Validation failed",
  "errors": ["\"email\" is required", "\"password\" must be at least 8 characters"],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Paginated Response

```json
{
  "success": true,
  "statusCode": 200,
  "code": "SUCCESS",
  "message": "Success",
  "data": {
    "docs": [ ... ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "pages": 5
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### No Content Response

`204` status with an empty body (used for delete and logout operations).

## Pagination

Paginated endpoints accept these query parameters:

| Param | Default | Min | Max | Description |
|---|---|---|---|---|
| `page` | 1 | 1 | - | Page number |
| `limit` | 10 | 1 | 100 | Items per page |

Example: `GET /api/users?page=2&limit=25`

## Authentication

Protected routes require the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

## Endpoints

### Health Check

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Returns `{ status: "ok" }` |

### Auth

| Method | Path | Auth | Rate Limited | Description |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | Yes (20/15min) | Register a new user |
| POST | `/api/auth/login` | No | Yes (20/15min) | Login with email + password |
| POST | `/api/auth/refresh` | No | Yes (20/15min) | Refresh tokens |
| POST | `/api/auth/logout` | No | No | Revoke a refresh token |
| POST | `/api/auth/logout-all` | Yes | No | Revoke all refresh tokens |
| GET | `/api/auth/me` | Yes | No | Get current user |

**Register:**
```json
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "MyPassword123",
  "name": "John Doe"
}
```

**Login:**
```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "MyPassword123"
}
```

**Refresh:**
```json
POST /api/auth/refresh
{
  "refreshToken": "a1b2c3d4..."
}
```

**Logout:**
```json
POST /api/auth/logout
{
  "refreshToken": "a1b2c3d4..."
}
```

### Users

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/api/users` | Yes | `user:read` | List users (paginated) |
| GET | `/api/users/:id` | Yes | `user:read` | Get user by ID |
| PATCH | `/api/users/:id` | Yes | `user:update` | Update user |
| DELETE | `/api/users/:id` | Yes | `user:delete` | Delete user |

**Update User:**
```json
PATCH /api/users/:id
{
  "name": "New Name",
  "email": "new@example.com"
}
```

### Roles

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/api/roles` | Yes | `role:read` | List roles (paginated) |
| GET | `/api/roles/:id` | Yes | `role:read` | Get role by ID |
| POST | `/api/roles` | Yes | `role:create` | Create role |
| PATCH | `/api/roles/:id` | Yes | `role:update` | Update role |
| DELETE | `/api/roles/:id` | Yes | `role:delete` | Delete role |
| GET | `/api/roles/permissions` | Yes | `role:read` | List all available permissions |

**Create Role:**
```json
POST /api/roles
{
  "name": "editor",
  "description": "Can manage content",
  "permissions": ["category:read", "category:create", "product:read", "product:create"]
}
```

### Categories

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/api/categories` | Yes | `category:read` | List categories (paginated) |
| GET | `/api/categories/:id` | Yes | `category:read` | Get category by ID |
| POST | `/api/categories` | Yes | `category:create` | Create category |
| PATCH | `/api/categories/:id` | Yes | `category:update` | Update category |
| DELETE | `/api/categories/:id` | Yes | `category:delete` | Delete category |

### Products

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/api/products` | Yes | `product:read` | List products (paginated + filtered) |
| GET | `/api/products/:id` | Yes | `product:read` | Get product by ID |
| POST | `/api/products` | Yes | `product:create` | Create product |
| PATCH | `/api/products/:id` | Yes | `product:update` | Update product |
| DELETE | `/api/products/:id` | Yes | `product:delete` | Delete product |

**Product Filtering:**
```
GET /api/products?category=<categoryId>&minPrice=10&maxPrice=100&search=keyword
```

### Devices

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/api/devices` | Yes | `device:read` | List active devices |
| GET | `/api/devices/:id` | Yes | `device:read` | Get device by ID |
| PATCH | `/api/devices/:id` | Yes | `device:update` | Rename a device |
| DELETE | `/api/devices/:id` | Yes | `device:delete` | Revoke a device |
| DELETE | `/api/devices/revoke-others` | Yes | `device:delete` | Revoke all other devices |

**Revoke Others:**
```
DELETE /api/devices/revoke-others?currentDeviceId=<deviceId>
```

## Common Error Codes

| Status | Meaning | When |
|---|---|---|
| 400 | Bad Request | Validation failed, invalid ID format |
| 401 | Unauthorized | Missing/invalid/expired token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist or doesn't belong to user |
| 409 | Conflict | Duplicate resource (email, role name, category name) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

## Swagger UI

Access interactive API documentation at:

- **Swagger UI:** `http://localhost:8000/api-docs`
- **OpenAPI JSON:** `http://localhost:8000/api-docs.json`

## Related Docs

- [Auth System](./auth-system.md) — Detailed auth flow descriptions
- [RBAC](./rbac.md) — How permissions work
- [Device Management](./device-management.md) — Device endpoints in detail
