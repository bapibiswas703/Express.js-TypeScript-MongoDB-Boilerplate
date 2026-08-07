// Shared configuration for k6 load tests
// Override via environment variables: k6 run -e BASE_URL=http://prod:8000 script.js

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Test user credentials (must exist in the database — run `npm run seed` first)
// Credentials match seed data (npm run seed). Override via env vars.
export const TEST_USER = {
  email: __ENV.TEST_EMAIL || 'admin@example.com',
  password: __ENV.TEST_PASSWORD || 'AdminUser@123',
};

// Thresholds shared across scenarios
export const DEFAULT_THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
};
