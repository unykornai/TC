#!/usr/bin/env ts-node
/**
 * pathfind-quote.ts — Cross-Currency Path Finding & Quote Script
 *
 * Queries XRPL pathfinding to find optimal cross-currency routes.
 * Usage: ts-node scripts/pathfind-quote.ts <sourceAddr> <destAddr> <destCurrency> <destIssuer> <amount>
 */

import { XRPLClient } from '@optkas/xrpl-core';

interface PathResult {
  source_amount: string | { currency: string; issuer?: string; value: string };
  paths_computed: unknown[];
  destination_amount: string | { currency: string; issuer?: string; value: string };
}

async function main(): Promise<void> {
  const [sourceAddr, destAddr, destCurrency, destIssuer, amount] = process.argv.slice(2);

  console.log('═══════════════════════════════════════════════════');
  console.log(' OPTKAS Cross-Currency Pathfind Quote');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  if (!sourceAddr || !destAddr || !destCurrency || !amount) {
    console.log('Usage: ts-node scripts/pathfind-quote.ts <sourceAddr> <destAddr> <destCurrency> <destIssuer> <amount>');
    console.log('');
    console.log('Example (XRP → USD):');
    console.log('  ts-node scripts/pathfind-quote.ts rSource rDest USD rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B 1000');
    console.log('');
    console.log('NOTE: This script requires a live XRPL connection.');
    console.log('      In dry-run mode, it demonstrates the pathfind request structure.');

    // Show example request structure
    const exampleRequest = {
      command: 'ripple_path_find',
      source_account: 'rExampleSourceAddress',
      destination_account: 'rExampleDestAddress',
      destination_amount: {
        currency: 'USD',
        issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
        value: '1000',
      },
    };

    console.log('\n─── Example Pathfind Request ────────────────────');
    console.log(JSON.stringify(exampleRequest, null, 2));

    // Show what a response looks like
    const exampleResponse = {
      alternatives: [
        {
          paths_computed: [
            [{ currency: 'XRP' }, { currency: 'USD', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B' }],
          ],
          source_amount: '1875000000', // drops
          destination_amount: { currency: 'USD', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B', value: '1000' },
        },
      ],
    };

    console.log('\n─── Example Pathfind Response ───────────────────');
    console.log(JSON.stringify(exampleResponse, null, 2));
    console.log('');
    console.log('The response shows the best cross-currency path and required source amount.');
    console.log('Use this to construct a Payment transaction with Paths field.');
    return;
  }

  // Live mode
  const client = new XRPLClient({ network: 'testnet' });

  try {
    await client.connect();
    console.log(`Connected to XRPL ${client.network}`);

    const destAmount = destCurrency === 'XRP'
      ? XRPLClient.xrpToDrops(amount)
      : { currency: destCurrency, issuer: destIssuer, value: amount };

    console.log(`\nFinding paths: ${sourceAddr} → ${destAddr}`);
    console.log(`Destination: ${amount} ${destCurrency}`);
    console.log('');

    // Note: In production, use client.request with ripple_path_find
    console.log('⚠️  Live pathfinding requires direct XRPL request.');
    console.log('   Use XRPLClient to submit: { command: "ripple_path_find", ... }');

    await client.disconnect();
  } catch (err: any) {
    console.error(`Connection error: ${err.message}`);
    console.log('Run in offline mode (no arguments) for request structure examples.');
  }
}

main().catch(console.error);
