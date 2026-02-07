#!/usr/bin/env ts-node
/**
 * bond-transition.ts — Bond Status Transition Script
 *
 * Transitions a bond through its lifecycle states with governance validation.
 * Usage: ts-node scripts/bond-transition.ts <bondId> <newStatus> <reason>
 */

import { BondEngine, BondStatus } from '@optkas/bond';
import { XRPLClient } from '@optkas/xrpl-core';

async function main(): Promise<void> {
  const [bondId, newStatus, ...reasonParts] = process.argv.slice(2);

  if (!bondId || !newStatus) {
    console.error('Usage: ts-node scripts/bond-transition.ts <bondId> <newStatus> <reason>');
    console.error('Valid statuses: draft, approved, offering, funded, active, matured, redeemed, defaulted, cancelled');
    process.exit(1);
  }

  const reason = reasonParts.join(' ') || 'Manual transition';

  console.log('═══════════════════════════════════════════════════');
  console.log(' OPTKAS Bond Status Transition');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Bond ID:    ${bondId}`);
  console.log(`New Status: ${newStatus}`);
  console.log(`Reason:     ${reason}`);
  console.log('');

  const client = new XRPLClient({ network: 'testnet' });
  const engine = new BondEngine(client);

  engine.on('status_changed', (event) => {
    console.log(`✅ Status changed: ${event.from} → ${event.to}`);
    console.log(`   Reason: ${event.reason}`);
  });

  try {
    engine.transitionStatus(bondId, newStatus as BondStatus, reason);
    console.log('\n✅ Transition complete.');
  } catch (err: any) {
    console.error(`\n❌ Transition failed: ${err.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
