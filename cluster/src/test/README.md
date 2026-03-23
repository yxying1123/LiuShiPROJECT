# Frontend Tests

This directory contains comprehensive unit and integration tests for the cluster frontend.

## Test Structure

```
src/test/
├── setup.js                 # Test setup and mocks
├── mocks/
│   ├── handlers.js          # MSW API mock handlers
│   └── server.js            # MSW server setup
└── ... (test files alongside source files)
```

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run Unit Tests

```bash
npm test
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run E2E Tests

```bash
npm run test:e2e
```

## Test Files

### Unit Tests

- `utils/apiClient.test.js` - API client utility tests
- `hooks/useFileOperations.test.js` - File operations hook tests
- `hooks/useDataIntegration.test.js` - Data integration hook tests
- `pages/FileListPage.test.jsx` - File list page tests

### E2E Tests

- `e2e/file-list.spec.js` - File list page E2E tests

## Mocking

API calls are mocked using MSW (Mock Service Worker). Mock handlers are defined in `mocks/handlers.js`.

## Coverage

Coverage reports are generated in `coverage/` directory when running `npm run test:coverage`.

## Adding New Tests

1. Create test files with `.test.js` or `.test.jsx` extension
2. Place them alongside the source files or in `__tests__` directories
3. Use `renderHook` for testing hooks
4. Use `render` from `@testing-library/react` for testing components
5. Mock external dependencies appropriately
