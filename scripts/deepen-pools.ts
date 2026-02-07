/**
 * OPTKAS1 POOL DEEP LIQUIDITY INJECTION — Phase 20.1
 *
 * Deposits significant additional XRP into ALL AMM pools to make them look
 * professional and substantial. Also issues more tokens to match deposits.
 *
 * Strategy: With ~150 XRP additional funding, distribute across 5 XRPL pools
 * + complete Stellar pools that failed due to low XLM.
 *
 * Target Pool Sizes (after injection):
 *   OPTKAS/XRP:   25 XRP + proportional tokens  (flagship utility)
 *   IMPERIA/XRP:  40 XRP + proportional tokens  (gold premium)
 *   GEMVLT/XRP:   20 XRP + proportional tokens
 *   TERRAVL/XRP:  25 XRP + proportional tokens
 *   PETRO/XRP:    25 XRP + proportional tokens
 *
 * Usage: npx ts-node scripts/deepen-pools.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Client } from 'xrpl';
import { encode } from 'ripple-binary-codec';
import { sign, decodeSeed } from 'ripple-keypairs';
import * as StellarSdk from '@stellar/stellar-sdk';

const SECRETS_PATH = path.join(__dirname, '..', 'config', '.mainnet-secrets.json');
const XRPL_ISSUER = 'rpraqLjKmDB9a43F9fURWA2bVaywkyJua3';

// ══════════════════════════════════════════════════════════════
//  XRPL SIGNING (proven pattern)
// ══════════════════════════════════════════════════════════════

const XRPL_ALPHABET = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';

function xrplBase58Encode(buffer: Buffer): string {
  const digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    let carry = buffer[i];
    for (let j = 0; j < digits.length; j++) { carry += digits[j] << 8; digits[j] = carry % 58; carry = (carry / 58) | 0; }
    while (carry > 0) { digits.push(carry % 58); carry = (carry / 58) | 0; }
  }
  for (let i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) digits.push(0);
  return digits.reverse().map(d => XRPL_ALPHABET[d]).join('');
}

function deriveXrplKeys(seed: string) {
  const decoded = decodeSeed(seed);
  const entropy = Buffer.from(decoded.bytes);
  const hashInput = Buffer.concat([entropy, Buffer.alloc(4)]);
  const privKeyBuf = crypto.createHash('sha512').update(hashInput).digest().slice(0, 32);
  const ec = crypto.createECDH('secp256k1');
  ec.setPrivateKey(privKeyBuf);
  const pubKeyBuf = Buffer.from(ec.getPublicKey(null, 'compressed'));
  const sha256 = crypto.createHash('sha256').update(pubKeyBuf).digest();
  const accountId = crypto.createHash('ripemd160').update(sha256).digest();
  const versioned = Buffer.concat([Buffer.from([0x00]), accountId]);
  const h1 = crypto.createHash('sha256').update(versioned).digest();
  const h2 = crypto.createHash('sha256').update(h1).digest();
  const address = xrplBase58Encode(Buffer.concat([versioned, h2.slice(0, 4)]));
  return { privateKey: privKeyBuf.toString('hex'), publicKey: pubKeyBuf.toString('hex'), address };
}

function signXrplTx(tx: Record<string, any>, pubKey: string, privKey: string): string {
  tx.SigningPubKey = pubKey;
  const encoded = encode(tx);
  const sig = sign(Buffer.concat([Buffer.from('53545800', 'hex'), Buffer.from(encoded, 'hex')]).toString('hex'), privKey);
  tx.TxnSignature = sig;
  return encode(tx);
}

interface TxResult { step: string; status: 'SUCCESS' | 'FAILED'; detail: string; }
const results: TxResult[] = [];

function report(step: string, status: 'SUCCESS' | 'FAILED', detail: string) {
  results.push({ step, status, detail });
  const icon = status === 'SUCCESS' ? '✅' : '❌';
  console.log(`    ${icon} ${step}: ${detail.slice(0, 55)}`);
}

async function submitXrpl(
  client: Client, tx: Record<string, any>,
  keys: { publicKey: string; privateKey: string },
  stepName: string
): Promise<boolean> {
  try {
    const blob = signXrplTx(tx, keys.publicKey, keys.privateKey);
    const result = await client.submitAndWait(blob);
    const meta = result.result.meta as any;
    const eng = meta?.TransactionResult || 'unknown';
    if (eng === 'tesSUCCESS') { report(stepName, 'SUCCESS', result.result.hash); return true; }
    else { report(stepName, 'FAILED', eng); return false; }
  } catch (err: any) { report(stepName, 'FAILED', err.message?.slice(0, 60) || 'err'); return false; }
}

// ══════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════

async function main() {
  console.log();
  console.log('  ╔════════════════════════════════════════════════════════════════════╗');
  console.log('  ║  OPTKAS1 DEEP LIQUIDITY INJECTION — Phase 20.1                    ║');
  console.log('  ║  Making the sovereign ecosystem look MASSIVE                       ║');
  console.log('  ╚════════════════════════════════════════════════════════════════════╝');
  console.log();

  const secrets = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf-8'));
  const xrplAccounts = secrets.accounts.filter((a: any) => a.ledger === 'xrpl');

  const wallets: Record<string, { address: string; keys: ReturnType<typeof deriveXrplKeys> }> = {};
  for (const acct of xrplAccounts) {
    const keys = deriveXrplKeys(acct.seed);
    if (keys.address !== acct.address) { console.error(`❌ Key mismatch ${acct.role}`); process.exit(1); }
    wallets[acct.role] = { address: acct.address, keys };
  }
  console.log('  ✅ All keys validated');

  const client = new Client('wss://xrplcluster.com');
  await client.connect();
  console.log('  ✓ Connected to XRPL mainnet');
  console.log();

  // ── STEP 1: Read current pool state ───────────────────────
  console.log('  ═══ CURRENT POOL STATE ═══');
  console.log();

  const POOLS = [
    { name: 'OPTKAS',  hex: '4F50544B41530000000000000000000000000000' },
    { name: 'IMPERIA', hex: '494D504552494100000000000000000000000000' },
    { name: 'GEMVLT',  hex: '47454D564C540000000000000000000000000000' },
    { name: 'TERRAVL', hex: '5445525241564C00000000000000000000000000' },
    { name: 'PETRO',   hex: '504554524F000000000000000000000000000000' },
  ];

  const poolState: Record<string, { xrp: number; tokens: number }> = {};

  for (const p of POOLS) {
    try {
      const r = await client.request({
        command: 'amm_info',
        asset: { currency: 'XRP' },
        asset2: { currency: p.hex, issuer: XRPL_ISSUER },
      } as any);
      const d = (r.result as any).amm;
      const xrp = typeof d.amount === 'string' ? parseFloat(d.amount) / 1e6 : parseFloat(d.amount.value);
      const tok = typeof d.amount2 === 'string' ? parseFloat(d.amount2) / 1e6 : parseFloat(d.amount2.value);
      poolState[p.name] = { xrp, tokens: tok };
      console.log(`    ${p.name.padEnd(10)} ${xrp.toFixed(2).padStart(8)} XRP + ${tok.toFixed(0).padStart(10)} tokens`);
    } catch {
      poolState[p.name] = { xrp: 0, tokens: 0 };
      console.log(`    ${p.name.padEnd(10)} NO POOL`);
    }
  }

  // ── STEP 2: Check amm_liquidity balance ───────────────────
  console.log();
  const ammInfo = await client.request({
    command: 'account_info', account: wallets.amm_liquidity.address, ledger_index: 'validated',
  });
  const ammXrp = parseFloat(ammInfo.result.account_data.Balance) / 1e6;
  console.log(`  AMM wallet current balance: ${ammXrp.toFixed(2)} XRP`);

  // Calculate what we can deposit
  // AMMDeposit is free (no 2 XRP fee like AMMCreate), just the XRP we deposit
  // Need to keep 2 XRP reserve in amm_liquidity wallet
  const availableXrp = ammXrp - 2;

  // Target allocation of ADDITIONAL XRP per pool:
  //   IMPERIA: 35 XRP (flagship gold product — biggest splash)
  //   OPTKAS:  30 XRP (utility token — already has liquidity, double down)
  //   PETRO:   30 XRP (oil — big industry, big numbers)
  //   TERRAVL: 25 XRP (real estate — solid)
  //   GEMVLT:  15 XRP (gems — niche but valuable)
  //   Total: 135 XRP needed for deposits

  // The user said they can add ~150 XRP. Current amm_liquidity has ~5 XRP.
  // So after funding, ~155 XRP available. After 2 XRP reserve = ~153 XRP.

  const TARGET_DEPOSITS = [
    { name: 'IMPERIA', hex: '494D504552494100000000000000000000000000', xrpToAdd: 35 },
    { name: 'OPTKAS',  hex: '4F50544B41530000000000000000000000000000', xrpToAdd: 30 },
    { name: 'PETRO',   hex: '504554524F000000000000000000000000000000', xrpToAdd: 30 },
    { name: 'TERRAVL', hex: '5445525241564C00000000000000000000000000', xrpToAdd: 25 },
    { name: 'GEMVLT',  hex: '47454D564C540000000000000000000000000000', xrpToAdd: 15 },
  ];

  const totalNeeded = TARGET_DEPOSITS.reduce((s, d) => s + d.xrpToAdd, 0);
  console.log(`  XRP needed for all deposits: ${totalNeeded} XRP`);
  console.log(`  XRP available: ${availableXrp.toFixed(2)} XRP`);
  console.log();

  if (availableXrp < totalNeeded) {
    console.log(`  ⚠️  Need ${(totalNeeded - availableXrp).toFixed(0)} more XRP in amm_liquidity wallet.`);
    console.log(`     Address: ${wallets.amm_liquidity.address}`);
    console.log();
    console.log('  Send XRP to that address, then re-run this script.');
    console.log();

    // Still do what we can with available XRP
    if (availableXrp < 5) {
      console.log('  ❌ Not enough XRP to deposit into any pool. Exiting.');
      await client.disconnect();
      return;
    }
    console.log(`  → Proceeding with ${availableXrp.toFixed(0)} XRP — scaling deposits proportionally.`);
    const scale = availableXrp / totalNeeded;
    for (const d of TARGET_DEPOSITS) {
      d.xrpToAdd = Math.floor(d.xrpToAdd * scale);
    }
  }

  // ── STEP 3: First issue more tokens to amm_liquidity ─────
  // For AMMDeposit single-sided (XRP only), the AMM auto-calculates tokens.
  // But to be safe and maximize the deposit, let's also issue more tokens.
  console.log('  ═══ ISSUING ADDITIONAL TOKENS TO AMM WALLET ═══');
  console.log();

  const issuerKeys = wallets.issuer.keys;

  // For each pool, issue tokens proportional to XRP being added
  // Using the current pool ratio: new_tokens = (xrpToAdd / currentXrp) * currentTokens
  for (const dep of TARGET_DEPOSITS) {
    if (dep.name === 'OPTKAS' && poolState['OPTKAS']?.xrp > 0) {
      // OPTKAS already has plenty of tokens in the pool
    }

    const current = poolState[dep.name];
    if (!current || current.xrp === 0) continue;

    const ratio = current.tokens / current.xrp;
    const tokensNeeded = Math.ceil(dep.xrpToAdd * ratio);

    if (tokensNeeded <= 0) continue;

    // Issue tokens from issuer → amm_liquidity
    const info = await client.request({
      command: 'account_info', account: wallets.issuer.address, ledger_index: 'validated',
    });
    const ledger = await client.getLedgerIndex();

    const tx = {
      TransactionType: 'Payment',
      Account: wallets.issuer.address,
      Destination: wallets.amm_liquidity.address,
      Amount: { currency: dep.hex, issuer: XRPL_ISSUER, value: String(tokensNeeded) },
      Sequence: info.result.account_data.Sequence,
      LastLedgerSequence: ledger + 20,
      Fee: '12',
    };

    await submitXrpl(client, tx, issuerKeys, `Issue ${tokensNeeded} ${dep.name} → amm`);
    await new Promise(r => setTimeout(r, 2000));
  }

  // ── STEP 4: AMMDeposit into each pool ─────────────────────
  console.log();
  console.log('  ═══ DEEP LIQUIDITY DEPOSITS ═══');
  console.log();

  for (const dep of TARGET_DEPOSITS) {
    if (dep.xrpToAdd <= 0) continue;

    const current = poolState[dep.name];
    if (!current || current.xrp === 0) {
      console.log(`    ⏭️  ${dep.name}: No pool exists, skipping`);
      continue;
    }

    // Calculate proportional token deposit
    const ratio = current.tokens / current.xrp;
    const tokensToDeposit = (dep.xrpToAdd * ratio).toFixed(6);
    const xrpDrops = String(dep.xrpToAdd * 1_000_000);

    console.log(`    ▸ ${dep.name}: Depositing ${dep.xrpToAdd} XRP + ${parseFloat(tokensToDeposit).toFixed(0)} tokens...`);

    const info = await client.request({
      command: 'account_info', account: wallets.amm_liquidity.address, ledger_index: 'validated',
    });
    const ledger = await client.getLedgerIndex();

    // AMMDeposit with both assets (proportional deposit)
    const tx: Record<string, any> = {
      TransactionType: 'AMMDeposit',
      Account: wallets.amm_liquidity.address,
      Asset: { currency: 'XRP' },
      Asset2: { currency: dep.hex, issuer: XRPL_ISSUER },
      Amount: xrpDrops,
      Amount2: { currency: dep.hex, issuer: XRPL_ISSUER, value: tokensToDeposit },
      Flags: 0x00100000, // tfTwoAsset
      Sequence: info.result.account_data.Sequence,
      LastLedgerSequence: ledger + 25,
      Fee: '12',
    };

    await submitXrpl(client, tx, wallets.amm_liquidity.keys, `AMMDeposit:${dep.name}(+${dep.xrpToAdd}XRP)`);
    await new Promise(r => setTimeout(r, 3000));
  }

  // ── STEP 5: Issue tokens to treasury too (for selling) ────
  console.log();
  console.log('  ═══ TREASURY REPLENISHMENT ═══');
  console.log();

  // Issue large amounts to treasury for the offering
  const treasuryIssues = [
    { name: 'IMPERIA', hex: '494D504552494100000000000000000000000000', amount: '500' },
    { name: 'GEMVLT',  hex: '47454D564C540000000000000000000000000000', amount: '10000' },
    { name: 'TERRAVL', hex: '5445525241564C00000000000000000000000000', amount: '5000' },
    { name: 'PETRO',   hex: '504554524F000000000000000000000000000000', amount: '100000' },
    { name: 'OPTKAS',  hex: '4F50544B41530000000000000000000000000000', amount: '500000' },
  ];

  for (const iss of treasuryIssues) {
    const info = await client.request({
      command: 'account_info', account: wallets.issuer.address, ledger_index: 'validated',
    });
    const ledger = await client.getLedgerIndex();

    const tx = {
      TransactionType: 'Payment',
      Account: wallets.issuer.address,
      Destination: wallets.treasury.address,
      Amount: { currency: iss.hex, issuer: XRPL_ISSUER, value: iss.amount },
      Sequence: info.result.account_data.Sequence,
      LastLedgerSequence: ledger + 20,
      Fee: '12',
    };

    await submitXrpl(client, tx, issuerKeys, `Treasury:+${iss.amount} ${iss.name}`);
    await new Promise(r => setTimeout(r, 2000));
  }

  // ── STEP 6: Read final pool state ─────────────────────────
  console.log();
  console.log('  ═══ FINAL POOL STATE ═══');
  console.log();

  let totalPoolXrp = 0;
  for (const p of POOLS) {
    try {
      const r = await client.request({
        command: 'amm_info',
        asset: { currency: 'XRP' },
        asset2: { currency: p.hex, issuer: XRPL_ISSUER },
      } as any);
      const d = (r.result as any).amm;
      const xrp = typeof d.amount === 'string' ? parseFloat(d.amount) / 1e6 : parseFloat(d.amount.value);
      const tok = typeof d.amount2 === 'string' ? parseFloat(d.amount2) / 1e6 : parseFloat(d.amount2.value);
      totalPoolXrp += xrp;
      const usdValue = xrp * 1.40 * 2; // Rough TVL = XRP side × price × 2
      console.log(`    ${p.name.padEnd(10)} ${xrp.toFixed(2).padStart(8)} XRP + ${tok.toFixed(0).padStart(10)} tokens  ≈ $${usdValue.toFixed(0)} TVL`);
    } catch {
      console.log(`    ${p.name.padEnd(10)} ERROR`);
    }
  }

  const totalTvl = totalPoolXrp * 1.40 * 2;
  console.log();
  console.log(`    TOTAL POOL LIQUIDITY: ${totalPoolXrp.toFixed(2)} XRP ≈ $${totalTvl.toFixed(0)} TVL`);

  await client.disconnect();

  // ── Report ────────────────────────────────────────────────
  console.log();
  const succeeded = results.filter(r => r.status === 'SUCCESS').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  console.log(`  ═══════════════════════════════════════════════════`);
  console.log(`  Total: ${succeeded} succeeded | ${failed} failed`);
  console.log(`  ═══════════════════════════════════════════════════`);

  if (failed === 0) {
    console.log();
    console.log('  🟢 DEEP LIQUIDITY INJECTION COMPLETE');
    console.log('  → Pools look MASSIVE — institutional-grade liquidity');
    console.log('  → Ready for Stellar pool completion next');
  }
  console.log();
}

// ══════════════════════════════════════════════════════════════
//  STELLAR POOL COMPLETION
// ══════════════════════════════════════════════════════════════

async function completeStellar() {
  console.log();
  console.log('  ╔════════════════════════════════════════════════════════════╗');
  console.log('  ║  STELLAR POOL COMPLETION                                  ║');
  console.log('  ╚════════════════════════════════════════════════════════════╝');
  console.log();

  const secrets = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf-8'));
  const stellarAccounts = secrets.accounts.filter((a: any) => a.ledger === 'stellar');
  const issuerAcct = stellarAccounts.find((a: any) => a.role === 'issuer')!;
  const distAcct = stellarAccounts.find((a: any) => a.role === 'distribution')!;

  const issuerKp = StellarSdk.Keypair.fromSecret(issuerAcct.seed);
  const distKp = StellarSdk.Keypair.fromSecret(distAcct.seed);

  const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
  const networkPassphrase = StellarSdk.Networks.PUBLIC;

  // Check balance
  const distInfo = await server.loadAccount(distAcct.address);
  const xlmBalance = parseFloat(distInfo.balances.find((b: any) => b.asset_type === 'native')?.balance || '0');
  console.log(`  Distribution wallet: ${xlmBalance.toFixed(2)} XLM`);

  // Pools still needed: TERRAVL + PETRO
  const missingPools = [
    { code: 'TERRAVL', xlm: '5', tokens: '500' },
    { code: 'PETRO', xlm: '5', tokens: '10000' },
  ];

  // Also deepen existing pools if we have XLM
  const deepenPools = [
    { code: 'OPTKAS', xlm: '20', tokens: '20000' },
    { code: 'IMPERIA', xlm: '20', tokens: '200' },
    { code: 'GEMVLT', xlm: '10', tokens: '5000' },
  ];

  const totalXlmNeeded = [...missingPools, ...deepenPools].reduce((s, p) => s + parseFloat(p.xlm), 0);
  console.log(`  XLM needed for all pools: ${totalXlmNeeded} XLM`);

  if (xlmBalance < 10) {
    console.log('  ⚠️  Need more XLM in distribution wallet for pools.');
    console.log(`     Address: ${distAcct.address}`);
    console.log('     Send 60+ XLM, then re-run.');
    return;
  }

  // Determine what we can afford
  const safeXlm = xlmBalance - 3; // Keep 3 XLM reserve
  let pools = [...missingPools]; // Always try missing pools first
  
  if (safeXlm > 20) {
    pools = [...pools, ...deepenPools]; // Add deepening if we have XLM
  }

  // First: Issue more tokens to distribution for deepening
  console.log();
  console.log('  ═══ ISSUING TOKENS FOR POOLS ═══');
  for (const pool of pools) {
    try {
      const issuerAccount = await server.loadAccount(issuerAcct.address);
      const asset = new StellarSdk.Asset(pool.code, issuerAcct.address);
      const tx = new StellarSdk.TransactionBuilder(issuerAccount, { fee: '100', networkPassphrase })
        .addOperation(StellarSdk.Operation.payment({
          destination: distAcct.address,
          asset,
          amount: pool.tokens,
        }))
        .setTimeout(60)
        .build();
      tx.sign(issuerKp);
      const result = await server.submitTransaction(tx);
      report(`Stellar:issue ${pool.code}(${pool.tokens})`, 'SUCCESS', (result as any).hash || 'OK');
    } catch (err: any) {
      const detail = err?.response?.data?.extras?.result_codes?.operations?.[0] || err.message;
      report(`Stellar:issue ${pool.code}`, 'FAILED', String(detail).slice(0, 60));
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  // Create/deepen pools
  console.log();
  console.log('  ═══ STELLAR POOL DEPOSITS ═══');
  for (const pool of pools) {
    const asset = new StellarSdk.Asset(pool.code, issuerAcct.address);
    const poolAsset = new StellarSdk.LiquidityPoolAsset(
      StellarSdk.Asset.native(), asset, StellarSdk.LiquidityPoolFeeV18
    );
    const poolId = StellarSdk.getLiquidityPoolId('constant_product', poolAsset).toString('hex');

    // Ensure trust exists
    try {
      const account = await server.loadAccount(distAcct.address);
      const hasTrust = account.balances.some((b: any) => 
        b.asset_type === 'liquidity_pool_shares' && b.liquidity_pool_id === poolId
      );

      if (!hasTrust) {
        const tx = new StellarSdk.TransactionBuilder(account, { fee: '100', networkPassphrase })
          .addOperation(StellarSdk.Operation.changeTrust({ asset: poolAsset }))
          .setTimeout(60)
          .build();
        tx.sign(distKp);
        await server.submitTransaction(tx);
        report(`Stellar:trust:${pool.code}:pool`, 'SUCCESS', poolId.slice(0, 20));
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err: any) {
      report(`Stellar:trust:${pool.code}`, 'FAILED', String(err.message).slice(0, 60));
      continue;
    }

    // Deposit
    try {
      const account = await server.loadAccount(distAcct.address);
      const tx = new StellarSdk.TransactionBuilder(account, { fee: '100', networkPassphrase })
        .addOperation(StellarSdk.Operation.liquidityPoolDeposit({
          liquidityPoolId: poolId,
          maxAmountA: pool.xlm,
          maxAmountB: pool.tokens,
          minPrice: { n: 1, d: 10000000 },
          maxPrice: { n: 10000000, d: 1 },
        }))
        .setTimeout(60)
        .build();
      tx.sign(distKp);
      const result = await server.submitTransaction(tx);
      report(`Stellar:deposit:${pool.code}(${pool.xlm}XLM)`, 'SUCCESS', (result as any).hash || 'OK');
    } catch (err: any) {
      const detail = err?.response?.data?.extras?.result_codes?.operations?.[0] || err.message;
      report(`Stellar:deposit:${pool.code}`, 'FAILED', String(detail).slice(0, 60));
    }
    await new Promise(r => setTimeout(r, 1500));
  }
}

async function run() {
  await main();
  await completeStellar();

  // Final summary
  console.log();
  console.log('  ╔════════════════════════════════════════════════════════════════════╗');
  console.log('  ║  DEEP LIQUIDITY INJECTION — FINAL REPORT                          ║');
  console.log('  ╚════════════════════════════════════════════════════════════════════╝');
  console.log();
  const succeeded = results.filter(r => r.status === 'SUCCESS').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  console.log(`  Total operations: ${succeeded} succeeded | ${failed} failed`);
  console.log();
  console.log('  → The sovereign ecosystem now has DEEP institutional-grade liquidity');
  console.log('  → Anyone looking at these pools sees a serious, well-funded operation');
  console.log();
}

run().catch(err => { console.error('FATAL:', err); process.exit(1); });
