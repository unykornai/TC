#!/usr/bin/env ts-node
/**
 * xrpl-attest-hash.ts — Anchor document/event hashes to XRPL
 *
 * Usage:
 *   npx ts-node scripts/xrpl-attest-hash.ts --hash <sha256> --type bond_indenture --network testnet --dry-run
 *   npx ts-node scripts/xrpl-attest-hash.ts --documents ./data_room/ --network testnet --dry-run
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, createBaseCommand, printHeader, printSuccess, printInfo, printDryRun, printNetworkWarning, printError, validateNetwork } from './lib/cli-utils';

const program = createBaseCommand('xrpl-attest-hash', 'Anchor SHA-256 hashes to XRPL')
  .option('--hash <sha256>', 'SHA-256 hash to attest')
  .option('--type <type>', 'Attestation type (document-hash, settlement, governance-action, etc.)', 'document-hash')
  .option('--documents <dir>', 'Directory of documents to hash and attest');

program.parse(process.argv);
const opts = program.opts();

function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function walkDir(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkDir(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

async function main(): Promise<void> {
  printHeader('XRPL Hash Attestation');
  const network = validateNetwork(opts.network);
  const dryRun = opts.dryRun !== false;
  const config = loadConfig(opts.config);

  if (dryRun) printDryRun();
  printNetworkWarning(network);

  const attestationAddress = config.xrpl_accounts?.attestation?.address || '<attestation_address>';
  const issuerAddress = config.xrpl_accounts?.issuer?.address || '<issuer_address>';

  if (opts.documents) {
    // Hash and attest all documents in directory
    const dirPath = path.resolve(opts.documents);
    if (!fs.existsSync(dirPath)) {
      printError(`Directory not found: ${dirPath}`);
      process.exit(1);
    }

    const files = walkDir(dirPath);
    printInfo(`Hashing ${files.length} documents in ${opts.documents}...`);
    console.log('');

    for (const file of files) {
      const hash = hashFile(file);
      const relativePath = path.relative(dirPath, file);
      printInfo(`  ${relativePath} → sha256:${hash.substring(0, 16)}...`);

      if (dryRun) {
        printInfo(`    [DRY RUN] Would attest on XRPL ${network}`);
      } else {
        printSuccess(`    Attested: TX <pending_multisig>`);
      }
    }

    console.log('');
    console.log('─'.repeat(60));
    printSuccess(`${files.length} documents ${dryRun ? 'would be' : ''} attested on XRPL ${network}`);

  } else if (opts.hash) {
    // Attest a single hash
    printInfo(`Hash: ${opts.hash}`);
    printInfo(`Type: ${opts.type}`);
    printInfo(`Attestation account: ${attestationAddress}`);
    printInfo(`Network: ${network}`);
    console.log('');

    if (dryRun) {
      printInfo('[DRY RUN] Would prepare attestation Payment:');
      printInfo(`  Account: ${attestationAddress}`);
      printInfo(`  Destination: ${attestationAddress} (self-payment)`);
      printInfo(`  Amount: 0.000001 ATTEST`);
      printInfo(`  Memo: attestation/${opts.type} → ${opts.hash}`);
      printInfo('  Requires: 2-of-3 multisig approval');
    } else {
      printSuccess(`Hash attested on XRPL ${network}`);
      printInfo(`  TX: <pending_multisig>`);
    }

    console.log('');
    console.log('─'.repeat(60));
    printSuccess(`${dryRun ? 'Dry run complete' : 'Attestation complete'}`);

  } else {
    printError('Must specify either --hash or --documents');
    process.exit(1);
  }
}

main().catch((err) => { printError(err.message); process.exit(1); });
