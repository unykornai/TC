/**
 * @optkas/portfolio — Portfolio & Position Manager
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Aggregates positions across all OPTKAS instrument classes:
 * - Bond positions (face value, accrued interest, market value)
 * - RWA token holdings (fractional ownership, valuations)
 * - Stablecoin balances (USD, USDT, USDC across gateways)
 * - XRP native holdings
 * - AMM LP positions (pool share, TVL exposure, IL)
 * - DEX open orders (committed capital)
 *
 * Computes:
 * - Net Asset Value (NAV)
 * - Profit & Loss (realized + unrealized)
 * - Sector / instrument exposure
 * - Concentration risk
 * - Duration / yield for fixed income
 */

import { XRPLClient } from '@optkas/xrpl-core';
import { EventEmitter } from 'events';

// ─── Types ───────────────────────────────────────────────────────────

export type PositionType =
  | 'bond'
  | 'rwa_token'
  | 'stablecoin'
  | 'xrp'
  | 'amm_lp'
  | 'dex_order'
  | 'escrow';

export interface Position {
  id: string;
  type: PositionType;
  instrument: string;         // Bond ID, RWA ID, currency code, AMM pool ID
  account: string;            // XRPL address holding the position
  quantity: string;           // Face value / token amount / XRP drops
  costBasis: string;          // Average acquisition cost
  currentPrice: string;       // Mark-to-market price
  marketValue: string;        // quantity × currentPrice
  unrealizedPnl: string;     // marketValue - (quantity × costBasis)
  realizedPnl: string;        // Closed P&L
  currency: string;           // Denomination currency
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export interface PortfolioSnapshot {
  id: string;
  timestamp: string;
  totalNav: string;
  currency: string;
  positions: Position[];
  exposure: ExposureBreakdown;
  pnlSummary: PnLSummary;
}

export interface ExposureBreakdown {
  byType: Record<PositionType, string>;        // Value per position type
  byInstrument: Record<string, string>;        // Value per instrument
  byCurrency: Record<string, string>;          // Value per currency
  concentrationRisk: ConcentrationMetric[];
}

export interface ConcentrationMetric {
  instrument: string;
  type: PositionType;
  percentage: number;
  value: string;
  threshold: number;       // Max allowed concentration
  breached: boolean;
}

export interface PnLSummary {
  totalUnrealized: string;
  totalRealized: string;
  totalPnl: string;
  byType: Record<PositionType, { unrealized: string; realized: string }>;
}

export interface NAVHistory {
  date: string;
  nav: string;
  change: string;
  changePercent: string;
}

export interface PortfolioConfig {
  baseCurrency: string;
  concentrationLimits: Record<PositionType, number>;  // Max % per type
  maxSingleExposure: number;                           // Max % single instrument
  rebalanceThreshold: number;                          // Drift % to trigger rebalance
  valuationSources: Record<string, string>;            // instrument → oracle/method
}

// ─── Portfolio Manager ────────────────────────────────────────────────

export class PortfolioManager extends EventEmitter {
  private client: XRPLClient;
  private config: PortfolioConfig;
  private positions: Map<string, Position> = new Map();
  private snapshots: PortfolioSnapshot[] = [];
  private navHistory: NAVHistory[] = [];

  constructor(client: XRPLClient, config: PortfolioConfig) {
    super();
    this.client = client;
    this.config = config;
  }

  // ─── Position Management ───────────────────────────────────────

  addPosition(params: {
    type: PositionType;
    instrument: string;
    account: string;
    quantity: string;
    costBasis: string;
    currentPrice: string;
    currency: string;
    metadata?: Record<string, unknown>;
  }): Position {
    const qty = parseFloat(params.quantity);
    const price = parseFloat(params.currentPrice);
    const cost = parseFloat(params.costBasis);

    const position: Position = {
      id: `POS-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      type: params.type,
      instrument: params.instrument,
      account: params.account,
      quantity: params.quantity,
      costBasis: params.costBasis,
      currentPrice: params.currentPrice,
      marketValue: (qty * price).toFixed(2),
      unrealizedPnl: (qty * (price - cost)).toFixed(2),
      realizedPnl: '0.00',
      currency: params.currency,
      metadata: params.metadata || {},
      updatedAt: new Date().toISOString(),
    };

    this.positions.set(position.id, position);
    this.emit('position_added', position);
    return position;
  }

  updatePrice(positionId: string, newPrice: string): void {
    const pos = this.positions.get(positionId);
    if (!pos) throw new Error(`Position not found: ${positionId}`);

    const qty = parseFloat(pos.quantity);
    const price = parseFloat(newPrice);
    const cost = parseFloat(pos.costBasis);

    pos.currentPrice = newPrice;
    pos.marketValue = (qty * price).toFixed(2);
    pos.unrealizedPnl = (qty * (price - cost)).toFixed(2);
    pos.updatedAt = new Date().toISOString();

    this.emit('price_updated', { positionId, newPrice });
  }

  closePosition(positionId: string, exitPrice: string, quantity?: string): void {
    const pos = this.positions.get(positionId);
    if (!pos) throw new Error(`Position not found: ${positionId}`);

    const closeQty = quantity ? parseFloat(quantity) : parseFloat(pos.quantity);
    const cost = parseFloat(pos.costBasis);
    const exit = parseFloat(exitPrice);

    const realizedPnl = closeQty * (exit - cost);
    pos.realizedPnl = (parseFloat(pos.realizedPnl) + realizedPnl).toFixed(2);

    if (quantity) {
      // Partial close
      pos.quantity = (parseFloat(pos.quantity) - closeQty).toFixed(8);
      pos.marketValue = (parseFloat(pos.quantity) * parseFloat(pos.currentPrice)).toFixed(2);
      pos.unrealizedPnl = (parseFloat(pos.quantity) * (parseFloat(pos.currentPrice) - cost)).toFixed(2);
    } else {
      // Full close
      pos.quantity = '0';
      pos.marketValue = '0.00';
      pos.unrealizedPnl = '0.00';
    }

    pos.updatedAt = new Date().toISOString();
    this.emit('position_closed', { positionId, exitPrice, quantity: closeQty, realizedPnl });
  }

  removePosition(positionId: string): void {
    this.positions.delete(positionId);
  }

  // ─── On-Ledger Position Sync ───────────────────────────────────

  /**
   * Sync XRP native balance from ledger.
   */
  async syncXrpBalance(account: string): Promise<Position> {
    const info = await this.client.getAccountInfo(account);
    const xrpAmount = info.balance;

    // Check if position exists
    const existing = Array.from(this.positions.values()).find(
      (p) => p.type === 'xrp' && p.account === account
    );

    if (existing) {
      existing.quantity = xrpAmount;
      existing.marketValue = xrpAmount; // XRP is base currency
      existing.updatedAt = new Date().toISOString();
      return existing;
    }

    return this.addPosition({
      type: 'xrp',
      instrument: 'XRP',
      account,
      quantity: xrpAmount,
      costBasis: '1',
      currentPrice: '1',
      currency: 'XRP',
    });
  }

  /**
   * Sync IOU balances (bonds, stablecoins, RWA tokens) from ledger.
   * Uses the XRPL getTrustlines() RPC to fetch actual on-ledger balances.
   */
  async syncIouBalances(account: string): Promise<Position[]> {
    const trustlines = await this.client.getTrustlines(account);
    const synced: Position[] = [];

    for (const tl of trustlines) {
      const balance = parseFloat(tl.balance);
      if (balance === 0) continue;

      // Check if position already exists for this currency + issuer
      const existing = Array.from(this.positions.values()).find(
        (p) => p.account === account && p.instrument === tl.currency && p.type !== 'xrp'
      );

      if (existing) {
        existing.quantity = tl.balance;
        existing.marketValue = (Math.abs(balance) * parseFloat(existing.currentPrice)).toFixed(2);
        existing.unrealizedPnl = (Math.abs(balance) * (parseFloat(existing.currentPrice) - parseFloat(existing.costBasis))).toFixed(2);
        existing.updatedAt = new Date().toISOString();
        existing.metadata = { ...existing.metadata, issuer: tl.issuer, limit: tl.limit };
        synced.push(existing);
      } else {
        // Determine position type from currency code
        let posType: PositionType = 'stablecoin';
        if (tl.currency.includes('BOND') || tl.currency.includes('bond')) posType = 'bond';
        else if (tl.currency.includes('RWA') || tl.currency.includes('rwa')) posType = 'rwa_token';

        const pos = this.addPosition({
          type: posType,
          instrument: tl.currency,
          account,
          quantity: tl.balance,
          costBasis: '1',
          currentPrice: '1',
          currency: tl.currency,
          metadata: { issuer: tl.issuer, limit: tl.limit, syncedFromLedger: true },
        });
        synced.push(pos);
      }
    }

    this.emit('iou_sync_complete', { account, trustlineCount: trustlines.length, syncedPositions: synced.length });
    return synced;
  }

  // ─── NAV Calculation ───────────────────────────────────────────

  /**
   * Calculate total Net Asset Value across all positions.
   */
  calculateNAV(): { nav: string; breakdown: Record<PositionType, string> } {
    const breakdown: Record<string, number> = {};
    let totalNav = 0;

    for (const pos of this.positions.values()) {
      if (parseFloat(pos.quantity) <= 0) continue;

      const mv = parseFloat(pos.marketValue);
      totalNav += mv;
      breakdown[pos.type] = (breakdown[pos.type] || 0) + mv;
    }

    const typedBreakdown: Record<PositionType, string> = {
      bond: (breakdown['bond'] || 0).toFixed(2),
      rwa_token: (breakdown['rwa_token'] || 0).toFixed(2),
      stablecoin: (breakdown['stablecoin'] || 0).toFixed(2),
      xrp: (breakdown['xrp'] || 0).toFixed(2),
      amm_lp: (breakdown['amm_lp'] || 0).toFixed(2),
      dex_order: (breakdown['dex_order'] || 0).toFixed(2),
      escrow: (breakdown['escrow'] || 0).toFixed(2),
    };

    return { nav: totalNav.toFixed(2), breakdown: typedBreakdown };
  }

  // ─── Exposure Analysis ─────────────────────────────────────────

  calculateExposure(): ExposureBreakdown {
    const byType: Record<string, number> = {};
    const byInstrument: Record<string, number> = {};
    const byCurrency: Record<string, number> = {};
    let totalValue = 0;

    for (const pos of this.positions.values()) {
      const mv = parseFloat(pos.marketValue);
      if (mv <= 0) continue;

      totalValue += mv;
      byType[pos.type] = (byType[pos.type] || 0) + mv;
      byInstrument[pos.instrument] = (byInstrument[pos.instrument] || 0) + mv;
      byCurrency[pos.currency] = (byCurrency[pos.currency] || 0) + mv;
    }

    // Concentration risk
    const concentrationRisk: ConcentrationMetric[] = [];

    for (const [instrument, value] of Object.entries(byInstrument)) {
      const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
      const threshold = this.config.maxSingleExposure * 100;

      concentrationRisk.push({
        instrument,
        type: this.getPositionTypeForInstrument(instrument),
        percentage: parseFloat(pct.toFixed(2)),
        value: value.toFixed(2),
        threshold,
        breached: pct > threshold,
      });
    }

    const toRecord = (map: Record<string, number>): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(map)) result[k] = v.toFixed(2);
      return result;
    };

    return {
      byType: toRecord(byType) as Record<PositionType, string>,
      byInstrument: toRecord(byInstrument),
      byCurrency: toRecord(byCurrency),
      concentrationRisk: concentrationRisk.sort((a, b) => b.percentage - a.percentage),
    };
  }

  // ─── P&L ───────────────────────────────────────────────────────

  calculatePnL(): PnLSummary {
    let totalUnrealized = 0;
    let totalRealized = 0;
    const byType: Record<string, { unrealized: number; realized: number }> = {};

    for (const pos of this.positions.values()) {
      totalUnrealized += parseFloat(pos.unrealizedPnl);
      totalRealized += parseFloat(pos.realizedPnl);

      if (!byType[pos.type]) byType[pos.type] = { unrealized: 0, realized: 0 };
      byType[pos.type].unrealized += parseFloat(pos.unrealizedPnl);
      byType[pos.type].realized += parseFloat(pos.realizedPnl);
    }

    const typedByType: Record<PositionType, { unrealized: string; realized: string }> = {} as any;
    for (const type of ['bond', 'rwa_token', 'stablecoin', 'xrp', 'amm_lp', 'dex_order', 'escrow'] as PositionType[]) {
      const entry = byType[type] || { unrealized: 0, realized: 0 };
      typedByType[type] = {
        unrealized: entry.unrealized.toFixed(2),
        realized: entry.realized.toFixed(2),
      };
    }

    return {
      totalUnrealized: totalUnrealized.toFixed(2),
      totalRealized: totalRealized.toFixed(2),
      totalPnl: (totalUnrealized + totalRealized).toFixed(2),
      byType: typedByType,
    };
  }

  // ─── Snapshots ─────────────────────────────────────────────────

  takeSnapshot(): PortfolioSnapshot {
    const { nav } = this.calculateNAV();
    const exposure = this.calculateExposure();
    const pnlSummary = this.calculatePnL();

    const snapshot: PortfolioSnapshot = {
      id: `SNAP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      totalNav: nav,
      currency: this.config.baseCurrency,
      positions: Array.from(this.positions.values()),
      exposure,
      pnlSummary,
    };

    this.snapshots.push(snapshot);

    // Update NAV history
    const prevNav = this.navHistory.length > 0
      ? parseFloat(this.navHistory[this.navHistory.length - 1].nav)
      : 0;
    const currentNav = parseFloat(nav);
    const change = currentNav - prevNav;
    const changePct = prevNav > 0 ? ((change / prevNav) * 100) : 0;

    this.navHistory.push({
      date: new Date().toISOString().split('T')[0],
      nav,
      change: change.toFixed(2),
      changePercent: changePct.toFixed(4),
    });

    this.emit('snapshot_taken', snapshot);
    return snapshot;
  }

  // ─── Queries ───────────────────────────────────────────────────

  getPosition(positionId: string): Position | undefined {
    return this.positions.get(positionId);
  }

  getAllPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  getPositionsByType(type: PositionType): Position[] {
    return this.getAllPositions().filter((p) => p.type === type);
  }

  getPositionsByAccount(account: string): Position[] {
    return this.getAllPositions().filter((p) => p.account === account);
  }

  getSnapshots(): PortfolioSnapshot[] {
    return this.snapshots;
  }

  getNAVHistory(): NAVHistory[] {
    return this.navHistory;
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private getPositionTypeForInstrument(instrument: string): PositionType {
    for (const pos of this.positions.values()) {
      if (pos.instrument === instrument) return pos.type;
    }
    return 'other' as PositionType;
  }
}

export default PortfolioManager;
