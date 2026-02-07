/**
 * OPTKAS Trustline Deployment — Institutional Grade
 *
 * This script re-derives private keys using the SAME algorithm as provision-mainnet.ts,
 * since Wallet.fromSeed() uses a different derivation path (standard XRPL family seed
 * derivation) than the custom single-round SHA-512 used during wallet generation.
 *
 * Root Cause: provision-mainnet.ts used SHA-512(entropy || 0x00000000)[0:32] as private key.
 * xrpl.js Wallet.fromSeed() uses the standard multi-round derivation. Different private keys
 * from the same seed → different addresses → tefBAD_AUTH.
 *
 * Fix: Decode seed → recover entropy → re-derive private key the same way → sign correctly.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Client, TrustSet, AccountSet } from 'xrpl';
import { encode, decode } from 'ripple-binary-codec';
import { sign } from 'ripple-keypairs';

const SECRETS_PATH = path.join(__dirname, '..', 'config', '.mainnet-secrets.json');

// ── XRPL Base58 (same alphabet as provision-mainnet.ts) ─────────
const XRPL_ALPHABET = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';

function xrplBase58Decode(str: string): Buffer {
  const alphabetMap: Record<string, number> = {};
  for (let i = 0; i < XRPL_ALPHABET.length; i++) {
    alphabetMap[XRPL_ALPHABET[i]] = i;
  }

  const bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const c = alphabetMap[str[i]];
    if (c === undefined) throw new Error(`Invalid character: ${str[i]}`);
    for (let j = 0; j < bytes.length; j++) {
      bytes[j] = bytes[j] * 58 + (j === 0 ? c : 0);
    }
    // Actually need full big-number base conversion
    let carry = c;
    for (let j = 0; j < bytes.length; j++) {
      const val = bytes[j] * 58 + carry;
      bytes[j] = val & 0xff;
      carry = val >> 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Leading zeros
  for (let i = 0; i < str.length && str[i] === XRPL_ALPHABET[0]; i++) {
    bytes.push(0);
  }

  return Buffer.from(bytes.reverse());
}

/**
 * Decode a base58check-encoded seed to recover the 16-byte entropy.
 * Format: [version_byte(1)] [entropy(16)] [checksum(4)]
 */
function decodeSeedEntropy(seed: string): Buffer {
  // Use a proper base58 decode
  // Since the custom decode is tricky, let's just brute-force validate using
  // the same encode function from provision-mainnet.ts
  // Actually, let's use ripple-keypairs to decode the seed properly
  
  // ripple-keypairs.decodeSeed gives us entropy + type
  const { deriveKeypair, deriveAddress } = require('ripple-keypairs');
  
  // The issue is that Wallet.fromSeed uses standard XRPL derivation.
  // We need to decode the seed to entropy, then use OUR derivation.
  // Let's use the codec directly.
  const { decodeSeed } = require('ripple-keypairs');
  const decoded = decodeSeed(seed);
  return Buffer.from(decoded.bytes);
}

/**
 * Re-derive private key using the SAME algorithm as provision-mainnet.ts
 * This is: SHA-512(entropy || 0x00000000)[0:32]
 */
function derivePrivateKey(entropy: Buffer): Buffer {
  const hashInput = Buffer.concat([entropy, Buffer.alloc(4)]); // entropy + sequence 0 (4 zero bytes)
  return crypto.createHash('sha512').update(hashInput).digest().slice(0, 32);
}

/**
 * Derive compressed secp256k1 public key from private key
 */
function derivePublicKey(privateKey: Buffer): Buffer {
  const ec = crypto.createECDH('secp256k1');
  ec.setPrivateKey(privateKey);
  return Buffer.from(ec.getPublicKey(null, 'compressed'));
}

/**
 * Derive XRPL address from public key
 */
function deriveAddress(publicKey: Buffer): string {
  const sha256 = crypto.createHash('sha256').update(publicKey).digest();
  const accountId = crypto.createHash('ripemd160').update(sha256).digest();
  return xrplBase58Check(accountId, 0x00);
}

function xrplBase58Encode(buffer: Buffer): string {
  const digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    let carry = buffer[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  for (let i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) {
    digits.push(0);
  }
  return digits.reverse().map(d => XRPL_ALPHABET[d]).join('');
}

function xrplBase58Check(payload: Buffer, versionByte: number): string {
  const versioned = Buffer.concat([Buffer.from([versionByte]), payload]);
  const hash1 = crypto.createHash('sha256').update(versioned).digest();
  const hash2 = crypto.createHash('sha256').update(hash1).digest();
  const checksum = hash2.slice(0, 4);
  return xrplBase58Encode(Buffer.concat([versioned, checksum]));
}

// ── Transaction signing with raw keypair ────────────────────────

interface OPTKASWallet {
  role: string;
  address: string;
  publicKey: string;   // hex
  privateKey: string;  // hex
}

function signTransaction(tx: Record<string, any>, wallet: OPTKASWallet): string {
  // Encode the transaction to binary, sign it, return tx_blob
  tx.SigningPubKey = wallet.publicKey;
  
  const encodedTx = encode(tx);
  const txBlob = Buffer.from(encodedTx, 'hex');
  
  // Sign with ripple-keypairs
  const signature = sign(
    Buffer.concat([
      Buffer.from('53545800', 'hex'), // HashPrefix for transaction signing
      txBlob,
    ]).toString('hex'),
    wallet.privateKey
  );
  
  tx.TxnSignature = signature;
  return encode(tx);
}

// ══════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log();
  console.log('  ╔════════════════════════════════════════════════════════════╗');
  console.log('  ║  OPTKAS TRUSTLINE DEPLOYMENT — Institutional Grade        ║');
  console.log('  ╚════════════════════════════════════════════════════════════╝');
  console.log();

  // ── Load secrets ──────────────────────────────────────────────
  const secrets = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf-8'));
  const xrplAccounts = secrets.accounts.filter((a: any) => a.ledger === 'xrpl');

  // ── Step 0: Re-derive keys and validate addresses ─────────────
  console.log('  ═══ STEP 0: KEY VALIDATION ═══');
  console.log();

  const wallets: OPTKASWallet[] = [];
  let allValid = true;

  for (const acct of xrplAccounts) {
    const entropy = decodeSeedEntropy(acct.seed);
    const privKey = derivePrivateKey(entropy);
    const pubKey = derivePublicKey(privKey);
    const derivedAddress = deriveAddress(pubKey);

    const match = derivedAddress === acct.address;
    const icon = match ? '✅' : '❌';
    console.log(`  ${icon} ${acct.role.padEnd(15)} stored: ${acct.address}`);
    console.log(`     ${' '.repeat(15)} derived: ${derivedAddress}`);

    if (!match) {
      allValid = false;
      console.log(`     ⚠  KEY MISMATCH — cannot sign for this account`);
    }

    wallets.push({
      role: acct.role,
      address: acct.address,
      publicKey: pubKey.toString('hex'),
      privateKey: privKey.toString('hex'),
    });
  }

  console.log();

  if (!allValid) {
    console.error('  🔴 ABORTING: Key mismatches detected. Cannot safely sign transactions.');
    console.error('     This means the seed→address derivation in provision-mainnet.ts');
    console.error('     does not match the re-derivation here. Debug required.');
    process.exit(1);
  }

  console.log('  ✅ All keys validated — addresses match derivation');
  console.log();

  // ── Connect to XRPL ──────────────────────────────────────────
  const client = new Client('wss://xrplcluster.com');
  await client.connect();
  console.log('  ✓ Connected to XRPL mainnet');
  console.log();

  // Track results honestly
  const results: { step: string; status: 'SUCCESS' | 'FAILED' | 'SKIPPED'; detail: string }[] = [];

  // ── Step 1: DefaultRipple on issuer ───────────────────────────
  console.log('  ═══ STEP 1: ISSUER SETTINGS ═══');
  const issuer = wallets.find(w => w.role === 'issuer')!;
  console.log(`  ▸ Setting DefaultRipple on ${issuer.address}...`);

  try {
    const accountInfo = await client.request({
      command: 'account_info',
      account: issuer.address,
      ledger_index: 'validated',
    });

    const currentLedger = await client.getLedgerIndex();

    const accountSet = {
      TransactionType: 'AccountSet',
      Account: issuer.address,
      SetFlag: 8, // asfDefaultRipple
      Sequence: accountInfo.result.account_data.Sequence,
      LastLedgerSequence: currentLedger + 20,
      Fee: '12',
    };

    const tx_blob = signTransaction(accountSet, issuer);
    const result = await client.submitAndWait(tx_blob);

    const meta = result.result.meta;
    if (meta && typeof meta === 'object' && 'TransactionResult' in meta) {
      if (meta.TransactionResult === 'tesSUCCESS') {
        console.log(`    ✅ DefaultRipple SET: ${result.result.hash}`);
        results.push({ step: 'DefaultRipple', status: 'SUCCESS', detail: result.result.hash });
      } else {
        throw new Error(`XRPL failure: ${meta.TransactionResult}`);
      }
    }
  } catch (error: any) {
    if (error.message?.includes('tecNO_PERMISSION') || error.message?.includes('temREDUNDANT')) {
      console.log(`    ⚠  DefaultRipple already enabled`);
      results.push({ step: 'DefaultRipple', status: 'SKIPPED', detail: 'Already set' });
    } else {
      console.error(`    ❌ FAILED: ${error.message}`);
      results.push({ step: 'DefaultRipple', status: 'FAILED', detail: error.message });
    }
  }
  console.log();

  // ── Step 2: USDC Trustlines ───────────────────────────────────
  console.log('  ═══ STEP 2: USDC TRUSTLINES ═══');
  const USDC_ISSUER = 'rcEGREd8NmkKRE8GE424sksyt1tJVFZwu'; // Circle USDC on XRPL

  const trustlineRoles = ['issuer', 'treasury', 'amm_liquidity', 'trading'];

  for (const role of trustlineRoles) {
    const wallet = wallets.find(w => w.role === role)!;
    console.log(`  ▸ ${role.padEnd(15)} ${wallet.address}`);

    try {
      const accountInfo = await client.request({
        command: 'account_info',
        account: wallet.address,
        ledger_index: 'validated',
      });

      const currentLedger = await client.getLedgerIndex();

      const trustSet = {
        TransactionType: 'TrustSet',
        Account: wallet.address,
        LimitAmount: {
          currency: 'USD',
          issuer: USDC_ISSUER,
          value: '1000000000',
        },
        Sequence: accountInfo.result.account_data.Sequence,
        LastLedgerSequence: currentLedger + 20,
        Fee: '12',
      };

      const tx_blob = signTransaction(trustSet, wallet);
      const result = await client.submitAndWait(tx_blob);

      const meta = result.result.meta;
      if (meta && typeof meta === 'object' && 'TransactionResult' in meta) {
        if (meta.TransactionResult === 'tesSUCCESS') {
          console.log(`    ✅ USDC trustline ACTIVE: ${result.result.hash.slice(0, 16)}...`);
          results.push({ step: `USDC:${role}`, status: 'SUCCESS', detail: result.result.hash });
        } else {
          throw new Error(`XRPL failure: ${meta.TransactionResult}`);
        }
      }
    } catch (error: any) {
      if (error.message?.includes('tecNO_LINE_REDUNDANT') || error.message?.includes('tecDUPLICATE')) {
        console.log(`    ⚠  Trustline already exists`);
        results.push({ step: `USDC:${role}`, status: 'SKIPPED', detail: 'Already exists' });
      } else {
        console.error(`    ❌ FAILED: ${error.message}`);
        results.push({ step: `USDC:${role}`, status: 'FAILED', detail: error.message });
      }
    }
  }
  console.log();

  // ── Step 3: OPTKAS Internal Token Trustline ───────────────────
  console.log('  ═══ STEP 3: OPTKAS TOKEN TRUSTLINE ═══');

  // OPTKAS = 6 chars → must be 160-bit hex (40 chars exactly, uppercase, zero-padded)
  // O=4F P=50 T=54 K=4B A=41 S=53 → 4F50544B4153 (12 hex chars) + 28 zero chars = 40
  const OPTKAS_HEX = '4F50544B41530000000000000000000000000000';

  const treasury = wallets.find(w => w.role === 'treasury')!;
  console.log(`  ▸ Treasury trusts OPTKAS from issuer...`);

  try {
    const accountInfo = await client.request({
      command: 'account_info',
      account: treasury.address,
      ledger_index: 'validated',
    });

    const currentLedger = await client.getLedgerIndex();

    const trustSet = {
      TransactionType: 'TrustSet',
      Account: treasury.address,
      LimitAmount: {
        currency: OPTKAS_HEX,
        issuer: issuer.address,
        value: '1000000000',
      },
      Sequence: accountInfo.result.account_data.Sequence,
      LastLedgerSequence: currentLedger + 20,
      Fee: '12',
    };

    const tx_blob = signTransaction(trustSet, treasury);
    const result = await client.submitAndWait(tx_blob);

    const meta = result.result.meta;
    if (meta && typeof meta === 'object' && 'TransactionResult' in meta) {
      if (meta.TransactionResult === 'tesSUCCESS') {
        console.log(`    ✅ OPTKAS trustline ACTIVE: ${result.result.hash.slice(0, 16)}...`);
        results.push({ step: 'OPTKAS:treasury', status: 'SUCCESS', detail: result.result.hash });
      } else {
        throw new Error(`XRPL failure: ${meta.TransactionResult}`);
      }
    }
  } catch (error: any) {
    if (error.message?.includes('tecNO_LINE_REDUNDANT')) {
      console.log(`    ⚠  Trustline already exists`);
      results.push({ step: 'OPTKAS:treasury', status: 'SKIPPED', detail: 'Already exists' });
    } else {
      console.error(`    ❌ FAILED: ${error.message}`);
      results.push({ step: 'OPTKAS:treasury', status: 'FAILED', detail: error.message });
    }
  }

  await client.disconnect();

  // ── HONEST Summary ────────────────────────────────────────────
  console.log();
  console.log('  ═══ DEPLOYMENT REPORT ═══');
  console.log();

  const succeeded = results.filter(r => r.status === 'SUCCESS').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const skipped = results.filter(r => r.status === 'SKIPPED').length;

  for (const r of results) {
    const icon = r.status === 'SUCCESS' ? '✅' : r.status === 'SKIPPED' ? '⚠️' : '❌';
    console.log(`  ${icon} ${r.step.padEnd(20)} ${r.status.padEnd(8)} ${r.detail.slice(0, 40)}`);
  }

  console.log();
  console.log(`  Total: ${succeeded} succeeded, ${skipped} skipped, ${failed} failed`);
  console.log();

  if (failed > 0) {
    console.log('  🔴 DEPLOYMENT INCOMPLETE — Review failures above');
    process.exit(1);
  } else {
    console.log('  🟢 ALL TRUSTLINES DEPLOYED SUCCESSFULLY');
    console.log('  → Run check-wallet-balances.ts to verify on-chain');
  }
}

main().catch(err => {
  console.error('  FATAL:', err);
  process.exit(1);
});
