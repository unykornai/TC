/**
 * @optkas/attestation — Document Hash Anchoring
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Anchors SHA-256 hashes of documents, events, and reports to XRPL and Stellar.
 * Provides immutable, timestamped evidence that specific data existed at specific times.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { XRPLClient, PreparedTransaction } from '@optkas/xrpl-core';
import { StellarClient, StellarPreparedTransaction } from '@optkas/stellar-core';

// ─── Types ───────────────────────────────────────────────────────────

export type AttestationType =
  | 'document-hash'
  | 'collateral-snapshot'
  | 'governance-action'
  | 'reconciliation'
  | 'audit-report'
  | 'incident'
  | 'platform-init'
  | 'settlement'
  | 'signer-rotation'
  | 'deposit';

export interface AttestationRequest {
  hash: string;          // SHA-256 hex string
  type: AttestationType;
  description?: string;
  metadata?: Record<string, string>;
}

export interface AttestationResult {
  hash: string;
  type: AttestationType;
  xrpl?: { prepared: PreparedTransaction };
  stellar?: { prepared: StellarPreparedTransaction };
  timestamp: string;
}

export interface DocumentHashResult {
  filePath: string;
  fileName: string;
  sha256: string;
  size: number;
}

// ─── Attestation Engine ──────────────────────────────────────────────

export class AttestationEngine {
  private xrplClient?: XRPLClient;
  private stellarClient?: StellarClient;
  private attestationXrplAddress?: string;
  private attestationStellarAddress?: string;
  private issuerXrplAddress?: string;

  constructor(options: {
    xrplClient?: XRPLClient;
    stellarClient?: StellarClient;
    attestationXrplAddress?: string;
    attestationStellarAddress?: string;
    issuerXrplAddress?: string;
  }) {
    this.xrplClient = options.xrplClient;
    this.stellarClient = options.stellarClient;
    this.attestationXrplAddress = options.attestationXrplAddress;
    this.attestationStellarAddress = options.attestationStellarAddress;
    this.issuerXrplAddress = options.issuerXrplAddress;
  }

  // ─── Hashing ────────────────────────────────────────────────────

  /**
   * Compute SHA-256 hash of a file.
   */
  static hashFile(filePath: string): DocumentHashResult {
    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const stats = fs.statSync(filePath);

    return {
      filePath,
      fileName: path.basename(filePath),
      sha256: hash,
      size: stats.size,
    };
  }

  /**
   * Compute SHA-256 hash of a string/buffer.
   */
  static hashData(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Hash all files in a directory recursively.
   */
  static hashDirectory(dirPath: string): DocumentHashResult[] {
    const results: DocumentHashResult[] = [];

    function walk(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          results.push(AttestationEngine.hashFile(fullPath));
        }
      }
    }

    walk(dirPath);
    return results;
  }

  // ─── XRPL Attestation ──────────────────────────────────────────

  /**
   * Prepare an XRPL attestation transaction (unsigned).
   * Uses a Payment with memo to anchor the hash.
   */
  async prepareXrplAttestation(
    request: AttestationRequest,
    dryRun = true
  ): Promise<PreparedTransaction | null> {
    if (!this.xrplClient || !this.attestationXrplAddress || !this.issuerXrplAddress) {
      return null;
    }

    const memoData = {
      sha256: request.hash,
      type: request.type,
      timestamp: new Date().toISOString(),
      attestedBy: 'OPTKAS-PLATFORM',
      ...(request.description && { description: request.description }),
      ...(request.metadata && { metadata: request.metadata }),
    };

    const tx: any = {
      TransactionType: 'Payment',
      Account: this.attestationXrplAddress,
      Destination: this.attestationXrplAddress, // Self-payment
      Amount: {
        currency: 'ATTEST',
        issuer: this.issuerXrplAddress,
        value: '0.000001',
      },
      Memos: [{
        Memo: {
          MemoType: XRPLClient.hexEncode(`attestation/${request.type}`),
          MemoData: XRPLClient.hexEncode(JSON.stringify(memoData)),
        },
      }],
    };

    return this.xrplClient.prepareTransaction(
      tx,
      `Attest ${request.type}: ${request.hash.substring(0, 16)}...`,
      dryRun
    );
  }

  // ─── Stellar Attestation ────────────────────────────────────────

  /**
   * Prepare a Stellar attestation transaction (unsigned).
   * Uses ManageData operation to anchor the hash.
   */
  async prepareStellarAttestation(
    request: AttestationRequest,
    dryRun = true
  ): Promise<StellarPreparedTransaction | null> {
    if (!this.stellarClient || !this.attestationStellarAddress) {
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dataName = `attest:${request.type}:${timestamp}`;
    const dataValue = Buffer.from(request.hash, 'hex');

    const op = StellarClient.buildManageDataOp(dataName, dataValue);

    return this.stellarClient.prepareTransaction(
      this.attestationStellarAddress,
      [op],
      `Attest ${request.type}: ${request.hash.substring(0, 16)}...`,
      dryRun
    );
  }

  // ─── Dual-Ledger Attestation ────────────────────────────────────

  /**
   * Prepare attestation on both XRPL and Stellar (unsigned).
   */
  async prepareDualAttestation(
    request: AttestationRequest,
    dryRun = true
  ): Promise<AttestationResult> {
    const [xrplResult, stellarResult] = await Promise.all([
      this.prepareXrplAttestation(request, dryRun),
      this.prepareStellarAttestation(request, dryRun),
    ]);

    return {
      hash: request.hash,
      type: request.type,
      xrpl: xrplResult ? { prepared: xrplResult } : undefined,
      stellar: stellarResult ? { prepared: stellarResult } : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Hash and attest a single document on both ledgers.
   */
  async hashAndAttest(
    filePath: string,
    type: AttestationType,
    dryRun = true
  ): Promise<{ hash: DocumentHashResult; attestation: AttestationResult }> {
    const hash = AttestationEngine.hashFile(filePath);

    const attestation = await this.prepareDualAttestation(
      {
        hash: hash.sha256,
        type,
        description: `File: ${hash.fileName}`,
        metadata: { size: hash.size.toString() },
      },
      dryRun
    );

    return { hash, attestation };
  }

  /**
   * Hash and attest all documents in a directory.
   */
  async hashAndAttestDirectory(
    dirPath: string,
    type: AttestationType,
    dryRun = true
  ): Promise<{ hash: DocumentHashResult; attestation: AttestationResult }[]> {
    const hashes = AttestationEngine.hashDirectory(dirPath);
    const results = [];

    for (const hash of hashes) {
      const attestation = await this.prepareDualAttestation(
        {
          hash: hash.sha256,
          type,
          description: `File: ${hash.fileName}`,
          metadata: { size: hash.size.toString(), path: hash.filePath },
        },
        dryRun
      );
      results.push({ hash, attestation });
    }

    return results;
  }
}

export default AttestationEngine;
