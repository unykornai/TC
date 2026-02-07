#!/usr/bin/env ts-node
/**
 * generate-witness-config.ts — Bridge Witness Server Config Generator
 *
 * Generates configuration files for witness server deployment.
 * Usage: ts-node scripts/generate-witness-config.ts <bridgeId>
 */

import { BridgeManager } from '@optkas/bridge';
import * as fs from 'fs';
import * as path from 'path';

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log(' OPTKAS Witness Server Config Generator');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  const manager = new BridgeManager();

  // Create demo bridge for config generation
  const bridge = manager.configureBridge({
    name: 'OPTKAS Demo Bridge',
    lockingChainUrl: 'wss://s.altnet.rippletest.net:51233',
    lockingChainType: 'testnet',
    lockingDoorAddress: 'rTESTDOOR_LOCKING',
    issuingChainUrl: 'wss://sidechain-testnet.optkas.com',
    issuingChainType: 'sidechain',
    issuingDoorAddress: 'rTESTDOOR_ISSUING',
    currency: 'XRP',
    signatureReward: '100',
    minAccountCreateAmount: '10000000',
    signerQuorum: 2,
    signerEntries: [
      { address: 'rSIGNER1', weight: 1 },
      { address: 'rSIGNER2', weight: 1 },
    ],
  });

  // Register witnesses
  const w1 = manager.registerWitness(bridge.id, 'locking', {
    publicKey: 'ED_WITNESS_1_PUBLIC_KEY',
    endpoint: 'https://witness1.optkas.com:8443',
    weight: 1,
  });

  const w2 = manager.registerWitness(bridge.id, 'locking', {
    publicKey: 'ED_WITNESS_2_PUBLIC_KEY',
    endpoint: 'https://witness2.optkas.com:8443',
    weight: 1,
  });

  // Generate configs for each witness
  const configs = [
    { witness: w1, port: 9100, healthPort: 9101 },
    { witness: w2, port: 9200, healthPort: 9201 },
  ];

  for (const { witness, port, healthPort } of configs) {
    const config = manager.generateWitnessServerConfig(bridge.id, witness.id, {
      keyPath: `/opt/optkas/keys/${witness.id}.pem`,
      logPath: `/var/log/optkas/witness-${witness.id}.log`,
      metricsPort: port,
      healthCheckPort: healthPort,
    });

    console.log(`─── Witness Config: ${witness.id} ──────────────────`);
    console.log(JSON.stringify(config, null, 2));
    console.log('');
  }

  console.log('✅ Witness server configs generated.');
  console.log('   Deploy to witness nodes and start with: witness-server --config <path>');
}

main().catch(console.error);
