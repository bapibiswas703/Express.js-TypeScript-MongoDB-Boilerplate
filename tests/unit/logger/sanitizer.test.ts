import { sanitize } from '../../../src/common/logger/sanitizer';

describe('sanitize', () => {
  it('should mask password fields', () => {
    const input = { email: 'test@test.com', password: 'secret123' };
    const result = sanitize(input) as Record<string, unknown>;
    expect(result.email).toBe('test@test.com');
    expect(result.password).toBe('********');
  });

  it('should mask token fields', () => {
    const input = { token: 'jwt-abc', accessToken: 'at-123', refreshToken: 'rt-456' };
    const result = sanitize(input) as Record<string, unknown>;
    expect(result.token).toBe('********');
    expect(result.accessToken).toBe('********');
    expect(result.refreshToken).toBe('********');
  });

  it('should mask authorization headers', () => {
    const input = { headers: { authorization: 'Bearer xyz', 'content-type': 'application/json' } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = sanitize(input) as any;
    expect(result.headers.authorization).toBe('********');
    expect(result.headers['content-type']).toBe('application/json');
  });

  it('should mask credit card and CVV', () => {
    const input = { creditCard: '4111111111111111', cvv: '123' };
    const result = sanitize(input) as Record<string, unknown>;
    expect(result.creditCard).toBe('********');
    expect(result.cvv).toBe('********');
  });

  it('should mask apiKey and secret', () => {
    const input = { apiKey: 'sk-abc123', secret: 'my-secret' };
    const result = sanitize(input) as Record<string, unknown>;
    expect(result.apiKey).toBe('********');
    expect(result.secret).toBe('********');
  });

  it('should mask cookie and sessionId', () => {
    const input = { cookie: 'sid=abc', sessionId: 'sess-123' };
    const result = sanitize(input) as Record<string, unknown>;
    expect(result.cookie).toBe('********');
    expect(result.sessionId).toBe('********');
  });

  it('should recursively sanitize nested objects', () => {
    const input = {
      user: { name: 'John', password: 'secret' },
      meta: { apiKey: 'key-123' },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = sanitize(input) as any;
    expect(result.user.name).toBe('John');
    expect(result.user.password).toBe('********');
    expect(result.meta.apiKey).toBe('********');
  });

  it('should handle arrays', () => {
    const input = [{ password: 'a' }, { password: 'b' }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = sanitize(input) as any[];
    expect(result[0].password).toBe('********');
    expect(result[1].password).toBe('********');
  });

  it('should return null/undefined as-is', () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize(undefined)).toBeUndefined();
  });

  it('should return primitives as-is', () => {
    expect(sanitize('hello')).toBe('hello');
    expect(sanitize(42)).toBe(42);
    expect(sanitize(true)).toBe(true);
  });

  it('should not mask non-sensitive fields', () => {
    const input = { name: 'John', email: 'john@test.com', age: 30 };
    const result = sanitize(input) as Record<string, unknown>;
    expect(result).toEqual(input);
  });
});
