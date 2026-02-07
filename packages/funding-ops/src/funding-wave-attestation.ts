/**
 * @optkas/funding-ops — Funding Wave Attestation
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Orchestrates the delivery-layer attestation for a funding wave:
 *   1. Hashes all designated documents (PDFs/MDs)
 *   2. Generates a wave manifest with SHA-256 per document
 *   3. Anchors the combined root hash on XRPL + Stellar
 *   4. Produces a wave receipt (for lender email)
 *   5. Generates the exact lender outreach email body
 *   6. Verifies a previous wave against local files
 *
 * This is Channel 1 in the OPTKAS delivery architecture.
 * It runs BEFORE any data room access is shared or any email is sent.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

// ─── Types ───────────────────────────────────────────────────────────

export type DocumentCategory =
  | 'exec_summary'
  | 'collateral'
  | 'borrowing_base'
  | 'legal'
  | 'platform_audit'
  | 'sponsor_note'
  | 'reporting_controls';

export type WaveStatus =
  | 'draft'
  | 'documents_hashed'
  | 'xrpl_attested'
  | 'stellar_attested'
  | 'dual_attested'
  | 'receipt_generated'
  | 'email_sent'
  | 'verified'
  | 'failed';

export type VerificationResult = 'match' | 'mismatch' | 'file_missing';

export interface WaveDocument {
  id: string;
  name: string;
  fileName: string;
  category: DocumentCategory;
  sha256: string;
  size: number;
  version: string;
  hashTimestamp: string;
}

export interface WaveAttestation {
  ledger: 'xrpl' | 'stellar';
  txHash: string;
  account: string;
  network: string;
  timestamp: string;
  memoType: string;
  rootHash: string;
}

export interface FundingWaveReceipt {
  waveId: string;
  spv: string;
  attestedBy: string;
  createdAt: string;
  status: WaveStatus;
  documents: WaveDocument[];
  rootHash: string;
  attestations: WaveAttestation[];
  documentCount: number;
  totalSize: number;
  version: string;
  integrityHash: string; // SHA-256 of entire receipt (excluding this field)
}

export interface DocumentVerification {
  documentId: string;
  fileName: string;
  expectedHash: string;
  actualHash: string | null;
  result: VerificationResult;
  filePath: string | null;
}

export interface WaveVerificationResult {
  waveId: string;
  verifiedAt: string;
  totalDocuments: number;
  matched: number;
  mismatched: number;
  missing: number;
  allVerified: boolean;
  details: DocumentVerification[];
}

export interface DataRoomFolder {
  code: string;
  name: string;
  files: DataRoomFile[];
}

export interface DataRoomFile {
  name: string;
  sourceDocument?: string; // Wave document name it maps to
  description: string;
}

export interface DataRoomManifest {
  version: string;
  generatedAt: string;
  waveId: string;
  folders: DataRoomFolder[];
  totalFiles: number;
  accessPolicy: string;
}

export interface LenderEmail {
  subject: string;
  body: string;
  recipientPlaceholder: string;
  senderBlock: string;
  generatedAt: string;
  waveId: string;
}

export interface FundingWaveConfig {
  spv?: string;
  attestedBy?: string;
  version?: string;
  xrplAttestationAccount?: string;
  stellarAttestationAccount?: string;
  xrplNetwork?: string;
  stellarNetwork?: string;
  persistPath?: string;
  dataRoomLink?: string;
}

export interface FundingWaveSummary {
  waveId: string | null;
  status: WaveStatus;
  documentCount: number;
  rootHash: string | null;
  xrplAttested: boolean;
  stellarAttested: boolean;
  xrplTxHash: string | null;
  stellarTxHash: string | null;
  lastActivity: string | null;
  totalSize: number;
  version: string;
  receiptsGenerated: number;
  verificationsRun: number;
  lastVerificationPassed: boolean | null;
}

export type FundingWaveEvent =
  | 'document:hashed'
  | 'wave:hashed'
  | 'wave:xrpl-attested'
  | 'wave:stellar-attested'
  | 'wave:receipt-generated'
  | 'wave:verified'
  | 'wave:email-generated'
  | 'error';

// ─── Memo Schema ─────────────────────────────────────────────────────

/**
 * Canonical XRPL Attestation Memo Schema — optkas.funding_wave.attestation.v1
 *
 * This schema is designed for lawyers, auditors, and credit committees.
 * Contains ONLY facts: files, hashes, time, structure.
 * No opinions. No promises. No representations.
 * This keeps it admissible and non-regulatory.
 *
 * MemoType: "attestation/funding-wave"
 * MemoData: Hex-encoded UTF-8 JSON, deterministic key order, no free text.
 *
 * XRPL Transaction:
 *   - Self-payment (1 drop XRP)
 *   - Submitted via 2-of-3 multisig
 *   - Memo is the payload
 */
export interface FundingWaveMemoSchema {
  /** Schema identifier for versioning and legal traceability */
  schema: string;
  /** Funding wave identifier (e.g. FW-2026-01) */
  waveId: string;
  /** Issuing SPV name */
  spv: string;
  /** Network identifier */
  network: string;
  /** Schema version */
  version: string;
  /** ISO 8601 timestamp of attestation */
  timestamp: string;

  /** Per-document hashes — the core payload */
  documents: Array<{
    name: string;
    sha256: string;
  }>;

  /** Merkle-style root hash of sorted document hashes */
  rootHash: string;

  /** Data room structure metadata */
  dataRoom: {
    structureVersion: string;
    folders: number;
    files: number;
  };

  /** XRPL attestation account address */
  issuer: string;
  /** Legal purpose statement — factual, not promissory */
  purpose: string;
  /** Legal effect statement — factual, not promissory */
  legalEffect: string;
}

/** Schema identifier constant */
export const MEMO_SCHEMA_ID = 'optkas.funding_wave.attestation.v1';
/** Data room structure version constant */
export const DATA_ROOM_STRUCTURE_VERSION = 'optkas.lender.dataroom.v1';

// ─── Canonical Document List ─────────────────────────────────────────

export const FUNDING_WAVE_DOCUMENTS: Array<{
  name: string;
  fileName: string;
  category: DocumentCategory;
}> = [
  { name: 'DATA_ROOM_INDEX_v1',                   fileName: 'DATA_ROOM_INDEX_v1.pdf',                   category: 'exec_summary' },
  { name: 'COLLATERAL_VERIFICATION_MEMO',         fileName: 'COLLATERAL_VERIFICATION_MEMO.pdf',         category: 'collateral' },
  { name: 'BORROWING_BASE_POLICY',                fileName: 'BORROWING_BASE_POLICY.pdf',                category: 'borrowing_base' },
  { name: 'VALUATION_JUSTIFICATION_PRESET_B',     fileName: 'VALUATION_JUSTIFICATION_PRESET_B.pdf',     category: 'platform_audit' },
  { name: 'CREDIT_COMMITTEE_POSITIONING',          fileName: 'CREDIT_COMMITTEE_POSITIONING.pdf',          category: 'exec_summary' },
  { name: 'SPONSOR_CONSIDERATION_NOTE_TEMPLATE',  fileName: 'SPONSOR_CONSIDERATION_NOTE_TEMPLATE.pdf',  category: 'sponsor_note' },
  { name: 'SPONSOR_NOTE_ESTOPPEL_TEMPLATE',       fileName: 'SPONSOR_NOTE_ESTOPPEL_TEMPLATE.pdf',       category: 'sponsor_note' },
];

// ─── Canonical Data Room Structure ───────────────────────────────────

export const LENDER_DATA_ROOM_STRUCTURE: DataRoomFolder[] = [
  {
    code: '00_EXEC_SUMMARY',
    name: 'Executive Summary',
    files: [
      { name: 'CREDIT_COMMITTEE_POSITIONING.pdf', sourceDocument: 'CREDIT_COMMITTEE_POSITIONING', description: 'Credit committee brief with risk assessment and recommended terms' },
      { name: 'DATA_ROOM_INDEX.pdf', sourceDocument: 'DATA_ROOM_INDEX_v1', description: 'Complete document index and navigation guide' },
    ],
  },
  {
    code: '01_COLLATERAL',
    name: 'Collateral',
    files: [
      { name: 'COLLATERAL_VERIFICATION_MEMO.pdf', sourceDocument: 'COLLATERAL_VERIFICATION_MEMO', description: 'STC-verified collateral position statement' },
      { name: 'CUSTODY_CONFIRMATION.pdf', description: 'Securities Transfer Corporation custody confirmation' },
      { name: 'VALUATION_SUPPORT.pdf', sourceDocument: 'VALUATION_JUSTIFICATION_PRESET_B', description: 'Preset B valuation justification with replacement cost methodology' },
    ],
  },
  {
    code: '02_BORROWING_BASE',
    name: 'Borrowing Base',
    files: [
      { name: 'BORROWING_BASE_POLICY.pdf', sourceDocument: 'BORROWING_BASE_POLICY', description: 'Haircut methodology and advance rate policy' },
      { name: 'SAMPLE_BORROWING_BASE_CERTIFICATE.pdf', description: 'Auto-generated borrowing base certificate sample' },
    ],
  },
  {
    code: '03_LEGAL',
    name: 'Legal',
    files: [
      { name: 'PLATFORM_AGREEMENT_EXECUTED.pdf', description: 'Executed strategic infrastructure execution agreement' },
      { name: 'SECURITY_AND_CONTROL_TEMPLATE.pdf', description: 'Security and control agreement template' },
      { name: 'UCC_LANGUAGE_DRAFT.pdf', description: 'UCC-1 financing statement language draft' },
    ],
  },
  {
    code: '04_PLATFORM_AND_AUDIT',
    name: 'Platform & Audit',
    files: [
      { name: 'PLATFORM_SUMMARY.pdf', description: 'Platform architecture and capability summary' },
      { name: 'AUDITBRIDGE_OVERVIEW.pdf', description: 'Audit bridge infrastructure and event trail overview' },
      { name: 'DASHBOARD_SCREENSHOTS.pdf', description: 'Live dashboard screenshots showing system status' },
    ],
  },
  {
    code: '05_SPONSOR_NOTE',
    name: 'Sponsor Note',
    files: [
      { name: 'SPONSOR_CONSIDERATION_NOTE_TEMPLATE.pdf', sourceDocument: 'SPONSOR_CONSIDERATION_NOTE_TEMPLATE', description: 'Sponsor Consideration Note template ($2.5M, 6% PIK, 24mo)' },
      { name: 'SPONSOR_NOTE_ESTOPPEL_TEMPLATE.pdf', sourceDocument: 'SPONSOR_NOTE_ESTOPPEL_TEMPLATE', description: 'Estoppel certificate for note financing' },
    ],
  },
  {
    code: '06_REPORTING_AND_CONTROLS',
    name: 'Reporting & Controls',
    files: [
      { name: 'REPORTING_COVENANTS.pdf', description: 'Monthly / quarterly reporting covenant schedule' },
      { name: 'BORROWING_BASE_AUTOMATION_OVERVIEW.pdf', description: 'Automated borrowing base generation system overview' },
    ],
  },
];

// ─── Main Class ──────────────────────────────────────────────────────

export class FundingWaveAttestation extends EventEmitter {
  private config: Required<FundingWaveConfig>;
  private documents: WaveDocument[] = [];
  private attestations: WaveAttestation[] = [];
  private receipts: FundingWaveReceipt[] = [];
  private verifications: WaveVerificationResult[] = [];
  private waveId: string | null = null;
  private rootHash: string | null = null;
  private status: WaveStatus = 'draft';
  private lastActivity: string | null = null;

  constructor(config: FundingWaveConfig = {}) {
    super();
    this.config = {
      spv: config.spv ?? 'OPTKAS1-MAIN SPV',
      attestedBy: config.attestedBy ?? 'OPTKAS Platform',
      version: config.version ?? 'v1',
      xrplAttestationAccount: config.xrplAttestationAccount ?? '',
      stellarAttestationAccount: config.stellarAttestationAccount ?? '',
      xrplNetwork: config.xrplNetwork ?? 'mainnet',
      stellarNetwork: config.stellarNetwork ?? 'mainnet',
      persistPath: config.persistPath ?? './logs/funding-wave-attestation.json',
      dataRoomLink: config.dataRoomLink ?? '[SECURE LINK]',
    };
  }

  // ─── Wave ID Generation ─────────────────────────────────────────

  private generateWaveId(): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const seq = String(this.receipts.length + 1).padStart(3, '0');
    return `FW-${date}-${seq}`;
  }

  // ─── Document Hashing ───────────────────────────────────────────

  /**
   * Hash a single document file and register it in the wave.
   */
  hashDocument(
    filePath: string,
    name: string,
    category: DocumentCategory,
    version: string = 'v1'
  ): WaveDocument {
    const content = fs.readFileSync(filePath);
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    const stats = fs.statSync(filePath);

    const doc: WaveDocument = {
      id: `DOC-${String(this.documents.length + 1).padStart(3, '0')}`,
      name,
      fileName: path.basename(filePath),
      category,
      sha256,
      size: stats.size,
      version,
      hashTimestamp: new Date().toISOString(),
    };

    this.documents.push(doc);
    this.emit('document:hashed', doc);
    return doc;
  }

  /**
   * Hash a document from raw content (for testing or in-memory docs).
   */
  hashDocumentFromContent(
    content: string | Buffer,
    name: string,
    fileName: string,
    category: DocumentCategory,
    version: string = 'v1'
  ): WaveDocument {
    const buf = typeof content === 'string' ? Buffer.from(content) : content;
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');

    const doc: WaveDocument = {
      id: `DOC-${String(this.documents.length + 1).padStart(3, '0')}`,
      name,
      fileName,
      category,
      sha256,
      size: buf.length,
      version,
      hashTimestamp: new Date().toISOString(),
    };

    this.documents.push(doc);
    this.emit('document:hashed', doc);
    return doc;
  }

  /**
   * Hash all canonical funding wave documents from a directory.
   */
  hashCanonicalDocuments(basePath: string, version: string = 'v1'): WaveDocument[] {
    const results: WaveDocument[] = [];

    for (const spec of FUNDING_WAVE_DOCUMENTS) {
      const filePath = path.join(basePath, spec.fileName);
      if (fs.existsSync(filePath)) {
        const doc = this.hashDocument(filePath, spec.name, spec.category, version);
        results.push(doc);
      }
    }

    return results;
  }

  /**
   * Compute the root hash from all registered documents.
   * Root hash = SHA-256 of sorted individual hashes concatenated.
   */
  computeRootHash(): string {
    if (this.documents.length === 0) {
      throw new Error('No documents registered. Hash documents first.');
    }

    const sortedHashes = this.documents
      .map(d => d.sha256)
      .sort()
      .join('');

    this.rootHash = crypto.createHash('sha256').update(sortedHashes).digest('hex');
    this.waveId = this.generateWaveId();
    this.status = 'documents_hashed';
    this.lastActivity = new Date().toISOString();
    this.emit('wave:hashed', { waveId: this.waveId, rootHash: this.rootHash, count: this.documents.length });

    return this.rootHash;
  }

  // ─── XRPL Memo Construction ─────────────────────────────────────

  /**
   * Build the XRPL memo schema for this funding wave.
   */
  buildXrplMemo(): FundingWaveMemoSchema {
    if (!this.waveId || !this.rootHash) {
      throw new Error('Wave not hashed. Call computeRootHash() first.');
    }

    const totalFiles = LENDER_DATA_ROOM_STRUCTURE.reduce(
      (sum, folder) => sum + folder.files.length, 0
    );

    return {
      schema: MEMO_SCHEMA_ID,
      waveId: this.waveId,
      spv: this.config.spv,
      network: `xrpl-${this.config.xrplNetwork}`,
      version: this.config.version,
      timestamp: new Date().toISOString(),
      documents: this.documents.map(d => ({
        name: d.fileName,
        sha256: d.sha256,
      })),
      rootHash: this.rootHash,
      dataRoom: {
        structureVersion: DATA_ROOM_STRUCTURE_VERSION,
        folders: LENDER_DATA_ROOM_STRUCTURE.length,
        files: totalFiles,
      },
      issuer: this.config.xrplAttestationAccount || 'OPTKAS_ATTESTATION_ACCOUNT',
      purpose: 'Verified delivery of institutional funding package',
      legalEffect: 'Evidence of existence, integrity, and delivery timing',
    };
  }

  /**
   * Build the raw XRPL transaction (unsigned) for memo attestation.
   */
  buildXrplTransaction(): {
    TransactionType: string;
    Account: string;
    Destination: string;
    Amount: string;
    Memos: Array<{ Memo: { MemoType: string; MemoData: string } }>;
  } {
    const memo = this.buildXrplMemo();
    const account = this.config.xrplAttestationAccount || '<ATTESTATION_ACCOUNT>';

    return {
      TransactionType: 'Payment',
      Account: account,
      Destination: account, // Self-payment
      Amount: '1', // 1 drop of XRP
      Memos: [{
        Memo: {
          MemoType: Buffer.from('attestation/funding-wave').toString('hex').toUpperCase(),
          MemoData: Buffer.from(JSON.stringify(memo)).toString('hex').toUpperCase(),
        },
      }],
    };
  }

  // ─── Attestation Recording ──────────────────────────────────────

  /**
   * Record an XRPL attestation (after transaction is submitted).
   */
  recordXrplAttestation(txHash: string, network?: string): WaveAttestation {
    if (!this.rootHash) throw new Error('Wave not hashed.');

    const attestation: WaveAttestation = {
      ledger: 'xrpl',
      txHash,
      account: this.config.xrplAttestationAccount || '<ATTESTATION_ACCOUNT>',
      network: network ?? this.config.xrplNetwork,
      timestamp: new Date().toISOString(),
      memoType: 'attestation/funding-wave',
      rootHash: this.rootHash,
    };

    this.attestations.push(attestation);
    this.status = this.attestations.some(a => a.ledger === 'stellar')
      ? 'dual_attested'
      : 'xrpl_attested';
    this.lastActivity = new Date().toISOString();
    this.emit('wave:xrpl-attested', attestation);

    return attestation;
  }

  /**
   * Record a Stellar attestation (after transaction is submitted).
   */
  recordStellarAttestation(txHash: string, network?: string): WaveAttestation {
    if (!this.rootHash) throw new Error('Wave not hashed.');

    const attestation: WaveAttestation = {
      ledger: 'stellar',
      txHash,
      account: this.config.stellarAttestationAccount || '<ATTESTATION_ACCOUNT>',
      network: network ?? this.config.stellarNetwork,
      timestamp: new Date().toISOString(),
      memoType: 'manage_data/funding-wave',
      rootHash: this.rootHash,
    };

    this.attestations.push(attestation);
    this.status = this.attestations.some(a => a.ledger === 'xrpl')
      ? 'dual_attested'
      : 'stellar_attested';
    this.lastActivity = new Date().toISOString();
    this.emit('wave:stellar-attested', attestation);

    return attestation;
  }

  // ─── Receipt Generation ─────────────────────────────────────────

  /**
   * Generate a complete wave receipt capturing the full attestation state.
   */
  generateReceipt(): FundingWaveReceipt {
    if (!this.waveId || !this.rootHash) {
      throw new Error('Wave not hashed. Call computeRootHash() first.');
    }

    const totalSize = this.documents.reduce((sum, d) => sum + d.size, 0);

    // Build receipt without integrity hash first
    const receipt: FundingWaveReceipt = {
      waveId: this.waveId,
      spv: this.config.spv,
      attestedBy: this.config.attestedBy,
      createdAt: new Date().toISOString(),
      status: this.status,
      documents: [...this.documents],
      rootHash: this.rootHash,
      attestations: [...this.attestations],
      documentCount: this.documents.length,
      totalSize,
      version: this.config.version,
      integrityHash: '', // computed below
    };

    // Compute integrity hash of receipt itself
    const receiptForHash = { ...receipt, integrityHash: undefined };
    receipt.integrityHash = crypto.createHash('sha256')
      .update(JSON.stringify(receiptForHash))
      .digest('hex');

    this.receipts.push(receipt);
    this.status = 'receipt_generated';
    this.lastActivity = new Date().toISOString();
    this.emit('wave:receipt-generated', receipt);

    return receipt;
  }

  // ─── Verification ───────────────────────────────────────────────

  /**
   * Verify a wave receipt against local files.
   * Confirms no version drift has occurred since attestation.
   */
  verifyWave(
    receipt: FundingWaveReceipt,
    basePath: string
  ): WaveVerificationResult {
    const details: DocumentVerification[] = [];

    for (const doc of receipt.documents) {
      const filePath = path.join(basePath, doc.fileName);
      let actualHash: string | null = null;
      let result: VerificationResult;

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);
        actualHash = crypto.createHash('sha256').update(content).digest('hex');
        result = actualHash === doc.sha256 ? 'match' : 'mismatch';
      } else {
        result = 'file_missing';
      }

      details.push({
        documentId: doc.id,
        fileName: doc.fileName,
        expectedHash: doc.sha256,
        actualHash,
        result,
        filePath: fs.existsSync(filePath) ? filePath : null,
      });
    }

    const matched = details.filter(d => d.result === 'match').length;
    const mismatched = details.filter(d => d.result === 'mismatch').length;
    const missing = details.filter(d => d.result === 'file_missing').length;

    const verification: WaveVerificationResult = {
      waveId: receipt.waveId,
      verifiedAt: new Date().toISOString(),
      totalDocuments: receipt.documents.length,
      matched,
      mismatched,
      missing,
      allVerified: matched === receipt.documents.length,
      details,
    };

    this.verifications.push(verification);
    this.emit('wave:verified', verification);

    return verification;
  }

  /**
   * Verify from raw content map (for testing).
   */
  verifyWaveFromContent(
    receipt: FundingWaveReceipt,
    contentMap: Map<string, string | Buffer>
  ): WaveVerificationResult {
    const details: DocumentVerification[] = [];

    for (const doc of receipt.documents) {
      const content = contentMap.get(doc.fileName);
      let actualHash: string | null = null;
      let result: VerificationResult;

      if (content !== undefined) {
        const buf = typeof content === 'string' ? Buffer.from(content) : content;
        actualHash = crypto.createHash('sha256').update(buf).digest('hex');
        result = actualHash === doc.sha256 ? 'match' : 'mismatch';
      } else {
        result = 'file_missing';
      }

      details.push({
        documentId: doc.id,
        fileName: doc.fileName,
        expectedHash: doc.sha256,
        actualHash,
        result,
        filePath: null,
      });
    }

    const matched = details.filter(d => d.result === 'match').length;
    const mismatched = details.filter(d => d.result === 'mismatch').length;
    const missing = details.filter(d => d.result === 'file_missing').length;

    const verification: WaveVerificationResult = {
      waveId: receipt.waveId,
      verifiedAt: new Date().toISOString(),
      totalDocuments: receipt.documents.length,
      matched,
      mismatched,
      missing,
      allVerified: matched === receipt.documents.length,
      details,
    };

    this.verifications.push(verification);
    this.emit('wave:verified', verification);

    return verification;
  }

  // ─── Data Room Manifest ─────────────────────────────────────────

  /**
   * Generate the canonical lender data room manifest.
   * This is the clean 6-folder structure funders actually review.
   */
  generateDataRoomManifest(): DataRoomManifest {
    const totalFiles = LENDER_DATA_ROOM_STRUCTURE.reduce(
      (sum, folder) => sum + folder.files.length, 0
    );

    return {
      version: this.config.version,
      generatedAt: new Date().toISOString(),
      waveId: this.waveId || 'not-generated',
      folders: LENDER_DATA_ROOM_STRUCTURE,
      totalFiles,
      accessPolicy: 'Read-only. No editing. No uploads.',
    };
  }

  // ─── Lender Email Generation ────────────────────────────────────

  /**
   * Generate the exact lender outreach email.
   * This is Channel 3 — the trigger for term sheets.
   */
  generateLenderEmail(recipientName?: string, senderName?: string): LenderEmail {
    const xrplAttestation = this.attestations.find(a => a.ledger === 'xrpl');
    const txHash = xrplAttestation?.txHash || '[TX_HASH]';
    const txTimestamp = xrplAttestation?.timestamp || '[DATE/TIME]';

    const subject = 'OPTKAS — Verified Funding Package (XRPL Attested)';

    const body = `Hello ${recipientName || '[Name]'},

On behalf of OPTKAS1-MAIN SPV, we are providing access to our verified funding package.

Delivery of the package has been cryptographically attested on the XRP Ledger to ensure
document integrity and version certainty.

XRPL Attestation Reference:
• Ledger: XRPL Mainnet
• Transaction Hash: ${txHash}
• Timestamp: ${txTimestamp}

The attestation anchors hashes of:
1. Institutional Data Room Index
2. Collateral Verification Memorandum
3. Borrowing Base Policy
4. Valuation Justification (Preset B)
5. Sponsor Consideration Note (template)
6. Sponsor Note Estoppel (template)

Read-only Data Room Access:
${this.config.dataRoomLink}

Next Steps:
• Review materials
• Submit diligence questions
• Issue a lender term sheet or LOI if aligned

We are available to walk through the structure as needed.

Regards,
${senderName || '[Name]'}
OPTKAS1-MAIN SPV`;

    const email: LenderEmail = {
      subject,
      body,
      recipientPlaceholder: recipientName || '[Name]',
      senderBlock: `${senderName || '[Name]'}\nOPTKAS1-MAIN SPV`,
      generatedAt: new Date().toISOString(),
      waveId: this.waveId || 'not-generated',
    };

    this.lastActivity = new Date().toISOString();
    this.emit('wave:email-generated', email);

    return email;
  }

  // ─── Accessors ──────────────────────────────────────────────────

  getDocuments(): WaveDocument[] {
    return [...this.documents];
  }

  getAttestations(): WaveAttestation[] {
    return [...this.attestations];
  }

  getReceipts(): FundingWaveReceipt[] {
    return [...this.receipts];
  }

  getLatestReceipt(): FundingWaveReceipt | null {
    return this.receipts.length > 0 ? this.receipts[this.receipts.length - 1] : null;
  }

  getVerifications(): WaveVerificationResult[] {
    return [...this.verifications];
  }

  getStatus(): WaveStatus {
    return this.status;
  }

  getWaveId(): string | null {
    return this.waveId;
  }

  getRootHash(): string | null {
    return this.rootHash;
  }

  getConfig(): FundingWaveConfig {
    return { ...this.config };
  }

  getSummary(): FundingWaveSummary {
    const xrplAttestation = this.attestations.find(a => a.ledger === 'xrpl');
    const stellarAttestation = this.attestations.find(a => a.ledger === 'stellar');
    const lastVerification = this.verifications.length > 0
      ? this.verifications[this.verifications.length - 1]
      : null;

    return {
      waveId: this.waveId,
      status: this.status,
      documentCount: this.documents.length,
      rootHash: this.rootHash,
      xrplAttested: !!xrplAttestation,
      stellarAttested: !!stellarAttestation,
      xrplTxHash: xrplAttestation?.txHash || null,
      stellarTxHash: stellarAttestation?.txHash || null,
      lastActivity: this.lastActivity,
      totalSize: this.documents.reduce((sum, d) => sum + d.size, 0),
      version: this.config.version,
      receiptsGenerated: this.receipts.length,
      verificationsRun: this.verifications.length,
      lastVerificationPassed: lastVerification?.allVerified ?? null,
    };
  }

  // ─── Persistence ────────────────────────────────────────────────

  persist(): void {
    const data = {
      config: this.config,
      waveId: this.waveId,
      rootHash: this.rootHash,
      status: this.status,
      documents: this.documents,
      attestations: this.attestations,
      receipts: this.receipts,
      verifications: this.verifications,
      lastActivity: this.lastActivity,
      persistedAt: new Date().toISOString(),
    };

    const dir = path.dirname(this.config.persistPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.config.persistPath, JSON.stringify(data, null, 2));
  }

  loadFromDisk(): boolean {
    if (!fs.existsSync(this.config.persistPath)) return false;

    try {
      const raw = fs.readFileSync(this.config.persistPath, 'utf-8');
      const data = JSON.parse(raw);
      this.waveId = data.waveId || null;
      this.rootHash = data.rootHash || null;
      this.status = data.status || 'draft';
      this.documents = data.documents || [];
      this.attestations = data.attestations || [];
      this.receipts = data.receipts || [];
      this.verifications = data.verifications || [];
      this.lastActivity = data.lastActivity || null;
      return true;
    } catch {
      return false;
    }
  }
}

export default FundingWaveAttestation;
