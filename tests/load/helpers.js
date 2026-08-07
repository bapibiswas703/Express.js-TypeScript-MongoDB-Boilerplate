import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, TEST_USER } from './config.js';

// Login and return an access token
export function authenticate(email, password) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: email || TEST_USER.email, password: password || TEST_USER.password }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, { 'login succeeded': (r) => r.status === 200 });

  if (res.status !== 200) {
    console.error(`Login failed: ${res.status} ${res.body}`);
    return null;
  }

  return JSON.parse(res.body).data.accessToken;
}

// Build auth headers for requests
export function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}
