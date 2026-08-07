/**
 * Spike Test
 *
 * Tests how the system handles sudden traffic surges.
 * Ramps from 0 to 200 VUs in 30 seconds, holds briefly, then drops.
 *
 * Usage: k6 run tests/load/spike.test.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL } from './config.js';
import { authenticate, authHeaders } from './helpers.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // warm up
    { duration: '30s', target: 200 },   // spike
    { duration: '1m', target: 200 },    // hold spike
    { duration: '30s', target: 10 },    // recovery
    { duration: '30s', target: 0 },     // cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],   // relaxed for spike
    http_req_failed: ['rate<0.05'],      // allow up to 5% errors under extreme load
  },
};

export function setup() {
  const token = authenticate();
  if (!token) throw new Error('Setup failed: could not authenticate');
  return { token };
}

export default function (data) {
  const opts = authHeaders(data.token);

  group('Read-heavy mix', () => {
    // Health check (no auth, lightest endpoint)
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, { 'health: 200': (r) => r.status === 200 });

    // Product listing with filters
    const prodRes = http.get(`${BASE_URL}/api/products?page=1&limit=10`, opts);
    check(prodRes, { 'products: 200 or 429': (r) => r.status === 200 || r.status === 429 });

    // Category listing
    const catRes = http.get(`${BASE_URL}/api/categories`, opts);
    check(catRes, { 'categories: 200 or 429': (r) => r.status === 200 || r.status === 429 });
  });

  group('Auth under pressure', () => {
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: 'john@example.com', password: 'JohnDoe@123' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    // Under spike, rate limiting (429) is expected
    check(loginRes, {
      'login: 200 or 429': (r) => r.status === 200 || r.status === 429,
    });
  });

  sleep(0.5);
}
