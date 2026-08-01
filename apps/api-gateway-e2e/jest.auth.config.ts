/**
 * Standalone Jest config for the auth E2E test suite.
 * This config does NOT depend on a running NestJS test server —
 * it fires HTTP requests against the already-running API Gateway.
 *
 * Usage:
 *   npx jest --config apps/api-gateway-e2e/jest.auth.config.ts --runInBand --verbose
 */
import type { Config } from 'jest';

const config: Config = {
  displayName: 'auth-e2e',
  testEnvironment: 'node',
  testMatch: ['**/src/auth/**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  // Run tests serially — auth flow tests share state (accessToken, refreshToken)
  // and must not interfere with each other.
  // Pass --runInBand on the CLI when executing this config.
  // Generous timeout for gRPC round-trips
  testTimeout: 30000,
  // Environment variables used by the tests
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    },
  },
  coverageDirectory: '../../coverage/auth-e2e',
  collectCoverageFrom: ['../../apps/api-gateway/src/**/*.ts'],
};

export default config;
