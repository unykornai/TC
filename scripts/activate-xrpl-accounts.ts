/**
 * Activate XRPL accounts by having them send a self-payment
 * This ensures the accounts are fully active on the ledger before setting trustlines
 */

import * as fs from 'fs';
import * as path from 'path';
import { Client, Wallet, Payment } from 'xrpl';

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
  console.log('  ║  ACTIVATE XRPL ACCOUNTS — MAINNET LIVE          ║');
  console.log('  ╚═══════════════════════════════════════════════════╝');
  console.log();

  const secrets: Secrets = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf-8'));
  const xrplWallets = secrets.accounts.filter(a => a.ledger === 'xrpl');

  const client = new Client('wss://xrplcluster.com');
  await client.connect();
  console.log('  ✓ Connected to XRPL mainnet');
  console.log();

  for (const wallet of xrplWallets) {
    const w = Wallet.fromSeed(wallet.seed);
    
    console.log(`  ▸ ${wallet.role.padEnd(15)} ${wallet.address}`);
    
    try {
      // Send 1 XRP to self to activate account
      const payment: Payment = {
        TransactionType: 'Payment',
        Account: w.address,
        Destination: w.address,
        Amount: '1000000', // 1 XRP in drops
      };
      
      const prepared = await client.autofill(payment);
      const signed = w.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);
      
      console.log(`    ✓ Activated: ${result.result.hash.slice(0, 16)}...`);
    } catch (error: any) {
      console.error(`    ✗ Error: ${error.message}`);
    }
  }
  
  await client.disconnect();
  
  console.log();
  console.log('  ✅ ALL ACCOUNTS ACTIVATED');
  console.log('  → Now run: npx ts-node scripts/deploy-trustlines-auto.ts');
  console.log();
}

main().catch((err) => {
  console.error('\n  ✗ Fatal:', err.message);
  process.exit(1);
});
