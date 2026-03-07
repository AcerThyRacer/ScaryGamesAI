/**
 * Test Setup File
 * Global test configuration and utilities
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock console.error in tests to reduce noise
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('Warning') || args[0]?.includes?.('not implemented')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Global test utilities
global.testUtils = {
  createMockUser(overrides = {}) {
    return {
      id: 'test-user-' + Math.random().toString(36).substr(2, 9),
      email: 'test@example.com',
      username: 'TestUser',
      role: 'user',
      ...overrides
    };
  },

  createMockToken() {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 
           Math.random().toString(36).substr(2) + '.' + 
           Math.random().toString(36).substr(2);
  }
};

// Setup before all tests
beforeAll(() => {
  console.log('[TEST] Starting test suite...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
});

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// Teardown after all tests
afterAll(() => {
  console.log('[TEST] Test suite completed');
});
