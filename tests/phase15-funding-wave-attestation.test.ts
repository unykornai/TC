/**
 * Phase 15 Tests — Funding Wave Attestation
 *
 * Tests the complete Channel 1 delivery infrastructure:
 *   - Document hashing and root hash computation
 *   - XRPL memo schema construction
 *   - XRPL transaction building
 *   - Attestation recording (XRPL + Stellar)
 *   - Wave receipt generation and integrity
 *   - Verification against local files (match / mismatch / missing)
 *   - Data room manifest (6-folder canonical structure)
 *   - Lender email generation
 *   - Persistence round-trip
 *   - Dashboard integration (card #17)
 *   - Index exports
 *   - Deployment readiness
 *   - Cross-file integration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ─── Source imports ───────────────────────────────────────────────

import {
  FundingWaveAttestation,
  FUNDING_WAVE_DOCUMENTS,
  LENDER_DATA_ROOM_STRUCTURE,
  MEMO_SCHEMA_ID,
  DATA_ROOM_STRUCTURE_VERSION,
} from '../packages/funding-ops/src/funding-wave-attestation';

import type {
  FundingWaveConfig,
  FundingWaveSummary,
  FundingWaveEvent,
  FundingWaveMemoSchema,
  FundingWaveReceipt,
  WaveDocument,
  WaveAttestation,
  WaveStatus,
  WaveVerificationResult,
  DocumentVerification,
  VerificationResult,
  DocumentCategory,
  DataRoomManifest,
  DataRoomFolder,
  DataRoomFile,
  LenderEmail,
} from '../packages/funding-ops/src/funding-wave-attestation';

// ─── Helpers ─────────────────────────────────────────────────────

function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ─── Test Suite ──────────────────────────────────────────────────

describe('Phase 15 — Funding Wave Attestation', () => {

  // ─── Source File Existence ──────────────────────────────────────

  describe('FundingWaveAttestation Source', () => {
    const srcPath = path.join(__dirname, '..', 'packages', 'funding-ops', 'src', 'funding-wave-attestation.ts');
    const content = fs.readFileSync(srcPath, 'utf-8');

    test('source file exists', () => {
      expect(fs.existsSync(srcPath)).toBe(true);
    });

    test('exports FundingWaveAttestation class', () => {
      expect(content).toContain('export class FundingWaveAttestation');
    });

    test('exports FUNDING_WAVE_DOCUMENTS constant', () => {
      expect(content).toContain('export const FUNDING_WAVE_DOCUMENTS');
    });

    test('exports LENDER_DATA_ROOM_STRUCTURE constant', () => {
      expect(content).toContain('export const LENDER_DATA_ROOM_STRUCTURE');
    });

    test('exports FundingWaveMemoSchema interface', () => {
      expect(content).toContain('export interface FundingWaveMemoSchema');
    });

    test('has document hashing methods', () => {
      expect(content).toContain('hashDocument(');
      expect(content).toContain('hashDocumentFromContent(');
      expect(content).toContain('hashCanonicalDocuments(');
      expect(content).toContain('computeRootHash(');
    });

    test('has XRPL memo construction', () => {
      expect(content).toContain('buildXrplMemo(');
      expect(content).toContain('buildXrplTransaction(');
    });

    test('has attestation recording', () => {
      expect(content).toContain('recordXrplAttestation(');
      expect(content).toContain('recordStellarAttestation(');
    });

    test('has receipt generation', () => {
      expect(content).toContain('generateReceipt(');
    });

    test('has verification methods', () => {
      expect(content).toContain('verifyWave(');
      expect(content).toContain('verifyWaveFromContent(');
    });

    test('has data room manifest generation', () => {
      expect(content).toContain('generateDataRoomManifest(');
    });

    test('has lender email generation', () => {
      expect(content).toContain('generateLenderEmail(');
    });

    test('has persistence methods', () => {
      expect(content).toContain('persist(');
      expect(content).toContain('loadFromDisk(');
    });

    test('has summary accessor', () => {
      expect(content).toContain('getSummary(');
    });

    test('extends EventEmitter', () => {
      expect(content).toContain('extends EventEmitter');
    });

    test('contains all DocumentCategory types', () => {
      expect(content).toContain('exec_summary');
      expect(content).toContain('collateral');
      expect(content).toContain('borrowing_base');
      expect(content).toContain('legal');
      expect(content).toContain('platform_audit');
      expect(content).toContain('sponsor_note');
      expect(content).toContain('reporting_controls');
    });

    test('contains all WaveStatus types', () => {
      expect(content).toContain('documents_hashed');
      expect(content).toContain('xrpl_attested');
      expect(content).toContain('stellar_attested');
      expect(content).toContain('dual_attested');
      expect(content).toContain('receipt_generated');
    });

    test('file is substantial (>500 lines)', () => {
      const lines = content.split('\n').length;
      expect(lines).toBeGreaterThan(500);
    });
  });

  // ─── Canonical Document List ────────────────────────────────────

  describe('Canonical Document List', () => {
    test('defines 7 funding wave documents', () => {
      expect(FUNDING_WAVE_DOCUMENTS).toHaveLength(7);
    });

    test('every document has name, fileName, category', () => {
      for (const doc of FUNDING_WAVE_DOCUMENTS) {
        expect(doc.name).toBeTruthy();
        expect(doc.fileName).toBeTruthy();
        expect(doc.category).toBeTruthy();
      }
    });

    test('all fileNames end in .pdf', () => {
      for (const doc of FUNDING_WAVE_DOCUMENTS) {
        expect(doc.fileName).toMatch(/\.pdf$/);
      }
    });

    test('includes DATA_ROOM_INDEX_v1', () => {
      expect(FUNDING_WAVE_DOCUMENTS.some(d => d.name === 'DATA_ROOM_INDEX_v1')).toBe(true);
    });

    test('includes COLLATERAL_VERIFICATION_MEMO', () => {
      expect(FUNDING_WAVE_DOCUMENTS.some(d => d.name === 'COLLATERAL_VERIFICATION_MEMO')).toBe(true);
    });

    test('includes BORROWING_BASE_POLICY', () => {
      expect(FUNDING_WAVE_DOCUMENTS.some(d => d.name === 'BORROWING_BASE_POLICY')).toBe(true);
    });

    test('includes VALUATION_JUSTIFICATION_PRESET_B', () => {
      expect(FUNDING_WAVE_DOCUMENTS.some(d => d.name === 'VALUATION_JUSTIFICATION_PRESET_B')).toBe(true);
    });

    test('includes CREDIT_COMMITTEE_POSITIONING', () => {
      expect(FUNDING_WAVE_DOCUMENTS.some(d => d.name === 'CREDIT_COMMITTEE_POSITIONING')).toBe(true);
    });

    test('includes SPONSOR_CONSIDERATION_NOTE_TEMPLATE', () => {
      expect(FUNDING_WAVE_DOCUMENTS.some(d => d.name === 'SPONSOR_CONSIDERATION_NOTE_TEMPLATE')).toBe(true);
    });

    test('includes SPONSOR_NOTE_ESTOPPEL_TEMPLATE', () => {
      expect(FUNDING_WAVE_DOCUMENTS.some(d => d.name === 'SPONSOR_NOTE_ESTOPPEL_TEMPLATE')).toBe(true);
    });

    test('covers required categories', () => {
      const categories = new Set(FUNDING_WAVE_DOCUMENTS.map(d => d.category));
      expect(categories.has('exec_summary')).toBe(true);
      expect(categories.has('collateral')).toBe(true);
      expect(categories.has('borrowing_base')).toBe(true);
      expect(categories.has('platform_audit')).toBe(true);
      expect(categories.has('sponsor_note')).toBe(true);
    });
  });

  // ─── Lender Data Room Structure ─────────────────────────────────

  describe('Lender Data Room Structure', () => {
    test('defines 7 folders', () => {
      expect(LENDER_DATA_ROOM_STRUCTURE).toHaveLength(7);
    });

    test('folder codes follow 0X_ prefix pattern', () => {
      for (const folder of LENDER_DATA_ROOM_STRUCTURE) {
        expect(folder.code).toMatch(/^\d{2}_/);
      }
    });

    test('00_EXEC_SUMMARY folder has 2 files', () => {
      const folder = LENDER_DATA_ROOM_STRUCTURE.find(f => f.code === '00_EXEC_SUMMARY');
      expect(folder).toBeDefined();
      expect(folder!.files).toHaveLength(2);
    });

    test('01_COLLATERAL folder has 3 files', () => {
      const folder = LENDER_DATA_ROOM_STRUCTURE.find(f => f.code === '01_COLLATERAL');
      expect(folder).toBeDefined();
      expect(folder!.files).toHaveLength(3);
    });

    test('02_BORROWING_BASE folder has 2 files', () => {
      const folder = LENDER_DATA_ROOM_STRUCTURE.find(f => f.code === '02_BORROWING_BASE');
      expect(folder).toBeDefined();
      expect(folder!.files).toHaveLength(2);
    });

    test('03_LEGAL folder has 3 files', () => {
      const folder = LENDER_DATA_ROOM_STRUCTURE.find(f => f.code === '03_LEGAL');
      expect(folder).toBeDefined();
      expect(folder!.files).toHaveLength(3);
    });

    test('04_PLATFORM_AND_AUDIT folder has 3 files', () => {
      const folder = LENDER_DATA_ROOM_STRUCTURE.find(f => f.code === '04_PLATFORM_AND_AUDIT');
      expect(folder).toBeDefined();
      expect(folder!.files).toHaveLength(3);
    });

    test('05_SPONSOR_NOTE folder has 2 files', () => {
      const folder = LENDER_DATA_ROOM_STRUCTURE.find(f => f.code === '05_SPONSOR_NOTE');
      expect(folder).toBeDefined();
      expect(folder!.files).toHaveLength(2);
    });

    test('06_REPORTING_AND_CONTROLS folder has 2 files', () => {
      const folder = LENDER_DATA_ROOM_STRUCTURE.find(f => f.code === '06_REPORTING_AND_CONTROLS');
      expect(folder).toBeDefined();
      expect(folder!.files).toHaveLength(2);
    });

    test('total files across all folders is 17', () => {
      const total = LENDER_DATA_ROOM_STRUCTURE.reduce((sum, f) => sum + f.files.length, 0);
      expect(total).toBe(17);
    });

    test('every file has name and description', () => {
      for (const folder of LENDER_DATA_ROOM_STRUCTURE) {
        for (const file of folder.files) {
          expect(file.name).toBeTruthy();
          expect(file.description).toBeTruthy();
        }
      }
    });
  });

  // ─── Document Hashing ──────────────────────────────────────────

  describe('Document Hashing', () => {
    let wave: FundingWaveAttestation;

    beforeEach(() => {
      wave = new FundingWaveAttestation();
    });

    test('hashDocumentFromContent produces valid SHA-256', () => {
      const doc = wave.hashDocumentFromContent('test content', 'TEST_DOC', 'test.pdf', 'exec_summary');
      expect(doc.sha256).toHaveLength(64);
      expect(doc.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(doc.sha256).toBe(sha256('test content'));
    });

    test('document gets sequential DOC-XXX ID', () => {
      wave.hashDocumentFromContent('doc1', 'DOC1', 'doc1.pdf', 'collateral');
      wave.hashDocumentFromContent('doc2', 'DOC2', 'doc2.pdf', 'legal');
      const docs = wave.getDocuments();
      expect(docs[0].id).toBe('DOC-001');
      expect(docs[1].id).toBe('DOC-002');
    });

    test('document captures size correctly', () => {
      const content = 'a'.repeat(1000);
      const doc = wave.hashDocumentFromContent(content, 'SIZE_TEST', 'size.pdf', 'exec_summary');
      expect(doc.size).toBe(1000);
    });

    test('document captures metadata', () => {
      const doc = wave.hashDocumentFromContent('test', 'META_TEST', 'meta.pdf', 'sponsor_note', 'v2');
      expect(doc.name).toBe('META_TEST');
      expect(doc.fileName).toBe('meta.pdf');
      expect(doc.category).toBe('sponsor_note');
      expect(doc.version).toBe('v2');
      expect(doc.hashTimestamp).toBeTruthy();
    });

    test('different content produces different hashes', () => {
      const doc1 = wave.hashDocumentFromContent('content A', 'DOC_A', 'a.pdf', 'exec_summary');
      const doc2 = wave.hashDocumentFromContent('content B', 'DOC_B', 'b.pdf', 'exec_summary');
      expect(doc1.sha256).not.toBe(doc2.sha256);
    });

    test('emits document:hashed event', () => {
      const events: WaveDocument[] = [];
      wave.on('document:hashed', (doc: WaveDocument) => events.push(doc));
      wave.hashDocumentFromContent('test', 'EVENT_TEST', 'event.pdf', 'collateral');
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('EVENT_TEST');
    });
  });

  // ─── Root Hash Computation ──────────────────────────────────────

  describe('Root Hash Computation', () => {
    let wave: FundingWaveAttestation;

    beforeEach(() => {
      wave = new FundingWaveAttestation();
    });

    test('computeRootHash throws if no documents', () => {
      expect(() => wave.computeRootHash()).toThrow('No documents registered');
    });

    test('root hash is valid SHA-256', () => {
      wave.hashDocumentFromContent('doc1', 'D1', 'd1.pdf', 'exec_summary');
      wave.hashDocumentFromContent('doc2', 'D2', 'd2.pdf', 'collateral');
      const rootHash = wave.computeRootHash();
      expect(rootHash).toHaveLength(64);
      expect(rootHash).toMatch(/^[0-9a-f]{64}$/);
    });

    test('root hash is deterministic (sorted hash concatenation)', () => {
      wave.hashDocumentFromContent('doc1', 'D1', 'd1.pdf', 'exec_summary');
      wave.hashDocumentFromContent('doc2', 'D2', 'd2.pdf', 'collateral');
      const rootHash = wave.computeRootHash();

      // Manually compute expected root hash
      const h1 = sha256('doc1');
      const h2 = sha256('doc2');
      const sorted = [h1, h2].sort().join('');
      const expected = sha256(sorted);
      expect(rootHash).toBe(expected);
    });

    test('generates wave ID with FW- prefix', () => {
      wave.hashDocumentFromContent('doc1', 'D1', 'd1.pdf', 'exec_summary');
      wave.computeRootHash();
      expect(wave.getWaveId()).toMatch(/^FW-\d{8}-\d{3}$/);
    });

    test('status transitions to documents_hashed', () => {
      wave.hashDocumentFromContent('doc1', 'D1', 'd1.pdf', 'exec_summary');
      wave.computeRootHash();
      expect(wave.getStatus()).toBe('documents_hashed');
    });

    test('emits wave:hashed event', () => {
      let emitted = false;
      wave.on('wave:hashed', () => { emitted = true; });
      wave.hashDocumentFromContent('doc1', 'D1', 'd1.pdf', 'exec_summary');
      wave.computeRootHash();
      expect(emitted).toBe(true);
    });
  });

  // ─── XRPL Memo Schema ──────────────────────────────────────────

  describe('XRPL Memo Schema', () => {
    let wave: FundingWaveAttestation;

    beforeEach(() => {
      wave = new FundingWaveAttestation({ spv: 'TEST SPV', attestedBy: 'TEST PLATFORM' });
      wave.hashDocumentFromContent('doc1', 'TEST_DOC_1', 'test1.pdf', 'exec_summary');
      wave.hashDocumentFromContent('doc2', 'TEST_DOC_2', 'test2.pdf', 'collateral');
      wave.computeRootHash();
    });

    test('buildXrplMemo throws if wave not hashed', () => {
      const fresh = new FundingWaveAttestation();
      expect(() => fresh.buildXrplMemo()).toThrow('Wave not hashed');
    });

    test('memo contains waveId', () => {
      const memo = wave.buildXrplMemo();
      expect(memo.waveId).toBe(wave.getWaveId());
    });

    test('memo contains spv', () => {
      const memo = wave.buildXrplMemo();
      expect(memo.spv).toBe('TEST SPV');
    });

    test('memo contains schema identifier', () => {
      const memo = wave.buildXrplMemo();
      expect(memo.schema).toBe(MEMO_SCHEMA_ID);
      expect(memo.schema).toBe('optkas.funding_wave.attestation.v1');
    });

    test('memo contains network', () => {
      const memo = wave.buildXrplMemo();
      expect(memo.network).toBe('xrpl-mainnet');
    });

    test('memo contains rootHash', () => {
      const memo = wave.buildXrplMemo();
      expect(memo.rootHash).toBe(wave.getRootHash());
    });

    test('memo documents array has name and sha256 per doc', () => {
      const memo = wave.buildXrplMemo();
      expect(memo.documents).toHaveLength(2);
      for (const doc of memo.documents) {
        expect(doc.name).toBeTruthy();
        expect(doc.sha256).toHaveLength(64);
      }
    });

    test('memo contains dataRoom structure metadata', () => {
      const memo = wave.buildXrplMemo();
      expect(memo.dataRoom).toBeDefined();
      expect(memo.dataRoom.structureVersion).toBe(DATA_ROOM_STRUCTURE_VERSION);
      expect(memo.dataRoom.structureVersion).toBe('optkas.lender.dataroom.v1');
      expect(memo.dataRoom.folders).toBe(7);
      expect(memo.dataRoom.files).toBe(17);
    });

    test('memo contains issuer', () => {
      const memo = wave.buildXrplMemo();
      expect(memo.issuer).toBeTruthy();
    });

    test('memo contains purpose statement', () => {
      const memo = wave.buildXrplMemo();
      expect(memo.purpose).toBe('Verified delivery of institutional funding package');
    });

    test('memo contains legalEffect statement', () => {
      const memo = wave.buildXrplMemo();
      expect(memo.legalEffect).toBe('Evidence of existence, integrity, and delivery timing');
    });

    test('memo has timestamp', () => {
      const memo = wave.buildXrplMemo();
      expect(memo.timestamp).toBeTruthy();
      expect(new Date(memo.timestamp).getTime()).not.toBeNaN();
    });
  });

  // ─── XRPL Transaction Building ─────────────────────────────────

  describe('XRPL Transaction Building', () => {
    let wave: FundingWaveAttestation;

    beforeEach(() => {
      wave = new FundingWaveAttestation({ xrplAttestationAccount: 'rXRPLTestAccount123' });
      wave.hashDocumentFromContent('doc1', 'D1', 'd1.pdf', 'exec_summary');
      wave.computeRootHash();
    });

    test('transaction type is Payment', () => {
      const tx = wave.buildXrplTransaction();
      expect(tx.TransactionType).toBe('Payment');
    });

    test('self-payment (Account === Destination)', () => {
      const tx = wave.buildXrplTransaction();
      expect(tx.Account).toBe(tx.Destination);
    });

    test('amount is 1 drop', () => {
      const tx = wave.buildXrplTransaction();
      expect(tx.Amount).toBe('1');
    });

    test('account is configured attestation address', () => {
      const tx = wave.buildXrplTransaction();
      expect(tx.Account).toBe('rXRPLTestAccount123');
    });

    test('memo type is hex-encoded attestation/funding-wave', () => {
      const tx = wave.buildXrplTransaction();
      const expectedHex = Buffer.from('attestation/funding-wave').toString('hex').toUpperCase();
      expect(tx.Memos[0].Memo.MemoType).toBe(expectedHex);
    });

    test('memo data is hex-encoded JSON', () => {
      const tx = wave.buildXrplTransaction();
      const decoded = Buffer.from(tx.Memos[0].Memo.MemoData, 'hex').toString('utf-8');
      const parsed = JSON.parse(decoded);
      expect(parsed.waveId).toBe(wave.getWaveId());
      expect(parsed.rootHash).toBe(wave.getRootHash());
    });
  });

  // ─── Attestation Recording ──────────────────────────────────────

  describe('Attestation Recording', () => {
    let wave: FundingWaveAttestation;

    beforeEach(() => {
      wave = new FundingWaveAttestation();
      wave.hashDocumentFromContent('doc1', 'D1', 'd1.pdf', 'exec_summary');
      wave.computeRootHash();
    });

    test('recordXrplAttestation stores attestation', () => {
      wave.recordXrplAttestation('TX_HASH_XRPL_123', 'mainnet');
      const attestations = wave.getAttestations();
      expect(attestations).toHaveLength(1);
      expect(attestations[0].ledger).toBe('xrpl');
      expect(attestations[0].txHash).toBe('TX_HASH_XRPL_123');
    });

    test('recordStellarAttestation stores attestation', () => {
      wave.recordStellarAttestation('TX_HASH_STELLAR_456');
      const attestations = wave.getAttestations();
      expect(attestations).toHaveLength(1);
      expect(attestations[0].ledger).toBe('stellar');
    });

    test('status becomes xrpl_attested after XRPL only', () => {
      wave.recordXrplAttestation('TX1');
      expect(wave.getStatus()).toBe('xrpl_attested');
    });

    test('status becomes stellar_attested after Stellar only', () => {
      wave.recordStellarAttestation('TX1');
      expect(wave.getStatus()).toBe('stellar_attested');
    });

    test('status becomes dual_attested after both', () => {
      wave.recordXrplAttestation('TX1');
      wave.recordStellarAttestation('TX2');
      expect(wave.getStatus()).toBe('dual_attested');
    });

    test('emits wave:xrpl-attested event', () => {
      let emitted = false;
      wave.on('wave:xrpl-attested', () => { emitted = true; });
      wave.recordXrplAttestation('TX1');
      expect(emitted).toBe(true);
    });

    test('emits wave:stellar-attested event', () => {
      let emitted = false;
      wave.on('wave:stellar-attested', () => { emitted = true; });
      wave.recordStellarAttestation('TX1');
      expect(emitted).toBe(true);
    });

    test('throws if wave not hashed', () => {
      const fresh = new FundingWaveAttestation();
      expect(() => fresh.recordXrplAttestation('TX')).toThrow('Wave not hashed');
      expect(() => fresh.recordStellarAttestation('TX')).toThrow('Wave not hashed');
    });
  });

  // ─── Receipt Generation ─────────────────────────────────────────

  describe('Receipt Generation', () => {
    let wave: FundingWaveAttestation;
    let receipt: FundingWaveReceipt;

    beforeEach(() => {
      wave = new FundingWaveAttestation({ spv: 'TEST SPV' });
      wave.hashDocumentFromContent('doc1', 'DOC_1', 'doc1.pdf', 'exec_summary');
      wave.hashDocumentFromContent('doc2', 'DOC_2', 'doc2.pdf', 'collateral');
      wave.computeRootHash();
      wave.recordXrplAttestation('TX_XRPL_001', 'mainnet');
      receipt = wave.generateReceipt();
    });

    test('receipt contains waveId', () => {
      expect(receipt.waveId).toBe(wave.getWaveId());
    });

    test('receipt contains spv', () => {
      expect(receipt.spv).toBe('TEST SPV');
    });

    test('receipt contains all documents', () => {
      expect(receipt.documents).toHaveLength(2);
      expect(receipt.documentCount).toBe(2);
    });

    test('receipt contains rootHash', () => {
      expect(receipt.rootHash).toBe(wave.getRootHash());
    });

    test('receipt contains attestations', () => {
      expect(receipt.attestations).toHaveLength(1);
      expect(receipt.attestations[0].txHash).toBe('TX_XRPL_001');
    });

    test('receipt has integrity hash', () => {
      expect(receipt.integrityHash).toHaveLength(64);
      expect(receipt.integrityHash).toMatch(/^[0-9a-f]{64}$/);
    });

    test('integrity hash is self-consistent', () => {
      // Recompute: hash the receipt without integrityHash field
      const receiptCopy = { ...receipt, integrityHash: undefined };
      const expected = sha256(JSON.stringify(receiptCopy));
      expect(receipt.integrityHash).toBe(expected);
    });

    test('receipt has totalSize', () => {
      expect(receipt.totalSize).toBeGreaterThan(0);
    });

    test('status transitions to receipt_generated', () => {
      expect(wave.getStatus()).toBe('receipt_generated');
    });

    test('receipt stored in receipts array', () => {
      expect(wave.getReceipts()).toHaveLength(1);
      expect(wave.getLatestReceipt()).toEqual(receipt);
    });
  });

  // ─── Verification ──────────────────────────────────────────────

  describe('Wave Verification', () => {
    let wave: FundingWaveAttestation;
    let receipt: FundingWaveReceipt;
    const doc1Content = 'Document 1 content for testing';
    const doc2Content = 'Document 2 content for testing';

    beforeEach(() => {
      wave = new FundingWaveAttestation();
      wave.hashDocumentFromContent(doc1Content, 'D1', 'doc1.pdf', 'exec_summary');
      wave.hashDocumentFromContent(doc2Content, 'D2', 'doc2.pdf', 'collateral');
      wave.computeRootHash();
      wave.recordXrplAttestation('TX1');
      receipt = wave.generateReceipt();
    });

    test('all documents match when content unchanged', () => {
      const contentMap = new Map<string, string>();
      contentMap.set('doc1.pdf', doc1Content);
      contentMap.set('doc2.pdf', doc2Content);

      const result = wave.verifyWaveFromContent(receipt, contentMap);
      expect(result.allVerified).toBe(true);
      expect(result.matched).toBe(2);
      expect(result.mismatched).toBe(0);
      expect(result.missing).toBe(0);
    });

    test('detects mismatched content', () => {
      const contentMap = new Map<string, string>();
      contentMap.set('doc1.pdf', 'ALTERED CONTENT');
      contentMap.set('doc2.pdf', doc2Content);

      const result = wave.verifyWaveFromContent(receipt, contentMap);
      expect(result.allVerified).toBe(false);
      expect(result.matched).toBe(1);
      expect(result.mismatched).toBe(1);
    });

    test('detects missing files', () => {
      const contentMap = new Map<string, string>();
      contentMap.set('doc1.pdf', doc1Content);
      // doc2.pdf missing

      const result = wave.verifyWaveFromContent(receipt, contentMap);
      expect(result.allVerified).toBe(false);
      expect(result.matched).toBe(1);
      expect(result.missing).toBe(1);
    });

    test('details array has per-document results', () => {
      const contentMap = new Map<string, string>();
      contentMap.set('doc1.pdf', doc1Content);
      contentMap.set('doc2.pdf', doc2Content);

      const result = wave.verifyWaveFromContent(receipt, contentMap);
      expect(result.details).toHaveLength(2);
      expect(result.details[0].result).toBe('match');
      expect(result.details[1].result).toBe('match');
    });

    test('stores verification in history', () => {
      const contentMap = new Map<string, string>();
      contentMap.set('doc1.pdf', doc1Content);
      contentMap.set('doc2.pdf', doc2Content);

      wave.verifyWaveFromContent(receipt, contentMap);
      expect(wave.getVerifications()).toHaveLength(1);
    });
  });

  // ─── Data Room Manifest ─────────────────────────────────────────

  describe('Data Room Manifest', () => {
    let wave: FundingWaveAttestation;

    beforeEach(() => {
      wave = new FundingWaveAttestation();
    });

    test('manifest has 7 folders', () => {
      const manifest = wave.generateDataRoomManifest();
      expect(manifest.folders).toHaveLength(7);
    });

    test('manifest total files is 17', () => {
      const manifest = wave.generateDataRoomManifest();
      expect(manifest.totalFiles).toBe(17);
    });

    test('manifest has read-only access policy', () => {
      const manifest = wave.generateDataRoomManifest();
      expect(manifest.accessPolicy).toContain('Read-only');
    });

    test('manifest folders match canonical structure', () => {
      const manifest = wave.generateDataRoomManifest();
      const codes = manifest.folders.map(f => f.code);
      expect(codes).toContain('00_EXEC_SUMMARY');
      expect(codes).toContain('01_COLLATERAL');
      expect(codes).toContain('02_BORROWING_BASE');
      expect(codes).toContain('03_LEGAL');
      expect(codes).toContain('04_PLATFORM_AND_AUDIT');
      expect(codes).toContain('05_SPONSOR_NOTE');
      expect(codes).toContain('06_REPORTING_AND_CONTROLS');
    });

    test('manifest has version and timestamp', () => {
      const manifest = wave.generateDataRoomManifest();
      expect(manifest.version).toBeTruthy();
      expect(manifest.generatedAt).toBeTruthy();
    });
  });

  // ─── Lender Email Generation ────────────────────────────────────

  describe('Lender Email', () => {
    let wave: FundingWaveAttestation;

    beforeEach(() => {
      wave = new FundingWaveAttestation({ dataRoomLink: 'https://dataroom.optkas.com/wave1' });
      wave.hashDocumentFromContent('doc1', 'D1', 'd1.pdf', 'exec_summary');
      wave.computeRootHash();
      wave.recordXrplAttestation('TX_HASH_ABC123');
    });

    test('email subject contains OPTKAS', () => {
      const email = wave.generateLenderEmail();
      expect(email.subject).toContain('OPTKAS');
    });

    test('email subject contains XRPL Attested', () => {
      const email = wave.generateLenderEmail();
      expect(email.subject).toContain('XRPL Attested');
    });

    test('email body contains TX hash', () => {
      const email = wave.generateLenderEmail();
      expect(email.body).toContain('TX_HASH_ABC123');
    });

    test('email body contains data room link', () => {
      const email = wave.generateLenderEmail();
      expect(email.body).toContain('https://dataroom.optkas.com/wave1');
    });

    test('email body contains OPTKAS1-MAIN SPV', () => {
      const email = wave.generateLenderEmail();
      expect(email.body).toContain('OPTKAS1-MAIN SPV');
    });

    test('email body contains all 6 document references', () => {
      const email = wave.generateLenderEmail();
      expect(email.body).toContain('Institutional Data Room Index');
      expect(email.body).toContain('Collateral Verification Memorandum');
      expect(email.body).toContain('Borrowing Base Policy');
      expect(email.body).toContain('Valuation Justification');
      expect(email.body).toContain('Sponsor Consideration Note');
      expect(email.body).toContain('Sponsor Note Estoppel');
    });

    test('email body contains term sheet prompt', () => {
      const email = wave.generateLenderEmail();
      expect(email.body).toContain('term sheet');
    });

    test('email uses recipient name when provided', () => {
      const email = wave.generateLenderEmail('John Smith');
      expect(email.body).toContain('Hello John Smith');
    });

    test('email uses sender name when provided', () => {
      const email = wave.generateLenderEmail('Jane', 'Jimmy');
      expect(email.body).toContain('Jimmy');
    });

    test('email does NOT contain attachment language', () => {
      const email = wave.generateLenderEmail();
      expect(email.body.toLowerCase()).not.toContain('attached');
      expect(email.body.toLowerCase()).not.toContain('please sign');
    });
  });

  // ─── Summary ────────────────────────────────────────────────────

  describe('Summary', () => {
    test('initial summary shows draft status', () => {
      const wave = new FundingWaveAttestation();
      const summary = wave.getSummary();
      expect(summary.status).toBe('draft');
      expect(summary.documentCount).toBe(0);
      expect(summary.waveId).toBeNull();
      expect(summary.rootHash).toBeNull();
      expect(summary.xrplAttested).toBe(false);
      expect(summary.stellarAttested).toBe(false);
    });

    test('summary reflects full lifecycle', () => {
      const wave = new FundingWaveAttestation();
      wave.hashDocumentFromContent('doc', 'D1', 'd.pdf', 'exec_summary');
      wave.computeRootHash();
      wave.recordXrplAttestation('TX1');
      wave.recordStellarAttestation('TX2');
      wave.generateReceipt();

      const summary = wave.getSummary();
      expect(summary.documentCount).toBe(1);
      expect(summary.xrplAttested).toBe(true);
      expect(summary.stellarAttested).toBe(true);
      expect(summary.xrplTxHash).toBe('TX1');
      expect(summary.stellarTxHash).toBe('TX2');
      expect(summary.receiptsGenerated).toBe(1);
    });
  });

  // ─── Persistence ────────────────────────────────────────────────

  describe('Persistence', () => {
    const tmpPath = path.join(__dirname, '..', 'logs', '__test-funding-wave.json');

    afterEach(() => {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    });

    test('persist writes JSON file', () => {
      const wave = new FundingWaveAttestation({ persistPath: tmpPath });
      wave.hashDocumentFromContent('doc', 'D1', 'd.pdf', 'exec_summary');
      wave.computeRootHash();
      wave.persist();
      expect(fs.existsSync(tmpPath)).toBe(true);
    });

    test('loadFromDisk restores state', () => {
      const wave1 = new FundingWaveAttestation({ persistPath: tmpPath });
      wave1.hashDocumentFromContent('doc', 'D1', 'd.pdf', 'exec_summary');
      wave1.computeRootHash();
      wave1.recordXrplAttestation('TX_PERSIST');
      wave1.persist();

      const wave2 = new FundingWaveAttestation({ persistPath: tmpPath });
      const loaded = wave2.loadFromDisk();
      expect(loaded).toBe(true);
      expect(wave2.getWaveId()).toBe(wave1.getWaveId());
      expect(wave2.getRootHash()).toBe(wave1.getRootHash());
      expect(wave2.getStatus()).toBe('xrpl_attested');
    });

    test('loadFromDisk returns false for missing file', () => {
      const wave = new FundingWaveAttestation({ persistPath: './nonexistent.json' });
      expect(wave.loadFromDisk()).toBe(false);
    });
  });

  // ─── CLI Script Existence ───────────────────────────────────────

  describe('CLI Attestation Script', () => {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'attest-funding-wave.ts');
    const content = fs.readFileSync(scriptPath, 'utf-8');

    test('script file exists', () => {
      expect(fs.existsSync(scriptPath)).toBe(true);
    });

    test('imports FundingWaveAttestation', () => {
      expect(content).toContain('FundingWaveAttestation');
    });

    test('has --documents option', () => {
      expect(content).toContain('--documents');
    });

    test('has --verify option', () => {
      expect(content).toContain('--verify');
    });

    test('has --generate-email option', () => {
      expect(content).toContain('--generate-email');
    });

    test('has --data-room-manifest option', () => {
      expect(content).toContain('--data-room-manifest');
    });

    test('has --stellar-mirror option', () => {
      expect(content).toContain('--stellar-mirror');
    });

    test('supports dry-run mode', () => {
      expect(content).toContain('dryRun');
      expect(content).toContain('DRY RUN');
    });

    test('writes receipt to output directory', () => {
      expect(content).toContain('funding-wave-receipt');
    });

    test('writes email to output directory', () => {
      expect(content).toContain('lender-email.txt');
    });
  });

  // ─── Dashboard Integration ──────────────────────────────────────

  describe('Dashboard Integration', () => {
    const dashboardPath = path.join(__dirname, '..', 'apps', 'dashboard', 'src', 'server.ts');
    const content = fs.readFileSync(dashboardPath, 'utf-8');

    test('imports FundingWaveAttestation', () => {
      expect(content).toContain('FundingWaveAttestation');
    });

    test('imports FundingWaveSummary type', () => {
      expect(content).toContain('FundingWaveSummary');
    });

    test('creates fundingWave singleton', () => {
      expect(content).toContain('new FundingWaveAttestation(');
    });

    test('DashboardState includes fundingWave', () => {
      expect(content).toContain('fundingWave: FundingWaveSummary');
    });

    test('buildState populates fundingWave', () => {
      expect(content).toContain('fundingWave: fundingWave.getSummary()');
    });

    test('renders Funding Wave Attestation card', () => {
      expect(content).toContain('Funding Wave Attestation');
    });

    test('card shows Wave ID', () => {
      expect(content).toContain('Wave ID');
    });

    test('card shows Root Hash', () => {
      expect(content).toContain('Root Hash');
    });

    test('card shows XRPL Attested status', () => {
      expect(content).toContain('XRPL Attested');
    });

    test('card shows Stellar Attested status', () => {
      expect(content).toContain('Stellar Attested');
    });

    test('card shows XRPL TX Hash', () => {
      expect(content).toContain('XRPL TX Hash');
    });

    test('card shows Stellar TX Hash', () => {
      expect(content).toContain('Stellar TX Hash');
    });

    test('card shows Last Verification', () => {
      expect(content).toContain('Last Verification');
    });

    test('dashboard has at least 17 cards', () => {
      const cardCount = (content.match(/class="card"/g) || []).length;
      expect(cardCount).toBeGreaterThanOrEqual(17);
    });
  });

  // ─── Index Exports ──────────────────────────────────────────────

  describe('Index Exports', () => {
    const indexPath = path.join(__dirname, '..', 'packages', 'funding-ops', 'src', 'index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');

    test('exports FundingWaveAttestation', () => {
      expect(content).toContain('FundingWaveAttestation');
    });

    test('exports FUNDING_WAVE_DOCUMENTS', () => {
      expect(content).toContain('FUNDING_WAVE_DOCUMENTS');
    });

    test('exports LENDER_DATA_ROOM_STRUCTURE', () => {
      expect(content).toContain('LENDER_DATA_ROOM_STRUCTURE');
    });

    test('exports FundingWaveConfig type', () => {
      expect(content).toContain('FundingWaveConfig');
    });

    test('exports FundingWaveSummary type', () => {
      expect(content).toContain('FundingWaveSummary');
    });

    test('exports FundingWaveMemoSchema type', () => {
      expect(content).toContain('FundingWaveMemoSchema');
    });

    test('exports FundingWaveReceipt type', () => {
      expect(content).toContain('FundingWaveReceipt');
    });

    test('exports WaveDocument type', () => {
      expect(content).toContain('WaveDocument');
    });

    test('exports WaveVerificationResult type', () => {
      expect(content).toContain('WaveVerificationResult');
    });

    test('exports DataRoomManifest type', () => {
      expect(content).toContain('DataRoomManifest');
    });

    test('exports LenderEmail type', () => {
      expect(content).toContain('LenderEmail');
    });

    test('exports MEMO_SCHEMA_ID constant', () => {
      expect(content).toContain('MEMO_SCHEMA_ID');
    });

    test('exports DATA_ROOM_STRUCTURE_VERSION constant', () => {
      expect(content).toContain('DATA_ROOM_STRUCTURE_VERSION');
    });

    test('from funding-wave-attestation module', () => {
      expect(content).toContain("from './funding-wave-attestation'");
    });
  });

  // ─── Data Room INDEX ────────────────────────────────────────────

  describe('Data Room Index', () => {
    const indexPath = path.join(__dirname, '..', 'DATA_ROOM_v1', 'INDEX.md');
    const content = fs.readFileSync(indexPath, 'utf-8');

    test('total documents is 36', () => {
      expect(content).toContain('**Total Documents:** 36');
    });

    test('has version 1.1 changelog entry', () => {
      expect(content).toContain('1.1');
      expect(content).toContain('funding wave attestation');
    });
  });

  // ─── Deployment Readiness ───────────────────────────────────────

  describe('Deployment Readiness', () => {
    const readinessPath = path.join(__dirname, '..', 'scripts', 'verify-deployment-readiness.ts');
    const content = fs.readFileSync(readinessPath, 'utf-8');

    test('includes funding-wave-attestation.ts in required sources', () => {
      expect(content).toContain('funding-wave-attestation.ts');
    });

    test('now has 11 required source files', () => {
      const match = content.match(/requiredSources\s*=\s*\[([\s\S]*?)\]/);
      expect(match).toBeTruthy();
      const files = match![1].match(/'/g) || [];
      // Each file has 2 quotes, so divide by 2
      expect(files.length / 2).toBe(11);
    });
  });

  // ─── Cross-File Integration ─────────────────────────────────────

  describe('Cross-File Integration', () => {
    test('FundingWaveAttestation is instantiable with defaults', () => {
      const wave = new FundingWaveAttestation();
      expect(wave.getStatus()).toBe('draft');
      expect(wave.getSummary().documentCount).toBe(0);
    });

    test('full lifecycle: hash → attest → receipt → verify → email', () => {
      const wave = new FundingWaveAttestation({
        spv: 'INTEGRATION TEST SPV',
        dataRoomLink: 'https://test.example.com',
      });

      // Hash
      wave.hashDocumentFromContent('alpha', 'ALPHA', 'alpha.pdf', 'exec_summary');
      wave.hashDocumentFromContent('beta', 'BETA', 'beta.pdf', 'collateral');
      wave.hashDocumentFromContent('gamma', 'GAMMA', 'gamma.pdf', 'legal');
      const rootHash = wave.computeRootHash();
      expect(rootHash).toHaveLength(64);

      // Attest
      wave.recordXrplAttestation('TX_INTEGRATION_XRPL');
      wave.recordStellarAttestation('TX_INTEGRATION_STELLAR');
      expect(wave.getStatus()).toBe('dual_attested');

      // Receipt
      const receipt = wave.generateReceipt();
      expect(receipt.documentCount).toBe(3);
      expect(receipt.attestations).toHaveLength(2);
      expect(receipt.integrityHash).toHaveLength(64);

      // Verify
      const contentMap = new Map<string, string>();
      contentMap.set('alpha.pdf', 'alpha');
      contentMap.set('beta.pdf', 'beta');
      contentMap.set('gamma.pdf', 'gamma');
      const verification = wave.verifyWaveFromContent(receipt, contentMap);
      expect(verification.allVerified).toBe(true);

      // Email
      const email = wave.generateLenderEmail('Test Lender', 'Jimmy');
      expect(email.body).toContain('TX_INTEGRATION_XRPL');
      expect(email.body).toContain('https://test.example.com');
      expect(email.body).toContain('Hello Test Lender');
    });

    test('data room manifest is consistent with LENDER_DATA_ROOM_STRUCTURE', () => {
      const wave = new FundingWaveAttestation();
      const manifest = wave.generateDataRoomManifest();
      expect(manifest.folders).toEqual(LENDER_DATA_ROOM_STRUCTURE);
    });

    test('memo schema root hash matches wave root hash', () => {
      const wave = new FundingWaveAttestation();
      wave.hashDocumentFromContent('x', 'X', 'x.pdf', 'exec_summary');
      wave.computeRootHash();
      const memo = wave.buildXrplMemo();
      expect(memo.rootHash).toBe(wave.getRootHash());
    });

    test('XRPL transaction memo decodes back to valid canonical schema', () => {
      const wave = new FundingWaveAttestation({ spv: 'DECODE TEST' });
      wave.hashDocumentFromContent('test', 'T', 't.pdf', 'exec_summary');
      wave.computeRootHash();
      const tx = wave.buildXrplTransaction();

      // Decode
      const memoData = Buffer.from(tx.Memos[0].Memo.MemoData, 'hex').toString('utf-8');
      const schema: FundingWaveMemoSchema = JSON.parse(memoData);
      expect(schema.schema).toBe(MEMO_SCHEMA_ID);
      expect(schema.spv).toBe('DECODE TEST');
      expect(schema.network).toBe('xrpl-mainnet');
      expect(schema.documents).toHaveLength(1);
      expect(schema.rootHash).toBe(wave.getRootHash());
      expect(schema.dataRoom.structureVersion).toBe(DATA_ROOM_STRUCTURE_VERSION);
      expect(schema.dataRoom.folders).toBe(7);
      expect(schema.dataRoom.files).toBe(17);
      expect(schema.issuer).toBeTruthy();
      expect(schema.purpose).toBe('Verified delivery of institutional funding package');
      expect(schema.legalEffect).toBe('Evidence of existence, integrity, and delivery timing');
    });

    test('MEMO_SCHEMA_ID constant has correct value', () => {
      expect(MEMO_SCHEMA_ID).toBe('optkas.funding_wave.attestation.v1');
    });

    test('DATA_ROOM_STRUCTURE_VERSION constant has correct value', () => {
      expect(DATA_ROOM_STRUCTURE_VERSION).toBe('optkas.lender.dataroom.v1');
    });
  });
});
