/**
 * @optkas/issuance — IOU Issuance & Trustline Management
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Manages XRPL IOU issuance (claim receipts) and trustline lifecycle.
 * All transactions prepared unsigned — routed to multisig.
 */

import { XRPLClient, PreparedTransaction, NetworkType } from '@optkas/xrpl-core';
import { EventEmitter } from 'events';

// ─── Types ───────────────────────────────────────────────────────────

export interface TokenConfig {
  currency: string;
  issuerAddress: string;
  maxSupply: string;
  decimalPrecision: number;
  type: 'claim_receipt' | 'settlement_token' | 'evidence_token';
  transferable: boolean;
}

export interface TrustlineRequest {
  currency: string;
  issuerAddress: string;
  recipientAddress: string;
  limit: string;
}

export interface IssuanceRequest {
  currency: string;
  issuerAddress: string;
  recipientAddress: string;
  amount: string;
  memo?: {
    type: string;
    data: string;
  };
}

// ─── Issuer ──────────────────────────────────────────────────────────

export class Issuer extends EventEmitter {
  private client: XRPLClient;

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
      component: '@optkas/issuance',
      layer: 5,
      details,
    });
  }

  /**
   * Prepare a TrustSet transaction (unsigned).
   * The recipient sets a trustline to the issuer for a given currency.
   */
  async prepareTrustline(request: TrustlineRequest, dryRun = true): Promise<PreparedTransaction> {
    const tx = {
      TransactionType: 'TrustSet' as const,
      Account: request.recipientAddress,
      LimitAmount: {
        currency: request.currency,
        issuer: request.issuerAddress,
        value: request.limit,
      },
    };

    return this.client.prepareTransaction(
      tx,
      `Deploy trustline: ${request.recipientAddress} → ${request.issuerAddress} (${request.currency}, limit: ${request.limit})`,
      dryRun
    );
  }

  /**
   * Prepare a batch of trustlines (unsigned).
   */
  async prepareTrustlineBatch(
    requests: TrustlineRequest[],
    dryRun = true
  ): Promise<PreparedTransaction[]> {
    const results: PreparedTransaction[] = [];
    for (const req of requests) {
      results.push(await this.prepareTrustline(req, dryRun));
    }
    return results;
  }

  /**
   * Prepare an IOU issuance Payment transaction (unsigned).
   * Issues a claim receipt from the issuer to the recipient.
   */
  async prepareIssuance(request: IssuanceRequest, dryRun = true): Promise<PreparedTransaction> {
    const tx: any = {
      TransactionType: 'Payment' as const,
      Account: request.issuerAddress,
      Destination: request.recipientAddress,
      Amount: {
        currency: request.currency,
        issuer: request.issuerAddress,
        value: request.amount,
      },
    };

    if (request.memo) {
      tx.Memos = [{
        Memo: {
          MemoType: XRPLClient.hexEncode(request.memo.type),
          MemoData: XRPLClient.hexEncode(request.memo.data),
        },
      }];
    }

    return this.client.prepareTransaction(
      tx,
      `Issue ${request.amount} ${request.currency} to ${request.recipientAddress}`,
      dryRun
    ).then((prepared) => {
      this.emitAuditEvent('iou_issued', {
        currency: request.currency,
        amount: request.amount,
        recipient: request.recipientAddress,
        issuer: request.issuerAddress,
        dryRun,
      });
      return prepared;
    });
  }

  /**
   * Prepare a burn (return to issuer) transaction (unsigned).
   * Burns IOUs by sending them back to the issuer.
   */
  async prepareBurn(
    holderAddress: string,
    currency: string,
    issuerAddress: string,
    amount: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    const tx = {
      TransactionType: 'Payment' as const,
      Account: holderAddress,
      Destination: issuerAddress,
      Amount: {
        currency,
        issuer: issuerAddress,
        value: amount,
      },
    };

    return this.client.prepareTransaction(
      tx,
      `Burn ${amount} ${currency} from ${holderAddress}`,
      dryRun
    );
  }

  /**
   * Query total IOUs outstanding for a given currency.
   */
  async getOutstandingSupply(issuerAddress: string, currency: string): Promise<string> {
    // Query all trustlines from the issuer's perspective using gateway_balances
    const trustlines = await this.client.getTrustlines(issuerAddress);
    let total = 0;
    for (const line of trustlines) {
      if (line.currency === currency) {
        // Negative balance on issuer = outstanding IOUs
        total += Math.abs(parseFloat(line.balance));
      }
    }
    return total.toFixed(6);
  }

  // ─── Freeze / Compliance Controls ─────────────────────────────────

  /**
   * Prepare a TrustSet with freeze flag to freeze a specific holder's trustline.
   * Used for compliance holds — blocks the holder from transacting the IOU.
   * Requires multisig approval.
   */
  async prepareFreezeTrustline(
    issuerAddress: string,
    targetAddress: string,
    currency: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    const tx = {
      TransactionType: 'TrustSet' as const,
      Account: issuerAddress,
      LimitAmount: {
        currency,
        issuer: targetAddress,
        value: '0',
      },
      Flags: 0x00100000, // tfSetFreeze
    };

    return this.client.prepareTransaction(
      tx,
      `COMPLIANCE FREEZE: ${currency} trustline for ${targetAddress}`,
      dryRun
    );
  }

  /**
   * Prepare a TrustSet to unfreeze a specific holder's trustline.
   * Requires multisig approval.
   */
  async prepareUnfreezeTrustline(
    issuerAddress: string,
    targetAddress: string,
    currency: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    const tx = {
      TransactionType: 'TrustSet' as const,
      Account: issuerAddress,
      LimitAmount: {
        currency,
        issuer: targetAddress,
        value: '0',
      },
      Flags: 0x00200000, // tfClearFreeze
    };

    return this.client.prepareTransaction(
      tx,
      `COMPLIANCE UNFREEZE: ${currency} trustline for ${targetAddress}`,
      dryRun
    );
  }

  /**
   * Prepare a global freeze on the issuer account.
   * EMERGENCY USE ONLY — freezes ALL IOUs from this issuer.
   * Requires multisig approval.
   */
  async prepareGlobalFreeze(
    issuerAddress: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    const tx = {
      TransactionType: 'AccountSet' as const,
      Account: issuerAddress,
      SetFlag: 7, // asfGlobalFreeze
    };

    return this.client.prepareTransaction(
      tx,
      `EMERGENCY: Global freeze on issuer ${issuerAddress}`,
      dryRun
    );
  }

  /**
   * Prepare to lift global freeze on the issuer account.
   * Requires 3-of-3 multisig approval (all signers).
   */
  async prepareLiftGlobalFreeze(
    issuerAddress: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    const tx = {
      TransactionType: 'AccountSet' as const,
      Account: issuerAddress,
      ClearFlag: 7, // asfGlobalFreeze
    };

    return this.client.prepareTransaction(
      tx,
      `LIFT GLOBAL FREEZE on issuer ${issuerAddress}`,
      dryRun
    );
  }
}

export default Issuer;
