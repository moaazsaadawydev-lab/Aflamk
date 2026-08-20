import type { Config } from 'jest';

const config: Config = {
  displayName: 'Catalog',
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
  coverageDirectory: '<rootDir>/../../coverage/apps/Catalog',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/main.ts',
    '!<rootDir>/src/db/**',
  ],
  testTimeout: 10000,
};

export default config;
