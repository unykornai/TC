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

// ─── Parse & Execute ───────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
  printError(err.message);
  process.exit(1);
});
