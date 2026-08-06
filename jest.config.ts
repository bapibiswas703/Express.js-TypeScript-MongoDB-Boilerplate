import type { JestConfigWithTsJest } from 'ts-jest';
import { createDefaultPreset } from 'ts-jest';

const defaultPreset = createDefaultPreset({
  tsconfig: 'tsconfig.test.json',
});

const config: JestConfigWithTsJest = {
  ...defaultPreset,
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup/jest.setup.ts'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/tests/'],
  clearMocks: true,
  verbose: true,
};

export default config;
