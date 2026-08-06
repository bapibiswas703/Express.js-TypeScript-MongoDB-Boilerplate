jest.mock('../../../src/config', () => ({
  config: {
    metrics: { enabled: true, prefix: 'test_' },
    log: { serviceName: 'test-api' },
  },
}));

import {
  httpRequestDuration,
  httpRequestsTotal,
  httpRequestsInFlight,
  activeUsersGauge,
  authAttemptsTotal,
  register,
} from '../../../src/common/services/metrics.service';

describe('MetricsService', () => {
  afterAll(async () => {
    register.clear();
  });

  it('should export httpRequestDuration histogram', () => {
    expect(httpRequestDuration).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((httpRequestDuration as any).name).toBe('test_http_request_duration_seconds');
  });

  it('should export httpRequestsTotal counter', () => {
    expect(httpRequestsTotal).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((httpRequestsTotal as any).name).toBe('test_http_requests_total');
  });

  it('should export httpRequestsInFlight gauge', () => {
    expect(httpRequestsInFlight).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((httpRequestsInFlight as any).name).toBe('test_http_requests_in_flight');
  });

  it('should export activeUsersGauge', () => {
    expect(activeUsersGauge).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((activeUsersGauge as any).name).toBe('test_active_users');
  });

  it('should export authAttemptsTotal counter', () => {
    expect(authAttemptsTotal).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((authAttemptsTotal as any).name).toBe('test_auth_attempts_total');
  });

  it('should produce metrics output from register', async () => {
    const output = await register.metrics();
    expect(output).toContain('test_http_request_duration_seconds');
    expect(output).toContain('test_http_requests_total');
    expect(output).toContain('test_http_requests_in_flight');
  });

  it('should include default Node.js metrics', async () => {
    const output = await register.metrics();
    expect(output).toContain('test_process_cpu');
    expect(output).toContain('test_nodejs_heap_size_total_bytes');
  });
});
