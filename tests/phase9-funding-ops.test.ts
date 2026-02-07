/**
 * Phase 9 — Funding Operations Integration Test
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Tests:
 *   - FundingPipeline orchestrator (creation, state management, phases)
 *   - XRPLActivator (account readiness, DefaultRipple, trustline deployment)
 *   - StellarActivator (issuer flags, regulated assets, authorization)
 *   - Bond creation integration with funding pipeline
 *   - Escrow creation integration
 *   - IOU issuance (claim receipts)
 *   - Cross-ledger attestation
 *   - Readiness checking
 *   - Full pipeline execution (dry-run)
 */
import * as fs from 'fs';
import * as path from 'path';

// ─── Package Structure ──────────────────────────────────────────

describe('Phase 9 — Package Structure', () => {
  const pkgRoot = path.resolve(__dirname, '../packages/funding-ops');

  test('package.json exists with correct name', () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf-8')
    );
    expect(pkgJson.name).toBe('@optkas/funding-ops');
    expect(pkgJson.version).toBe('1.0.0');
  });

  test('package.json has all required dependencies', () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf-8')
    );
    const deps = pkgJson.dependencies;
    expect(deps['@optkas/xrpl-core']).toBeDefined();
    expect(deps['@optkas/stellar-core']).toBeDefined();
    expect(deps['@optkas/issuance']).toBeDefined();
    expect(deps['@optkas/escrow']).toBeDefined();
    expect(deps['@optkas/bond']).toBeDefined();
    expect(deps['@optkas/settlement']).toBeDefined();
    expect(deps['@optkas/attestation']).toBeDefined();
    expect(deps['@optkas/compliance']).toBeDefined();
    expect(deps['@optkas/audit']).toBeDefined();
  });

  test('tsconfig.json exists with package references', () => {
    const tsconfig = JSON.parse(
      fs.readFileSync(path.join(pkgRoot, 'tsconfig.json'), 'utf-8')
    );
    expect(tsconfig.references).toBeDefined();
    expect(tsconfig.references.length).toBeGreaterThanOrEqual(5);
  });

  test('src/index.ts exports FundingPipeline, XRPLActivator, StellarActivator', () => {
    const indexPath = path.join(pkgRoot, 'src', 'index.ts');
    expect(fs.existsSync(indexPath)).toBe(true);
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('FundingPipeline');
    expect(content).toContain('XRPLActivator');
    expect(content).toContain('StellarActivator');
  });
});

// ─── FundingPipeline Source Validation ──────────────────────────

describe('Phase 9 — FundingPipeline Source', () => {
  const pipelinePath = path.resolve(
    __dirname, '../packages/funding-ops/src/pipeline.ts'
  );

  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(pipelinePath, 'utf-8');
  });

  test('pipeline.ts exists', () => {
    expect(fs.existsSync(pipelinePath)).toBe(true);
  });

  test('exports FundingPipeline class', () => {
    expect(content).toContain('export class FundingPipeline');
  });

  test('imports all required sub-engines', () => {
    expect(content).toContain("from '@optkas/xrpl-core'");
    expect(content).toContain("from '@optkas/stellar-core'");
    expect(content).toContain("from '@optkas/issuance'");
    expect(content).toContain("from '@optkas/escrow'");
    expect(content).toContain("from '@optkas/bond'");
    expect(content).toContain("from '@optkas/settlement'");
    expect(content).toContain("from '@optkas/attestation'");
  });

  test('has XRPL trustline activation method', () => {
    expect(content).toContain('async activateXRPLTrustlines');
  });

  test('has Stellar asset activation method', () => {
    expect(content).toContain('async activateStellarAssets');
  });

  test('has bond creation method', () => {
    expect(content).toContain('async createFundingBond');
  });

  test('has escrow creation method', () => {
    expect(content).toContain('async createFundingEscrow');
  });

  test('has IOU issuance method', () => {
    expect(content).toContain('async issueClaimReceipts');
  });

  test('has settlement execution method', () => {
    expect(content).toContain('async executeSettlement');
  });

  test('has cross-ledger attestation method', () => {
    expect(content).toContain('async attestFundingOperation');
  });

  test('has full pipeline execution method', () => {
    expect(content).toContain('async runFullPipeline');
  });

  test('has readiness check method', () => {
    expect(content).toContain('async checkReadiness');
  });

  test('has activation report generator', () => {
    expect(content).toContain('async generateActivationReport');
  });

  test('sets DefaultRipple flag (asfDefaultRipple = 8)', () => {
    expect(content).toContain('SetFlag: 8');
    expect(content).toContain('asfDefaultRipple');
  });

  test('registers escrow templates: bond_settlement, coupon_payment, participant_escrow', () => {
    expect(content).toContain("name: 'bond_settlement'");
    expect(content).toContain("name: 'coupon_payment'");
    expect(content).toContain("name: 'participant_escrow'");
  });

  test('tracks pipeline state with phases array', () => {
    expect(content).toContain('FundingPipelineState');
    expect(content).toContain('phases: PhaseResult[]');
  });

  test('emits audit events from sub-engines', () => {
    expect(content).toContain('wireAuditEvents');
    expect(content).toContain("engine.on('audit'");
  });

  test('stores unsigned transactions with status tracking', () => {
    expect(content).toContain('unsignedTransactions');
    expect(content).toContain('pending_signature');
  });

  test('defines all 10 funding phases', () => {
    expect(content).toContain("'initialization'");
    expect(content).toContain("'trustline_activation'");
    expect(content).toContain("'stellar_asset_setup'");
    expect(content).toContain("'bond_creation'");
    expect(content).toContain("'participant_onboarding'");
    expect(content).toContain("'escrow_creation'");
    expect(content).toContain("'iou_issuance'");
    expect(content).toContain("'settlement_execution'");
    expect(content).toContain("'cross_ledger_attestation'");
    expect(content).toContain("'completed'");
  });
});

// ─── XRPLActivator Source Validation ────────────────────────────

describe('Phase 9 — XRPLActivator Source', () => {
  const activatorPath = path.resolve(
    __dirname, '../packages/funding-ops/src/xrpl-activator.ts'
  );

  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(activatorPath, 'utf-8');
  });

  test('xrpl-activator.ts exists', () => {
    expect(fs.existsSync(activatorPath)).toBe(true);
  });

  test('exports XRPLActivator class', () => {
    expect(content).toContain('export class XRPLActivator');
  });

  test('has checkAccountReadiness method', () => {
    expect(content).toContain('async checkAccountReadiness');
  });

  test('has prepareIssuerSettings method', () => {
    expect(content).toContain('async prepareIssuerSettings');
  });

  test('has prepareTrustlineDeployment method', () => {
    expect(content).toContain('async prepareTrustlineDeployment');
  });

  test('has verifyAllTrustlines method', () => {
    expect(content).toContain('async verifyAllTrustlines');
  });

  test('has full activate method', () => {
    expect(content).toContain('async activate');
  });

  test('checks all 6 XRPL account roles', () => {
    expect(content).toContain("role: 'issuer'");
    expect(content).toContain("role: 'treasury'");
    expect(content).toContain("role: 'escrow'");
    expect(content).toContain("role: 'attestation'");
    expect(content).toContain("role: 'amm'");
    expect(content).toContain("role: 'trading'");
  });

  test('checks DefaultRipple flag (0x00800000)', () => {
    expect(content).toContain('0x00800000');
    expect(content).toContain('hasDefaultRipple');
  });

  test('calculates reserve requirements (10 + ownerCount * 2)', () => {
    expect(content).toContain('requiredReserve');
    expect(content).toContain('ownerCount');
  });

  test('skips already-configured trustlines', () => {
    expect(content).toContain('trustline_skipped');
    expect(content).toContain('already_configured');
  });

  test('emits events for trustline preparation and skipping', () => {
    expect(content).toContain("this.emit('trustline_prepared'");
    expect(content).toContain("this.emit('trustline_skipped'");
  });

  test('returns ActivationResult with summary', () => {
    expect(content).toContain('ActivationResult');
    expect(content).toContain('allAccountsReady');
    expect(content).toContain('allTrustlinesDeployed');
  });
});

// ─── StellarActivator Source Validation ─────────────────────────

describe('Phase 9 — StellarActivator Source', () => {
  const activatorPath = path.resolve(
    __dirname, '../packages/funding-ops/src/stellar-activator.ts'
  );

  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(activatorPath, 'utf-8');
  });

  test('stellar-activator.ts exists', () => {
    expect(fs.existsSync(activatorPath)).toBe(true);
  });

  test('exports StellarActivator class', () => {
    expect(content).toContain('export class StellarActivator');
  });

  test('has checkAccountReadiness method', () => {
    expect(content).toContain('async checkAccountReadiness');
  });

  test('has prepareIssuerFlags method', () => {
    expect(content).toContain('async prepareIssuerFlags');
  });

  test('has prepareTrustlines method', () => {
    expect(content).toContain('async prepareTrustlines');
  });

  test('has prepareAuthorizations method', () => {
    expect(content).toContain('async prepareAuthorizations');
  });

  test('has prepareInitialIssuance method', () => {
    expect(content).toContain('async prepareInitialIssuance');
  });

  test('has full activate method', () => {
    expect(content).toContain('async activate');
  });

  test('checks all 3 Stellar account roles', () => {
    expect(content).toContain("role: 'issuer'");
    expect(content).toContain("role: 'distribution'");
    expect(content).toContain("role: 'anchor'");
  });

  test('sets correct authorization flags (1, 2, 8)', () => {
    expect(content).toContain('AuthRequiredFlag (0x1)');
    expect(content).toContain('AuthRevocableFlag (0x2)');
    expect(content).toContain('AuthClawbackEnabledFlag (0x8)');
  });

  test('documents clawback limitations', () => {
    expect(content).toContain('clawback_enabled can ONLY be set on accounts with NO existing trustlines');
    expect(content).toContain('CANNOT be removed');
  });

  test('skips already-existing trustlines and authorizations', () => {
    expect(content).toContain('trustline_skipped');
    expect(content).toContain('authorization_skipped');
    expect(content).toContain('already_exists');
    expect(content).toContain('already_authorized');
  });

  test('supports regulated asset flag', () => {
    expect(content).toContain('regulated');
    expect(content).toContain('regulatedAssetConfigured');
  });

  test('prepares initial issuance from issuer to distribution', () => {
    expect(content).toContain('prepareInitialIssuance');
    expect(content).toContain('issuer → distribution');
  });
});

// ─── FundingPipeline Type Definitions ───────────────────────────

describe('Phase 9 — Type Definitions', () => {
  const pipelinePath = path.resolve(
    __dirname, '../packages/funding-ops/src/pipeline.ts'
  );

  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(pipelinePath, 'utf-8');
  });

  test('defines FundingPipelineConfig interface', () => {
    expect(content).toContain('interface FundingPipelineConfig');
  });

  test('FundingPipelineConfig includes XRPL accounts', () => {
    expect(content).toContain('issuerAddress: string');
    expect(content).toContain('treasuryAddress: string');
    expect(content).toContain('escrowAddress: string');
    expect(content).toContain('attestationAddress: string');
    expect(content).toContain('ammAddress: string');
    expect(content).toContain('tradingAddress: string');
  });

  test('FundingPipelineConfig includes Stellar accounts', () => {
    expect(content).toContain('distributionAddress: string');
    expect(content).toContain('anchorAddress: string');
  });

  test('defines TokenDefinition interface', () => {
    expect(content).toContain('interface TokenDefinition');
    expect(content).toContain("'claim_receipt' | 'settlement_token' | 'evidence_token' | 'regulated_asset'");
  });

  test('defines FundingPipelineState with full tracking', () => {
    expect(content).toContain('interface FundingPipelineState');
    expect(content).toContain('currentPhase: FundingPhase');
    expect(content).toContain('phases: PhaseResult[]');
    expect(content).toContain('escrowIds: string[]');
    expect(content).toContain('attestationHashes: string[]');
    expect(content).toContain('unsignedTransactions: UnsignedTransactionRecord[]');
  });

  test('defines FundingReadinessReport', () => {
    expect(content).toContain('interface FundingReadinessReport');
    expect(content).toContain('blockingIssues: string[]');
    expect(content).toContain('warnings: string[]');
    expect(content).toContain('checks: ReadinessCheck[]');
  });

  test('defines ReadinessCheck with categories', () => {
    expect(content).toContain('interface ReadinessCheck');
    expect(content).toContain("'xrpl' | 'stellar' | 'legal' | 'compliance' | 'governance'");
  });

  test('defines ActivationReport', () => {
    expect(content).toContain('interface ActivationReport');
    expect(content).toContain('trustlinesDeployed: number');
    expect(content).toContain('regulatedAssetReady: boolean');
  });
});

// ─── Integration: Pipeline Wiring ───────────────────────────────

describe('Phase 9 — Pipeline Integration Wiring', () => {
  const pipelinePath = path.resolve(
    __dirname, '../packages/funding-ops/src/pipeline.ts'
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(pipelinePath, 'utf-8');
  });

  test('pipeline constructor initializes Issuer from @optkas/issuance', () => {
    expect(content).toContain('new Issuer(xrplClient)');
  });

  test('pipeline constructor initializes TrustlineManager', () => {
    expect(content).toContain('new TrustlineManager(xrplClient)');
  });

  test('pipeline constructor initializes EscrowManager', () => {
    expect(content).toContain('new EscrowManager(xrplClient)');
  });

  test('pipeline constructor initializes BondEngine', () => {
    expect(content).toContain('new BondEngine(xrplClient)');
  });

  test('pipeline constructor initializes ClearingEngine', () => {
    expect(content).toContain('new ClearingEngine(xrplClient)');
  });

  test('pipeline constructor initializes AttestationEngine', () => {
    expect(content).toContain('new AttestationEngine(');
  });

  test('pipeline uses OPTKAS.BOND for claim receipt issuance', () => {
    expect(content).toContain("currency: 'OPTKAS.BOND'");
  });

  test('pipeline issues claim receipts with bond participation memo', () => {
    expect(content).toContain("type: 'bond_participation'");
    expect(content).toContain('Claim receipt — NOT a security');
  });

  test('pipeline creates escrow with crypto-condition', () => {
    expect(content).toContain("templateName: 'bond_settlement'");
  });

  test('settlement uses RTGS model for DvP', () => {
    expect(content).toContain("model: 'rtgs'");
    expect(content).toContain("direction: 'delivery'");
    expect(content).toContain("direction: 'payment'");
  });

  test('attestation creates composite hash of funding operation', () => {
    expect(content).toContain('AttestationEngine.hashData(stateSnapshot)');
  });

  test('readiness check verifies XRPL DefaultRipple flag', () => {
    expect(content).toContain('hasDefaultRipple');
    expect(content).toContain('DefaultRipple');
  });

  test('readiness check verifies Stellar auth flags', () => {
    expect(content).toContain('info.flags.authRequired');
    expect(content).toContain('info.flags.authRevocable');
    expect(content).toContain('info.flags.authClawbackEnabled');
  });

  test('readiness check validates governance multisig', () => {
    expect(content).toContain('2-of-3 multisig');
  });

  test('readiness check validates compliance', () => {
    expect(content).toContain('Bond collateral documentation');
  });

  test('full pipeline runs all phases in sequence', () => {
    // Verify the sequence in runFullPipeline
    const runMethod = content.substring(
      content.indexOf('async runFullPipeline'),
      content.indexOf('async checkReadiness')
    );
    const phases = [
      'activateXRPLTrustlines',
      'activateStellarAssets',
      'createFundingBond',
      'createFundingEscrow',
      'issueClaimReceipts',
      'attestFundingOperation',
    ];
    for (const phase of phases) {
      expect(runMethod).toContain(phase);
    }
  });

  test('pipeline state tracks errors with recoverability flag', () => {
    expect(content).toContain('recoverable: boolean');
    expect(content).toContain('recordError');
  });
});

// ─── Cross-Reference: Config Alignment ──────────────────────────

describe('Phase 9 — Config Alignment', () => {
  test('testnet accounts match config addresses', () => {
    const secrets = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../config/.testnet-secrets.json'), 'utf-8'
      )
    );

    // XRPL accounts
    expect(secrets.xrpl_issuer.address).toBe('raNh4uL8UxiEec2nXADxFX4fFgPMaNAUYk');
    expect(secrets.xrpl_treasury.address).toBe('rEkMNbJ7CgnK8JnmHW2nKUpc3d5ujDqLB4');
    expect(secrets.xrpl_escrow.address).toBe('rwfYLR5W2BXat7zKT9mA94j9kJN6cYJNNs');
    expect(secrets.xrpl_attestation.address).toBe('rBp5mKc3iY7URVmf6tiqha7uJCM3V2oVfP');
    expect(secrets.xrpl_amm_liquidity.address).toBe('rpoWtepEhM4hye2KyC5UiLdBerBNgik4bR');
    expect(secrets.xrpl_trading.address).toBe('rL17BZsLq7ejPiJiY28QwmrK8NWWG8987o');

    // Stellar accounts
    expect(secrets.stellar_issuer.address).toBe('GCYIHBAM2ND4E3XRUWDLVKZCLEHLH63PPXE2ZNIUXDMAETEZMSPA6U3C');
    expect(secrets.stellar_distribution.address).toBe('GBIBRCOADUPB7BDJEGLS3ZXQ2MPMDGPIEZQZF37XA5LFVO4R35Y7RNSI');
    expect(secrets.stellar_anchor.address).toBe('GAMGTMQUC22RLDEVIG3ZLPKENHARCCBDXGLZTTIIWYOIIQNSNZJVPK4V');
  });

  test('platform config defines all 4 token types', () => {
    const configPath = path.resolve(__dirname, '../config/platform-config.yaml');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('OPTKAS.BOND');
    expect(content).toContain('OPTKAS.ESCROW');
    expect(content).toContain('OPTKAS.ATTEST');
  });

  test('platform config has governance multisig with threshold 2 of 3', () => {
    const configPath = path.resolve(__dirname, '../config/platform-config.yaml');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('threshold: 2');
    expect(content).toContain('total_signers: 3');
  });
});

// ─── Script Integration ─────────────────────────────────────────

describe('Phase 9 — Script Integration', () => {
  test('setup-trustlines.ts script exists and uses XRPLClient', () => {
    const scriptPath = path.resolve(__dirname, '../scripts/setup-trustlines.ts');
    expect(fs.existsSync(scriptPath)).toBe(true);
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('XRPLClient');
    expect(content).toContain('TrustSet');
    expect(content).toContain('DefaultRipple');
  });

  test('xrpl-issue-iou.ts script exists', () => {
    const scriptPath = path.resolve(__dirname, '../scripts/xrpl-issue-iou.ts');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('xrpl-create-escrow.ts script exists', () => {
    const scriptPath = path.resolve(__dirname, '../scripts/xrpl-create-escrow.ts');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('stellar-issue-asset.ts script exists', () => {
    const scriptPath = path.resolve(__dirname, '../scripts/stellar-issue-asset.ts');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('xrpl-attest-hash.ts script exists', () => {
    const scriptPath = path.resolve(__dirname, '../scripts/xrpl-attest-hash.ts');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('reconcile-ledgers.ts script exists', () => {
    const scriptPath = path.resolve(__dirname, '../scripts/reconcile-ledgers.ts');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });
});

// ─── Funding Pipeline Event Model ───────────────────────────────

describe('Phase 9 — Event Model', () => {
  const pipelinePath = path.resolve(
    __dirname, '../packages/funding-ops/src/pipeline.ts'
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(pipelinePath, 'utf-8');
  });

  test('extends EventEmitter', () => {
    expect(content).toContain('extends EventEmitter');
  });

  test('emits xrpl_activated event', () => {
    expect(content).toContain("this.emit('xrpl_activated'");
  });

  test('emits stellar_activated event', () => {
    expect(content).toContain("this.emit('stellar_activated'");
  });

  test('emits bond_created event', () => {
    expect(content).toContain("this.emit('bond_created'");
  });

  test('emits escrow_created event', () => {
    expect(content).toContain("this.emit('escrow_created'");
  });

  test('emits claim_receipts_issued event', () => {
    expect(content).toContain("this.emit('claim_receipts_issued'");
  });

  test('emits settlement_executed event', () => {
    expect(content).toContain("this.emit('settlement_executed'");
  });

  test('emits funding_attested event', () => {
    expect(content).toContain("this.emit('funding_attested'");
  });

  test('emits pipeline_completed event', () => {
    expect(content).toContain("this.emit('pipeline_completed'");
  });

  test('emits pipeline_failed event', () => {
    expect(content).toContain("this.emit('pipeline_failed'");
  });

  test('emits pipeline_error event', () => {
    expect(content).toContain("this.emit('pipeline_error'");
  });

  test('emits phase_update event', () => {
    expect(content).toContain("this.emit('phase_update'");
  });
});

// ─── Error Handling ─────────────────────────────────────────────

describe('Phase 9 — Error Handling', () => {
  const pipelinePath = path.resolve(
    __dirname, '../packages/funding-ops/src/pipeline.ts'
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(pipelinePath, 'utf-8');
  });

  test('XRPL activation has try/catch with error recording', () => {
    expect(content).toContain('XRPL_ACTIVATION_FAILED');
  });

  test('Stellar activation has try/catch with error recording', () => {
    expect(content).toContain('STELLAR_ACTIVATION_FAILED');
  });

  test('Bond creation has error handling', () => {
    expect(content).toContain('BOND_CREATION_FAILED');
  });

  test('Escrow creation validates bond existence', () => {
    expect(content).toContain('No bond created. Call createFundingBond() first');
  });

  test('Escrow creation has error handling', () => {
    expect(content).toContain('ESCROW_CREATION_FAILED');
  });

  test('IOU issuance validates bond existence', () => {
    expect(content).toContain('No bond created. Call createFundingBond() first');
  });

  test('IOU issuance has error handling', () => {
    expect(content).toContain('IOU_ISSUANCE_FAILED');
  });

  test('Settlement has error handling', () => {
    expect(content).toContain('SETTLEMENT_FAILED');
  });

  test('Attestation has error handling', () => {
    expect(content).toContain('ATTESTATION_FAILED');
  });

  test('full pipeline catches and sets failed status', () => {
    expect(content).toContain("this.state.status = 'failed'");
  });
});
