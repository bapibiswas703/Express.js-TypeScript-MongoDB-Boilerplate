# Role-Based Access Control (RBAC)

The system uses a **hierarchical, scope-aware, multi-role RBAC** model with two distinct role categories. Every permission is built on three dimensions — **Action**, **Resource**, and **Scope** — and users can hold multiple roles simultaneously.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Two Role Categories](#two-role-categories)
- [The Permission Triad](#the-permission-triad)
- [Multi-Role Assignment](#multi-role-assignment)
- [Role Hierarchy (Inheritance)](#role-hierarchy-inheritance)
- [Data Models](#data-models)
- [Default Roles (Seed)](#default-roles-seed)
- [Permission List](#permission-list)
- [Authorization Flow](#authorization-flow)
- [Middleware Reference](#middleware-reference)
- [Route-Level Scope Strategy](#route-level-scope-strategy)
- [Permission Resolution Internals](#permission-resolution-internals)
- [Route Separation Pattern](#route-separation-pattern)
- [Using in Routes](#using-in-routes)
- [Adding New Resources & Permissions](#adding-new-resources--permissions)
- [Adding New Roles](#adding-new-roles)
- [Permission Helpers](#permission-helpers)
- [Safety Guards](#safety-guards)
- [Design Decisions](#design-decisions)
- [Related Files](#related-files)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        APPLICATION                           │
│                                                              │
│   ┌─────────────────────────┐  ┌──────────────────────────┐  │
│   │    FRONTEND ROLES       │  │     BACKEND ROLES        │  │
│   │    (Product Users)      │  │   (Admin Panel Staff)    │  │
│   │                         │  │                          │  │
│   │  customer, vendor,      │  │  superadmin, admin,      │  │
│   │  seller, agent ...      │  │  manager, editor, hr,    │  │
│   │                         │  │  support ...             │  │
│   │  Access: Own data       │  │                          │  │
│   │  Scope: mostly own      │  │  Access: All data        │  │
│   │  UI: App / Website      │  │  Scope: mostly all       │  │
│   │  Multi-role: rare       │  │  UI: Admin Portal        │  │
│   │                         │  │  Multi-role: common      │  │
│   └─────────────────────────┘  └──────────────────────────┘  │
│                                                              │
│   User.roles = [Role, Role, ...]   ← multi-role support     │
│   Role.type  = 'frontend' | 'backend'                       │
│   Role.parent = ObjectId | null    ← hierarchy               │
│   Permission = resource:action:scope                         │
└──────────────────────────────────────────────────────────────┘
```

---

## Two Role Categories

Every role belongs to exactly one category: **frontend** or **backend**.

### Frontend Roles (Product Users)

| Aspect | Details |
|---|---|
| **Who** | People who USE the product — customers, vendors, sellers, agents |
| **Where** | Mobile app, website, storefront, public API |
| **Access pattern** | Their own data only (my orders, my products, my profile) |
| **Permission scope** | Predominantly `own` — interact only with resources they own |
| **Multi-role** | Uncommon — a user is typically a customer OR a vendor, not both |
| **Hierarchy** | Flat — frontend roles don't inherit from each other |
| **Purpose** | Defines what the user **IS** (customer, vendor) |

### Backend Roles (Admin Panel Staff)

| Aspect | Details |
|---|---|
| **Who** | Internal team who MANAGES the platform — admins, editors, HR, support |
| **Where** | Admin panel, dashboard, internal tools |
| **Access pattern** | Other people's data, governed by granular permissions |
| **Permission scope** | Predominantly `all` — manage resources across all users |
| **Multi-role** | Common — a staff member can be both `editor` and `hr` |
| **Hierarchy** | Hierarchical — `admin` inherits from `manager`, etc. |
| **Purpose** | Defines what the user **CAN DO** (manage products, approve leaves) |

### Key Differences

| Aspect | Frontend Role | Backend Role |
|---|---|---|
| Defines | What the user **IS** | What the user **CAN DO** |
| Scope | Mostly `own` | Mostly `all` |
| Hierarchy | Flat (no inheritance) | Hierarchical (parent-child) |
| Multi-role | Single (customer OR vendor) | Multiple (editor AND hr) |
| Route prefix | `/api/*` | `/api/admin/*` |
| Example | customer, vendor, seller | superadmin, admin, manager, editor, hr |

---

## The Permission Triad

Every permission is expressed as three segments:

```
resource : action : scope
  WHAT      HOW     WHERE
```

| Dimension | Description | Values |
|---|---|---|
| **Resource** | The object being accessed | `user`, `role`, `category`, `product`, `device`, `media`, `order`, `store`, etc. |
| **Action** | The operation being performed | `create`, `read`, `update`, `delete` |
| **Scope** | The boundary of access | `own` (only your resources), `all` (any resource) |

### Examples

| Permission | Meaning | Typical Role |
|---|---|---|
| `user:read:own` | Can view own user profile | customer, vendor |
| `user:read:all` | Can view any user's profile | admin, hr |
| `product:create:own` | Can create own products (as vendor) | vendor |
| `product:create:all` | Can create products for anyone | admin, editor |
| `product:update:all` | Can edit any product | admin, editor |
| `media:delete:own` | Can only delete own files | customer, vendor |
| `order:read:own` | Can view own orders | customer |
| `order:read:all` | Can view all orders | admin, manager |
| `role:update:all` | Can update any role | superadmin |

### Scope Semantics

| Scope | Meaning | How Ownership Is Determined |
|---|---|---|
| `own` | Only resources belonging to the requesting user | `req.params.id === req.userId`, or resource's owner field (e.g., `uploadedBy`, `vendorId`, `customerId`) |
| `all` | Unrestricted access to any resource | No ownership check |

**Scope escalation rule:** `all` always supersedes `own`. If a user has both `user:read:own` (from one role or parent) and `user:read:all` (from another role or child), the effective scope is `all`.

---

## Multi-Role Assignment

A user can hold **multiple roles simultaneously**. The effective permission set is the **union** of all assigned roles' permissions, with scope escalation applied across roles.

### Why Multi-Role?

```
Single role:    User → 1 Role
                Staff can be editor OR hr, NOT both  ❌

Multiple roles: User → [Role, Role, ...]
                Staff can be editor AND hr            ✅
                Customer has just [customer]           ✅
```

### Permission Resolution Across Multiple Roles

```
User: John (staff)
Assigned roles: ["editor", "hr"]

editor permissions:                  hr permissions:
  product:read:all                     user:read:all
  product:update:all                   user:create:all
  category:read:all                    attendance:read:all
  category:update:all                  leave:update:all

John's effective permissions = UNION of all roles:
  ├── product:read:all          (from editor)
  ├── product:update:all        (from editor)
  ├── category:read:all         (from editor)
  ├── category:update:all       (from editor)
  ├── user:read:all             (from hr)
  ├── user:create:all           (from hr)
  ├── attendance:read:all       (from hr)
  └── leave:update:all          (from hr)
```

### Scope Escalation Across Roles

When the same `resource:action` appears in multiple roles at different scopes, `all` wins:

```
Role A (editor):  product:read:own
Role B (manager): product:read:all

User has both roles → effective: product:read:all
```

---

## Role Hierarchy (Inheritance)

Roles can optionally inherit from a **parent role**. A child role receives all permissions from its parent (and grandparent, recursively) plus its own additional permissions.

Hierarchy is primarily used by **backend roles**. Frontend roles are typically flat (no parent).

### Backend Role Hierarchy Example

```
superadmin  (parent: admin)     ← adds role management
    │
  admin     (parent: manager)   ← adds user management, escalates scopes
    │
  manager   (parent: editor)    ← adds reporting, order management
    │
  editor    (no parent)         ← base backend role: content management
```

Independent backend roles (no hierarchy):

```
hr       (no parent)   ← standalone: staff & attendance management
support  (no parent)   ← standalone: ticket & customer management
```

### How Inheritance Works

Each role only stores the permissions it **adds beyond** its parent. At runtime, the system walks the chain and merges all permissions:

```
Effective permissions = role's own + parent's effective (recursive)
```

**Example resolution for admin (parent: manager, grandparent: editor):**

```
editor's own:    [product:read:all, product:update:all, category:read:all, ...]
  + manager adds: [order:read:all, report:read:all, product:create:all, ...]
    + admin adds:  [user:read:all, user:create:all, user:delete:all, ...]

Merge with scope escalation (all beats own at each level)

Final effective permissions for admin = union of all three levels
```

### Inheritance + Multi-Role Combined

A user with roles `["manager", "hr"]`:

1. Resolve `manager` → walk chain: manager → editor → merge
2. Resolve `hr` → no parent, just own permissions
3. Union both resolved sets → final effective permissions

---

## Data Models

### Role Model

Stored in the `roles` MongoDB collection:

```typescript
interface IRole extends Document {
  name: string;                // Unique, lowercase (e.g., "admin", "customer")
  type: 'frontend' | 'backend'; // Role category
  description: string;        // Human-readable description
  permissions: string[];       // Array of permission strings (resource:action:scope)
  parent?: Types.ObjectId;     // Reference to parent Role (for inheritance)
  level: number;               // Hierarchy level (0 = base, higher = more access)
  isActive: boolean;           // Whether the role is active (default: true)
  createdAt: Date;
  updatedAt: Date;
}
```

```typescript
const RoleSchema = new Schema<IRole>({
  name:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  type:        { type: String, enum: ['frontend', 'backend'], required: true, default: 'backend' },
  description: { type: String, default: '', trim: true },
  permissions: [{ type: String, trim: true }],
  parent:      { type: Schema.Types.ObjectId, ref: 'Role', default: null },
  level:       { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });
```

### User Model (roles field)

```typescript
// Changed from single role to multi-role
interface IUser extends Document {
  email: string;
  name: string;
  password: string;
  roles: Types.ObjectId[];    // Array of role references (multi-role)
  // ... other fields
}
```

```typescript
const UserSchema = new Schema<IUser>({
  // ...
  roles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
  // ...
});
```

### Express Request Extensions

```typescript
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRoles?: string[];              // Array of role names (e.g., ["editor", "hr"])
      userRoleTypes?: string[];          // Array of role types (e.g., ["backend"])
      userPermissions?: string[];        // Merged effective permissions
      permissionScopes?: Record<string, 'own' | 'all'>; // Resolved scope per resource:action
    }
  }
}
```

---

## Default Roles (Seed)

Seeded on application startup via `src/services/seed.ts`.

### Frontend Roles

#### customer

| Permission | Scope | Notes |
|---|---|---|
| `user:read:own` | own | View own profile |
| `user:update:own` | own | Update own profile |
| `product:read:all` | all | Browse all products |
| `category:read:all` | all | Browse all categories |
| `order:create:own` | own | Place orders |
| `order:read:own` | own | View own orders |
| `device:read:own` | own | View own devices |
| `device:update:own` | own | Rename own devices |
| `device:delete:own` | own | Revoke own sessions |
| `media:read:own` | own | View own uploads |
| `media:create:all` | all | Upload files |
| `media:delete:own` | own | Delete own uploads |

#### vendor

| Permission | Scope | Notes |
|---|---|---|
| `user:read:own` | own | View own profile |
| `user:update:own` | own | Update own profile |
| `product:create:own` | own | List own products |
| `product:read:own` | own | View own products |
| `product:update:own` | own | Edit own products |
| `product:delete:own` | own | Remove own products |
| `category:read:all` | all | Browse all categories |
| `order:read:own` | own | View orders for own products |
| `store:read:own` | own | View own storefront |
| `store:update:own` | own | Manage own storefront |
| `device:read:own` | own | View own devices |
| `device:update:own` | own | Rename own devices |
| `device:delete:own` | own | Revoke own sessions |
| `media:read:own` | own | View own uploads |
| `media:create:all` | all | Upload files |
| `media:delete:own` | own | Delete own uploads |

### Backend Roles

#### editor (base backend role, no parent)

| Permission | Scope | Notes |
|---|---|---|
| `product:read:all` | all | View all products |
| `product:update:all` | all | Edit any product |
| `category:read:all` | all | View all categories |
| `category:update:all` | all | Edit any category |
| `media:read:all` | all | View all uploads |
| `media:create:all` | all | Upload files |
| `media:delete:all` | all | Delete any upload |

#### manager (parent: editor)

Inherits all editor permissions, then adds:

| Permission | Scope | Notes |
|---|---|---|
| `product:create:all` | all | New: create products |
| `product:delete:all` | all | New: delete products |
| `category:create:all` | all | New: create categories |
| `category:delete:all` | all | New: delete categories |
| `order:read:all` | all | New: view all orders |
| `order:update:all` | all | New: manage orders |
| `report:read:all` | all | New: view reports |

**Effective:** editor's 7 + manager's 7 = 14 permissions.

#### hr (standalone, no parent)

| Permission | Scope | Notes |
|---|---|---|
| `user:read:all` | all | View all staff |
| `user:create:all` | all | Onboard new staff |
| `user:update:all` | all | Edit staff profiles |
| `attendance:read:all` | all | View attendance |
| `leave:read:all` | all | View leave requests |
| `leave:update:all` | all | Approve/reject leaves |

#### admin (parent: manager)

Inherits all manager permissions (which include editor), then adds:

| Permission | Scope | Notes |
|---|---|---|
| `user:read:all` | all | New: manage all users |
| `user:create:all` | all | New: create users |
| `user:update:all` | all | New: update any user |
| `user:delete:all` | all | New: delete users |
| `device:read:all` | all | New: view all devices |
| `device:update:all` | all | New: manage devices |
| `device:delete:all` | all | New: revoke devices |
| `settings:read:all` | all | New: view system settings |
| `settings:update:all` | all | New: change settings |

**Effective:** manager's 14 + admin's 9 = 23 permissions.

#### superadmin (parent: admin)

Inherits all admin permissions, then adds:

| Permission | Scope | Notes |
|---|---|---|
| `role:read:all` | all | Only superadmin manages roles |
| `role:create:all` | all | |
| `role:update:all` | all | |
| `role:delete:all` | all | |

**Effective:** admin's 23 + 4 role permissions = 27 total.

### Multi-Role Example

A staff member assigned `["manager", "hr"]`:

```
From manager (includes editor):      From hr:
  product:read:all                      user:read:all
  product:update:all                    user:create:all
  product:create:all                    user:update:all
  product:delete:all                    attendance:read:all
  category:read:all                     leave:read:all
  category:update:all                   leave:update:all
  category:create:all
  category:delete:all
  order:read:all
  order:update:all
  report:read:all
  media:read:all
  media:create:all
  media:delete:all

Effective = UNION → 20 unique permissions
```

### Default Registration

| Registration Method | Default Role | Type |
|---|---|---|
| `POST /api/auth/register` | `customer` | frontend |
| `POST /api/auth/social-login` | `customer` | frontend |
| Admin creates staff user | Assigned by admin (e.g., `editor`) | backend |

---

## Permission List

Defined in `src/common/constants/permissions.ts`.

### User

| Constant | Permission | Description |
|---|---|---|
| `USER_READ_OWN` | `user:read:own` | View own profile |
| `USER_READ_ALL` | `user:read:all` | View any user |
| `USER_CREATE_ALL` | `user:create:all` | Create new users |
| `USER_UPDATE_OWN` | `user:update:own` | Update own profile |
| `USER_UPDATE_ALL` | `user:update:all` | Update any user |
| `USER_DELETE_ALL` | `user:delete:all` | Delete any user |

### Role

| Constant | Permission | Description |
|---|---|---|
| `ROLE_READ_ALL` | `role:read:all` | View roles |
| `ROLE_CREATE_ALL` | `role:create:all` | Create roles |
| `ROLE_UPDATE_ALL` | `role:update:all` | Update roles |
| `ROLE_DELETE_ALL` | `role:delete:all` | Delete roles |

### Category

| Constant | Permission | Description |
|---|---|---|
| `CATEGORY_READ_ALL` | `category:read:all` | View categories |
| `CATEGORY_CREATE_ALL` | `category:create:all` | Create categories |
| `CATEGORY_UPDATE_ALL` | `category:update:all` | Update categories |
| `CATEGORY_DELETE_ALL` | `category:delete:all` | Delete categories |

### Product

| Constant | Permission | Description |
|---|---|---|
| `PRODUCT_READ_OWN` | `product:read:own` | View own products (vendor) |
| `PRODUCT_READ_ALL` | `product:read:all` | View all products |
| `PRODUCT_CREATE_OWN` | `product:create:own` | Create own products (vendor) |
| `PRODUCT_CREATE_ALL` | `product:create:all` | Create any product (admin) |
| `PRODUCT_UPDATE_OWN` | `product:update:own` | Edit own products (vendor) |
| `PRODUCT_UPDATE_ALL` | `product:update:all` | Edit any product |
| `PRODUCT_DELETE_OWN` | `product:delete:own` | Delete own products (vendor) |
| `PRODUCT_DELETE_ALL` | `product:delete:all` | Delete any product |

### Device

| Constant | Permission | Description |
|---|---|---|
| `DEVICE_READ_OWN` | `device:read:own` | View own devices |
| `DEVICE_READ_ALL` | `device:read:all` | View any user's devices |
| `DEVICE_UPDATE_OWN` | `device:update:own` | Update own devices |
| `DEVICE_UPDATE_ALL` | `device:update:all` | Update any device |
| `DEVICE_DELETE_OWN` | `device:delete:own` | Revoke own devices |
| `DEVICE_DELETE_ALL` | `device:delete:all` | Revoke any device |

### Media

| Constant | Permission | Description |
|---|---|---|
| `MEDIA_READ_OWN` | `media:read:own` | View own uploads |
| `MEDIA_READ_ALL` | `media:read:all` | View any uploads |
| `MEDIA_CREATE_ALL` | `media:create:all` | Upload files |
| `MEDIA_DELETE_OWN` | `media:delete:own` | Delete own uploads |
| `MEDIA_DELETE_ALL` | `media:delete:all` | Delete any upload |

### Order (example resource)

| Constant | Permission | Description |
|---|---|---|
| `ORDER_READ_OWN` | `order:read:own` | View own orders |
| `ORDER_READ_ALL` | `order:read:all` | View all orders |
| `ORDER_CREATE_OWN` | `order:create:own` | Place orders |
| `ORDER_UPDATE_ALL` | `order:update:all` | Manage any order |
| `ORDER_DELETE_ALL` | `order:delete:all` | Cancel any order |

---

## Authorization Flow

### Complete Request Lifecycle

```
Request
  │
  ▼
authenticate (JWT)
  │  ✓ Extracts user ID from token
  │  ✓ Sets req.userId
  │
  ▼
authorize('product:update')
  │  1. Fetch user from DB with populated roles[]
  │  2. Filter: only active roles (isActive: true)
  │  3. For EACH role:
  │       a. Walk hierarchy (if parent exists, recursively)
  │       b. Collect all permissions per role
  │  4. Merge ALL roles' permissions (union)
  │  5. Apply scope escalation (all beats own for same resource:action)
  │  6. Match required permission:
  │       - Has 'product:update:all'? → scope = 'all' ✓
  │       - Has 'product:update:own'? → scope = 'own' ✓
  │       - Has neither?             → 403 Forbidden
  │  7. Sets req.userRoles, req.userPermissions, req.permissionScopes
  │
  ▼
enforceScope('id', 'product:update')        ← optional, per route
  │  - scope is 'all'? → pass through
  │  - scope is 'own'? → check req.params.id ownership
  │       match    → pass through
  │       mismatch → 403 "Access denied: insufficient scope"
  │
  ▼
Controller → Service → Repository
```

### Concrete Examples

#### Example 1: Customer views own order

**User:** Sarah (roles: `[customer]`) requests `GET /api/orders/order123`

```
1. authenticate     → userId = "sarah_id"
2. authorize        → role "customer" has order:read:own
                    → permissionScopes = { 'order:read': 'own' }
3. enforceScope     → scope is 'own'
                    → order.customerId === "sarah_id"? ✅ Yes
4. controller       → returns order data
```

#### Example 2: Customer tries to view another's order

**User:** Sarah (roles: `[customer]`) requests `GET /api/orders/bob_order456`

```
1. authenticate     → userId = "sarah_id"
2. authorize        → role "customer" has order:read:own
                    → permissionScopes = { 'order:read': 'own' }
3. enforceScope     → scope is 'own'
                    → order.customerId !== "sarah_id"
                    → ❌ 403 Forbidden
```

#### Example 3: Staff with two roles

**User:** John (roles: `[editor, hr]`) requests `PATCH /api/users/user789`

```
1. authenticate     → userId = "john_id"
2. authorize        → resolve editor: [product:read:all, product:update:all, ...]
                    → resolve hr: [user:read:all, user:create:all, user:update:all, ...]
                    → merge: user:update:all found (from hr)
                    → permissionScopes = { 'user:update': 'all' }
3. enforceScope     → scope is 'all'
                    → ✅ Pass (skip ownership check)
4. controller       → updates user789
```

#### Example 4: Manager inherits editor permissions

**User:** Alice (roles: `[manager]`) requests `PUT /api/products/prod456`

```
1. authenticate     → userId = "alice_id"
2. authorize        → resolve manager:
                       manager's own: [product:create:all, order:read:all, ...]
                       + parent editor: [product:read:all, product:update:all, ...]
                       merged: [product:read:all, product:update:all, product:create:all, ...]
                    → product:update:all found
                    → permissionScopes = { 'product:update': 'all' }
3. controller       → updates product
```

#### Example 5: Vendor scope vs Admin scope

**Vendor** (roles: `[vendor]`) requests `GET /api/products`:

```
authorize → product:read:own → controller filters: { vendorId: req.userId }
→ Returns only vendor's own products
```

**Admin** (roles: `[admin]`) requests `GET /api/products`:

```
authorize → product:read:all → controller: no filter
→ Returns all products
```

---

## Middleware Reference

Located in `src/common/middlewares/`.

### `authenticate` (`auth.ts`)

Extracts and verifies JWT, sets `req.userId`.

```typescript
router.get('/profile', authenticate, handler);
```

### `authorize(...permissions)` (`rbac.ts`)

Checks that the user's resolved permissions (across all roles + hierarchy) include **ALL** required permissions at any scope.

```typescript
// Requires product:read at any scope (own or all)
router.get('/', authenticate, authorize(PERMISSIONS.PRODUCT_READ_OWN), getProducts);

// Requires product:update at any scope
router.patch('/:id', authenticate, authorize(PERMISSIONS.PRODUCT_UPDATE_OWN), updateProduct);
```

**What it does:**

1. Fetches user from DB with populated `roles[]`
2. Filters out inactive roles (`isActive: false`)
3. For each role, resolves effective permissions (walks hierarchy)
4. Merges all permissions across all roles (union + scope escalation)
5. Checks each required permission exists in the merged set
6. Sets `req.userRoles`, `req.userRoleTypes`, `req.userPermissions`, `req.permissionScopes`

### `authorizeRoles(...roleNames)` (`rbac.ts`)

Checks that the user has **any** of the specified role names:

```typescript
router.delete('/:id', authenticate, authorizeRoles('superadmin'), deleteRole);
```

### `requireRoleType(type)` (`rbac.ts`)

Ensures the user has at least one role of the specified type. Used to gate admin panel vs frontend routes:

```typescript
// Admin panel routes: require at least one backend role
router.use('/admin', authenticate, requireRoleType('backend'));

// Frontend routes: require at least one frontend role
router.use('/shop', authenticate, requireRoleType('frontend'));
```

### `enforceScope(paramName, permission)` (`scope.ts`)

Enforces ownership when the resolved scope is `own`:

```typescript
router.get('/:id',
  authenticate,
  authorize(PERMISSIONS.USER_READ_OWN),
  enforceScope('id', 'user:read'),
  getUser
);
```

**Logic:**

- Scope is `all` → pass through (no restriction)
- Scope is `own` → `req.params[paramName]` must equal `req.userId`
- Mismatch → `403 Access denied: insufficient scope`

---

## Route-Level Scope Strategy

### User Routes

| Route | Permission | Scope Enforcement | Behavior |
|---|---|---|---|
| `GET /users` | `user:read` | Controller-level | `all` → returns everyone; `own` → returns only self |
| `GET /users/:id` | `user:read` | `enforceScope('id')` | `all` → any user; `own` → only own profile |
| `PATCH /users/:id` | `user:update` | `enforceScope('id')` | `all` → any user; `own` → only own profile |
| `POST /users/:id/avatar` | `user:update` | `enforceScope('id')` | `all` → any user; `own` → only own avatar |
| `DELETE /users/:id` | `user:delete` | None | Only granted as `all` (admin+) |

### Product Routes

| Route | Permission | Scope Enforcement | Behavior |
|---|---|---|---|
| `GET /products` | `product:read` | Controller-level | `all` → all products; `own` → vendor's products only |
| `GET /products/:id` | `product:read` | `enforceScope('id')` or service-level | `all` → any; `own` → check vendorId |
| `POST /products` | `product:create` | Inherent | `own` → sets vendorId to userId; `all` → admin creates |
| `PATCH /products/:id` | `product:update` | Service-level | `own` → check vendorId; `all` → any |
| `DELETE /products/:id` | `product:delete` | Service-level | `own` → check vendorId; `all` → any |

### Device Routes

| Route | Permission | Scope Enforcement | Behavior |
|---|---|---|---|
| `GET /devices` | `device:read` | Service-level | Already scoped by `req.userId` |
| `GET /devices/:id` | `device:read` | Service-level | Ownership check in service |
| `PATCH /devices/:id` | `device:update` | Service-level | Ownership check in service |
| `DELETE /devices/:id` | `device:delete` | Service-level | Ownership check in service |

### Media Routes

| Route | Permission | Scope Enforcement | Behavior |
|---|---|---|---|
| `POST /media/upload` | `media:create` | Inherent | Always creates as own |
| `GET /media/my` | `media:read` | Inherent | Always filters by userId |
| `GET /media/:id` | `media:read` | Service-level | Ownership check |
| `DELETE /media/:id` | `media:delete` | Service-level | Ownership check (already exists) |

### Shared Resources (no ownership)

| Route | Permission | Scope Enforcement | Notes |
|---|---|---|---|
| Categories CRUD | `category:*:all` | None | Shared resource, no ownership |
| Roles CRUD | `role:*:all` | None | Superadmin only |

---

## Permission Resolution Internals

### Step 1: Resolve Per-Role Permissions (Hierarchy Walk)

```typescript
const resolveRolePermissions = async (role: IRole, depth = 0): Promise<string[]> => {
  if (depth > 5) throw new ApiError(500, 'Role hierarchy too deep');

  let permissions = [...role.permissions];

  if (role.parent) {
    const parentRole = await Role.findById(role.parent);
    if (parentRole && parentRole.isActive) {
      const parentPerms = await resolveRolePermissions(parentRole, depth + 1);
      permissions = mergeWithEscalation(permissions, parentPerms);
    }
  }

  return permissions;
};
```

### Step 2: Merge Across All Roles (Multi-Role Union)

```typescript
const resolveUserPermissions = async (roles: IRole[]): Promise<string[]> => {
  let allPermissions: string[] = [];

  for (const role of roles) {
    if (!role.isActive) continue;
    const rolePerms = await resolveRolePermissions(role);
    allPermissions = mergeWithEscalation(allPermissions, rolePerms);
  }

  return allPermissions;
};
```

### Step 3: Scope Escalation (Merge Logic)

When merging permissions, the highest scope wins for each `resource:action` pair:

```typescript
const mergeWithEscalation = (target: string[], source: string[]): string[] => {
  const map = new Map<string, 'own' | 'all'>();

  for (const perm of [...target, ...source]) {
    const { resource, action, scope } = parsePermission(perm);
    const key = `${resource}:${action}`;
    const existing = map.get(key);
    if (!existing || scope === 'all') {
      map.set(key, scope);
    }
  }

  return Array.from(map.entries()).map(([key, scope]) => `${key}:${scope}`);
};
```

**Example:**

```
Input:
  target = ['user:read:all', 'media:delete:own']
  source = ['user:read:own', 'media:read:own', 'media:delete:own']

Processing:
  'user:read'    → target has 'all', source has 'own'   → 'all' wins
  'media:delete' → both have 'own'                       → stays 'own'
  'media:read'   → only source has 'own'                 → 'own'

Output: ['user:read:all', 'media:delete:own', 'media:read:own']
```

### Step 4: Check Permission & Resolve Scope

```typescript
const checkPermission = (
  effectivePerms: string[],
  required: string
): { granted: boolean; scope?: 'own' | 'all' } => {
  const { resource, action } = parsePermission(required);
  const key = `${resource}:${action}`;

  for (const perm of effectivePerms) {
    const parsed = parsePermission(perm);
    if (`${parsed.resource}:${parsed.action}` === key) {
      return { granted: true, scope: parsed.scope };
    }
  }

  return { granted: false };
};
```

### Circular Reference Detection

Before saving a role with a parent, walk from the proposed parent to the root. If the role being edited appears in the chain, reject:

```typescript
const detectCircularRef = async (roleId: string, newParentId: string): Promise<boolean> => {
  let currentId = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === roleId) return true;       // circular!
    if (visited.has(currentId)) return true;     // already visited
    visited.add(currentId);

    const parent = await Role.findById(currentId).select('parent').lean();
    currentId = parent?.parent?.toString();
  }

  return false;  // no cycle found
};
```

---

## Route Separation Pattern

Frontend and backend routes are separated by prefix and middleware:

```typescript
// src/modules/index.ts

import { Router } from 'express';
import { requireRoleType } from '../common/middlewares/rbac';

const router = Router();
const v1 = Router();

// ─── Public / Frontend Routes ─────────────────────────
// Accessible by frontend roles (customer, vendor)
v1.use('/auth', authRoutes);
v1.use('/users', userRoutes);           // own profile management
v1.use('/products', productRoutes);     // browse / vendor products
v1.use('/categories', categoryRoutes);  // browse
v1.use('/orders', orderRoutes);         // own orders
v1.use('/devices', deviceRoutes);       // own sessions
v1.use('/media', mediaRoutes);          // own uploads

// ─── Admin Panel Routes ──────────────────────────────
// Requires at least one backend role
v1.use('/admin', authenticate, requireRoleType('backend'));
v1.use('/admin/users', adminUserRoutes);       // user management
v1.use('/admin/products', adminProductRoutes); // product management
v1.use('/admin/orders', adminOrderRoutes);     // order management
v1.use('/admin/roles', roleRoutes);            // role management
v1.use('/admin/reports', reportRoutes);        // reporting
v1.use('/admin/settings', settingsRoutes);     // system settings

router.use('/v1', v1);
router.use('/', v1);  // backward compatible
```

**Why separate?**

- Frontend routes have simple scope enforcement (`own` for most operations)
- Admin routes have complex permission checks (`all` scope, granular permissions)
- A vendor calling `/api/admin/users` gets `403 Admin access required` before any permission check
- Clean separation of concerns in route files

---

## Using in Routes

### Frontend Route Example (Customer)

```typescript
import { authenticate } from '../../common/middlewares/auth';
import { authorize } from '../../common/middlewares/rbac';
import { enforceScope } from '../../common/middlewares/scope';
import { PERMISSIONS } from '../../common/constants/permissions';

const router = Router();
router.use(authenticate);

// Browse products (all scope — everyone can browse)
router.get('/', authorize(PERMISSIONS.PRODUCT_READ_OWN), getProducts);

// View single product
router.get('/:id', authorize(PERMISSIONS.PRODUCT_READ_OWN), getProduct);

// Create product (vendor only — scope is 'own', sets vendorId)
router.post('/', authorize(PERMISSIONS.PRODUCT_CREATE_OWN), createProduct);

// Update own product (vendor)
router.patch('/:id',
  authorize(PERMISSIONS.PRODUCT_UPDATE_OWN),
  enforceScope('id', 'product:update'),
  updateProduct
);
```

### Backend Route Example (Admin Panel)

```typescript
import { authenticate } from '../../common/middlewares/auth';
import { authorize, requireRoleType } from '../../common/middlewares/rbac';
import { PERMISSIONS } from '../../common/constants/permissions';

const router = Router();
router.use(authenticate);
router.use(requireRoleType('backend'));

// List all users (admin/hr — scope is 'all')
router.get('/', authorize(PERMISSIONS.USER_READ_ALL), getUsers);

// Create staff user
router.post('/', authorize(PERMISSIONS.USER_CREATE_ALL), createUser);

// Update any user
router.patch('/:id', authorize(PERMISSIONS.USER_UPDATE_ALL), updateUser);

// Delete user
router.delete('/:id', authorize(PERMISSIONS.USER_DELETE_ALL), deleteUser);
```

### Scope-Aware Controller Example

```typescript
const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = parsePagination(req);
    const scope = req.permissionScopes?.['product:read'];

    // own scope → filter by vendorId; all scope → no filter
    const filter = scope === 'own' ? { vendorId: req.userId } : {};

    const { docs, pagination } = await productService.getAll(filter, page, limit);
    sendPaginated(res, docs, pagination);
  } catch (err) {
    next(err);
  }
};
```

---

## Adding New Resources & Permissions

### Step 1: Define Permission Constants

Add to `src/common/constants/permissions.ts`:

```typescript
export const PERMISSIONS = {
  // ... existing permissions

  // Invoice
  INVOICE_READ_OWN:    'invoice:read:own',
  INVOICE_READ_ALL:    'invoice:read:all',
  INVOICE_CREATE_OWN:  'invoice:create:own',
  INVOICE_CREATE_ALL:  'invoice:create:all',
  INVOICE_UPDATE_ALL:  'invoice:update:all',
  INVOICE_DELETE_ALL:  'invoice:delete:all',
} as const;
```

### Step 2: Update Seed Roles

In `src/services/seed.ts`, add permissions to the appropriate roles:

```typescript
// Frontend: customer gets own scope
{ name: 'customer', type: 'frontend', permissions: [
    ...existing,
    PERMISSIONS.INVOICE_READ_OWN,
    PERMISSIONS.INVOICE_CREATE_OWN,
  ],
}

// Backend: admin gets all scope
{ name: 'admin', type: 'backend', parent: managerRoleId, permissions: [
    ...existing,
    PERMISSIONS.INVOICE_READ_ALL,
    PERMISSIONS.INVOICE_UPDATE_ALL,
    PERMISSIONS.INVOICE_DELETE_ALL,
  ],
}
```

### Step 3: Apply in Routes

```typescript
// Frontend route: customer views own invoices
router.get('/', authorize(PERMISSIONS.INVOICE_READ_OWN), getInvoices);
router.get('/:id',
  authorize(PERMISSIONS.INVOICE_READ_OWN),
  enforceScope('id', 'invoice:read'),
  getInvoice
);

// Admin route: admin views all invoices
router.get('/admin/invoices', authorize(PERMISSIONS.INVOICE_READ_ALL), getAllInvoices);
```

### Step 4: Handle Scope in Controller

```typescript
const getInvoices = async (req, res, next) => {
  const scope = req.permissionScopes?.['invoice:read'];
  const filter = scope === 'own' ? { customerId: req.userId } : {};
  const invoices = await invoiceService.getAll(filter, page, limit);
  sendPaginated(res, invoices.docs, invoices.pagination);
};
```

---

## Adding New Roles

### Adding a Frontend Role

```typescript
// Example: adding an "agent" role (real estate agent, sales agent)
{
  name: 'agent',
  type: 'frontend',
  description: 'Sales agent who manages listings and client interactions',
  permissions: [
    'user:read:own',
    'user:update:own',
    'listing:create:own',
    'listing:read:own',
    'listing:update:own',
    'listing:delete:own',
    'client:read:own',
    'appointment:create:own',
    'appointment:read:own',
    'device:read:own',
    'device:update:own',
    'device:delete:own',
    'media:read:own',
    'media:create:all',
    'media:delete:own',
  ],
  parent: null,
  level: 0,
}
```

### Adding a Backend Role

```typescript
// Example: adding a "support" role
{
  name: 'support',
  type: 'backend',
  description: 'Customer support staff — handles tickets and customer issues',
  permissions: [
    'user:read:all',
    'order:read:all',
    'order:update:all',
    'ticket:read:all',
    'ticket:update:all',
    'ticket:create:all',
    'refund:create:all',
    'refund:read:all',
  ],
  parent: null,  // standalone, no inheritance
  level: 0,
}
```

### Adding a Backend Role with Hierarchy

```typescript
// Example: "senior-editor" inherits from "editor" and adds publishing
{
  name: 'senior-editor',
  type: 'backend',
  description: 'Can do everything editor does, plus publish and feature content',
  permissions: [
    'content:publish:all',
    'content:feature:all',
    'content:delete:all',
  ],
  parent: editorRoleId,  // inherits editor's permissions
  level: 1,
}
```

> **Note:** Existing roles in the database won't automatically get new permissions. You can either:
> - Delete the role documents and let the seeder recreate them
> - Use the Role CRUD API to update permissions manually
> - Write a migration script

---

## Permission Helpers

Utility functions in `src/common/constants/permissions.ts`:

### `parsePermission(permission)`

Breaks a permission string into its three components:

```typescript
parsePermission('user:read:all');
// → { resource: 'user', action: 'read', scope: 'all' }

parsePermission('product:create:own');
// → { resource: 'product', action: 'create', scope: 'own' }
```

### `hasPermission(userPermissions, required)`

Checks if a set of permissions satisfies a requirement, resolving scope:

```typescript
hasPermission(['user:read:own', 'product:read:all'], 'user:read');
// → { granted: true, scope: 'own' }

hasPermission(['user:read:all'], 'user:read');
// → { granted: true, scope: 'all' }

hasPermission(['product:read:all'], 'user:read');
// → { granted: false }
```

### `getEffectiveScope(permissions, resourceAction)`

Returns the highest scope for a given resource:action:

```typescript
getEffectiveScope(['user:read:own', 'user:read:all'], 'user:read');
// → 'all'

getEffectiveScope(['media:delete:own'], 'media:delete');
// → 'own'

getEffectiveScope([], 'order:read');
// → null (no permission)
```

---

## Safety Guards

| Guard | Rule | Implementation |
|---|---|---|
| **Max hierarchy depth** | Capped at 5 levels | `resolveRolePermissions()` throws at depth > 5 |
| **Circular reference** | Detected on create/update | Walk from proposed parent to root; reject if role being edited is found |
| **Inactive parent** | Inherited permissions excluded | `resolveRolePermissions()` skips inactive parents |
| **Inactive role** | Entire role excluded | `authorize()` filters out inactive roles before merging |
| **Role type mismatch** | `requireRoleType()` gates routes | Admin routes reject frontend roles, vice versa |
| **Empty roles array** | Rejected | `authorize()` returns 403 if user has no active roles |

---

## Design Decisions

### Why Two Role Categories (Frontend + Backend)?

Frontend and backend users have fundamentally different access patterns:

- A **customer** operates on their own data — they don't need a permission matrix, they just need `own` scope
- An **admin** operates on everyone's data — they need granular permissions to control what they can manage

Separating them prevents confusion (a customer can't accidentally access admin routes) and keeps each side's logic clean.

### Why Multi-Role Instead of Single Role?

In real organizations, responsibilities overlap:

- A **staff member** might handle both content editing (editor) and employee management (hr)
- Single role forces you to create a combined "editor-hr" role for every combination
- Multi-role lets you compose access: assign `[editor, hr]` and permissions merge automatically

### Why Scope Instead of Separate Permissions?

Without scope:
```
user:read-own    ← read own profile
user:read-all    ← read all users
```

With scope:
```
user:read:own    ← programmatically related to user:read:all
```

Scope as a first-class concept enables generic middleware (`enforceScope`) that works for any resource without custom code per endpoint.

### Why Hierarchy Instead of Flat Roles?

Without hierarchy:
- Adding `invoice:read:all` to `manager` requires also adding it to `admin` and `superadmin`
- 3 updates for 1 change, easy to forget one

With hierarchy:
- Add to `manager` → `admin` (parent: manager) inherits it automatically
- Single source of truth per access level

### Why `all` Supersedes `own`?

A child role should only **escalate** access, never restrict what the parent grants. If `editor` has `media:read:own` and `manager` (child of editor) adds `media:read:all`, the effective scope must be `all`. Otherwise the manager would have less access than the editor they inherit from.

The same applies across multi-role merging: if any role grants `all`, the effective scope is `all`.

---

## Related Files

| File | Purpose |
|---|---|
| `src/common/constants/permissions.ts` | Permission constants, resources, actions, scopes, helper functions |
| `src/common/middlewares/rbac.ts` | `authorize()`, `authorizeRoles()`, `requireRoleType()` middleware |
| `src/common/middlewares/scope.ts` | `enforceScope()` middleware |
| `src/common/middlewares/auth.ts` | `authenticate()` middleware, Express Request type extensions |
| `src/modules/role/role.model.ts` | Role Mongoose model with `type`, `parent`, and `level` |
| `src/modules/role/role.service.ts` | Role CRUD, circular ref detection, `resolvePermissions()` |
| `src/modules/role/role.validation.ts` | Joi schemas with `type`, `parent` validation |
| `src/modules/user/user.model.ts` | User model with `roles: [ObjectId]` |
| `src/services/seed.ts` | Default role seeding (frontend + backend, with hierarchy) |

## Related Docs

- [Auth System](./auth-system.md) — How authentication works before RBAC kicks in
- [Adding Modules](./adding-modules.md) — Includes permission setup for new modules
- [Security](./security.md) — Overall security architecture
