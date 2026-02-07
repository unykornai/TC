#!/usr/bin/env npx ts-node
/**
 * OPTKAS Trustline Setup Script
 *
 * Configures XRPL issuer account settings and creates trustlines
 * for all OPTKAS token types across designated accounts.
 *
 * This script prepares UNSIGNED transactions that must be signed
 * via multisig before submission.
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { XRPLClient } from '../packages/xrpl-core/src';
import type { PreparedTransaction } from '../packages/xrpl-core/src';

// ─── Configuration ──────────────────────────────────────────────

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'platform-config.yaml');
const OUTPUT_DIR = path.join(__dirname, '..', 'config', 'unsigned-transactions');

interface TrustlineSetup {
  role: string;
  address: string;
  currency: string;
  issuer: string;
  limit: string;
}

interface IssuerSettings {
  defaultRipple: boolean;
  requireAuth: boolean;
  disallowXRP: boolean;
}

// ─── Load Config ────────────────────────────────────────────────

function loadConfig(): any {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return yaml.parse(raw);
}

// ─── Prepare Issuer Account Settings ────────────────────────────

async function prepareIssuerSettings(
  client: XRPLClient,
  issuerAddress: string,
  settings: IssuerSettings
): Promise<PreparedTransaction> {
  // AccountSet flags
  // asfDefaultRipple = 8, asfRequireAuth = 2, asfDisallowXRP = 3
  const setFlags: number[] = [];
  if (settings.defaultRipple) setFlags.push(8);  // asfDefaultRipple
  if (settings.requireAuth) setFlags.push(2);     // asfRequireAuth
  if (settings.disallowXRP) setFlags.push(3);     // asfDisallowXRP

  // Prepare one AccountSet per flag (XRPL only allows one flag per tx)
  // For simplicity, use the first flag; additional flags need separate txns
  const tx: any = {
    TransactionType: 'AccountSet',
    Account: issuerAddress,
  };

  if (setFlags.length > 0) {
    tx.SetFlag = setFlags[0];
  }

  return client.prepareTransaction(tx, `Set issuer account flags: DefaultRipple=${settings.defaultRipple}`);
}

// ─── Prepare Trustline Creation ─────────────────────────────────

async function prepareTrustline(
  client: XRPLClient,
  setup: TrustlineSetup
): Promise<PreparedTransaction> {
  const tx: any = {
    TransactionType: 'TrustSet',
    Account: setup.address,
    LimitAmount: {
      currency: setup.currency,
      issuer: setup.issuer,
      value: setup.limit,
    },
  };

  return client.prepareTransaction(
    tx,
    `Create ${setup.currency} trustline: ${setup.role} → issuer (limit: ${setup.limit})`
  );
}

// ─── Save Unsigned Transaction ──────────────────────────────────

function saveUnsignedTx(prepared: PreparedTransaction, filename: string): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(OUTPUT_DIR, filename);
  const output = {
    description: prepared.metadata.description,
    network: prepared.network,
    dryRun: prepared.dryRun,
    timestamp: prepared.metadata.timestamp,
    requiredSigners: prepared.metadata.requiredSigners,
    estimatedFee: prepared.metadata.estimatedFee,
    transaction: prepared.unsigned,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`  ✓ Saved: ${outputPath}`);
}

// ─── Main ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('');
  console.log('  ◈ OPTKAS Trustline Setup');
  console.log('  ────────────────────────────');
  console.log('');

  const config = loadConfig();
  const client = new XRPLClient({ network: 'testnet' });

  try {
    console.log('  Connecting to XRPL testnet...');
    await client.connect();
    console.log('  ✓ Connected');
    console.log('');

    const issuerAddress = config.xrpl_accounts.issuer.address;
    if (!issuerAddress || issuerAddress === 'null') {
      throw new Error('Issuer address not configured in platform-config.yaml');
    }

    // ── Step 1: Configure issuer account ──────────────────────
    console.log('  Step 1: Preparing issuer account settings');
    const issuerSettingsTx = await prepareIssuerSettings(client, issuerAddress, {
      defaultRipple: true,
      requireAuth: false,
      disallowXRP: false,
    });
    saveUnsignedTx(issuerSettingsTx, '01_issuer_default_ripple.json');
    console.log('');

    // ── Step 2: Create trustlines for each token ──────────────
    console.log('  Step 2: Preparing trustlines for OPTKAS.BOND');

    const tokens = config.tokens || [];
    const bondToken = tokens.find((t: any) => t.code === 'OPTKAS.BOND');
    const bondCurrency = 'OPTKAS.BOND'.length > 3
      ? Buffer.from('OPTKAS.BOND'.padEnd(20, '\0')).toString('hex').toUpperCase().substring(0, 40)
      : 'OPTKAS.BOND';
    const bondLimit = bondToken?.trustline_limit?.toString() || '100000000';

    // Accounts that need OPTKAS.BOND trustlines (all except issuer and attestation)
    const trustlineAccounts = ['treasury', 'escrow', 'amm_liquidity', 'trading'];
    let txIndex = 2;

    for (const role of trustlineAccounts) {
      const account = config.xrpl_accounts[role];
      if (!account?.address || account.address === 'null') {
        console.log(`  ⚠ Skipping ${role} — address not configured`);
        continue;
      }

      const prepared = await prepareTrustline(client, {
        role,
        address: account.address,
        currency: bondCurrency,
        issuer: issuerAddress,
        limit: bondLimit,
      });

      txIndex++;
      saveUnsignedTx(prepared, `0${txIndex}_trustline_${role}_OPTKAS_BOND.json`);
    }

    console.log('');

    // ── Step 3: Create trustlines for OPTKAS.ESCROW ───────────
    console.log('  Step 3: Preparing trustlines for OPTKAS.ESCROW');
    const escrowToken = tokens.find((t: any) => t.code === 'OPTKAS.ESCROW');
    const escrowCurrency = Buffer.from('OPTKAS.ESCROW'.padEnd(20, '\0')).toString('hex').toUpperCase().substring(0, 40);
    const escrowLimit = escrowToken?.trustline_limit?.toString() || '500000000';

    const escrowTrustlineAccounts = ['treasury', 'escrow'];
    for (const role of escrowTrustlineAccounts) {
      const account = config.xrpl_accounts[role];
      if (!account?.address || account.address === 'null') continue;

      const prepared = await prepareTrustline(client, {
        role,
        address: account.address,
        currency: escrowCurrency,
        issuer: issuerAddress,
        limit: escrowLimit,
      });

      txIndex++;
      saveUnsignedTx(prepared, `0${txIndex}_trustline_${role}_OPTKAS_ESCROW.json`);
    }

    console.log('');

    // ── Summary ──────────────────────────────────────────────
    console.log('  ════════════════════════════════════════════');
    console.log(`  Total unsigned transactions prepared: ${txIndex}`);
    console.log(`  Output directory: ${OUTPUT_DIR}`);
    console.log('');
    console.log('  IMPORTANT: These transactions are UNSIGNED.');
    console.log('  Route to multisig signers for approval before submission.');
    console.log('  ════════════════════════════════════════════');
    console.log('');

  } finally {
    await client.disconnect();
    console.log('  ✓ Disconnected from XRPL');
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
