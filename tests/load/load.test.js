/**
 * Sustained Load Test
 *
 * Simulates normal production traffic. Ramps up to 50 concurrent users,
 * holds for 5 minutes, then ramps down.
 *
 * Usage: k6 run tests/load/load.test.js
 * Custom: k6 run -e BASE_URL=http://staging:8000 tests/load/load.test.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL } from './config.js';
import { authenticate, authHeaders } from './helpers.js';

export const options = {
  stages: [
    { duration: '1m', target: 20 },  // ramp up
    { duration: '5m', target: 50 },  // sustained load
    { duration: '1m', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:login}': ['p(95)<800'],
    'http_req_duration{name:list_products}': ['p(95)<400'],
    'http_req_duration{name:list_categories}': ['p(95)<300'],
  },
};

export function setup() {
  const token = authenticate();
  if (!token) throw new Error('Setup failed: could not authenticate');
  return { token };
}

export default function (data) {
  const opts = authHeaders(data.token);

  group('Auth', () => {
    // Login (each VU authenticates to measure auth throughput)
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: 'john@example.com', password: 'JohnDoe@123' }),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } },
    );
    check(loginRes, { 'login: 200': (r) => r.status === 200 });

    // Get current user profile
    const meRes = http.get(`${BASE_URL}/api/auth/me`, {
      ...opts,
      tags: { name: 'me' },
    });
    check(meRes, { 'me: 200': (r) => r.status === 200 });
  });

  group('Categories', () => {
    const listRes = http.get(`${BASE_URL}/api/categories`, {
      ...opts,
      tags: { name: 'list_categories' },
    });
    check(listRes, { 'categories list: 200': (r) => r.status === 200 });

    // Get a single category if available
    if (listRes.status === 200) {
      const docs = JSON.parse(listRes.body).data.docs;
      if (docs && docs.length > 0) {
        const id = docs[0]._id;
        const getRes = http.get(`${BASE_URL}/api/categories/${id}`, {
          ...opts,
          tags: { name: 'get_category' },
        });
        check(getRes, { 'category detail: 200': (r) => r.status === 200 });
      }
    }
  });

  group('Products', () => {
    // List all products
    const listRes = http.get(`${BASE_URL}/api/products`, {
      ...opts,
      tags: { name: 'list_products' },
    });
    check(listRes, { 'products list: 200': (r) => r.status === 200 });

    // Paginated query
    const page2 = http.get(`${BASE_URL}/api/products?page=1&limit=5`, {
      ...opts,
      tags: { name: 'products_paginated' },
    });
    check(page2, { 'products paginated: 200': (r) => r.status === 200 });

    // Filter by price range
    const filtered = http.get(`${BASE_URL}/api/products?minPrice=10&maxPrice=50`, {
      ...opts,
      tags: { name: 'products_filtered' },
    });
    check(filtered, { 'products filtered: 200': (r) => r.status === 200 });

    // Get a single product if available
    if (listRes.status === 200) {
      const docs = JSON.parse(listRes.body).data.docs;
      if (docs && docs.length > 0) {
        const id = docs[0]._id;
        const getRes = http.get(`${BASE_URL}/api/products/${id}`, {
          ...opts,
          tags: { name: 'get_product' },
        });
        check(getRes, { 'product detail: 200': (r) => r.status === 200 });
      }
    }
  });

  group('Users', () => {
    const listRes = http.get(`${BASE_URL}/api/users`, {
      ...opts,
      tags: { name: 'list_users' },
    });
    check(listRes, { 'users list: 200': (r) => r.status === 200 });
  });

  sleep(1);
}
