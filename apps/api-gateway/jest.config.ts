import type { Config } from 'jest';

const config: Config = {
  displayName: 'api-gateway',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.spec.ts', '<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    '^@booking-ticket-system/(.*)$': '<rootDir>/../../libs/$1/src/index.ts',
  },
  coverageDirectory: '<rootDir>/../../coverage/apps/api-gateway',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/main.ts',
  ],
  testTimeout: 10000,
};

export default config;
