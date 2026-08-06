import {
  parsePagination,
  parseCursorPagination,
  isCursorPagination,
  encodeCursor,
  decodeCursor,
  parseSort,
} from '../../../src/common/utils/pagination';
import type { Request } from 'express';

const mockRequest = (query: Record<string, string> = {}): Request =>
  ({ query }) as unknown as Request;

describe('parsePagination', () => {
  it('should return default page=1 and limit=10', () => {
    const result = parsePagination(mockRequest());
    expect(result).toEqual({ page: 1, limit: 10 });
  });

  it('should parse page and limit from query', () => {
    const result = parsePagination(mockRequest({ page: '3', limit: '25' }));
    expect(result).toEqual({ page: 3, limit: 25 });
  });

  it('should enforce minimum page=1', () => {
    const result = parsePagination(mockRequest({ page: '-5' }));
    expect(result.page).toBe(1);
  });

  it('should cap limit at maxLimit', () => {
    const result = parsePagination(mockRequest({ limit: '500' }));
    expect(result.limit).toBe(100);
  });

  it('should allow custom maxLimit', () => {
    const result = parsePagination(mockRequest({ limit: '30' }), 20);
    expect(result.limit).toBe(20);
  });

  it('should enforce minimum limit=1', () => {
    const result = parsePagination(mockRequest({ limit: '0' }));
    expect(result.limit).toBe(1);
  });
});

describe('parseCursorPagination', () => {
  it('should return default limit=10 with no cursor', () => {
    const result = parseCursorPagination(mockRequest());
    expect(result).toEqual({ cursor: undefined, limit: 10 });
  });

  it('should parse cursor and limit from query', () => {
    const result = parseCursorPagination(mockRequest({ cursor: 'abc123', limit: '25' }));
    expect(result).toEqual({ cursor: 'abc123', limit: 25 });
  });

  it('should cap limit at maxLimit', () => {
    const result = parseCursorPagination(mockRequest({ limit: '500' }));
    expect(result.limit).toBe(100);
  });

  it('should allow custom maxLimit', () => {
    const result = parseCursorPagination(mockRequest({ limit: '30' }), 20);
    expect(result.limit).toBe(20);
  });

  it('should enforce minimum limit=1', () => {
    const result = parseCursorPagination(mockRequest({ limit: '0' }));
    expect(result.limit).toBe(1);
  });
});

describe('isCursorPagination', () => {
  it('should return true when cursor is present', () => {
    expect(isCursorPagination(mockRequest({ cursor: 'abc' }))).toBe(true);
  });

  it('should return true when cursor is empty string', () => {
    expect(isCursorPagination(mockRequest({ cursor: '' }))).toBe(true);
  });

  it('should return false when cursor is absent', () => {
    expect(isCursorPagination(mockRequest())).toBe(false);
  });
});

describe('encodeCursor / decodeCursor', () => {
  it('should encode and decode a cursor value', () => {
    const id = '64de7ca38f1a2b0017c5e71b';
    const encoded = encodeCursor(id);
    expect(encoded).not.toBe(id);
    expect(decodeCursor(encoded)).toBe(id);
  });

  it('should produce base64 output', () => {
    const encoded = encodeCursor('test123');
    expect(encoded).toBe(Buffer.from('test123').toString('base64'));
  });
});

describe('parseSort', () => {
  const allowedFields = ['name', 'createdAt', 'price'];

  it('should return undefined when no sortBy provided', () => {
    expect(parseSort(mockRequest(), allowedFields)).toBeUndefined();
  });

  it('should return undefined for disallowed fields', () => {
    expect(parseSort(mockRequest({ sortBy: 'password' }), allowedFields)).toBeUndefined();
  });

  it('should default to descending order', () => {
    const result = parseSort(mockRequest({ sortBy: 'name' }), allowedFields);
    expect(result).toEqual({ name: -1 });
  });

  it('should support ascending order', () => {
    const result = parseSort(mockRequest({ sortBy: 'price', order: 'asc' }), allowedFields);
    expect(result).toEqual({ price: 1 });
  });
});
