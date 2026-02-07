/**
 * @optkas/settlement — Settlement & Clearing Engine
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Atomic settlement engine for institutional DvP:
 * - Delivery vs Payment (DvP): asset delivery conditional on payment
 * - Cross-currency clearing via XRPL path payments
 * - Bilateral netting for reduced settlement obligations
 * - Escrow-backed settlement for trustless execution
 * - Payment channel support for high-frequency micro-settlements
 * - Multi-leg settlement for complex structured transactions
 * - Full audit trail of every settlement lifecycle event
 *
 * Settlement models:
 * - T+0 (real-time gross settlement via XRPL)
 * - T+1/T+2 (deferred net settlement with netting)
 * - Escrow-mediated (conditional release on delivery confirmation)
 */

import { XRPLClient, PreparedTransaction } from '@optkas/xrpl-core';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────

export type SettlementStatus =
  | 'pending'
  | 'matched'
  | 'clearing'
  | 'settling'
  | 'settled'
  | 'failed'
  | 'cancelled'
  | 'disputed';

export type SettlementModel = 'rtgs' | 'deferred_net' | 'escrow_mediated' | 'payment_channel';

export interface SettlementLeg {
  id: string;
  direction: 'delivery' | 'payment';
  from: string;              // XRPL address
  to: string;                // XRPL address
  amount: string;
  currency: string;
  issuer?: string;           // For IOU currencies
  status: 'pending' | 'executed' | 'failed';
  txHash?: string;
  executedAt?: string;
}

export interface SettlementInstruction {
  id: string;
  model: SettlementModel;
  status: SettlementStatus;
  legs: SettlementLeg[];

  // Participants
  buyer: string;
  seller: string;

  // Reference
  tradeId?: string;
  bondId?: string;
  rwaAssetId?: string;

  // Timing
  tradeDate: string;
  settlementDate: string;     // T+N
  deadline: string;           // Fail if not settled by this time

  // Netting (for deferred_net model)
  nettingGroupId?: string;

  // Escrow (for escrow_mediated model)
  escrowCondition?: string;
  escrowFulfillment?: string;
  escrowId?: string;

  // Audit
  events: SettlementEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface SettlementEvent {
  timestamp: string;
  type: string;
  actor: string;
  data: Record<string, unknown>;
}

export interface NettingResult {
  groupId: string;
  participants: string[];
  originalObligations: number;
  nettedObligations: number;
  reductionPercent: string;
  netPositions: Array<{
    participant: string;
    currency: string;
    netAmount: string;
    direction: 'pay' | 'receive';
  }>;
}

export interface PaymentChannelConfig {
  source: string;
  destination: string;
  amount: string;            // Channel capacity in drops
  settleDelay: number;       // Seconds before channel can be closed
  publicKey: string;
}

// ─── Settlement Engine ────────────────────────────────────────────────

export class SettlementEngine extends EventEmitter {
  private client: XRPLClient;
  private instructions: Map<string, SettlementInstruction> = new Map();
  private nettingGroups: Map<string, SettlementInstruction[]> = new Map();

  constructor(client: XRPLClient) {
    super();
    this.client = client;
  }

  // ─── DvP Settlement ────────────────────────────────────────────

  /**
   * Create a DvP settlement instruction.
   * Delivery leg: asset IOU transfer (seller → buyer)
   * Payment leg: stablecoin/XRP transfer (buyer → seller)
   */
  createDvPInstruction(params: {
    buyer: string;
    seller: string;
    assetCurrency: string;
    assetIssuer: string;
    assetAmount: string;
    paymentCurrency: string;
    paymentIssuer?: string;
    paymentAmount: string;
    model: SettlementModel;
    tradeDate?: string;
    settlementDays?: number;
    tradeId?: string;
    bondId?: string;
  }): SettlementInstruction {
    const now = new Date();
    const settleDays = params.settlementDays ?? 2;
    const settleDate = new Date(now);
    settleDate.setDate(settleDate.getDate() + settleDays);

    const deadline = new Date(settleDate);
    deadline.setHours(deadline.getHours() + 4); // 4-hour grace

    const instruction: SettlementInstruction = {
      id: `SETT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      model: params.model,
      status: 'pending',
      legs: [
        {
          id: `LEG-D-${crypto.randomBytes(3).toString('hex')}`,
          direction: 'delivery',
          from: params.seller,
          to: params.buyer,
          amount: params.assetAmount,
          currency: params.assetCurrency,
          issuer: params.assetIssuer,
          status: 'pending',
        },
        {
          id: `LEG-P-${crypto.randomBytes(3).toString('hex')}`,
          direction: 'payment',
          from: params.buyer,
          to: params.seller,
          amount: params.paymentAmount,
          currency: params.paymentCurrency,
          issuer: params.paymentIssuer,
          status: 'pending',
        },
      ],
      buyer: params.buyer,
      seller: params.seller,
      tradeId: params.tradeId,
      bondId: params.bondId,
      tradeDate: params.tradeDate || now.toISOString(),
      settlementDate: settleDate.toISOString(),
      deadline: deadline.toISOString(),
      events: [{
        timestamp: now.toISOString(),
        type: 'instruction_created',
        actor: 'system',
        data: { model: params.model, legs: 2 },
      }],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.instructions.set(instruction.id, instruction);
    this.emit('instruction_created', instruction);
    return instruction;
  }

  // ─── Real-Time Gross Settlement (RTGS) ─────────────────────────

  /**
   * Execute RTGS settlement — both legs in sequence.
   * Delivery first, then payment (or reversed per configuration).
   */
  async executeRTGS(
    instructionId: string,
    dryRun = true
  ): Promise<PreparedTransaction[]> {
    const instruction = this.getInstructionOrThrow(instructionId);
    if (instruction.model !== 'rtgs') {
      throw new Error(`Instruction ${instructionId} is not RTGS model`);
    }

    instruction.status = 'settling';
    const txns: PreparedTransaction[] = [];

    for (const leg of instruction.legs) {
      const amount = leg.issuer
        ? { currency: leg.currency, issuer: leg.issuer, value: leg.amount }
        : leg.amount; // XRP in drops

      const tx = await this.client.prepareTransaction(
        {
          TransactionType: 'Payment' as const,
          Account: leg.from,
          Destination: leg.to,
          Amount: amount as any,
          Memos: [{
            Memo: {
              MemoType: XRPLClient.hexEncode('settlement/rtgs'),
              MemoData: XRPLClient.hexEncode(JSON.stringify({
                instructionId: instruction.id,
                legId: leg.id,
                direction: leg.direction,
              })),
            },
          }],
        } as any,
        `RTGS ${leg.direction.toUpperCase()}: ${leg.amount} ${leg.currency} (${leg.from} → ${leg.to})`,
        dryRun
      );

      txns.push(tx);
    }

    this.addEvent(instructionId, 'rtgs_prepared', 'system', { legCount: txns.length });
    return txns;
  }

  // ─── Escrow-Mediated Settlement ────────────────────────────────

  /**
   * Create escrow for payment leg, then execute delivery leg.
   * Escrow releases when delivery is confirmed (fulfillment provided).
   */
  async prepareEscrowSettlement(
    instructionId: string,
    dryRun = true
  ): Promise<{
    escrowCreateTx: PreparedTransaction;
    deliveryTx: PreparedTransaction;
    escrowFinishTx: PreparedTransaction;
  }> {
    const instruction = this.getInstructionOrThrow(instructionId);
    if (instruction.model !== 'escrow_mediated') {
      throw new Error(`Instruction ${instructionId} is not escrow_mediated`);
    }

    const paymentLeg = instruction.legs.find((l) => l.direction === 'payment');
    const deliveryLeg = instruction.legs.find((l) => l.direction === 'delivery');
    if (!paymentLeg || !deliveryLeg) throw new Error('Missing settlement legs');

    // Generate crypto condition for escrow
    const preimage = crypto.randomBytes(32);
    const condition = crypto.createHash('sha256').update(
      crypto.createHash('sha256').update(preimage).digest()
    ).digest();

    const conditionHex = condition.toString('hex').toUpperCase();
    const fulfillmentHex = preimage.toString('hex').toUpperCase();

    instruction.escrowCondition = conditionHex;
    instruction.escrowFulfillment = fulfillmentHex;

    // 1. Create escrow for payment
    const finishAfter = new Date();
    finishAfter.setMinutes(finishAfter.getMinutes() + 5);
    const cancelAfter = new Date(instruction.deadline);

    const escrowCreateTx = await this.client.prepareTransaction(
      {
        TransactionType: 'EscrowCreate' as const,
        Account: paymentLeg.from,
        Destination: paymentLeg.to,
        Amount: paymentLeg.amount, // XRP in drops
        Condition: conditionHex,
        FinishAfter: Math.floor(finishAfter.getTime() / 1000),
        CancelAfter: Math.floor(cancelAfter.getTime() / 1000),
      } as any,
      `ESCROW CREATE: ${paymentLeg.amount} drops (${paymentLeg.from} → ${paymentLeg.to})`,
      dryRun
    );

    // 2. Delivery leg (asset transfer)
    const deliveryAmount = deliveryLeg.issuer
      ? { currency: deliveryLeg.currency, issuer: deliveryLeg.issuer, value: deliveryLeg.amount }
      : deliveryLeg.amount;

    const deliveryTx = await this.client.prepareTransaction(
      {
        TransactionType: 'Payment' as const,
        Account: deliveryLeg.from,
        Destination: deliveryLeg.to,
        Amount: deliveryAmount as any,
      } as any,
      `DELIVERY: ${deliveryLeg.amount} ${deliveryLeg.currency} (${deliveryLeg.from} → ${deliveryLeg.to})`,
      dryRun
    );

    // 3. Escrow finish (after delivery confirmed)
    const escrowFinishTx = await this.client.prepareTransaction(
      {
        TransactionType: 'EscrowFinish' as const,
        Account: paymentLeg.to,
        Owner: paymentLeg.from,
        OfferSequence: 0, // Set at execution time
        Condition: conditionHex,
        Fulfillment: fulfillmentHex,
      } as any,
      `ESCROW FINISH: Release payment after delivery confirmation`,
      dryRun
    );

    instruction.status = 'clearing';
    this.addEvent(instructionId, 'escrow_prepared', 'system', {
      conditionHex: conditionHex.slice(0, 16) + '...',
    });

    return { escrowCreateTx, deliveryTx, escrowFinishTx };
  }

  // ─── Bilateral Netting ─────────────────────────────────────────

  /**
   * Net all pending instructions between two or more participants.
   * Reduces gross obligations to net positions.
   */
  calculateNetting(instructionIds: string[]): NettingResult {
    const groupId = `NET-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const obligations: Map<string, Map<string, number>> = new Map(); // participant → currency → net
    const participants = new Set<string>();

    let originalCount = 0;

    for (const id of instructionIds) {
      const instruction = this.instructions.get(id);
      if (!instruction) continue;
      if (instruction.status !== 'pending' && instruction.status !== 'matched') continue;

      originalCount++;
      instruction.nettingGroupId = groupId;

      for (const leg of instruction.legs) {
        participants.add(leg.from);
        participants.add(leg.to);

        const key = leg.issuer ? `${leg.currency}.${leg.issuer}` : leg.currency;
        const amount = parseFloat(leg.amount);

        // From side: negative (outflow)
        if (!obligations.has(leg.from)) obligations.set(leg.from, new Map());
        const fromMap = obligations.get(leg.from)!;
        fromMap.set(key, (fromMap.get(key) || 0) - amount);

        // To side: positive (inflow)
        if (!obligations.has(leg.to)) obligations.set(leg.to, new Map());
        const toMap = obligations.get(leg.to)!;
        toMap.set(key, (toMap.get(key) || 0) + amount);
      }
    }

    // Build net positions
    const netPositions: NettingResult['netPositions'] = [];
    let nettedCount = 0;

    for (const [participant, currencyMap] of obligations.entries()) {
      for (const [currency, netAmount] of currencyMap.entries()) {
        if (Math.abs(netAmount) < 0.00001) continue; // Zero'd out

        nettedCount++;
        netPositions.push({
          participant,
          currency,
          netAmount: Math.abs(netAmount).toFixed(8),
          direction: netAmount > 0 ? 'receive' : 'pay',
        });
      }
    }

    const reduction = originalCount > 0
      ? (((originalCount * 2 - nettedCount) / (originalCount * 2)) * 100)
      : 0;

    const result: NettingResult = {
      groupId,
      participants: Array.from(participants),
      originalObligations: originalCount * 2,
      nettedObligations: nettedCount,
      reductionPercent: reduction.toFixed(1),
      netPositions,
    };

    // Store group
    const groupInstructions = instructionIds
      .map((id) => this.instructions.get(id))
      .filter(Boolean) as SettlementInstruction[];
    this.nettingGroups.set(groupId, groupInstructions);

    this.emit('netting_calculated', result);
    return result;
  }

  // ─── Payment Channels ──────────────────────────────────────────

  /**
   * Prepare payment channel creation for high-frequency micro-settlements.
   */
  async preparePaymentChannel(
    config: PaymentChannelConfig,
    dryRun = true
  ): Promise<PreparedTransaction> {
    return this.client.prepareTransaction(
      {
        TransactionType: 'PaymentChannelCreate' as const,
        Account: config.source,
        Destination: config.destination,
        Amount: config.amount,
        SettleDelay: config.settleDelay,
        PublicKey: config.publicKey,
      } as any,
      `CHANNEL CREATE: ${config.amount} drops (${config.source} → ${config.destination})`,
      dryRun
    );
  }

  /**
   * Prepare payment channel claim.
   */
  async prepareChannelClaim(
    channelId: string,
    account: string,
    amount: string,
    signature: string,
    publicKey: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    return this.client.prepareTransaction(
      {
        TransactionType: 'PaymentChannelClaim' as const,
        Account: account,
        Channel: channelId,
        Amount: amount,
        Signature: signature,
        PublicKey: publicKey,
      } as any,
      `CHANNEL CLAIM: ${amount} drops from channel ${channelId.slice(0, 12)}...`,
      dryRun
    );
  }

  // ─── Status Management ─────────────────────────────────────────

  markLegExecuted(instructionId: string, legId: string, txHash: string): void {
    const instruction = this.getInstructionOrThrow(instructionId);
    const leg = instruction.legs.find((l) => l.id === legId);
    if (!leg) throw new Error(`Leg not found: ${legId}`);

    leg.status = 'executed';
    leg.txHash = txHash;
    leg.executedAt = new Date().toISOString();

    // Check if all legs settled
    const allExecuted = instruction.legs.every((l) => l.status === 'executed');
    if (allExecuted) {
      instruction.status = 'settled';
      this.emit('settlement_complete', { instructionId });
    }

    instruction.updatedAt = new Date().toISOString();
    this.addEvent(instructionId, 'leg_executed', 'system', { legId, txHash });
  }

  failInstruction(instructionId: string, reason: string): void {
    const instruction = this.getInstructionOrThrow(instructionId);
    instruction.status = 'failed';
    instruction.updatedAt = new Date().toISOString();
    this.addEvent(instructionId, 'settlement_failed', 'system', { reason });
    this.emit('settlement_failed', { instructionId, reason });
  }

  disputeInstruction(instructionId: string, reason: string, disputedBy: string): void {
    const instruction = this.getInstructionOrThrow(instructionId);
    instruction.status = 'disputed';
    instruction.updatedAt = new Date().toISOString();
    this.addEvent(instructionId, 'disputed', disputedBy, { reason });
    this.emit('settlement_disputed', { instructionId, reason, disputedBy });
  }

  // ─── Queries ───────────────────────────────────────────────────

  getInstruction(id: string): SettlementInstruction | undefined {
    return this.instructions.get(id);
  }

  getAllInstructions(): SettlementInstruction[] {
    return Array.from(this.instructions.values());
  }

  getPendingInstructions(): SettlementInstruction[] {
    return this.getAllInstructions().filter((i) =>
      ['pending', 'matched', 'clearing', 'settling'].includes(i.status)
    );
  }

  getInstructionsByParticipant(address: string): SettlementInstruction[] {
    return this.getAllInstructions().filter(
      (i) => i.buyer === address || i.seller === address
    );
  }

  getNettingGroup(groupId: string): SettlementInstruction[] {
    return this.nettingGroups.get(groupId) || [];
  }

  /**
   * Settlement pipeline summary.
   */
  getPipelineSummary(): {
    total: number;
    pending: number;
    settling: number;
    settled: number;
    failed: number;
    disputed: number;
    totalValueSettled: string;
  } {
    const all = this.getAllInstructions();
    let totalSettled = 0;

    for (const inst of all) {
      if (inst.status === 'settled') {
        for (const leg of inst.legs) {
          if (leg.direction === 'payment') {
            totalSettled += parseFloat(leg.amount);
          }
        }
      }
    }

    return {
      total: all.length,
      pending: all.filter((i) => i.status === 'pending').length,
      settling: all.filter((i) => ['matched', 'clearing', 'settling'].includes(i.status)).length,
      settled: all.filter((i) => i.status === 'settled').length,
      failed: all.filter((i) => i.status === 'failed').length,
      disputed: all.filter((i) => i.status === 'disputed').length,
      totalValueSettled: totalSettled.toFixed(2),
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private getInstructionOrThrow(id: string): SettlementInstruction {
    const instruction = this.instructions.get(id);
    if (!instruction) throw new Error(`Settlement instruction not found: ${id}`);
    return instruction;
  }

  private addEvent(
    instructionId: string,
    type: string,
    actor: string,
    data: Record<string, unknown>
  ): void {
    const instruction = this.instructions.get(instructionId);
    if (!instruction) return;
    instruction.events.push({
      timestamp: new Date().toISOString(),
      type,
      actor,
      data,
    });
  }
}

export default SettlementEngine;
