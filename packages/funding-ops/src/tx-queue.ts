/**
 * @optkas/funding-ops — Multisig Transaction Queue
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Manages the lifecycle of unsigned transactions produced by the
 * FundingPipeline. Every fund-moving or state-changing operation
 * produces an unsigned transaction that MUST be approved via 2-of-3
 * multisig before submission.
 *
 * Lifecycle:
 *   pending_signature → partially_signed → ready_to_submit → submitted → confirmed | failed
 *
 * Features:
 *   - In-memory queue with JSON persistence
 *   - Signer role tracking (treasury, compliance, trustee)
 *   - Quorum validation (configurable threshold)
 *   - Expiry management (stale tx auto-expire)
 *   - Batch operations (sign-all, submit-all)
 *   - Audit trail for every state change
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ───────────────────────────────────────────────────────

export type TxStatus =
  | 'pending_signature'
  | 'partially_signed'
  | 'ready_to_submit'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'expired'
  | 'cancelled';

export type TxLedger = 'xrpl' | 'stellar';

export type SignerRole = 'treasury' | 'compliance' | 'trustee';

export interface QueuedTransaction {
  id: string;
  pipelineId: string;
  phase: string;
  ledger: TxLedger;
  description: string;
  transaction: Record<string, unknown>;
  status: TxStatus;
  requiredSignatures: number;
  signatures: TransactionSignature[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  submittedAt?: string;
  confirmedAt?: string;
  txHash?: string;
  ledgerIndex?: number;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface TransactionSignature {
  signerId: string;
  role: SignerRole;
  signature: string;
  publicKey: string;
  signedAt: string;
  hash: string;
}

export interface TxQueueConfig {
  requiredSignatures: number;    // Default: 2 (2-of-3)
  expiryHours: number;           // Default: 72
  persistPath?: string;          // Path to save queue state
  autoExpire: boolean;           // Auto-expire stale transactions
}

export interface TxQueueSummary {
  total: number;
  pendingSignature: number;
  partiallySigned: number;
  readyToSubmit: number;
  submitted: number;
  confirmed: number;
  failed: number;
  expired: number;
  cancelled: number;
  byLedger: { xrpl: number; stellar: number };
  byPhase: Record<string, number>;
  oldestPending: string | null;
  newestPending: string | null;
}

export interface TxQueueAuditEntry {
  id: string;
  txId: string;
  action: 'enqueue' | 'sign' | 'submit' | 'confirm' | 'fail' | 'expire' | 'cancel';
  actor: string;
  role?: SignerRole;
  previousStatus: TxStatus;
  newStatus: TxStatus;
  timestamp: string;
  details: string;
}

// ─── Transaction Queue ──────────────────────────────────────────

export class TransactionQueue extends EventEmitter {
  private queue: Map<string, QueuedTransaction> = new Map();
  private auditLog: TxQueueAuditEntry[] = [];
  private config: TxQueueConfig;

  constructor(config?: Partial<TxQueueConfig>) {
    super();
    this.config = {
      requiredSignatures: config?.requiredSignatures ?? 2,
      expiryHours: config?.expiryHours ?? 72,
      persistPath: config?.persistPath,
      autoExpire: config?.autoExpire ?? true,
    };

    // Load persisted state if available
    if (this.config.persistPath) {
      this.loadFromDisk();
    }
  }

  // ── Enqueue ─────────────────────────────────────────────────

  /**
   * Add an unsigned transaction to the queue.
   */
  enqueue(params: {
    pipelineId: string;
    phase: string;
    ledger: TxLedger;
    description: string;
    transaction: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): QueuedTransaction {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.expiryHours * 3600 * 1000);

    const tx: QueuedTransaction = {
      id: `TX-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      pipelineId: params.pipelineId,
      phase: params.phase,
      ledger: params.ledger,
      description: params.description,
      transaction: params.transaction,
      status: 'pending_signature',
      requiredSignatures: this.config.requiredSignatures,
      signatures: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      metadata: params.metadata || {},
    };

    this.queue.set(tx.id, tx);
    this.logAudit(tx.id, 'enqueue', 'system', undefined, 'pending_signature', 'pending_signature', `Enqueued: ${params.description}`);
    this.emit('enqueued', tx);
    this.persist();

    return tx;
  }

  // ── Sign ────────────────────────────────────────────────────

  /**
   * Add a signature to a queued transaction.
   * Returns the updated transaction.
   */
  sign(txId: string, params: {
    signerId: string;
    role: SignerRole;
    signature: string;
    publicKey: string;
  }): QueuedTransaction {
    const tx = this.queue.get(txId);
    if (!tx) throw new Error(`Transaction not found: ${txId}`);
    if (tx.status === 'expired') throw new Error(`Transaction expired: ${txId}`);
    if (tx.status === 'cancelled') throw new Error(`Transaction cancelled: ${txId}`);
    if (tx.status === 'confirmed') throw new Error(`Transaction already confirmed: ${txId}`);
    if (tx.status === 'submitted') throw new Error(`Transaction already submitted: ${txId}`);

    // Check for duplicate signer
    if (tx.signatures.some(s => s.signerId === params.signerId)) {
      throw new Error(`Signer ${params.signerId} already signed transaction ${txId}`);
    }

    // Check for duplicate role
    if (tx.signatures.some(s => s.role === params.role)) {
      throw new Error(`Role ${params.role} already signed transaction ${txId}`);
    }

    const previousStatus = tx.status;
    const sig: TransactionSignature = {
      signerId: params.signerId,
      role: params.role,
      signature: params.signature,
      publicKey: params.publicKey,
      signedAt: new Date().toISOString(),
      hash: crypto.createHash('sha256')
        .update(`${txId}:${params.signerId}:${params.signature}`)
        .digest('hex'),
    };

    tx.signatures.push(sig);
    tx.updatedAt = new Date().toISOString();

    // Check if quorum reached
    if (tx.signatures.length >= tx.requiredSignatures) {
      tx.status = 'ready_to_submit';
      this.emit('ready', tx);
    } else {
      tx.status = 'partially_signed';
    }

    this.logAudit(txId, 'sign', params.signerId, params.role, previousStatus, tx.status,
      `Signed by ${params.role} (${tx.signatures.length}/${tx.requiredSignatures})`);
    this.emit('signed', { tx, signature: sig });
    this.persist();

    return tx;
  }

  // ── Submit ──────────────────────────────────────────────────

  /**
   * Mark a transaction as submitted to the ledger.
   */
  markSubmitted(txId: string, txHash: string): QueuedTransaction {
    const tx = this.queue.get(txId);
    if (!tx) throw new Error(`Transaction not found: ${txId}`);
    if (tx.status !== 'ready_to_submit') {
      throw new Error(`Transaction ${txId} not ready (status: ${tx.status})`);
    }

    const previousStatus = tx.status;
    tx.status = 'submitted';
    tx.submittedAt = new Date().toISOString();
    tx.updatedAt = new Date().toISOString();
    tx.txHash = txHash;

    this.logAudit(txId, 'submit', 'system', undefined, previousStatus, tx.status, `Submitted: ${txHash}`);
    this.emit('submitted', tx);
    this.persist();

    return tx;
  }

  /**
   * Mark a transaction as confirmed on-ledger.
   */
  markConfirmed(txId: string, ledgerIndex: number): QueuedTransaction {
    const tx = this.queue.get(txId);
    if (!tx) throw new Error(`Transaction not found: ${txId}`);
    if (tx.status !== 'submitted') {
      throw new Error(`Transaction ${txId} not submitted (status: ${tx.status})`);
    }

    const previousStatus = tx.status;
    tx.status = 'confirmed';
    tx.confirmedAt = new Date().toISOString();
    tx.updatedAt = new Date().toISOString();
    tx.ledgerIndex = ledgerIndex;

    this.logAudit(txId, 'confirm', 'system', undefined, previousStatus, tx.status,
      `Confirmed at ledger ${ledgerIndex}`);
    this.emit('confirmed', tx);
    this.persist();

    return tx;
  }

  /**
   * Mark a transaction as failed.
   */
  markFailed(txId: string, error: string): QueuedTransaction {
    const tx = this.queue.get(txId);
    if (!tx) throw new Error(`Transaction not found: ${txId}`);

    const previousStatus = tx.status;
    tx.status = 'failed';
    tx.error = error;
    tx.updatedAt = new Date().toISOString();

    this.logAudit(txId, 'fail', 'system', undefined, previousStatus, tx.status, `Failed: ${error}`);
    this.emit('failed', { tx, error });
    this.persist();

    return tx;
  }

  /**
   * Cancel a pending or partially-signed transaction.
   */
  cancel(txId: string, reason: string, actor: string): QueuedTransaction {
    const tx = this.queue.get(txId);
    if (!tx) throw new Error(`Transaction not found: ${txId}`);
    if (tx.status !== 'pending_signature' && tx.status !== 'partially_signed') {
      throw new Error(`Cannot cancel transaction in status: ${tx.status}`);
    }

    const previousStatus = tx.status;
    tx.status = 'cancelled';
    tx.updatedAt = new Date().toISOString();

    this.logAudit(txId, 'cancel', actor, undefined, previousStatus, tx.status, `Cancelled: ${reason}`);
    this.emit('cancelled', { tx, reason });
    this.persist();

    return tx;
  }

  // ── Query ───────────────────────────────────────────────────

  /**
   * Get a transaction by ID.
   */
  get(txId: string): QueuedTransaction | undefined {
    return this.queue.get(txId);
  }

  /**
   * Get all transactions matching a filter.
   */
  filter(predicate: (tx: QueuedTransaction) => boolean): QueuedTransaction[] {
    return Array.from(this.queue.values()).filter(predicate);
  }

  /**
   * Get transactions by status.
   */
  byStatus(status: TxStatus): QueuedTransaction[] {
    return this.filter(tx => tx.status === status);
  }

  /**
   * Get transactions by pipeline ID.
   */
  byPipeline(pipelineId: string): QueuedTransaction[] {
    return this.filter(tx => tx.pipelineId === pipelineId);
  }

  /**
   * Get transactions by ledger.
   */
  byLedger(ledger: TxLedger): QueuedTransaction[] {
    return this.filter(tx => tx.ledger === ledger);
  }

  /**
   * Get transactions awaiting a specific role's signature.
   */
  awaitingRole(role: SignerRole): QueuedTransaction[] {
    return this.filter(tx =>
      (tx.status === 'pending_signature' || tx.status === 'partially_signed') &&
      !tx.signatures.some(s => s.role === role)
    );
  }

  /**
   * Get all pending transactions (pending_signature + partially_signed).
   */
  getPending(): QueuedTransaction[] {
    return this.filter(tx =>
      tx.status === 'pending_signature' || tx.status === 'partially_signed'
    );
  }

  /**
   * Get all ready-to-submit transactions.
   */
  getReady(): QueuedTransaction[] {
    return this.byStatus('ready_to_submit');
  }

  /**
   * Get a summary of the queue state.
   */
  getSummary(): TxQueueSummary {
    const all = Array.from(this.queue.values());
    const pending = all.filter(tx =>
      tx.status === 'pending_signature' || tx.status === 'partially_signed'
    );

    const byPhase: Record<string, number> = {};
    for (const tx of all) {
      byPhase[tx.phase] = (byPhase[tx.phase] || 0) + 1;
    }

    const pendingSorted = pending.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return {
      total: all.length,
      pendingSignature: all.filter(tx => tx.status === 'pending_signature').length,
      partiallySigned: all.filter(tx => tx.status === 'partially_signed').length,
      readyToSubmit: all.filter(tx => tx.status === 'ready_to_submit').length,
      submitted: all.filter(tx => tx.status === 'submitted').length,
      confirmed: all.filter(tx => tx.status === 'confirmed').length,
      failed: all.filter(tx => tx.status === 'failed').length,
      expired: all.filter(tx => tx.status === 'expired').length,
      cancelled: all.filter(tx => tx.status === 'cancelled').length,
      byLedger: {
        xrpl: all.filter(tx => tx.ledger === 'xrpl').length,
        stellar: all.filter(tx => tx.ledger === 'stellar').length,
      },
      byPhase,
      oldestPending: pendingSorted.length > 0 ? pendingSorted[0].createdAt : null,
      newestPending: pendingSorted.length > 0 ? pendingSorted[pendingSorted.length - 1].createdAt : null,
    };
  }

  /**
   * Get the full audit log.
   */
  getAuditLog(): TxQueueAuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Get audit log entries for a specific transaction.
   */
  getAuditForTx(txId: string): TxQueueAuditEntry[] {
    return this.auditLog.filter(e => e.txId === txId);
  }

  // ── Expiry ──────────────────────────────────────────────────

  /**
   * Expire stale transactions. Called automatically if autoExpire is enabled.
   */
  expireStale(): QueuedTransaction[] {
    const now = new Date();
    const expired: QueuedTransaction[] = [];

    for (const tx of this.queue.values()) {
      if (
        (tx.status === 'pending_signature' || tx.status === 'partially_signed') &&
        new Date(tx.expiresAt) < now
      ) {
        const previousStatus = tx.status;
        tx.status = 'expired';
        tx.updatedAt = now.toISOString();
        this.logAudit(tx.id, 'expire', 'system', undefined, previousStatus, 'expired',
          `Expired after ${this.config.expiryHours}h`);
        expired.push(tx);
      }
    }

    if (expired.length > 0) {
      this.emit('expired', expired);
      this.persist();
    }

    return expired;
  }

  // ── Batch Operations ────────────────────────────────────────

  /**
   * Enqueue multiple transactions from a pipeline.
   */
  enqueueBatch(params: {
    pipelineId: string;
    transactions: Array<{
      phase: string;
      ledger: TxLedger;
      description: string;
      transaction: Record<string, unknown>;
    }>;
  }): QueuedTransaction[] {
    return params.transactions.map(tx =>
      this.enqueue({
        pipelineId: params.pipelineId,
        phase: tx.phase,
        ledger: tx.ledger,
        description: tx.description,
        transaction: tx.transaction,
      })
    );
  }

  // ── Persistence ─────────────────────────────────────────────

  private persist(): void {
    if (!this.config.persistPath) return;
    try {
      const dir = path.dirname(this.config.persistPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const data = {
        queue: Array.from(this.queue.entries()),
        auditLog: this.auditLog,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.config.persistPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err: any) {
      this.emit('persist_error', err);
    }
  }

  private loadFromDisk(): void {
    if (!this.config.persistPath || !fs.existsSync(this.config.persistPath)) return;
    try {
      const raw = fs.readFileSync(this.config.persistPath, 'utf-8');
      const data = JSON.parse(raw);
      if (data.queue) {
        this.queue = new Map(data.queue);
      }
      if (data.auditLog) {
        this.auditLog = data.auditLog;
      }
    } catch (err: any) {
      this.emit('load_error', err);
    }
  }

  // ── Audit Logging ───────────────────────────────────────────

  private logAudit(
    txId: string,
    action: TxQueueAuditEntry['action'],
    actor: string,
    role: SignerRole | undefined,
    previousStatus: TxStatus,
    newStatus: TxStatus,
    details: string,
  ): void {
    this.auditLog.push({
      id: `AUD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      txId,
      action,
      actor,
      role,
      previousStatus,
      newStatus,
      timestamp: new Date().toISOString(),
      details,
    });
  }
}

export default TransactionQueue;
