#!/usr/bin/env ts-node
/**
 * validate-config.ts — Validate platform configuration
 *
 * Usage: npx ts-node scripts/validate-config.ts --config config/platform-config.yaml
 */

import {
  loadConfig, createBaseCommand, printHeader, printSuccess, printWarning, printError, validateNetwork,
} from './lib/cli-utils';

const program = createBaseCommand('validate-config', 'Validate platform configuration file')
  .option('--verify-accounts', 'Verify XRPL/Stellar accounts exist on-chain', false)
  .option('--check-pause', 'Check if platform is in emergency pause state', false);

program.parse(process.argv);
const opts = program.opts();

async function main(): Promise<void> {
  printHeader('Configuration Validator');

  try {
    const config = loadConfig(opts.config);
    let errors = 0;
    let warnings = 0;

    // Platform
    if (config.platform?.name && config.platform?.version && config.platform?.owner) {
      printSuccess('Platform metadata complete');
    } else {
      printError('Platform metadata incomplete'); errors++;
    }

    // Entities
    const requiredEntities = ['spv', 'trustee', 'custodian', 'implementation_partner'];
    for (const entity of requiredEntities) {
      if (config.entities?.[entity]) {
        printSuccess(`Entity defined: ${entity}`);
      } else {
        printError(`Entity missing: ${entity}`); errors++;
      }
    }

    // Governance
    if (config.governance?.multisig?.threshold && config.governance?.multisig?.roles) {
      const threshold = config.governance.multisig.threshold;
      const signerCount = config.governance.multisig.roles.length;
      printSuccess(`Governance: ${threshold}-of-${signerCount} multisig`);
    } else {
      printError('Governance multisig configuration missing'); errors++;
    }

    // Networks
    for (const ledger of ['xrpl', 'stellar'] as const) {
      if (config.networks?.[ledger]) {
        const networks = Object.keys(config.networks[ledger]);
        printSuccess(`${ledger.toUpperCase()} networks: ${networks.join(', ')}`);
      } else {
        printError(`${ledger.toUpperCase()} network configuration missing`); errors++;
      }
    }

    // XRPL Accounts
    const xrplAccounts = config.xrpl_accounts || {};
    for (const [name, acct] of Object.entries(xrplAccounts)) {
      if ((acct as any).address) {
        printSuccess(`XRPL account ${name}: ${(acct as any).address}`);
      } else {
        printWarning(`XRPL account ${name}: address not yet populated`); warnings++;
      }
    }

    // Stellar Accounts
    const stellarAccounts = config.stellar_accounts || {};
    for (const [name, acct] of Object.entries(stellarAccounts)) {
      if ((acct as any).public_key) {
        printSuccess(`Stellar account ${name}: ${(acct as any).public_key}`);
      } else {
        printWarning(`Stellar account ${name}: public_key not yet populated`); warnings++;
      }
    }

    // Tokens
    const tokens = config.tokens || {};
    const tokenCount = Object.keys(tokens).length;
    if (tokenCount > 0) {
      printSuccess(`Tokens defined: ${tokenCount} (${Object.keys(tokens).join(', ')})`);
    } else {
      printError('No tokens defined'); errors++;
    }

    // Escrow Templates
    const escrowTemplates = config.escrow_templates || {};
    const templateCount = Object.keys(escrowTemplates).length;
    if (templateCount > 0) {
      printSuccess(`Escrow templates: ${templateCount} (${Object.keys(escrowTemplates).join(', ')})`);
    } else {
      printWarning('No escrow templates defined'); warnings++;
    }

    // Compliance
    if (config.compliance) {
      printSuccess('Compliance configuration present');
    } else {
      printError('Compliance configuration missing'); errors++;
    }

    // Audit
    if (config.audit?.retention_days && config.audit?.required_events) {
      const years = Math.round(config.audit.retention_days / 365);
      printSuccess(`Audit: ${years}-year retention (${config.audit.retention_days} days), ${config.audit.required_events.length} event types`);
    } else {
      printError('Audit configuration incomplete'); errors++;
    }

    // Summary
    console.log('');
    console.log('─'.repeat(60));
    if (errors === 0) {
      printSuccess(`Validation PASSED (${warnings} warnings)`);
    } else {
      printError(`Validation FAILED: ${errors} errors, ${warnings} warnings`);
      process.exit(1);
    }

  } catch (err: any) {
    printError(`Failed to load configuration: ${err.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
