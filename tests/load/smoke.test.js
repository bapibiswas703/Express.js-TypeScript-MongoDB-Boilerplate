/**
 * Smoke Test
 *
 * Quick validation that the API is functional under minimal load.
 * Run first to verify the system is healthy before heavier tests.
 *
 * Usage: k6 run tests/load/smoke.test.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './config.js';
import { authenticate, authHeaders } from './helpers.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

let token;

export function setup() {
  token = authenticate();
  if (!token) throw new Error('Setup failed: could not authenticate');
  return { token };
}

export default function (data) {
  const opts = authHeaders(data.token);

  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health: status 200': (r) => r.status === 200,
    'health: body ok': (r) => JSON.parse(r.body).status === 'ok',
  });

  // List categories
  const catRes = http.get(`${BASE_URL}/api/categories`, opts);
  check(catRes, { 'categories: status 200': (r) => r.status === 200 });

  // List products
  const prodRes = http.get(`${BASE_URL}/api/products`, opts);
  check(prodRes, { 'products: status 200': (r) => r.status === 200 });

  // Get profile
  const meRes = http.get(`${BASE_URL}/api/auth/me`, opts);
  check(meRes, { 'me: status 200': (r) => r.status === 200 });

  sleep(1);
}
