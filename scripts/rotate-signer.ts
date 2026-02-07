#!/usr/bin/env ts-node
/**
 * rotate-signer.ts — Prepare signer rotation transactions for XRPL and Stellar
 *
 * Generates UNSIGNED SignerListSet (XRPL) and SetOptions (Stellar) transactions
 * that replace an existing signer with a new one. Requires 2-of-3 multisig approval.
 *
 * Usage:
 *   npx ts-node scripts/rotate-signer.ts --role treasury --new-address rNewAddress... --network testnet --dry-run
 *   npx ts-node scripts/rotate-signer.ts --role compliance --new-stellar-key G... --network testnet --dry-run
 */

import { loadConfig, createBaseCommand, printHeader, printSuccess, printInfo, printDryRun, printNetworkWarning, printWarning, printError, validateNetwork } from './lib/cli-utils';

const program = createBaseCommand('rotate-signer', 'Prepare signer rotation transactions')
  .requiredOption('--role <role>', 'Signer role to rotate: treasury | compliance | trustee')
  .option('--new-address <address>', 'New XRPL signer address')
  .option('--new-stellar-key <key>', 'New Stellar signer public key')
  .option('--notice-confirmed', 'Confirm that 30-day notice period has been observed');

program.parse(process.argv);
const opts = program.opts();

async function main(): Promise<void> {
  printHeader('Signer Rotation');
  const network = validateNetwork(opts.network);
  const dryRun = opts.dryRun !== false;
  const config = loadConfig(opts.config);

  if (dryRun) printDryRun();
  printNetworkWarning(network);

  const validRoles = ['treasury', 'compliance', 'trustee'];
  if (!validRoles.includes(opts.role)) {
    printError(`Invalid role: ${opts.role}. Must be one of: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  // ── Pre-flight checks ──

  const rotationConfig = config.governance?.signer_rotation;
  if (!rotationConfig) {
    printError('Signer rotation policy not found in config.');
    process.exit(1);
  }

  if (!opts.noticeConfirmed) {
    printWarning(`Signer rotation requires ${rotationConfig.notice_period_days}-day notice period.`);
    printWarning('Re-run with --notice-confirmed to acknowledge.');
    printInfo('');
    printInfo('Before proceeding, ensure:');
    printInfo('  1. Written notice given to all signers');
    printInfo(`  2. ${rotationConfig.notice_period_days} days have elapsed since notice`);
    printInfo(`  3. ${rotationConfig.requires_approval_of} of ${config.governance.multisig.total_signers} signers have approved the rotation`);
    printInfo('  4. New signer has completed key ceremony and HSM provisioning');
    printInfo('  5. New signer public keys are verified and recorded');
    process.exit(0);
  }

  console.log('');
  printInfo(`Rotating signer: ${opts.role}`);
  printInfo(`Network: ${network}`);
  console.log('');

  // ── XRPL Signer Rotation ──

  if (opts.newAddress) {
    printInfo('═══ XRPL Signer Rotation ═══');
    printInfo(`  New address: ${opts.newAddress}`);
    console.log('');

    // Prepare SignerListSet for each XRPL account
    const xrplAccounts = Object.entries(config.xrpl_accounts || {});
    for (const [accountRole, acct] of xrplAccounts) {
      const address = (acct as any).address;
      if (!address || address === 'null') {
        printWarning(`  Skipping ${accountRole} — address not configured`);
        continue;
      }

      printInfo(`  Preparing SignerListSet for: ${accountRole}`);

      // Build signer entries with the new signer replacing the old
      const signerEntries = config.governance.multisig.roles.map((signer: any) => {
        if (signer.id === opts.role) {
          return {
            SignerEntry: {
              Account: opts.newAddress,
              SignerWeight: 1,
            },
          };
        }
        return {
          SignerEntry: {
            Account: `<${signer.id}_current_address>`,
            SignerWeight: 1,
          },
        };
      });

      const tx = {
        TransactionType: 'SignerListSet',
        Account: address,
        SignerQuorum: config.governance.multisig.threshold,
        SignerEntries: signerEntries,
      };

      if (dryRun) {
        printInfo(`    [DRY RUN] Would submit SignerListSet to ${accountRole} (${address})`);
        printInfo(`    New ${opts.role} signer: ${opts.newAddress}`);
        printInfo(`    Quorum: ${config.governance.multisig.threshold}`);
      } else {
        printInfo(`    Transaction prepared (UNSIGNED):`);
        printInfo(`    ${JSON.stringify(tx, null, 2)}`);
      }

      console.log('');
    }
  }

  // ── Stellar Signer Rotation ──

  if (opts.newStellarKey) {
    printInfo('═══ Stellar Signer Rotation ═══');
    printInfo(`  New key: ${opts.newStellarKey}`);
    console.log('');

    const stellarAccounts = Object.entries(config.stellar_accounts || {});
    for (const [accountRole, acct] of stellarAccounts) {
      const pubKey = (acct as any).public_key;
      if (!pubKey || pubKey === 'null') {
        printWarning(`  Skipping ${accountRole} — public key not configured`);
        continue;
      }

      printInfo(`  Preparing SetOptions for: ${accountRole}`);

      // Two operations: remove old signer, add new signer
      const ops = [
        {
          type: 'setOptions',
          signer: { ed25519PublicKey: `<${opts.role}_current_key>`, weight: 0 }, // Remove old
        },
        {
          type: 'setOptions',
          signer: { ed25519PublicKey: opts.newStellarKey, weight: 1 }, // Add new
        },
      ];

      if (dryRun) {
        printInfo(`    [DRY RUN] Would submit SetOptions to ${accountRole} (${pubKey.substring(0, 12)}...)`);
        printInfo(`    Remove: <${opts.role}_current_key> (weight → 0)`);
        printInfo(`    Add: ${opts.newStellarKey} (weight → 1)`);
      } else {
        printInfo(`    Operations prepared (UNSIGNED):`);
        printInfo(`    ${JSON.stringify(ops, null, 2)}`);
      }

      console.log('');
    }
  }

  // ── Summary ──

  console.log('');
  printInfo('═══ Rotation Checklist ═══');
  printInfo('  □ Verify new signer can sign test transactions on testnet');
  printInfo('  □ Update platform-config.yaml with new signer identifier');
  printInfo('  □ Record rotation event in audit log');
  printInfo('  □ Attest rotation on XRPL and Stellar');
  printInfo('  □ Notify all signers of rotation completion');
  printInfo('  □ Update HSM access policies');
  console.log('');

  if (dryRun) {
    printDryRun();
    printInfo('Re-run without --dry-run to generate final unsigned transactions.');
  } else {
    printSuccess('Signer rotation transactions prepared (UNSIGNED).');
    printWarning('Route to existing signers for 2-of-3 multisig approval.');
  }
}

main().catch((err) => {
  printError(err.message);
  process.exit(1);
});
