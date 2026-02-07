/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages/', '<rootDir>/scripts/', '<rootDir>/tests/'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
  moduleNameMapper: {
    '^@optkas/xrpl-core$': '<rootDir>/packages/xrpl-core/src',
    '^@optkas/stellar-core$': '<rootDir>/packages/stellar-core/src',
    '^@optkas/issuance$': '<rootDir>/packages/issuance/src',
    '^@optkas/escrow$': '<rootDir>/packages/escrow/src',
    '^@optkas/attestation$': '<rootDir>/packages/attestation/src',
    '^@optkas/dex-amm$': '<rootDir>/packages/dex-amm/src',
    '^@optkas/trading$': '<rootDir>/packages/trading/src',
    '^@optkas/audit$': '<rootDir>/packages/audit/src',
    '^@optkas/ledger$': '<rootDir>/packages/ledger/src',
    '^@optkas/dex$': '<rootDir>/packages/dex/src',
    '^@optkas/gateway$': '<rootDir>/packages/gateway/src',
    '^@optkas/bond$': '<rootDir>/packages/bond/src',
    '^@optkas/rwa$': '<rootDir>/packages/rwa/src',
    '^@optkas/portfolio$': '<rootDir>/packages/portfolio/src',
    '^@optkas/settlement$': '<rootDir>/packages/settlement/src'
  },
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary']
};
