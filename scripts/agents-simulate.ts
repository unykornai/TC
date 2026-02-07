#!/usr/bin/env ts-node
/**
 * agents-simulate.ts — Agent Strategy Simulation Script
 *
 * Runs a backtest simulation for a defined strategy with synthetic price data.
 * Usage: ts-node scripts/agents-simulate.ts
 */

import { AgentEngine, PricePoint } from '@optkas/agents';

function generateSyntheticPrices(points: number, startPrice: number, volatility: number): PricePoint[] {
  const data: PricePoint[] = [];
  let price = startPrice;
  const now = new Date();

  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * 2 * volatility * price;
    price += change;
    price = Math.max(price * 0.5, price); // Floor at 50% of current

    const spread = price * 0.002; // 20 bps spread
    const timestamp = new Date(now.getTime() + i * 60000); // 1-min intervals

    data.push({
      timestamp: timestamp.toISOString(),
      pair: 'XRP/USD',
      bid: (price - spread / 2).toFixed(8),
      ask: (price + spread / 2).toFixed(8),
      mid: price.toFixed(8),
      volume: (Math.random() * 100000).toFixed(2),
    });
  }

  return data;
}

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log(' OPTKAS Agent Strategy Simulation');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  const engine = new AgentEngine();

  // Define a TWAP strategy
  const strategy = engine.defineStrategy({
    name: 'XRP-USD TWAP Accumulation',
    type: 'twap',
    description: 'Time-weighted accumulation of XRP over 24 hours',
    parameters: {
      totalAmount: '10000',
      sliceCount: 24,
      orderSize: '416.67',
    },
    riskLimits: {
      maxPositionUsd: 50000,
      maxSingleOrderUsd: 5000,
      maxDailyVolumeUsd: 50000,
      maxDrawdownPct: 5,
    },
    targetPairs: [{ base: { currency: 'XRP' }, quote: { currency: 'USD' } }],
    schedule: { type: 'one_shot' },
    createdBy: 'simulation-script',
  });

  console.log(`Strategy created: ${strategy.id} (${strategy.name})`);

  // Generate synthetic price data
  const priceData = generateSyntheticPrices(1440, 0.55, 0.005);
  console.log(`Generated ${priceData.length} synthetic price points`);

  // Run simulation
  const result = engine.runSimulation({
    strategyId: strategy.id,
    startDate: priceData[0].timestamp,
    endDate: priceData[priceData.length - 1].timestamp,
    initialCapital: '100000',
    priceData,
    slippageModel: 'proportional',
    slippageBps: 5,
    feesBps: 12,
  });

  console.log('\n─── Simulation Results ─────────────────────────');
  console.log(`  Initial Capital:  $${result.initialCapital}`);
  console.log(`  Final Capital:    $${result.finalCapital}`);
  console.log(`  Total Return:     $${result.totalReturn} (${result.totalReturnPct.toFixed(2)}%)`);
  console.log(`  Max Drawdown:     $${result.maxDrawdown} (${result.maxDrawdownPct.toFixed(2)}%)`);
  console.log(`  Sharpe Ratio:     ${result.sharpeRatio.toFixed(4)}`);
  console.log(`  Trades Executed:  ${result.tradesExecuted}`);
  console.log(`  Win Rate:         ${(result.winRate * 100).toFixed(1)}%`);
  console.log(`  Avg Trade Return: $${result.avgTradeReturn}`);
  console.log(`  VaR (95% daily):  $${result.riskMetrics.varDaily95}`);
  console.log(`  Hash:             ${result.hash.substring(0, 16)}...`);
  console.log('');
  console.log('✅ Simulation complete.');
}

main().catch(console.error);
