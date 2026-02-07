/**
 * Check all OPTKAS wallet balances on mainnet
 */

import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'xrpl';
import * as StellarSdk from '@stellar/stellar-sdk';

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
  console.log('  ╔════════════════════════════════════════════════╗');
  console.log('  ║  OPTKAS WALLET BALANCE CHECK — Mainnet        ║');
  console.log('  ╚════════════════════════════════════════════════╝');
  console.log();

  const secrets: Secrets = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf-8'));

  // Check XRPL wallets
  console.log('  ═══ XRPL WALLETS ═══');
  console.log();
  
  const xrplClient = new Client('wss://xrplcluster.com');
  await xrplClient.connect();

  const xrplWallets = secrets.accounts.filter(a => a.ledger === 'xrpl');
  let xrplTotal = 0;

  for (const wallet of xrplWallets) {
    try {
      const response = await xrplClient.request({
        command: 'account_info',
        account: wallet.address,
        ledger_index: 'validated',
      });
      
      const balance = parseFloat(response.result.account_data.Balance) / 1_000_000;
      xrplTotal += balance;
      
      const funded = balance >= 10 ? '✅' : '⚠️';
      console.log(`  ${funded} ${wallet.role.padEnd(15)} ${wallet.address}  →  ${balance.toFixed(2)} XRP`);
    } catch (error: any) {
      if (error.data?.error === 'actNotFound') {
        console.log(`  ❌ ${wallet.role.padEnd(15)} ${wallet.address}  →  Not funded`);
      } else {
        console.log(`  ⚠️  ${wallet.role.padEnd(15)} ${wallet.address}  →  Error: ${error.message}`);
      }
    }
  }

  await xrplClient.disconnect();

  console.log();
  console.log(`  Total XRPL: ${xrplTotal.toFixed(2)} XRP ≈ $${(xrplTotal * 1.42).toFixed(2)}`);
  console.log();

  // Check Stellar wallets
  console.log('  ═══ STELLAR WALLETS ═══');
  console.log();

  const stellarServer = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
  const stellarWallets = secrets.accounts.filter(a => a.ledger === 'stellar');
  let stellarTotal = 0;

  for (const wallet of stellarWallets) {
    try {
      const account = await stellarServer.loadAccount(wallet.address);
      const balance = parseFloat(account.balances.find((b: any) => b.asset_type === 'native')?.balance || '0');
      stellarTotal += balance;

      const funded = balance >= 1 ? '✅' : '⚠️';
      console.log(`  ${funded} ${wallet.role.padEnd(15)} ${wallet.address.slice(0, 20)}...  →  ${balance.toFixed(2)} XLM`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`  ❌ ${wallet.role.padEnd(15)} ${wallet.address.slice(0, 20)}...  →  Not funded`);
      } else {
        console.log(`  ⚠️  ${wallet.role.padEnd(15)} ${wallet.address.slice(0, 20)}...  →  Error: ${error.message}`);
      }
    }
  }

  console.log();
  console.log(`  Total Stellar: ${stellarTotal.toFixed(2)} XLM ≈ $${(stellarTotal * 0.16).toFixed(2)}`);
  console.log();

  // Summary
  const totalUsd = (xrplTotal * 1.42) + (stellarTotal * 0.16);
  console.log('  ═══ SUMMARY ═══');
  console.log(`  XRPL:    ${xrplTotal.toFixed(2)} XRP`);
  console.log(`  Stellar: ${stellarTotal.toFixed(2)} XLM`);
  console.log(`  Total:   ≈ $${totalUsd.toFixed(2)} USD`);
  console.log();

  const xrplFunded = xrplWallets.filter(w => xrplTotal > 0).length;
  const stellarFunded = stellarWallets.filter(w => stellarTotal > 0).length;

  if (xrplFunded === 6 && stellarFunded === 3) {
    console.log('  🎉 ALL WALLETS FUNDED — Ready for DEX deployment!');
  } else if (xrplFunded === 6 && stellarFunded === 0) {
    console.log('  ⚠️  XRPL wallets funded — Need to fund 3 Stellar wallets');
    console.log('  → Use funding wizard: http://127.0.0.1:8877/funding-wizard.html');
  } else {
    console.log(`  ⚠️  ${xrplFunded}/6 XRPL + ${stellarFunded}/3 Stellar funded`);
  }
  console.log();
}

main().catch((err) => {
  console.error('\n  ✗ Fatal:', err.message);
  process.exit(1);
});
