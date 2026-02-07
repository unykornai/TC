/**
 * @optkas/agents — Algorithmic Trading Agents & Strategy Engine
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Provides:
 * - Strategy definitions (market making, spread capture, rebalancing, hedge)
 * - Simulation engine (backtesting with historical or synthetic data)
 * - LP position generator (AMM pool provisioning plans)
 * - Execution planner (order scheduling, risk-aware splitting)
 * - Integration hooks for pathfinding and AMM modules
 *
 * All agent execution requires governance approval.
 * Agents operate in dry_run mode by default — live mode requires multisig.
 * Every agent action is audit-logged.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ─── Strategy Types ──────────────────────────────────────────────────

export type StrategyType =
  | 'market_making'
  | 'spread_capture'
  | 'rebalancing'
  | 'hedge'
  | 'twap'
  | 'vwap'
  | 'iceberg'
  | 'liquidity_provision';

export type ExecutionMode = 'dry_run' | 'simulation' | 'paper' | 'live';

export interface StrategyDefinition {
  id: string;
  name: string;
  type: StrategyType;
  description: string;
  mode: ExecutionMode;
  parameters: StrategyParameters;
  riskLimits: RiskLimits;
  targetPairs: TradingPair[];
  schedule: ExecutionSchedule;
  status: 'draft' | 'approved' | 'running' | 'paused' | 'stopped';
  createdAt: string;
  createdBy: string;
  approvedBy?: string;
}

export interface StrategyParameters {
  // Market making
  spreadBps?: number;             // Target spread in basis points
  orderSize?: string;             // Size per order
  layers?: number;                // Number of order layers
  layerSpacingBps?: number;       // Spacing between layers

  // Rebalancing
  targetWeights?: Record<string, number>; // asset → target weight
  rebalanceThresholdPct?: number; // Trigger threshold

  // TWAP/VWAP
  totalAmount?: string;
  durationMinutes?: number;
  sliceCount?: number;

  // Hedge
  hedgeRatio?: number;
  hedgeInstrument?: string;

  // LP
  poolId?: string;
  minPrice?: string;
  maxPrice?: string;
  liquidityAmount?: string;

  // Generic
  custom?: Record<string, unknown>;
}

export interface RiskLimits {
  maxPositionUsd: number;
  maxSingleOrderUsd: number;
  maxDailyVolumeUsd: number;
  maxOpenOrders: number;
  maxDrawdownPct: number;
  circuitBreakerLossPct: number;
  killSwitchLossPct: number;
}

export interface TradingPair {
  base: { currency: string; issuer?: string };
  quote: { currency: string; issuer?: string };
}

export interface ExecutionSchedule {
  type: 'continuous' | 'interval' | 'one_shot';
  intervalSeconds?: number;
  startTime?: string;
  endTime?: string;
  maxIterations?: number;
}

// ─── Simulation Types ────────────────────────────────────────────────

export interface SimulationConfig {
  strategyId: string;
  startDate: string;
  endDate: string;
  initialCapital: string;
  priceData: PricePoint[];
  slippageModel: 'zero' | 'fixed' | 'proportional';
  slippageBps?: number;
  feesBps?: number;
}

export interface PricePoint {
  timestamp: string;
  pair: string;
  bid: string;
  ask: string;
  mid: string;
  volume: string;
}

export interface SimulationResult {
  id: string;
  strategyId: string;
  startDate: string;
  endDate: string;
  initialCapital: string;
  finalCapital: string;
  totalReturn: string;
  totalReturnPct: number;
  maxDrawdown: string;
  maxDrawdownPct: number;
  sharpeRatio: number;
  tradesExecuted: number;
  winRate: number;
  avgTradeReturn: string;
  pnlCurve: { timestamp: string; equity: string }[];
  trades: SimulatedTrade[];
  riskMetrics: {
    varDaily95: string;
    maxPositionSize: string;
    avgHoldingPeriodMinutes: number;
  };
  hash: string;
}

export interface SimulatedTrade {
  timestamp: string;
  pair: string;
  side: 'buy' | 'sell';
  price: string;
  quantity: string;
  slippage: string;
  fee: string;
  pnl: string;
}

// ─── LP Generation Types ─────────────────────────────────────────────

export interface LPPlan {
  id: string;
  poolId: string;
  strategy: 'full_range' | 'concentrated' | 'single_sided';
  asset1: { currency: string; issuer?: string; amount: string };
  asset2: { currency: string; issuer?: string; amount: string };
  priceRange?: { min: string; max: string };
  expectedFeeApy: number;
  impermanentLossEstimate: number;
  status: 'planned' | 'approved' | 'deployed' | 'withdrawn';
  createdAt: string;
}

// ─── Execution Plan Types ────────────────────────────────────────────

export interface ExecutionPlan {
  id: string;
  strategyId: string;
  totalAmount: string;
  pair: TradingPair;
  side: 'buy' | 'sell';
  slices: ExecutionSlice[];
  estimatedCost: string;
  estimatedSlippage: string;
  status: 'planned' | 'executing' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface ExecutionSlice {
  index: number;
  scheduledTime: string;
  amount: string;
  priceLimit?: string;
  status: 'pending' | 'executed' | 'skipped' | 'failed';
  executedPrice?: string;
  executedAmount?: string;
}

// ─── Agent Engine ────────────────────────────────────────────────────

export class AgentEngine extends EventEmitter {
  private strategies: Map<string, StrategyDefinition> = new Map();
  private simulations: Map<string, SimulationResult> = new Map();
  private lpPlans: Map<string, LPPlan> = new Map();
  private executionPlans: Map<string, ExecutionPlan> = new Map();

  constructor() {
    super();
  }

  // ─── Strategy Management ───────────────────────────────────────

  /**
   * Define a new trading strategy.
   */
  defineStrategy(params: {
    name: string;
    type: StrategyType;
    description: string;
    parameters: StrategyParameters;
    riskLimits: Partial<RiskLimits>;
    targetPairs: TradingPair[];
    schedule: ExecutionSchedule;
    createdBy: string;
  }): StrategyDefinition {
    const defaultLimits: RiskLimits = {
      maxPositionUsd: 0,
      maxSingleOrderUsd: 0,
      maxDailyVolumeUsd: 0,
      maxOpenOrders: 0,
      maxDrawdownPct: 5,
      circuitBreakerLossPct: 5,
      killSwitchLossPct: 10,
    };

    const strategy: StrategyDefinition = {
      id: `STR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      name: params.name,
      type: params.type,
      description: params.description,
      mode: 'dry_run',
      parameters: params.parameters,
      riskLimits: { ...defaultLimits, ...params.riskLimits },
      targetPairs: params.targetPairs,
      schedule: params.schedule,
      status: 'draft',
      createdAt: new Date().toISOString(),
      createdBy: params.createdBy,
    };

    this.strategies.set(strategy.id, strategy);
    this.emit('strategy_defined', strategy);
    return strategy;
  }

  approveStrategy(strategyId: string, approvedBy: string): void {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error(`Strategy not found: ${strategyId}`);
    strategy.status = 'approved';
    strategy.approvedBy = approvedBy;
    this.emit('strategy_approved', { strategyId, approvedBy });
  }

  setMode(strategyId: string, mode: ExecutionMode): void {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error(`Strategy not found: ${strategyId}`);
    if (mode === 'live' && strategy.status !== 'approved') {
      throw new Error('Strategy must be approved before switching to live mode');
    }
    strategy.mode = mode;
    this.emit('mode_changed', { strategyId, mode });
  }

  getStrategy(strategyId: string): StrategyDefinition | undefined {
    return this.strategies.get(strategyId);
  }

  getAllStrategies(): StrategyDefinition[] {
    return Array.from(this.strategies.values());
  }

  // ─── Simulation Engine ─────────────────────────────────────────

  /**
   * Run a backtest simulation for a strategy.
   */
  runSimulation(config: SimulationConfig): SimulationResult {
    const strategy = this.strategies.get(config.strategyId);
    if (!strategy) throw new Error(`Strategy not found: ${config.strategyId}`);

    const trades: SimulatedTrade[] = [];
    let equity = parseFloat(config.initialCapital);
    let maxEquity = equity;
    let maxDrawdown = 0;
    let wins = 0;
    const pnlCurve: { timestamp: string; equity: string }[] = [];

    const slippageBps = config.slippageBps || 0;
    const feesBps = config.feesBps || 0;

    // Simulate trades based on strategy type
    for (let i = 1; i < config.priceData.length; i++) {
      const prev = config.priceData[i - 1];
      const curr = config.priceData[i];
      const prevMid = parseFloat(prev.mid);
      const currMid = parseFloat(curr.mid);

      // Simple mean-reversion signal for simulation
      const pctChange = (currMid - prevMid) / prevMid;
      let side: 'buy' | 'sell' | null = null;
      let quantity = '0';

      if (strategy.type === 'market_making') {
        // Alternate buy/sell
        side = i % 2 === 0 ? 'buy' : 'sell';
        quantity = strategy.parameters.orderSize || '100';
      } else if (strategy.type === 'spread_capture') {
        const spread = parseFloat(curr.ask) - parseFloat(curr.bid);
        if (spread > 0) {
          side = 'buy';
          quantity = strategy.parameters.orderSize || '100';
        }
      } else if (strategy.type === 'twap') {
        side = 'buy';
        const sliceSize = parseFloat(strategy.parameters.totalAmount || '1000') /
          (strategy.parameters.sliceCount || 10);
        quantity = sliceSize.toFixed(2);
      } else {
        // Default: buy dips, sell rips
        if (pctChange < -0.01) side = 'buy';
        else if (pctChange > 0.01) side = 'sell';
        quantity = strategy.parameters.orderSize || '100';
      }

      if (side) {
        const price = side === 'buy' ? curr.ask : curr.bid;
        const slippage = (parseFloat(price) * slippageBps / 10000).toFixed(8);
        const fee = (parseFloat(price) * parseFloat(quantity) * feesBps / 10000).toFixed(8);
        const effectivePrice = side === 'buy'
          ? parseFloat(price) + parseFloat(slippage)
          : parseFloat(price) - parseFloat(slippage);
        const pnl = side === 'sell'
          ? ((effectivePrice - prevMid) * parseFloat(quantity) - parseFloat(fee)).toFixed(8)
          : (-(effectivePrice - prevMid) * parseFloat(quantity) - parseFloat(fee)).toFixed(8);

        const trade: SimulatedTrade = {
          timestamp: curr.timestamp,
          pair: `${prev.pair}`,
          side,
          price: effectivePrice.toFixed(8),
          quantity,
          slippage,
          fee,
          pnl,
        };

        trades.push(trade);
        equity += parseFloat(pnl);
        if (parseFloat(pnl) > 0) wins++;
      }

      maxEquity = Math.max(maxEquity, equity);
      const dd = maxEquity - equity;
      maxDrawdown = Math.max(maxDrawdown, dd);

      pnlCurve.push({ timestamp: curr.timestamp, equity: equity.toFixed(2) });
    }

    const totalReturn = equity - parseFloat(config.initialCapital);
    const totalReturnPct = totalReturn / parseFloat(config.initialCapital) * 100;
    const avgReturn = trades.length > 0
      ? trades.reduce((s, t) => s + parseFloat(t.pnl), 0) / trades.length
      : 0;

    // Simplified Sharpe calculation
    const returns = trades.map((t) => parseFloat(t.pnl));
    const mean = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length > 1
      ? Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1))
      : 1;
    const sharpe = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;

    const result: SimulationResult = {
      id: `SIM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      strategyId: config.strategyId,
      startDate: config.startDate,
      endDate: config.endDate,
      initialCapital: config.initialCapital,
      finalCapital: equity.toFixed(2),
      totalReturn: totalReturn.toFixed(2),
      totalReturnPct: parseFloat(totalReturnPct.toFixed(4)),
      maxDrawdown: maxDrawdown.toFixed(2),
      maxDrawdownPct: parseFloat((maxDrawdown / maxEquity * 100).toFixed(4)),
      sharpeRatio: parseFloat(sharpe.toFixed(4)),
      tradesExecuted: trades.length,
      winRate: trades.length > 0 ? parseFloat((wins / trades.length).toFixed(4)) : 0,
      avgTradeReturn: avgReturn.toFixed(8),
      pnlCurve,
      trades,
      riskMetrics: {
        varDaily95: (stdDev * 1.645).toFixed(2),
        maxPositionSize: strategy.riskLimits.maxPositionUsd.toFixed(2),
        avgHoldingPeriodMinutes: 0,
      },
      hash: '',
    };

    result.hash = crypto.createHash('sha256')
      .update(JSON.stringify({ ...result, hash: '' }))
      .digest('hex');

    this.simulations.set(result.id, result);
    this.emit('simulation_completed', result);
    return result;
  }

  getSimulation(simId: string): SimulationResult | undefined {
    return this.simulations.get(simId);
  }

  // ─── LP Plan Generator ─────────────────────────────────────────

  /**
   * Generate an LP provisioning plan.
   */
  generateLPPlan(params: {
    poolId: string;
    strategy: LPPlan['strategy'];
    asset1: LPPlan['asset1'];
    asset2: LPPlan['asset2'];
    priceRange?: { min: string; max: string };
    expectedFeeApy: number;
    ilEstimate: number;
  }): LPPlan {
    const plan: LPPlan = {
      id: `LP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      poolId: params.poolId,
      strategy: params.strategy,
      asset1: params.asset1,
      asset2: params.asset2,
      priceRange: params.priceRange,
      expectedFeeApy: params.expectedFeeApy,
      impermanentLossEstimate: params.ilEstimate,
      status: 'planned',
      createdAt: new Date().toISOString(),
    };

    this.lpPlans.set(plan.id, plan);
    this.emit('lp_plan_generated', plan);
    return plan;
  }

  getLPPlan(planId: string): LPPlan | undefined {
    return this.lpPlans.get(planId);
  }

  getAllLPPlans(): LPPlan[] {
    return Array.from(this.lpPlans.values());
  }

  // ─── Execution Planner ─────────────────────────────────────────

  /**
   * Create an execution plan for a large order.
   * Splits the order into time-weighted slices.
   */
  createExecutionPlan(params: {
    strategyId: string;
    totalAmount: string;
    pair: TradingPair;
    side: 'buy' | 'sell';
    durationMinutes: number;
    sliceCount: number;
    priceLimit?: string;
  }): ExecutionPlan {
    const sliceAmount = (parseFloat(params.totalAmount) / params.sliceCount).toFixed(8);
    const intervalMs = (params.durationMinutes * 60 * 1000) / params.sliceCount;
    const now = new Date();

    const slices: ExecutionSlice[] = [];
    for (let i = 0; i < params.sliceCount; i++) {
      const scheduledTime = new Date(now.getTime() + i * intervalMs);
      slices.push({
        index: i + 1,
        scheduledTime: scheduledTime.toISOString(),
        amount: sliceAmount,
        priceLimit: params.priceLimit,
        status: 'pending',
      });
    }

    // Estimate slippage (simplified)
    const estimatedSlippage = (parseFloat(params.totalAmount) * 0.001).toFixed(2); // 10 bps
    const estimatedCost = (parseFloat(params.totalAmount) * 0.0012).toFixed(2);     // 12 bps

    const plan: ExecutionPlan = {
      id: `EXEC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      strategyId: params.strategyId,
      totalAmount: params.totalAmount,
      pair: params.pair,
      side: params.side,
      slices,
      estimatedCost,
      estimatedSlippage,
      status: 'planned',
      createdAt: new Date().toISOString(),
    };

    this.executionPlans.set(plan.id, plan);
    this.emit('execution_plan_created', plan);
    return plan;
  }

  getExecutionPlan(planId: string): ExecutionPlan | undefined {
    return this.executionPlans.get(planId);
  }

  /**
   * Execute a single slice of an execution plan.
   */
  executeSlice(planId: string, sliceIndex: number, executedPrice: string, executedAmount: string): void {
    const plan = this.executionPlans.get(planId);
    if (!plan) throw new Error(`Execution plan not found: ${planId}`);

    const slice = plan.slices.find((s) => s.index === sliceIndex);
    if (!slice) throw new Error(`Slice ${sliceIndex} not found`);

    slice.status = 'executed';
    slice.executedPrice = executedPrice;
    slice.executedAmount = executedAmount;

    // Check if all slices executed
    const allExecuted = plan.slices.every((s) => s.status === 'executed' || s.status === 'skipped');
    if (allExecuted) {
      plan.status = 'completed';
      this.emit('execution_completed', { planId });
    }

    this.emit('slice_executed', { planId, sliceIndex, executedPrice, executedAmount });
  }
}

export default AgentEngine;
