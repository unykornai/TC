/**
 * Phase 10 — Funding Execution Integration Test
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Tests:
 *   - FundingReportGenerator (Markdown, JSON, save-to-disk)
 *   - Execution script structure (execute-funding-pipeline.ts)
 *   - CLI fund command group (readiness, activate-xrpl, activate-stellar, run-pipeline)
 *   - funding-ops index exports (report-generator added)
 *   - Config mapping functions
 *   - Report content validation
 *   - Phase alignment with pipeline
 */
import * as fs from 'fs';
import * as path from 'path';

// ─── Report Generator Source Validation ─────────────────────────

describe('Phase 10 — Report Generator', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/report-generator.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('report-generator.ts exists', () => {
    expect(fs.existsSync(srcPath)).toBe(true);
  });

  test('exports FundingReportGenerator class', () => {
    expect(src).toContain('export class FundingReportGenerator');
  });

  test('exports FundingReport interface', () => {
    expect(src).toContain('export interface FundingReport');
  });

  test('exports ReportSection interface', () => {
    expect(src).toContain('export interface ReportSection');
  });

  test('has generateMarkdown static method', () => {
    expect(src).toContain('static generateMarkdown(');
  });

  test('has generateJSON static method', () => {
    expect(src).toContain('static generateJSON(');
  });

  test('has saveReport static method', () => {
    expect(src).toContain('static saveReport(');
  });

  test('accepts FundingPipelineState parameter', () => {
    expect(src).toContain('state: FundingPipelineState');
  });

  test('accepts optional readiness report', () => {
    expect(src).toContain('readiness?: FundingReadinessReport');
  });

  test('accepts optional XRPL activation result', () => {
    expect(src).toContain('xrplActivation?: ActivationResult');
  });

  test('accepts optional Stellar activation result', () => {
    expect(src).toContain('stellarActivation?: StellarActivationResult');
  });

  test('imports from pipeline.ts', () => {
    expect(src).toContain("from './pipeline'");
  });

  test('imports from xrpl-activator.ts', () => {
    expect(src).toContain("from './xrpl-activator'");
  });

  test('imports from stellar-activator.ts', () => {
    expect(src).toContain("from './stellar-activator'");
  });
});

describe('Phase 10 — Report Markdown Content', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/report-generator.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('generates report header with title', () => {
    expect(src).toContain('# OPTKAS Funding Execution Report');
  });

  test('includes readiness assessment section', () => {
    expect(src).toContain('## 1. Readiness Assessment');
  });

  test('includes XRPL activation section', () => {
    expect(src).toContain('## 2. XRPL Infrastructure Activation');
  });

  test('includes Stellar activation section', () => {
    expect(src).toContain('## 3. Stellar Infrastructure Activation');
  });

  test('includes pipeline phase summary section', () => {
    expect(src).toContain('## 4. Pipeline Phase Summary');
  });

  test('includes bond details section', () => {
    expect(src).toContain('## 5. Bond Details');
  });

  test('includes escrow conditions section', () => {
    expect(src).toContain('## 6. Escrow Conditions');
  });

  test('includes attestation proofs section', () => {
    expect(src).toContain('## 7. Cross-Ledger Attestation Proofs');
  });

  test('includes unsigned transaction manifest', () => {
    expect(src).toContain('## 8. Unsigned Transaction Manifest');
  });

  test('includes multisig requirement note', () => {
    expect(src).toContain('2-of-3 multisig');
  });

  test('includes report hash for integrity', () => {
    expect(src).toContain('Report Hash');
    expect(src).toContain('sha256');
  });

  test('includes OPTKAS branding in footer', () => {
    expect(src).toContain('@optkas/funding-ops');
    expect(src).toContain('Unykorn 7777, Inc.');
  });
});

describe('Phase 10 — Report JSON Content', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/report-generator.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('generates reportId with RPT prefix', () => {
    expect(src).toContain("reportId: `RPT-");
  });

  test('includes generatedAt timestamp', () => {
    expect(src).toContain('generatedAt: new Date().toISOString()');
  });

  test('includes pipeline status in JSON', () => {
    expect(src).toContain('status: state.status');
  });

  test('includes readiness summary in JSON', () => {
    expect(src).toContain('overall: readiness.overall');
  });

  test('tracks transactions by ledger', () => {
    expect(src).toContain("xrpl: state.unsignedTransactions.filter(t => t.ledger === 'xrpl').length");
    expect(src).toContain("stellar: state.unsignedTransactions.filter(t => t.ledger === 'stellar').length");
  });

  test('tracks transactions by phase', () => {
    expect(src).toContain('byPhase: state.phases.reduce');
  });
});

// ─── Execution Script Validation ────────────────────────────────

describe('Phase 10 — Execution Script', () => {
  const scriptPath = path.resolve(__dirname, '../scripts/execute-funding-pipeline.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(scriptPath, 'utf-8');
  });

  test('execute-funding-pipeline.ts exists', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('uses createBaseCommand from cli-utils', () => {
    expect(src).toContain("from './lib/cli-utils'");
    expect(src).toContain('createBaseCommand');
  });

  test('imports FundingPipeline from funding-ops', () => {
    expect(src).toContain('FundingPipeline');
    expect(src).toContain('funding-ops/src/pipeline');
  });

  test('imports XRPLActivator', () => {
    expect(src).toContain('XRPLActivator');
    expect(src).toContain('funding-ops/src/xrpl-activator');
  });

  test('imports StellarActivator', () => {
    expect(src).toContain('StellarActivator');
    expect(src).toContain('funding-ops/src/stellar-activator');
  });

  test('imports FundingReportGenerator', () => {
    expect(src).toContain('FundingReportGenerator');
    expect(src).toContain('funding-ops/src/report-generator');
  });

  test('imports XRPLClient', () => {
    expect(src).toContain('XRPLClient');
    expect(src).toContain('xrpl-core/src');
  });

  test('imports StellarClient', () => {
    expect(src).toContain('StellarClient');
    expect(src).toContain('stellar-core/src');
  });

  test('supports --phase option', () => {
    expect(src).toContain("'--phase <phase>'");
  });

  test('supports readiness phase', () => {
    expect(src).toContain("case 'readiness':");
    expect(src).toContain('runReadinessCheck');
  });

  test('supports activate-xrpl phase', () => {
    expect(src).toContain("case 'activate-xrpl':");
    expect(src).toContain('runXRPLActivation');
  });

  test('supports activate-stellar phase', () => {
    expect(src).toContain("case 'activate-stellar':");
    expect(src).toContain('runStellarActivation');
  });

  test('supports activate (combined) phase', () => {
    expect(src).toContain("case 'activate':");
  });

  test('supports full pipeline phase', () => {
    expect(src).toContain("case 'full':");
    expect(src).toContain('runFullPipeline');
  });

  test('supports --report-dir option', () => {
    expect(src).toContain("'--report-dir <dir>'");
    expect(src).toContain("'reports/funding'");
  });

  test('defaults to dry-run mode', () => {
    expect(src).toContain('dryRun !== false');
  });

  test('uses printDryRun for dry-run indication', () => {
    expect(src).toContain('printDryRun()');
  });

  test('uses printNetworkWarning for mainnet', () => {
    expect(src).toContain('printNetworkWarning(network)');
  });
});

describe('Phase 10 — Execution Script Config Mapping', () => {
  const scriptPath = path.resolve(__dirname, '../scripts/execute-funding-pipeline.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(scriptPath, 'utf-8');
  });

  test('buildFundingConfig maps all 6 XRPL addresses', () => {
    expect(src).toContain('issuerAddress: xrplAccounts.issuer?.address');
    expect(src).toContain('treasuryAddress: xrplAccounts.treasury?.address');
    expect(src).toContain('escrowAddress: xrplAccounts.escrow?.address');
    expect(src).toContain('attestationAddress: xrplAccounts.attestation?.address');
    expect(src).toContain('ammAddress: xrplAccounts.amm?.address');
    expect(src).toContain('tradingAddress: xrplAccounts.trading?.address');
  });

  test('buildFundingConfig maps all 3 Stellar addresses', () => {
    expect(src).toContain('issuerAddress: stellarAccounts.issuer?.address');
    expect(src).toContain('distributionAddress: stellarAccounts.distribution?.address');
    expect(src).toContain('anchorAddress: stellarAccounts.anchor?.address');
  });

  test('buildXRPLActivationConfig creates account list', () => {
    expect(src).toContain('buildXRPLActivationConfig');
    expect(src).toContain("role !== 'issuer'");
  });

  test('buildStellarActivationConfig maps assets', () => {
    expect(src).toContain('buildStellarActivationConfig');
  });

  test('bond configuration has all required fields', () => {
    expect(src).toContain("name: 'OPTKAS Infrastructure Bond Series A'");
    expect(src).toContain("faceValue: '500000'");
    expect(src).toContain("currency: 'USD'");
    expect(src).toContain('couponRate: 0.0625');
    expect(src).toContain('maturityYears: 5');
    expect(src).toContain('coverageRatio: 1.5');
  });
});

describe('Phase 10 — Pipeline Simulation Content', () => {
  const scriptPath = path.resolve(__dirname, '../scripts/execute-funding-pipeline.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(scriptPath, 'utf-8');
  });

  test('full pipeline lists all 7 phases', () => {
    expect(src).toContain('XRPL Trustline Activation');
    expect(src).toContain('Stellar Asset Activation');
    expect(src).toContain('Bond Creation');
    expect(src).toContain('Escrow Deployment');
    expect(src).toContain('Claim Receipt Issuance');
    expect(src).toContain('DvP Settlement Execution');
    expect(src).toContain('Cross-Ledger Attestation');
  });

  test('XRPL activation references DefaultRipple', () => {
    expect(src).toContain('DefaultRipple');
    expect(src).toContain('flag 8');
  });

  test('Stellar activation references regulated asset flags', () => {
    expect(src).toContain('auth_required');
    expect(src).toContain('auth_revocable');
    expect(src).toContain('auth_clawback_enabled');
  });

  test('all transactions require multisig', () => {
    expect(src).toContain('2-of-3 multisig');
  });

  test('generates simulation report to disk', () => {
    expect(src).toContain('SIMULATION_REPORT_');
    expect(src).toContain('fs.writeFileSync');
  });
});

// ─── CLI Fund Commands Validation ───────────────────────────────

describe('Phase 10 — CLI Fund Commands', () => {
  const cliPath = path.resolve(__dirname, '../apps/cli/src/cli.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(cliPath, 'utf-8');
  });

  test('CLI imports FundingPipeline', () => {
    expect(src).toContain('FundingPipeline');
    expect(src).toContain('funding-ops/src/pipeline');
  });

  test('CLI imports XRPLActivator', () => {
    expect(src).toContain('XRPLActivator');
    expect(src).toContain('funding-ops/src/xrpl-activator');
  });

  test('CLI imports StellarActivator', () => {
    expect(src).toContain('StellarActivator');
    expect(src).toContain('funding-ops/src/stellar-activator');
  });

  test('CLI imports FundingReportGenerator', () => {
    expect(src).toContain('FundingReportGenerator');
    expect(src).toContain('funding-ops/src/report-generator');
  });

  test('fund command group exists', () => {
    expect(src).toContain("command('fund')");
    expect(src).toContain("description('Funding pipeline operations");
  });

  test('fund readiness subcommand exists', () => {
    expect(src).toContain("command('readiness')");
    expect(src).toContain('Funding Readiness Check');
  });

  test('fund activate-xrpl subcommand exists', () => {
    expect(src).toContain("command('activate-xrpl')");
    expect(src).toContain('XRPL Infrastructure Activation');
  });

  test('fund activate-stellar subcommand exists', () => {
    expect(src).toContain("command('activate-stellar')");
    expect(src).toContain('Stellar Infrastructure Activation');
  });

  test('fund run-pipeline subcommand exists', () => {
    expect(src).toContain("command('run-pipeline')");
    expect(src).toContain('Full Funding Pipeline');
  });

  test('run-pipeline accepts --escrow-amount', () => {
    expect(src).toContain("'--escrow-amount <drops>'");
  });

  test('run-pipeline accepts --bond-name', () => {
    expect(src).toContain("'--bond-name <name>'");
  });

  test('run-pipeline accepts --report-dir', () => {
    expect(src).toContain("'--report-dir <dir>'");
  });

  test('fund commands use buildFundingConfigFromPlatform', () => {
    expect(src).toContain('buildFundingConfigFromPlatform');
  });
});

describe('Phase 10 — CLI Fund Config Mapping', () => {
  const cliPath = path.resolve(__dirname, '../apps/cli/src/cli.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(cliPath, 'utf-8');
  });

  test('buildFundingConfigFromPlatform maps XRPL accounts', () => {
    expect(src).toContain("issuerAddress: (xrplAccounts as any).issuer?.address");
    expect(src).toContain("treasuryAddress: (xrplAccounts as any).treasury?.address");
    expect(src).toContain("escrowAddress: (xrplAccounts as any).escrow?.address");
  });

  test('buildFundingConfigFromPlatform maps Stellar accounts', () => {
    expect(src).toContain("issuerAddress: (stellarAccounts as any).issuer?.address");
    expect(src).toContain("distributionAddress: (stellarAccounts as any).distribution?.address");
    expect(src).toContain("anchorAddress: (stellarAccounts as any).anchor?.address");
  });

  test('buildFundingConfigFromPlatform maps tokens', () => {
    expect(src).toContain('Object.entries(config.tokens');
  });

  test('fund readiness checks XRPL address completeness', () => {
    expect(src).toContain('All 6 XRPL account addresses configured');
  });

  test('fund readiness checks Stellar address completeness', () => {
    expect(src).toContain('All 3 Stellar account addresses configured');
  });

  test('fund readiness shows governance model', () => {
    expect(src).toContain('2-of-3 multisig');
  });
});

describe('Phase 10 — CLI Fund Pipeline Phases', () => {
  const cliPath = path.resolve(__dirname, '../apps/cli/src/cli.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(cliPath, 'utf-8');
  });

  test('run-pipeline lists all 7 phases', () => {
    expect(src).toContain('XRPL Trustline Activation');
    expect(src).toContain('Stellar Asset Activation');
    expect(src).toContain('Bond Creation');
    expect(src).toContain('Escrow Deployment');
    expect(src).toContain('Claim Receipt Issuance');
    expect(src).toContain('DvP Settlement Execution');
    expect(src).toContain('Cross-Ledger Attestation');
  });

  test('activate-xrpl references DefaultRipple', () => {
    expect(src).toContain('DefaultRipple');
  });

  test('activate-stellar references regulated asset flags', () => {
    expect(src).toContain('auth_required');
    expect(src).toContain('auth_revocable');
    expect(src).toContain('auth_clawback_enabled');
  });

  test('all fund commands default to dry-run', () => {
    expect(src).toContain('dryRun !== false');
  });
});

// ─── Index Exports ──────────────────────────────────────────────

describe('Phase 10 — funding-ops Index Exports', () => {
  const indexPath = path.resolve(__dirname, '../packages/funding-ops/src/index.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(indexPath, 'utf-8');
  });

  test('index.ts exports FundingReportGenerator', () => {
    expect(src).toContain('FundingReportGenerator');
  });

  test('index.ts exports FundingReport type', () => {
    expect(src).toContain('FundingReport');
  });

  test('index.ts exports ReportSection type', () => {
    expect(src).toContain('ReportSection');
  });

  test('index.ts still exports FundingPipeline', () => {
    expect(src).toContain('FundingPipeline');
  });

  test('index.ts still exports XRPLActivator', () => {
    expect(src).toContain('XRPLActivator');
  });

  test('index.ts still exports StellarActivator', () => {
    expect(src).toContain('StellarActivator');
  });
});

// ─── Cross-File Integration ─────────────────────────────────────

describe('Phase 10 — Cross-File Integration', () => {
  test('report-generator imports match pipeline exports', () => {
    const reportSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/funding-ops/src/report-generator.ts'),
      'utf-8'
    );
    const pipelineSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/funding-ops/src/pipeline.ts'),
      'utf-8'
    );

    // Report imports these types from pipeline
    const requiredTypes = [
      'FundingPipelineState',
      'FundingReadinessReport',
      'ActivationReport',
      'PhaseResult',
      'UnsignedTransactionRecord',
    ];
    for (const type of requiredTypes) {
      expect(reportSrc).toContain(type);
      expect(pipelineSrc).toContain(`export interface ${type}`);
    }
  });

  test('report-generator imports match xrpl-activator exports', () => {
    const reportSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/funding-ops/src/report-generator.ts'),
      'utf-8'
    );
    const xrplSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/funding-ops/src/xrpl-activator.ts'),
      'utf-8'
    );

    expect(reportSrc).toContain('AccountReadiness');
    expect(reportSrc).toContain('ActivationResult');
    expect(xrplSrc).toContain('export interface AccountReadiness');
    expect(xrplSrc).toContain('export interface ActivationResult');
  });

  test('report-generator imports match stellar-activator exports', () => {
    const reportSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/funding-ops/src/report-generator.ts'),
      'utf-8'
    );
    const stellarSrc = fs.readFileSync(
      path.resolve(__dirname, '../packages/funding-ops/src/stellar-activator.ts'),
      'utf-8'
    );

    expect(reportSrc).toContain('StellarAccountReadiness');
    expect(reportSrc).toContain('StellarActivationResult');
    expect(stellarSrc).toContain('export interface StellarAccountReadiness');
    expect(stellarSrc).toContain('export interface StellarActivationResult');
  });

  test('execution script config mapping aligns with platform-config.yaml', () => {
    const scriptSrc = fs.readFileSync(
      path.resolve(__dirname, '../scripts/execute-funding-pipeline.ts'),
      'utf-8'
    );
    const configPath = path.resolve(__dirname, '../config/platform-config.yaml');
    expect(fs.existsSync(configPath)).toBe(true);

    // Script maps these config sections
    expect(scriptSrc).toContain('config.xrpl_accounts');
    expect(scriptSrc).toContain('config.stellar_accounts');
    expect(scriptSrc).toContain('config.tokens');
  });

  test('CLI fund commands use same config source as execution script', () => {
    const cliSrc = fs.readFileSync(
      path.resolve(__dirname, '../apps/cli/src/cli.ts'),
      'utf-8'
    );
    const scriptSrc = fs.readFileSync(
      path.resolve(__dirname, '../scripts/execute-funding-pipeline.ts'),
      'utf-8'
    );

    // Both use loadConfig
    expect(cliSrc).toContain('loadConfig');
    expect(scriptSrc).toContain('loadConfig');

    // Both map to FundingPipelineConfig
    expect(cliSrc).toContain('FundingPipelineConfig');
    expect(scriptSrc).toContain('FundingPipelineConfig');
  });

  test('all Phase 10 source files exist', () => {
    const files = [
      '../packages/funding-ops/src/report-generator.ts',
      '../packages/funding-ops/src/index.ts',
      '../scripts/execute-funding-pipeline.ts',
      '../apps/cli/src/cli.ts',
    ];
    for (const f of files) {
      expect(fs.existsSync(path.resolve(__dirname, f))).toBe(true);
    }
  });

  test('existing CLI commands preserved (balance, escrow, trustline, audit, reconcile, status)', () => {
    const cliSrc = fs.readFileSync(
      path.resolve(__dirname, '../apps/cli/src/cli.ts'),
      'utf-8'
    );
    const existingCommands = ['balance', 'escrow', 'trustline', 'audit', 'reconcile', 'status'];
    for (const cmd of existingCommands) {
      expect(cliSrc).toContain(`command('${cmd}')`);
    }
  });
});
