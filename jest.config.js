/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages/', '<rootDir>/scripts/'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
  moduleNameMapper: {
    '^@optkas/xrpl-core$': '<rootDir>/packages/xrpl-core/src',
    '^@optkas/stellar-core$': '<rootDir>/packages/stellar-core/src',
    '^@optkas/issuance$': '<rootDir>/packages/issuance/src',
    '^@optkas/escrow$': '<rootDir>/packages/escrow/src',
    '^@optkas/attestation$': '<rootDir>/packages/attestation/src',
    '^@optkas/dex-amm$': '<rootDir>/packages/dex-amm/src',
    '^@optkas/trading$': '<rootDir>/packages/trading/src',
    '^@optkas/audit$': '<rootDir>/packages/audit/src'
  },
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary']
};
