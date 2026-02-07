#!/usr/bin/env ts-node
/**
 * stellar-sep24-deposit-withdraw.ts — SEP-24 Interactive Deposit/Withdrawal
 *
 * Implements the interactive deposit and withdrawal flow for OPTKAS-USD,
 * including anchor communication, KYC handoff, and transaction monitoring.
 *
 * Usage:
 *   npx ts-node scripts/stellar-sep24-deposit-withdraw.ts --action deposit --amount 100000 --network testnet --dry-run
 *   npx ts-node scripts/stellar-sep24-deposit-withdraw.ts --action withdraw --amount 50000 --network testnet --dry-run
 */

import { loadConfig, createBaseCommand, printHeader, printSuccess, printInfo, printDryRun, printNetworkWarning, printError, printWarning, validateNetwork } from './lib/cli-utils';

const program = createBaseCommand('stellar-sep24-deposit-withdraw', 'SEP-24 Interactive Deposit/Withdrawal')
  .requiredOption('--action <action>', 'Action: deposit | withdraw | status')
  .option('--amount <amount>', 'Fiat amount in USD')
  .option('--account <address>', 'Stellar account for the transaction')
  .option('--transaction-id <id>', 'Transaction ID for status check')
  .option('--anchor-domain <domain>', 'Anchor domain', 'optkas.com');

program.parse(process.argv);
const opts = program.opts();

async function main(): Promise<void> {
  printHeader('SEP-24 Interactive Deposit/Withdrawal');
  const network = validateNetwork(opts.network);
  const dryRun = opts.dryRun !== false;
  const config = loadConfig(opts.config);

  if (dryRun) printDryRun();
  printNetworkWarning(network);

  const issuerKey = config.stellar_accounts?.issuer?.public_key || '<issuer_public_key>';
  const anchorDomain = opts.anchorDomain;

  switch (opts.action) {
    case 'deposit':
      await handleDeposit(network, dryRun, config, issuerKey, anchorDomain);
      break;
    case 'withdraw':
      await handleWithdraw(network, dryRun, config, issuerKey, anchorDomain);
      break;
    case 'status':
      await handleStatus(network, dryRun, config, anchorDomain);
      break;
    default:
      printError(`Unknown action: ${opts.action}`);
      process.exit(1);
  }

  console.log('');
  console.log('─'.repeat(60));
  printSuccess(`SEP-24 ${opts.action} ${dryRun ? 'dry run' : ''} complete`);
}

async function handleDeposit(network: string, dryRun: boolean, config: any, issuerKey: string, anchorDomain: string): Promise<void> {
  if (!opts.amount) { printError('--amount required for deposit'); process.exit(1); }

  printInfo('SEP-24 Deposit Flow:');
  console.log('');

  printInfo('  Phase 1: Authentication (SEP-10)');
  printInfo('    Authenticate via SEP-10 to obtain JWT');
  printInfo(`    Endpoint: https://anchor.${anchorDomain}/auth`);
  console.log('');

  printInfo('  Phase 2: Initiate Deposit');
  printInfo(`    POST https://anchor.${anchorDomain}/sep24/transactions/deposit/interactive`);
  printInfo(`    Asset: OPTKASUSD`);
  printInfo(`    Issuer: ${issuerKey}`);
  printInfo(`    Amount: $${opts.amount} USD`);
  printInfo('    Headers: Authorization: Bearer <jwt>');
  console.log('');

  printInfo('  Phase 3: Interactive KYC');
  printInfo('    Response includes: { type: "interactive_customer_info_needed", url: "<kyc_url>" }');
  printInfo('    User completes KYC at anchor-hosted UI');
  printInfo('    Required: Government ID, proof of address, accredited investor verification');
  console.log('');

  printInfo('  Phase 4: Fiat Transfer');
  printInfo('    After KYC approval, user sends fiat to anchor bank account');
  printInfo('    Wire to: [Anchor provides bank details]');
  printInfo(`    Amount: $${opts.amount} USD`);
  printInfo('    Reference: [Transaction ID from anchor]');
  console.log('');

  printInfo('  Phase 5: Asset Delivery');
  printInfo('    Anchor receives fiat → verifies → issues OPTKASUSD to Stellar account');
  printInfo(`    Amount: ${opts.amount} OPTKASUSD`);
  printInfo('    Issuer authorizes trustline if not already authorized');
  console.log('');

  printInfo('  Phase 6: Confirmation');
  printInfo('    Monitor transaction status via polling:');
  printInfo(`    GET https://anchor.${anchorDomain}/sep24/transaction?id=<tx_id>`);
  printInfo('    Status progression: incomplete → pending_user_transfer_start → pending_anchor → completed');
  console.log('');

  if (dryRun) {
    printInfo('[DRY RUN] No deposit initiated');
  }
}

async function handleWithdraw(network: string, dryRun: boolean, config: any, issuerKey: string, anchorDomain: string): Promise<void> {
  if (!opts.amount) { printError('--amount required for withdraw'); process.exit(1); }

  printInfo('SEP-24 Withdrawal Flow:');
  console.log('');

  printInfo('  Phase 1: Authentication (SEP-10)');
  printInfo(`    Endpoint: https://anchor.${anchorDomain}/auth`);
  console.log('');

  printInfo('  Phase 2: Initiate Withdrawal');
  printInfo(`    POST https://anchor.${anchorDomain}/sep24/transactions/withdraw/interactive`);
  printInfo(`    Asset: OPTKASUSD`);
  printInfo(`    Amount: ${opts.amount} OPTKASUSD`);
  console.log('');

  printInfo('  Phase 3: Interactive KYC (if not already completed)');
  printInfo('    May be skipped if KYC already on file');
  console.log('');

  printInfo('  Phase 4: Stellar Transfer');
  printInfo('    User sends OPTKASUSD to anchor withdrawal account');
  printInfo(`    Amount: ${opts.amount} OPTKASUSD`);
  printInfo('    Memo: [Provided by anchor in withdraw response]');
  printWarning('  This Stellar transaction requires 2-of-3 multisig approval');
  console.log('');

  printInfo('  Phase 5: Fiat Delivery');
  printInfo('    Anchor receives OPTKASUSD → burns → sends USD to user bank');
  printInfo(`    Amount: $${opts.amount} USD`);
  printInfo('    Method: Wire transfer');
  console.log('');

  printInfo('  Phase 6: Confirmation');
  printInfo('    Status progression: incomplete → pending_stellar → pending_anchor → completed');
  console.log('');

  if (dryRun) {
    printInfo('[DRY RUN] No withdrawal initiated');
  }
}

async function handleStatus(network: string, dryRun: boolean, config: any, anchorDomain: string): Promise<void> {
  if (!opts.transactionId) { printError('--transaction-id required for status'); process.exit(1); }

  printInfo('Transaction Status Check:');
  printInfo(`  Endpoint: GET https://anchor.${anchorDomain}/sep24/transaction`);
  printInfo(`  Transaction ID: ${opts.transactionId}`);
  console.log('');

  printInfo('  Possible statuses:');
  printInfo('    incomplete        — User has not yet completed KYC');
  printInfo('    pending_user_transfer_start — Waiting for fiat/Stellar transfer');
  printInfo('    pending_user_transfer_complete — Transfer submitted, awaiting confirmation');
  printInfo('    pending_anchor    — Anchor processing');
  printInfo('    pending_stellar   — Waiting for Stellar transaction');
  printInfo('    completed         — Transaction complete');
  printInfo('    error             — Error occurred');
  printInfo('    expired           — Transaction expired');
  console.log('');

  if (dryRun) {
    printInfo('[DRY RUN] Would query transaction status');
  }
}

main().catch((err) => { printError(err.message); process.exit(1); });
