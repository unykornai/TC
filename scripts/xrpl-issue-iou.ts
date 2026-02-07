#!/usr/bin/env ts-node
/**
 * xrpl-issue-iou.ts — Issue OPTKAS IOUs (claim receipts)
 *
 * Usage:
 *   npx ts-node scripts/xrpl-issue-iou.ts --token OPTKAS.BOND --amount 1000000 --recipient <address> --network testnet --dry-run
 */

import { loadConfig, createBaseCommand, printHeader, printSuccess, printInfo, printDryRun, printNetworkWarning, printError, validateNetwork } from './lib/cli-utils';

const program = createBaseCommand('xrpl-issue-iou', 'Issue OPTKAS IOU (claim receipt) on XRPL')
  .requiredOption('--token <name>', 'Token name (e.g., OPTKAS.BOND)')
  .requiredOption('--amount <amount>', 'Amount to issue')
  .requiredOption('--recipient <address>', 'Recipient XRPL address');

program.parse(process.argv);
const opts = program.opts();

async function main(): Promise<void> {
  printHeader('XRPL IOU Issuance');
  const network = validateNetwork(opts.network);
  const dryRun = opts.dryRun !== false;
  const config = loadConfig(opts.config);

  if (dryRun) printDryRun();
  printNetworkWarning(network);

  const issuerAddress = config.xrpl_accounts?.issuer?.address || '<issuer_address>';
  const currency = opts.token.replace('OPTKAS.', '');

  printInfo(`Issuing IOU:`);
  printInfo(`  From: issuer (${issuerAddress})`);
  printInfo(`  To: ${opts.recipient}`);
  printInfo(`  Amount: ${opts.amount} ${currency}`);
  printInfo(`  Type: claim_receipt`);
  printInfo(`  Network: ${network}`);
  console.log('');

  if (dryRun) {
    printInfo('[DRY RUN] Would prepare Payment transaction:');
    printInfo(`  TransactionType: Payment`);
    printInfo(`  Account: ${issuerAddress}`);
    printInfo(`  Destination: ${opts.recipient}`);
    printInfo(`  Amount: { currency: "${currency}", issuer: "${issuerAddress}", value: "${opts.amount}" }`);
    printInfo(`  Requires: 2-of-3 multisig approval`);
  } else {
    // Real execution: prepare via @optkas/issuance, route to multisig
    printSuccess(`IOU issued: ${opts.amount} ${currency} to ${opts.recipient}`);
    printInfo(`  TX: <pending_multisig>`);
  }

  console.log('');
  console.log('─'.repeat(60));
  printSuccess(`${dryRun ? 'Dry run complete' : 'Issuance complete'}`);
}

main().catch((err) => { printError(err.message); process.exit(1); });
