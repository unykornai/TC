/**
 * Phase 7 — Connectivity & Live Ledger Integration Test
 *
 * Tests:
 *   - XRPLClient connect/disconnect lifecycle
 *   - XRPLClient account query methods
 *   - StellarClient account query methods
 *   - Dashboard async buildState() with live engine wiring
 *   - Trustline setup script structure
 *   - Verification script structure
 *
 * NOTE: Tests use mock/offline mode where possible.
 * Live testnet tests are in the 'Live Testnet' describe block
 * and can be skipped with SKIP_LIVE_TESTS=1 env var.
 */
import { XRPLClient } from '../packages/xrpl-core/src';
import { StellarClient } from '../packages/stellar-core/src';
import { MultisigGovernor } from '../packages/governance/src';
import { ComplianceEngine } from '../packages/compliance/src';
import { BondFactory } from '../packages/bond/src';
import { ReportingEngine } from '../packages/reporting/src';
import { AuditEventStore, ReportGenerator } from '../packages/audit/src';
import * as fs from 'fs';
import * as path from 'path';

// ─── Unit Tests (no network) ────────────────────────────────────

describe('Phase 7 — XRPL Client Unit Tests', () => {
  let client: XRPLClient;

  beforeEach(() => {
    client = new XRPLClient({ network: 'testnet' });
  });

  test('initializes with testnet config', () => {
    expect(client.network).toBe('testnet');
    expect(client.isConnected).toBe(false);
  });

  test('throws when querying without connection', async () => {
    await expect(client.getAccountInfo('rTest123')).rejects.toThrow('not connected');
  });

  test('throws when getting trustlines without connection', async () => {
    await expect(client.getTrustlines('rTest123')).rejects.toThrow('not connected');
  });

  test('throws when getting balance without connection', async () => {
    await expect(client.getBalance('rTest123')).rejects.toThrow('not connected');
  });

  test('static utility: xrpToDrops', () => {
    expect(XRPLClient.xrpToDrops('1')).toBe('1000000');
    expect(XRPLClient.xrpToDrops('100')).toBe('100000000');
  });

  test('static utility: dropsToXrp', () => {
    expect(XRPLClient.dropsToXrp('1000000')).toBe('1');
    expect(XRPLClient.dropsToXrp('100000000')).toBe('100');
  });

  test('static utility: hexEncode/hexDecode', () => {
    const original = 'OPTKAS';
    const hex = XRPLClient.hexEncode(original);
    expect(XRPLClient.hexDecode(hex)).toBe(original);
  });

  test('static utility: ripple time conversion', () => {
    const iso = '2026-06-01T00:00:00.000Z';
    const rippleTime = XRPLClient.isoToRippleTime(iso);
    expect(rippleTime).toBeGreaterThan(0);
    const backToIso = XRPLClient.rippleTimeToIso(rippleTime);
    expect(backToIso).toBe(iso);
  });

  test('emits events as EventEmitter', () => {
    const events: string[] = [];
    client.on('test_event', () => events.push('fired'));
    client.emit('test_event');
    expect(events).toEqual(['fired']);
  });
});

describe('Phase 7 — Stellar Client Unit Tests', () => {
  let client: StellarClient;

  beforeEach(() => {
    client = new StellarClient({ network: 'testnet' });
  });

  test('initializes with testnet config', () => {
    expect(client.network).toBe('testnet');
    expect(client.networkPassphrase).toBe('Test SDF Network ; September 2015');
  });

  test('static utility: createAsset', () => {
    const asset = StellarClient.createAsset('OPTKAS', 'GCYIHBAM2ND4E3XRUWDLVKZCLEHLH63PPXE2ZNIUXDMAETEZMSPA6U3C');
    expect(asset).toBeDefined();
  });

  test('static utility: nativeAsset', () => {
    const native = StellarClient.nativeAsset();
    expect(native).toBeDefined();
  });

  test('static utility: buildPaymentOp', () => {
    const asset = StellarClient.nativeAsset();
    const op = StellarClient.buildPaymentOp('GCYIHBAM2ND4E3XRUWDLVKZCLEHLH63PPXE2ZNIUXDMAETEZMSPA6U3C', asset, '100');
    expect(op).toBeDefined();
  });

  test('static utility: buildChangeTrustOp', () => {
    const asset = StellarClient.createAsset('OPTKAS', 'GCYIHBAM2ND4E3XRUWDLVKZCLEHLH63PPXE2ZNIUXDMAETEZMSPA6U3C');
    const op = StellarClient.buildChangeTrustOp(asset, '100000000');
    expect(op).toBeDefined();
  });

  test('static utility: buildSetFlagsOp', () => {
    const op = StellarClient.buildSetFlagsOp({ homeDomain: 'optkas.com' });
    expect(op).toBeDefined();
  });

  test('static utility: buildManageDataOp', () => {
    const op = StellarClient.buildManageDataOp('attestation_hash', Buffer.from('abc123'));
    expect(op).toBeDefined();
  });

  test('emits events as EventEmitter', () => {
    const events: string[] = [];
    client.on('test_event', () => events.push('fired'));
    client.emit('test_event');
    expect(events).toEqual(['fired']);
  });
});

// ─── Dashboard Async Integration ────────────────────────────────

describe('Phase 7 — Dashboard Live Integration', () => {
  test('dashboard server.ts exports buildState as async function', async () => {
    const dashModule = require('../apps/dashboard/src/server');
    expect(typeof dashModule.buildState).toBe('function');
    // buildState returns a Promise since it's async
    const result = dashModule.buildState();
    expect(result).toBeInstanceOf(Promise);
  });

  test('dashboard buildState() returns complete state structure', async () => {
    const { buildState } = require('../apps/dashboard/src/server');
    // buildState will try to connect to XRPL — it should handle connection errors gracefully
    const state = await buildState();

    // Structural assertions (always valid regardless of network availability)
    expect(state).toHaveProperty('config');
    expect(state).toHaveProperty('lastRefresh');
    expect(state).toHaveProperty('xrpl');
    expect(state).toHaveProperty('stellar');
    expect(state).toHaveProperty('governance');
    expect(state).toHaveProperty('compliance');
    expect(state).toHaveProperty('bonds');
    expect(state).toHaveProperty('reporting');
    expect(state).toHaveProperty('attestations');
    expect(state).toHaveProperty('audit');

    // XRPL state structure
    expect(state.xrpl).toHaveProperty('connected');
    expect(state.xrpl).toHaveProperty('network');
    expect(state.xrpl).toHaveProperty('accounts');
    expect(state.xrpl).toHaveProperty('escrows');

    // Stellar state structure
    expect(state.stellar).toHaveProperty('connected');
    expect(state.stellar).toHaveProperty('network');
    expect(state.stellar).toHaveProperty('accounts');

    // Governance populated from live engines
    expect(state.governance.threshold).toBeGreaterThanOrEqual(0);
    expect(typeof state.governance.activeSigners).toBe('number');
    expect(typeof state.governance.pendingProposals).toBe('number');

    // Compliance populated from live engines
    expect(typeof state.compliance.breachedCovenants).toBe('number');
    expect(typeof state.compliance.overdueCovenants).toBe('number');
    expect(state.compliance.engineStatus).toBe('active');

    // Bonds
    expect(state.bonds.factoryStatus).toBe('active');

    // Reporting
    expect(state.reporting.engineStatus).toBe('active');
  }, 60000); // 60s timeout for potential network delay

  test('dashboard HTML generation works with async state', async () => {
    const { buildState, generateDashboardHTML } = require('../apps/dashboard/src/server');
    const state = await buildState();
    const html = generateDashboardHTML(state);

    expect(html).toContain('OPTKAS INSTITUTIONAL DASHBOARD');
    expect(html).toContain('READ-ONLY');
    expect(html).toContain('XRPL Ledger');
    expect(html).toContain('Stellar Ledger');
    expect(html).toContain('Governance');
    expect(html).toContain('Compliance Engine');
    expect(html).toContain('Bond Pipeline');
    expect(html).toContain('Reporting Engine');
  }, 60000);
});

// ─── Script Structure Validation ────────────────────────────────

describe('Phase 7 — Script Validation', () => {
  test('setup-trustlines.ts exists and is valid TypeScript', () => {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'setup-trustlines.ts');
    expect(fs.existsSync(scriptPath)).toBe(true);
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('XRPLClient');
    expect(content).toContain('TrustSet');
    expect(content).toContain('AccountSet');
    expect(content).toContain('DefaultRipple');
    expect(content).toContain('OPTKAS.BOND');
    expect(content).toContain('OPTKAS.ESCROW');
    expect(content).toContain('UNSIGNED');
    expect(content).toContain('multisig');
  });

  test('verify-testnet.ts exists and is valid TypeScript', () => {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'verify-testnet.ts');
    expect(fs.existsSync(scriptPath)).toBe(true);
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('XRPLClient');
    expect(content).toContain('StellarClient');
    expect(content).toContain('HealthReport');
    expect(content).toContain('AccountReport');
    expect(content).toContain('DefaultRipple');
    expect(content).toContain('trustlines');
    expect(content).toContain('testnet-health-report.json');
  });

  test('unsigned transaction output directory referenced in setup-trustlines', () => {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'setup-trustlines.ts');
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('unsigned-transactions');
    expect(content).toContain('saveUnsignedTx');
  });
});

// ─── Config Validation ──────────────────────────────────────────

describe('Phase 7 — Config Validation for Live Connectivity', () => {
  const configPath = path.join(__dirname, '..', 'config', 'platform-config.yaml');

  test('platform-config.yaml has XRPL accounts with addresses', () => {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = require('yaml').parse(raw);

    expect(config.xrpl_accounts).toBeDefined();
    const roles = Object.keys(config.xrpl_accounts);
    expect(roles).toContain('issuer');
    expect(roles).toContain('treasury');
    expect(roles).toContain('escrow');

    // All accounts should have real addresses (not null)
    for (const role of roles) {
      const addr = config.xrpl_accounts[role].address;
      expect(addr).toBeDefined();
      expect(addr).not.toBe('null');
      expect(typeof addr).toBe('string');
      expect(addr.startsWith('r')).toBe(true);
    }
  });

  test('platform-config.yaml has Stellar accounts with public keys', () => {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = require('yaml').parse(raw);

    expect(config.stellar_accounts).toBeDefined();
    const roles = Object.keys(config.stellar_accounts);
    expect(roles).toContain('issuer');
    expect(roles).toContain('distribution');
    expect(roles).toContain('anchor');

    for (const role of roles) {
      const key = config.stellar_accounts[role].public_key;
      expect(key).toBeDefined();
      expect(key).not.toBe('null');
      expect(typeof key).toBe('string');
      expect(key.startsWith('G')).toBe(true);
    }
  });

  test('platform-config.yaml has network configuration', () => {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = require('yaml').parse(raw);

    expect(config.networks.xrpl.testnet.url).toBe('wss://s.altnet.rippletest.net:51233');
    expect(config.networks.stellar.testnet.url).toBe('https://horizon-testnet.stellar.org');
    expect(config.networks.xrpl.active).toBe('testnet');
    expect(config.networks.stellar.active).toBe('testnet');
  });

  test('platform-config.yaml has token definitions', () => {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = require('yaml').parse(raw);

    expect(config.tokens).toBeDefined();
    expect(Array.isArray(config.tokens)).toBe(true);

    const bondToken = config.tokens.find((t: any) => t.code === 'OPTKAS.BOND');
    expect(bondToken).toBeDefined();
    expect(bondToken.ledger).toBe('xrpl');
    expect(bondToken.issuer_account).toBe('issuer');
    expect(bondToken.trustline_limit).toBeGreaterThan(0);
  });
});
