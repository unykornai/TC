/**
 * @optkas/dex-amm — XRPL DEX & AMM Operations
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Manages XRPL native DEX offers and Automated Market Maker pools.
 * DISABLED by default — requires explicit enablement + multisig approval.
 * AMM exists for OPTIONAL secondary liquidity only.
 */

import { XRPLClient, PreparedTransaction } from '@optkas/xrpl-core';

// ─── Types ───────────────────────────────────────────────────────────

export interface AMMConfig {
  enabled: boolean;
  maxSlippageBps: number; // Basis points
  defaultFeeBps: number;
  pairs: AMMPairConfig[];
}

export interface AMMPairConfig {
  asset1: { currency: string; issuer?: string };
  asset2: { currency: string; issuer?: string };
  initialAmount1?: string;
  initialAmount2?: string;
}

export interface AMMInfo {
  asset1: { currency: string; issuer?: string; amount: string };
  asset2: { currency: string; issuer?: string; amount: string };
  tradingFee: number;
  lpTokenBalance: string;
}

// ─── AMM Manager ─────────────────────────────────────────────────────

export class AMMManager {
  private client: XRPLClient;
  private config: AMMConfig;

  constructor(client: XRPLClient, config: AMMConfig) {
    this.client = client;
    this.config = config;
  }

  private ensureEnabled(): void {
    if (!this.config.enabled) {
      throw new Error(
        'AMM operations are DISABLED. Enable in platform-config.yaml and obtain multisig approval.'
      );
    }
  }

  /**
   * Prepare an AMMCreate transaction (unsigned).
   * Creates a new AMM pool for the specified pair.
   */
  async prepareCreate(
    accountAddress: string,
    pair: AMMPairConfig,
    tradingFeeBps: number,
    dryRun = true
  ): Promise<PreparedTransaction> {
    this.ensureEnabled();

    if (tradingFeeBps > 1000) {
      throw new Error('Trading fee cannot exceed 1000 bps (10%)');
    }

    const formatAmount = (asset: { currency: string; issuer?: string }, amount: string) => {
      if (asset.currency === 'XRP') {
        return XRPLClient.xrpToDrops(amount);
      }
      return {
        currency: asset.currency,
        issuer: asset.issuer!,
        value: amount,
      };
    };

    const tx: any = {
      TransactionType: 'AMMCreate',
      Account: accountAddress,
      Amount: formatAmount(pair.asset1, pair.initialAmount1 || '0'),
      Amount2: formatAmount(pair.asset2, pair.initialAmount2 || '0'),
      TradingFee: tradingFeeBps,
    };

    return this.client.prepareTransaction(
      tx,
      `Create AMM: ${pair.asset1.currency}/${pair.asset2.currency} (fee: ${tradingFeeBps} bps)`,
      dryRun
    );
  }

  /**
   * Prepare an AMMDeposit transaction (unsigned).
   * Adds liquidity to an existing AMM pool.
   */
  async prepareDeposit(
    accountAddress: string,
    asset1: { currency: string; issuer?: string },
    asset2: { currency: string; issuer?: string },
    amount: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    this.ensureEnabled();

    const tx: any = {
      TransactionType: 'AMMDeposit',
      Account: accountAddress,
      Asset: asset1.issuer ? { currency: asset1.currency, issuer: asset1.issuer } : { currency: 'XRP' },
      Asset2: asset2.issuer ? { currency: asset2.currency, issuer: asset2.issuer } : { currency: 'XRP' },
      Amount: asset1.currency === 'XRP' ? XRPLClient.xrpToDrops(amount) : { currency: asset1.currency, issuer: asset1.issuer!, value: amount },
      Flags: 0x00080000, // tfSingleAsset
    };

    return this.client.prepareTransaction(
      tx,
      `AMM deposit: ${amount} ${asset1.currency}`,
      dryRun
    );
  }

  /**
   * Prepare an AMMWithdraw transaction (unsigned).
   */
  async prepareWithdraw(
    accountAddress: string,
    asset1: { currency: string; issuer?: string },
    asset2: { currency: string; issuer?: string },
    amount: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    this.ensureEnabled();

    const tx: any = {
      TransactionType: 'AMMWithdraw',
      Account: accountAddress,
      Asset: asset1.issuer ? { currency: asset1.currency, issuer: asset1.issuer } : { currency: 'XRP' },
      Asset2: asset2.issuer ? { currency: asset2.currency, issuer: asset2.issuer } : { currency: 'XRP' },
      Amount: asset1.currency === 'XRP' ? XRPLClient.xrpToDrops(amount) : { currency: asset1.currency, issuer: asset1.issuer!, value: amount },
      Flags: 0x00080000, // tfSingleAsset
    };

    return this.client.prepareTransaction(
      tx,
      `AMM withdraw: ${amount} ${asset1.currency}`,
      dryRun
    );
  }

  /**
   * Query AMM info for a given pair.
   */
  async getAMMInfo(
    asset1: { currency: string; issuer?: string },
    asset2: { currency: string; issuer?: string }
  ): Promise<unknown> {
    // AMM info is queried via amm_info RPC
    const client = (this.client as any).client;
    if (!client) throw new Error('Not connected');

    const response = await client.request({
      command: 'amm_info',
      asset: asset1.issuer ? { currency: asset1.currency, issuer: asset1.issuer } : { currency: 'XRP' },
      asset2: asset2.issuer ? { currency: asset2.currency, issuer: asset2.issuer } : { currency: 'XRP' },
    });

    return response.result;
  }
}

export default AMMManager;
