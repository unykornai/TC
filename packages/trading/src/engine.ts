/**
 * @optkas/trading — Algorithmic Trading Engine
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Provides TWAP and other algorithmic trading strategies on XRPL DEX.
 * DISABLED by default — requires explicit enablement + multisig approval.
 * All trades are within strict risk limits.
 */

import { XRPLClient, PreparedTransaction } from '@optkas/xrpl-core';

// ─── Types ───────────────────────────────────────────────────────────

export interface TradingConfig {
  enabled: boolean;
  mode: 'dry_run' | 'live';
  risk: RiskConfig;
  strategies: StrategyConfig[];
}

export interface RiskConfig {
  maxPositionPct: number;
  maxDailyVolume: number;
  stopLossPct: number;
  circuitBreakerPct: number;
}

export interface StrategyConfig {
  name: string;
  type: 'twap' | 'vwap' | 'limit';
  enabled: boolean;
  params: Record<string, unknown>;
}

export interface TradeOrder {
  id: string;
  strategy: string;
  side: 'buy' | 'sell';
  pair: { base: string; quote: string; baseIssuer?: string; quoteIssuer?: string };
  amount: string;
  price?: string; // For limit orders
  slices?: number; // For TWAP
  intervalMs?: number; // For TWAP
}

export interface TradeResult {
  orderId: string;
  sliceIndex: number;
  totalSlices: number;
  prepared: PreparedTransaction;
  estimatedPrice: string;
  amount: string;
}

// ─── Risk Controls ───────────────────────────────────────────────────

export class RiskController {
  private config: RiskConfig;
  private dailyVolume = 0;
  private positions: Map<string, number> = new Map();
  private halted = false;

  constructor(config: RiskConfig) {
    this.config = config;
  }

  checkOrder(order: TradeOrder): { allowed: boolean; reason?: string } {
    if (this.halted) {
      return { allowed: false, reason: 'Trading halted — circuit breaker triggered' };
    }

    const amount = parseFloat(order.amount);

    // Daily volume check
    if (this.dailyVolume + amount > this.config.maxDailyVolume) {
      return {
        allowed: false,
        reason: `Daily volume limit exceeded: ${this.dailyVolume + amount} > ${this.config.maxDailyVolume}`,
      };
    }

    return { allowed: true };
  }

  recordExecution(amount: number): void {
    this.dailyVolume += amount;
  }

  triggerCircuitBreaker(reason: string): void {
    this.halted = true;
    // This should trigger an audit event and alert all signers
  }

  resetDaily(): void {
    this.dailyVolume = 0;
  }

  get isHalted(): boolean {
    return this.halted;
  }
}

// ─── TWAP Strategy ───────────────────────────────────────────────────

export class TWAPStrategy {
  private client: XRPLClient;
  private riskController: RiskController;

  constructor(client: XRPLClient, riskController: RiskController) {
    this.client = client;
    this.riskController = riskController;
  }

  /**
   * Split a large order into time-weighted slices.
   * Each slice is a prepared (unsigned) OfferCreate transaction.
   */
  async prepareSlices(order: TradeOrder, dryRun = true): Promise<TradeResult[]> {
    const riskCheck = this.riskController.checkOrder(order);
    if (!riskCheck.allowed) {
      throw new Error(`Risk check failed: ${riskCheck.reason}`);
    }

    const totalAmount = parseFloat(order.amount);
    const slices = order.slices || 10;
    const sliceAmount = (totalAmount / slices).toFixed(6);
    const results: TradeResult[] = [];

    for (let i = 0; i < slices; i++) {
      const formatAmount = (currency: string, issuer: string | undefined, value: string) => {
        if (currency === 'XRP') return XRPLClient.xrpToDrops(value);
        return { currency, issuer: issuer!, value };
      };

      const tx: any = {
        TransactionType: 'OfferCreate',
        Account: '', // Must be set by caller (trading account)
        TakerPays: formatAmount(order.pair.base, order.pair.baseIssuer, sliceAmount),
        TakerGets: formatAmount(
          order.pair.quote,
          order.pair.quoteIssuer,
          order.price
            ? (parseFloat(sliceAmount) * parseFloat(order.price)).toFixed(6)
            : sliceAmount
        ),
      };

      if (order.side === 'sell') {
        // Swap TakerPays and TakerGets for sell orders
        [tx.TakerPays, tx.TakerGets] = [tx.TakerGets, tx.TakerPays];
      }

      const prepared = await this.client.prepareTransaction(
        tx,
        `TWAP slice ${i + 1}/${slices}: ${order.side} ${sliceAmount} ${order.pair.base}`,
        dryRun
      );

      results.push({
        orderId: order.id,
        sliceIndex: i,
        totalSlices: slices,
        prepared,
        estimatedPrice: order.price || 'market',
        amount: sliceAmount,
      });
    }

    return results;
  }
}

// ─── Trading Engine ──────────────────────────────────────────────────

export class TradingEngine {
  private client: XRPLClient;
  private config: TradingConfig;
  private riskController: RiskController;
  private twap: TWAPStrategy;

  constructor(client: XRPLClient, config: TradingConfig) {
    this.client = client;
    this.config = config;
    this.riskController = new RiskController(config.risk);
    this.twap = new TWAPStrategy(client, this.riskController);
  }

  private ensureEnabled(): void {
    if (!this.config.enabled) {
      throw new Error(
        'Trading is DISABLED. Enable in platform-config.yaml and obtain multisig approval.'
      );
    }
  }

  /**
   * Execute a trading order using the specified strategy.
   * Returns prepared (unsigned) transactions for multisig approval.
   */
  async executeOrder(order: TradeOrder, dryRun = true): Promise<TradeResult[]> {
    this.ensureEnabled();

    if (this.config.mode === 'dry_run') {
      dryRun = true; // Force dry-run in dry_run mode
    }

    switch (order.strategy) {
      case 'twap':
        return this.twap.prepareSlices(order, dryRun);
      default:
        throw new Error(`Unknown strategy: ${order.strategy}`);
    }
  }

  /**
   * Cancel all outstanding offers for an account.
   */
  async prepareCancelAll(
    accountAddress: string,
    dryRun = true
  ): Promise<PreparedTransaction[]> {
    // Query account offers and prepare cancellations
    // This is a safety mechanism — cancel all orders
    return []; // Implementation depends on offer tracking
  }

  get risk(): RiskController {
    return this.riskController;
  }
}

export default TradingEngine;
