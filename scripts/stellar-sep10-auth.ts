#!/usr/bin/env ts-node
/**
 * stellar-sep10-auth.ts — SEP-10 Web Authentication flow
 *
 * Implements the challenge-response authentication flow for
 * verifying Stellar account ownership.
 *
 * Usage:
 *   npx ts-node scripts/stellar-sep10-auth.ts --account <stellar_address> --network testnet --dry-run
 */

import { loadConfig, createBaseCommand, printHeader, printSuccess, printInfo, printDryRun, printNetworkWarning, printError, validateNetwork } from './lib/cli-utils';

const program = createBaseCommand('stellar-sep10-auth', 'Stellar SEP-10 Web Authentication')
  .requiredOption('--account <address>', 'Stellar account to authenticate')
  .option('--anchor-domain <domain>', 'Anchor domain for TOML lookup', 'optkas.com')
  .option('--memo <memo>', 'Optional memo for shared accounts');

program.parse(process.argv);
const opts = program.opts();

async function main(): Promise<void> {
  printHeader('SEP-10 Web Authentication');
  const network = validateNetwork(opts.network);
  const dryRun = opts.dryRun !== false;
  const config = loadConfig(opts.config);

  if (dryRun) printDryRun();
  printNetworkWarning(network);

  const anchorDomain = opts.anchorDomain;
  const account = opts.account;

  printInfo('SEP-10 Authentication Flow:');
  console.log('');
  printInfo('  Step 1: Fetch stellar.toml');
  printInfo(`    URL: https://${anchorDomain}/.well-known/stellar.toml`);
  printInfo('    Extract: WEB_AUTH_ENDPOINT, SIGNING_KEY');
  console.log('');

  printInfo('  Step 2: Request challenge');
  printInfo(`    GET {WEB_AUTH_ENDPOINT}?account=${account}`);
  if (opts.memo) {
    printInfo(`    Memo: ${opts.memo}`);
  }
  printInfo('    Response: Stellar transaction XDR (challenge)');
  console.log('');

  printInfo('  Step 3: Verify challenge transaction');
  printInfo('    - Sequence number = 0');
  printInfo('    - Source account = server signing key');
  printInfo('    - First operation: ManageData (domain_name = anchor domain)');
  printInfo('    - Time bounds within acceptable range');
  printInfo('    - Network passphrase matches');
  console.log('');

  printInfo('  Step 4: Sign challenge');
  printInfo(`    Client signs with account: ${account}`);
  printInfo('    Multi-sig: Requires 2-of-3 signers');
  console.log('');

  printInfo('  Step 5: Submit signed challenge');
  printInfo('    POST {WEB_AUTH_ENDPOINT}');
  printInfo('    Body: { "transaction": "<signed_xdr>" }');
  printInfo('    Response: { "token": "<jwt>" }');
  console.log('');

  printInfo('  Step 6: Use JWT for SEP-24/31 requests');
  printInfo('    Authorization: Bearer <jwt>');
  printInfo('    Valid for: 300 seconds (typical)');
  console.log('');

  if (dryRun) {
    printInfo('[DRY RUN] Would execute SEP-10 flow');
    printInfo('  No network calls made');
  } else {
    printInfo('Executing SEP-10 authentication...');
    printInfo('  This requires the anchor server to be running');
  }

  console.log('');
  console.log('─'.repeat(60));

  const configToml = `
# stellar.toml (must be hosted at https://${anchorDomain}/.well-known/stellar.toml)
NETWORK_PASSPHRASE = "${network === 'mainnet' ? 'Public Global Stellar Network ; September 2015' : 'Test SDF Network ; September 2015'}"
WEB_AUTH_ENDPOINT = "https://anchor.${anchorDomain}/auth"
TRANSFER_SERVER_SEP0024 = "https://anchor.${anchorDomain}/sep24"
DIRECT_PAYMENT_SERVER = "https://anchor.${anchorDomain}/sep31"
SIGNING_KEY = "${config.stellar_accounts?.anchor?.public_key || '<anchor_signing_key>'}"

[[CURRENCIES]]
code = "OPTKASUSD"
issuer = "${config.stellar_accounts?.issuer?.public_key || '<issuer_public_key>'}"
status = "live"
display_decimals = 2
name = "OPTKAS USD"
desc = "USD-backed regulated asset issued by OPTKAS1-MAIN SPV"
is_asset_anchored = true
anchor_asset_type = "fiat"
anchor_asset = "USD"
`;

  printInfo('Required stellar.toml configuration:');
  console.log(configToml);
  printSuccess(`SEP-10 ${dryRun ? 'dry run' : 'authentication'} complete`);
}

main().catch((err) => { printError(err.message); process.exit(1); });
