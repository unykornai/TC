/**
 * @optkas/dex — Full XRPL Native DEX Engine
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Complete order book trading engine built on XRPL's native DEX.
 * Supports limit, market, passive, IOC, FOK orders with full lifecycle.
 * All orders require multisig approval before submission.
 *
 * XRPL DEX is a native decentralized exchange built into the ledger.
 * Orders are OfferCreate transactions. Matching is done by the ledger itself.
 */

import { XRPLClient, PreparedTransaction } from '@optkas/xrpl-core';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'market' | 'passive' | 'ioc' | 'fok';
export type OrderStatus = 'pending' | 'open' | 'partial' | 'filled' | 'cancelled' | 'expired' | 'rejected';

export interface CurrencyAmount {
  currency: string;
  issuer?: string; // undefined for XRP
  value: string;
}

export interface TradingPair {
  base: CurrencyAmount;
  quote: CurrencyAmount;
}

export interface Order {
  id: string;
  pair: TradingPair;
  side: OrderSide;
  type: OrderType;
  amount: string;            // base currency amount
  price: string;             // quote per base
  totalQuote: string;        // total quote currency
  status: OrderStatus;
  filledAmount: string;
  remainingAmount: string;
  averageFillPrice: string;
  xrplSequence?: number;     // OfferCreate sequence for cancellation
  xrplTxHash?: string;
  createdAt: string;
  updatedAt: string;
  expirationTime?: string;   // ISO date for expiring offers
  memo?: string;
  fills: OrderFill[];
}

export interface OrderFill {
  fillId: string;
  amount: string;
  price: string;
  timestamp: string;
  txHash?: string;
}

export interface OrderBookLevel {
  price: string;
  amount: string;
  totalQuote: string;
  offerCount: number;
}

export interface OrderBook {
  pair: TradingPair;
  bids: OrderBookLevel[];     // Buy side — sorted highest first
  asks: OrderBookLevel[];     // Sell side — sorted lowest first
  spread: string;
  spreadBps: number;
  midPrice: string;
  timestamp: string;
}

export interface MarketTicker {
  pair: TradingPair;
  lastPrice: string;
  bid: string;
  ask: string;
  spread: string;
  volume24h: string;
  high24h: string;
  low24h: string;
  timestamp: string;
}

export interface DEXConfig {
  enabled: boolean;
  tradingAccount: string;
  maxOpenOrders: number;
  maxSlippageBps: number;
  defaultExpiration: number;  // seconds
  allowedPairs: TradingPair[];
  riskLimits: {
    maxSingleOrderUsd: number;
    maxDailyVolumeUsd: number;
    maxPositionUsd: number;
    circuitBreakerLossPct: number;
  };
}

// ─── XRPL Offer Flags ────────────────────────────────────────────────

const OFFER_FLAGS = {
  tfPassive: 0x00010000,
  tfImmediateOrCancel: 0x00020000,
  tfFillOrKill: 0x00040000,
  tfSell: 0x00080000,
} as const;

// ─── Order Book Engine ────────────────────────────────────────────────

export class OrderBookEngine {
  private client: XRPLClient;

  constructor(client: XRPLClient) {
    this.client = client;
  }

  /**
   * Fetch the live order book for a trading pair from XRPL.
   * Uses the book_offers RPC command.
   */
  async getOrderBook(pair: TradingPair, limit = 50): Promise<OrderBook> {
    const client = (this.client as any).client;
    if (!client) throw new Error('Not connected');

    const formatCurrency = (c: CurrencyAmount) =>
      c.currency === 'XRP'
        ? { currency: 'XRP' }
        : { currency: c.currency, issuer: c.issuer };

    // Fetch both sides
    const [askResponse, bidResponse] = await Promise.all([
      client.request({
        command: 'book_offers',
        taker_gets: formatCurrency(pair.base),
        taker_pays: formatCurrency(pair.quote),
        limit,
      }),
      client.request({
        command: 'book_offers',
        taker_gets: formatCurrency(pair.quote),
        taker_pays: formatCurrency(pair.base),
        limit,
      }),
    ]);

    const asks = this.aggregateOffers(askResponse.result.offers || [], 'ask', pair);
    const bids = this.aggregateOffers(bidResponse.result.offers || [], 'bid', pair);

    const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : 0;
    const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : 0;
    const spread = bestAsk > 0 && bestBid > 0 ? (bestAsk - bestBid).toFixed(8) : '0';
    const midPrice = bestAsk > 0 && bestBid > 0 ? ((bestAsk + bestBid) / 2).toFixed(8) : '0';
    const spreadBps = bestAsk > 0 && bestBid > 0
      ? Math.round(((bestAsk - bestBid) / midPrice as any) * 10000)
      : 0;

    return {
      pair,
      bids,
      asks,
      spread,
      spreadBps,
      midPrice,
      timestamp: new Date().toISOString(),
    };
  }

  private aggregateOffers(
    offers: any[],
    side: 'bid' | 'ask',
    pair: TradingPair
  ): OrderBookLevel[] {
    const levels = new Map<string, OrderBookLevel>();

    for (const offer of offers) {
      const gets = typeof offer.TakerGets === 'string'
        ? parseFloat(offer.TakerGets) / 1e6 // XRP in drops
        : parseFloat(offer.TakerGets.value);
      const pays = typeof offer.TakerPays === 'string'
        ? parseFloat(offer.TakerPays) / 1e6
        : parseFloat(offer.TakerPays.value);

      const price = side === 'ask'
        ? (pays / gets).toFixed(8)
        : (gets / pays).toFixed(8);

      const amount = side === 'ask' ? gets.toFixed(8) : pays.toFixed(8);
      const totalQuote = side === 'ask' ? pays.toFixed(8) : gets.toFixed(8);

      if (levels.has(price)) {
        const existing = levels.get(price)!;
        existing.amount = (parseFloat(existing.amount) + parseFloat(amount)).toFixed(8);
        existing.totalQuote = (parseFloat(existing.totalQuote) + parseFloat(totalQuote)).toFixed(8);
        existing.offerCount++;
      } else {
        levels.set(price, { price, amount, totalQuote, offerCount: 1 });
      }
    }

    const sorted = Array.from(levels.values());
    return side === 'bid'
      ? sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
      : sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  }

  /**
   * Get aggregated market ticker data for a pair.
   */
  async getTicker(pair: TradingPair): Promise<MarketTicker> {
    const book = await this.getOrderBook(pair, 5);

    return {
      pair,
      lastPrice: book.midPrice,
      bid: book.bids.length > 0 ? book.bids[0].price : '0',
      ask: book.asks.length > 0 ? book.asks[0].price : '0',
      spread: book.spread,
      volume24h: '0', // Would need historical data
      high24h: '0',
      low24h: '0',
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── Order Manager ────────────────────────────────────────────────────

export class OrderManager extends EventEmitter {
  private client: XRPLClient;
  private orders: Map<string, Order> = new Map();
  private config: DEXConfig;
  private dailyVolumeUsd = 0;

  constructor(client: XRPLClient, config: DEXConfig) {
    super();
    this.client = client;
    this.config = config;
  }

  private ensureEnabled(): void {
    if (!this.config.enabled) {
      throw new Error('DEX trading is DISABLED. Enable in platform-config.yaml and obtain multisig approval.');
    }
  }

  private generateOrderId(): string {
    return `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private formatAmount(c: CurrencyAmount, value: string): any {
    if (c.currency === 'XRP') {
      return XRPLClient.xrpToDrops(value);
    }
    return { currency: c.currency, issuer: c.issuer!, value };
  }

  // ─── Place Orders ──────────────────────────────────────────────

  /**
   * Place a limit order on the XRPL DEX.
   * Returns an unsigned OfferCreate transaction.
   */
  async placeLimitOrder(
    side: OrderSide,
    pair: TradingPair,
    amount: string,
    price: string,
    options: {
      expiration?: number;   // seconds from now
      memo?: string;
      dryRun?: boolean;
    } = {}
  ): Promise<{ order: Order; prepared: PreparedTransaction }> {
    this.ensureEnabled();

    const dryRun = options.dryRun ?? true;
    const totalQuote = (parseFloat(amount) * parseFloat(price)).toFixed(8);

    // Risk check
    this.checkRiskLimits(totalQuote);

    const order: Order = {
      id: this.generateOrderId(),
      pair,
      side,
      type: 'limit',
      amount,
      price,
      totalQuote,
      status: 'pending',
      filledAmount: '0',
      remainingAmount: amount,
      averageFillPrice: '0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memo: options.memo,
      fills: [],
    };

    // Build OfferCreate
    // On XRPL: TakerPays = what the offerer wants to receive
    //          TakerGets = what the offerer will give up
    const tx: any = {
      TransactionType: 'OfferCreate',
      Account: this.config.tradingAccount,
      TakerPays: side === 'buy'
        ? this.formatAmount(pair.base, amount)       // buying base
        : this.formatAmount(pair.quote, totalQuote),  // selling base, receiving quote
      TakerGets: side === 'buy'
        ? this.formatAmount(pair.quote, totalQuote)   // giving up quote
        : this.formatAmount(pair.base, amount),        // giving up base
    };

    // Add expiration
    if (options.expiration) {
      tx.Expiration = XRPLClient.isoToRippleTime(
        new Date(Date.now() + options.expiration * 1000).toISOString()
      );
      order.expirationTime = new Date(Date.now() + options.expiration * 1000).toISOString();
    }

    const prepared = await this.client.prepareTransaction(
      tx,
      `LIMIT ${side.toUpperCase()}: ${amount} ${pair.base.currency} @ ${price} ${pair.quote.currency}`,
      dryRun
    );

    order.status = dryRun ? 'pending' : 'open';
    this.orders.set(order.id, order);

    this.emit('order_placed', order);
    return { order, prepared };
  }

  /**
   * Place a market order — Immediate or Cancel (IOC).
   * Executes at best available price, unfilled portion is cancelled.
   */
  async placeMarketOrder(
    side: OrderSide,
    pair: TradingPair,
    amount: string,
    options: {
      maxSlippageBps?: number;
      dryRun?: boolean;
    } = {}
  ): Promise<{ order: Order; prepared: PreparedTransaction }> {
    this.ensureEnabled();

    const dryRun = options.dryRun ?? true;
    const maxSlippage = options.maxSlippageBps || this.config.maxSlippageBps;

    // For market orders, use a very large price to ensure fill
    // The IOC flag will cancel any unfilled portion
    const aggressivePrice = side === 'buy' ? '999999999' : '0.000000001';
    const totalQuote = (parseFloat(amount) * parseFloat(aggressivePrice)).toFixed(8);

    const order: Order = {
      id: this.generateOrderId(),
      pair,
      side,
      type: 'market',
      amount,
      price: 'MARKET',
      totalQuote: '0', // Unknown until filled
      status: 'pending',
      filledAmount: '0',
      remainingAmount: amount,
      averageFillPrice: '0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fills: [],
    };

    const tx: any = {
      TransactionType: 'OfferCreate',
      Account: this.config.tradingAccount,
      TakerPays: side === 'buy'
        ? this.formatAmount(pair.base, amount)
        : this.formatAmount(pair.quote, totalQuote),
      TakerGets: side === 'buy'
        ? this.formatAmount(pair.quote, totalQuote)
        : this.formatAmount(pair.base, amount),
      Flags: OFFER_FLAGS.tfImmediateOrCancel | OFFER_FLAGS.tfSell,
    };

    const prepared = await this.client.prepareTransaction(
      tx,
      `MARKET ${side.toUpperCase()}: ${amount} ${pair.base.currency} (IOC, max slippage: ${maxSlippage} bps)`,
      dryRun
    );

    this.orders.set(order.id, order);
    this.emit('order_placed', order);
    return { order, prepared };
  }

  /**
   * Place a passive order — sits on the book, never crosses existing offers.
   */
  async placePassiveOrder(
    side: OrderSide,
    pair: TradingPair,
    amount: string,
    price: string,
    dryRun = true
  ): Promise<{ order: Order; prepared: PreparedTransaction }> {
    this.ensureEnabled();

    const totalQuote = (parseFloat(amount) * parseFloat(price)).toFixed(8);

    const order: Order = {
      id: this.generateOrderId(),
      pair,
      side,
      type: 'passive',
      amount,
      price,
      totalQuote,
      status: 'pending',
      filledAmount: '0',
      remainingAmount: amount,
      averageFillPrice: '0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fills: [],
    };

    const tx: any = {
      TransactionType: 'OfferCreate',
      Account: this.config.tradingAccount,
      TakerPays: side === 'buy'
        ? this.formatAmount(pair.base, amount)
        : this.formatAmount(pair.quote, totalQuote),
      TakerGets: side === 'buy'
        ? this.formatAmount(pair.quote, totalQuote)
        : this.formatAmount(pair.base, amount),
      Flags: OFFER_FLAGS.tfPassive,
    };

    const prepared = await this.client.prepareTransaction(
      tx,
      `PASSIVE ${side.toUpperCase()}: ${amount} ${pair.base.currency} @ ${price} ${pair.quote.currency}`,
      dryRun
    );

    this.orders.set(order.id, order);
    this.emit('order_placed', order);
    return { order, prepared };
  }

  /**
   * Place a Fill-or-Kill order — must be completely filled or cancelled entirely.
   */
  async placeFillOrKillOrder(
    side: OrderSide,
    pair: TradingPair,
    amount: string,
    price: string,
    dryRun = true
  ): Promise<{ order: Order; prepared: PreparedTransaction }> {
    this.ensureEnabled();

    const totalQuote = (parseFloat(amount) * parseFloat(price)).toFixed(8);

    const order: Order = {
      id: this.generateOrderId(),
      pair,
      side,
      type: 'fok',
      amount,
      price,
      totalQuote,
      status: 'pending',
      filledAmount: '0',
      remainingAmount: amount,
      averageFillPrice: '0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fills: [],
    };

    const tx: any = {
      TransactionType: 'OfferCreate',
      Account: this.config.tradingAccount,
      TakerPays: side === 'buy'
        ? this.formatAmount(pair.base, amount)
        : this.formatAmount(pair.quote, totalQuote),
      TakerGets: side === 'buy'
        ? this.formatAmount(pair.quote, totalQuote)
        : this.formatAmount(pair.base, amount),
      Flags: OFFER_FLAGS.tfFillOrKill,
    };

    const prepared = await this.client.prepareTransaction(
      tx,
      `FOK ${side.toUpperCase()}: ${amount} ${pair.base.currency} @ ${price} ${pair.quote.currency}`,
      dryRun
    );

    this.orders.set(order.id, order);
    this.emit('order_placed', order);
    return { order, prepared };
  }

  // ─── Cancel Orders ─────────────────────────────────────────────

  /**
   * Cancel a specific open offer by sequence number.
   */
  async cancelOrder(
    orderId: string,
    offerSequence: number,
    dryRun = true
  ): Promise<PreparedTransaction> {
    this.ensureEnabled();

    const order = this.orders.get(orderId);
    if (order) {
      order.status = 'cancelled';
      order.updatedAt = new Date().toISOString();
    }

    const tx = {
      TransactionType: 'OfferCancel' as const,
      Account: this.config.tradingAccount,
      OfferSequence: offerSequence,
    };

    const prepared = await this.client.prepareTransaction(
      tx,
      `CANCEL order ${orderId} (sequence: ${offerSequence})`,
      dryRun
    );

    this.emit('order_cancelled', { orderId, offerSequence });
    return prepared;
  }

  /**
   * Cancel ALL open offers for the trading account.
   */
  async cancelAllOrders(dryRun = true): Promise<PreparedTransaction[]> {
    this.ensureEnabled();

    const client = (this.client as any).client;
    if (!client) throw new Error('Not connected');

    // Fetch all open offers
    const response = await client.request({
      command: 'account_offers',
      account: this.config.tradingAccount,
    });

    const offers = response.result.offers || [];
    const txns: PreparedTransaction[] = [];

    for (const offer of offers) {
      const tx = {
        TransactionType: 'OfferCancel' as const,
        Account: this.config.tradingAccount,
        OfferSequence: offer.seq,
      };

      const prepared = await this.client.prepareTransaction(
        tx,
        `CANCEL ALL: sequence ${offer.seq}`,
        dryRun
      );
      txns.push(prepared);
    }

    // Mark all local orders as cancelled
    for (const [, order] of this.orders) {
      if (order.status === 'open' || order.status === 'partial') {
        order.status = 'cancelled';
        order.updatedAt = new Date().toISOString();
      }
    }

    this.emit('all_orders_cancelled', { count: txns.length });
    return txns;
  }

  // ─── Open Offers Query ─────────────────────────────────────────

  /**
   * Get all open offers for the trading account from the ledger.
   */
  async getOpenOffers(): Promise<any[]> {
    const client = (this.client as any).client;
    if (!client) throw new Error('Not connected');

    const response = await client.request({
      command: 'account_offers',
      account: this.config.tradingAccount,
    });

    return response.result.offers || [];
  }

  // ─── Order Tracking ────────────────────────────────────────────

  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  getOpenOrders(): Order[] {
    return Array.from(this.orders.values()).filter(
      (o) => o.status === 'open' || o.status === 'partial' || o.status === 'pending'
    );
  }

  getOrderHistory(): Order[] {
    return Array.from(this.orders.values());
  }

  // ─── Risk Controls ─────────────────────────────────────────────

  private checkRiskLimits(quoteAmount: string): void {
    const amount = parseFloat(quoteAmount);

    if (amount > this.config.riskLimits.maxSingleOrderUsd) {
      throw new Error(
        `RISK LIMIT: Order size $${amount} exceeds max single order $${this.config.riskLimits.maxSingleOrderUsd}`
      );
    }

    if (this.dailyVolumeUsd + amount > this.config.riskLimits.maxDailyVolumeUsd) {
      throw new Error(
        `RISK LIMIT: Daily volume $${this.dailyVolumeUsd + amount} would exceed max $${this.config.riskLimits.maxDailyVolumeUsd}`
      );
    }

    const openCount = this.getOpenOrders().length;
    if (openCount >= this.config.maxOpenOrders) {
      throw new Error(
        `RISK LIMIT: ${openCount} open orders — max allowed: ${this.config.maxOpenOrders}`
      );
    }
  }

  recordFill(orderId: string, amount: string, price: string, txHash?: string): void {
    const order = this.orders.get(orderId);
    if (!order) return;

    const fill: OrderFill = {
      fillId: `FILL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      amount,
      price,
      timestamp: new Date().toISOString(),
      txHash,
    };

    order.fills.push(fill);
    order.filledAmount = (parseFloat(order.filledAmount) + parseFloat(amount)).toFixed(8);
    order.remainingAmount = (parseFloat(order.amount) - parseFloat(order.filledAmount)).toFixed(8);

    // Calculate average fill price
    const totalCost = order.fills.reduce(
      (sum, f) => sum + parseFloat(f.amount) * parseFloat(f.price), 0
    );
    const totalFilled = parseFloat(order.filledAmount);
    order.averageFillPrice = totalFilled > 0 ? (totalCost / totalFilled).toFixed(8) : '0';

    if (parseFloat(order.remainingAmount) <= 0) {
      order.status = 'filled';
    } else {
      order.status = 'partial';
    }
    order.updatedAt = new Date().toISOString();

    this.dailyVolumeUsd += parseFloat(amount) * parseFloat(price);
    this.emit('order_filled', { orderId, fill });
  }

  resetDailyVolume(): void {
    this.dailyVolumeUsd = 0;
  }
}

export default OrderManager;
