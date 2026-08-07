/**
 * Soak Test
 *
 * Tests system stability over an extended period at moderate load.
 * Detects memory leaks, connection pool exhaustion, and degradation over time.
 *
 * Usage: k6 run tests/load/soak.test.js
 * Note:  This runs for ~30 minutes. Adjust stages for shorter/longer runs.
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL } from './config.js';
import { authenticate, authHeaders } from './helpers.js';

export const options = {
  stages: [
    { duration: '2m', target: 30 },   // ramp up
    { duration: '25m', target: 30 },   // sustained moderate load
    { duration: '2m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const token = authenticate();
  if (!token) throw new Error('Setup failed: could not authenticate');
  return { token };
}

export default function (data) {
  const opts = authHeaders(data.token);

  group('Steady-state workload', () => {
    // Simulate typical API usage pattern

    // 1. List products (most common query)
    const prodList = http.get(`${BASE_URL}/api/products?page=1&limit=10`, opts);
    check(prodList, { 'products: 200': (r) => r.status === 200 });

    // 2. Filter products by price
    const filtered = http.get(`${BASE_URL}/api/products?minPrice=20&maxPrice=80`, opts);
    check(filtered, { 'filtered products: 200': (r) => r.status === 200 });

    // 3. List categories
    const cats = http.get(`${BASE_URL}/api/categories`, opts);
    check(cats, { 'categories: 200': (r) => r.status === 200 });

    // 4. Get single product detail
    if (prodList.status === 200) {
      const docs = JSON.parse(prodList.body).data.docs;
      if (docs && docs.length > 0) {
        const detail = http.get(`${BASE_URL}/api/products/${docs[0]._id}`, opts);
        check(detail, { 'product detail: 200': (r) => r.status === 200 });
      }
    }

    // 5. Get user profile
    const me = http.get(`${BASE_URL}/api/auth/me`, opts);
    check(me, { 'me: 200': (r) => r.status === 200 });

    // 6. Health check
    const health = http.get(`${BASE_URL}/health`);
    check(health, { 'health: 200': (r) => r.status === 200 });
  });

  sleep(2);
}
