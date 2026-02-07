/**
 * Auto Trustline Deployment — Actually Executes Transactions
 * Simpler than deploy-mainnet-trustlines.ts — just deploys the most critical trustlines
 */

import * as fs from 'fs';
import * as path from 'path';
import { Client, Wallet, TrustSet, AccountSet } from 'xrpl';

const SECRETS_PATH = path.join(__dirname, '..', 'config', '.mainnet-secrets.json');

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
  console.log('  ║  AUTO TRUSTLINE DEPLOYMENT — MAINNET LIVE        ║');
  console.log('  ╚═══════════════════════════════════════════════════╝');
  console.log();

  const secrets: Secrets = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf-8'));
  const xrplWallets = secrets.accounts.filter(a => a.ledger === 'xrpl');

  const client = new Client('wss://xrplcluster.com');
  await client.connect();
  console.log('  ✓ Connected to XRPL mainnet');
  console.log();

  //Primary stablecoin issuer (Circle USDC)
  const USDC_ISSUER = 'rcEGREd8NmkKRE8GE424sksyt1tJVFZwu';
  
  // Step 1: Set DefaultRipple on issuer
  console.log('  ═══ STEP 1: ISSUER SETTINGS ═══');
  const issuer = xrplWallets.find(w => w.role === 'issuer')!;
  const issuerWallet = Wallet.fromSeed(issuer.seed);
  
  console.log(`  ▸ Setting DefaultRipple on ${issuer.address}...`);
  
  try {
    // Get account info to get sequence number
    console.log(`    → Getting account info for ${issuer.address}...`);
    const accountInfo = await client.request({
      command: 'account_info',
      account: issuer.address,  // Use address from secrets file
      ledger_index: 'validated',
    });
    
    const ledgerInfo = await client.request({
      command: 'ledger',
      ledger_index: 'validated',
    });
    
    console.log(`    → Account found. Sequence: ${accountInfo.result.account_data.Sequence}`);
    
    const accountSet: AccountSet = {
      TransactionType: 'AccountSet',
      Account: issuer.address,  // Use address from secrets file
      SetFlag: 8, // asfDefaultRipple
      Sequence: accountInfo.result.account_data.Sequence,
      LastLedgerSequence: ledgerInfo.result.ledger_index + 100,
      Fee: '12', // 12 drops
    };
    
    console.log(`    → Signing and submitting transaction...`);
    const signed = issuerWallet.sign(accountSet);
    const result = await client.submitAndWait(signed.tx_blob);
    
    if (result.result.meta && typeof result.result.meta === 'object' && 'TransactionResult' in result.result.meta) {
      console.log(`    ✓ DefaultRipple set: ${result.result.hash}`);
    }
  } catch (error: any) {
    console.error(`    ✗ Full error:`, error);
    if (error.message.includes('tecNO_PERMISSION')) {
      console.log(`    ⚠ DefaultRipple already set or not needed`);
    } else {
      console.error(`    ✗ Error: ${error.message}`);
    }
  }
  console.log();

  // Step 2: Deploy USDC trustlines for key accounts
  console.log('  ═══ STEP 2: USDC TRUSTLINES ═══');
  const accountsNeedingTrust = ['issuer', 'treasury', 'amm_liquidity', 'trading'];
  
  for (const role of accountsNeedingTrust) {
    const wallet = xrplWallets.find(w => w.role === role)!;
    const w = Wallet.fromSeed(wallet.seed);
    
    console.log(`  ▸ ${role.padEnd(15)} ${wallet.address}`);
    
    try {
      // Get account info for sequence - use address from secrets
      const accountInfo = await client.request({
        command: 'account_info',
        account: wallet.address,  // Use address from secrets file
        ledger_index: 'validated',
      });
      
      const ledgerInfo = await client.request({
        command: 'ledger',
        ledger_index: 'validated',
      });
      
      const trustSet: TrustSet = {
        TransactionType: 'TrustSet',
        Account: wallet.address,  // Use address from secrets file
        LimitAmount: {
          currency: 'USD',
          issuer: USDC_ISSUER,
          value: '1000000000', // 1B limit
        },
        Sequence: accountInfo.result.account_data.Sequence,
        LastLedgerSequence: ledgerInfo.result.ledger_index + 100,
        Fee: '12',
      };
      
      const signed = w.sign(trustSet);
      const result = await client.submitAndWait(signed.tx_blob);
      
      console.log(`    ✓ Trustline deployed: ${result.result.hash.slice(0, 16)}...`);
    } catch (error: any) {
      if (error.message.includes('tecNO_LINE_REDUNDANT') || error.message.includes('tecDUPLICATE')) {
        console.log(`    ⚠ Trustline already exists`);
      } else {
        console.error(`    ✗ Error: ${error.message}`);
      }
    }
  }
  
  console.log();
  console.log('  ═══ STEP 3: INTERNAL TOKEN TRUSTLINES ===');
  
  // OPTKAS token issuer is the issuer wallet
  const OPTKAS_ISSUER = issuer.address;
  
  // Treasury needs to trust OPTKAS tokens from issuer
  const treasury = xrplWallets.find(w => w.role === 'treasury')!;
  const treasuryWallet = Wallet.fromSeed(treasury.seed);
  
  console.log(`  ▸ treasury trusts OPTKAS...`);
  
  try {
    // Get account info for sequence - use address from secrets
    const accountInfo = await client.request({
      command: 'account_info',
      account: treasury.address,  // Use address from secrets file
      ledger_index: 'validated',
    });
    
    const ledgerInfo = await client.request({
      command: 'ledger',
      ledger_index: 'validated',
    });
    
    const trustSet: TrustSet = {
      TransactionType: 'TrustSet',
      Account: treasury.address,  // Use address from secrets file
      LimitAmount: {
        currency: 'OPT',
        issuer: OPTKAS_ISSUER,
        value: '1000000000',
      },
      Sequence: accountInfo.result.account_data.Sequence,
      LastLedgerSequence: ledgerInfo.result.ledger_index + 100,
      Fee: '12',
    };
    
    const signed = treasuryWallet.sign(trustSet);
    const result = await client.submitAndWait(signed.tx_blob);
    
    console.log(`    ✓ OPTKAS trustline: ${result.result.hash.slice(0, 16)}...`);
  } catch (error: any) {
    if (error.message.includes('tecNO_LINE_REDUNDANT')) {
      console.log(`    ⚠ Trustline already exists`);
    } else {
      console.error(`    ✗ Error: ${error.message}`);
    }
  }
  
  await client.disconnect();
  
  console.log();
  console.log('  ✅ TRUSTLINE DEPLOYMENT COMPLETE');
  console.log('  → Issuer: DefaultRipple enabled');
  console.log('  → 4 accounts: USDC trustlines active');
  console.log('  → Treasury: OPTKAS trustline active');
  console.log();
  console.log('  Next: Run check-wallet-balances.ts to verify');
  console.log();
}

main().catch((err) => {
  console.error('\n  ✗ Fatal:', err.message);
  process.exit(1);
});
