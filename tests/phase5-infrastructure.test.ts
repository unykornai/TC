/**
 * Phase 5 Infrastructure Test
 *
 * Validates that all 20 packages:
 *   - Have package.json with correct name
 *   - Have tsconfig.json
 *   - Have src/index.ts with exports
 *   - Compile and export their primary class/function
 */
import * as fs from 'fs';
import * as path from 'path';

const PACKAGES_DIR = path.join(__dirname, '..', 'packages');

const EXPECTED_PACKAGES = [
  'agents', 'attestation', 'audit', 'bond', 'bridge',
  'compliance', 'dex', 'dex-amm', 'escrow', 'gateway',
  'governance', 'issuance', 'ledger', 'portfolio', 'reporting',
  'rwa', 'settlement', 'stellar-core', 'trading', 'xrpl-core',
];

describe('Phase 5 — Package Infrastructure', () => {
  describe('all 20 packages exist', () => {
    test.each(EXPECTED_PACKAGES)('%s directory exists', (pkg) => {
      const dir = path.join(PACKAGES_DIR, pkg);
      expect(fs.existsSync(dir)).toBe(true);
    });
  });

  describe('all packages have package.json', () => {
    test.each(EXPECTED_PACKAGES)('%s/package.json exists with correct name', (pkg) => {
      const pkgPath = path.join(PACKAGES_DIR, pkg, 'package.json');
      expect(fs.existsSync(pkgPath)).toBe(true);
      const json = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      expect(json.name).toBe(`@optkas/${pkg}`);
      expect(json.private).toBe(true);
    });
  });

  describe('all packages have tsconfig.json', () => {
    test.each(EXPECTED_PACKAGES)('%s/tsconfig.json exists', (pkg) => {
      const tscPath = path.join(PACKAGES_DIR, pkg, 'tsconfig.json');
      expect(fs.existsSync(tscPath)).toBe(true);
      const json = JSON.parse(fs.readFileSync(tscPath, 'utf-8'));
      expect(json.compilerOptions).toBeDefined();
    });
  });

  describe('all packages have src/index.ts', () => {
    test.each(EXPECTED_PACKAGES)('%s/src/index.ts exists', (pkg) => {
      const indexPath = path.join(PACKAGES_DIR, pkg, 'src', 'index.ts');
      expect(fs.existsSync(indexPath)).toBe(true);
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain('export');
    });
  });

  describe('all packages have test files', () => {
    test.each(EXPECTED_PACKAGES)('%s has at least one test', (pkg) => {
      const pkgDir = path.join(PACKAGES_DIR, pkg);
      const hasTests = findTestFiles(pkgDir).length > 0;
      expect(hasTests).toBe(true);
    });
  });
});

describe('Phase 5 — Package Exports', () => {
  // Each package must be importable and export its primary class
  const PACKAGE_EXPORTS: [string, string][] = [
    ['agents', 'AgentEngine'],
    ['attestation', 'AttestationEngine'],
    ['audit', 'ReportGenerator'],
    ['bond', 'BondEngine'],
    ['bridge', 'BridgeManager'],
    ['compliance', 'ComplianceEngine'],
    ['dex', 'OrderBookEngine'],
    ['dex-amm', 'AMMManager'],
    ['escrow', 'EscrowManager'],
    ['gateway', 'StablecoinGateway'],
    ['governance', 'MultisigGovernor'],
    ['issuance', 'Issuer'],
    ['ledger', 'LedgerBootstrap'],
    ['portfolio', 'PortfolioManager'],
    ['reporting', 'ReportingEngine'],
    ['rwa', 'RWATokenFactory'],
    ['settlement', 'SettlementEngine'],
    ['stellar-core', 'StellarClient'],
    ['trading', 'TradingEngine'],
    ['xrpl-core', 'XRPLClient'],
  ];

  test.each(PACKAGE_EXPORTS)('%s exports %s', (pkg, className) => {
    const mod = require(`../packages/${pkg}/src`);
    expect(mod[className]).toBeDefined();
    expect(typeof mod[className]).toBe('function'); // classes are functions
  });
});

describe('Phase 5 — Dashboard', () => {
  test('dashboard server.ts exports startServer', () => {
    const mod = require('../apps/dashboard/src/server');
    expect(mod.startServer).toBeDefined();
    expect(typeof mod.startServer).toBe('function');
  });

  test('buildState returns valid state object', () => {
    const { buildState } = require('../apps/dashboard/src/server');
    const state = buildState();
    expect(state).toBeDefined();
    expect(state.lastRefresh).toBeDefined();
    expect(state.xrpl).toBeDefined();
    expect(state.stellar).toBeDefined();
    expect(state.governance).toBeDefined();
    expect(state.compliance).toBeDefined();
    expect(state.bonds).toBeDefined();
    expect(state.reporting).toBeDefined();
  });

  test('generateDashboardHTML returns valid HTML', () => {
    const { buildState, generateDashboardHTML } = require('../apps/dashboard/src/server');
    const state = buildState();
    const html = generateDashboardHTML(state);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('OPTKAS INSTITUTIONAL DASHBOARD');
    expect(html).toContain('Governance');
    expect(html).toContain('Compliance');
    expect(html).toContain('Bond Pipeline');
    expect(html).toContain('Reporting Engine');
  });
});

function findTestFiles(dir: string): string[] {
  const files: string[] = [];
  const scan = (d: string) => {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        scan(full);
      } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts')) {
        files.push(full);
      }
    }
  };
  scan(dir);
  return files;
}
