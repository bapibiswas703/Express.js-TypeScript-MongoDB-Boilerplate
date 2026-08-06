# Contributing Guide

Thank you for your interest in contributing! This guide covers the development workflow, code style, and PR process.

## Getting Started

```bash
git clone <repo-url>
cd express-ts-ejs-boilerplate
npm install
cp .env.example .env
npm run dev
```

## Branch Naming

| Type     | Format            | Example                 |
| -------- | ----------------- | ----------------------- |
| Feature  | `feature/<name>`  | `feature/order-module`  |
| Bug fix  | `fix/<name>`      | `fix/token-expiry`      |
| Refactor | `refactor/<name>` | `refactor/auth-service` |
| Docs     | `docs/<name>`     | `docs/api-reference`    |

## Development Workflow

1. Create a branch from `develop`
2. Make your changes
3. Run quality checks:

   ```bash
   npm run lint          # ESLint
   npm run format:check  # Prettier
   npx tsc --noEmit      # Type check
   npm test              # All tests
   ```

4. Commit with a clear message
5. Open a PR against `develop`

## Commit Messages

Use conventional commit format:

```
feat: add order module with CRUD endpoints
fix: handle expired token edge case in refresh flow
docs: update API reference with new endpoints
refactor: extract token generation into shared utility
test: add integration tests for device management
chore: update dependencies
```

## Code Style

- **TypeScript strict mode** — no `any` without `// eslint-disable` comment
- **Prettier** for formatting (runs automatically on save in most editors)
- **ESLint** with typescript-eslint for linting
- Files use **camelCase** for variables/functions, **PascalCase** for classes/interfaces

## Module Structure

When adding a new module, follow the pattern in `docs/adding-modules.md`. Each module needs:

- `*.model.ts` — Mongoose schema
- `*.repository.ts` — Extends BaseRepository
- `*.service.ts` — Business logic
- `*.controller.ts` — HTTP handlers
- `*.routes.ts` — Express router
- `*.validation.ts` — Joi schemas
- `*.types.ts` — DTOs
- `index.ts` — Public exports

## Testing

- **Unit tests:** `tests/unit/` — mock dependencies, test business logic
- **Integration tests:** `tests/integration/` — real MongoDB (MongoMemoryServer), test HTTP flow
- Run tests with `npm test` (uses `--runInBand` for integration test isolation)
- Aim for meaningful test coverage, not 100% line coverage

## Pull Request Process

1. Ensure all checks pass (lint, typecheck, tests)
2. Add a clear description of what changed and why
3. Reference any related issues
4. Request review from a maintainer
5. Address review feedback
6. Squash and merge when approved
