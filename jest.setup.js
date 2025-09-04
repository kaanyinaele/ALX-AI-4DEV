// jest.setup.js
// Set up environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-supabase-url.com';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Global beforeEach to reset all mocks
beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});
