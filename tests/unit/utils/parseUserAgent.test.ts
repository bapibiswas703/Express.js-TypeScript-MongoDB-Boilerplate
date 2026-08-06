import { parseUserAgent } from '../../../src/common/utils/parseUserAgent';

describe('parseUserAgent', () => {
  it('should parse Chrome on Windows', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const result = parseUserAgent(ua);

    expect(result.browser).toContain('Chrome');
    expect(result.os).toContain('Windows');
    expect(result.deviceType).toBe('desktop');
    expect(result.deviceName).toContain('Chrome');
    expect(result.deviceName).toContain('Windows');
  });

  it('should parse Safari on iPhone', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const result = parseUserAgent(ua);

    expect(result.browser).toContain('Safari');
    expect(result.os).toContain('iOS');
    expect(result.deviceType).toBe('mobile');
  });

  it('should return defaults for undefined user agent', () => {
    const result = parseUserAgent(undefined);

    expect(result.deviceName).toBe('Unknown Device');
    expect(result.deviceType).toBe('unknown');
    expect(result.browser).toBe('Unknown');
    expect(result.os).toBe('Unknown');
  });

  it('should return defaults for empty string', () => {
    const result = parseUserAgent('');

    expect(result.deviceName).toBe('Unknown Device');
    expect(result.deviceType).toBe('unknown');
  });

  it('should handle unknown user agents gracefully', () => {
    const result = parseUserAgent('custom-http-client/1.0');

    expect(result.deviceName).toBeDefined();
    expect(result.deviceType).toBeDefined();
  });
});
