/**
 * OPTKAS Pathfinder — Optimal Swap Route Discovery
 * 
 * Finds the best path for any-to-any swaps across XRPL and Stellar:
 * - Direct pool swap (XRP → USDC)
 * - 1-hop swap (XRP → USDC → OPTKAS)
 * - Cross-chain swap (XRP → USDC → [Bridge] → XLM)
 * 
 * Considers fees, slippage, and execution time.
 */

import { AMMPoolManager, PoolReserves, SwapQuote } from './amm';
import BigNumber from 'bignumber.js';

export interface SwapPath {
  steps: SwapStep[];
  totalFee: string;
  totalSlippage: number; // %
  estimatedOutput: string;
  estimatedTime: number; // seconds
}

export interface SwapStep {
  from: { ledger: string; asset: string; amount: string };
  to: { ledger: string; asset: string; amount: string };
  via: 'amm' | 'bridge';
  poolId?: string;
  fee: string;
}

export class Pathfinder {
  private ammManager: AMMPoolManager;
  private xrplPools: Map<string, PoolReserves> = new Map();
  private stellarPools: Map<string, PoolReserves> = new Map();

  constructor(ammManager: AMMPoolManager) {
    this.ammManager = ammManager;
  }

  /**
   * Load all pool states (call once at startup or periodically)
   */
  async loadPoolStates(): Promise<void> {
    console.log('▸ Loading pool states...');

    // XRPL pools
    const xrpUsdc = await this.ammManager.getXRPLPoolState('XRP', 'USDC', undefined, process.env.USDC_ISSUER);
    this.xrplPools.set('XRP/USDC', xrpUsdc);

    const optkasUsdc = await this.ammManager.getXRPLPoolState(
      'OPTKAS',
      'USDC',
      process.env.OPTKAS_ISSUER,
      process.env.USDC_ISSUER
    );
    this.xrplPools.set('OPTKAS/USDC', optkasUsdc);

    // Stellar pools
    const xlmUsdc = await this.ammManager.getStellarPoolState(process.env.XLM_USDC_POOL_ID!);
    this.stellarPools.set('XLM/USDC', xlmUsdc);

    const stellarOptkas = await this.ammManager.getStellarPoolState(process.env.STELLAR_OPTKAS_POOL_ID!);
    this.stellarPools.set('OPTKAS/USDC', stellarOptkas);

    console.log(`  ✓ Loaded ${this.xrplPools.size} XRPL pools + ${this.stellarPools.size} Stellar pools`);
  }

  /**
   * Find optimal swap path
   */
  async findPath(
    fromLedger: 'xrpl' | 'stellar',
    fromAsset: string,
    toLedger: 'xrpl' | 'stellar',
    toAsset: string,
    amount: string
  ): Promise<SwapPath> {
    console.log(`\n▸ Finding path: ${fromAsset} (${fromLedger}) → ${toAsset} (${toLedger})`);

    // Case 1: Same ledger, direct pool
    if (fromLedger === toLedger) {
      const poolKey = `${fromAsset}/${toAsset}`;
      const reverseKey = `${toAsset}/${fromAsset}`;
      const pools = fromLedger === 'xrpl' ? this.xrplPools : this.stellarPools;

      if (pools.has(poolKey) || pools.has(reverseKey)) {
        return this.buildDirectPath(fromLedger, fromAsset, toAsset, amount, pools);
      }

      // Case 2: Same ledger, 1-hop via USDC
      return this.buildOneHopPath(fromLedger, fromAsset, toAsset, amount, pools);
    }

    // Case 3: Cross-chain via stablecoin bridge
    return this.buildCrossChainPath(fromLedger, fromAsset, toLedger, toAsset, amount);
  }

  /**
   * Direct pool swap (e.g., XRP → USDC)
   */
  private buildDirectPath(
    ledger: 'xrpl' | 'stellar',
    fromAsset: string,
    toAsset: string,
    amount: string,
    pools: Map<string, PoolReserves>
  ): SwapPath {
    const poolKey = pools.has(`${fromAsset}/${toAsset}`)
      ? `${fromAsset}/${toAsset}`
      : `${toAsset}/${fromAsset}`;

    const pool = pools.get(poolKey)!;
    const quote = this.ammManager.quoteXRPLSwap(pool, fromAsset, amount);

    return {
      steps: [
        {
          from: { ledger, asset: fromAsset, amount },
          to: { ledger, asset: toAsset, amount: quote.outputAmount },
          via: 'amm',
          poolId: poolKey,
          fee: quote.fee,
        },
      ],
      totalFee: quote.fee,
      totalSlippage: quote.priceImpact,
      estimatedOutput: quote.outputAmount,
      estimatedTime: 4, // ~4 seconds per ledger close
    };
  }

  /**
   * 1-hop swap via USDC (e.g., XRP → USDC → OPTKAS)
   */
  private buildOneHopPath(
    ledger: 'xrpl' | 'stellar',
    fromAsset: string,
    toAsset: string,
    amount: string,
    pools: Map<string, PoolReserves>
  ): SwapPath {
    // Step 1: fromAsset → USDC
    const pool1 = pools.get(`${fromAsset}/USDC`)!;
    const quote1 = this.ammManager.quoteXRPLSwap(pool1, fromAsset, amount);

    // Step 2: USDC → toAsset
    const pool2 = pools.get(`${toAsset}/USDC`) || pools.get(`USDC/${toAsset}`)!;
    const quote2 = this.ammManager.quoteXRPLSwap(pool2, 'USDC', quote1.outputAmount);

    const totalFee = new BigNumber(quote1.fee).plus(quote2.fee).toFixed(6);
    const totalSlippage = quote1.priceImpact + quote2.priceImpact;

    return {
      steps: [
        {
          from: { ledger, asset: fromAsset, amount },
          to: { ledger, asset: 'USDC', amount: quote1.outputAmount },
          via: 'amm',
          poolId: `${fromAsset}/USDC`,
          fee: quote1.fee,
        },
        {
          from: { ledger, asset: 'USDC', amount: quote1.outputAmount },
          to: { ledger, asset: toAsset, amount: quote2.outputAmount },
          via: 'amm',
          poolId: `USDC/${toAsset}`,
          fee: quote2.fee,
        },
      ],
      totalFee,
      totalSlippage,
      estimatedOutput: quote2.outputAmount,
      estimatedTime: 8, // 2 swaps
    };
  }

  /**
   * Cross-chain swap (e.g., XRP → XLM)
   * Route: XRP → USDC (XRPL) → USDC (Bridge) → XLM (Stellar)
   */
  private buildCrossChainPath(
    fromLedger: 'xrpl' | 'stellar',
    fromAsset: string,
    toLedger: 'xrpl' | 'stellar',
    toAsset: string,
    amount: string
  ): SwapPath {
    const steps: SwapStep[] = [];
    let currentAmount = amount;
    let totalFee = new BigNumber(0);
    let totalSlippage = 0;

    // Step 1: fromAsset → USDC on source ledger
    const sourcePools = fromLedger === 'xrpl' ? this.xrplPools : this.stellarPools;
    const sourcePool = sourcePools.get(`${fromAsset}/USDC`)!;
    const quote1 = this.ammManager.quoteXRPLSwap(sourcePool, fromAsset, currentAmount);

    steps.push({
      from: { ledger: fromLedger, asset: fromAsset, amount: currentAmount },
      to: { ledger: fromLedger, asset: 'USDC', amount: quote1.outputAmount },
      via: 'amm',
      poolId: `${fromAsset}/USDC`,
      fee: quote1.fee,
    });

    totalFee = totalFee.plus(quote1.fee);
    totalSlippage += quote1.priceImpact;
    currentAmount = quote1.outputAmount;

    // Step 2: Bridge USDC across chains (0.1% bridge fee)
    const bridgeFee = new BigNumber(currentAmount).times(0.001).toFixed(6);
    const bridgedAmount = new BigNumber(currentAmount).minus(bridgeFee).toFixed(6);

    steps.push({
      from: { ledger: fromLedger, asset: 'USDC', amount: currentAmount },
      to: { ledger: toLedger, asset: 'USDC', amount: bridgedAmount },
      via: 'bridge',
      fee: bridgeFee,
    });

    totalFee = totalFee.plus(bridgeFee);
    currentAmount = bridgedAmount;

    // Step 3: USDC → toAsset on destination ledger
    const destPools = toLedger === 'xrpl' ? this.xrplPools : this.stellarPools;
    const destPool = destPools.get(`${toAsset}/USDC`) || destPools.get(`USDC/${toAsset}`)!;
    const quote2 = this.ammManager.quoteXRPLSwap(destPool, 'USDC', currentAmount);

    steps.push({
      from: { ledger: toLedger, asset: 'USDC', amount: currentAmount },
      to: { ledger: toLedger, asset: toAsset, amount: quote2.outputAmount },
      via: 'amm',
      poolId: `USDC/${toAsset}`,
      fee: quote2.fee,
    });

    totalFee = totalFee.plus(quote2.fee);
    totalSlippage += quote2.priceImpact;

    return {
      steps,
      totalFee: totalFee.toFixed(6),
      totalSlippage,
      estimatedOutput: quote2.outputAmount,
      estimatedTime: 20, // 2 AMM swaps + bridge (slower)
    };
  }

  /**
   * Display path in human-readable format
   */
  displayPath(path: SwapPath): void {
    console.log('\n  ═══ SWAP PATH ═══');
    path.steps.forEach((step, i) => {
      console.log(
        `  ${i + 1}. ${step.from.asset} (${step.from.ledger}) → ${step.to.asset} (${step.to.ledger})`
      );
      console.log(`     Via: ${step.via} | Fee: ${step.fee} | Amount: ${step.to.amount}`);
    });
    console.log(`\n  Total Fee: ${path.totalFee} | Slippage: ${path.totalSlippage.toFixed(2)}%`);
    console.log(`  Output: ${path.estimatedOutput} | Time: ~${path.estimatedTime}s`);
  }
}
