# Test Suite Documentation

## Overview

The Ports Explorer extension includes a comprehensive test suite covering unit tests, integration tests, and utility function tests.

## Test Structure

### 1. **Extension Integration Tests** (`src/test/extension.test.ts`)

Tests the overall extension activation and configuration:

- ✅ Extension presence and activation
- ✅ Command registration (all 16 commands)
- ✅ Configuration settings validation
- ✅ Tree view registration
- ✅ Default port labels and groups
- ✅ View mode validation (tree/list)
- ✅ Group by options validation
- ✅ Filter mode validation

### 2. **PortProvider Unit Tests** (`src/test/portProvider.test.ts`)

Tests the core PortProvider class functionality:

- ✅ Provider initialization with empty ports
- ✅ TreeItem retrieval
- ✅ View mode toggling (tree ↔ list)
- ✅ Filter application (none, favorites, dev, workspace)
- ✅ Search term filtering
- ✅ Provider disposal/cleanup

### 3. **Utility Function Tests** (`src/test/utils.test.ts`)

Tests helper functions and business logic:

- ✅ Port number validation (1-65535 range)
- ✅ Process name extraction from command lines
- ✅ Port label formatting
- ✅ Framework detection from package dependencies
- ✅ Category classification (dev vs system)
- ✅ URL formatting for ports
- ✅ Workspace path matching
- ✅ Port group validation
- ✅ History entry structure
- ✅ Analytics calculations (most used ports)

## Running Tests

### Prerequisites
```bash
pnpm install
```

### Run All Tests
```bash
pnpm test
```

### Run Specific Test Suite
```bash
# In VS Code
# Press F5 → Select "Extension Tests" from debug configurations
```

### Watch Mode
```bash
pnpm run watch-tests
```

## Test Coverage

### Covered Areas
- ✅ Extension activation and deactivation
- ✅ Command registration and availability
- ✅ Configuration schema validation
- ✅ Tree data provider methods
- ✅ Port categorization logic
- ✅ Framework detection
- ✅ Filter and search functionality
- ✅ Group management validation
- ✅ Analytics calculations

### Areas for Future Testing
- 🔄 Actual port scanning (requires mock netstat/systeminformation)
- 🔄 Process killing functionality
- 🔄 Import/Export configuration flows
- 🔄 History tracking over time
- 🔄 Multi-workspace scenarios

## Test Data

### Sample Port Data
```typescript
{
  port: 3000,
  pid: 12345,
  process: 'node',
  cmdline: 'node server.js',
  category: 'dev',
  isFavorite: true,
  project: {
    name: 'my-app',
    path: '/path/to/my-app',
    framework: 'React'
  }
}
```

### Sample Groups
```typescript
{
  'Frontend': [3000, 5173, 4200],
  'Backend': [5000, 8000],
  'Databases': [5432, 27017, 6379]
}
```

## Continuous Integration

Tests are designed to run in CI/CD environments:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    pnpm install
    pnpm test
```

## Debugging Tests

1. **In VS Code**:
   - Set breakpoints in test files
   - Press `F5` → Select "Extension Tests"

2. **Console Output**:
   - Tests log to VS Code Output panel
   - Check "Extension Host" channel

3. **Common Issues**:
   - VS Code download timeout: Increase timeout in `.vscode-test` config
   - Extension not activating: Check `package.json` publisher matches test

## Test Best Practices

- ✅ Each test is independent and isolated
- ✅ Use descriptive test names
- ✅ Clean up resources in `teardown()`
- ✅ Mock external dependencies where possible
- ✅ Test both success and failure paths

## Adding New Tests

1. Create test file in `src/test/`
2. Follow naming convention: `*.test.ts`
3. Use Mocha's `suite()` and `test()` functions
4. Import required modules and extension code
5. Run `pnpm test` to verify

Example:
```typescript
import * as assert from 'assert';

suite('My Feature Test Suite', () => {
  test('Should do something', () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

## Test Results

Run `pnpm test` to see results:

```
✓ Extension should be present
✓ Extension should activate
✓ All commands should be registered
✓ Configuration settings should exist
✓ Provider should initialize with empty ports
✓ Port number validation - valid ports
... (and more)

Total: XX tests passed
```

---

**Note**: First test run may take longer as it downloads VS Code test instance.
