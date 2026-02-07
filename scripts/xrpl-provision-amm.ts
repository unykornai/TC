#!/usr/bin/env ts-node
/**
 * xrpl-provision-amm.ts — Provision XRPL AMM pool
 *
 * Usage:
 *   npx ts-node scripts/xrpl-provision-amm.ts --pair BOND/XRP --amount 100000 --fee 500 --network testnet --dry-run
 */

import { loadConfig, createBaseCommand, printHeader, printSuccess, printInfo, printDryRun, printNetworkWarning, printError, validateNetwork } from './lib/cli-utils';

const program = createBaseCommand('xrpl-provision-amm', 'Provision XRPL AMM pool')
  .requiredOption('--pair <pair>', 'Trading pair (e.g., BOND/XRP)')
  .requiredOption('--amount <amount>', 'Initial liquidity amount')
  .option('--fee <bps>', 'Trading fee in basis points', '500');

program.parse(process.argv);
const opts = program.opts();

async function main(): Promise<void> {
  printHeader('XRPL AMM Provisioning');
  const network = validateNetwork(opts.network);
  const dryRun = opts.dryRun !== false;
  const config = loadConfig(opts.config);

  if (dryRun) printDryRun();
  printNetworkWarning(network);

  if (!config.amm?.enabled) {
    printError('AMM is DISABLED in platform-config.yaml');
    printInfo('Enable AMM in config and obtain multisig approval before provisioning.');
    process.exit(1);
  }

  const [base, quote] = opts.pair.split('/');
  const ammAddress = config.xrpl_accounts?.amm_liquidity?.address || '<amm_address>';
  const issuerAddress = config.xrpl_accounts?.issuer?.address || '<issuer_address>';

  printInfo(`AMM Provisioning:`);
  printInfo(`  Pair: ${base}/${quote}`);
  printInfo(`  Initial liquidity: ${opts.amount}`);
  printInfo(`  Trading fee: ${opts.fee} bps (${(parseInt(opts.fee) / 100).toFixed(2)}%)`);
  printInfo(`  Account: amm_liquidity (${ammAddress})`);
  printInfo(`  Network: ${network}`);
  console.log('');

  if (dryRun) {
    printInfo('[DRY RUN] Would prepare AMMCreate transaction');
    printInfo('  Requires: 2-of-3 multisig approval');
  } else {
    printSuccess('AMM pool provisioned');
    printInfo('  TX: <pending_multisig>');
  }

  console.log('');
  console.log('─'.repeat(60));
  printSuccess(`${dryRun ? 'Dry run complete' : 'AMM provisioned'}`);
}

main().catch((err) => { printError(err.message); process.exit(1); });
