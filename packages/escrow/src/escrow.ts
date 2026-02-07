/**
 * @optkas/escrow — XRPL Escrow Management
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Manages XRPL escrow creation, monitoring, finish, and cancellation.
 * Escrows provide on-chain evidence of conditional settlement — NOT custody.
 */

import { XRPLClient, PreparedTransaction } from '@optkas/xrpl-core';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────

export interface EscrowTemplate {
  name: string;
  durationDays: number;
  useCryptoCondition: boolean;
  minAmount: number;
  maxAmount: number;
}

export interface EscrowCreateRequest {
  sourceAddress: string;
  destinationAddress: string;
  amount: string; // In drops (XRP) or IOU string
  templateName: string;
  lenderId: string;
  bondId: string;
  finishAfterDays?: number;
  cancelAfterDays?: number;
}

export interface EscrowCondition {
  condition: string;  // Hex-encoded crypto-condition
  fulfillment: string; // Hex-encoded fulfillment (stored in HSM, NEVER logged)
}

export interface EscrowStatus {
  sequence: number;
  account: string;
  destination: string;
  amount: string;
  finishAfter?: string;
  cancelAfter?: string;
  condition?: string;
  status: 'active' | 'finished' | 'cancelled' | 'expired';
}

// ─── Escrow Manager ──────────────────────────────────────────────────

export class EscrowManager extends EventEmitter {
  private client: XRPLClient;
  private templates: Map<string, EscrowTemplate> = new Map();

  constructor(client: XRPLClient) {
    super();
    this.client = client;
  }

  /**
   * Emit a structured audit event for downstream capture.
   */
  private emitAuditEvent(type: string, details: Record<string, unknown>): void {
    this.emit('audit', {
      type,
      timestamp: new Date().toISOString(),
      component: '@optkas/escrow',
      layer: 5,
      details,
    });
  }

  /**
   * Register an escrow template from configuration.
   */
  registerTemplate(template: EscrowTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Generate a PREIMAGE-SHA-256 crypto-condition.
   * The fulfillment is a random 32-byte preimage.
   * The condition is the SHA-256 hash of the fulfillment, DER-encoded.
   *
   * CRITICAL: The fulfillment must be stored in HSM/KMS — never in code or logs.
   */
  static generateCondition(): EscrowCondition {
    // Generate random 32-byte preimage
    const preimage = crypto.randomBytes(32);

    // SHA-256 of the preimage
    const hash = crypto.createHash('sha256').update(preimage).digest();

    // DER-encode as PREIMAGE-SHA-256 (type 0)
    // Condition: A0 25 80 20 <32-byte-hash> 81 01 20
    const conditionBuffer = Buffer.concat([
      Buffer.from('A0258020', 'hex'),
      hash,
      Buffer.from('810120', 'hex'),
    ]);

    // Fulfillment: A0 22 80 20 <32-byte-preimage>
    const fulfillmentBuffer = Buffer.concat([
      Buffer.from('A0228020', 'hex'),
      preimage,
    ]);

    return {
      condition: conditionBuffer.toString('hex').toUpperCase(),
      fulfillment: fulfillmentBuffer.toString('hex').toUpperCase(),
    };
  }

  /**
   * Prepare an EscrowCreate transaction (unsigned).
   */
  async prepareCreate(
    request: EscrowCreateRequest,
    dryRun = true
  ): Promise<{ prepared: PreparedTransaction; condition?: EscrowCondition }> {
    const template = this.templates.get(request.templateName);
    if (!template) {
      throw new Error(`Unknown escrow template: ${request.templateName}`);
    }

    const amount = parseFloat(request.amount);
    if (amount < template.minAmount || amount > template.maxAmount) {
      throw new Error(
        `Amount ${amount} outside template limits [${template.minAmount}, ${template.maxAmount}]`
      );
    }

    const now = new Date();
    const finishAfter = new Date(now);
    finishAfter.setDate(finishAfter.getDate() + (request.finishAfterDays || 1));

    const cancelAfter = new Date(now);
    cancelAfter.setDate(cancelAfter.getDate() + (request.cancelAfterDays || template.durationDays));

    const tx: any = {
      TransactionType: 'EscrowCreate',
      Account: request.sourceAddress,
      Destination: request.destinationAddress,
      Amount: XRPLClient.xrpToDrops(request.amount),
      FinishAfter: XRPLClient.isoToRippleTime(finishAfter.toISOString()),
      CancelAfter: XRPLClient.isoToRippleTime(cancelAfter.toISOString()),
      Memos: [{
        Memo: {
          MemoType: XRPLClient.hexEncode('escrow/bond-funding'),
          MemoData: XRPLClient.hexEncode(JSON.stringify({
            bondId: request.bondId,
            lenderId: request.lenderId,
            template: request.templateName,
            amount: request.amount,
            currency: 'XRP',
            createdAt: now.toISOString(),
          })),
        },
      }],
    };

    let condition: EscrowCondition | undefined;
    if (template.useCryptoCondition) {
      condition = EscrowManager.generateCondition();
      tx.Condition = condition.condition;
      // CRITICAL: condition.fulfillment must be stored in HSM — NEVER logged
    }

    const prepared = await this.client.prepareTransaction(
      tx,
      `Create escrow: ${request.amount} XRP from ${request.sourceAddress} to ${request.destinationAddress} (template: ${request.templateName})`,
      dryRun
    );

    this.emitAuditEvent('escrow_created', {
      source: request.sourceAddress,
      destination: request.destinationAddress,
      amount: request.amount,
      template: request.templateName,
      bondId: request.bondId,
      lenderId: request.lenderId,
      hasCondition: !!condition,
      dryRun,
    });

    return { prepared, condition };
  }

  /**
   * Prepare an EscrowFinish transaction (unsigned).
   */
  async prepareFinish(
    finisherAddress: string,
    escrowCreator: string,
    escrowSequence: number,
    fulfillment?: string,
    condition?: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    const tx: any = {
      TransactionType: 'EscrowFinish',
      Account: finisherAddress,
      Owner: escrowCreator,
      OfferSequence: escrowSequence,
    };

    if (fulfillment && condition) {
      tx.Condition = condition;
      tx.Fulfillment = fulfillment;
    }

    return this.client.prepareTransaction(
      tx,
      `Finish escrow: owner=${escrowCreator}, seq=${escrowSequence}`,
      dryRun
    );
  }

  /**
   * Prepare an EscrowCancel transaction (unsigned).
   */
  async prepareCancel(
    cancellerAddress: string,
    escrowCreator: string,
    escrowSequence: number,
    dryRun = true
  ): Promise<PreparedTransaction> {
    const tx = {
      TransactionType: 'EscrowCancel' as const,
      Account: cancellerAddress,
      Owner: escrowCreator,
      OfferSequence: escrowSequence,
    };

    return this.client.prepareTransaction(
      tx,
      `Cancel escrow: owner=${escrowCreator}, seq=${escrowSequence}`,
      dryRun
    );
  }

  /**
   * Get all active escrows for an account.
   */
  async getEscrows(address: string): Promise<EscrowStatus[]> {
    const objects = await this.client.getEscrows(address);

    return (objects as any[]).map((obj) => ({
      sequence: obj.PreviousTxnLgrSeq,
      account: obj.Account,
      destination: obj.Destination,
      amount: XRPLClient.dropsToXrp(obj.Amount),
      finishAfter: obj.FinishAfter
        ? XRPLClient.rippleTimeToIso(obj.FinishAfter)
        : undefined,
      cancelAfter: obj.CancelAfter
        ? XRPLClient.rippleTimeToIso(obj.CancelAfter)
        : undefined,
      condition: obj.Condition,
      status: 'active' as const,
    }));
  }
}

export default EscrowManager;
