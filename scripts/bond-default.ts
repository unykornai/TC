#!/usr/bin/env ts-node
/**
 * bond-default.ts — Bond Default Declaration Script
 *
 * Triggers a default event on a bond with full audit trail.
 * Usage: ts-node scripts/bond-default.ts <bondId> <reason> <triggeredBy>
 */

import { BondEngine } from '@optkas/bond';
import { XRPLClient } from '@optkas/xrpl-core';

async function main(): Promise<void> {
  const [bondId, reason, triggeredBy] = process.argv.slice(2);

  if (!bondId || !reason || !triggeredBy) {
    console.error('Usage: ts-node scripts/bond-default.ts <bondId> <reason> <triggeredBy>');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════');
  console.log(' OPTKAS Bond Default Declaration');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Bond ID:      ${bondId}`);
  console.log(`Reason:       ${reason}`);
  console.log(`Triggered By: ${triggeredBy}`);
  console.log('');

  const client = new XRPLClient({ network: 'testnet' });
  const engine = new BondEngine(client);

  engine.on('bond_defaulted', (event) => {
    console.log('⚠️  DEFAULT EVENT RECORDED');
    console.log(`   Outstanding Balance: ${event.outstandingBalance}`);
    console.log(`   Participants:        ${event.participants}`);
    console.log(`   Timestamp:           ${event.timestamp}`);
  });

  try {
    engine.triggerDefault(bondId, reason, triggeredBy);
    console.log('\n✅ Default recorded. Notify trustee and all participants.');
  } catch (err: any) {
    console.error(`\n❌ Default failed: ${err.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
