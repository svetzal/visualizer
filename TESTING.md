# Testing Guide

## Overview

This project uses [Vitest](https://vitest.dev/) for unit testing. Vitest is a fast, modern testing framework designed for TypeScript/ESM projects.

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (re-runs on file changes)
```bash
npm test
```

### Run tests once (CI mode)
```bash
npm run test:run
```

### Run tests with UI (interactive browser interface)
```bash
npm run test:ui
```

### Run tests with coverage report
```bash
npm run test:coverage
```

## Test Structure

Tests are organized alongside the source code they test:

```
src/
├── lib/
│   ├── queries.ts                        # Query functions
│   ├── queries.test.ts                   # Query function tests
│   ├── storage.ts                        # Storage implementation
│   ├── storage.test.ts                   # Storage tests
│   └── find-by-name-integration.test.ts  # Integration tests
```

## Test Categories

### Unit Tests
Test individual functions in isolation:
- `src/lib/queries.test.ts` - Tests for find-by-name query functions
- `src/lib/storage.test.ts` - Tests for JSONStorage CRUD operations

### Integration Tests
Test how components work together:
- `src/lib/find-by-name-integration.test.ts` - Tests for find-by-name with storage

### E2E Tests
Test the full system with running Electron app:
- `npm run test:e2e` - Requires app to be running (`npm start`)

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule.js';

describe('MyModule', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Testing with Setup/Teardown

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature with setup', () => {
  let resource;

  beforeEach(() => {
    resource = createResource();
  });

  afterEach(() => {
    cleanupResource(resource);
  });

  it('should use the resource', () => {
    expect(resource).toBeDefined();
  });
});
```

### Async Tests

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

## Test Coverage

Test coverage shows which parts of the code are exercised by tests:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory:
- `coverage/index.html` - Interactive HTML report
- `coverage/coverage-final.json` - JSON data for CI/CD

**Coverage targets:**
- `src/lib/` - Core library functions (queries, storage, schemas)
- `src/mcp-server/` - MCP tool implementations

**Excluded from coverage:**
- `src/tests/` - Test infrastructure
- `src/bootstrap.ts`, `src/main.ts`, `src/preload.ts` - Electron-specific code
- `*.test.ts`, `*.spec.ts` - Test files themselves

## Current Test Suite

### Query Tests (16 tests)
- `findActorByName`: exact match, case-insensitive, whitespace handling
- `findGoalByName`: exact match, case-insensitive
- `findTaskByName`: exact match, case-insensitive
- `findInteractionByName`: exact match, case-insensitive
- Edge cases: empty strings, special characters

### Storage Tests (13 tests)
- Actor operations: save, retrieve, update, delete, list
- Goal operations: save with assigned actors
- Task operations: save with interactions
- Interaction operations: save with preconditions/effects
- Clear operation: remove all entities
- Error handling: non-existent entities

### Integration Tests (11 tests)
- Preventing duplicates with find-by-name
- Model consistency scenarios
- Complex model scenarios: referential integrity
- Edge cases: empty model, whitespace, duplicates

**Total: 40 tests**

## Testing Best Practices

### Do's
✅ Test both success and failure cases
✅ Use descriptive test names that explain what's being tested
✅ Keep tests focused on a single behavior
✅ Use proper setup/teardown for resources (files, databases)
✅ Test edge cases (empty input, null, undefined, special characters)
✅ Use async/await for asynchronous operations

### Don'ts
❌ Don't test implementation details, test behavior
❌ Don't create dependencies between tests
❌ Don't use real file system paths (use temp directories)
❌ Don't leave test files/data behind after test runs
❌ Don't skip error cases

## Debugging Tests

### Run a specific test file
```bash
npm test -- src/lib/queries.test.ts
```

### Run tests matching a pattern
```bash
npm test -- --grep "find.*by name"
```

### Run with verbose output
```bash
npm test -- --reporter=verbose
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal"
}
```

## CI/CD Integration

Tests run automatically in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Install dependencies
  run: npm ci

- name: Run tests
  run: npm run test:run

- name: Generate coverage
  run: npm run test:coverage
```

## Troubleshooting

### Tests fail with "Cannot find module"
- Ensure all dependencies are installed: `npm ci`
- Check that import paths use `.js` extension (required for ESM)

### Tests hang indefinitely
- Check for missing `await` on async operations
- Ensure cleanup in `afterEach` blocks completes

### Coverage reports missing
- Run `npm run test:coverage` to generate reports
- Check `coverage/` directory is not gitignored

### Tests pass locally but fail in CI
- Ensure you're using `npm ci` not `npm install`
- Check for hardcoded paths (use temp directories)
- Verify Node.js version matches CI environment

## Adding New Tests

When adding new features:

1. **Create test file**: `featureName.test.ts` alongside source file
2. **Write failing test**: Define expected behavior
3. **Implement feature**: Make test pass
4. **Add edge cases**: Test error conditions, boundaries
5. **Update this doc**: If adding new test categories

Example workflow:
```bash
# Create test file
touch src/lib/newFeature.test.ts

# Watch mode while developing
npm test

# Verify all tests pass
npm run test:run

# Check coverage
npm run test:coverage
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vitest API Reference](https://vitest.dev/api/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
