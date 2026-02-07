/**
 * DIAGNOSTIC: Why does Wallet.fromSeed() derive a different address?
 * 
 * XRPL seeds starting with 'sh', 'sp', 'sn' etc = secp256k1
 * XRPL seeds starting with 'sEd' = ed25519
 * 
 * If Wallet.fromSeed() defaults to the wrong algorithm,
 * the derived address won't match the funded address → tefBAD_AUTH
 */

import * as fs from 'fs';
import * as path from 'path';
import { Wallet, ECDSA } from 'xrpl';

const SECRETS_PATH = path.join(__dirname, '..', 'config', '.mainnet-secrets.json');
const secrets = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf-8'));

console.log();
console.log('  ╔════════════════════════════════════════════════════╗');
console.log('  ║  WALLET KEY DIAGNOSTIC — Seed → Address Check     ║');
console.log('  ╚════════════════════════════════════════════════════╝');
console.log();

const xrplAccounts = secrets.accounts.filter((a: any) => a.ledger === 'xrpl');

for (const acct of xrplAccounts) {
  console.log(`  ── ${acct.role.toUpperCase()} ──`);
  console.log(`  Stored address:  ${acct.address}`);
  console.log(`  Seed prefix:     ${acct.seed.slice(0, 3)}`);

  // Try default (no algorithm specified)
  try {
    const wDefault = Wallet.fromSeed(acct.seed);
    const matchDefault = wDefault.address === acct.address;
    console.log(`  Default derive:  ${wDefault.address}  ${matchDefault ? '✅ MATCH' : '❌ MISMATCH'}`);
  } catch (e: any) {
    console.log(`  Default derive:  ERROR — ${e.message}`);
  }

  // Try explicit ed25519
  try {
    const wEd = Wallet.fromSeed(acct.seed, { algorithm: ECDSA.ed25519 });
    const matchEd = wEd.address === acct.address;
    console.log(`  ed25519 derive:  ${wEd.address}  ${matchEd ? '✅ MATCH' : '❌ MISMATCH'}`);
  } catch (e: any) {
    console.log(`  ed25519 derive:  ERROR — ${e.message}`);
  }

  // Try explicit secp256k1
  try {
    const wSecp = Wallet.fromSeed(acct.seed, { algorithm: ECDSA.secp256k1 });
    const matchSecp = wSecp.address === acct.address;
    console.log(`  secp256k1:       ${wSecp.address}  ${matchSecp ? '✅ MATCH' : '❌ MISMATCH'}`);
  } catch (e: any) {
    console.log(`  secp256k1:       ERROR — ${e.message}`);
  }

  console.log();
}
