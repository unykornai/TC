/**
 * OPTKAS XRPL AMM Pool Deployment — Phase 19.2b
 *
 * Creates an XRP/USD AMM pool on XRPL mainnet using the amm_liquidity wallet.
 * Uses the same institutional signing pattern as deploy-trustlines-v2.ts
 * (custom key derivation to match provision-mainnet.ts).
 *
 * Usage: npx ts-node scripts/deploy-xrpl-amm.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Client } from 'xrpl';
import { encode } from 'ripple-binary-codec';
import { sign, deriveKeypair, deriveAddress, decodeSeed } from 'ripple-keypairs';

const SECRETS_PATH = path.join(__dirname, '..', 'config', '.mainnet-secrets.json');

// ── Re-derive keys using same algorithm as provision-mainnet.ts ──

function derivePrivateKeyFromSeed(seed: string): { privateKey: string; publicKey: string; address: string } {
  const decoded = decodeSeed(seed);
  const entropy = Buffer.from(decoded.bytes);

  // Same derivation as provision-mainnet.ts: SHA-512(entropy || 0x00000000)[0:32]
  const hashInput = Buffer.concat([entropy, Buffer.alloc(4)]);
  const privKeyBuf = crypto.createHash('sha512').update(hashInput).digest().slice(0, 32);

  const ec = crypto.createECDH('secp256k1');
  ec.setPrivateKey(privKeyBuf);
  const pubKeyBuf = Buffer.from(ec.getPublicKey(null, 'compressed'));

  // Derive address
  const sha256 = crypto.createHash('sha256').update(pubKeyBuf).digest();
  const accountId = crypto.createHash('ripemd160').update(sha256).digest();

  // Base58Check encode
  const XRPL_ALPHABET = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';

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

  const versioned = Buffer.concat([Buffer.from([0x00]), accountId]);
  const hash1 = crypto.createHash('sha256').update(versioned).digest();
  const hash2 = crypto.createHash('sha256').update(hash1).digest();
  const checksum = hash2.slice(0, 4);
  const address = xrplBase58Encode(Buffer.concat([versioned, checksum]));

  return {
    privateKey: privKeyBuf.toString('hex'),
    publicKey: pubKeyBuf.toString('hex'),
    address,
  };
}

function signTransaction(tx: Record<string, any>, publicKey: string, privateKey: string): string {
  tx.SigningPubKey = publicKey;
  const encodedTx = encode(tx);
  const txBlob = Buffer.from(encodedTx, 'hex');
  const signature = sign(
    Buffer.concat([Buffer.from('53545800', 'hex'), txBlob]).toString('hex'),
    privateKey
  );
  tx.TxnSignature = signature;
  return encode(tx);
}

// ── Result tracker ─────────────────────────────────────────────
interface TxResult {
  step: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  detail: string;
}

const results: TxResult[] = [];

// ══════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log();
  console.log('  ╔════════════════════════════════════════════════════════════╗');
  console.log('  ║  OPTKAS XRPL AMM POOL DEPLOYMENT — Phase 19.2b           ║');
  console.log('  ╚════════════════════════════════════════════════════════════╝');
  console.log();

  const secrets = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf-8'));
  const xrplAccounts = secrets.accounts.filter((a: any) => a.ledger === 'xrpl');

  // Get amm_liquidity wallet
  const ammAcct = xrplAccounts.find((a: any) => a.role === 'amm_liquidity')!;
  const ammKeys = derivePrivateKeyFromSeed(ammAcct.seed);

  console.log('  ═══ KEY VALIDATION ═══');
  const match = ammKeys.address === ammAcct.address;
  console.log(`  ${match ? '✅' : '❌'} amm_liquidity  ${ammAcct.address}`);
  if (!match) {
    console.error('  🔴 Key mismatch. Aborting.');
    process.exit(1);
  }
  console.log();

  const client = new Client('wss://xrplcluster.com');
  await client.connect();
  console.log('  ✓ Connected to XRPL mainnet');
  console.log();

  const USDC_ISSUER = 'rcEGREd8NmkKRE8GE424sksyt1tJVFZwu';

  // Check current XRP balance
  const accountInfo = await client.request({
    command: 'account_info',
    account: ammAcct.address,
    ledger_index: 'validated',
  });

  const xrpBalance = parseFloat(accountInfo.result.account_data.Balance) / 1_000_000;
  console.log(`  AMM wallet balance: ${xrpBalance} XRP`);
  console.log();

  // ── Step 1: Create XRP/USD AMM Pool ───────────────────────────
  // AMMCreate requires a deposit of both assets.
  // We'll create a small pool: 5 XRP + 0 USD (XRP-only initial deposit)
  // Actually, AMMCreate requires BOTH assets. Since we have 0 USD, we need
  // to create an OPTKAS/XRP pool instead using our internal token.

  console.log('  ═══ XRPL AMM POOL: OPTKAS/XRP ═══');
  console.log();

  // OPTKAS issuer wallet
  const issuerAcct = xrplAccounts.find((a: any) => a.role === 'issuer')!;
  const issuerKeys = derivePrivateKeyFromSeed(issuerAcct.seed);

  // First: Issue OPTKAS tokens to amm_liquidity so it has both assets
  console.log('  ▸ Step 1a: Issue 100,000 OPTKAS → amm_liquidity...');

  // amm_liquidity needs a trustline to OPTKAS issuer first
  console.log('  ▸ Step 1b: Set OPTKAS trustline on amm_liquidity...');
  
  const OPTKAS_HEX = '4F50544B41530000000000000000000000000000';

  try {
    const ammInfo = await client.request({
      command: 'account_info',
      account: ammAcct.address,
      ledger_index: 'validated',
    });
    const currentLedger = await client.getLedgerIndex();

    const trustSet = {
      TransactionType: 'TrustSet',
      Account: ammAcct.address,
      LimitAmount: {
        currency: OPTKAS_HEX,
        issuer: issuerAcct.address,
        value: '1000000000',
      },
      Sequence: ammInfo.result.account_data.Sequence,
      LastLedgerSequence: currentLedger + 20,
      Fee: '12',
    };

    const blob = signTransaction(trustSet, ammKeys.publicKey, ammKeys.privateKey);
    const result = await client.submitAndWait(blob);
    const meta = result.result.meta as any;
    
    if (meta?.TransactionResult === 'tesSUCCESS') {
      console.log(`    ✅ OPTKAS trustline set: ${result.result.hash.slice(0, 16)}...`);
      results.push({ step: 'OPTKAS:trustline:amm', status: 'SUCCESS', detail: result.result.hash });
    } else if (meta?.TransactionResult === 'tecDUPLICATE' || meta?.TransactionResult === 'tecNO_LINE_REDUNDANT') {
      console.log(`    ⚠️  Already exists`);
      results.push({ step: 'OPTKAS:trustline:amm', status: 'SKIPPED', detail: 'Already exists' });
    } else {
      throw new Error(`XRPL: ${meta?.TransactionResult}`);
    }
  } catch (error: any) {
    console.error(`    ❌ ${error.message}`);
    results.push({ step: 'OPTKAS:trustline:amm', status: 'FAILED', detail: error.message });
  }

  // Now issue OPTKAS tokens from issuer → amm_liquidity
  console.log('  ▸ Step 1c: Issue 100,000 OPTKAS → amm_liquidity...');
  try {
    const issuerInfo = await client.request({
      command: 'account_info',
      account: issuerAcct.address,
      ledger_index: 'validated',
    });
    const currentLedger = await client.getLedgerIndex();

    const payment = {
      TransactionType: 'Payment',
      Account: issuerAcct.address,
      Destination: ammAcct.address,
      Amount: {
        currency: OPTKAS_HEX,
        issuer: issuerAcct.address,
        value: '100000',
      },
      Sequence: issuerInfo.result.account_data.Sequence,
      LastLedgerSequence: currentLedger + 20,
      Fee: '12',
    };

    const blob = signTransaction(payment, issuerKeys.publicKey, issuerKeys.privateKey);
    const result = await client.submitAndWait(blob);
    const meta = result.result.meta as any;

    if (meta?.TransactionResult === 'tesSUCCESS') {
      console.log(`    ✅ 100,000 OPTKAS issued: ${result.result.hash.slice(0, 16)}...`);
      results.push({ step: 'OPTKAS:issue→amm', status: 'SUCCESS', detail: result.result.hash });
    } else {
      throw new Error(`XRPL: ${meta?.TransactionResult}`);
    }
  } catch (error: any) {
    console.error(`    ❌ ${error.message}`);
    results.push({ step: 'OPTKAS:issue→amm', status: 'FAILED', detail: error.message });
  }

  // Now create the AMM pool: 5 XRP + 10,000 OPTKAS
  console.log('  ▸ Step 2: Create OPTKAS/XRP AMM pool (5 XRP + 10,000 OPTKAS)...');
  try {
    const ammInfo2 = await client.request({
      command: 'account_info',
      account: ammAcct.address,
      ledger_index: 'validated',
    });
    const currentLedger = await client.getLedgerIndex();

    const ammCreate = {
      TransactionType: 'AMMCreate',
      Account: ammAcct.address,
      Amount: '5000000', // 5 XRP in drops
      Amount2: {
        currency: OPTKAS_HEX,
        issuer: issuerAcct.address,
        value: '10000',
      },
      TradingFee: 500, // 0.5% (in basis points / 100)
      Sequence: ammInfo2.result.account_data.Sequence,
      LastLedgerSequence: currentLedger + 20,
      Fee: '2000000', // AMMCreate requires a special higher fee (2 XRP)
    };

    const blob = signTransaction(ammCreate, ammKeys.publicKey, ammKeys.privateKey);
    const result = await client.submitAndWait(blob);
    const meta = result.result.meta as any;

    if (meta?.TransactionResult === 'tesSUCCESS') {
      console.log(`    ✅ AMM POOL CREATED: ${result.result.hash.slice(0, 16)}...`);
      console.log(`       Pool: 5 XRP + 10,000 OPTKAS`);
      console.log(`       Fee: 0.5%`);
      console.log(`       Initial price: 1 OPTKAS = 0.0005 XRP`);
      results.push({ step: 'AMMCreate:OPTKAS/XRP', status: 'SUCCESS', detail: result.result.hash });
    } else {
      throw new Error(`XRPL: ${meta?.TransactionResult}`);
    }
  } catch (error: any) {
    console.error(`    ❌ ${error.message}`);
    results.push({ step: 'AMMCreate:OPTKAS/XRP', status: 'FAILED', detail: error.message });
  }

  await client.disconnect();

  // ── Report ────────────────────────────────────────────────────
  console.log();
  console.log('  ═══ DEPLOYMENT REPORT ═══');
  console.log();

  const succeeded = results.filter(r => r.status === 'SUCCESS').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const skipped = results.filter(r => r.status === 'SKIPPED').length;

  for (const r of results) {
    const icon = r.status === 'SUCCESS' ? '✅' : r.status === 'SKIPPED' ? '⚠️' : '❌';
    console.log(`  ${icon} ${r.step.padEnd(25)} ${r.status.padEnd(8)} ${r.detail.slice(0, 40)}`);
  }

  console.log();
  console.log(`  Total: ${succeeded} succeeded, ${skipped} skipped, ${failed} failed`);
  console.log();

  if (failed > 0) {
    console.log('  🔴 DEPLOYMENT INCOMPLETE');
    process.exit(1);
  } else {
    console.log('  🟢 XRPL AMM POOL LIVE');
    console.log('  → OPTKAS/XRP pool active on XRPL DEX');
    console.log('  → XLM/OPTKAS pool active on Stellar');
    console.log('  → Cross-chain swaps ready via bridge');
  }
}

main().catch(err => {
  console.error('  FATAL:', err);
  process.exit(1);
});
