#!/usr/bin/env ts-node
/**
 * bond-cure.ts — Bond Covenant Cure Script
 *
 * Records a cure for a covenant breach.
 * Usage: ts-node scripts/bond-cure.ts <covenantId> <breachId>
 */

import { ComplianceEngine } from '@optkas/compliance';

async function main(): Promise<void> {
  const [covenantId, breachId] = process.argv.slice(2);

  if (!covenantId || !breachId) {
    console.error('Usage: ts-node scripts/bond-cure.ts <covenantId> <breachId>');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════');
  console.log(' OPTKAS Covenant Cure Recording');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Covenant ID: ${covenantId}`);
  console.log(`Breach ID:   ${breachId}`);
  console.log('');

  const compliance = new ComplianceEngine();

  compliance.on('covenant_cured', (event) => {
    console.log('✅ CURE RECORDED');
    console.log(`   Covenant: ${event.covenantId}`);
    console.log(`   Breach:   ${event.breachId}`);
  });

  try {
    compliance.recordCure(covenantId, breachId);
    console.log('\n✅ Covenant breach cured.');
  } catch (err: any) {
    console.error(`\n❌ Cure failed: ${err.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
