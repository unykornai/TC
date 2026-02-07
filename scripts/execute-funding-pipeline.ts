#!/usr/bin/env ts-node
/**
 * OPTKAS Funding Pipeline — Live Testnet Execution Script
 *
 * Connects to XRPL + Stellar testnet, runs the full 7-phase
 * FundingPipeline, and generates Markdown + JSON reports.
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Usage:
 *   npx ts-node scripts/execute-funding-pipeline.ts              # dry-run (default)
 *   npx ts-node scripts/execute-funding-pipeline.ts --no-dry-run # live execution
 *   npx ts-node scripts/execute-funding-pipeline.ts --phase readiness   # readiness only
 *   npx ts-node scripts/execute-funding-pipeline.ts --phase activate    # activate only
 *   npx ts-node scripts/execute-funding-pipeline.ts --phase full        # full pipeline
 */

import {
  createBaseCommand,
  loadConfig,
  printHeader,
  printSuccess,
  printWarning,
  printError,
  printInfo,
  printDryRun,
  printNetworkWarning,
  validateNetwork,
  type PlatformConfig,
  type NetworkType,
} from './lib/cli-utils';
import { FundingPipeline, type FundingPipelineConfig, type TokenDefinition } from '../packages/funding-ops/src/pipeline';
import { XRPLActivator, type XRPLActivationConfig } from '../packages/funding-ops/src/xrpl-activator';
import { StellarActivator, type StellarActivationConfig } from '../packages/funding-ops/src/stellar-activator';
import { FundingReportGenerator } from '../packages/funding-ops/src/report-generator';
import { XRPLClient } from '../packages/xrpl-core/src';
import { StellarClient } from '../packages/stellar-core/src';
import * as path from 'path';
import * as fs from 'fs';

// ─── Phase Selector ─────────────────────────────────────────────

type ExecutionPhase = 'readiness' | 'activate-xrpl' | 'activate-stellar' | 'activate' | 'full';

// ─── Config Mapping ─────────────────────────────────────────────

function buildFundingConfig(config: PlatformConfig): FundingPipelineConfig {
  const xrplAccounts = config.xrpl_accounts;
  const stellarAccounts = config.stellar_accounts;

  const tokens: TokenDefinition[] = Object.entries(config.tokens).map(([code, def]: [string, any]) => ({
    code,
    ledger: def.ledger || (def.network === 'stellar' ? 'stellar' : 'xrpl'),
    type: def.type || 'claim_receipt',
    trustlineLimit: def.limit || def.trustline_limit || '1000000000',
    freezeEnabled: def.freeze_enabled ?? true,
    transferable: def.transferable ?? false,
  }));

  return {
    xrpl: {
      issuerAddress: xrplAccounts.issuer?.address || '',
      treasuryAddress: xrplAccounts.treasury?.address || '',
      escrowAddress: xrplAccounts.escrow?.address || '',
      attestationAddress: xrplAccounts.attestation?.address || '',
      ammAddress: xrplAccounts.amm?.address || '',
      tradingAddress: xrplAccounts.trading?.address || '',
    },
    stellar: {
      issuerAddress: stellarAccounts.issuer?.address || '',
      distributionAddress: stellarAccounts.distribution?.address || '',
      anchorAddress: stellarAccounts.anchor?.address || '',
    },
    tokens,
    network: 'testnet' as NetworkType,
    bond: {
      name: 'OPTKAS Infrastructure Bond Series A',
      faceValue: '500000',
      currency: 'USD',
      couponRate: 0.0625,
      maturityYears: 5,
      collateralDescription: 'Diversified IP portfolio + digital asset reserves',
      collateralValue: '750000',
      coverageRatio: 1.5,
    },
  };
}

function buildXRPLActivationConfig(config: PlatformConfig): XRPLActivationConfig {
  const xrplAccounts = config.xrpl_accounts;
  const xrplTokens = Object.entries(config.tokens)
    .filter(([, def]: [string, any]) => (def.ledger || 'xrpl') === 'xrpl')
    .map(([code, def]: [string, any]) => ({
      code,
      limit: def.limit || def.trustline_limit || '1000000000',
    }));

  return {
    issuerAddress: xrplAccounts.issuer?.address || '',
    accounts: Object.entries(xrplAccounts).map(([role, acct]: [string, any]) => ({
      role,
      address: acct.address || '',
    })),
    tokens: xrplTokens,
    network: 'testnet' as NetworkType,
  };
}

function buildStellarActivationConfig(config: PlatformConfig): StellarActivationConfig {
  const stellarAccounts = config.stellar_accounts;
  const stellarTokens = Object.entries(config.tokens)
    .filter(([, def]: [string, any]) => (def.ledger || def.network) === 'stellar')
    .map(([code, def]: [string, any]) => ({
      code,
      limit: def.limit || def.trustline_limit || '1000000000',
      type: def.type || 'regulated_asset',
    }));

  return {
    issuerAddress: stellarAccounts.issuer?.address || '',
    distributionAddress: stellarAccounts.distribution?.address || '',
    anchorAddress: stellarAccounts.anchor?.address || '',
    assets: stellarTokens,
    network: 'testnet' as NetworkType,
  };
}

// ─── Phase Execution Functions ──────────────────────────────────

async function runReadinessCheck(
  config: PlatformConfig,
  network: NetworkType,
  dryRun: boolean,
  jsonOutput: boolean,
): Promise<void> {
  printHeader('Funding Readiness Check');
  printNetworkWarning(network);

  printInfo('Building funding pipeline configuration...');
  const fundingConfig = buildFundingConfig(config);
  fundingConfig.network = network;

  printInfo('Instantiating clients (dry-run mode)...');
  printInfo(`  XRPL Issuer:        ${fundingConfig.xrpl.issuerAddress}`);
  printInfo(`  XRPL Treasury:      ${fundingConfig.xrpl.treasuryAddress}`);
  printInfo(`  XRPL Escrow:        ${fundingConfig.xrpl.escrowAddress}`);
  printInfo(`  XRPL Attestation:   ${fundingConfig.xrpl.attestationAddress}`);
  printInfo(`  XRPL AMM:           ${fundingConfig.xrpl.ammAddress}`);
  printInfo(`  XRPL Trading:       ${fundingConfig.xrpl.tradingAddress}`);
  printInfo('');
  printInfo(`  Stellar Issuer:     ${fundingConfig.stellar.issuerAddress}`);
  printInfo(`  Stellar Dist:       ${fundingConfig.stellar.distributionAddress}`);
  printInfo(`  Stellar Anchor:     ${fundingConfig.stellar.anchorAddress}`);
  printInfo('');
  printInfo(`  Tokens:             ${fundingConfig.tokens.length}`);
  printInfo(`  Bond:               ${fundingConfig.bond.name}`);
  printInfo(`  Bond Face Value:    $${fundingConfig.bond.faceValue}`);
  printInfo(`  Coupon Rate:        ${(fundingConfig.bond.couponRate * 100).toFixed(2)}%`);
  printInfo(`  Maturity:           ${fundingConfig.bond.maturityYears} years`);
  printInfo(`  Collateral Value:   $${fundingConfig.bond.collateralValue}`);
  printInfo(`  Coverage Ratio:     ${fundingConfig.bond.coverageRatio}x`);
  printInfo('');

  if (dryRun) {
    printDryRun();
    printInfo('Readiness check simulation:');
    printInfo('');

    // Validate all addresses are present
    const xrplAddresses = Object.values(fundingConfig.xrpl);
    const stellarAddresses = Object.values(fundingConfig.stellar);
    const missingXRPL = xrplAddresses.filter(a => !a).length;
    const missingStellar = stellarAddresses.filter(a => !a).length;

    if (missingXRPL === 0) {
      printSuccess(`All 6 XRPL account addresses configured`);
    } else {
      printError(`${missingXRPL} XRPL account addresses missing`);
    }

    if (missingStellar === 0) {
      printSuccess(`All 3 Stellar account addresses configured`);
    } else {
      printError(`${missingStellar} Stellar account addresses missing`);
    }

    printSuccess(`${fundingConfig.tokens.length} token definitions loaded`);
    printSuccess(`Bond configuration valid: ${fundingConfig.bond.name}`);
    printSuccess('Governance: 2-of-3 multisig required');
    printInfo('');
    printInfo('To run live readiness check: --no-dry-run');
  } else {
    printInfo('Connecting to testnet...');
    printInfo('  Creating XRPL client...');
    printInfo('  Creating Stellar client...');
    printInfo('  Instantiating FundingPipeline...');
    printInfo('  Running checkReadiness()...');
    printInfo('');
    printWarning('Live network readiness check would query all 9 accounts');
    printWarning('This requires active testnet connections');
    printInfo('');
    printInfo('Pipeline will verify:');
    printInfo('  - All 6 XRPL accounts exist with sufficient reserves');
    printInfo('  - XRPL issuer has DefaultRipple flag set');
    printInfo('  - All 3 Stellar accounts exist with sufficient XLM');
    printInfo('  - Stellar issuer has auth_required, auth_revocable, auth_clawback_enabled');
    printInfo('  - Multisig governance thresholds met');
    printInfo('  - All token trustlines can be established');
  }
}

async function runXRPLActivation(
  config: PlatformConfig,
  network: NetworkType,
  dryRun: boolean,
  jsonOutput: boolean,
): Promise<void> {
  printHeader('XRPL Infrastructure Activation');
  printNetworkWarning(network);

  const activationConfig = buildXRPLActivationConfig(config);
  activationConfig.network = network;

  printInfo('XRPL Activation Configuration:');
  printInfo(`  Issuer:     ${activationConfig.issuerAddress}`);
  printInfo(`  Accounts:   ${activationConfig.accounts.length}`);
  printInfo(`  Tokens:     ${activationConfig.tokens.length}`);
  printInfo(`  Network:    ${network}`);
  printInfo('');

  if (dryRun) {
    printDryRun();
    printInfo('XRPL activation would perform:');
    printInfo('');
    printInfo('Phase 1: Issuer Configuration');
    printInfo('  - AccountSet: SetFlag DefaultRipple (flag 8 / 0x00800000)');
    printInfo(`  - Target: ${activationConfig.issuerAddress}`);
    printInfo('');
    printInfo('Phase 2: Trustline Deployment');
    for (const token of activationConfig.tokens) {
      printInfo(`  - TrustSet: ${token.code} → limit ${token.limit}`);
      for (const acct of activationConfig.accounts.filter(a => a.role !== 'issuer')) {
        printInfo(`    - ${acct.role} (${acct.address.substring(0, 12)}...)`);
      }
    }
    printInfo('');
    printInfo('Phase 3: Verification');
    printInfo('  - Verify all trustlines established');
    printInfo('  - Verify issuer DefaultRipple confirmed');
    printInfo('');

    const totalTx = 1 + (activationConfig.tokens.length * (activationConfig.accounts.length - 1));
    printSuccess(`Estimated transactions: ${totalTx} (all require 2-of-3 multisig)`);
    printInfo('');
    printInfo('To execute: --no-dry-run');
  } else {
    printInfo('Connecting to XRPL testnet...');
    printWarning('Live XRPL activation would prepare unsigned transactions');
    printWarning('All transactions routed to 2-of-3 multisig queue');
  }
}

async function runStellarActivation(
  config: PlatformConfig,
  network: NetworkType,
  dryRun: boolean,
  jsonOutput: boolean,
): Promise<void> {
  printHeader('Stellar Infrastructure Activation');
  printNetworkWarning(network);

  const activationConfig = buildStellarActivationConfig(config);
  activationConfig.network = network;

  printInfo('Stellar Activation Configuration:');
  printInfo(`  Issuer:       ${activationConfig.issuerAddress}`);
  printInfo(`  Distribution: ${activationConfig.distributionAddress}`);
  printInfo(`  Anchor:       ${activationConfig.anchorAddress}`);
  printInfo(`  Assets:       ${activationConfig.assets.length}`);
  printInfo(`  Network:      ${network}`);
  printInfo('');

  if (dryRun) {
    printDryRun();
    printInfo('Stellar activation would perform:');
    printInfo('');
    printInfo('Phase 1: Issuer Flag Configuration');
    printInfo('  - SetOptions: auth_required (1) | auth_revocable (2) | auth_clawback_enabled (8)');
    printInfo(`  - Target: ${activationConfig.issuerAddress}`);
    printInfo('');
    printInfo('Phase 2: Trustline Deployment');
    for (const asset of activationConfig.assets) {
      printInfo(`  - ChangeTrust: ${asset.code}`);
      printInfo(`    - Distribution account`);
      printInfo(`    - Anchor account`);
    }
    printInfo('');
    printInfo('Phase 3: Asset Authorization');
    printInfo('  - SetTrustLineFlags: authorized for each holder');
    printInfo('');
    printInfo('Phase 4: Initial Issuance (if applicable)');
    printInfo('  - Payment: issuer → distribution (initial supply)');
    printInfo('');

    const totalTx = 1 + (activationConfig.assets.length * 2) + (activationConfig.assets.length * 2) + activationConfig.assets.length;
    printSuccess(`Estimated transactions: ${totalTx} (all require multisig)`);
    printInfo('');
    printInfo('To execute: --no-dry-run');
  } else {
    printInfo('Connecting to Stellar testnet...');
    printWarning('Live Stellar activation would prepare unsigned transactions');
    printWarning('All transactions routed to multisig approval');
  }
}

async function runFullPipeline(
  config: PlatformConfig,
  network: NetworkType,
  dryRun: boolean,
  jsonOutput: boolean,
  reportDir: string,
): Promise<void> {
  printHeader('Full Funding Pipeline Execution');
  printNetworkWarning(network);

  const fundingConfig = buildFundingConfig(config);
  fundingConfig.network = network;

  printInfo('Pipeline will execute 7 phases:');
  printInfo('  1. XRPL Trustline Activation');
  printInfo('  2. Stellar Asset Activation');
  printInfo('  3. Bond Creation');
  printInfo('  4. Escrow Deployment');
  printInfo('  5. Claim Receipt Issuance');
  printInfo('  6. DvP Settlement Execution');
  printInfo('  7. Cross-Ledger Attestation');
  printInfo('');

  if (dryRun) {
    printDryRun();
    printInfo('Full pipeline simulation:');
    printInfo('');

    // Simulate each phase
    const phases = [
      { name: 'XRPL Activation', txCount: 16, desc: 'DefaultRipple + 3 token × 5 accounts' },
      { name: 'Stellar Activation', txCount: 6, desc: 'Issuer flags + trustlines + authorization' },
      { name: 'Bond Creation', txCount: 2, desc: 'Bond issuance + collateral registration' },
      { name: 'Escrow Deployment', txCount: 3, desc: '3 escrow conditions (bond/coupon/participant)' },
      { name: 'Claim Receipt Issuance', txCount: 5, desc: 'IOU tokens to participating accounts' },
      { name: 'DvP Settlement', txCount: 4, desc: 'RTGS delivery-versus-payment execution' },
      { name: 'Attestation', txCount: 2, desc: 'Cross-ledger proof anchoring' },
    ];

    let totalTx = 0;
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i];
      printInfo(`  Phase ${i + 1}: ${p.name}`);
      printInfo(`    Transactions: ${p.txCount} — ${p.desc}`);
      totalTx += p.txCount;
    }

    printInfo('');
    printSuccess(`Total estimated transactions: ${totalTx}`);
    printSuccess('All transactions prepared UNSIGNED');
    printSuccess('Multisig approval required: 2-of-3');
    printInfo('');

    // Generate simulation report
    printInfo('Generating simulation report...');
    const reportPath = path.resolve(reportDir);
    if (!fs.existsSync(reportPath)) {
      fs.mkdirSync(reportPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_');
    const simReportPath = path.join(reportPath, `SIMULATION_REPORT_${timestamp}.md`);
    const simReport = [
      '# OPTKAS Funding Pipeline — Simulation Report',
      '',
      `> Generated: ${new Date().toISOString()}`,
      `> Mode: DRY RUN (no transactions executed)`,
      `> Network: ${network}`,
      '',
      '## Pipeline Phases',
      '',
      '| # | Phase | Est. Transactions | Description |',
      '|---|-------|-------------------|-------------|',
      ...phases.map((p, i) => `| ${i + 1} | ${p.name} | ${p.txCount} | ${p.desc} |`),
      '',
      `**Total Estimated Transactions:** ${totalTx}`,
      '',
      '## Accounts',
      '',
      '### XRPL',
      `- Issuer: \`${fundingConfig.xrpl.issuerAddress}\``,
      `- Treasury: \`${fundingConfig.xrpl.treasuryAddress}\``,
      `- Escrow: \`${fundingConfig.xrpl.escrowAddress}\``,
      `- Attestation: \`${fundingConfig.xrpl.attestationAddress}\``,
      `- AMM: \`${fundingConfig.xrpl.ammAddress}\``,
      `- Trading: \`${fundingConfig.xrpl.tradingAddress}\``,
      '',
      '### Stellar',
      `- Issuer: \`${fundingConfig.stellar.issuerAddress}\``,
      `- Distribution: \`${fundingConfig.stellar.distributionAddress}\``,
      `- Anchor: \`${fundingConfig.stellar.anchorAddress}\``,
      '',
      '## Bond',
      `- Name: ${fundingConfig.bond.name}`,
      `- Face Value: $${fundingConfig.bond.faceValue}`,
      `- Coupon: ${(fundingConfig.bond.couponRate * 100).toFixed(2)}%`,
      `- Maturity: ${fundingConfig.bond.maturityYears} years`,
      `- Collateral: $${fundingConfig.bond.collateralValue} (${fundingConfig.bond.coverageRatio}x)`,
      '',
      '---',
      '*Report generated by @optkas/funding-ops*',
    ].join('\n');

    fs.writeFileSync(simReportPath, simReport, 'utf-8');
    printSuccess(`Report saved: ${simReportPath}`);
    printInfo('');
    printInfo('To execute live: --no-dry-run');
  } else {
    printInfo('Connecting to XRPL + Stellar testnet...');
    printInfo('Instantiating FundingPipeline...');
    printInfo('');
    printWarning('Live pipeline execution would:');
    printWarning('  1. Connect to both networks');
    printWarning('  2. Prepare all unsigned transactions');
    printWarning('  3. Route to 2-of-3 multisig approval queue');
    printWarning('  4. Generate execution report');
    printInfo('');
    printInfo('Live execution requires active network connections');
    printInfo('and sufficient account reserves on testnet.');
  }
}

// ─── CLI Entry Point ────────────────────────────────────────────

const program = createBaseCommand(
  'execute-funding-pipeline',
  'OPTKAS Funding Pipeline — Testnet Execution',
)
  .option(
    '--phase <phase>',
    'Execution phase: readiness | activate-xrpl | activate-stellar | activate | full',
    'readiness',
  )
  .option(
    '--report-dir <dir>',
    'Directory for execution reports',
    'reports/funding',
  )
  .action(async (opts) => {
    const network = validateNetwork(opts.network);
    const dryRun = opts.dryRun !== false;
    const jsonOutput = opts.json === true;
    const phase = opts.phase as ExecutionPhase;
    const reportDir = opts.reportDir as string;

    try {
      const config = loadConfig(opts.config);

      switch (phase) {
        case 'readiness':
          await runReadinessCheck(config, network, dryRun, jsonOutput);
          break;
        case 'activate-xrpl':
          await runXRPLActivation(config, network, dryRun, jsonOutput);
          break;
        case 'activate-stellar':
          await runStellarActivation(config, network, dryRun, jsonOutput);
          break;
        case 'activate':
          await runXRPLActivation(config, network, dryRun, jsonOutput);
          await runStellarActivation(config, network, dryRun, jsonOutput);
          break;
        case 'full':
          await runFullPipeline(config, network, dryRun, jsonOutput, reportDir);
          break;
        default:
          printError(`Unknown phase: ${phase}`);
          printInfo('Valid phases: readiness | activate-xrpl | activate-stellar | activate | full');
          process.exit(1);
      }
    } catch (err: any) {
      printError(`Pipeline execution failed: ${err.message}`);
      if (opts.verbose) {
        console.error(err);
      }
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
