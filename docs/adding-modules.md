# Adding a New Module

This guide walks through creating a new feature module. We'll use an `order` module as an example.

## Step 1: Create the Module Directory

```
src/modules/order/
├── order.model.ts
├── order.repository.ts
├── order.service.ts
├── order.controller.ts
├── order.routes.ts
├── order.validation.ts
├── order.types.ts
└── index.ts
```

## Step 2: Define the Model

`order.model.ts` — Mongoose schema with TypeScript interface:

```typescript
import type { Document, Types } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

export interface IOrder extends Document {
  user: Types.ObjectId;
  items: { product: Types.ObjectId; quantity: number; price: number }[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

// Optional: strip __v from API responses
OrderSchema.set('toJSON', {
  transform(_doc: any, ret: any) {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model<IOrder>('Order', OrderSchema);
```

## Step 3: Create the Repository

`order.repository.ts` — Extends `BaseRepository` with module-specific queries:

```typescript
import { BaseRepository } from '../../common/repositories/base.repository';
import Order, { type IOrder } from './order.model';

class OrderRepository extends BaseRepository<IOrder> {
  constructor() {
    super(Order);
  }

  async findByUser(userId: string): Promise<IOrder[]> {
    return this.find({ user: userId }, { sort: { createdAt: -1 } });
  }

  async findWithProducts(id: string): Promise<IOrder | null> {
    return Order.findById(id).populate('items.product').exec();
  }
}

export default new OrderRepository();
```

The `BaseRepository` provides these methods out of the box:
- `create(data)` — Create a new document
- `findById(id)` — Find by ID
- `findOne(filter)` — Find one matching document
- `find(filter, options)` — Find multiple with sort/skip/limit
- `count(filter)` — Count matching documents
- `paginate(filter, page, limit)` — Paginated query
- `updateById(id, data)` — Find and update
- `deleteById(id)` — Find and delete

## Step 4: Define DTOs

`order.types.ts` — Data transfer objects:

```typescript
export interface CreateOrderDto {
  items: { product: string; quantity: number }[];
}

export interface UpdateOrderStatusDto {
  status: 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
}
```

## Step 5: Create Validation Schemas

`order.validation.ts` — Joi schemas for request body validation:

```typescript
import Joi from 'joi';

export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        product: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
      }),
    )
    .min(1)
    .required(),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('confirmed', 'shipped', 'delivered', 'cancelled')
    .required(),
});
```

## Step 6: Implement the Service

`order.service.ts` — Business logic:

```typescript
import orderRepository from './order.repository';
import type { CreateOrderDto, UpdateOrderStatusDto } from './order.types';
import type { IOrder } from './order.model';
import type { PaginationMeta } from '../../common/types';
import { ApiError } from '../../common/utils/ApiError';

interface PaginatedOrders {
  docs: IOrder[];
  pagination: PaginationMeta;
}

export const createOrder = async (
  userId: string,
  dto: CreateOrderDto,
): Promise<IOrder> => {
  // Business logic: calculate total, validate products, etc.
  const total = 0; // Calculate based on product prices
  return orderRepository.create({ user: userId, items: dto.items, total });
};

export const getUserOrders = async (
  userId: string,
  page: number,
  limit: number,
): Promise<PaginatedOrders> => {
  const { docs, ...pagination } = await orderRepository.paginate(
    { user: userId },
    page,
    limit,
  );
  return { docs, pagination };
};

export const getOrderById = async (
  userId: string,
  orderId: string,
): Promise<IOrder> => {
  const order = await orderRepository.findWithProducts(orderId);
  if (!order || order.user.toString() !== userId) {
    throw new ApiError(404, 'Order not found');
  }
  return order;
};

export const updateOrderStatus = async (
  orderId: string,
  dto: UpdateOrderStatusDto,
): Promise<IOrder> => {
  const order = await orderRepository.updateById(orderId, dto);
  if (!order) throw new ApiError(404, 'Order not found');
  return order;
};
```

Key patterns:
- Services throw `ApiError` for business rule violations
- Return typed data, never HTTP-related objects
- Ownership checks compare `document.user.toString() !== userId`
- Return 404 (not 403) when a resource doesn't belong to the user

## Step 7: Create the Controller

`order.controller.ts` — Thin HTTP handler layer:

```typescript
import type { Request, Response, NextFunction } from 'express';
import * as orderService from './order.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../common/utils/ApiResponse';
import { parsePagination } from '../../common/utils/pagination';

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.createOrder(req.userId!, req.body);
    sendCreated(res, { order }, 'Order created');
  } catch (err) {
    next(err);
  }
};

export const getUserOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { page, limit } = parsePagination(req);
    const { docs, pagination } = await orderService.getUserOrders(
      req.userId!,
      page,
      limit,
    );
    sendPaginated(res, docs, pagination);
  } catch (err) {
    next(err);
  }
};

export const getOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.getOrderById(req.userId!, req.params.id);
    sendSuccess(res, { order });
  } catch (err) {
    next(err);
  }
};
```

Key patterns:
- Always wrap in `try/catch` and pass errors to `next(err)`
- Use response helpers (`sendSuccess`, `sendCreated`, `sendPaginated`, `sendNoContent`)
- Return type is `Promise<void>`
- Parse pagination from query with `parsePagination(req)`

## Step 8: Define Routes

`order.routes.ts` — Express router with middleware chain and Swagger docs:

```typescript
import { Router } from 'express';
import { createOrder, getUserOrders, getOrder } from './order.controller';
import { authenticate } from '../../common/middlewares/auth';
import { authorize } from '../../common/middlewares/rbac';
import { validate } from '../../common/middlewares/validate';
import { validateId } from '../../common/middlewares/validateId';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createOrderSchema } from './order.validation';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management
 */

router.use(authenticate);

router.post('/', authorize(PERMISSIONS.ORDER_CREATE), validate(createOrderSchema), createOrder);
router.get('/', authorize(PERMISSIONS.ORDER_READ), getUserOrders);
router.get('/:id', validateId(), authorize(PERMISSIONS.ORDER_READ), getOrder);

export default router;
```

## Step 9: Export the Module's Public API

`index.ts` — Only export what other modules need:

```typescript
export { default as orderRoutes } from './order.routes';
export { default as orderRepository } from './order.repository';
```

## Step 10: Register Routes

Add to `src/modules/index.ts`:

```typescript
import { orderRoutes } from './order';

router.use('/orders', orderRoutes);
```

## Step 11: Add Permissions

Update `src/common/constants/permissions.ts`:

```typescript
export const PERMISSIONS = {
  // ... existing permissions

  // Order
  ORDER_READ: 'order:read',
  ORDER_CREATE: 'order:create',
  ORDER_UPDATE: 'order:update',
  ORDER_DELETE: 'order:delete',
} as const;
```

Update `src/services/seed.ts` to assign the new permissions to the appropriate roles.

## Step 12: Add Swagger Schemas (Optional)

Add schemas to `src/config/swagger.ts` under `components.schemas`:

```typescript
Order: {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    user: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          product: { type: 'string' },
          quantity: { type: 'integer' },
          price: { type: 'number' },
        },
      },
    },
    total: { type: 'number' },
    status: { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
  },
},
```

Then add `@swagger` JSDoc annotations to each route in `order.routes.ts`.

## Step 13: Write Tests

Create test files following the existing pattern:

```
tests/
├── unit/services/order.service.test.ts     # Mock repository, test business logic
└── integration/order/order.test.ts         # Real DB, test full HTTP flow
```

Run tests with:
```bash
npm test                  # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
```

## Checklist

- [ ] Model with interface extending `Document`
- [ ] Repository extending `BaseRepository`
- [ ] DTOs in `types.ts`
- [ ] Joi validation schemas
- [ ] Service with business logic
- [ ] Controller with try/catch + next(err)
- [ ] Routes with authenticate + authorize + validate + validateId
- [ ] Module `index.ts` with public API exports
- [ ] Routes registered in `src/modules/index.ts`
- [ ] Permissions added to `constants/permissions.ts`
- [ ] Permissions assigned to roles in `seed.ts`
- [ ] Swagger annotations (optional)
- [ ] Unit + integration tests

## Related Docs

- [Architecture](./architecture.md) — Overall system structure
- [RBAC](./rbac.md) — How to set up permissions for your module
- [API Reference](./api-reference.md) — Response format and conventions
