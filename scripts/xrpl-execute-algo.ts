#!/usr/bin/env ts-node
/**
 * xrpl-execute-algo.ts — Execute algorithmic trade on XRPL DEX
 *
 * Usage:
 *   npx ts-node scripts/xrpl-execute-algo.ts --strategy twap --pair BOND/XRP --side buy --amount 10000 --slices 10 --network testnet --dry-run
 */

import { loadConfig, createBaseCommand, printHeader, printSuccess, printInfo, printDryRun, printNetworkWarning, printError, validateNetwork } from './lib/cli-utils';

const program = createBaseCommand('xrpl-execute-algo', 'Execute algorithmic trade on XRPL DEX')
  .requiredOption('--strategy <name>', 'Strategy: twap | vwap | limit')
  .requiredOption('--pair <pair>', 'Trading pair (e.g., BOND/XRP)')
  .requiredOption('--side <side>', 'Trade side: buy | sell')
  .requiredOption('--amount <amount>', 'Total order amount')
  .option('--slices <n>', 'Number of TWAP slices', '10')
  .option('--price <price>', 'Limit price (for limit orders)');

program.parse(process.argv);
const opts = program.opts();

async function main(): Promise<void> {
  printHeader('XRPL Algorithmic Trading');
  const network = validateNetwork(opts.network);
  const dryRun = opts.dryRun !== false;
  const config = loadConfig(opts.config);

  if (dryRun) printDryRun();
  printNetworkWarning(network);

  if (!config.trading?.enabled) {
    printError('Trading is DISABLED in platform-config.yaml');
    printInfo('Enable trading in config and obtain multisig approval.');
    process.exit(1);
  }

  const [base, quote] = opts.pair.split('/');
  const tradingAddress = config.xrpl_accounts?.trading?.address || '<trading_address>';
  const slices = parseInt(opts.slices);
  const totalAmount = parseFloat(opts.amount);
  const sliceAmount = (totalAmount / slices).toFixed(6);

  // Risk checks
  const risk = config.trading.risk || {};
  if (totalAmount > (risk.max_daily_volume || Infinity)) {
    printError(`Amount ${totalAmount} exceeds daily volume limit ${risk.max_daily_volume}`);
    process.exit(1);
  }

  printInfo(`Algorithmic Trade:`);
  printInfo(`  Strategy: ${opts.strategy.toUpperCase()}`);
  printInfo(`  Pair: ${base}/${quote}`);
  printInfo(`  Side: ${opts.side}`);
  printInfo(`  Total: ${opts.amount}`);
  printInfo(`  Slices: ${slices} × ${sliceAmount}`);
  if (opts.price) printInfo(`  Price: ${opts.price}`);
  printInfo(`  Account: trading (${tradingAddress})`);
  printInfo(`  Network: ${network}`);
  console.log('');

  printInfo(`Risk Limits:`);
  printInfo(`  Max daily volume: ${risk.max_daily_volume || 'N/A'}`);
  printInfo(`  Stop loss: ${risk.stop_loss_pct || 'N/A'}%`);
  printInfo(`  Circuit breaker: ${risk.circuit_breaker_pct || 'N/A'}%`);
  console.log('');

  for (let i = 0; i < slices; i++) {
    if (dryRun) {
      printInfo(`  [DRY RUN] Slice ${i + 1}/${slices}: ${opts.side} ${sliceAmount} ${base}`);
    } else {
      printSuccess(`  Slice ${i + 1}/${slices}: prepared → <pending_multisig>`);
    }
  }

  console.log('');
  console.log('─'.repeat(60));
  printSuccess(`${slices} slices ${dryRun ? 'would be' : ''} submitted for multisig approval`);
}

main().catch((err) => { printError(err.message); process.exit(1); });
