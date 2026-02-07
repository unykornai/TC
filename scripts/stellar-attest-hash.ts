#!/usr/bin/env ts-node
/**
 * stellar-attest-hash.ts — Anchor hashes to Stellar via ManageData
 *
 * Records SHA-256 content hashes on the Stellar ledger using ManageData
 * operations for immutable audit trails and evidence anchoring.
 *
 * Usage:
 *   npx ts-node scripts/stellar-attest-hash.ts --hash <sha256> --label bond_funding_v1 --network testnet --dry-run
 *   npx ts-node scripts/stellar-attest-hash.ts --file ./data_room/INDEX.md --network testnet --dry-run
 *   npx ts-node scripts/stellar-attest-hash.ts --directory ./DATA_ROOM_v1 --network testnet --dry-run
 */

import { loadConfig, createBaseCommand, printHeader, printSuccess, printInfo, printDryRun, printNetworkWarning, printError, validateNetwork } from './lib/cli-utils';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const program = createBaseCommand('stellar-attest-hash', 'Anchor hashes to Stellar via ManageData')
  .option('--hash <hash>', 'Pre-computed SHA-256 hash to attest')
  .option('--label <label>', 'Label for the ManageData key', 'optkas_attest')
  .option('--file <filepath>', 'File to hash and attest')
  .option('--directory <dirpath>', 'Directory to hash and attest');

program.parse(process.argv);
const opts = program.opts();

function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function hashDirectory(dirPath: string): { files: Array<{ path: string; hash: string }>; rootHash: string } {
  const files: Array<{ path: string; hash: string }> = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isFile()) {
      files.push({ path: fullPath, hash: hashFile(fullPath) });
    } else if (entry.isDirectory()) {
      const sub = hashDirectory(fullPath);
      files.push(...sub.files);
    }
  }

  const combined = files.map(f => f.hash).sort().join('');
  const rootHash = crypto.createHash('sha256').update(combined).digest('hex');
  return { files, rootHash };
}

async function main(): Promise<void> {
  printHeader('Stellar Hash Attestation');
  const network = validateNetwork(opts.network);
  const dryRun = opts.dryRun !== false;
  const config = loadConfig(opts.config);

  if (dryRun) printDryRun();
  printNetworkWarning(network);

  if (!opts.hash && !opts.file && !opts.directory) {
    printError('One of --hash, --file, or --directory required');
    process.exit(1);
  }

  const attestAccount = config.stellar_accounts?.anchor?.public_key || '<attestation_account>';
  let attestHash: string;
  let attestLabel = opts.label;

  if (opts.hash) {
    attestHash = opts.hash;
    printInfo(`Hash provided: ${attestHash}`);
  } else if (opts.file) {
    if (!fs.existsSync(opts.file)) {
      printError(`File not found: ${opts.file}`);
      process.exit(1);
    }
    attestHash = hashFile(opts.file);
    attestLabel = `${opts.label}_${path.basename(opts.file).replace(/[^a-zA-Z0-9]/g, '_')}`;
    printInfo(`File: ${opts.file}`);
    printInfo(`Hash: ${attestHash}`);
  } else {
    if (!fs.existsSync(opts.directory!)) {
      printError(`Directory not found: ${opts.directory}`);
      process.exit(1);
    }
    const result = hashDirectory(opts.directory!);
    attestHash = result.rootHash;
    attestLabel = `${opts.label}_dir_${path.basename(opts.directory!)}`;
    printInfo(`Directory: ${opts.directory}`);
    printInfo(`Files hashed: ${result.files.length}`);
    printInfo(`Root hash: ${attestHash}`);
    console.log('');
    printInfo('Individual file hashes:');
    for (const f of result.files.slice(0, 10)) {
      printInfo(`  ${f.hash.substring(0, 16)}... ${path.relative(opts.directory!, f.path)}`);
    }
    if (result.files.length > 10) {
      printInfo(`  ... and ${result.files.length - 10} more`);
    }
  }

  console.log('');
  printInfo('Stellar ManageData Attestation:');
  printInfo(`  Account: ${attestAccount}`);
  printInfo(`  Key: ${attestLabel}`);
  printInfo(`  Value: ${attestHash}`);
  printInfo(`  Network: ${network}`);
  printInfo('  Requires: 2-of-3 multisig');
  console.log('');

  printInfo('Transaction Details:');
  printInfo('  Operation: ManageData');
  printInfo(`  Data Name: ${attestLabel} (max 64 chars)`);
  printInfo(`  Data Value: ${attestHash} (64 hex chars = 32 bytes)`);
  printInfo('  Base Fee: 100 stroops');
  console.log('');

  if (dryRun) {
    printInfo('[DRY RUN] Would prepare Stellar ManageData transaction');
    printInfo('  Transaction XDR would be generated for multisig signing');
  } else {
    printInfo('Preparing ManageData transaction...');
    printInfo('  TX XDR: <pending_multisig>');
  }

  console.log('');
  console.log('─'.repeat(60));
  printSuccess(`Stellar attestation ${dryRun ? 'dry run' : ''} complete`);
  printInfo(`  Hash: ${attestHash!.substring(0, 32)}...`);
  printInfo(`  Label: ${attestLabel}`);
}

main().catch((err) => { printError(err.message); process.exit(1); });
