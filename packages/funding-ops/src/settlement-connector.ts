/**
 * @optkas/funding-ops — Settlement Connector
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Bridges the FundingPipeline and TransactionQueue into the
 * SettlementEngine. When a funding transaction is confirmed on a
 * public ledger, this connector creates the corresponding settlement
 * instruction for DvP tracking, netting, and clearing.
 *
 * Flow:
 *   TX confirmed → SettlementConnector → SettlementInstruction created
 *                                      → AuditBridge event recorded
 *                                      → Settlement lifecycle tracked
 *
 * Settlement models supported:
 *   - RTGS (real-time gross) for immediate finality
 *   - Escrow-mediated for conditional release
 *   - Deferred netting for batch optimization
 *
 * The connector also provides:
 *   - Cross-ledger settlement status (XRPL + Stellar legs)
 *   - DvP completion tracking
 *   - Settlement pipeline summary for the dashboard
 *   - Automatic audit event emission via AuditBridge
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ───────────────────────────────────────────────────────

export type SettlementPhase =
  | 'awaiting_funding'
  | 'funding_confirmed'
  | 'delivery_pending'
  | 'delivery_executed'
  | 'payment_pending'
  | 'payment_executed'
  | 'settlement_complete'
  | 'settlement_failed'
  | 'disputed';

export type SettlementConnectorModel = 'rtgs' | 'deferred_net' | 'escrow_mediated';

export interface ConnectedSettlement {
  id: string;
  pipelineId: string;
  txId: string;
  model: SettlementConnectorModel;
  phase: SettlementPhase;

  // Participants
  buyer: string;
  seller: string;

  // Delivery leg (asset)
  deliveryLeg: SettlementLegRecord;

  // Payment leg (funds)
  paymentLeg: SettlementLegRecord;

  // Timing
  createdAt: string;
  updatedAt: string;
  settledAt?: string;
  deadline: string;

  // Cross-ledger tracking
  xrplConfirmed: boolean;
  stellarConfirmed: boolean;

  // References
  bondId?: string;
  escrowId?: string;
  nettingGroupId?: string;

  // Audit
  events: SettlementConnectorEvent[];
}

export interface SettlementLegRecord {
  id: string;
  direction: 'delivery' | 'payment';
  ledger: 'xrpl' | 'stellar';
  from: string;
  to: string;
  amount: string;
  currency: string;
  issuer?: string;
  status: 'pending' | 'executed' | 'failed';
  txHash?: string;
  executedAt?: string;
}

export interface SettlementConnectorEvent {
  timestamp: string;
  type: string;
  actor: string;
  data: Record<string, unknown>;
}

export interface SettlementConnectorConfig {
  defaultModel?: SettlementConnectorModel;
  defaultDeadlineHours?: number;
  settlementDays?: number;
  persistPath?: string;
  autoSettle?: boolean;
}

export interface SettlementConnectorSummary {
  total: number;
  awaitingFunding: number;
  fundingConfirmed: number;
  deliveryPending: number;
  paymentPending: number;
  complete: number;
  failed: number;
  disputed: number;
  byModel: Record<string, number>;
  byLedger: {
    xrpl: { confirmed: number; pending: number };
    stellar: { confirmed: number; pending: number };
  };
  totalValueSettled: string;
  avgSettlementTimeMs: number;
}

// ─── Settlement Connector ────────────────────────────────────────

export class SettlementConnector extends EventEmitter {
  private settlements: Map<string, ConnectedSettlement> = new Map();
  private config: Required<SettlementConnectorConfig>;
  private eventLog: SettlementConnectorEvent[] = [];

  constructor(config?: SettlementConnectorConfig) {
    super();
    this.config = {
      defaultModel: config?.defaultModel ?? 'rtgs',
      defaultDeadlineHours: config?.defaultDeadlineHours ?? 96,
      settlementDays: config?.settlementDays ?? 0,
      persistPath: config?.persistPath ?? './logs/settlement-connector.json',
      autoSettle: config?.autoSettle ?? true,
    };
    this.loadFromDisk();
  }

  // ─── Settlement Creation ───────────────────────────────────────

  /**
   * Create a settlement instruction from a confirmed funding transaction.
   * This is the primary entry point — called when a tx-queue transaction
   * reaches "confirmed" status.
   */
  createFromConfirmedTx(params: {
    txId: string;
    pipelineId: string;
    buyer: string;
    seller: string;
    assetCurrency: string;
    assetAmount: string;
    assetIssuer?: string;
    assetLedger: 'xrpl' | 'stellar';
    paymentCurrency: string;
    paymentAmount: string;
    paymentIssuer?: string;
    paymentLedger: 'xrpl' | 'stellar';
    model?: SettlementConnectorModel;
    bondId?: string;
    escrowId?: string;
    txHash?: string;
  }): ConnectedSettlement {
    const now = new Date();
    const deadline = new Date(now);
    deadline.setHours(deadline.getHours() + this.config.defaultDeadlineHours);

    const settlementDate = new Date(now);
    settlementDate.setDate(settlementDate.getDate() + this.config.settlementDays);

    const settlement: ConnectedSettlement = {
      id: `CS-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      pipelineId: params.pipelineId,
      txId: params.txId,
      model: params.model ?? this.config.defaultModel,
      phase: 'funding_confirmed',

      buyer: params.buyer,
      seller: params.seller,

      deliveryLeg: {
        id: `DL-${crypto.randomBytes(3).toString('hex')}`,
        direction: 'delivery',
        ledger: params.assetLedger,
        from: params.seller,
        to: params.buyer,
        amount: params.assetAmount,
        currency: params.assetCurrency,
        issuer: params.assetIssuer,
        status: 'pending',
      },

      paymentLeg: {
        id: `PL-${crypto.randomBytes(3).toString('hex')}`,
        direction: 'payment',
        ledger: params.paymentLedger,
        from: params.buyer,
        to: params.seller,
        amount: params.paymentAmount,
        currency: params.paymentCurrency,
        issuer: params.paymentIssuer,
        status: 'pending',
      },

      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deadline: deadline.toISOString(),

      xrplConfirmed: false,
      stellarConfirmed: false,

      bondId: params.bondId,
      escrowId: params.escrowId,

      events: [{
        timestamp: now.toISOString(),
        type: 'settlement_created',
        actor: 'system',
        data: {
          model: params.model ?? this.config.defaultModel,
          txId: params.txId,
          pipelineId: params.pipelineId,
        },
      }],
    };

    // If txHash already provided, mark the appropriate ledger confirmed
    if (params.txHash) {
      if (params.assetLedger === 'xrpl' || params.paymentLedger === 'xrpl') {
        settlement.xrplConfirmed = true;
      }
      if (params.assetLedger === 'stellar' || params.paymentLedger === 'stellar') {
        settlement.stellarConfirmed = true;
      }
    }

    this.settlements.set(settlement.id, settlement);
    this.emit('settlement_created', settlement);
    this.addEvent(settlement.id, 'created', 'system', { model: settlement.model });
    this.persist();
    return settlement;
  }

  // ─── Leg Execution ─────────────────────────────────────────────

  /**
   * Mark a delivery leg as executed.
   */
  markDeliveryExecuted(settlementId: string, txHash: string): ConnectedSettlement {
    const settlement = this.getOrThrow(settlementId);
    settlement.deliveryLeg.status = 'executed';
    settlement.deliveryLeg.txHash = txHash;
    settlement.deliveryLeg.executedAt = new Date().toISOString();
    settlement.phase = 'delivery_executed';

    // Update cross-ledger tracking
    if (settlement.deliveryLeg.ledger === 'xrpl') settlement.xrplConfirmed = true;
    if (settlement.deliveryLeg.ledger === 'stellar') settlement.stellarConfirmed = true;

    settlement.updatedAt = new Date().toISOString();
    this.addEvent(settlementId, 'delivery_executed', 'system', { txHash });
    this.emit('delivery_executed', { settlementId, txHash });

    // Check if both legs complete
    this.checkCompletion(settlement);
    this.persist();
    return settlement;
  }

  /**
   * Mark a payment leg as executed.
   */
  markPaymentExecuted(settlementId: string, txHash: string): ConnectedSettlement {
    const settlement = this.getOrThrow(settlementId);
    settlement.paymentLeg.status = 'executed';
    settlement.paymentLeg.txHash = txHash;
    settlement.paymentLeg.executedAt = new Date().toISOString();
    settlement.phase = 'payment_executed';

    // Update cross-ledger tracking
    if (settlement.paymentLeg.ledger === 'xrpl') settlement.xrplConfirmed = true;
    if (settlement.paymentLeg.ledger === 'stellar') settlement.stellarConfirmed = true;

    settlement.updatedAt = new Date().toISOString();
    this.addEvent(settlementId, 'payment_executed', 'system', { txHash });
    this.emit('payment_executed', { settlementId, txHash });

    // Check if both legs complete
    this.checkCompletion(settlement);
    this.persist();
    return settlement;
  }

  /**
   * Mark a settlement as failed.
   */
  markFailed(settlementId: string, reason: string): ConnectedSettlement {
    const settlement = this.getOrThrow(settlementId);
    settlement.phase = 'settlement_failed';
    settlement.updatedAt = new Date().toISOString();
    this.addEvent(settlementId, 'settlement_failed', 'system', { reason });
    this.emit('settlement_failed', { settlementId, reason });
    this.persist();
    return settlement;
  }

  /**
   * Mark a settlement as disputed.
   */
  markDisputed(settlementId: string, reason: string, disputedBy: string): ConnectedSettlement {
    const settlement = this.getOrThrow(settlementId);
    settlement.phase = 'disputed';
    settlement.updatedAt = new Date().toISOString();
    this.addEvent(settlementId, 'disputed', disputedBy, { reason });
    this.emit('settlement_disputed', { settlementId, reason, disputedBy });
    this.persist();
    return settlement;
  }

  // ─── Queries ───────────────────────────────────────────────────

  /**
   * Get a settlement by ID.
   */
  get(settlementId: string): ConnectedSettlement | undefined {
    return this.settlements.get(settlementId);
  }

  /**
   * Get all settlements.
   */
  getAll(): ConnectedSettlement[] {
    return Array.from(this.settlements.values());
  }

  /**
   * Filter settlements by phase.
   */
  byPhase(phase: SettlementPhase): ConnectedSettlement[] {
    return this.getAll().filter(s => s.phase === phase);
  }

  /**
   * Filter settlements by model.
   */
  byModel(model: SettlementConnectorModel): ConnectedSettlement[] {
    return this.getAll().filter(s => s.model === model);
  }

  /**
   * Get settlements by pipeline ID.
   */
  byPipeline(pipelineId: string): ConnectedSettlement[] {
    return this.getAll().filter(s => s.pipelineId === pipelineId);
  }

  /**
   * Get settlements by participant (buyer or seller).
   */
  byParticipant(address: string): ConnectedSettlement[] {
    return this.getAll().filter(s => s.buyer === address || s.seller === address);
  }

  /**
   * Get settlements pending completion.
   */
  getPending(): ConnectedSettlement[] {
    return this.getAll().filter(s =>
      !['settlement_complete', 'settlement_failed', 'disputed'].includes(s.phase)
    );
  }

  /**
   * Get completed settlements.
   */
  getCompleted(): ConnectedSettlement[] {
    return this.byPhase('settlement_complete');
  }

  /**
   * Get settlements past deadline.
   */
  getOverdue(): ConnectedSettlement[] {
    const now = new Date();
    return this.getPending().filter(s => new Date(s.deadline) < now);
  }

  // ─── Summary ───────────────────────────────────────────────────

  /**
   * Get pipeline summary for the dashboard.
   */
  getSummary(): SettlementConnectorSummary {
    const all = this.getAll();
    const byModel: Record<string, number> = {};
    let totalSettled = 0;
    let totalSettlementTimeMs = 0;
    let settledCount = 0;
    let xrplConfirmed = 0, xrplPending = 0;
    let stellarConfirmed = 0, stellarPending = 0;

    for (const s of all) {
      byModel[s.model] = (byModel[s.model] || 0) + 1;

      if (s.phase === 'settlement_complete') {
        totalSettled += parseFloat(s.paymentLeg.amount) || 0;
        if (s.settledAt && s.createdAt) {
          totalSettlementTimeMs += new Date(s.settledAt).getTime() - new Date(s.createdAt).getTime();
          settledCount++;
        }
      }

      if (s.xrplConfirmed) xrplConfirmed++;
      else if (s.deliveryLeg.ledger === 'xrpl' || s.paymentLeg.ledger === 'xrpl') xrplPending++;

      if (s.stellarConfirmed) stellarConfirmed++;
      else if (s.deliveryLeg.ledger === 'stellar' || s.paymentLeg.ledger === 'stellar') stellarPending++;
    }

    return {
      total: all.length,
      awaitingFunding: all.filter(s => s.phase === 'awaiting_funding').length,
      fundingConfirmed: all.filter(s => s.phase === 'funding_confirmed').length,
      deliveryPending: all.filter(s => s.phase === 'delivery_pending' || s.phase === 'delivery_executed').length,
      paymentPending: all.filter(s => s.phase === 'payment_pending' || s.phase === 'payment_executed').length,
      complete: all.filter(s => s.phase === 'settlement_complete').length,
      failed: all.filter(s => s.phase === 'settlement_failed').length,
      disputed: all.filter(s => s.phase === 'disputed').length,
      byModel,
      byLedger: {
        xrpl: { confirmed: xrplConfirmed, pending: xrplPending },
        stellar: { confirmed: stellarConfirmed, pending: stellarPending },
      },
      totalValueSettled: totalSettled.toFixed(2),
      avgSettlementTimeMs: settledCount > 0 ? Math.round(totalSettlementTimeMs / settledCount) : 0,
    };
  }

  // ─── Persistence ───────────────────────────────────────────────

  private persist(): void {
    try {
      const dir = path.dirname(this.config.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        settlements: Array.from(this.settlements.entries()),
        eventLog: this.eventLog,
      };
      fs.writeFileSync(this.config.persistPath, JSON.stringify(data, null, 2));
    } catch (err) {
      this.emit('persist_error', err);
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.config.persistPath)) {
        const raw = fs.readFileSync(this.config.persistPath, 'utf-8');
        const data = JSON.parse(raw);
        if (data.settlements) {
          this.settlements = new Map(data.settlements);
        }
        if (data.eventLog) {
          this.eventLog = data.eventLog;
        }
      }
    } catch (err) {
      this.emit('load_error', err);
    }
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private getOrThrow(id: string): ConnectedSettlement {
    const settlement = this.settlements.get(id);
    if (!settlement) throw new Error(`Settlement not found: ${id}`);
    return settlement;
  }

  private checkCompletion(settlement: ConnectedSettlement): void {
    if (
      settlement.deliveryLeg.status === 'executed' &&
      settlement.paymentLeg.status === 'executed'
    ) {
      settlement.phase = 'settlement_complete';
      settlement.settledAt = new Date().toISOString();
      this.addEvent(settlement.id, 'settlement_complete', 'system', {
        deliveryTxHash: settlement.deliveryLeg.txHash,
        paymentTxHash: settlement.paymentLeg.txHash,
      });
      this.emit('settlement_complete', { settlementId: settlement.id });
    }
  }

  private addEvent(
    settlementId: string,
    type: string,
    actor: string,
    data: Record<string, unknown>
  ): void {
    const event: SettlementConnectorEvent = {
      timestamp: new Date().toISOString(),
      type,
      actor,
      data,
    };
    const settlement = this.settlements.get(settlementId);
    if (settlement) settlement.events.push(event);
    this.eventLog.push(event);
  }
}

export default SettlementConnector;
