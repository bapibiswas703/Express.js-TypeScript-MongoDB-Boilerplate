# Device / Session Management

The device module tracks active login sessions. Every login or registration creates a device record linked to a refresh token. Users can view, rename, and revoke their devices.

## How Devices Are Created

A device is automatically created when a user:

- **Registers** — `POST /api/auth/register`
- **Logs in** — `POST /api/auth/login`

The system parses the `User-Agent` header to extract:

| Field | Example | Source |
|---|---|---|
| `deviceName` | `Chrome on Windows` | `{browser} on {os}` |
| `deviceType` | `desktop`, `mobile`, `tablet` | UA parser |
| `browser` | `Chrome 120` | `browser.name + browser.major` |
| `os` | `Windows 11` | `os.name + os.version` |
| `ip` | `192.168.1.1` | `req.ip` |

User-Agent parsing is handled by `ua-parser-js` v2 in `src/common/utils/parseUserAgent.ts`.

## Device Lifecycle

```
Login/Register
    |
    v
Device Created (isActive: true, linked to refreshToken)
    |
    +-- Token Refresh --> Device updated (new refreshToken ref, lastActive, browser, os)
    |
    +-- Logout --> Device deactivated (isActive: false)
    |
    +-- Delete Device --> Refresh token revoked + device deactivated
    |
    +-- Revoke Others --> All other devices deactivated + their tokens revoked
    |
    +-- Logout All --> All devices deactivated + all tokens revoked
    |
    +-- Delete User --> Cascade: all tokens revoked + all devices deactivated
```

## Max Active Devices

Each user is limited to **10 active devices**. When the limit is reached, the **oldest device** (by `lastActive`) is automatically evicted:

1. Its refresh token is revoked
2. The device is deactivated

This happens transparently during login — the user is not notified.

The limit is defined as `MAX_ACTIVE_DEVICES = 10` in `src/modules/auth/auth.service.ts`.

## Device Model

Stored in the `devices` MongoDB collection:

```typescript
{
  user: ObjectId;          // Reference to User
  refreshToken: ObjectId;  // Reference to RefreshToken (hidden from API)
  deviceName: string;      // "Chrome on Windows" (editable by user)
  deviceType: string;      // "desktop", "mobile", "tablet", "unknown"
  browser: string;         // "Chrome 120"
  os: string;              // "Windows 11"
  ip: string;              // Client IP address
  lastActive: Date;        // Last activity timestamp
  isActive: boolean;       // Whether the session is still active
  createdAt: Date;
  updatedAt: Date;
}
```

The `refreshToken` field is stripped from API responses via a `toJSON` transform.

Indexes:
- `{ user: 1, isActive: 1 }` — efficient queries for active devices per user
- `{ refreshToken: 1 }` — fast lookup when updating devices during token refresh

## API Endpoints

All device endpoints require authentication. Permissions: `device:read`, `device:update`, `device:delete`.

### List Devices

```
GET /api/devices
Authorization: Bearer <accessToken>

Returns all active devices for the authenticated user, sorted by lastActive (newest first).
```

### Get Device

```
GET /api/devices/:id
Authorization: Bearer <accessToken>

Returns a specific device. Returns 404 if the device doesn't belong to the user.
```

### Rename Device

```
PATCH /api/devices/:id
Authorization: Bearer <accessToken>
Body: { "deviceName": "My Work Laptop" }

Updates the device name. Useful for users to identify their sessions.
```

### Revoke Device

```
DELETE /api/devices/:id
Authorization: Bearer <accessToken>

1. Revokes the device's refresh token
2. Deactivates the device
3. Returns 204

The session associated with this device can no longer refresh its tokens.
```

### Revoke All Other Devices

```
DELETE /api/devices/revoke-others?currentDeviceId=<id>
Authorization: Bearer <accessToken>

1. Finds all active devices except the one specified by currentDeviceId
2. Revokes all their refresh tokens
3. Deactivates all of them
4. Returns { revokedCount: N }

This is the "sign out everywhere else" feature.
```

## Ownership Check

All device operations verify that the device belongs to the authenticated user:

```typescript
if (device.user.toString() !== userId) {
  throw new ApiError(404, 'Device not found');
}
```

A 404 is returned (not 403) to avoid leaking information about other users' devices.

## Related Docs

- [Auth System](./auth-system.md) — Token lifecycle that drives device creation
- [Security](./security.md) — Rate limiting and input validation
