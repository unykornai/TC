#!/usr/bin/env ts-node
/**
 * create-door-accounts.ts — Bridge Door Account Setup Script
 *
 * Prepares door account configuration for an XChainBridge deployment.
 * Usage: ts-node scripts/create-door-accounts.ts
 */

import { BridgeManager } from '@optkas/bridge';

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log(' OPTKAS Bridge Door Account Configuration');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  const bridge = new BridgeManager();

  // Configure bridge between mainnet and sidechain
  const config = bridge.configureBridge({
    name: 'OPTKAS Mainnet ↔ Sidechain Bridge',
    lockingChainUrl: 'wss://xrplcluster.com',
    lockingChainType: 'mainnet',
    lockingDoorAddress: 'rBRIDGE_LOCKING_DOOR_ADDRESS',
    issuingChainUrl: 'wss://sidechain.optkas.com',
    issuingChainType: 'sidechain',
    issuingDoorAddress: 'rBRIDGE_ISSUING_DOOR_ADDRESS',
    currency: 'XRP',
    signatureReward: '100',
    minAccountCreateAmount: '10000000',
    signerQuorum: 2,
    signerEntries: [
      { address: 'rSIGNER1', weight: 1 },
      { address: 'rSIGNER2', weight: 1 },
      { address: 'rSIGNER3', weight: 1 },
    ],
  });

  console.log(`Bridge configured: ${config.id} (${config.name})`);
  console.log('');
  console.log('─── Locking Chain (Mainnet) Door Account ─────────');
  console.log(`  Address:          ${config.lockingChain.doorAccountAddress}`);
  console.log(`  Disable Master:   ${config.lockingChain.doorAccountSettings.disableMasterKey}`);
  console.log(`  Require Multisig: ${config.lockingChain.doorAccountSettings.requireMultisig}`);
  console.log(`  Signer Quorum:    ${config.lockingChain.doorAccountSettings.signerQuorum}`);
  console.log(`  Signers:          ${config.lockingChain.doorAccountSettings.signerEntries.length}`);
  console.log('');
  console.log('─── Issuing Chain (Sidechain) Door Account ───────');
  console.log(`  Address:          ${config.issuingChain.doorAccountAddress}`);
  console.log(`  Disable Master:   ${config.issuingChain.doorAccountSettings.disableMasterKey}`);
  console.log(`  Require Multisig: ${config.issuingChain.doorAccountSettings.requireMultisig}`);
  console.log(`  Signer Quorum:    ${config.issuingChain.doorAccountSettings.signerQuorum}`);
  console.log(`  Signers:          ${config.issuingChain.doorAccountSettings.signerEntries.length}`);
  console.log('');
  console.log('⚠️  IMPORTANT:');
  console.log('  1. Generate door account keys via HSM/KMS — NEVER in code');
  console.log('  2. Fund accounts with minimum reserve + signature reward');
  console.log('  3. Configure SignerListSet on both door accounts');
  console.log('  4. Disable master key after multisig configured');
  console.log('  5. Register witnesses before activating bridge');
  console.log('');
  console.log('✅ Door account configuration generated.');
}

main().catch(console.error);
