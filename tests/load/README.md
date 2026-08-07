# Load & Stress Tests

Performance tests using [k6](https://grafana.com/docs/k6/latest/) by Grafana Labs.

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Windows (winget)
winget install k6 --source winget

# Windows (choco)
choco install k6

# Docker (no install)
docker run --rm -i --network host grafana/k6 run - <tests/load/smoke.test.js
```

## Setup

The load tests run against a live server with seeded data:

```bash
# 1. Start the server
npm run dev

# 2. Seed sample data (if not already done)
npm run seed
```

## Test Scenarios

| Script          | VUs    | Duration | Purpose                                               |
| --------------- | ------ | -------- | ----------------------------------------------------- |
| `smoke.test.js` | 1      | 30s      | Quick validation that the API is functional            |
| `load.test.js`  | 20→50  | 7m       | Normal production traffic (sustained load)             |
| `spike.test.js` | 10→200 | 3m       | Sudden traffic surge (tests rate limiting & recovery)  |
| `soak.test.js`  | 30     | 29m      | Extended run to detect memory leaks and degradation    |

## Running

```bash
# Smoke test (run first)
k6 run tests/load/smoke.test.js

# Sustained load test
k6 run tests/load/load.test.js

# Spike test
k6 run tests/load/spike.test.js

# Soak test (long-running)
k6 run tests/load/soak.test.js

# Custom base URL
k6 run -e BASE_URL=http://staging:8000 tests/load/load.test.js

# Custom credentials
k6 run -e TEST_EMAIL=admin@example.com -e TEST_PASSWORD=AdminUser@123 tests/load/load.test.js
```

## Thresholds

Default pass/fail thresholds:

| Metric             | Smoke    | Load          | Spike     | Soak          |
| ------------------ | -------- | ------------- | --------- | ------------- |
| p(95) response     | < 300ms  | < 500ms       | < 1500ms  | < 500ms       |
| p(99) response     | —        | < 1000ms      | —         | < 1000ms      |
| Error rate         | < 1%     | < 1%          | < 5%      | < 1%          |

## Endpoints Tested

- `GET /health` — Health check (no auth)
- `POST /api/auth/login` — Authentication throughput
- `GET /api/auth/me` — Profile retrieval
- `GET /api/products` — Product listing with pagination
- `GET /api/products?minPrice=X&maxPrice=Y` — Filtered queries
- `GET /api/products/:id` — Single product detail
- `GET /api/categories` — Category listing
- `GET /api/categories/:id` — Single category detail
- `GET /api/users` — User listing

## Configuration

Edit `tests/load/config.js` to change defaults:

- `BASE_URL` — Target server (default: `http://localhost:8000`)
- `TEST_USER` — Login credentials (default: seeded admin user)

All values can be overridden via `-e` flags at runtime.

## Tips

- Always run `smoke.test.js` first to verify connectivity
- Run `npm run seed` to ensure test data exists
- Monitor server logs (`logs/`) and `/metrics` endpoint during tests
- Use Grafana dashboards for real-time visualization during Docker runs
- Rate limiting (429 responses) is expected during spike tests
