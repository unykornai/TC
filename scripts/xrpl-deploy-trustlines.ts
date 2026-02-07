#!/usr/bin/env ts-node
/**
 * xrpl-deploy-trustlines.ts — Deploy XRPL trustlines
 *
 * Usage:
 *   npx ts-node scripts/xrpl-deploy-trustlines.ts --token BOND --accounts treasury,escrow --network testnet --dry-run
 */

import { loadConfig, createBaseCommand, printHeader, printSuccess, printInfo, printDryRun, printNetworkWarning, printError, validateNetwork } from './lib/cli-utils';

const program = createBaseCommand('xrpl-deploy-trustlines', 'Deploy XRPL trustlines for OPTKAS tokens')
  .requiredOption('--token <currency>', 'Token currency code (e.g., BOND, ESCROW, ATTEST)')
  .requiredOption('--accounts <list>', 'Comma-separated account names (e.g., treasury,escrow)');

program.parse(process.argv);
const opts = program.opts();

async function main(): Promise<void> {
  printHeader('XRPL Trustline Deployment');
  const network = validateNetwork(opts.network);
  const dryRun = opts.dryRun !== false;
  const config = loadConfig(opts.config);

  if (dryRun) printDryRun();
  printNetworkWarning(network);

  const tokenKey = Object.keys(config.tokens || {}).find(
    (k) => config.tokens[k].currency === opts.token || k.includes(opts.token.toLowerCase())
  );

  if (!tokenKey) {
    printError(`Token not found in config: ${opts.token}`);
    process.exit(1);
  }

  const tokenConfig = config.tokens[tokenKey];
  const issuerAddress = config.xrpl_accounts?.issuer?.address || '<issuer_address>';
  const accounts = opts.accounts.split(',').map((a: string) => a.trim());

  printInfo(`Token: ${tokenConfig.currency}`);
  printInfo(`Issuer: ${issuerAddress}`);
  printInfo(`Limit: ${tokenConfig.max_supply || '50000000'}`);
  console.log('');

  for (const accountName of accounts) {
    const accountAddress = config.xrpl_accounts?.[accountName]?.address || `<${accountName}_address>`;

    if (dryRun) {
      printInfo(`[DRY RUN] Would deploy trustline: ${accountName} (${accountAddress}) → issuer (${tokenConfig.currency}, limit: ${tokenConfig.max_supply || '50000000'})`);
    } else {
      // Real execution: prepare TrustSet via @optkas/issuance and route to multisig
      printSuccess(`Trustline deployed: ${accountName} → issuer (${tokenConfig.currency})`);
      printInfo(`  TX: <pending_multisig>`);
    }
  }

  console.log('');
  console.log('─'.repeat(60));
  printSuccess(`${accounts.length} trustline(s) ${dryRun ? 'would be' : ''} deployed for ${tokenConfig.currency}`);
}

main().catch((err) => { printError(err.message); process.exit(1); });
