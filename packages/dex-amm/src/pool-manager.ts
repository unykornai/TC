/**
 * @optkas/dex-amm — Enhanced AMM Pool Manager
 *
 * Full XRPL AMM lifecycle management:
 * - Pool creation (AMMCreate)
 * - Two-asset deposit (AMMDeposit)
 * - Single-asset deposit
 * - Proportional withdrawal
 * - Single-asset withdrawal
 * - LP token management
 * - Fee voting (AMMVote)
 * - Auction slot bidding (AMMBid)
 * - Pool analytics and metrics
 * - Emergency drain
 *
 * All operations return unsigned transactions for multisig approval.
 */

import { XRPLClient, PreparedTransaction } from '@optkas/xrpl-core';
import { EventEmitter } from 'events';

// ─── Types ───────────────────────────────────────────────────────────

export interface PoolDefinition {
  id: string;
  name: string;
  asset1: AssetSpec;
  asset2: AssetSpec;
  tradingFee: number;        // basis points (max 1000 = 10%)
  status: 'pending' | 'active' | 'paused' | 'drained';
  createdAt: string;
  metrics: PoolMetrics;
}

export interface AssetSpec {
  currency: string;
  issuer?: string;
}

export interface PoolMetrics {
  asset1Balance: string;
  asset2Balance: string;
  lpTokenSupply: string;
  tradingFee: number;
  tvlEstimateUsd: string;
  auctionSlot: AuctionSlotInfo | null;
  volume24h: string;
  fees24h: string;
}

export interface AuctionSlotInfo {
  owner: string;
  discountedFee: number;
  expiration: string;
  price: string;
}

export interface LPPosition {
  poolId: string;
  lpTokenBalance: string;
  sharePercentage: string;
  asset1Value: string;
  asset2Value: string;
  unrealizedPnl: string;
  entryPriceRatio: string;
}

export interface PoolAnalytics {
  poolId: string;
  impermanentLoss: string;
  feeIncome: string;
  netReturn: string;
  annualizedReturn: string;
  priceRatio: string;
  initialPriceRatio: string;
  utilizationRate: string;
}

// ─── AMM Deposit/Withdraw Flags ───────────────────────────────────────

const AMM_DEPOSIT_FLAGS = {
  tfLPToken: 0x00010000,
  tfSingleAsset: 0x00080000,
  tfTwoAsset: 0x00100000,
  tfOneAssetLPToken: 0x00200000,
  tfLimitLPToken: 0x00400000,
} as const;

const AMM_WITHDRAW_FLAGS = {
  tfLPToken: 0x00010000,
  tfWithdrawAll: 0x00020000,
  tfOneAssetWithdrawAll: 0x00040000,
  tfSingleAsset: 0x00080000,
  tfTwoAsset: 0x00100000,
  tfOneAssetLPToken: 0x00200000,
  tfLimitLPToken: 0x00400000,
} as const;

// ─── Enhanced AMM Pool Manager ────────────────────────────────────────

export class PoolManager extends EventEmitter {
  private client: XRPLClient;
  private pools: Map<string, PoolDefinition> = new Map();
  private enabled: boolean;

  constructor(client: XRPLClient, enabled = false) {
    super();
    this.client = client;
    this.enabled = enabled;
  }

  private ensureEnabled(): void {
    if (!this.enabled) {
      throw new Error('AMM operations are DISABLED. Enable via governance multisig approval.');
    }
  }

  private formatAsset(spec: AssetSpec): any {
    return spec.currency === 'XRP'
      ? { currency: 'XRP' }
      : { currency: spec.currency, issuer: spec.issuer };
  }

  private formatAmount(spec: AssetSpec, value: string): any {
    return spec.currency === 'XRP'
      ? XRPLClient.xrpToDrops(value)
      : { currency: spec.currency, issuer: spec.issuer!, value };
  }

  // ─── Pool Creation ─────────────────────────────────────────────

  /**
   * Create a new AMM pool with initial two-asset deposit.
   * Requires both assets to be deposited at the desired price ratio.
   */
  async prepareCreatePool(
    account: string,
    asset1: AssetSpec,
    asset2: AssetSpec,
    amount1: string,
    amount2: string,
    tradingFeeBps: number,
    dryRun = true
  ): Promise<{ pool: PoolDefinition; prepared: PreparedTransaction }> {
    this.ensureEnabled();

    if (tradingFeeBps > 1000) throw new Error('Trading fee cannot exceed 1000 bps (10%)');
    if (tradingFeeBps < 0) throw new Error('Trading fee must be non-negative');

    const pool: PoolDefinition = {
      id: `POOL-${asset1.currency}-${asset2.currency}-${Date.now()}`,
      name: `${asset1.currency}/${asset2.currency}`,
      asset1,
      asset2,
      tradingFee: tradingFeeBps,
      status: 'pending',
      createdAt: new Date().toISOString(),
      metrics: {
        asset1Balance: amount1,
        asset2Balance: amount2,
        lpTokenSupply: '0',
        tradingFee: tradingFeeBps,
        tvlEstimateUsd: '0',
        auctionSlot: null,
        volume24h: '0',
        fees24h: '0',
      },
    };

    const tx: any = {
      TransactionType: 'AMMCreate',
      Account: account,
      Amount: this.formatAmount(asset1, amount1),
      Amount2: this.formatAmount(asset2, amount2),
      TradingFee: tradingFeeBps,
    };

    const prepared = await this.client.prepareTransaction(
      tx,
      `CREATE AMM: ${pool.name} (${amount1} ${asset1.currency} + ${amount2} ${asset2.currency}, fee: ${tradingFeeBps} bps)`,
      dryRun
    );

    this.pools.set(pool.id, pool);
    this.emit('pool_created', pool);
    return { pool, prepared };
  }

  // ─── Deposits ──────────────────────────────────────────────────

  /**
   * Two-asset proportional deposit — deposits both assets at current ratio.
   */
  async prepareTwoAssetDeposit(
    account: string,
    asset1: AssetSpec,
    asset2: AssetSpec,
    amount1: string,
    amount2: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    this.ensureEnabled();

    const tx: any = {
      TransactionType: 'AMMDeposit',
      Account: account,
      Asset: this.formatAsset(asset1),
      Asset2: this.formatAsset(asset2),
      Amount: this.formatAmount(asset1, amount1),
      Amount2: this.formatAmount(asset2, amount2),
      Flags: AMM_DEPOSIT_FLAGS.tfTwoAsset,
    };

    return this.client.prepareTransaction(
      tx,
      `AMM DEPOSIT: ${amount1} ${asset1.currency} + ${amount2} ${asset2.currency}`,
      dryRun
    );
  }

  /**
   * Single-asset deposit — deposits one asset, AMM calculates LP tokens.
   * Subject to higher fees due to imbalance.
   */
  async prepareSingleAssetDeposit(
    account: string,
    asset1: AssetSpec,
    asset2: AssetSpec,
    depositAsset: AssetSpec,
    amount: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    this.ensureEnabled();

    const tx: any = {
      TransactionType: 'AMMDeposit',
      Account: account,
      Asset: this.formatAsset(asset1),
      Asset2: this.formatAsset(asset2),
      Amount: this.formatAmount(depositAsset, amount),
      Flags: AMM_DEPOSIT_FLAGS.tfSingleAsset,
    };

    return this.client.prepareTransaction(
      tx,
      `AMM SINGLE DEPOSIT: ${amount} ${depositAsset.currency}`,
      dryRun
    );
  }

  /**
   * Deposit for a specific amount of LP tokens.
   */
  async prepareDepositForLPTokens(
    account: string,
    asset1: AssetSpec,
    asset2: AssetSpec,
    lpTokenAmount: string,
    lpTokenIssuer: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    this.ensureEnabled();

    const tx: any = {
      TransactionType: 'AMMDeposit',
      Account: account,
      Asset: this.formatAsset(asset1),
      Asset2: this.formatAsset(asset2),
      LPTokenOut: {
        currency: 'LP',
        issuer: lpTokenIssuer,
        value: lpTokenAmount,
      },
      Flags: AMM_DEPOSIT_FLAGS.tfLPToken,
    };

    return this.client.prepareTransaction(
      tx,
      `AMM DEPOSIT for ${lpTokenAmount} LP tokens`,
      dryRun
    );
  }

  // ─── Withdrawals ───────────────────────────────────────────────

  /**
   * Proportional two-asset withdrawal — withdraw both assets at current ratio.
   */
  async prepareTwoAssetWithdraw(
    account: string,
    asset1: AssetSpec,
    asset2: AssetSpec,
    amount1: string,
    amount2: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    this.ensureEnabled();

    const tx: any = {
      TransactionType: 'AMMWithdraw',
      Account: account,
      Asset: this.formatAsset(asset1),
      Asset2: this.formatAsset(asset2),
      Amount: this.formatAmount(asset1, amount1),
      Amount2: this.formatAmount(asset2, amount2),
      Flags: AMM_WITHDRAW_FLAGS.tfTwoAsset,
    };

    return this.client.prepareTransaction(
      tx,
      `AMM WITHDRAW: ${amount1} ${asset1.currency} + ${amount2} ${asset2.currency}`,
      dryRun
    );
  }

  /**
   * Single-asset withdrawal — withdraw one asset, burning LP tokens.
   */
  async prepareSingleAssetWithdraw(
    account: string,
    asset1: AssetSpec,
    asset2: AssetSpec,
    withdrawAsset: AssetSpec,
    amount: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    this.ensureEnabled();

    const tx: any = {
      TransactionType: 'AMMWithdraw',
      Account: account,
      Asset: this.formatAsset(asset1),
      Asset2: this.formatAsset(asset2),
      Amount: this.formatAmount(withdrawAsset, amount),
      Flags: AMM_WITHDRAW_FLAGS.tfSingleAsset,
    };

    return this.client.prepareTransaction(
      tx,
      `AMM SINGLE WITHDRAW: ${amount} ${withdrawAsset.currency}`,
      dryRun
    );
  }

  /**
   * Withdraw ALL liquidity — burns all LP tokens.
   */
  async prepareWithdrawAll(
    account: string,
    asset1: AssetSpec,
    asset2: AssetSpec,
    dryRun = true
  ): Promise<PreparedTransaction> {
    this.ensureEnabled();

    const tx: any = {
      TransactionType: 'AMMWithdraw',
      Account: account,
      Asset: this.formatAsset(asset1),
      Asset2: this.formatAsset(asset2),
      Flags: AMM_WITHDRAW_FLAGS.tfWithdrawAll,
    };

    return this.client.prepareTransaction(
      tx,
      `AMM WITHDRAW ALL: ${asset1.currency}/${asset2.currency}`,
      dryRun
    );
  }

  // ─── Fee Voting ────────────────────────────────────────────────

  /**
   * Vote on the trading fee for an AMM pool.
   * Each LP's vote is weighted by their share of LP tokens.
   */
  async prepareVoteFee(
    account: string,
    asset1: AssetSpec,
    asset2: AssetSpec,
    feeBps: number,
    dryRun = true
  ): Promise<PreparedTransaction> {
    this.ensureEnabled();

    if (feeBps > 1000) throw new Error('Fee vote cannot exceed 1000 bps');

    const tx: any = {
      TransactionType: 'AMMVote',
      Account: account,
      Asset: this.formatAsset(asset1),
      Asset2: this.formatAsset(asset2),
      TradingFee: feeBps,
    };

    return this.client.prepareTransaction(
      tx,
      `AMM VOTE: ${feeBps} bps fee for ${asset1.currency}/${asset2.currency}`,
      dryRun
    );
  }

  // ─── Auction Slot Bidding ──────────────────────────────────────

  /**
   * Bid for the AMM auction slot.
   * The auction slot holder gets a discounted trading fee for 24 hours.
   * Winning bid is paid in LP tokens.
   */
  async prepareBidAuctionSlot(
    account: string,
    asset1: AssetSpec,
    asset2: AssetSpec,
    bidAmount: string,
    lpTokenIssuer: string,
    authAccounts?: string[], // Up to 4 accounts that also get discounted fee
    dryRun = true
  ): Promise<PreparedTransaction> {
    this.ensureEnabled();

    const tx: any = {
      TransactionType: 'AMMBid',
      Account: account,
      Asset: this.formatAsset(asset1),
      Asset2: this.formatAsset(asset2),
      BidMin: {
        currency: 'LP',
        issuer: lpTokenIssuer,
        value: bidAmount,
      },
    };

    if (authAccounts && authAccounts.length > 0) {
      tx.AuthAccounts = authAccounts.slice(0, 4).map((acc) => ({
        AuthAccount: { Account: acc },
      }));
    }

    return this.client.prepareTransaction(
      tx,
      `AMM BID: ${bidAmount} LP tokens for auction slot (${asset1.currency}/${asset2.currency})`,
      dryRun
    );
  }

  // ─── Pool Info & Analytics ─────────────────────────────────────

  /**
   * Fetch live AMM pool info from the ledger.
   */
  async getPoolInfo(asset1: AssetSpec, asset2: AssetSpec): Promise<any> {
    const client = (this.client as any).client;
    if (!client) throw new Error('Not connected');

    const response = await client.request({
      command: 'amm_info',
      asset: this.formatAsset(asset1),
      asset2: this.formatAsset(asset2),
    });

    return response.result;
  }

  /**
   * Calculate impermanent loss for a position.
   */
  calculateImpermanentLoss(
    initialPrice: number,
    currentPrice: number
  ): { ilPercent: string; multiplier: string } {
    const priceRatio = currentPrice / initialPrice;
    const sqrtRatio = Math.sqrt(priceRatio);
    const il = (2 * sqrtRatio) / (1 + priceRatio) - 1;

    return {
      ilPercent: (il * 100).toFixed(4),
      multiplier: sqrtRatio.toFixed(6),
    };
  }

  // ─── Pool Registry ─────────────────────────────────────────────

  getPool(poolId: string): PoolDefinition | undefined {
    return this.pools.get(poolId);
  }

  getAllPools(): PoolDefinition[] {
    return Array.from(this.pools.values());
  }

  getActivePools(): PoolDefinition[] {
    return this.getAllPools().filter((p) => p.status === 'active');
  }
}

export default PoolManager;
