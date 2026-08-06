import type { Model, Document, UpdateQuery, QueryOptions } from 'mongoose';
import { encodeCursor, decodeCursor } from '../utils/pagination';
import type { CursorPaginationMeta } from '../types';

type Filter = Record<string, unknown>;

export class BaseRepository<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data as T);
  }

  async findById(id: string, select?: string): Promise<T | null> {
    const query = this.model.findById(id);
    if (select) query.select(select);
    return query.exec();
  }

  async findOne(filter: Filter, select?: string): Promise<T | null> {
    const query = this.model.findOne(filter);
    if (select) query.select(select);
    return query.exec();
  }

  async find(
    filter: Filter = {},
    options: { skip?: number; limit?: number; sort?: Record<string, 1 | -1>; select?: string } = {},
  ): Promise<T[]> {
    const query = this.model.find(filter);
    if (options.select) query.select(options.select);
    if (options.sort) query.sort(options.sort);
    if (options.skip) query.skip(options.skip);
    if (options.limit) query.limit(options.limit);
    return query.exec();
  }

  async count(filter: Filter = {}): Promise<number> {
    return this.model.countDocuments(filter);
  }

  async paginate(
    filter: Filter = {},
    page: number,
    limit: number,
    sort?: Record<string, 1 | -1>,
  ): Promise<{ docs: T[]; total: number; page: number; limit: number; pages: number }> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.find(filter, { skip, limit, sort }),
      this.count(filter),
    ]);
    return { docs, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async cursorPaginate(
    filter: Filter = {},
    cursor: string | undefined,
    limit: number,
    sort?: Record<string, 1 | -1>,
  ): Promise<{ docs: T[]; pagination: CursorPaginationMeta }> {
    const cursorFilter: Filter = { ...filter };
    // Determine sort direction: default descending by _id
    const isAscending =
      sort && Object.values(sort)[0] === 1 ? true : !sort ? false : Object.values(sort)[0] !== 1;
    const effectiveSort = sort || { _id: -1 as const };

    if (cursor) {
      const decodedId = decodeCursor(cursor);
      cursorFilter._id = isAscending ? { $gt: decodedId } : { $lt: decodedId };
    }

    // Fetch one extra to check if there are more results
    const docs = await this.find(cursorFilter, { limit: limit + 1, sort: effectiveSort });
    const hasMore = docs.length > limit;
    if (hasMore) docs.pop();

    const nextCursor =
      hasMore && docs.length > 0 ? encodeCursor(String(docs[docs.length - 1]._id)) : null;

    return {
      docs,
      pagination: { limit, hasMore, nextCursor },
    };
  }

  async updateById(id: string, data: UpdateQuery<T>, options?: QueryOptions): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true, runValidators: true, ...options })
      .exec();
  }

  async deleteById(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id).exec();
  }
}
