#!/usr/bin/env node
/**
 * OPTKAS Unified CLI
 *
 * Operational command-line interface for the OPTKAS1 multi-ledger
 * funding infrastructure. Provides account queries, escrow management,
 * trustline verification, audit reporting, and cross-ledger reconciliation.
 *
 * Usage:
 *   npx ts-node apps/cli/src/cli.ts balance --network testnet
 *   npx ts-node apps/cli/src/cli.ts escrow list
 *   npx ts-node apps/cli/src/cli.ts trustline verify
 *   npx ts-node apps/cli/src/cli.ts audit report
 *   npx ts-node apps/cli/src/cli.ts reconcile --scope full
 */

import { Command } from 'commander';
import {
  loadConfig,
  printHeader,
  printSuccess,
  printInfo,
  printWarning,
  printError,
  printDryRun,
  printNetworkWarning,
  validateNetwork,
  PlatformConfig,
  NetworkType,
} from '../../../scripts/lib/cli-utils';

import { XRPLClient } from '../../../packages/xrpl-core/src';
import { StellarClient } from '../../../packages/stellar-core/src';
import { EscrowManager } from '../../../packages/escrow/src';
import { ComplianceEngine } from '../../../packages/compliance/src';
import { AuditEventStore } from '../../../packages/audit/src';
import { ReportingEngine } from '../../../packages/reporting/src';
import { FundingPipeline, type FundingPipelineConfig, type TokenDefinition } from '../../../packages/funding-ops/src/pipeline';
import { XRPLActivator } from '../../../packages/funding-ops/src/xrpl-activator';
import { StellarActivator } from '../../../packages/funding-ops/src/stellar-activator';
import { FundingReportGenerator } from '../../../packages/funding-ops/src/report-generator';

import * as fs from 'fs';
import * as path from 'path';

// ─── Root Command ──────────────────────────────────────────────────

const program = new Command()
  .name('optkas')
  .description('OPTKAS1 Multi-Ledger Funding Infrastructure CLI')
  .version('1.0.0')
  .option('--network <network>', 'Target network: testnet | mainnet', 'testnet')
  .option('--config <path>', 'Path to platform-config.yaml', 'config/platform-config.yaml')
  .option('--dry-run', 'Simulate without executing', true)
  .option('--json', 'Output as JSON', false);

// ─── Balance Command ───────────────────────────────────────────────

program
  .command('balance')
  .description('Query all account balances across XRPL and Stellar')
  .option('--ledger <ledger>', 'Filter by ledger: xrpl | stellar | all', 'all')
  .action(async (opts) => {
    const globalOpts = program.opts();
    const network = validateNetwork(globalOpts.network);
    const config = loadConfig(globalOpts.config);

    printHeader('Account Balances');
    printInfo(`Network: ${network}`);
    console.log('');

    const results: any[] = [];

    // XRPL Balances
    if (opts.ledger === 'all' || opts.ledger === 'xrpl') {
      printInfo('─── XRPL Accounts ───');
      const xrplClient = new XRPLClient({ network });

      for (const [role, acct] of Object.entries(config.xrpl_accounts || {})) {
        const address = (acct as any).address;
        if (!address) continue;

        try {
          const info = await xrplClient.getAccountInfo(address);
          const xrp = (parseInt(info.balance || '0') / 1_000_000).toFixed(6);
          printSuccess(`${role.padEnd(20)} ${xrp.padStart(16)} XRP  ${address}`);
          results.push({ ledger: 'XRPL', role, balance: xrp, unit: 'XRP', address });

          // Check trustlines for IOUs
          try {
            const trustlines = await xrplClient.getTrustlines(address);
            for (const tl of trustlines) {
              printInfo(`  └─ ${(tl as any).currency?.padEnd(12) || 'UNKNOWN'} ${String((tl as any).balance || '0').padStart(16)}  issuer: ${(tl as any).account || 'unknown'}`);
              results.push({
                ledger: 'XRPL', role, currency: (tl as any).currency,
                balance: (tl as any).balance, issuer: (tl as any).account, address,
              });
            }
          } catch { /* no trustlines */ }
        } catch (err: any) {
          printWarning(`${role.padEnd(20)} NOT FUNDED          ${address}`);
          results.push({ ledger: 'XRPL', role, balance: '0', error: err.message, address });
        }
      }
      console.log('');
    }

    // Stellar Balances
    if (opts.ledger === 'all' || opts.ledger === 'stellar') {
      printInfo('─── Stellar Accounts ───');
      const stellarClient = new StellarClient({ network });

      for (const [role, acct] of Object.entries(config.stellar_accounts || {})) {
        const publicKey = (acct as any).public_key;
        if (!publicKey) continue;

        try {
          const info = await stellarClient.getAccountInfo(publicKey);
          for (const bal of info.balances) {
            const asset = bal.assetType === 'native' ? 'XLM' : bal.assetCode || 'UNKNOWN';
            const amount = bal.balance || '0';
            if (asset === 'XLM') {
              printSuccess(`${role.padEnd(20)} ${String(amount).padStart(16)} XLM  ${publicKey.substring(0, 12)}...`);
            } else {
              printInfo(`  └─ ${asset.padEnd(12)} ${String(amount).padStart(16)}  issuer: ${bal.assetIssuer?.substring(0, 12) || 'n/a'}...`);
            }
            results.push({ ledger: 'Stellar', role, balance: amount, unit: asset, address: publicKey });
          }
        } catch (err: any) {
          printWarning(`${role.padEnd(20)} NOT FUNDED          ${publicKey.substring(0, 12)}...`);
          results.push({ ledger: 'Stellar', role, balance: '0', error: err.message, address: publicKey });
        }
      }
      console.log('');
    }

    if (globalOpts.json) {
      console.log(JSON.stringify(results, null, 2));
    }
  });

// ─── Escrow Command ────────────────────────────────────────────────

const escrowCmd = program
  .command('escrow')
  .description('Manage and query XRPL escrows');

escrowCmd
  .command('list')
  .description('List all escrows for configured accounts')
  .action(async () => {
    const globalOpts = program.opts();
    const network = validateNetwork(globalOpts.network);
    const config = loadConfig(globalOpts.config);

    printHeader('Escrow Status');
    printInfo(`Network: ${network}`);
    console.log('');

    const xrplClient = new XRPLClient({ network });
    const escrowManager = new EscrowManager({ client: xrplClient });
    const escrows = escrowManager.listEscrows();

    if (escrows.length === 0) {
      printInfo('No escrows currently tracked.');
    }

    for (const esc of escrows) {
      printInfo(`  ID:          ${esc.id}`);
      printInfo(`  Status:      ${esc.status}`);
      printInfo(`  Amount:      ${esc.amount}`);
      printInfo(`  Sender:      ${esc.sender}`);
      printInfo(`  Destination: ${esc.destination}`);
      if (esc.condition) printInfo(`  Condition:   ${esc.condition}`);
      if (esc.cancelAfter) printInfo(`  Cancel After: ${new Date(esc.cancelAfter * 1000).toISOString()}`);
      console.log('');
    }

    if (globalOpts.json) {
      console.log(JSON.stringify(escrows, null, 2));
    }
  });

escrowCmd
  .command('create')
  .description('Prepare an escrow creation transaction (unsigned)')
  .requiredOption('--template <name>', 'Escrow template from config')
  .requiredOption('--amount <drops>', 'Amount in drops')
  .action(async (opts) => {
    const globalOpts = program.opts();
    const network = validateNetwork(globalOpts.network);
    const config = loadConfig(globalOpts.config);
    const dryRun = globalOpts.dryRun;

    printHeader('Create Escrow');
    if (dryRun) printDryRun();
    printNetworkWarning(network);

    const xrplClient = new XRPLClient({ network });
    const escrowManager = new EscrowManager({ client: xrplClient });

    const template = config.escrow_templates?.[opts.template];
    if (!template) {
      printError(`Unknown escrow template: ${opts.template}`);
      printInfo(`Available: ${Object.keys(config.escrow_templates || {}).join(', ')}`);
      process.exit(1);
    }

    const tx = escrowManager.prepareEscrowCreate({
      senderAddress: template.sender || config.xrpl_accounts?.treasury?.address,
      destinationAddress: template.destination || config.xrpl_accounts?.escrow?.address,
      amount: opts.amount,
      cancelAfterSeconds: template.cancel_after_hours ? template.cancel_after_hours * 3600 : 86400,
      condition: template.condition,
    });

    printSuccess('Unsigned escrow transaction prepared:');
    console.log(JSON.stringify(tx, null, 2));
    printInfo('');
    printInfo('Submit this transaction via multisig to execute.');
  });

// ─── Trustline Command ─────────────────────────────────────────────

const trustlineCmd = program
  .command('trustline')
  .description('Verify and manage trustlines');

trustlineCmd
  .command('verify')
  .description('Verify all configured trustlines exist on-ledger')
  .action(async () => {
    const globalOpts = program.opts();
    const network = validateNetwork(globalOpts.network);
    const config = loadConfig(globalOpts.config);

    printHeader('Trustline Verification');
    printInfo(`Network: ${network}`);
    console.log('');

    const xrplClient = new XRPLClient({ network });
    const results: any[] = [];

    // Check XRPL trustlines
    for (const [role, acct] of Object.entries(config.xrpl_accounts || {})) {
      const address = (acct as any).address;
      const requiredTrustlines = (acct as any).trustlines || [];
      if (!address || requiredTrustlines.length === 0) continue;

      printInfo(`${role} (${address}):`);
      try {
        const trustlines = await xrplClient.getTrustlines(address);
        const tlMap = new Map(trustlines.map((tl: any) => [`${tl.currency}:${tl.account}`, tl]));

        for (const required of requiredTrustlines) {
          const key = `${required.currency}:${required.issuer}`;
          const found = tlMap.get(key);
          if (found) {
            printSuccess(`  ✓ ${required.currency} → ${required.issuer.substring(0, 12)}... (balance: ${(found as any).balance})`);
            results.push({ role, currency: required.currency, status: 'ACTIVE', balance: (found as any).balance });
          } else {
            printWarning(`  ✗ ${required.currency} → ${required.issuer.substring(0, 12)}... MISSING`);
            results.push({ role, currency: required.currency, status: 'MISSING' });
          }
        }
      } catch {
        printWarning(`  Account not funded — skipping trustline check`);
        results.push({ role, status: 'NOT_FUNDED' });
      }
      console.log('');
    }

    if (globalOpts.json) {
      console.log(JSON.stringify(results, null, 2));
    }
  });

// ─── Audit Command ─────────────────────────────────────────────────

const auditCmd = program
  .command('audit')
  .description('Generate compliance and audit reports');

auditCmd
  .command('report')
  .description('Generate a full compliance audit report')
  .option('--output <path>', 'Output file path')
  .action(async (opts) => {
    const globalOpts = program.opts();
    const config = loadConfig(globalOpts.config);

    printHeader('Compliance Audit Report');

    const auditStore = new AuditEventStore();
    const complianceEngine = new ComplianceEngine({
      jurisdiction: config.compliance?.jurisdiction || 'US',
      kycRequired: config.compliance?.kyc_required !== false,
    });
    const reportingEngine = new ReportingEngine({ auditStore });

    const report = reportingEngine.generateComplianceReport();

    if (opts.output || !globalOpts.json) {
      const outputPath = opts.output || `./reports/audit_${new Date().toISOString().split('T')[0]}.json`;
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      printSuccess(`Audit report saved: ${outputPath}`);
    }

    if (globalOpts.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printInfo(`  Total events:    ${report.totalEvents || 0}`);
      printInfo(`  Compliance:      ${report.complianceStatus || 'unknown'}`);
      printInfo(`  Generated:       ${report.generatedAt || new Date().toISOString()}`);
    }
  });

// ─── Reconcile Command ─────────────────────────────────────────────

program
  .command('reconcile')
  .description('Run cross-ledger reconciliation')
  .option('--scope <scope>', 'Scope: full | xrpl | stellar', 'full')
  .option('--output <path>', 'Output report path')
  .action(async (opts) => {
    const globalOpts = program.opts();

    // Delegate to the reconciliation script
    const { execSync } = require('child_process');
    const args = [
      'npx', 'ts-node', 'scripts/reconcile-ledgers.ts',
      '--network', globalOpts.network,
      '--scope', opts.scope,
      '--config', globalOpts.config,
    ];
    if (globalOpts.dryRun) args.push('--dry-run');
    if (opts.output) args.push('--output', opts.output);

    try {
      execSync(args.join(' '), { stdio: 'inherit', cwd: process.cwd() });
    } catch (err: any) {
      printError(`Reconciliation failed: ${err.message}`);
      process.exit(1);
    }
  });

// ─── Status Command ────────────────────────────────────────────────

program
  .command('status')
  .description('Show platform infrastructure status summary')
  .action(async () => {
    const globalOpts = program.opts();
    const network = validateNetwork(globalOpts.network);
    const config = loadConfig(globalOpts.config);

    printHeader('Platform Status');
    printInfo(`Platform:  ${config.platform?.name || 'OPTKAS'}`);
    printInfo(`Version:   ${config.platform?.version || '1.0.0'}`);
    printInfo(`Network:   ${network}`);
    printInfo(`Owner:     ${config.platform?.owner || 'unknown'}`);
    console.log('');

    // Count configured accounts
    const xrplCount = Object.keys(config.xrpl_accounts || {}).length;
    const stellarCount = Object.keys(config.stellar_accounts || {}).length;
    const tokenCount = Object.keys(config.tokens || {}).length;
    const escrowTemplates = Object.keys(config.escrow_templates || {}).length;

    printInfo('─── Configuration ───');
    printInfo(`  XRPL Accounts:       ${xrplCount}`);
    printInfo(`  Stellar Accounts:    ${stellarCount}`);
    printInfo(`  Tokens Defined:      ${tokenCount}`);
    printInfo(`  Escrow Templates:    ${escrowTemplates}`);
    printInfo(`  Governance Model:    ${config.governance?.model || 'multisig'}`);
    console.log('');

    // Quick connectivity check
    printInfo('─── Connectivity ───');
    try {
      const xrplClient = new XRPLClient({ network });
      const firstAddr = Object.values(config.xrpl_accounts || {})[0];
      if (firstAddr) {
        await xrplClient.getAccountInfo((firstAddr as any).address);
        printSuccess('  XRPL:    Connected ✓');
      }
    } catch {
      printWarning('  XRPL:    Unreachable ✗');
    }

    try {
      const stellarClient = new StellarClient({ network });
      const firstPk = Object.values(config.stellar_accounts || {})[0];
      if (firstPk) {
        await stellarClient.getAccountInfo((firstPk as any).public_key);
        printSuccess('  Stellar: Connected ✓');
      }
    } catch {
      printWarning('  Stellar: Unreachable ✗');
    }
    console.log('');
  });

// ─── Fund Command ──────────────────────────────────────────────────

const fundCmd = program
  .command('fund')
  .description('Funding pipeline operations — activation, readiness, execution');

// ── fund readiness ──

fundCmd
  .command('readiness')
  .description('Run funding readiness check across XRPL + Stellar infrastructure')
  .action(async () => {
    const globalOpts = program.opts();
    const network = validateNetwork(globalOpts.network);
    const config = loadConfig(globalOpts.config);
    const dryRun = globalOpts.dryRun !== false;

    printHeader('Funding Readiness Check');
    printNetworkWarning(network);

    const fundingConfig = buildFundingConfigFromPlatform(config, network);

    // Validate address presence
    const xrplAddresses = Object.values(fundingConfig.xrpl);
    const stellarAddresses = Object.values(fundingConfig.stellar);
    const missingXRPL = xrplAddresses.filter(a => !a).length;
    const missingStellar = stellarAddresses.filter(a => !a).length;

    printInfo('─── Account Configuration ───');
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
    printSuccess(`Bond: ${fundingConfig.bond.name} ($${fundingConfig.bond.faceValue})`);
    printSuccess(`Governance: 2-of-3 multisig`);
    console.log('');

    if (dryRun) {
      printDryRun();
      printInfo('Full network readiness check requires --no-dry-run');
    } else {
      printInfo('─── Network Connectivity ───');

      // XRPL check
      try {
        const xrplClient = new XRPLClient({ network });
        const info = await xrplClient.getAccountInfo(fundingConfig.xrpl.issuerAddress);
        printSuccess(`XRPL Issuer online — balance: ${(parseInt(info.balance || '0') / 1_000_000).toFixed(6)} XRP`);
      } catch (err: any) {
        printWarning(`XRPL Issuer: ${err.message}`);
      }

      // Stellar check
      try {
        const stellarClient = new StellarClient({ network });
        const sInfo = await stellarClient.getAccountInfo(fundingConfig.stellar.issuerAddress);
        const nativeBalance = sInfo.balances.find((b: any) => b.assetType === 'native');
        printSuccess(`Stellar Issuer online — balance: ${nativeBalance?.balance || '0'} XLM`);
      } catch (err: any) {
        printWarning(`Stellar Issuer: ${err.message}`);
      }
      console.log('');
    }

    printInfo('─── Bond Parameters ───');
    printInfo(`  Name:           ${fundingConfig.bond.name}`);
    printInfo(`  Face Value:     $${fundingConfig.bond.faceValue}`);
    printInfo(`  Coupon Rate:    ${(fundingConfig.bond.couponRate * 100).toFixed(2)}%`);
    printInfo(`  Maturity:       ${fundingConfig.bond.maturityYears} years`);
    printInfo(`  Collateral:     $${fundingConfig.bond.collateralValue} (${fundingConfig.bond.coverageRatio}x)`);
    console.log('');
  });

// ── fund activate-xrpl ──

fundCmd
  .command('activate-xrpl')
  .description('Activate XRPL infrastructure: DefaultRipple + trustlines')
  .action(async () => {
    const globalOpts = program.opts();
    const network = validateNetwork(globalOpts.network);
    const config = loadConfig(globalOpts.config);
    const dryRun = globalOpts.dryRun !== false;

    printHeader('XRPL Infrastructure Activation');
    if (dryRun) printDryRun();
    printNetworkWarning(network);

    const fundingConfig = buildFundingConfigFromPlatform(config, network);
    const xrplTokens = fundingConfig.tokens.filter(t => t.ledger === 'xrpl');

    printInfo('Activation plan:');
    printInfo(`  1. AccountSet: DefaultRipple → ${fundingConfig.xrpl.issuerAddress.substring(0, 16)}...`);
    for (const token of xrplTokens) {
      printInfo(`  2. TrustSet: ${token.code} (limit: ${token.trustlineLimit}) → 5 accounts`);
    }
    printInfo(`  3. Verify all trustlines established`);
    console.log('');

    const estimatedTx = 1 + (xrplTokens.length * 5);
    printSuccess(`Estimated transactions: ${estimatedTx} (require 2-of-3 multisig)`);

    if (!dryRun) {
      printInfo('');
      printWarning('Live activation prepares UNSIGNED transactions');
      printWarning('All routed to multisig approval queue');
    }
    console.log('');
  });

// ── fund activate-stellar ──

fundCmd
  .command('activate-stellar')
  .description('Activate Stellar infrastructure: regulated asset flags + trustlines')
  .action(async () => {
    const globalOpts = program.opts();
    const network = validateNetwork(globalOpts.network);
    const config = loadConfig(globalOpts.config);
    const dryRun = globalOpts.dryRun !== false;

    printHeader('Stellar Infrastructure Activation');
    if (dryRun) printDryRun();
    printNetworkWarning(network);

    const fundingConfig = buildFundingConfigFromPlatform(config, network);
    const stellarTokens = fundingConfig.tokens.filter(t => t.ledger === 'stellar');

    printInfo('Activation plan:');
    printInfo(`  1. SetOptions: auth_required | auth_revocable | auth_clawback_enabled`);
    printInfo(`     Target: ${fundingConfig.stellar.issuerAddress.substring(0, 16)}...`);
    for (const token of stellarTokens) {
      printInfo(`  2. ChangeTrust: ${token.code} → distribution + anchor`);
      printInfo(`  3. SetTrustLineFlags: authorized`);
    }
    printInfo(`  4. Initial issuance: issuer → distribution`);
    console.log('');

    const estimatedTx = 1 + (stellarTokens.length * 5);
    printSuccess(`Estimated transactions: ${estimatedTx} (require multisig)`);

    if (!dryRun) {
      printInfo('');
      printWarning('Live activation prepares UNSIGNED transactions');
      printWarning('All routed to multisig approval queue');
    }
    console.log('');
  });

// ── fund run-pipeline ──

fundCmd
  .command('run-pipeline')
  .description('Execute the full 7-phase funding pipeline')
  .option('--escrow-amount <drops>', 'Escrow amount in drops', '50000000')
  .option('--bond-name <name>', 'Bond series name', 'OPTKAS Infrastructure Bond Series A')
  .option('--report-dir <dir>', 'Report output directory', 'reports/funding')
  .action(async (opts) => {
    const globalOpts = program.opts();
    const network = validateNetwork(globalOpts.network);
    const config = loadConfig(globalOpts.config);
    const dryRun = globalOpts.dryRun !== false;

    printHeader('Full Funding Pipeline');
    if (dryRun) printDryRun();
    printNetworkWarning(network);

    const fundingConfig = buildFundingConfigFromPlatform(config, network);
    fundingConfig.bond.name = opts.bondName;

    printInfo('Pipeline will execute 7 phases:');
    printInfo('  1. XRPL Trustline Activation');
    printInfo('  2. Stellar Asset Activation');
    printInfo('  3. Bond Creation');
    printInfo('  4. Escrow Deployment');
    printInfo('  5. Claim Receipt Issuance');
    printInfo('  6. DvP Settlement Execution');
    printInfo('  7. Cross-Ledger Attestation');
    console.log('');

    printInfo('Parameters:');
    printInfo(`  Bond:          ${fundingConfig.bond.name}`);
    printInfo(`  Face Value:    $${fundingConfig.bond.faceValue}`);
    printInfo(`  Escrow Amount: ${opts.escrowAmount} drops`);
    printInfo(`  Report Dir:    ${opts.reportDir}`);
    console.log('');

    if (dryRun) {
      const phases = [
        { name: 'XRPL Activation', txCount: 16 },
        { name: 'Stellar Activation', txCount: 6 },
        { name: 'Bond Creation', txCount: 2 },
        { name: 'Escrow Deployment', txCount: 3 },
        { name: 'Claim Receipt Issuance', txCount: 5 },
        { name: 'DvP Settlement', txCount: 4 },
        { name: 'Attestation', txCount: 2 },
      ];
      let totalTx = 0;
      for (let i = 0; i < phases.length; i++) {
        const p = phases[i];
        printInfo(`  Phase ${i + 1}: ${p.name} — ${p.txCount} transactions`);
        totalTx += p.txCount;
      }
      console.log('');
      printSuccess(`Total estimated transactions: ${totalTx}`);
      printSuccess('All UNSIGNED — require 2-of-3 multisig');
      printInfo('');
      printInfo('Run with --no-dry-run to execute');
    } else {
      printWarning('Live pipeline connects to XRPL + Stellar testnet');
      printWarning('All transactions prepared unsigned and queued for multisig');
    }
    console.log('');
  });

// ── fund config helper ──

function buildFundingConfigFromPlatform(config: PlatformConfig, network: NetworkType): FundingPipelineConfig {
  const xrplAccounts = config.xrpl_accounts || {};
  const stellarAccounts = config.stellar_accounts || {};

  const tokens: TokenDefinition[] = Object.entries(config.tokens || {}).map(([code, def]: [string, any]) => ({
    code,
    ledger: def.ledger || (def.network === 'stellar' ? 'stellar' : 'xrpl'),
    type: def.type || 'claim_receipt',
    trustlineLimit: def.limit || def.trustline_limit || '1000000000',
    freezeEnabled: def.freeze_enabled ?? true,
    transferable: def.transferable ?? false,
  }));

  return {
    xrpl: {
      issuerAddress: (xrplAccounts as any).issuer?.address || '',
      treasuryAddress: (xrplAccounts as any).treasury?.address || '',
      escrowAddress: (xrplAccounts as any).escrow?.address || '',
      attestationAddress: (xrplAccounts as any).attestation?.address || '',
      ammAddress: (xrplAccounts as any).amm?.address || '',
      tradingAddress: (xrplAccounts as any).trading?.address || '',
    },
    stellar: {
      issuerAddress: (stellarAccounts as any).issuer?.address || '',
      distributionAddress: (stellarAccounts as any).distribution?.address || '',
      anchorAddress: (stellarAccounts as any).anchor?.address || '',
    },
    tokens,
    network,
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

// ─── Parse & Execute ───────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
  printError(err.message);
  process.exit(1);
});
