/**
 * OPTKAS Cross-Chain DEX — AMM Pool Manager
 * 
 * Manages liquidity pools on both XRPL and Stellar:
 * - Create/destroy AMM instances
 * - Add/remove liquidity
 * - Query pool state (reserves, fees, LP tokens)
 * - Execute single-chain swaps
 */

import { Client, Wallet, AMMCreate, AMMDeposit, AMMWithdraw, AMMInfoRequest } from 'xrpl';
import * as StellarSdk from '@stellar/stellar-sdk';
import BigNumber from 'bignumber.js';

export interface PoolReserves {
  asset1: { code: string; amount: string };
  asset2: { code: string; amount: string };
  totalShares: string;
  fee: number; // basis points (30 = 0.3%)
}

export interface SwapQuote {
  inputAmount: string;
  outputAmount: string;
  effectiveRate: number;
  priceImpact: number; // %
  fee: string;
}

export class AMMPoolManager {
  private xrplClient: Client;
  private stellarServer: StellarSdk.Horizon.Server;
  private xrplWallet: Wallet;
  private stellarKeypair: StellarSdk.Keypair;

  constructor(
    xrplUrl: string,
    stellarUrl: string,
    xrplSeed: string,
    stellarSecret: string
  ) {
    this.xrplClient = new Client(xrplUrl);
    this.stellarServer = new StellarSdk.Horizon.Server(stellarUrl);
    this.xrplWallet = Wallet.fromSeed(xrplSeed);
    this.stellarKeypair = StellarSdk.Keypair.fromSecret(stellarSecret);
  }

  async connect(): Promise<void> {
    await this.xrplClient.connect();
  }

  async disconnect(): Promise<void> {
    await this.xrplClient.disconnect();
  }

  // ═══════════════════════════════════════════════════════════
  // XRPL AMM OPERATIONS
  // ═══════════════════════════════════════════════════════════

  /**
   * Create a new AMM pool on XRPL
   * @param asset1 - Currency code (e.g., 'XRP', 'USD')
   * @param asset2 - Currency code
   * @param amount1 - Initial liquidity for asset1
   * @param amount2 - Initial liquidity for asset2
   * @param tradingFee - Fee in basis points (30 = 0.3%)
   */
  async createXRPLPool(
    asset1: string,
    asset2: string,
    amount1: string,
    amount2: string,
    issuer1?: string,
    issuer2?: string,
    tradingFee: number = 30
  ): Promise<string> {
    const amount1Obj = asset1 === 'XRP'
      ? amount1
      : { currency: asset1, issuer: issuer1!, value: amount1 };

    const amount2Obj = asset2 === 'XRP'
      ? amount2
      : { currency: asset2, issuer: issuer2!, value: amount2 };

    const tx: AMMCreate = {
      TransactionType: 'AMMCreate',
      Account: this.xrplWallet.address,
      Amount: amount1Obj,
      Amount2: amount2Obj,
      TradingFee: tradingFee,
    };

    const prepared = await this.xrplClient.autofill(tx);
    const signed = this.xrplWallet.sign(prepared);
    const result = await this.xrplClient.submitAndWait(signed.tx_blob);

    if (result.result.meta && typeof result.result.meta !== 'string') {
      // AMM ID is in the meta.CreatedNode or AffectedNodes
      const ammId = this.xrplWallet.address; // Simplified - use issuer as pool identifier
      console.log(`✓ Created XRPL AMM: ${asset1}/${asset2} → AMM ID: ${ammId}`);
      return ammId;
    }

    throw new Error('AMM creation failed');
  }

  /**
   * Add liquidity to existing XRPL AMM pool
   */
  async addXRPLLiquidity(
    asset1: string,
    asset2: string,
    amount1: string,
    amount2: string,
    issuer1?: string,
    issuer2?: string
  ): Promise<void> {
    const amount1Obj = asset1 === 'XRP' 
      ? amount1 
      : { currency: asset1, issuer: issuer1!, value: amount1 } as any;
    const amount2Obj = asset2 === 'XRP' 
      ? amount2 
      : { currency: asset2, issuer: issuer2!, value: amount2 } as any;

    const tx: AMMDeposit = {
      TransactionType: 'AMMDeposit',
      Account: this.xrplWallet.address,
      Asset: amount1Obj as any,
      Asset2: amount2Obj as any,
      Amount: amount1Obj as any,
      Amount2: amount2Obj as any,
    };

    const prepared = await this.xrplClient.autofill(tx);
    const signed = this.xrplWallet.sign(prepared);
    await this.xrplClient.submitAndWait(signed.tx_blob);

    console.log(`✓ Added liquidity: ${amount1} ${asset1} + ${amount2} ${asset2}`);
  }

  /**
   * Get reserves and state of an XRPL AMM pool
   */
  async getXRPLPoolState(
    asset1: string,
    asset2: string,
    issuer1?: string,
    issuer2?: string
  ): Promise<PoolReserves> {
    const asset1Obj = asset1 === 'XRP' 
      ? { currency: 'XRP' } as any
      : { currency: asset1, issuer: issuer1! } as any;
    const asset2Obj = asset2 === 'XRP' 
      ? { currency: 'XRP' } as any
      : { currency: asset2, issuer: issuer2! } as any;

    const request: AMMInfoRequest = {
      command: 'amm_info',
      asset: asset1Obj,
      asset2: asset2Obj,
    };

    const response = await this.xrplClient.request(request);
    const amm = response.result.amm;

    const reserve1 = typeof amm.amount === 'string' ? amm.amount : amm.amount.value;
    const reserve2 = typeof amm.amount2 === 'string' ? amm.amount2 : amm.amount2.value;

    return {
      asset1: { code: asset1, amount: reserve1 },
      asset2: { code: asset2, amount: reserve2 },
      totalShares: amm.lp_token.value,
      fee: amm.trading_fee,
    };
  }

  /**
   * Quote a swap on XRPL AMM (constant product formula)
   */
  quoteXRPLSwap(
    reserves: PoolReserves,
    inputAsset: string,
    inputAmount: string
  ): SwapQuote {
    const isAsset1 = inputAsset === reserves.asset1.code;
    const reserveIn = new BigNumber(isAsset1 ? reserves.asset1.amount : reserves.asset2.amount);
    const reserveOut = new BigNumber(isAsset1 ? reserves.asset2.amount : reserves.asset1.amount);
    const amountIn = new BigNumber(inputAmount);

    // Constant product: x * y = k
    // amountOut = (reserveOut * amountIn * (10000 - fee)) / (reserveIn * 10000 + amountIn * (10000 - fee))
    const fee = reserves.fee; // basis points
    const amountInWithFee = amountIn.times(10000 - fee);
    const numerator = reserveOut.times(amountInWithFee);
    const denominator = reserveIn.times(10000).plus(amountInWithFee);
    const amountOut = numerator.div(denominator);

    const feeAmount = amountIn.times(fee).div(10000);
    const effectiveRate = amountOut.div(amountIn).toNumber();
    const priceImpact = amountIn.div(reserveIn).times(100).toNumber();

    return {
      inputAmount,
      outputAmount: amountOut.toFixed(6),
      effectiveRate,
      priceImpact,
      fee: feeAmount.toFixed(6),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // STELLAR LIQUIDITY POOL OPERATIONS
  // ═══════════════════════════════════════════════════════════

  /**
   * Create a Stellar liquidity pool
   */
  async createStellarPool(
    asset1: StellarSdk.Asset,
    asset2: StellarSdk.Asset,
    amount1: string,
    amount2: string,
    fee: number = 30 // basis points
  ): Promise<string> {
    const account = await this.stellarServer.loadAccount(this.stellarKeypair.publicKey());

    const lpAsset = new StellarSdk.LiquidityPoolAsset(asset1, asset2, fee);
    const poolId = (lpAsset as any).getLiquidityPoolId ? 
      (lpAsset as any).getLiquidityPoolId() : 
      `${asset1.code}-${asset2.code}`;

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.PUBLIC,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: lpAsset,
        })
      )
      .addOperation(
        StellarSdk.Operation.liquidityPoolDeposit({
          liquidityPoolId: poolId,
          maxAmountA: amount1,
          maxAmountB: amount2,
          minPrice: { n: 1, d: 1 },
          maxPrice: { n: 1000000, d: 1 },
        })
      )
      .setTimeout(180)
      .build();

    tx.sign(this.stellarKeypair);
    await this.stellarServer.submitTransaction(tx);

    console.log(`✓ Created Stellar LP: ${asset1.code}/${asset2.code} → Pool ID: ${poolId}`);
    return poolId;
  }

  /**
   * Add liquidity to Stellar pool
   */
  async addStellarLiquidity(
    poolId: string,
    amount1: string,
    amount2: string
  ): Promise<void> {
    const account = await this.stellarServer.loadAccount(this.stellarKeypair.publicKey());

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.PUBLIC,
    })
      .addOperation(
        StellarSdk.Operation.liquidityPoolDeposit({
          liquidityPoolId: poolId,
          maxAmountA: amount1,
          maxAmountB: amount2,
          minPrice: { n: 1, d: 1 },
          maxPrice: { n: 1000000, d: 1 },
        })
      )
      .setTimeout(180)
      .build();

    tx.sign(this.stellarKeypair);
    await this.stellarServer.submitTransaction(tx);

    console.log(`✓ Added Stellar liquidity: ${amount1} + ${amount2}`);
  }

  /**
   * Get Stellar pool reserves
   */
  async getStellarPoolState(poolId: string): Promise<PoolReserves> {
    const pool = await this.stellarServer.liquidityPools().liquidityPoolId(poolId).call();

    return {
      asset1: { code: pool.reserves[0].asset.split(':')[0], amount: pool.reserves[0].amount },
      asset2: { code: pool.reserves[1].asset.split(':')[0], amount: pool.reserves[1].amount },
      totalShares: pool.total_shares,
      fee: pool.fee_bp,
    };
  }

  /**
   * Quote a Stellar pool swap
   */
  quoteStellarSwap(
    reserves: PoolReserves,
    inputAsset: string,
    inputAmount: string
  ): SwapQuote {
    // Same constant product formula as XRPL
    return this.quoteXRPLSwap(reserves, inputAsset, inputAmount);
  }
}
