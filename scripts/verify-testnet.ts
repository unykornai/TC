#!/usr/bin/env npx ts-node
/**
 * OPTKAS Testnet Verification Script
 *
 * Queries all 9 testnet accounts (6 XRPL + 3 Stellar), verifies:
 *   - Account exists and is funded
 *   - XRP/XLM balances
 *   - Trustline configuration
 *   - Account settings (DefaultRipple, RequireAuth, etc.)
 *   - Signer lists
 *
 * Outputs a structured health report.
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { XRPLClient } from '../packages/xrpl-core/src';
import { StellarClient } from '../packages/stellar-core/src';

// ─── Types ──────────────────────────────────────────────────────

interface AccountReport {
  role: string;
  ledger: 'xrpl' | 'stellar';
  address: string;
  status: 'funded' | 'not_funded' | 'error';
  balance?: string;
  trustlines?: number;
  trustlineDetails?: Array<{ currency: string; issuer: string; limit: string; balance: string }>;
  signerList?: { quorum: number; signers: number };
  flags?: Record<string, boolean>;
  error?: string;
}

interface HealthReport {
  timestamp: string;
  network: string;
  totalAccounts: number;
  funded: number;
  notFunded: number;
  errors: number;
  accounts: AccountReport[];
  summary: string[];
}

// ─── Config ─────────────────────────────────────────────────────

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'platform-config.yaml');
const REPORT_PATH = path.join(__dirname, '..', 'config', 'testnet-health-report.json');

function loadConfig(): any {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return yaml.parse(raw);
}

// ─── XRPL Account Verification ─────────────────────────────────

async function verifyXRPLAccount(
  client: XRPLClient,
  role: string,
  address: string
): Promise<AccountReport> {
  const report: AccountReport = {
    role,
    ledger: 'xrpl',
    address,
    status: 'funded',
  };

  try {
    const info = await client.getAccountInfo(address);
    report.balance = `${info.balance} XRP`;
    report.flags = {
      defaultRipple: !!(info.flags & 0x00800000),  // lsfDefaultRipple
      requireAuth: !!(info.flags & 0x00040000),     // lsfRequireAuth
      disallowXRP: !!(info.flags & 0x00080000),     // lsfDisallowXRP
      requireDestTag: !!(info.flags & 0x00020000),  // lsfRequireDestTag
      globalFreeze: !!(info.flags & 0x00400000),    // lsfGlobalFreeze
    };

    if (info.signerList) {
      report.signerList = {
        quorum: info.signerList.signerQuorum,
        signers: info.signerList.signerEntries.length,
      };
    }

    // Query trustlines
    try {
      const trustlines = await client.getTrustlines(address);
      report.trustlines = trustlines.length;
      report.trustlineDetails = trustlines.map(tl => ({
        currency: tl.currency,
        issuer: tl.issuer,
        limit: tl.limit,
        balance: tl.balance,
      }));
    } catch { report.trustlines = 0; }

  } catch (err: any) {
    if (err.message?.includes('actNotFound')) {
      report.status = 'not_funded';
    } else {
      report.status = 'error';
      report.error = err.message;
    }
  }

  return report;
}

// ─── Stellar Account Verification ──────────────────────────────

async function verifyStellarAccount(
  client: StellarClient,
  role: string,
  publicKey: string
): Promise<AccountReport> {
  const report: AccountReport = {
    role,
    ledger: 'stellar',
    address: publicKey,
    status: 'funded',
  };

  try {
    const info = await client.getAccountInfo(publicKey);
    const native = info.balances.find(b => b.assetType === 'native');
    report.balance = native ? `${native.balance} XLM` : '0 XLM';

    const nonNative = info.balances.filter(b => b.assetType !== 'native');
    report.trustlines = nonNative.length;
    report.trustlineDetails = nonNative.map(b => ({
      currency: b.assetCode || 'unknown',
      issuer: b.assetIssuer || '',
      limit: b.limit || '0',
      balance: b.balance,
    }));

    report.flags = {
      authRequired: info.flags.authRequired,
      authRevocable: info.flags.authRevocable,
      clawbackEnabled: info.flags.authClawbackEnabled,
    };

    if (info.signers.length > 1) {
      report.signerList = {
        quorum: info.thresholds.medium,
        signers: info.signers.length,
      };
    }

  } catch (err: any) {
    if (err.message?.includes('404') || err.message?.includes('Not Found')) {
      report.status = 'not_funded';
    } else {
      report.status = 'error';
      report.error = err.message;
    }
  }

  return report;
}

// ─── Main ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('');
  console.log('  ◈ OPTKAS Testnet Verification');
  console.log('  ──────────────────────────────');
  console.log('');

  const config = loadConfig();
  const accounts: AccountReport[] = [];

  // ── Verify XRPL Accounts ────────────────────────────────────
  console.log('  ── XRPL Accounts ──');
  const xrplClient = new XRPLClient({ network: 'testnet' });

  try {
    await xrplClient.connect();
    console.log('  ✓ Connected to XRPL testnet');

    for (const [role, acct] of Object.entries(config.xrpl_accounts || {})) {
      const address = (acct as any).address;
      if (!address || address === 'null') {
        console.log(`  ⚠ ${role}: no address configured`);
        continue;
      }

      const report = await verifyXRPLAccount(xrplClient, role, address);
      accounts.push(report);

      const statusIcon = report.status === 'funded' ? '✓' : report.status === 'not_funded' ? '○' : '✗';
      console.log(`  ${statusIcon} ${role}: ${report.balance || report.status} | trustlines: ${report.trustlines || 0}`);

      if (report.flags) {
        const activeFlags = Object.entries(report.flags).filter(([_, v]) => v).map(([k]) => k);
        if (activeFlags.length > 0) {
          console.log(`    flags: ${activeFlags.join(', ')}`);
        }
      }
    }
  } finally {
    await xrplClient.disconnect();
  }

  console.log('');

  // ── Verify Stellar Accounts ─────────────────────────────────
  console.log('  ── Stellar Accounts ──');
  const stellarClient = new StellarClient({ network: 'testnet' });

  for (const [role, acct] of Object.entries(config.stellar_accounts || {})) {
    const publicKey = (acct as any).public_key;
    if (!publicKey || publicKey === 'null') {
      console.log(`  ⚠ ${role}: no public key configured`);
      continue;
    }

    const report = await verifyStellarAccount(stellarClient, role, publicKey);
    accounts.push(report);

    const statusIcon = report.status === 'funded' ? '✓' : report.status === 'not_funded' ? '○' : '✗';
    console.log(`  ${statusIcon} ${role}: ${report.balance || report.status} | trustlines: ${report.trustlines || 0}`);

    if (report.flags) {
      const activeFlags = Object.entries(report.flags).filter(([_, v]) => v).map(([k]) => k);
      if (activeFlags.length > 0) {
        console.log(`    flags: ${activeFlags.join(', ')}`);
      }
    }
  }

  console.log('');

  // ── Generate Health Report ──────────────────────────────────
  const funded = accounts.filter(a => a.status === 'funded').length;
  const notFunded = accounts.filter(a => a.status === 'not_funded').length;
  const errors = accounts.filter(a => a.status === 'error').length;

  const summary: string[] = [];
  if (funded === accounts.length) {
    summary.push('ALL accounts funded and accessible');
  } else {
    if (notFunded > 0) summary.push(`${notFunded} account(s) need funding`);
    if (errors > 0) summary.push(`${errors} account(s) have errors`);
  }

  // Check if issuer has DefaultRipple
  const issuerReport = accounts.find(a => a.role === 'issuer' && a.ledger === 'xrpl');
  if (issuerReport?.flags && !issuerReport.flags.defaultRipple) {
    summary.push('XRPL issuer: DefaultRipple NOT enabled — required for IOU issuance');
  }

  // Check trustline coverage
  const xrplAcctsWithTrustlines = accounts.filter(a => a.ledger === 'xrpl' && (a.trustlines || 0) > 0);
  if (xrplAcctsWithTrustlines.length === 0) {
    summary.push('No XRPL trustlines configured — run setup-trustlines.ts');
  }

  const healthReport: HealthReport = {
    timestamp: new Date().toISOString(),
    network: 'testnet',
    totalAccounts: accounts.length,
    funded,
    notFunded,
    errors,
    accounts,
    summary,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(healthReport, null, 2));

  // ── Print Summary ──────────────────────────────────────────
  console.log('  ════════════════════════════════════════════');
  console.log(`  Total Accounts: ${accounts.length}`);
  console.log(`  Funded:         ${funded}`);
  console.log(`  Not Funded:     ${notFunded}`);
  console.log(`  Errors:         ${errors}`);
  console.log('');
  for (const line of summary) {
    console.log(`  → ${line}`);
  }
  console.log('');
  console.log(`  Report saved: ${REPORT_PATH}`);
  console.log('  ════════════════════════════════════════════');
  console.log('');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
