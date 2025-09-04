// Mock for next/headers
export const cookies = jest.fn(() => ({
  get: jest.fn(),
  set: jest.fn(),
}));
