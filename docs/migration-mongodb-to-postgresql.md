# Migration Plan: MongoDB to PostgreSQL

This document outlines every change required to migrate the codebase from MongoDB (Mongoose) to PostgreSQL, organized by area of impact.

## 1. Dependency Changes

### Remove

| Package                       | Purpose                     |
| ----------------------------- | --------------------------- |
| `mongoose`                    | MongoDB ODM                 |
| `mongodb-memory-server` (dev) | In-memory MongoDB for tests |
| `agenda`                      | MongoDB-backed job queue    |
| `@agendajs/mongo-backend`     | Agenda storage backend      |

### Add

| Package                            | Purpose                                         |
| ---------------------------------- | ----------------------------------------------- |
| `prisma` (dev)                     | Schema management, migrations, type generation  |
| `@prisma/client`                   | Type-safe PostgreSQL query client               |
| `pgboss`                           | PostgreSQL-native background job queue          |
| `pg`                               | Node.js PostgreSQL driver (peer dep)            |
| `@testcontainers/postgresql` (dev) | Dockerized PostgreSQL for tests (or use SQLite) |

### Install Commands

```bash
# Remove MongoDB packages
npm uninstall mongoose agenda @agendajs/mongo-backend
npm uninstall -D mongodb-memory-server

# Add PostgreSQL packages
npm install @prisma/client pgboss pg
npm install -D prisma @testcontainers/postgresql
npx prisma init
```

---

## 2. Database Connection

**File:** `src/services/Database.ts`

### Before (MongoDB)

```typescript
import mongoose from 'mongoose';
await mongoose.connect(config.database.uri);
```

### After (PostgreSQL + Prisma)

```typescript
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
await prisma.$connect();
```

### Config Change (`src/config/index.ts`)

```typescript
// Before
database: {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/demo',
}

// After
database: {
  url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/demo',
}
```

### Graceful Shutdown (`src/app.ts`)

```typescript
// Before
await mongoose.disconnect();

// After
await prisma.$disconnect();
```

---

## 3. Models to Prisma Schema

Every `*.model.ts` file is replaced by a centralized `prisma/schema.prisma` file.

### Before (Mongoose — `user.model.ts`)

```typescript
import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: ObjectId;
  deletedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.pre('save', async function () {
  /* hash password */
});
userSchema.pre(/^find/, function () {
  /* exclude soft-deleted */
});

export default model<IUser>('User', userSchema);
```

### After (Prisma — `prisma/schema.prisma`)

```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  roleId    String
  role      Role     @relation(fields: [roleId], references: [id])
  deletedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  devices   Device[]

  @@index([email])
  @@index([deletedAt])
}

model Role {
  id          String   @id @default(uuid())
  name        String   @unique
  permissions String[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       User[]
}
```

### Key Differences

| MongoDB (Mongoose)             | PostgreSQL (Prisma)                        |
| ------------------------------ | ------------------------------------------ |
| `ObjectId` (24-char hex)       | `UUID` or auto-increment `Int`             |
| `ref: 'Role'` + `.populate()`  | `@relation` + `include: { role: true }`    |
| `Schema.pre('save')` hooks     | Prisma middleware or `$extends`            |
| `select: false` on password    | Query-level: `select: { password: false }` |
| `$text` index for search       | PostgreSQL `tsvector` or `ILIKE` queries   |
| Schema-level soft delete hooks | Prisma middleware to filter `deletedAt`    |
| Embedded documents / subdocs   | Separate tables with relations             |
| `Schema.index()`               | `@@index()` in Prisma schema               |

### All Models to Convert

| Mongoose Model                | Prisma Model                   |
| ----------------------------- | ------------------------------ |
| `user.model.ts`               | `User`                         |
| `role.model.ts` (via `auth/`) | `Role`                         |
| `refresh-token.model.ts`      | `RefreshToken`                 |
| `category.model.ts`           | `Category`                     |
| `product.model.ts`            | `Product`                      |
| `device.model.ts`             | `Device`                       |
| `media.model.ts`              | `Media`                        |
| `ip-blocklist.model.ts`       | `BlockedIp`                    |
| `dead-letter.model.ts`        | Handled by `pgboss` (built-in) |

---

## 4. Base Repository

**File:** `src/common/repositories/base.repository.ts`

The generic CRUD repository pattern stays but the implementation changes entirely.

### Before (Mongoose)

```typescript
export class BaseRepository<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data as T);
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  async find(filter, options): Promise<T[]> {
    return this.model.find(filter).sort().skip().limit().exec();
  }

  async paginate(filter, page, limit, sort) {
    // skip-based offset pagination
  }

  async cursorPaginate(filter, cursor, limit, sort) {
    // ObjectId-based cursor pagination
  }
}
```

### After (Prisma)

```typescript
import { PrismaClient } from '@prisma/client';

export class BaseRepository<T> {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly model: string,
  ) {}

  private get delegate() {
    return (this.prisma as Record<string, unknown>)[this.model];
  }

  async create(data: Partial<T>): Promise<T> {
    return this.delegate.create({ data });
  }

  async findById(id: string, select?: Record<string, boolean>): Promise<T | null> {
    return this.delegate.findUnique({ where: { id }, select });
  }

  async find(
    where = {},
    options: { skip?: number; take?: number; orderBy?: object; select?: object } = {},
  ): Promise<T[]> {
    return this.delegate.findMany({ where, ...options });
  }

  async count(where = {}): Promise<number> {
    return this.delegate.count({ where });
  }

  async paginate(where = {}, page: number, limit: number, orderBy?: object) {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.find(where, { skip, take: limit, orderBy }),
      this.count(where),
    ]);
    return { docs, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async cursorPaginate(where = {}, cursor: string | undefined, limit: number, orderBy?: object) {
    const args: Record<string, unknown> = { where, take: limit + 1, orderBy };
    if (cursor) {
      args.cursor = { id: cursor };
      args.skip = 1; // skip the cursor itself
    }
    const docs = await this.delegate.findMany(args);
    const hasMore = docs.length > limit;
    if (hasMore) docs.pop();
    const nextCursor = hasMore && docs.length > 0 ? docs[docs.length - 1].id : null;
    return { docs, pagination: { limit, hasMore, nextCursor } };
  }

  async updateById(id: string, data: Partial<T>): Promise<T | null> {
    return this.delegate.update({ where: { id }, data });
  }

  async deleteById(id: string): Promise<T | null> {
    return this.delegate.delete({ where: { id } });
  }
}
```

---

## 5. Module Repositories

Each module's custom queries need rewriting.

### Product Repository

```typescript
// Before (Mongoose)
buildFilter(query) {
  const filter = {};
  if (query.category) filter.category = query.category;
  if (query.search) filter.$text = { $search: query.search };
  if (query.minPrice) filter.price = { $gte: query.minPrice };
  return filter;
}

// After (Prisma)
buildFilter(query) {
  const where: Prisma.ProductWhereInput = {};
  if (query.category) where.categoryId = query.category;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.minPrice || query.maxPrice) {
    where.price = {};
    if (query.minPrice) where.price.gte = query.minPrice;
    if (query.maxPrice) where.price.lte = query.maxPrice;
  }
  return where;
}
```

### User Repository — Populate → Include

```typescript
// Before (Mongoose)
await User.findById(id).populate('role');

// After (Prisma)
await prisma.user.findUnique({
  where: { id },
  include: { role: true },
});
```

### Device Repository — updateMany

```typescript
// Before (Mongoose)
await this.model.updateMany({ user: userId, isActive: true }, { isActive: false });

// After (Prisma)
await prisma.device.updateMany({
  where: { userId, isActive: true },
  data: { isActive: false },
});
```

---

## 6. Background Jobs

Replace Agenda (MongoDB-backed) with pgboss (PostgreSQL-backed).

**Files affected:** `src/common/queues/*`

### Before (Agenda)

```typescript
import Agenda from 'agenda';
const agenda = new Agenda({ mongo: mongoConnection });

agenda.define('send-email', async (job) => {
  await sendEmail(job.attrs.data);
});

await agenda.every('1 hour', 'cleanup-expired');
await agenda.start();
```

### After (pgboss)

```typescript
import PgBoss from 'pg-boss';
const boss = new PgBoss(config.database.url);

await boss.work('send-email', async (job) => {
  await sendEmail(job.data);
});

await boss.schedule('cleanup-expired', '0 * * * *'); // cron syntax
await boss.start();
```

### Dead Letter Queue

pgboss has built-in dead letter handling — the `dead-letter.model.ts` and `dead-letter.handler.ts` can be simplified or removed.

```typescript
// pgboss handles retries and dead letters natively
await boss.send('send-email', payload, {
  retryLimit: 3,
  retryDelay: 30, // seconds
  retryBackoff: true, // exponential
  expireInMinutes: 15,
  deadLetter: 'failed-jobs', // auto-moves to this queue on final failure
});
```

---

## 7. Seed Script

**File:** `src/services/seed.ts`

```typescript
// Before (Mongoose)
const existing = await Role.findOne({ name: 'superadmin' });
if (!existing) await Role.create({ name: 'superadmin', permissions: [...] });

// After (Prisma)
await prisma.role.upsert({
  where: { name: 'superadmin' },
  update: {},
  create: { name: 'superadmin', permissions: [...] },
});
```

---

## 8. Validation Changes

**Files:** all `*.validation.ts` files

```typescript
// Before — MongoDB ObjectId validation
id: Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .required();

// After — UUID validation
id: Joi.string().uuid().required();

// Or if using integer IDs
id: Joi.number().integer().positive().required();
```

**File:** `src/common/middlewares/validateId.ts`

```typescript
// Before
import mongoose from 'mongoose';
if (!mongoose.Types.ObjectId.isValid(id)) { ... }

// After
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_REGEX.test(id)) { ... }
```

---

## 9. Middleware Changes

### Error Handler (`src/common/middlewares/error.ts`)

```typescript
// Before — MongoDB duplicate key error
if ((err as Error & { code?: number }).code === 11000) {
  sendError(res, 'Duplicate field value', 409, 'DUPLICATE_ERROR');
}

// After — PostgreSQL unique constraint violation
if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
  const field = (err.meta?.target as string[])?.join(', ') || 'field';
  sendError(res, `Duplicate value for ${field}`, 409, 'DUPLICATE_ERROR');
}
```

### Error Logger (`src/common/logger/middleware/error-logger.ts`)

Update error categorization:

- Remove: `MongoServerError`, `MongoError`
- Add: `PrismaClientKnownRequestError`, `PrismaClientValidationError`

---

## 10. Test Setup

**Files:** `tests/setup/*`

### Before (MongoMemoryServer)

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
let mongod: MongoMemoryServer;

export const connectTestDb = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

export const clearTestDb = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};
```

### After — Option A: Testcontainers (recommended)

```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let container;
let prisma: PrismaClient;

export const connectTestDb = async () => {
  container = await new PostgreSqlContainer('postgres:17').start();
  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;
  execSync(`npx prisma migrate deploy`, { env: { ...process.env, DATABASE_URL: url } });
  prisma = new PrismaClient();
  await prisma.$connect();
};

export const clearTestDb = async () => {
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
  }
};

export const closeTestDb = async () => {
  await prisma.$disconnect();
  await container.stop();
};
```

### After — Option B: SQLite (simpler, less accurate)

```typescript
// In prisma/schema.test.prisma — override datasource
datasource db {
  provider = "sqlite"
  url      = "file::memory:"
}
```

### jest.setup.ts

```typescript
// Before — mock Agenda
jest.mock('agenda');
jest.mock('@agendajs/mongo-backend');

// After — mock pgboss
jest.mock('pg-boss');
```

---

## 11. Docker

**File:** `docker/docker-compose.yml`

```yaml
# Before
services:
  mongodb:
    image: mongo:8
    ports:
      - 27017:27017

# After
services:
  postgres:
    image: postgres:17-alpine
    ports:
      - 5432:5432
    environment:
      POSTGRES_DB: demo
      POSTGRES_USER: demo
      POSTGRES_PASSWORD: demo
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U demo']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

---

## 12. CI Workflow

**File:** `.github/workflows/ci.yml`

```yaml
# Before
services:
  mongodb:
    image: mongo:8
    ports:
      - 27017:27017
    options: >-
      --health-cmd "mongosh --eval 'db.adminCommand({ping:1})' --quiet"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
env:
  MONGODB_URI: mongodb://localhost:27017/test

# After
services:
  postgres:
    image: postgres:17
    ports:
      - 5432:5432
    env:
      POSTGRES_DB: test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    options: >-
      --health-cmd "pg_isready -U test"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
env:
  DATABASE_URL: postgresql://test:test@localhost:5432/test

# Add before tests:
- run: npx prisma migrate deploy
```

---

## 13. Environment Variables

**File:** `.env.example`

```env
# Before
MONGODB_URI=mongodb://localhost:27017/demo

# After
DATABASE_URL=postgresql://user:password@localhost:5432/demo
```

---

## 14. New Commands

Add to `package.json` scripts:

```json
{
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:migrate:deploy": "prisma migrate deploy",
  "prisma:studio": "prisma studio",
  "prisma:seed": "prisma db seed",
  "postinstall": "prisma generate"
}
```

---

## 15. Files That Do NOT Change

These remain identical regardless of database:

| File / Directory                              | Reason                                      |
| --------------------------------------------- | ------------------------------------------- |
| `src/common/utils/ApiError.ts`                | Database-agnostic error class               |
| `src/common/utils/ApiResponse.ts`             | Response format helpers                     |
| `src/common/utils/pagination.ts`              | Query parsing logic (not DB-specific)       |
| `src/common/logger/*`                         | Entire Pino logging system                  |
| `src/common/middlewares/validate.ts`          | Joi validation (request-level)              |
| `src/common/middlewares/upload.ts`            | Multer file upload                          |
| `src/common/middlewares/auth.ts`              | JWT verification (only calls repository)    |
| `src/common/middlewares/rbac.ts`              | Permission checking (only calls repository) |
| `src/common/services/email.service.ts`        | Nodemailer SMTP                             |
| `src/common/services/notification.service.ts` | Firebase FCM                                |
| `src/common/services/s3.service.ts`           | AWS S3 operations                           |
| `src/common/services/sms.service.ts`          | Twilio SMS                                  |
| `src/services/ExpressApp.ts`                  | Express middleware stack                    |
| All `*.routes.ts`                             | Route definitions (call controllers)        |
| All `*.controller.ts`                         | HTTP handlers (call services)               |
| All `*.service.ts`                            | Business logic (call repositories)          |
| All `*.validation.ts`                         | Joi schemas (except ObjectId to UUID)       |
| All `*.types.ts`                              | DTO interfaces                              |

---

## 16. Migration Order

Recommended step-by-step execution order:

1. Install Prisma, create `schema.prisma` with all models
2. Run `npx prisma migrate dev` to create tables
3. Rewrite `Database.ts` (connection)
4. Rewrite `base.repository.ts`
5. Rewrite each module's `*.repository.ts` one at a time
6. Update `error.ts` middleware for PostgreSQL error codes
7. Update `validateId.ts` for UUID
8. Update `*.validation.ts` files (ObjectId to UUID)
9. Replace Agenda with pgboss in `src/common/queues/`
10. Update `seed.ts`
11. Update test setup (`tests/setup/`)
12. Update Docker and CI config
13. Run all tests, fix any remaining issues
14. Remove all Mongoose model files (`*.model.ts`)

---

## 17. Recommended ORM: Prisma

Prisma is the best fit for this codebase because:

- **Type-safe queries** — replaces hand-written `I<Name>` interfaces with auto-generated types
- **Built-in migrations** — `prisma migrate dev` handles schema changes
- **Relation handling** — `include` replaces Mongoose `.populate()`
- **Middleware system** — replaces Mongoose hooks (password hashing, soft deletes)
- **Prisma Studio** — visual database browser at `npx prisma studio`
- **Works with existing patterns** — fits the repository pattern used in this codebase
