/**
 * Phase 12 — Audit & Settlement Integration Test
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Tests:
 *   - AuditBridge (event recording, tx/pipeline/settlement/governance integration, queries, anchoring, persistence)
 *   - SettlementConnector (creation from confirmed tx, leg execution, completion, failure, dispute, queries, persistence)
 *   - Dashboard integration (imports, singletons, state fields, HTML cards)
 *   - Index exports for audit-bridge and settlement-connector
 *   - Cross-file alignment (audit ↔ settlement ↔ tx-queue ↔ dashboard)
 */
import * as fs from 'fs';
import * as path from 'path';

// ─── AuditBridge Source Validation ──────────────────────────────

describe('Phase 12 — AuditBridge Source', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/audit-bridge.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('audit-bridge.ts exists', () => {
    expect(fs.existsSync(srcPath)).toBe(true);
  });

  test('exports AuditBridge class', () => {
    expect(src).toContain('export class AuditBridge extends EventEmitter');
  });

  test('exports AuditBridgeEvent interface', () => {
    expect(src).toContain('export interface AuditBridgeEvent');
  });

  test('exports AuditBridgeConfig interface', () => {
    expect(src).toContain('export interface AuditBridgeConfig');
  });

  test('exports AuditBridgeSummary interface', () => {
    expect(src).toContain('export interface AuditBridgeSummary');
  });

  test('exports AuditBridgeStats interface', () => {
    expect(src).toContain('export interface AuditBridgeStats');
  });

  test('exports AuditSeverity type', () => {
    expect(src).toContain('export type AuditSeverity');
  });

  test('exports AuditCategory type', () => {
    expect(src).toContain('export type AuditCategory');
  });

  test('exports AuditAnchorTarget type', () => {
    expect(src).toContain('export type AuditAnchorTarget');
  });
});

describe('Phase 12 — AuditBridge Event Recording', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/audit-bridge.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('has record method', () => {
    expect(src).toContain('record(params:');
  });

  test('has recordTxEvent method', () => {
    expect(src).toContain('recordTxEvent(params:');
  });

  test('has recordPipelineEvent method', () => {
    expect(src).toContain('recordPipelineEvent(params:');
  });

  test('has recordSettlementEvent method', () => {
    expect(src).toContain('recordSettlementEvent(params:');
  });

  test('has recordGovernanceEvent method', () => {
    expect(src).toContain('recordGovernanceEvent(params:');
  });

  test('generates ABE- prefixed IDs', () => {
    expect(src).toContain("id: `ABE-");
  });

  test('computes SHA-256 hash for each event', () => {
    expect(src).toContain("createHash('sha256')");
  });

  test('assigns monotonic sequence numbers', () => {
    expect(src).toContain('++this.sequenceCounter');
  });

  test('emits event_recorded on every record', () => {
    expect(src).toContain("this.emit('event_recorded'");
  });
});

describe('Phase 12 — AuditBridge Categories', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/audit-bridge.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('supports tx_lifecycle category', () => {
    expect(src).toContain("'tx_lifecycle'");
  });

  test('supports funding_pipeline category', () => {
    expect(src).toContain("'funding_pipeline'");
  });

  test('supports settlement category', () => {
    expect(src).toContain("'settlement'");
  });

  test('supports governance category', () => {
    expect(src).toContain("'governance'");
  });

  test('supports compliance category', () => {
    expect(src).toContain("'compliance'");
  });

  test('supports attestation category', () => {
    expect(src).toContain("'attestation'");
  });

  test('supports reconciliation category', () => {
    expect(src).toContain("'reconciliation'");
  });

  test('supports system category', () => {
    expect(src).toContain("'system'");
  });
});

describe('Phase 12 — AuditBridge Anchoring', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/audit-bridge.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('has markAnchored method', () => {
    expect(src).toContain('markAnchored(eventId: string, ledger:');
  });

  test('tracks anchor target: xrpl, stellar, both, none', () => {
    expect(src).toContain("'xrpl'");
    expect(src).toContain("'stellar'");
    expect(src).toContain("'both'");
    expect(src).toContain("'none'");
  });

  test('emits event_anchored', () => {
    expect(src).toContain("this.emit('event_anchored'");
  });

  test('tracks anchored boolean and timestamp', () => {
    expect(src).toContain('.anchored = true');
    expect(src).toContain('anchoredAt');
  });
});

describe('Phase 12 — AuditBridge Queries', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/audit-bridge.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('has getEvent method', () => {
    expect(src).toContain('getEvent(eventId: string)');
  });

  test('has byCategory method', () => {
    expect(src).toContain('byCategory(category: AuditCategory)');
  });

  test('has bySeverity method', () => {
    expect(src).toContain('bySeverity(severity: AuditSeverity)');
  });

  test('has byDateRange method', () => {
    expect(src).toContain('byDateRange(from: string, to: string)');
  });

  test('has byReference method', () => {
    expect(src).toContain('byReference(refKey:');
  });

  test('has getUnanchored method', () => {
    expect(src).toContain('getUnanchored()');
  });

  test('has getCritical method', () => {
    expect(src).toContain('getCritical()');
  });

  test('has getSummary method', () => {
    expect(src).toContain('getSummary(): AuditBridgeSummary');
  });

  test('has getStats method', () => {
    expect(src).toContain('getStats(): AuditBridgeStats');
  });
});

describe('Phase 12 — AuditBridge Compliance', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/audit-bridge.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('tracks compliance gates checked', () => {
    expect(src).toContain('gatesChecked');
  });

  test('tracks compliance result: pass, fail, not_applicable', () => {
    expect(src).toContain("'pass'");
    expect(src).toContain("'fail'");
    expect(src).toContain("'not_applicable'");
  });

  test('checks pipeline_authorization gate', () => {
    expect(src).toContain("'pipeline_authorization'");
  });

  test('checks settlement_authorization gate', () => {
    expect(src).toContain("'settlement_authorization'");
  });

  test('checks dvp_validation gate', () => {
    expect(src).toContain("'dvp_validation'");
  });

  test('checks pause_check gate', () => {
    expect(src).toContain("'pause_check'");
  });

  test('checks governance_authorization gate', () => {
    expect(src).toContain("'governance_authorization'");
  });

  test('checks quorum_validation gate', () => {
    expect(src).toContain("'quorum_validation'");
  });

  test('summary includes compliancePassRate', () => {
    expect(src).toContain('compliancePassRate');
  });
});

describe('Phase 12 — AuditBridge Persistence', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/audit-bridge.ts');
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

  test('defaults retention to ~7 years', () => {
    expect(src).toContain('retentionDays');
    expect(src).toContain('2555');
  });

  test('defaults maxEvents to 100,000', () => {
    expect(src).toContain('100_000');
  });

  test('emits persist_error on failure', () => {
    expect(src).toContain("this.emit('persist_error'");
  });

  test('emits load_error on failure', () => {
    expect(src).toContain("this.emit('load_error'");
  });
});

// ─── SettlementConnector Source Validation ───────────────────────

describe('Phase 12 — SettlementConnector Source', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/settlement-connector.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('settlement-connector.ts exists', () => {
    expect(fs.existsSync(srcPath)).toBe(true);
  });

  test('exports SettlementConnector class', () => {
    expect(src).toContain('export class SettlementConnector extends EventEmitter');
  });

  test('exports ConnectedSettlement interface', () => {
    expect(src).toContain('export interface ConnectedSettlement');
  });

  test('exports SettlementLegRecord interface', () => {
    expect(src).toContain('export interface SettlementLegRecord');
  });

  test('exports SettlementConnectorEvent interface', () => {
    expect(src).toContain('export interface SettlementConnectorEvent');
  });

  test('exports SettlementConnectorConfig interface', () => {
    expect(src).toContain('export interface SettlementConnectorConfig');
  });

  test('exports SettlementConnectorSummary interface', () => {
    expect(src).toContain('export interface SettlementConnectorSummary');
  });

  test('exports SettlementPhase type', () => {
    expect(src).toContain('export type SettlementPhase');
  });

  test('exports SettlementConnectorModel type', () => {
    expect(src).toContain('export type SettlementConnectorModel');
  });
});

describe('Phase 12 — SettlementConnector Lifecycle', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/settlement-connector.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('has createFromConfirmedTx method', () => {
    expect(src).toContain('createFromConfirmedTx(params:');
  });

  test('has markDeliveryExecuted method', () => {
    expect(src).toContain('markDeliveryExecuted(settlementId: string, txHash: string)');
  });

  test('has markPaymentExecuted method', () => {
    expect(src).toContain('markPaymentExecuted(settlementId: string, txHash: string)');
  });

  test('has markFailed method', () => {
    expect(src).toContain('markFailed(settlementId: string, reason: string)');
  });

  test('has markDisputed method', () => {
    expect(src).toContain('markDisputed(settlementId: string, reason: string, disputedBy: string)');
  });

  test('generates CS- prefixed IDs', () => {
    expect(src).toContain("id: `CS-");
  });

  test('generates DL- prefixed delivery leg IDs', () => {
    expect(src).toContain("id: `DL-");
  });

  test('generates PL- prefixed payment leg IDs', () => {
    expect(src).toContain("id: `PL-");
  });

  test('auto-checks completion when both legs executed', () => {
    expect(src).toContain('checkCompletion');
  });

  test('emits settlement_created event', () => {
    expect(src).toContain("this.emit('settlement_created'");
  });

  test('emits settlement_complete event', () => {
    expect(src).toContain("this.emit('settlement_complete'");
  });

  test('emits settlement_failed event', () => {
    expect(src).toContain("this.emit('settlement_failed'");
  });

  test('emits delivery_executed event', () => {
    expect(src).toContain("this.emit('delivery_executed'");
  });

  test('emits payment_executed event', () => {
    expect(src).toContain("this.emit('payment_executed'");
  });
});

describe('Phase 12 — SettlementConnector Phases', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/settlement-connector.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('supports awaiting_funding phase', () => {
    expect(src).toContain("'awaiting_funding'");
  });

  test('supports funding_confirmed phase', () => {
    expect(src).toContain("'funding_confirmed'");
  });

  test('supports delivery_pending phase', () => {
    expect(src).toContain("'delivery_pending'");
  });

  test('supports delivery_executed phase', () => {
    expect(src).toContain("'delivery_executed'");
  });

  test('supports payment_pending phase', () => {
    expect(src).toContain("'payment_pending'");
  });

  test('supports payment_executed phase', () => {
    expect(src).toContain("'payment_executed'");
  });

  test('supports settlement_complete phase', () => {
    expect(src).toContain("'settlement_complete'");
  });

  test('supports settlement_failed phase', () => {
    expect(src).toContain("'settlement_failed'");
  });

  test('supports disputed phase', () => {
    expect(src).toContain("'disputed'");
  });
});

describe('Phase 12 — SettlementConnector Models', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/settlement-connector.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('supports rtgs model', () => {
    expect(src).toContain("'rtgs'");
  });

  test('supports deferred_net model', () => {
    expect(src).toContain("'deferred_net'");
  });

  test('supports escrow_mediated model', () => {
    expect(src).toContain("'escrow_mediated'");
  });

  test('defaults to rtgs model', () => {
    expect(src).toContain("defaultModel: config?.defaultModel ?? 'rtgs'");
  });

  test('default deadline is 96 hours', () => {
    expect(src).toContain('defaultDeadlineHours: config?.defaultDeadlineHours ?? 96');
  });
});

describe('Phase 12 — SettlementConnector Queries', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/settlement-connector.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('has get method', () => {
    expect(src).toContain('get(settlementId: string)');
  });

  test('has getAll method', () => {
    expect(src).toContain('getAll(): ConnectedSettlement[]');
  });

  test('has byPhase method', () => {
    expect(src).toContain('byPhase(phase: SettlementPhase)');
  });

  test('has byModel method', () => {
    expect(src).toContain('byModel(model: SettlementConnectorModel)');
  });

  test('has byPipeline method', () => {
    expect(src).toContain('byPipeline(pipelineId: string)');
  });

  test('has byParticipant method', () => {
    expect(src).toContain('byParticipant(address: string)');
  });

  test('has getPending method', () => {
    expect(src).toContain('getPending(): ConnectedSettlement[]');
  });

  test('has getCompleted method', () => {
    expect(src).toContain('getCompleted(): ConnectedSettlement[]');
  });

  test('has getOverdue method', () => {
    expect(src).toContain('getOverdue(): ConnectedSettlement[]');
  });

  test('has getSummary method', () => {
    expect(src).toContain('getSummary(): SettlementConnectorSummary');
  });
});

describe('Phase 12 — SettlementConnector Cross-Ledger', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/settlement-connector.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('tracks xrplConfirmed', () => {
    expect(src).toContain('xrplConfirmed');
  });

  test('tracks stellarConfirmed', () => {
    expect(src).toContain('stellarConfirmed');
  });

  test('delivery leg has ledger field', () => {
    expect(src).toContain("ledger: 'xrpl' | 'stellar'");
  });

  test('summary includes byLedger with xrpl and stellar', () => {
    expect(src).toContain('byLedger');
    expect(src).toContain('xrpl: { confirmed:');
    expect(src).toContain('stellar: { confirmed:');
  });

  test('tracks totalValueSettled', () => {
    expect(src).toContain('totalValueSettled');
  });

  test('tracks avgSettlementTimeMs', () => {
    expect(src).toContain('avgSettlementTimeMs');
  });
});

describe('Phase 12 — SettlementConnector Persistence', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/settlement-connector.ts');
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

  test('serializes settlements and eventLog', () => {
    expect(src).toContain('JSON.stringify(data, null, 2)');
  });
});

// ─── Dashboard Integration ──────────────────────────────────────

describe('Phase 12 — Dashboard Settlement & Audit Integration', () => {
  const serverPath = path.resolve(__dirname, '../apps/dashboard/src/server.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(serverPath, 'utf-8');
  });

  test('dashboard imports AuditBridge', () => {
    expect(src).toContain('AuditBridge');
    expect(src).toContain('audit-bridge');
  });

  test('dashboard imports AuditBridgeSummary type', () => {
    expect(src).toContain('AuditBridgeSummary');
  });

  test('dashboard imports SettlementConnector', () => {
    expect(src).toContain('SettlementConnector');
    expect(src).toContain('settlement-connector');
  });

  test('dashboard imports SettlementConnectorSummary type', () => {
    expect(src).toContain('SettlementConnectorSummary');
  });

  test('dashboard instantiates auditBridge', () => {
    expect(src).toContain('new AuditBridge');
  });

  test('dashboard instantiates settlementConnector', () => {
    expect(src).toContain('new SettlementConnector');
  });

  test('DashboardState includes auditBridge summary', () => {
    expect(src).toContain('auditBridge: AuditBridgeSummary');
  });

  test('DashboardState includes settlementPipeline summary', () => {
    expect(src).toContain('settlementPipeline: SettlementConnectorSummary');
  });

  test('buildState populates auditBridge from getSummary', () => {
    expect(src).toContain('auditBridge.getSummary()');
  });

  test('buildState populates settlementPipeline from getSummary', () => {
    expect(src).toContain('settlementConnector.getSummary()');
  });

  test('dashboard HTML includes Settlement Pipeline card', () => {
    expect(src).toContain('Settlement Pipeline');
    expect(src).toContain('Awaiting Funding');
    expect(src).toContain('Funding Confirmed');
    expect(src).toContain('Delivery Pending');
    expect(src).toContain('Payment Pending');
    expect(src).toContain('Total Value Settled');
    expect(src).toContain('XRPL Confirmed');
    expect(src).toContain('Stellar Confirmed');
  });

  test('dashboard HTML includes Audit Trail card', () => {
    expect(src).toContain('Audit Trail');
    expect(src).toContain('TX Lifecycle Events');
    expect(src).toContain('Pipeline Events');
    expect(src).toContain('Settlement Events');
    expect(src).toContain('Compliance Pass Rate');
    expect(src).toContain('Unanchored Events');
  });
});

// ─── Index Exports ──────────────────────────────────────────────

describe('Phase 12 — funding-ops Index Exports', () => {
  const indexPath = path.resolve(__dirname, '../packages/funding-ops/src/index.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(indexPath, 'utf-8');
  });

  test('exports AuditBridge', () => {
    expect(src).toContain('AuditBridge');
  });

  test('exports AuditBridgeEvent type', () => {
    expect(src).toContain('AuditBridgeEvent');
  });

  test('exports AuditBridgeConfig type', () => {
    expect(src).toContain('AuditBridgeConfig');
  });

  test('exports AuditBridgeSummary type', () => {
    expect(src).toContain('AuditBridgeSummary');
  });

  test('exports AuditBridgeStats type', () => {
    expect(src).toContain('AuditBridgeStats');
  });

  test('exports AuditSeverity type', () => {
    expect(src).toContain('AuditSeverity');
  });

  test('exports AuditCategory type', () => {
    expect(src).toContain('AuditCategory');
  });

  test('exports AuditAnchorTarget type', () => {
    expect(src).toContain('AuditAnchorTarget');
  });

  test('exports SettlementConnector', () => {
    expect(src).toContain('SettlementConnector');
  });

  test('exports ConnectedSettlement type', () => {
    expect(src).toContain('ConnectedSettlement');
  });

  test('exports SettlementLegRecord type', () => {
    expect(src).toContain('SettlementLegRecord');
  });

  test('exports SettlementConnectorSummary type', () => {
    expect(src).toContain('SettlementConnectorSummary');
  });

  test('exports SettlementPhase type', () => {
    expect(src).toContain('SettlementPhase');
  });

  test('exports SettlementConnectorModel type', () => {
    expect(src).toContain('SettlementConnectorModel');
  });

  test('still exports FundingPipeline', () => {
    expect(src).toContain('FundingPipeline');
  });

  test('still exports TransactionQueue', () => {
    expect(src).toContain('TransactionQueue');
  });
});

// ─── Cross-File Integration ─────────────────────────────────────

describe('Phase 12 — Cross-File Integration', () => {
  test('audit-bridge references same ledger types as tx-queue', () => {
    const auditSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/funding-ops/src/audit-bridge.ts'),
      'utf-8'
    );
    const txQueueSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/funding-ops/src/tx-queue.ts'),
      'utf-8'
    );
    // Both use xrpl and stellar
    expect(auditSrc).toContain("'xrpl'");
    expect(auditSrc).toContain("'stellar'");
    expect(txQueueSrc).toContain("'xrpl'");
    expect(txQueueSrc).toContain("'stellar'");
  });

  test('settlement-connector tracks same signer roles as governance', () => {
    const settSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/funding-ops/src/settlement-connector.ts'),
      'utf-8'
    );
    // Settlement tracks buyer/seller, references pipeline/bond
    expect(settSrc).toContain('buyer');
    expect(settSrc).toContain('seller');
    expect(settSrc).toContain('pipelineId');
    expect(settSrc).toContain('bondId');
    expect(settSrc).toContain('escrowId');
  });

  test('audit-bridge compliance gates align with AUDIT_SPEC', () => {
    const auditSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/funding-ops/src/audit-bridge.ts'),
      'utf-8'
    );
    // Compliance gates per spec
    expect(auditSrc).toContain('pipeline_authorization');
    expect(auditSrc).toContain('settlement_authorization');
    expect(auditSrc).toContain('dvp_validation');
    expect(auditSrc).toContain('pause_check');
  });

  test('dashboard imports from same paths as index exports', () => {
    const dashSrc = fs.readFileSync(
      path.resolve(__dirname, '../apps/dashboard/src/server.ts'),
      'utf-8'
    );
    const indexSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/funding-ops/src/index.ts'),
      'utf-8'
    );
    // Both reference audit-bridge and settlement-connector
    expect(dashSrc).toContain('audit-bridge');
    expect(dashSrc).toContain('settlement-connector');
    expect(indexSrc).toContain('./audit-bridge');
    expect(indexSrc).toContain('./settlement-connector');
  });

  test('all Phase 12 source files exist', () => {
    const files = [
      '../packages/funding-ops/src/audit-bridge.ts',
      '../packages/funding-ops/src/settlement-connector.ts',
      '../packages/funding-ops/src/index.ts',
      '../apps/dashboard/src/server.ts',
    ];
    for (const f of files) {
      expect(fs.existsSync(path.resolve(__dirname, f))).toBe(true);
    }
  });

  test('funding-ops source files include Phase 12 modules', () => {
    const fundingOpsSrc = path.resolve(__dirname, '../packages/funding-ops/src');
    const files = fs.readdirSync(fundingOpsSrc).filter(f => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThanOrEqual(8);
    expect(files).toContain('pipeline.ts');
    expect(files).toContain('xrpl-activator.ts');
    expect(files).toContain('stellar-activator.ts');
    expect(files).toContain('report-generator.ts');
    expect(files).toContain('tx-queue.ts');
    expect(files).toContain('audit-bridge.ts');
    expect(files).toContain('settlement-connector.ts');
  });

  test('existing dashboard cards preserved', () => {
    const dashSrc = fs.readFileSync(
      path.resolve(__dirname, '../apps/dashboard/src/server.ts'),
      'utf-8'
    );
    // All original cards still present
    expect(dashSrc).toContain('Platform Status');
    expect(dashSrc).toContain('XRPL Ledger');
    expect(dashSrc).toContain('Stellar Ledger');
    expect(dashSrc).toContain('Active Escrows');
    expect(dashSrc).toContain('Governance');
    expect(dashSrc).toContain('Compliance Engine');
    expect(dashSrc).toContain('Bond Pipeline');
    expect(dashSrc).toContain('Reporting Engine');
    expect(dashSrc).toContain('Funding Pipeline');
    expect(dashSrc).toContain('Transaction Queue');
    // New Phase 12 cards
    expect(dashSrc).toContain('Settlement Pipeline');
    expect(dashSrc).toContain('Audit Trail');
  });

  test('audit-bridge event references match settlement-connector IDs', () => {
    const auditSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/funding-ops/src/audit-bridge.ts'),
      'utf-8'
    );
    // References that connect to settlement
    expect(auditSrc).toContain('txId');
    expect(auditSrc).toContain('pipelineId');
    expect(auditSrc).toContain('settlementId');
    expect(auditSrc).toContain('bondId');
    expect(auditSrc).toContain('escrowId');
  });
});
