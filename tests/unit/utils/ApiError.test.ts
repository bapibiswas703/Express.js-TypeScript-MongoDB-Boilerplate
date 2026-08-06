import { ApiError } from '../../../src/common/utils/ApiError';

describe('ApiError', () => {
  it('should create an error with statusCode and message', () => {
    const error = new ApiError(404, 'Not found');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Not found');
  });

  it('should be catchable as Error', () => {
    try {
      throw new ApiError(400, 'Bad request');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).statusCode).toBe(400);
    }
  });
});
