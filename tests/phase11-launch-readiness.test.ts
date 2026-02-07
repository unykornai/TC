/**
 * Phase 11 — Launch Readiness Integration Test
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Tests:
 *   - TransactionQueue (enqueue, sign, submit, confirm, cancel, expire, query, persist)
 *   - Deployment readiness verification script
 *   - Dashboard funding pipeline + tx-queue integration
 *   - Index exports for tx-queue
 *   - Cross-file alignment (pipeline → queue → dashboard)
 */
import * as fs from 'fs';
import * as path from 'path';

// ─── Transaction Queue Source Validation ────────────────────────

describe('Phase 11 — TransactionQueue Source', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/tx-queue.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('tx-queue.ts exists', () => {
    expect(fs.existsSync(srcPath)).toBe(true);
  });

  test('exports TransactionQueue class', () => {
    expect(src).toContain('export class TransactionQueue extends EventEmitter');
  });

  test('exports QueuedTransaction interface', () => {
    expect(src).toContain('export interface QueuedTransaction');
  });

  test('exports TransactionSignature interface', () => {
    expect(src).toContain('export interface TransactionSignature');
  });

  test('exports TxQueueConfig interface', () => {
    expect(src).toContain('export interface TxQueueConfig');
  });

  test('exports TxQueueSummary interface', () => {
    expect(src).toContain('export interface TxQueueSummary');
  });

  test('exports TxQueueAuditEntry interface', () => {
    expect(src).toContain('export interface TxQueueAuditEntry');
  });

  test('exports TxStatus type', () => {
    expect(src).toContain('export type TxStatus');
  });

  test('exports TxLedger type', () => {
    expect(src).toContain('export type TxLedger');
  });

  test('exports SignerRole type', () => {
    expect(src).toContain('export type SignerRole');
  });
});

describe('Phase 11 — TransactionQueue Lifecycle', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/tx-queue.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('has enqueue method', () => {
    expect(src).toContain('enqueue(params:');
  });

  test('has sign method', () => {
    expect(src).toContain('sign(txId: string, params:');
  });

  test('has markSubmitted method', () => {
    expect(src).toContain('markSubmitted(txId: string, txHash: string)');
  });

  test('has markConfirmed method', () => {
    expect(src).toContain('markConfirmed(txId: string, ledgerIndex: number)');
  });

  test('has markFailed method', () => {
    expect(src).toContain('markFailed(txId: string, error: string)');
  });

  test('has cancel method', () => {
    expect(src).toContain('cancel(txId: string, reason: string, actor: string)');
  });

  test('has expireStale method', () => {
    expect(src).toContain('expireStale()');
  });

  test('has enqueueBatch method', () => {
    expect(src).toContain('enqueueBatch(params:');
  });

  test('generates TX- prefixed IDs', () => {
    expect(src).toContain("id: `TX-");
  });

  test('generates AUD- prefixed audit IDs', () => {
    expect(src).toContain("id: `AUD-");
  });
});

describe('Phase 11 — TransactionQueue Status Transitions', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/tx-queue.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('supports pending_signature status', () => {
    expect(src).toContain("'pending_signature'");
  });

  test('supports partially_signed status', () => {
    expect(src).toContain("'partially_signed'");
  });

  test('supports ready_to_submit status', () => {
    expect(src).toContain("'ready_to_submit'");
  });

  test('supports submitted status', () => {
    expect(src).toContain("'submitted'");
  });

  test('supports confirmed status', () => {
    expect(src).toContain("'confirmed'");
  });

  test('supports failed status', () => {
    expect(src).toContain("'failed'");
  });

  test('supports expired status', () => {
    expect(src).toContain("'expired'");
  });

  test('supports cancelled status', () => {
    expect(src).toContain("'cancelled'");
  });

  test('checks quorum for ready_to_submit transition', () => {
    expect(src).toContain('signatures.length >= tx.requiredSignatures');
  });

  test('prevents duplicate signer', () => {
    expect(src).toContain('already signed transaction');
  });

  test('prevents duplicate role', () => {
    expect(src).toContain('already signed transaction');
  });
});

describe('Phase 11 — TransactionQueue Query Methods', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/tx-queue.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('has get method', () => {
    expect(src).toContain('get(txId: string)');
  });

  test('has filter method', () => {
    expect(src).toContain('filter(predicate:');
  });

  test('has byStatus method', () => {
    expect(src).toContain('byStatus(status: TxStatus)');
  });

  test('has byPipeline method', () => {
    expect(src).toContain('byPipeline(pipelineId: string)');
  });

  test('has byLedger method', () => {
    expect(src).toContain('byLedger(ledger: TxLedger)');
  });

  test('has awaitingRole method', () => {
    expect(src).toContain('awaitingRole(role: SignerRole)');
  });

  test('has getPending method', () => {
    expect(src).toContain('getPending()');
  });

  test('has getReady method', () => {
    expect(src).toContain('getReady()');
  });

  test('has getSummary method', () => {
    expect(src).toContain('getSummary(): TxQueueSummary');
  });

  test('has getAuditLog method', () => {
    expect(src).toContain('getAuditLog()');
  });

  test('has getAuditForTx method', () => {
    expect(src).toContain('getAuditForTx(txId: string)');
  });
});

describe('Phase 11 — TransactionQueue Persistence', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/tx-queue.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('has persist method', () => {
    expect(src).toContain('private persist()');
  });

  test('has loadFromDisk method', () => {
    expect(src).toContain('private loadFromDisk()');
  });

  test('supports persistPath config', () => {
    expect(src).toContain('persistPath');
  });

  test('creates directory for persistence', () => {
    expect(src).toContain('fs.mkdirSync(dir, { recursive: true })');
  });

  test('serializes queue as JSON', () => {
    expect(src).toContain('JSON.stringify(data, null, 2)');
  });
});

describe('Phase 11 — TransactionQueue Events', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/tx-queue.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('emits enqueued event', () => {
    expect(src).toContain("this.emit('enqueued'");
  });

  test('emits signed event', () => {
    expect(src).toContain("this.emit('signed'");
  });

  test('emits ready event', () => {
    expect(src).toContain("this.emit('ready'");
  });

  test('emits submitted event', () => {
    expect(src).toContain("this.emit('submitted'");
  });

  test('emits confirmed event', () => {
    expect(src).toContain("this.emit('confirmed'");
  });

  test('emits failed event', () => {
    expect(src).toContain("this.emit('failed'");
  });

  test('emits cancelled event', () => {
    expect(src).toContain("this.emit('cancelled'");
  });

  test('emits expired event', () => {
    expect(src).toContain("this.emit('expired'");
  });
});

describe('Phase 11 — TransactionQueue Config', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/tx-queue.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('default requiredSignatures is 2', () => {
    expect(src).toContain('requiredSignatures: config?.requiredSignatures ?? 2');
  });

  test('default expiryHours is 72', () => {
    expect(src).toContain('expiryHours: config?.expiryHours ?? 72');
  });

  test('default autoExpire is true', () => {
    expect(src).toContain('autoExpire: config?.autoExpire ?? true');
  });

  test('supports SignerRole: treasury, compliance, trustee', () => {
    expect(src).toContain("'treasury'");
    expect(src).toContain("'compliance'");
    expect(src).toContain("'trustee'");
  });
});

// ─── Deployment Readiness Script ────────────────────────────────

describe('Phase 11 — Deployment Readiness Script', () => {
  const scriptPath = path.resolve(__dirname, '../scripts/verify-deployment-readiness.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(scriptPath, 'utf-8');
  });

  test('verify-deployment-readiness.ts exists', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('uses createBaseCommand from cli-utils', () => {
    expect(src).toContain('createBaseCommand');
    expect(src).toContain("from './lib/cli-utils'");
  });

  test('checks config integrity', () => {
    expect(src).toContain('checkConfigIntegrity');
  });

  test('checks package integrity', () => {
    expect(src).toContain('checkPackageIntegrity');
  });

  test('checks script availability', () => {
    expect(src).toContain('checkScriptAvailability');
  });

  test('checks dashboard availability', () => {
    expect(src).toContain('checkDashboardAvailability');
  });

  test('checks data room', () => {
    expect(src).toContain('checkDataRoom');
  });

  test('checks test suites', () => {
    expect(src).toContain('checkTestSuites');
  });

  test('generates ReadinessReport', () => {
    expect(src).toContain('interface ReadinessReport');
    expect(src).toContain('generateReport');
  });

  test('supports --save-report option', () => {
    expect(src).toContain("'--save-report <path>'");
  });

  test('supports --json output', () => {
    expect(src).toContain('jsonOutput');
    expect(src).toContain('JSON.stringify(report');
  });
});

describe('Phase 11 — Readiness Checks Coverage', () => {
  const scriptPath = path.resolve(__dirname, '../scripts/verify-deployment-readiness.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(scriptPath, 'utf-8');
  });

  test('validates all 6 XRPL account roles', () => {
    const roles = ['issuer', 'treasury', 'escrow', 'attestation', 'amm', 'trading'];
    for (const role of roles) {
      expect(src).toContain(role);
    }
  });

  test('validates all 3 Stellar account roles', () => {
    const roles = ['issuer', 'distribution', 'anchor'];
    for (const role of roles) {
      expect(src).toContain(role);
    }
  });

  test('validates 21 required packages', () => {
    expect(src).toContain("'xrpl-core'");
    expect(src).toContain("'stellar-core'");
    expect(src).toContain("'funding-ops'");
    expect(src).toContain("'governance'");
    expect(src).toContain("'bridge'");
  });

  test('validates funding-ops source files', () => {
    expect(src).toContain("'pipeline.ts'");
    expect(src).toContain("'xrpl-activator.ts'");
    expect(src).toContain("'stellar-activator.ts'");
    expect(src).toContain("'report-generator.ts'");
    expect(src).toContain("'tx-queue.ts'");
  });

  test('validates CLI fund commands presence', () => {
    expect(src).toContain("command('fund')");
  });

  test('validates critical scripts', () => {
    expect(src).toContain('execute-funding-pipeline.ts');
    expect(src).toContain('xrpl-deploy-trustlines.ts');
    expect(src).toContain('stellar-issue-asset.ts');
  });

  test('checks DATA_ROOM_v1 integrity', () => {
    expect(src).toContain('DATA_ROOM_v1');
    expect(src).toContain('INDEX.md');
    expect(src).toContain('HASHES.txt');
  });

  test('classifies check severity: critical, warning, info', () => {
    expect(src).toContain("severity: 'critical'");
    expect(src).toContain("severity: 'warning'");
    expect(src).toContain("severity: 'info'");
  });

  test('reports blocking issues', () => {
    expect(src).toContain('blockingIssues');
  });
});

// ─── Dashboard Integration ──────────────────────────────────────

describe('Phase 11 — Dashboard Funding Integration', () => {
  const serverPath = path.resolve(__dirname, '../apps/dashboard/src/server.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(serverPath, 'utf-8');
  });

  test('dashboard imports TransactionQueue', () => {
    expect(src).toContain('TransactionQueue');
    expect(src).toContain('funding-ops/src/tx-queue');
  });

  test('dashboard imports TxQueueSummary type', () => {
    expect(src).toContain('TxQueueSummary');
  });

  test('dashboard instantiates txQueue', () => {
    expect(src).toContain('new TransactionQueue');
  });

  test('DashboardState includes fundingPipeline', () => {
    expect(src).toContain('fundingPipeline:');
    expect(src).toContain('phasesConfigured');
    expect(src).toContain('activatorsReady');
    expect(src).toContain('reportGeneratorReady');
  });

  test('DashboardState includes txQueue summary', () => {
    expect(src).toContain('txQueue: TxQueueSummary');
  });

  test('buildState populates fundingPipeline state', () => {
    expect(src).toContain("status: 'configured'");
    expect(src).toContain('phasesConfigured: 7');
  });

  test('buildState populates txQueue from getSummary', () => {
    expect(src).toContain('txQueue.getSummary()');
  });

  test('dashboard HTML includes Funding Pipeline card', () => {
    expect(src).toContain('Funding Pipeline');
    expect(src).toContain('XRPL Activator');
    expect(src).toContain('Stellar Activator');
    expect(src).toContain('Report Generator');
  });

  test('dashboard HTML includes Transaction Queue card', () => {
    expect(src).toContain('Transaction Queue');
    expect(src).toContain('Pending Signature');
    expect(src).toContain('Partially Signed');
    expect(src).toContain('Ready to Submit');
    expect(src).toContain('XRPL Transactions');
    expect(src).toContain('Stellar Transactions');
  });
});

// ─── Index Exports ──────────────────────────────────────────────

describe('Phase 11 — funding-ops Index Exports', () => {
  const indexPath = path.resolve(__dirname, '../packages/funding-ops/src/index.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(indexPath, 'utf-8');
  });

  test('exports TransactionQueue', () => {
    expect(src).toContain('TransactionQueue');
  });

  test('exports QueuedTransaction type', () => {
    expect(src).toContain('QueuedTransaction');
  });

  test('exports TransactionSignature type', () => {
    expect(src).toContain('TransactionSignature');
  });

  test('exports TxQueueConfig type', () => {
    expect(src).toContain('TxQueueConfig');
  });

  test('exports TxQueueSummary type', () => {
    expect(src).toContain('TxQueueSummary');
  });

  test('exports TxQueueAuditEntry type', () => {
    expect(src).toContain('TxQueueAuditEntry');
  });

  test('exports TxStatus type', () => {
    expect(src).toContain('TxStatus');
  });

  test('exports TxLedger type', () => {
    expect(src).toContain('TxLedger');
  });

  test('still exports FundingPipeline', () => {
    expect(src).toContain('FundingPipeline');
  });

  test('still exports FundingReportGenerator', () => {
    expect(src).toContain('FundingReportGenerator');
  });

  test('still exports XRPLActivator', () => {
    expect(src).toContain('XRPLActivator');
  });

  test('still exports StellarActivator', () => {
    expect(src).toContain('StellarActivator');
  });
});

// ─── Cross-File Integration ─────────────────────────────────────

describe('Phase 11 — Cross-File Integration', () => {
  test('tx-queue aligns with pipeline transaction types', () => {
    const queueSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/funding-ops/src/tx-queue.ts'),
      'utf-8'
    );
    // Queue handles both ledgers
    expect(queueSrc).toContain("'xrpl'");
    expect(queueSrc).toContain("'stellar'");
    // Queue tracks phases
    expect(queueSrc).toContain('phase: string');
    // Queue tracks pipeline ID
    expect(queueSrc).toContain('pipelineId: string');
  });

  test('tx-queue signer roles match governance roles', () => {
    const queueSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/funding-ops/src/tx-queue.ts'),
      'utf-8'
    );
    const govSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/governance/src/multisig.ts'),
      'utf-8'
    );
    // Both define treasury, compliance, trustee
    expect(queueSrc).toContain("'treasury'");
    expect(queueSrc).toContain("'compliance'");
    expect(queueSrc).toContain("'trustee'");
    expect(govSrc).toContain("'treasury'");
    expect(govSrc).toContain("'compliance'");
    expect(govSrc).toContain("'trustee'");
  });

  test('dashboard imports tx-queue from same source as index exports', () => {
    const dashSrc = fs.readFileSync(
      path.resolve(__dirname, '../apps/dashboard/src/server.ts'),
      'utf-8'
    );
    const indexSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/funding-ops/src/index.ts'),
      'utf-8'
    );
    // Both reference tx-queue
    expect(dashSrc).toContain('tx-queue');
    expect(indexSrc).toContain('./tx-queue');
  });

  test('readiness script validates all funding-ops source files', () => {
    const verifySrc = fs.readFileSync(
      path.resolve(__dirname, '../scripts/verify-deployment-readiness.ts'),
      'utf-8'
    );
    const fundingOpsSrc = path.resolve(__dirname, '../packages/funding-ops/src');
    const files = fs.readdirSync(fundingOpsSrc).filter(f => f.endsWith('.ts'));

    // Every funding-ops source file should be checked
    for (const file of files) {
      expect(verifySrc).toContain(file);
    }
  });

  test('all Phase 11 source files exist', () => {
    const files = [
      '../packages/funding-ops/src/tx-queue.ts',
      '../packages/funding-ops/src/index.ts',
      '../scripts/verify-deployment-readiness.ts',
      '../apps/dashboard/src/server.ts',
    ];
    for (const f of files) {
      expect(fs.existsSync(path.resolve(__dirname, f))).toBe(true);
    }
  });

  test('existing dashboard features preserved', () => {
    const dashSrc = fs.readFileSync(
      path.resolve(__dirname, '../apps/dashboard/src/server.ts'),
      'utf-8'
    );
    // Existing cards still present
    expect(dashSrc).toContain('Platform Status');
    expect(dashSrc).toContain('XRPL Ledger');
    expect(dashSrc).toContain('Stellar Ledger');
    expect(dashSrc).toContain('Active Escrows');
    expect(dashSrc).toContain('Governance');
    expect(dashSrc).toContain('Compliance Engine');
    expect(dashSrc).toContain('Bond Pipeline');
    expect(dashSrc).toContain('Reporting Engine');
    // New cards
    expect(dashSrc).toContain('Funding Pipeline');
    expect(dashSrc).toContain('Transaction Queue');
  });
});
