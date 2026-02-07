/**
 * OPTKAS DEX Deployment Script — Phase 19
 * 
 * 1. Provisions initial liquidity in AMM pools
 * 2. Creates cross-chain bridge accounts
 * 3. Executes test swap: 30 XRP → XLM (to fund your Stellar wallets)
 * 
 * Run: npx ts-node scripts/deploy-dex.ts --network mainnet
 */

import * as fs from 'fs';
import * as path from 'path';
import { Client, Wallet } from 'xrpl';
import * as StellarSdk from '@stellar/stellar-sdk';
import { AMMPoolManager } from '../packages/cross-chain-dex/src/amm';
import { SwapAPI } from '../packages/cross-chain-dex/src/swap-api';

const ROOT = path.join(__dirname, '..');
const SECRETS_PATH = path.join(ROOT, 'config', '.mainnet-secrets.json');
const MANIFEST_PATH = path.join(ROOT, 'EXECUTION_v1', '05_WALLETS', 'WALLET_MANIFEST.json');

interface WalletAccount {
  role: string;
  ledger: 'xrpl' | 'stellar';
  address: string;
  seed: string;
}

interface Secrets {
  accounts: WalletAccount[];
}

async function main(): Promise<void> {
  console.log();
  console.log('  ╔═══════════════════════════════════════════════════╗');
  console.log('  ║  OPTKAS CROSS-CHAIN DEX DEPLOYMENT — Phase 19    ║');
  console.log('  ╚═══════════════════════════════════════════════════╝');
  console.log();

  // Load secrets
  if (!fs.existsSync(SECRETS_PATH)) {
    throw new Error(`Secrets not found: ${SECRETS_PATH}\nRun provision-mainnet.ts first.`);
  }
  const secrets: Secrets = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf-8'));

  const xrplTreasury = secrets.accounts.find(a => a.ledger === 'xrpl' && a.role === 'treasury')!;
  const xrplIssuer = secrets.accounts.find(a => a.ledger === 'xrpl' && a.role === 'issuer')!;
  const stellarAnchor = secrets.accounts.find(a => a.ledger === 'stellar' && a.role === 'anchor')!;
  const stellarIssuer = secrets.accounts.find(a => a.ledger === 'stellar' && a.role === 'issuer')!;

  console.log('  ▸ Loaded wallet secrets');
  console.log(`    XRPL Treasury: ${xrplTreasury.address}`);
  console.log(`    Stellar Anchor: ${stellarAnchor.address}`);
  console.log();

  // Connect to networks
  const xrplUrl = 'wss://xrplcluster.com';
  const stellarUrl = 'https://horizon.stellar.org';

  const ammManager = new AMMPoolManager(
    xrplUrl,
    stellarUrl,
    xrplTreasury.seed,
    stellarAnchor.secret
  );

  await ammManager.connect();
  console.log('  ✓ Connected to XRPL + Stellar mainnet');
  console.log();

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: PROVISION XRPL AMM POOLS
  // ═══════════════════════════════════════════════════════════

  console.log('  ═══ PHASE 1: XRPL AMM POOLS ═══');
  console.log();

  // Pool 1: XRP/USDC
  console.log('  ▸ Creating XRP/USDC pool...');
  const usdcIssuer = 'rcEGREd8NmkKRE8GE424sksyt1tJVFZwu'; // Circle USDC issuer on XRPL
  try {
    const xrpUsdcId = await ammManager.createXRPLPool(
      'XRP',
      'USD',
      '10000000000', // 10,000 XRP (in drops)
      '14200', // 14,200 USDC
      undefined,
      usdcIssuer,
      30 // 0.3% fee
    );
    console.log(`  ✓ XRP/USDC pool created: ${xrpUsdcId}`);
  } catch (error: any) {
    if (error.message.includes('tecDUPLICATE')) {
      console.log(`  ⚠ XRP/USDC pool already exists`);
    } else {
      console.error(`  ✗ Failed: ${error.message}`);
    }
  }
  console.log();

  // Pool 2: OPTKAS/USDC
  console.log('  ▸ Creating OPTKAS/USDC pool...');
  try {
    const optkasUsdcId = await ammManager.createXRPLPool(
      'OPTKAS',
      'USD',
      '50000', // 50,000 OPTKAS
      '10000', // 10,000 USDC
      xrplIssuer.address,
      usdcIssuer,
      30
    );
    console.log(`  ✓ OPTKAS/USDC pool created: ${optkasUsdcId}`);
  } catch (error: any) {
    if (error.message.includes('tecDUPLICATE')) {
      console.log(`  ⚠ OPTKAS/USDC pool already exists`);
    } else {
      console.error(`  ✗ Failed: ${error.message}`);
    }
  }
  console.log();

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: PROVISION STELLAR LIQUIDITY POOLS
  // ═══════════════════════════════════════════════════════════

  console.log('  ═══ PHASE 2: STELLAR LIQUIDITY POOLS ═══');
  console.log();

  // Pool 1: XLM/USDC
  console.log('  ▸ Creating XLM/USDC pool...');
  const stellarUsdcIssuer = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'; // Circle USDC on Stellar
  const stellarUsdc = new StellarSdk.Asset('USDC', stellarUsdcIssuer);

  try {
    const xlmUsdcId = await ammManager.createStellarPool(
      StellarSdk.Asset.native(),
      stellarUsdc,
      '100000', // 100,000 XLM
      '16000', // 16,000 USDC
      30
    );
    console.log(`  ✓ XLM/USDC pool created: ${xlmUsdcId}`);
  } catch (error: any) {
    console.error(`  ✗ Failed: ${error.message}`);
  }
  console.log();

  // Pool 2: OPTKAS/USDC on Stellar
  console.log('  ▸ Creating OPTKAS/USDC pool (Stellar)...');
  const stellarOptkas = new StellarSdk.Asset('OPTKAS', stellarIssuer.address);

  try {
    const optkasUsdcIdStellar = await ammManager.createStellarPool(
      stellarOptkas,
      stellarUsdc,
      '50000', // 50,000 OPTKAS
      '10000', // 10,000 USDC
      30
    );
    console.log(`  ✓ OPTKAS/USDC pool created: ${optkasUsdcIdStellar}`);
  } catch (error: any) {
    console.error(`  ✗ Failed: ${error.message}`);
  }
  console.log();

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: EXECUTE TEST SWAP (XRP → XLM)
  // ═══════════════════════════════════════════════════════════

  console.log('  ═══ PHASE 3: TEST SWAP (30 XRP → XLM) ═══');
  console.log();
  console.log('  This will fund your 3 Stellar wallets with ~7 XLM each');
  console.log();

  const swapApi = new SwapAPI({
    xrplUrl,
    stellarUrl,
    xrplTreasurySeed: xrplTreasury.seed,
    stellarAnchorSecret: stellarAnchor.secret,
    maxSlippage: 1.0, // 1% slippage for initial swap
    retryAttempts: 3,
  });

  await swapApi.init();

  const result = await swapApi.swapAssets(
    'XRP',
    'XLM',
    '30',
    xrplTreasury.address
  );

  if (result.success) {
    console.log();
    console.log(`  🎉 SWAP SUCCESS!`);
    console.log(`  Input: 30 XRP`);
    console.log(`  Output: ${result.actualOutput} XLM`);
    console.log(`  Fees: ${result.fees.amm} (AMM) + ${result.fees.bridge} (bridge)`);
    console.log(`  Time: ${result.executionTime}ms`);
    console.log();

    // Now distribute XLM to your 3 Stellar wallets
    console.log('  ▸ Distributing XLM to Stellar wallets...');
    const stellarClient = new StellarSdk.Horizon.Server(stellarUrl);
    const anchorKeypair = StellarSdk.Keypair.fromSecret(stellarAnchor.secret);

    const perWallet = (parseFloat(result.actualOutput) / 3).toFixed(6);

    for (const role of ['issuer', 'distribution', 'anchor']) {
      const dest = secrets.accounts.find(a => a.ledger === 'stellar' && a.role === role)!.address;
      console.log(`    → Sending ${perWallet} XLM to ${role}: ${dest}`);

      const account = await stellarClient.loadAccount(anchorKeypair.publicKey());
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.PUBLIC,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: dest,
            asset: StellarSdk.Asset.native(),
            amount: perWallet,
          })
        )
        .setTimeout(180)
        .build();

      tx.sign(anchorKeypair);
      await stellarClient.submitTransaction(tx);
      console.log(`    ✓ Sent to ${role}`);
    }

    console.log();
    console.log('  ✅ ALL WALLETS FUNDED VIA INTERNAL SWAP!');
  } else {
    console.error(`\n  ✗ Swap failed: ${result.error}`);
  }

  await ammManager.disconnect();
  await swapApi.shutdown();

  console.log();
  console.log('  ═══ DEPLOYMENT COMPLETE ═══');
  console.log('  Next: Run deploy-mainnet-trustlines.ts --network mainnet');
  console.log();
}

main().catch((err) => {
  console.error('\n  ✗ Fatal:', err.message);
  process.exit(1);
});
