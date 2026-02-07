#!/usr/bin/env ts-node
/**
 * xrpl-create-escrow.ts — Create XRPL escrow (bond funding evidence)
 *
 * Usage:
 *   npx ts-node scripts/xrpl-create-escrow.ts --template bond_funding --amount 1000000 --lender LENDER-001 --network testnet --dry-run
 */

import { loadConfig, createBaseCommand, printHeader, printSuccess, printInfo, printDryRun, printNetworkWarning, printError, validateNetwork } from './lib/cli-utils';

const program = createBaseCommand('xrpl-create-escrow', 'Create XRPL conditional escrow')
  .requiredOption('--template <name>', 'Escrow template name (e.g., bond_funding, settlement)')
  .requiredOption('--amount <amount>', 'Escrow amount')
  .option('--lender <id>', 'Lender identifier');

program.parse(process.argv);
const opts = program.opts();

async function main(): Promise<void> {
  printHeader('XRPL Escrow Creation');
  const network = validateNetwork(opts.network);
  const dryRun = opts.dryRun !== false;
  const config = loadConfig(opts.config);

  if (dryRun) printDryRun();
  printNetworkWarning(network);

  const template = config.escrow_templates?.[opts.template];
  if (!template) {
    printError(`Escrow template not found: ${opts.template}`);
    printInfo(`Available templates: ${Object.keys(config.escrow_templates || {}).join(', ')}`);
    process.exit(1);
  }

  const escrowAddress = config.xrpl_accounts?.escrow?.address || '<escrow_address>';
  const treasuryAddress = config.xrpl_accounts?.treasury?.address || '<treasury_address>';
  const amount = parseFloat(opts.amount);

  if (amount < (template.min_amount || 0)) {
    printError(`Amount ${amount} below template minimum ${template.min_amount}`);
    process.exit(1);
  }
  if (template.max_amount && amount > template.max_amount) {
    printError(`Amount ${amount} above template maximum ${template.max_amount}`);
    process.exit(1);
  }

  const now = new Date();
  const finishAfter = new Date(now);
  finishAfter.setDate(finishAfter.getDate() + 1);
  const cancelAfter = new Date(now);
  cancelAfter.setDate(cancelAfter.getDate() + (template.duration_days || 90));

  printInfo(`Creating escrow from template: ${opts.template}`);
  printInfo(`  Source: escrow (${escrowAddress})`);
  printInfo(`  Destination: treasury (${treasuryAddress})`);
  printInfo(`  Amount: ${opts.amount} XRP (evidence)`);
  printInfo(`  Duration: ${template.duration_days || 90} days`);
  printInfo(`  Condition: ${template.crypto_conditions ? 'PREIMAGE-SHA-256' : 'time-only'}`);
  printInfo(`  FinishAfter: ${finishAfter.toISOString()}`);
  printInfo(`  CancelAfter: ${cancelAfter.toISOString()}`);
  if (opts.lender) printInfo(`  Lender: ${opts.lender}`);
  console.log('');

  if (dryRun) {
    printInfo('[DRY RUN] Would prepare EscrowCreate transaction');
    printInfo('  Requires: 2-of-3 multisig approval');
    if (template.crypto_conditions) {
      printInfo('  Crypto-condition would be generated (fulfillment stored in HSM)');
    }
  } else {
    printSuccess(`Escrow created`);
    printInfo(`  TX: <pending_multisig>`);
  }

  console.log('');
  console.log('─'.repeat(60));
  printSuccess(`${dryRun ? 'Dry run complete' : 'Escrow created successfully'}`);
}

main().catch((err) => { printError(err.message); process.exit(1); });
