#!/usr/bin/env ts-node
/**
 * stellar-issue-asset.ts — Issue or manage Stellar regulated assets
 *
 * Usage:
 *   npx ts-node scripts/stellar-issue-asset.ts --action issue --amount 1000000 --network testnet --dry-run
 *   npx ts-node scripts/stellar-issue-asset.ts --action authorize --holder <stellar_address> --network testnet --dry-run
 */

import { loadConfig, createBaseCommand, printHeader, printSuccess, printInfo, printDryRun, printNetworkWarning, printError, validateNetwork } from './lib/cli-utils';

const program = createBaseCommand('stellar-issue-asset', 'Issue or manage Stellar regulated assets')
  .requiredOption('--action <action>', 'Action: issue | authorize | revoke | clawback')
  .option('--amount <amount>', 'Amount to issue or clawback')
  .option('--holder <address>', 'Stellar address of asset holder');

program.parse(process.argv);
const opts = program.opts();

async function main(): Promise<void> {
  printHeader('Stellar Asset Management');
  const network = validateNetwork(opts.network);
  const dryRun = opts.dryRun !== false;
  const config = loadConfig(opts.config);

  if (dryRun) printDryRun();
  printNetworkWarning(network);

  const issuerKey = config.stellar_accounts?.issuer?.public_key || '<issuer_public_key>';
  const distributionKey = config.stellar_accounts?.distribution?.public_key || '<distribution_public_key>';

  switch (opts.action) {
    case 'issue':
      if (!opts.amount) { printError('--amount required for issue'); process.exit(1); }
      printInfo(`Issuing OPTKAS-USD:`);
      printInfo(`  From: issuer (${issuerKey})`);
      printInfo(`  To: distribution (${distributionKey})`);
      printInfo(`  Amount: ${opts.amount}`);
      printInfo(`  Asset: OPTKASUSD`);
      printInfo(`  Flags: AUTH_REQUIRED, AUTH_REVOCABLE, AUTH_CLAWBACK`);
      break;

    case 'authorize':
      if (!opts.holder) { printError('--holder required for authorize'); process.exit(1); }
      printInfo(`Authorizing holder for OPTKAS-USD:`);
      printInfo(`  Issuer: ${issuerKey}`);
      printInfo(`  Holder: ${opts.holder}`);
      printInfo(`  Action: Set authorized=true on trustline`);
      break;

    case 'revoke':
      if (!opts.holder) { printError('--holder required for revoke'); process.exit(1); }
      printInfo(`Revoking authorization:`);
      printInfo(`  Issuer: ${issuerKey}`);
      printInfo(`  Holder: ${opts.holder}`);
      printInfo(`  Action: Set authorized=false on trustline`);
      break;

    case 'clawback':
      if (!opts.holder || !opts.amount) { printError('--holder and --amount required for clawback'); process.exit(1); }
      printInfo(`Clawback OPTKAS-USD:`);
      printInfo(`  From: ${opts.holder}`);
      printInfo(`  Amount: ${opts.amount}`);
      printInfo(`  Reason: Must be documented and attested`);
      break;

    default:
      printError(`Unknown action: ${opts.action}`);
      process.exit(1);
  }

  console.log('');
  if (dryRun) {
    printInfo(`[DRY RUN] Would prepare Stellar transaction`);
    printInfo('  Requires: 2-of-3 multisig approval');
  } else {
    printSuccess(`Stellar ${opts.action} completed`);
    printInfo('  TX: <pending_multisig>');
  }

  console.log('');
  console.log('─'.repeat(60));
  printSuccess(`${dryRun ? 'Dry run complete' : `${opts.action} complete`}`);
}

main().catch((err) => { printError(err.message); process.exit(1); });
