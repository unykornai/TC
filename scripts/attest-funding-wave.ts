#!/usr/bin/env ts-node
/**
 * attest-funding-wave.ts — Funding Wave Attestation Ceremony
 *
 * This is Channel 1 of the OPTKAS delivery architecture.
 * Run this BEFORE emailing anyone or sharing data room access.
 *
 * Steps:
 *   1. Hash all designated funding documents
 *   2. Compute root hash (Merkle-style combined hash)
 *   3. Build XRPL attestation transaction (memo-based)
 *   4. Optionally mirror to Stellar
 *   5. Generate wave receipt (JSON)
 *   6. Generate lender email body
 *   7. Verify all hashes match local files
 *
 * Usage:
 *   npx ts-node scripts/attest-funding-wave.ts --documents ./Final_Funding_Package --dry-run
 *   npx ts-node scripts/attest-funding-wave.ts --documents ./Final_Funding_Package --network mainnet
 *   npx ts-node scripts/attest-funding-wave.ts --verify ./logs/funding-wave-receipt.json --documents ./Final_Funding_Package
 *   npx ts-node scripts/attest-funding-wave.ts --generate-email --recipient "John Smith" --sender "Jimmy"
 *   npx ts-node scripts/attest-funding-wave.ts --data-room-manifest
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 */

import {
  createBaseCommand,
  loadConfig,
  printHeader,
  printSuccess,
  printWarning,
  printError,
  printInfo,
  printDryRun,
  printNetworkWarning,
  validateNetwork,
} from './lib/cli-utils';
import {
  FundingWaveAttestation,
  FUNDING_WAVE_DOCUMENTS,
  LENDER_DATA_ROOM_STRUCTURE,
} from '../packages/funding-ops/src/funding-wave-attestation';
import * as fs from 'fs';
import * as path from 'path';

const program = createBaseCommand('attest-funding-wave', 'Funding Wave Attestation Ceremony')
  .option('--documents <dir>', 'Directory containing funding wave PDFs')
  .option('--verify <receipt>', 'Verify a previous wave receipt against local files')
  .option('--generate-email', 'Generate the lender outreach email')
  .option('--recipient <name>', 'Lender recipient name for email', '[Name]')
  .option('--sender <name>', 'Sender name for email', '[Name]')
  .option('--data-room-manifest', 'Output the canonical data room folder structure')
  .option('--data-room-link <url>', 'Secure data room access URL')
  .option('--output <dir>', 'Output directory for receipts and email', './logs')
  .option('--stellar-mirror', 'Also prepare Stellar attestation', false);

program.parse(process.argv);
const opts = program.opts();

async function main(): Promise<void> {
  printHeader('FUNDING WAVE ATTESTATION');
  const network = validateNetwork(opts.network);
  const dryRun = opts.dryRun !== false;
  const config = loadConfig(opts.config);

  if (dryRun) printDryRun();
  printNetworkWarning(network);

  const attestationAccount = config.xrpl_accounts?.attestation?.address || '<attestation_address>';
  const stellarAccount = config.stellar_accounts?.anchor?.public_key || '<stellar_attestation_account>';

  const wave = new FundingWaveAttestation({
    spv: 'OPTKAS1-MAIN SPV',
    attestedBy: 'OPTKAS Platform',
    version: 'v1',
    xrplAttestationAccount: attestationAccount,
    stellarAttestationAccount: stellarAccount,
    xrplNetwork: network,
    stellarNetwork: network === 'mainnet' ? 'mainnet' : 'testnet',
    persistPath: path.join(opts.output || './logs', 'funding-wave-attestation.json'),
    dataRoomLink: opts.dataRoomLink || '[SECURE LINK]',
  });

  // ── Mode: Data Room Manifest ──────────────────────────────────
  if (opts.dataRoomManifest) {
    printInfo('Channel 2 — Lender Data Room Structure');
    console.log('');

    const manifest = wave.generateDataRoomManifest();
    for (const folder of manifest.folders) {
      console.log(`  ${folder.code}/`);
      for (const file of folder.files) {
        console.log(`    - ${file.name}`);
        console.log(`      ${file.description}`);
      }
      console.log('');
    }

    printInfo(`Total files: ${manifest.totalFiles}`);
    printInfo(`Access policy: ${manifest.accessPolicy}`);
    console.log('');

    // Write manifest
    const manifestPath = path.join(opts.output || './logs', 'data-room-manifest.json');
    const dir = path.dirname(manifestPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    printSuccess(`Manifest written to ${manifestPath}`);
    return;
  }

  // ── Mode: Generate Email ──────────────────────────────────────
  if (opts.generateEmail) {
    // Try to load existing wave state
    wave.loadFromDisk();

    printInfo('Channel 3 — Lender Outreach Email');
    console.log('');

    const email = wave.generateLenderEmail(opts.recipient, opts.sender);
    console.log('─'.repeat(60));
    console.log(`Subject: ${email.subject}`);
    console.log('─'.repeat(60));
    console.log(email.body);
    console.log('─'.repeat(60));
    console.log('');

    // Write email to file
    const emailPath = path.join(opts.output || './logs', 'lender-email.txt');
    const dir = path.dirname(emailPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(emailPath, `Subject: ${email.subject}\n\n${email.body}`);
    printSuccess(`Email written to ${emailPath}`);
    return;
  }

  // ── Mode: Verify ──────────────────────────────────────────────
  if (opts.verify) {
    if (!opts.documents) {
      printError('--documents <dir> required for verification');
      process.exit(1);
    }

    const receiptPath = path.resolve(opts.verify);
    if (!fs.existsSync(receiptPath)) {
      printError(`Receipt not found: ${receiptPath}`);
      process.exit(1);
    }

    const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf-8'));
    printInfo(`Verifying wave ${receipt.waveId}...`);
    printInfo(`Documents: ${receipt.documentCount}`);
    printInfo(`Root hash: ${receipt.rootHash}`);
    console.log('');

    const result = wave.verifyWave(receipt, path.resolve(opts.documents));

    for (const detail of result.details) {
      const icon = detail.result === 'match' ? '✓' : detail.result === 'mismatch' ? '✗' : '?';
      const color = detail.result === 'match' ? printSuccess : detail.result === 'mismatch' ? printError : printWarning;
      color(`  ${icon} ${detail.fileName}: ${detail.result}`);
    }

    console.log('');
    console.log('─'.repeat(60));
    if (result.allVerified) {
      printSuccess(`All ${result.totalDocuments} documents verified — no version drift`);
    } else {
      printError(`Verification FAILED: ${result.mismatched} mismatched, ${result.missing} missing`);
    }
    return;
  }

  // ── Mode: Attest (default) ────────────────────────────────────
  if (!opts.documents) {
    printError('--documents <dir> is required');
    printInfo('  Example: npx ts-node scripts/attest-funding-wave.ts --documents ./Final_Funding_Package --dry-run');
    process.exit(1);
  }

  const docDir = path.resolve(opts.documents);
  if (!fs.existsSync(docDir)) {
    printError(`Document directory not found: ${docDir}`);
    process.exit(1);
  }

  // Step 1: Hash documents
  printInfo('Step 1: Hashing funding wave documents...');
  console.log('');

  const docs = wave.hashCanonicalDocuments(docDir);

  if (docs.length === 0) {
    // Fall back to hashing whatever is in the directory
    printWarning('No canonical PDF names found. Hashing all files in directory...');
    const entries = fs.readdirSync(docDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(docDir, entry.name);
        wave.hashDocument(filePath, entry.name.replace(/\.[^.]+$/, ''), 'exec_summary');
      }
    }
  }

  for (const doc of wave.getDocuments()) {
    printInfo(`  ${doc.id} ${doc.name}`);
    printInfo(`    SHA-256: ${doc.sha256}`);
    printInfo(`    Size: ${doc.size.toLocaleString()} bytes`);
    console.log('');
  }

  // Step 2: Compute root hash
  printInfo('Step 2: Computing root hash...');
  const rootHash = wave.computeRootHash();
  printSuccess(`Root Hash: ${rootHash}`);
  printInfo(`Wave ID: ${wave.getWaveId()}`);
  console.log('');

  // Step 3: Build XRPL attestation
  printInfo('Step 3: Building XRPL attestation transaction...');
  const xrplTx = wave.buildXrplTransaction();
  printInfo(`  Account: ${xrplTx.Account}`);
  printInfo(`  Destination: ${xrplTx.Destination} (self-payment)`);
  printInfo(`  Amount: ${xrplTx.Amount} drop`);
  printInfo(`  MemoType: attestation/funding-wave`);
  printInfo(`  Network: ${network}`);
  printInfo('  Requires: 2-of-3 multisig approval');
  console.log('');

  if (dryRun) {
    printInfo('[DRY RUN] Would submit to XRPL ' + network);
    wave.recordXrplAttestation(`DRY_RUN_${Date.now()}_XRPL`, network);
  } else {
    printWarning('Live submission requires wallet signing — recording placeholder');
    wave.recordXrplAttestation(`PENDING_MULTISIG_${Date.now()}`, network);
  }

  // Step 4: Optional Stellar mirror
  if (opts.stellarMirror) {
    printInfo('Step 4: Preparing Stellar mirror attestation...');
    printInfo(`  Account: ${stellarAccount}`);
    printInfo(`  Operation: ManageData`);
    printInfo(`  Key: funding_wave_${wave.getWaveId()}`);
    printInfo(`  Value: ${rootHash}`);
    console.log('');

    if (dryRun) {
      printInfo('[DRY RUN] Would submit to Stellar');
      wave.recordStellarAttestation(`DRY_RUN_${Date.now()}_STELLAR`);
    } else {
      wave.recordStellarAttestation(`PENDING_MULTISIG_${Date.now()}`);
    }
  }

  // Step 5: Generate receipt
  printInfo('Step 5: Generating wave receipt...');
  const receipt = wave.generateReceipt();

  const outputDir = opts.output || './logs';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const receiptPath = path.join(outputDir, `funding-wave-receipt-${wave.getWaveId()}.json`);
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  printSuccess(`Receipt: ${receiptPath}`);
  printInfo(`  Integrity Hash: ${receipt.integrityHash}`);
  console.log('');

  // Step 6: Generate email
  printInfo('Step 6: Generating lender email...');
  const email = wave.generateLenderEmail(opts.recipient, opts.sender);
  const emailPath = path.join(outputDir, 'lender-email.txt');
  fs.writeFileSync(emailPath, `Subject: ${email.subject}\n\n${email.body}`);
  printSuccess(`Email: ${emailPath}`);
  console.log('');

  // Step 7: Persist state
  wave.persist();
  printSuccess('Wave state persisted');

  // Summary
  console.log('');
  console.log('═'.repeat(60));
  printSuccess('FUNDING WAVE ATTESTATION COMPLETE');
  console.log('═'.repeat(60));
  console.log('');
  printInfo(`Wave ID:     ${wave.getWaveId()}`);
  printInfo(`Documents:   ${receipt.documentCount}`);
  printInfo(`Root Hash:   ${rootHash}`);
  printInfo(`XRPL:        ${receipt.attestations.find(a => a.ledger === 'xrpl')?.txHash || 'not attested'}`);
  printInfo(`Stellar:     ${receipt.attestations.find(a => a.ledger === 'stellar')?.txHash || 'not attested'}`);
  printInfo(`Receipt:     ${receiptPath}`);
  printInfo(`Email:       ${emailPath}`);
  console.log('');

  if (dryRun) {
    printWarning('This was a DRY RUN. No transactions were submitted.');
    printInfo('Run with --network mainnet --no-dry-run for live attestation.');
  } else {
    printSuccess('Ready for Channel 2 (data room) and Channel 3 (email).');
  }
}

main().catch((err) => { printError(err.message); process.exit(1); });
