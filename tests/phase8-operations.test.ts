/**
 * Phase 8 — Operational Completion Integration Test
 *
 * Tests:
 *   - Dashboard auto-start entry point
 *   - Bridge XChain transaction preparation (XChainCreateBridge, XChainCommit, XChainClaim)
 *   - Trading engine VWAP/limit strategies and prepareCancelAll
 *   - Portfolio syncIouBalances with live trustline queries
 *   - Reconciliation script structure and live query sections
 *   - Unified CLI tool structure and commands
 */
import * as fs from 'fs';
import * as path from 'path';

// ─── Dashboard Auto-Start ──────────────────────────────────────

describe('Phase 8 — Dashboard Entry Point', () => {
  test('index.ts exports buildState, generateDashboardHTML, startServer', () => {
    const indexPath = path.resolve(__dirname, '../apps/dashboard/src/index.ts');
    expect(fs.existsSync(indexPath)).toBe(true);
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('buildState');
    expect(content).toContain('generateDashboardHTML');
    expect(content).toContain('startServer');
  });

  test('index.ts has require.main auto-start block', () => {
    const indexPath = path.resolve(__dirname, '../apps/dashboard/src/index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('require.main === module');
    expect(content).toContain('startServer');
  });
});

// ─── Bridge XChain Transaction Preparation ─────────────────────

describe('Phase 8 — Bridge XChain Transactions', () => {
  let BridgeManager: any;

  beforeAll(() => {
    BridgeManager = require('../packages/bridge/src').BridgeManager;
  });

  test('BridgeManager can be instantiated', () => {
    const manager = new BridgeManager({ network: 'testnet' });
    expect(manager).toBeDefined();
  });

  test('has prepareXChainCreateBridge method', () => {
    const manager = new BridgeManager({ network: 'testnet' });
    expect(typeof manager.prepareXChainCreateBridge).toBe('function');
  });

  test('has prepareXChainCommit method', () => {
    const manager = new BridgeManager({ network: 'testnet' });
    expect(typeof manager.prepareXChainCommit).toBe('function');
  });

  test('has prepareXChainClaim method', () => {
    const manager = new BridgeManager({ network: 'testnet' });
    expect(typeof manager.prepareXChainClaim).toBe('function');
  });

  test('prepareXChainCreateBridge requires valid bridgeId', () => {
    const manager = new BridgeManager({ network: 'testnet' });
    expect(() => manager.prepareXChainCreateBridge('nonexistent', 'locking')).toThrow();
  });

  test('prepareXChainCommit requires valid bridgeId', () => {
    const manager = new BridgeManager({ network: 'testnet' });
    expect(() => manager.prepareXChainCommit('nonexistent', {
      senderAddress: 'rTest',
      amount: '1000000',
    })).toThrow();
  });

  test('prepareXChainClaim requires valid bridgeId', () => {
    const manager = new BridgeManager({ network: 'testnet' });
    expect(() => manager.prepareXChainClaim('nonexistent', {
      claimRecordId: 1,
      destinationAddress: 'rDest',
      amount: '1000000',
    })).toThrow();
  });

  test('bridge source code contains XChainCreateBridge transaction type', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../packages/bridge/src/bridge.ts'), 'utf-8'
    );
    expect(src).toContain('XChainCreateBridge');
    expect(src).toContain('XChainCommit');
    expect(src).toContain('XChainClaim');
  });
});

// ─── Trading Engine — VWAP, Limit, CancelAll ──────────────────

describe('Phase 8 — Trading Engine Extensions', () => {
  let TradingEngine: any;

  beforeAll(() => {
    TradingEngine = require('../packages/trading/src').TradingEngine;
  });

  const mockConfig = {
    network: 'testnet',
    enabled: true,
    risk: {
      maxPositionSize: 1000000,
      maxSlippage: 0.02,
      dailyLossLimit: 100000,
    },
  };

  test('TradingEngine can be instantiated', () => {
    const engine = new TradingEngine({ network: 'testnet' }, mockConfig);
    expect(engine).toBeDefined();
  });

  test('has prepareCancelAll method', () => {
    const engine = new TradingEngine({ network: 'testnet' }, mockConfig);
    expect(typeof engine.prepareCancelAll).toBe('function');
  });

  test('has getOpenOffers method', () => {
    const engine = new TradingEngine({ network: 'testnet' }, mockConfig);
    expect(typeof engine.getOpenOffers).toBe('function');
  });

  test('prepareCancelAll returns array', async () => {
    const engine = new TradingEngine({ network: 'testnet' }, mockConfig);
    const result = await engine.prepareCancelAll('rTest123', true);
    expect(Array.isArray(result)).toBe(true);
  });

  test('getOpenOffers returns array', async () => {
    const engine = new TradingEngine({ network: 'testnet' }, mockConfig);
    const result = await engine.getOpenOffers('rTest123');
    expect(Array.isArray(result)).toBe(true);
  });

  test('engine source contains VWAP strategy', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../packages/trading/src/engine.ts'), 'utf-8'
    );
    expect(src).toContain('vwap');
    expect(src).toContain('VWAP');
  });

  test('engine source contains limit order with passive flag', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../packages/trading/src/engine.ts'), 'utf-8'
    );
    expect(src).toContain('limit');
    expect(src).toContain('prepareLimitOrder');
    expect(src).toContain('tfPassive');
  });
});

// ─── Portfolio — syncIouBalances ───────────────────────────────

describe('Phase 8 — Portfolio IOU Sync', () => {
  test('PortfolioManager has syncIouBalances method', () => {
    const { PortfolioManager } = require('../packages/portfolio/src');
    const manager = new PortfolioManager({ network: 'testnet' });
    expect(typeof manager.syncIouBalances).toBe('function');
  });

  test('portfolio source uses getTrustlines for IOU sync', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../packages/portfolio/src/manager.ts'), 'utf-8'
    );
    expect(src).toContain('getTrustlines');
    expect(src).toContain('syncIouBalances');
    expect(src).toContain('iou_sync_complete');
  });
});

// ─── Reconciliation Script ─────────────────────────────────────

describe('Phase 8 — Reconciliation Engine', () => {
  const scriptPath = path.resolve(__dirname, '../scripts/reconcile-ledgers.ts');

  test('reconcile-ledgers.ts exists', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('imports XRPLClient and StellarClient', () => {
    const src = fs.readFileSync(scriptPath, 'utf-8');
    expect(src).toContain("import { XRPLClient }");
    expect(src).toContain("import { StellarClient }");
  });

  test('has XRPL reconciliation with live queries', () => {
    const src = fs.readFileSync(scriptPath, 'utf-8');
    expect(src).toContain('xrplClient.getAccountInfo');
    expect(src).toContain('xrplClient.getTrustlines');
  });

  test('has Stellar reconciliation with live queries', () => {
    const src = fs.readFileSync(scriptPath, 'utf-8');
    expect(src).toContain('stellarClient.getAccountInfo');
    expect(src).toContain('authRequired');
    expect(src).toContain('authRevocable');
  });

  test('has Cross-Ledger reconciliation section', () => {
    const src = fs.readFileSync(scriptPath, 'utf-8');
    expect(src).toContain('Cross-Ledger Reconciliation');
    expect(src).toContain('governance alignment');
  });

  test('no more PENDING stubs in XRPL/Stellar sections', () => {
    const src = fs.readFileSync(scriptPath, 'utf-8');
    // XRPL section should not have PENDING anymore
    const xrplSection = src.substring(
      src.indexOf('XRPL Reconciliation'),
      src.indexOf('Stellar Reconciliation')
    );
    expect(xrplSection).not.toContain("status: 'PENDING'");

    // Stellar section should not have PENDING anymore
    const stellarSection = src.substring(
      src.indexOf('Stellar Reconciliation'),
      src.indexOf('Cross-Ledger Reconciliation')
    );
    expect(stellarSection).not.toContain("status: 'PENDING'");
  });

  test('outputs JSON report with metadata and summary', () => {
    const src = fs.readFileSync(scriptPath, 'utf-8');
    expect(src).toContain('ReconciliationReport');
    expect(src).toContain('metadata');
    expect(src).toContain('summary');
    expect(src).toContain('overall_status');
  });
});

// ─── Unified CLI Tool ──────────────────────────────────────────

describe('Phase 8 — Operational CLI', () => {
  const cliPath = path.resolve(__dirname, '../apps/cli/src/cli.ts');

  test('CLI tool exists', () => {
    expect(fs.existsSync(cliPath)).toBe(true);
  });

  test('has balance command', () => {
    const src = fs.readFileSync(cliPath, 'utf-8');
    expect(src).toContain("command('balance')");
    expect(src).toContain('Query all account balances');
  });

  test('has escrow command with list and create subcommands', () => {
    const src = fs.readFileSync(cliPath, 'utf-8');
    expect(src).toContain("command('escrow')");
    expect(src).toContain("command('list')");
    expect(src).toContain("command('create')");
  });

  test('has trustline verify command', () => {
    const src = fs.readFileSync(cliPath, 'utf-8');
    expect(src).toContain("command('trustline')");
    expect(src).toContain("command('verify')");
  });

  test('has audit report command', () => {
    const src = fs.readFileSync(cliPath, 'utf-8');
    expect(src).toContain("command('audit')");
    expect(src).toContain("command('report')");
  });

  test('has reconcile command', () => {
    const src = fs.readFileSync(cliPath, 'utf-8');
    expect(src).toContain("command('reconcile')");
    expect(src).toContain('reconcile-ledgers');
  });

  test('has status command', () => {
    const src = fs.readFileSync(cliPath, 'utf-8');
    expect(src).toContain("command('status')");
    expect(src).toContain('Platform Status');
  });

  test('imports core platform modules', () => {
    const src = fs.readFileSync(cliPath, 'utf-8');
    expect(src).toContain('XRPLClient');
    expect(src).toContain('StellarClient');
    expect(src).toContain('EscrowManager');
    expect(src).toContain('ComplianceEngine');
    expect(src).toContain('AuditEventStore');
    expect(src).toContain('ReportingEngine');
  });

  test('uses shared cli-utils', () => {
    const src = fs.readFileSync(cliPath, 'utf-8');
    expect(src).toContain('loadConfig');
    expect(src).toContain('printHeader');
    expect(src).toContain('printSuccess');
    expect(src).toContain('printNetworkWarning');
    expect(src).toContain('validateNetwork');
  });
});

// ─── Integration: All Modules Load ─────────────────────────────

describe('Phase 8 — Full Module Integration', () => {
  const packages = [
    'xrpl-core', 'stellar-core', 'escrow', 'bridge', 'compliance',
    'governance', 'attestation', 'bond', 'portfolio', 'trading',
    'reporting', 'audit', 'settlement', 'issuance',
    'ledger', 'rwa', 'dex', 'dex-amm', 'agents', 'gateway',
  ];

  for (const pkg of packages) {
    test(`@optkas/${pkg} loads without error`, () => {
      const pkgPath = path.resolve(__dirname, `../packages/${pkg}/src/index.ts`);
      expect(fs.existsSync(pkgPath)).toBe(true);
      expect(() => require(`../packages/${pkg}/src`)).not.toThrow();
    });
  }
});
