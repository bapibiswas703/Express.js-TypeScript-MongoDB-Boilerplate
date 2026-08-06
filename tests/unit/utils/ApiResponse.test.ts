import { ApiResponse } from '../../../src/common/utils/ApiResponse';

describe('ApiResponse', () => {
  describe('success', () => {
    it('should return success response with defaults', () => {
      const res = ApiResponse.success({ id: 1 });
      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.code).toBe('SUCCESS');
      expect(res.message).toBe('Success');
      expect(res.data).toEqual({ id: 1 });
      expect(res.timestamp).toBeDefined();
    });

    it('should accept custom message and status code', () => {
      const res = ApiResponse.success(null, 'Custom message', 202);
      expect(res.message).toBe('Custom message');
      expect(res.statusCode).toBe(202);
    });
  });

  describe('error', () => {
    it('should return error response with defaults', () => {
      const res = ApiResponse.error();
      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(500);
      expect(res.code).toBe('INTERNAL_SERVER_ERROR');
      expect(res.message).toBe('Internal Server Error');
      expect(res.errors).toEqual([]);
    });

    it('should accept custom values', () => {
      const res = ApiResponse.error('Not found', 404, 'NOT_FOUND', ['Item missing']);
      expect(res.statusCode).toBe(404);
      expect(res.code).toBe('NOT_FOUND');
      expect(res.message).toBe('Not found');
      expect(res.errors).toEqual(['Item missing']);
    });
  });

  describe('created', () => {
    it('should return 201 status', () => {
      const res = ApiResponse.created({ id: 1 });
      expect(res.statusCode).toBe(201);
      expect(res.message).toBe('Created');
      expect(res.data).toEqual({ id: 1 });
    });
  });

  describe('paginated', () => {
    it('should wrap docs and pagination in data', () => {
      const docs = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, total: 2, pages: 1 };
      const res = ApiResponse.paginated(docs, pagination);
      expect(res.data.docs).toEqual(docs);
      expect(res.data.pagination).toEqual(pagination);
    });
  });

  describe('cursorPaginated', () => {
    it('should wrap docs and cursor pagination in data', () => {
      const docs = [{ id: 1 }, { id: 2 }];
      const pagination = { limit: 10, hasMore: true, nextCursor: 'abc123' };
      const res = ApiResponse.cursorPaginated(docs, pagination);
      expect(res.data.docs).toEqual(docs);
      expect(res.data.pagination).toEqual(pagination);
      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it('should handle no more results', () => {
      const docs = [{ id: 1 }];
      const pagination = { limit: 10, hasMore: false, nextCursor: null };
      const res = ApiResponse.cursorPaginated(docs, pagination);
      expect(res.data.pagination.hasMore).toBe(false);
      expect(res.data.pagination.nextCursor).toBeNull();
    });
  });

  describe('ack', () => {
    it('should return acknowledged response', () => {
      const res = ApiResponse.ack('Processing', 'req-123');
      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(202);
      expect(res.code).toBe('ACKNOWLEDGED');
      expect(res.requestId).toBe('req-123');
    });
  });
});
