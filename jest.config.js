// jest.config.js
module.exports = {
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: ['src/app/actions/**/*.ts'],
  coverageDirectory: 'coverage',
  moduleFileExtensions: ['js', 'ts', 'tsx', 'json', 'node'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: './tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  roots: ['<rootDir>'],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/__tests__/setup.ts'
  ],
  // Automatically mock all imported modules in the '__mocks__' directory
  automock: false,
  resetMocks: false,
};
