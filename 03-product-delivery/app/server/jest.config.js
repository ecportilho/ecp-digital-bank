/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/?(*.)+(test).ts'],
  extensionsToTreatAsEsm: ['.ts'],
  setupFiles: ['<rootDir>/src/test/jest.env.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: { module: 'ESNext', target: 'ES2022' } }],
  },
  testTimeout: 30000,
}
