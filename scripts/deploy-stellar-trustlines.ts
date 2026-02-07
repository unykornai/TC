/**
 * OPTKAS Stellar Trustline + DEX Pool Deployment — Phase 19.2
 *
 * 1. Deploy USDC trustlines on all 3 Stellar wallets
 * 2. Deploy OPTKAS trustlines on distribution + anchor
 * 3. Issue initial OPTKAS token supply from issuer → distribution
 * 4. Create Stellar liquidity pool (OPTKAS/XLM)
 *
 * Institutional-grade: preflight validation, honest reporting, proper error handling.
 *
 * Usage: npx ts-node scripts/deploy-stellar-trustlines.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as StellarSdk from '@stellar/stellar-sdk';

const SECRETS_PATH = path.join(__dirname, '..', 'config', '.mainnet-secrets.json');

// ── Circle USDC on Stellar ─────────────────────────────────────
const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const USDC_ASSET = new StellarSdk.Asset('USDC', USDC_ISSUER);

// ── Result tracker ─────────────────────────────────────────────
interface TxResult {
  step: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  detail: string;
}

const results: TxResult[] = [];

// ── Helpers ────────────────────────────────────────────────────

async function submitTx(
  server: StellarSdk.Horizon.Server,
  tx: StellarSdk.Transaction,
  stepName: string,
): Promise<boolean> {
  try {
    const response = await server.submitTransaction(tx);
    if ((response as any).successful) {
      const hash = (response as any).hash || 'OK';
      console.log(`    ✅ ${stepName}: ${hash.slice(0, 16)}...`);
      results.push({ step: stepName, status: 'SUCCESS', detail: hash });
      return true;
    } else {
      const detail = JSON.stringify((response as any).extras?.result_codes || response);
      console.error(`    ❌ ${stepName}: ${detail.slice(0, 80)}`);
      results.push({ step: stepName, status: 'FAILED', detail });
      return false;
    }
  } catch (error: any) {
    // Check for op_already_exists (trustline already set)
    const resultCodes = error?.response?.data?.extras?.result_codes;
    if (resultCodes?.operations?.includes('op_already_exists') ||
        resultCodes?.operations?.includes('changeTrustAlreadyExists')) {
      console.log(`    ⚠️  ${stepName}: Already exists`);
      results.push({ step: stepName, status: 'SKIPPED', detail: 'Already exists' });
      return true;
    }
    const detail = resultCodes
      ? JSON.stringify(resultCodes)
      : error.message || String(error);
    console.error(`    ❌ ${stepName}: ${detail.slice(0, 100)}`);
    results.push({ step: stepName, status: 'FAILED', detail });
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log();
  console.log('  ╔════════════════════════════════════════════════════════════╗');
  console.log('  ║  OPTKAS STELLAR DEPLOYMENT — Phase 19.2                   ║');
  console.log('  ╚════════════════════════════════════════════════════════════╝');
  console.log();

  // ── Load secrets ──────────────────────────────────────────────
  const secrets = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf-8'));
  const stellarAccounts = secrets.accounts.filter((a: any) => a.ledger === 'stellar');

  // ── Step 0: Preflight — validate all keys ─────────────────────
  console.log('  ═══ STEP 0: KEY VALIDATION ═══');
  console.log();

  const wallets: { role: string; keypair: StellarSdk.Keypair; address: string }[] = [];
  let allValid = true;

  for (const acct of stellarAccounts) {
    const kp = StellarSdk.Keypair.fromSecret(acct.seed);
    const match = kp.publicKey() === acct.address;
    const icon = match ? '✅' : '❌';
    console.log(`  ${icon} ${acct.role.padEnd(15)} ${acct.address.slice(0, 20)}...${acct.address.slice(-6)}`);
    if (!match) {
      allValid = false;
      console.log(`     ⚠  MISMATCH: derived ${kp.publicKey().slice(0, 20)}...`);
    }
    wallets.push({ role: acct.role, keypair: kp, address: acct.address });
  }

  console.log();
  if (!allValid) {
    console.error('  🔴 ABORTING: Key mismatches detected.');
    process.exit(1);
  }
  console.log('  ✅ All Stellar keys validated');
  console.log();

  // ── Connect to Stellar Horizon ────────────────────────────────
  const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
  const networkPassphrase = StellarSdk.Networks.PUBLIC;

  // Verify all accounts exist and are funded
  console.log('  ═══ STEP 1: ACCOUNT VERIFICATION ═══');
  console.log();

  for (const w of wallets) {
    try {
      const account = await server.loadAccount(w.address);
      const xlmBalance = account.balances.find(
        (b: any) => b.asset_type === 'native'
      );
      console.log(`  ✅ ${w.role.padEnd(15)} ${(xlmBalance as any)?.balance || '?'} XLM`);
    } catch (error: any) {
      console.error(`  ❌ ${w.role.padEnd(15)} Account not found or not funded`);
      results.push({ step: `verify:${w.role}`, status: 'FAILED', detail: 'Not funded' });
    }
  }
  console.log();

  // ── Step 2: Deploy USDC Trustlines ────────────────────────────
  console.log('  ═══ STEP 2: USDC TRUSTLINES ═══');
  console.log();

  for (const w of wallets) {
    console.log(`  ▸ ${w.role.padEnd(15)} → USDC trustline`);
    try {
      const account = await server.loadAccount(w.address);
      
      // Check if trustline already exists
      const existingTrust = account.balances.find(
        (b: any) => b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER
      );
      if (existingTrust) {
        console.log(`    ⚠️  Already exists (balance: ${(existingTrust as any).balance})`);
        results.push({ step: `USDC:${w.role}`, status: 'SKIPPED', detail: 'Already exists' });
        continue;
      }

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase,
      })
        .addOperation(StellarSdk.Operation.changeTrust({
          asset: USDC_ASSET,
          limit: '1000000000', // 1B limit
        }))
        .setTimeout(30)
        .build();

      tx.sign(w.keypair);
      await submitTx(server, tx, `USDC:${w.role}`);
    } catch (error: any) {
      console.error(`    ❌ ${error.message}`);
      results.push({ step: `USDC:${w.role}`, status: 'FAILED', detail: error.message });
    }
  }
  console.log();

  // ── Step 3: Deploy OPTKAS Trustlines ──────────────────────────
  console.log('  ═══ STEP 3: OPTKAS TOKEN TRUSTLINES ═══');
  console.log();

  const issuer = wallets.find(w => w.role === 'issuer')!;
  const distribution = wallets.find(w => w.role === 'distribution')!;
  const anchor = wallets.find(w => w.role === 'anchor')!;

  // OPTKAS asset issued by our issuer wallet
  const OPTKAS_ASSET = new StellarSdk.Asset('OPTKAS', issuer.address);

  // Distribution and anchor need to trust OPTKAS from issuer
  for (const w of [distribution, anchor]) {
    console.log(`  ▸ ${w.role.padEnd(15)} → OPTKAS trustline`);
    try {
      const account = await server.loadAccount(w.address);

      // Check if trustline already exists
      const existingTrust = account.balances.find(
        (b: any) => b.asset_code === 'OPTKAS' && b.asset_issuer === issuer.address
      );
      if (existingTrust) {
        console.log(`    ⚠️  Already exists (balance: ${(existingTrust as any).balance})`);
        results.push({ step: `OPTKAS:${w.role}`, status: 'SKIPPED', detail: 'Already exists' });
        continue;
      }

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase,
      })
        .addOperation(StellarSdk.Operation.changeTrust({
          asset: OPTKAS_ASSET,
          limit: '1000000000',
        }))
        .setTimeout(30)
        .build();

      tx.sign(w.keypair);
      await submitTx(server, tx, `OPTKAS:${w.role}`);
    } catch (error: any) {
      console.error(`    ❌ ${error.message}`);
      results.push({ step: `OPTKAS:${w.role}`, status: 'FAILED', detail: error.message });
    }
  }
  console.log();

  // ── Step 4: Issue initial OPTKAS supply ───────────────────────
  console.log('  ═══ STEP 4: OPTKAS TOKEN ISSUANCE ═══');
  console.log();
  console.log('  ▸ Issuing 1,000,000 OPTKAS → distribution wallet');

  try {
    const issuerAccount = await server.loadAccount(issuer.address);

    const tx = new StellarSdk.TransactionBuilder(issuerAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(StellarSdk.Operation.payment({
        destination: distribution.address,
        asset: OPTKAS_ASSET,
        amount: '1000000', // 1M initial supply
      }))
      .setTimeout(30)
      .build();

    tx.sign(issuer.keypair);
    await submitTx(server, tx, 'OPTKAS:issue→distribution');
  } catch (error: any) {
    console.error(`    ❌ ${error.message}`);
    results.push({ step: 'OPTKAS:issue→distribution', status: 'FAILED', detail: error.message });
  }
  console.log();

  // ── Step 5: Create XLM/OPTKAS Liquidity Pool ─────────────────
  console.log('  ═══ STEP 5: XLM/OPTKAS LIQUIDITY POOL ═══');
  console.log();

  // The distribution wallet will provide initial liquidity
  // Pool: native XLM + OPTKAS token
  const poolAssetA = StellarSdk.Asset.native(); // XLM
  const poolAssetB = OPTKAS_ASSET;
  const liquidityPoolAsset = new StellarSdk.LiquidityPoolAsset(poolAssetA, poolAssetB, StellarSdk.LiquidityPoolFeeV18);

  console.log('  ▸ Distribution trusts liquidity pool share...');
  try {
    const distAccount = await server.loadAccount(distribution.address);

    // First: trust the liquidity pool share
    const trustPoolTx = new StellarSdk.TransactionBuilder(distAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(StellarSdk.Operation.changeTrust({
        asset: liquidityPoolAsset,
      }))
      .setTimeout(30)
      .build();

    trustPoolTx.sign(distribution.keypair);
    const poolTrustOk = await submitTx(server, trustPoolTx, 'Pool:trust');

    if (poolTrustOk) {
      // Deposit liquidity: 10 XLM + 10,000 OPTKAS (initial price: 1 OPTKAS = 0.001 XLM)
      console.log('  ▸ Depositing 10 XLM + 10,000 OPTKAS...');

      // Need to get the pool ID
      const poolId = StellarSdk.getLiquidityPoolId(
        'constant_product',
        liquidityPoolAsset.getLiquidityPoolParameters()
      ).toString('hex');

      const distAccount2 = await server.loadAccount(distribution.address);
      const depositTx = new StellarSdk.TransactionBuilder(distAccount2, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase,
      })
        .addOperation(StellarSdk.Operation.liquidityPoolDeposit({
          liquidityPoolId: poolId,
          maxAmountA: '10',       // 10 XLM
          maxAmountB: '10000',    // 10,000 OPTKAS
          minPrice: { n: 1, d: 1000 },  // min price ratio
          maxPrice: { n: 1000, d: 1 },  // max price ratio
        }))
        .setTimeout(30)
        .build();

      depositTx.sign(distribution.keypair);
      await submitTx(server, depositTx, 'Pool:deposit');
    }
  } catch (error: any) {
    console.error(`    ❌ ${error.message}`);
    results.push({ step: 'Pool', status: 'FAILED', detail: error.message });
  }
  console.log();

  // ══════════════════════════════════════════════════════════════
  //  DEPLOYMENT REPORT
  // ══════════════════════════════════════════════════════════════
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
    console.log('  🔴 DEPLOYMENT INCOMPLETE — Review failures above');
    process.exit(1);
  } else {
    console.log('  🟢 ALL STELLAR OPERATIONS COMPLETE');
    console.log('  → USDC trustlines active on all wallets');
    console.log('  → OPTKAS token issued to distribution');
    console.log('  → XLM/OPTKAS liquidity pool live');
  }
}

main().catch(err => {
  console.error('  FATAL:', err);
  process.exit(1);
});
