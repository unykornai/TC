/**
 * Phase 14: Valuation & Lending Infrastructure Tests
 *
 * Validates:
 *   - Borrowing base certificate generator
 *   - Collateral position management
 *   - Covenant checking and exception reporting
 *   - Valuation justification document
 *   - Credit committee positioning brief
 *   - Sponsor note estoppel template
 *   - Dashboard integration (16 cards)
 *   - Index exports
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

// ── Borrowing Base Module ────────────────────────────────────────

describe('BorrowingBase Source Module', () => {
  const srcPath = path.join(ROOT, 'packages', 'funding-ops', 'src', 'borrowing-base.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('source file exists', () => {
    expect(fs.existsSync(srcPath)).toBe(true);
  });

  test('exports BorrowingBase class', () => {
    expect(src).toContain('export class BorrowingBase extends EventEmitter');
  });

  test('exports CollateralPosition interface', () => {
    expect(src).toContain('export interface CollateralPosition');
  });

  test('exports BorrowingBaseCertificate interface', () => {
    expect(src).toContain('export interface BorrowingBaseCertificate');
  });

  test('exports BorrowingBaseSummary interface', () => {
    expect(src).toContain('export interface BorrowingBaseSummary');
  });

  test('exports CovenantCheck interface', () => {
    expect(src).toContain('export interface CovenantCheck');
  });

  test('exports BorrowingBaseException interface', () => {
    expect(src).toContain('export interface BorrowingBaseException');
  });

  test('has collateral type definitions', () => {
    expect(src).toContain("'mtn'");
    expect(src).toContain("'bond'");
    expect(src).toContain("'note'");
  });

  test('has covenant status definitions', () => {
    expect(src).toContain("'compliant'");
    expect(src).toContain("'warning'");
    expect(src).toContain("'breached'");
  });

  test('has certificate status definitions', () => {
    expect(src).toContain("'draft'");
    expect(src).toContain("'generated'");
    expect(src).toContain("'certified'");
  });

  test('implements addPosition method', () => {
    expect(src).toContain('addPosition(');
  });

  test('implements generateCertificate method', () => {
    expect(src).toContain('generateCertificate(');
  });

  test('implements certifyCertificate method', () => {
    expect(src).toContain('certifyCertificate(');
  });

  test('implements raiseException method', () => {
    expect(src).toContain('raiseException(');
  });

  test('implements resolveException method', () => {
    expect(src).toContain('resolveException(');
  });

  test('implements getSummary method', () => {
    expect(src).toContain('getSummary(): BorrowingBaseSummary');
  });

  test('implements persist/loadFromDisk methods', () => {
    expect(src).toContain('persist():');
    expect(src).toContain('loadFromDisk():');
  });

  test('computes SHA-256 certificate hash', () => {
    expect(src).toContain("createHash('sha256')");
  });

  test('has COL- prefixed position IDs', () => {
    expect(src).toContain('COL-');
  });

  test('has BBC- prefixed certificate IDs', () => {
    expect(src).toContain('BBC-');
  });

  test('has EXC- prefixed exception IDs', () => {
    expect(src).toContain('EXC-');
  });

  test('has COV- prefixed covenant IDs', () => {
    expect(src).toContain('COV-CC');
    expect(src).toContain('COV-IC');
    expect(src).toContain('COV-UT');
    expect(src).toContain('COV-VR');
  });

  test('defaults facilityLimit to 4M', () => {
    expect(src).toContain('4_000_000');
  });

  test('defaults minimumCoverageRatio to 2.0', () => {
    expect(src).toContain('minimumCoverageRatio');
    expect(src).toContain('2.0');
  });
});

// ── Position Management ──────────────────────────────────────────

describe('BorrowingBase Position Management', () => {
  let BorrowingBase: any;

  beforeAll(() => {
    ({ BorrowingBase } = require('../packages/funding-ops/src/borrowing-base'));
  });

  test('creates instance with default config', () => {
    const bb = new BorrowingBase();
    expect(bb).toBeDefined();
    const summary = bb.getSummary();
    expect(summary.facilityLimit).toBe(4_000_000);
  });

  test('creates instance with custom config', () => {
    const bb = new BorrowingBase({ facilityLimit: 2_400_000, minimumCoverageRatio: 2.5 });
    const summary = bb.getSummary();
    expect(summary.facilityLimit).toBe(2_400_000);
  });

  test('adds collateral position with defaults', () => {
    const bb = new BorrowingBase();
    const pos = bb.addPosition({
      description: 'TC Advantage 5% MTN',
      type: 'mtn',
      faceValue: 10_000_000,
    });
    expect(pos.id).toMatch(/^COL-/);
    expect(pos.faceValue).toBe(10_000_000);
    expect(pos.haircut).toBe(40);
    expect(pos.advanceRate).toBe(60);
    expect(pos.eligibleValue).toBe(6_000_000);
  });

  test('adds position with custom haircut', () => {
    const bb = new BorrowingBase();
    const pos = bb.addPosition({
      description: 'Test Bond',
      type: 'bond',
      faceValue: 5_000_000,
      haircut: 50,
    });
    expect(pos.advanceRate).toBe(50);
    expect(pos.eligibleValue).toBe(2_500_000);
  });

  test('adds position with CUSIP and verification', () => {
    const bb = new BorrowingBase();
    const pos = bb.addPosition({
      description: 'TC Advantage 5% MTN',
      type: 'mtn',
      faceValue: 10_000_000,
      cusip: '87225HAB4',
      isin: 'US87225HAB42',
      couponRate: 5.0,
      maturityDate: '2030-05-31',
      transferAgent: 'Securities Transfer Corporation',
      insuranceCoverage: 25_750_000,
      verificationSource: 'STC Position Statement',
    });
    expect(pos.cusip).toBe('87225HAB4');
    expect(pos.verified).toBe(true);
    expect(pos.verificationSource).toBe('STC Position Statement');
  });

  test('tracks multiple positions', () => {
    const bb = new BorrowingBase();
    bb.addPosition({ description: 'Position 1', type: 'mtn', faceValue: 5_000_000 });
    bb.addPosition({ description: 'Position 2', type: 'bond', faceValue: 3_000_000 });
    const positions = bb.getPositions();
    expect(positions).toHaveLength(2);
  });

  test('emits position_added event', () => {
    const bb = new BorrowingBase();
    const events: any[] = [];
    bb.on('position_added', (e: any) => events.push(e));
    bb.addPosition({ description: 'Test', type: 'mtn', faceValue: 1_000_000 });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('position_added');
  });
});

// ── Certificate Generation ───────────────────────────────────────

describe('BorrowingBase Certificate Generation', () => {
  let BorrowingBase: any;

  beforeAll(() => {
    ({ BorrowingBase } = require('../packages/funding-ops/src/borrowing-base'));
  });

  test('generates certificate with positions', () => {
    const bb = new BorrowingBase({ facilityLimit: 4_000_000 });
    bb.addPosition({
      description: 'TC Advantage 5% MTN',
      type: 'mtn',
      faceValue: 10_000_000,
      couponRate: 5.0,
      verificationSource: 'STC',
    });
    const cert = bb.generateCertificate('2026-02');
    expect(cert.id).toMatch(/^BBC-/);
    expect(cert.reportingPeriod).toBe('2026-02');
    expect(cert.totalFaceValue).toBe(10_000_000);
    expect(cert.totalEligibleValue).toBe(6_000_000);
    expect(cert.facilityLimit).toBe(4_000_000);
    expect(cert.status).toBe('generated');
    expect(cert.hash).toHaveLength(64);
  });

  test('calculates coverage ratios with no outstanding', () => {
    const bb = new BorrowingBase({ facilityLimit: 4_000_000, currentOutstanding: 0 });
    bb.addPosition({ description: 'MTN', type: 'mtn', faceValue: 10_000_000, couponRate: 5.0 });
    const cert = bb.generateCertificate();
    expect(cert.collateralCoverageRatio).toBe(999);
    expect(cert.availableCapacity).toBe(4_000_000);
    expect(cert.utilizationRate).toBe(0);
  });

  test('calculates coverage ratios with outstanding', () => {
    const bb = new BorrowingBase({ facilityLimit: 4_000_000, interestRate: 0.10 });
    bb.addPosition({
      description: 'MTN',
      type: 'mtn',
      faceValue: 10_000_000,
      couponRate: 5.0,
      verificationSource: 'STC',
    });
    bb.updateOutstanding(2_000_000);
    const cert = bb.generateCertificate();
    expect(cert.collateralCoverageRatio).toBe(5.0);
    expect(cert.currentOutstanding).toBe(2_000_000);
    expect(cert.availableCapacity).toBe(2_000_000);
    expect(cert.utilizationRate).toBe(50);
    // Interest coverage: $500K coupon / $200K expense = 2.5
    expect(cert.interestCoverageRatio).toBe(2.5);
  });

  test('runs covenant checks', () => {
    const bb = new BorrowingBase({ facilityLimit: 4_000_000 });
    bb.addPosition({ description: 'MTN', type: 'mtn', faceValue: 10_000_000, couponRate: 5.0, verificationSource: 'STC' });
    bb.updateOutstanding(2_000_000);
    const cert = bb.generateCertificate();
    expect(cert.covenants).toHaveLength(4);
    expect(cert.covenantCompliance).toBe(true);
    const ccCheck = cert.covenants.find((c: any) => c.id === 'COV-CC');
    expect(ccCheck.status).toBe('compliant');
  });

  test('detects covenant breach when undercollateralized', () => {
    const bb = new BorrowingBase({ facilityLimit: 10_000_000, minimumCoverageRatio: 2.0 });
    bb.addPosition({ description: 'Small', type: 'note', faceValue: 1_000_000 });
    bb.updateOutstanding(800_000);
    const cert = bb.generateCertificate();
    // 1M / 800K = 1.25x < 2.0x minimum
    expect(cert.covenantCompliance).toBe(false);
    const breached = cert.covenants.filter((c: any) => c.status === 'breached');
    expect(breached.length).toBeGreaterThan(0);
  });

  test('certifies certificate', () => {
    const bb = new BorrowingBase();
    bb.addPosition({ description: 'MTN', type: 'mtn', faceValue: 10_000_000 });
    const cert = bb.generateCertificate();
    const result = bb.certifyCertificate(cert.id, 'Jimmy Manager');
    expect(result).toBe(true);
    const latest = bb.getLatestCertificate();
    expect(latest.status).toBe('certified');
    expect(latest.certifiedBy).toBe('Jimmy Manager');
  });

  test('emits certificate_generated event', () => {
    const bb = new BorrowingBase();
    const events: any[] = [];
    bb.on('certificate_generated', (e: any) => events.push(e));
    bb.addPosition({ description: 'MTN', type: 'mtn', faceValue: 10_000_000 });
    bb.generateCertificate();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('certificate_generated');
  });

  test('tracks multiple certificates', () => {
    const bb = new BorrowingBase();
    bb.addPosition({ description: 'MTN', type: 'mtn', faceValue: 10_000_000 });
    bb.generateCertificate('2026-01');
    bb.generateCertificate('2026-02');
    const certs = bb.getCertificates();
    expect(certs).toHaveLength(2);
    expect(certs[0].reportingPeriod).toBe('2026-01');
    expect(certs[1].reportingPeriod).toBe('2026-02');
  });
});

// ── Exception Management ─────────────────────────────────────────

describe('BorrowingBase Exception Management', () => {
  let BorrowingBase: any;

  beforeAll(() => {
    ({ BorrowingBase } = require('../packages/funding-ops/src/borrowing-base'));
  });

  test('raises exception', () => {
    const bb = new BorrowingBase();
    const exc = bb.raiseException({
      severity: 'critical',
      category: 'collateral_verification',
      description: 'STC statement expired',
    });
    expect(exc.id).toMatch(/^EXC-/);
    expect(exc.severity).toBe('critical');
    expect(exc.resolved).toBe(false);
  });

  test('resolves exception', () => {
    const bb = new BorrowingBase();
    const exc = bb.raiseException({
      severity: 'warning',
      category: 'reporting',
      description: 'Monthly report overdue',
    });
    const result = bb.resolveException(exc.id);
    expect(result).toBe(true);
    const open = bb.getOpenExceptions();
    expect(open).toHaveLength(0);
  });

  test('cannot resolve already-resolved exception', () => {
    const bb = new BorrowingBase();
    const exc = bb.raiseException({ severity: 'info', category: 'test', description: 'test' });
    bb.resolveException(exc.id);
    const result = bb.resolveException(exc.id);
    expect(result).toBe(false);
  });

  test('tracks open vs resolved exceptions', () => {
    const bb = new BorrowingBase();
    bb.raiseException({ severity: 'critical', category: 'a', description: 'one' });
    const exc2 = bb.raiseException({ severity: 'warning', category: 'b', description: 'two' });
    bb.raiseException({ severity: 'info', category: 'c', description: 'three' });
    bb.resolveException(exc2.id);
    expect(bb.getOpenExceptions()).toHaveLength(2);
    expect(bb.getExceptions()).toHaveLength(3);
  });

  test('emits exception_raised event', () => {
    const bb = new BorrowingBase();
    const events: any[] = [];
    bb.on('exception_raised', (e: any) => events.push(e));
    bb.raiseException({ severity: 'critical', category: 'test', description: 'test' });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('exception_raised');
  });
});

// ── Summary ──────────────────────────────────────────────────────

describe('BorrowingBase Summary', () => {
  let BorrowingBase: any;

  beforeAll(() => {
    ({ BorrowingBase } = require('../packages/funding-ops/src/borrowing-base'));
  });

  test('returns summary without certificate', () => {
    const bb = new BorrowingBase();
    bb.addPosition({ description: 'MTN', type: 'mtn', faceValue: 10_000_000 });
    const summary = bb.getSummary();
    expect(summary.lastCertificateDate).toBeNull();
    expect(summary.certificateCount).toBe(0);
    expect(summary.totalFaceValue).toBe(10_000_000);
    expect(summary.status).toBe('draft');
  });

  test('returns summary with certificate', () => {
    const bb = new BorrowingBase({ facilityLimit: 4_000_000 });
    bb.addPosition({
      description: 'TC Advantage 5% MTN',
      type: 'mtn',
      faceValue: 10_000_000,
      couponRate: 5.0,
      verificationSource: 'STC',
    });
    bb.generateCertificate('2026-02');
    const summary = bb.getSummary();
    expect(summary.lastCertificateDate).toBeTruthy();
    expect(summary.certificateCount).toBe(1);
    expect(summary.totalFaceValue).toBe(10_000_000);
    expect(summary.totalEligibleValue).toBe(6_000_000);
    expect(summary.facilityLimit).toBe(4_000_000);
    expect(summary.covenantCompliance).toBe(true);
    expect(summary.status).toBe('generated');
  });

  test('summary reflects open exceptions', () => {
    const bb = new BorrowingBase();
    bb.raiseException({ severity: 'critical', category: 'test', description: 'test' });
    bb.raiseException({ severity: 'warning', category: 'test', description: 'test2' });
    const summary = bb.getSummary();
    expect(summary.openExceptions).toBe(2);
    expect(summary.criticalExceptions).toBe(1);
  });
});

// ── Persistence ──────────────────────────────────────────────────

describe('BorrowingBase Persistence', () => {
  let BorrowingBase: any;
  const testPersistPath = path.join(ROOT, 'logs', 'test-bb-persist.json');

  beforeAll(() => {
    ({ BorrowingBase } = require('../packages/funding-ops/src/borrowing-base'));
  });

  afterAll(() => {
    try { fs.unlinkSync(testPersistPath); } catch { /* ignore */ }
  });

  test('persists to disk', () => {
    const bb = new BorrowingBase({ persistPath: testPersistPath });
    bb.addPosition({ description: 'MTN', type: 'mtn', faceValue: 10_000_000 });
    bb.generateCertificate();
    bb.persist();
    expect(fs.existsSync(testPersistPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(testPersistPath, 'utf-8'));
    expect(data.positions).toHaveLength(1);
    expect(data.certificates).toHaveLength(1);
  });

  test('loads from disk', () => {
    const bb = new BorrowingBase({ persistPath: testPersistPath });
    const loaded = bb.loadFromDisk();
    expect(loaded).toBe(true);
    expect(bb.getPositions()).toHaveLength(1);
    expect(bb.getCertificates()).toHaveLength(1);
  });

  test('returns false when no file exists', () => {
    const bb = new BorrowingBase({ persistPath: './nonexistent/path.json' });
    expect(bb.loadFromDisk()).toBe(false);
  });
});

// ── Valuation Justification Document ─────────────────────────────

describe('Valuation Justification Document', () => {
  const docPath = path.join(ROOT, 'Agreement_Send_Package', 'VALUATION_JUSTIFICATION.md');
  let doc: string;

  beforeAll(() => {
    doc = fs.readFileSync(docPath, 'utf-8');
  });

  test('document exists', () => {
    expect(fs.existsSync(docPath)).toBe(true);
  });

  test('contains platform valuation summary', () => {
    expect(doc).toContain('VALUATION SUMMARY');
    expect(doc).toContain('Platform Infrastructure');
  });

  test('contains Preset B numbers', () => {
    expect(doc).toContain('$3,500,000');
    expect(doc).toContain('$2,500,000');
  });

  test('contains replacement cost methodology', () => {
    expect(doc).toContain('REPLACEMENT COST METHODOLOGY');
    expect(doc).toContain('Lines of Code');
  });

  test('contains sponsor note terms', () => {
    expect(doc).toContain('SPONSOR NOTE TERMS');
    expect(doc).toContain('Assignment');
    expect(doc).toContain('PIK permitted');
  });

  test('contains platform licensing economics', () => {
    expect(doc).toContain('$20,000/month');
    expect(doc).toContain('10% of transaction amount');
  });

  test('contains risk-adjusted valuation', () => {
    expect(doc).toContain('RISK-ADJUSTED VALUATION');
    expect(doc).toContain('Downside');
    expect(doc).toContain('Base Case');
    expect(doc).toContain('Upside');
  });

  test('references comparable transactions', () => {
    expect(doc).toContain('COMPARABLE TRANSACTIONS');
    expect(doc).toContain('Securitize');
    expect(doc).toContain('Centrifuge');
  });

  test('contains engineering build cost breakdown', () => {
    expect(doc).toContain('Core Ledger Integration');
    expect(doc).toContain('Capital Markets');
    expect(doc).toContain('Compliance & Governance');
    expect(doc).toContain('Settlement & Escrow');
  });
});

// ── Credit Committee Positioning ─────────────────────────────────

describe('Credit Committee Positioning Brief', () => {
  const docPath = path.join(ROOT, 'DATA_ROOM_v1', '00_EXEC_SUMMARY', 'CREDIT_COMMITTEE_POSITIONING.md');
  let doc: string;

  beforeAll(() => {
    doc = fs.readFileSync(docPath, 'utf-8');
  });

  test('document exists', () => {
    expect(fs.existsSync(docPath)).toBe(true);
  });

  test('contains collateral summary table', () => {
    expect(doc).toContain('87225HAB4');
    expect(doc).toContain('$10,000,000');
    expect(doc).toContain('Securities Transfer Corporation');
  });

  test('contains borrowing base calculation', () => {
    expect(doc).toContain('40%');
    expect(doc).toContain('$4,000,000');
  });

  test('contains coverage ratios', () => {
    expect(doc).toContain('250%');
    expect(doc).toContain('125%');
  });

  test('contains risk assessment', () => {
    expect(doc).toContain('RISK ASSESSMENT');
    expect(doc).toContain('Collateral authenticity');
    expect(doc).toContain('Borrower default');
  });

  test('contains recommended terms', () => {
    expect(doc).toContain('RECOMMENDED TERMS');
    expect(doc).toContain('SOFR');
  });

  test('contains positioning statement', () => {
    expect(doc).toContain('straightforward borrowing-base facility');
    expect(doc).toContain('STC-verified');
  });

  test('references data room access', () => {
    expect(doc).toContain('DATA ROOM ACCESS');
    expect(doc).toContain('34 documents');
  });

  test('positions platform as supplementary', () => {
    expect(doc).toContain('supplementary');
    expect(doc).toContain('deal stands on collateral');
  });
});

// ── Sponsor Note Estoppel ────────────────────────────────────────

describe('Sponsor Note Estoppel Template', () => {
  const docPath = path.join(ROOT, 'Agreement_Send_Package', 'SPONSOR_NOTE_ESTOPPEL.md');
  let doc: string;

  beforeAll(() => {
    doc = fs.readFileSync(docPath, 'utf-8');
  });

  test('document exists', () => {
    expect(fs.existsSync(docPath)).toBe(true);
  });

  test('contains existence and validity section', () => {
    expect(doc).toContain('EXISTENCE AND VALIDITY');
    expect(doc).toContain('valid, binding, and enforceable');
  });

  test('contains outstanding balance section', () => {
    expect(doc).toContain('OUTSTANDING BALANCE');
    expect(doc).toContain('Original Principal');
    expect(doc).toContain('Current Outstanding Principal');
    expect(doc).toContain('Accrued and Unpaid Interest');
  });

  test('contains services delivered confirmation', () => {
    expect(doc).toContain('SERVICES DELIVERED');
    expect(doc).toContain('substantially performed');
    expect(doc).toContain('deferred consideration for value already delivered');
  });

  test('confirms no offsets', () => {
    expect(doc).toContain('NO OFFSETS');
    expect(doc).toContain('no offsets, defenses, deductions, counterclaims');
    expect(doc).toContain('no right of setoff');
    expect(doc).toContain('no disputes');
  });

  test('confirms assignment permitted', () => {
    expect(doc).toContain('ASSIGNMENT PERMITTED');
    expect(doc).toContain('without the consent of the Issuer');
    expect(doc).toContain('recognize the Lender');
  });

  test('confirms no prior assignments', () => {
    expect(doc).toContain('NO PRIOR ASSIGNMENTS');
  });

  test('contains payment mechanics', () => {
    expect(doc).toContain('PAYMENT MECHANICS');
    expect(doc).toContain('United States Dollars');
    expect(doc).toContain('XRPL');
  });

  test('contains estoppel reliance language', () => {
    expect(doc).toContain('RELIANCE');
    expect(doc).toContain('estopped from asserting');
  });

  test('has both signature blocks', () => {
    expect(doc).toContain('OPTKAS1-MAIN SPV');
    expect(doc).toContain('UNYKORN 7777, INC.');
    expect(doc).toContain('Manager');
    expect(doc).toContain('CEO');
  });

  test('governed by Wyoming law', () => {
    expect(doc).toContain('Wyoming');
  });
});

// ── Dashboard Integration ────────────────────────────────────────

describe('Dashboard Borrowing Base Integration', () => {
  const serverPath = path.join(ROOT, 'apps', 'dashboard', 'src', 'server.ts');
  let serverSrc: string;

  beforeAll(() => {
    serverSrc = fs.readFileSync(serverPath, 'utf-8');
  });

  test('imports BorrowingBase', () => {
    expect(serverSrc).toContain("import { BorrowingBase, type BorrowingBaseSummary }");
  });

  test('creates BorrowingBase singleton', () => {
    expect(serverSrc).toContain('new BorrowingBase(');
  });

  test('includes borrowingBase in DashboardState', () => {
    expect(serverSrc).toContain('borrowingBase: BorrowingBaseSummary');
  });

  test('populates borrowingBase in buildState', () => {
    expect(serverSrc).toContain('borrowingBase: borrowingBase.getSummary()');
  });

  test('renders Borrowing Base Certificate card', () => {
    expect(serverSrc).toContain('Borrowing Base Certificate');
  });

  test('displays coverage metrics', () => {
    expect(serverSrc).toContain('Collateral Coverage');
    expect(serverSrc).toContain('Interest Coverage');
    expect(serverSrc).toContain('Utilization');
  });

  test('displays covenant compliance status', () => {
    expect(serverSrc).toContain('Covenant Compliance');
    expect(serverSrc).toContain('Breached Covenants');
  });

  test('displays exception tracking', () => {
    expect(serverSrc).toContain('Open Exceptions');
    expect(serverSrc).toContain('Critical Exceptions');
  });

  test('displays facility metrics', () => {
    expect(serverSrc).toContain('Facility Limit');
    expect(serverSrc).toContain('Outstanding');
    expect(serverSrc).toContain('Available Capacity');
    expect(serverSrc).toContain('Advance Rate');
  });

  test('has at least 16 dashboard cards', () => {
    const cardCount = (serverSrc.match(/<h2>/g) || []).length;
    expect(cardCount).toBeGreaterThanOrEqual(16);
  });
});

// ── Index Exports ────────────────────────────────────────────────

describe('Phase 14 Index Exports', () => {
  const indexPath = path.join(ROOT, 'packages', 'funding-ops', 'src', 'index.ts');
  let indexSrc: string;

  beforeAll(() => {
    indexSrc = fs.readFileSync(indexPath, 'utf-8');
  });

  test('exports BorrowingBase class', () => {
    expect(indexSrc).toContain('BorrowingBase');
  });

  test('exports BorrowingBaseConfig', () => {
    expect(indexSrc).toContain('BorrowingBaseConfig');
  });

  test('exports BorrowingBaseSummary', () => {
    expect(indexSrc).toContain('BorrowingBaseSummary');
  });

  test('exports BorrowingBaseCertificate', () => {
    expect(indexSrc).toContain('BorrowingBaseCertificate');
  });

  test('exports CollateralPosition', () => {
    expect(indexSrc).toContain('CollateralPosition');
  });

  test('exports CovenantCheck', () => {
    expect(indexSrc).toContain('CovenantCheck');
  });

  test('exports BorrowingBaseException', () => {
    expect(indexSrc).toContain('BorrowingBaseException');
  });

  test('exports CertificateStatus', () => {
    expect(indexSrc).toContain('CertificateStatus');
  });

  test('exports CollateralType', () => {
    expect(indexSrc).toContain('CollateralType');
  });

  test('exports CovenantStatus', () => {
    expect(indexSrc).toContain('CovenantStatus');
  });

  test('exports ExceptionSeverity', () => {
    expect(indexSrc).toContain('ExceptionSeverity');
  });

  test('exports BorrowingBaseEvent', () => {
    expect(indexSrc).toContain('BorrowingBaseEvent');
  });
});

// ── Data Room Index ──────────────────────────────────────────────

describe('Data Room Index Updates', () => {
  const indexPath = path.join(ROOT, 'DATA_ROOM_v1', 'INDEX.md');
  let indexSrc: string;

  beforeAll(() => {
    indexSrc = fs.readFileSync(indexPath, 'utf-8');
  });

  test('total documents updated to at least 35', () => {
    expect(indexSrc).toMatch(/\*\*Total Documents:\*\* \d+/);
    const match = indexSrc.match(/\*\*Total Documents:\*\* (\d+)/);
    expect(parseInt(match![1])).toBeGreaterThanOrEqual(35);
  });

  test('00_EXEC_SUMMARY has 5 files', () => {
    expect(indexSrc).toContain('00_EXEC_SUMMARY (5 files)');
  });

  test('includes CREDIT_COMMITTEE_POSITIONING.md', () => {
    expect(indexSrc).toContain('CREDIT_COMMITTEE_POSITIONING.md');
  });
});

// ── Deployment Readiness ─────────────────────────────────────────

describe('Deployment Readiness Updates', () => {
  const verifyPath = path.join(ROOT, 'scripts', 'verify-deployment-readiness.ts');
  let verifySrc: string;

  beforeAll(() => {
    verifySrc = fs.readFileSync(verifyPath, 'utf-8');
  });

  test('includes borrowing-base.ts in required sources', () => {
    expect(verifySrc).toContain('borrowing-base.ts');
  });

  test('funding-ops has at least 10 source files listed', () => {
    const match = verifySrc.match(/requiredSources\s*=\s*\[(.*?)\]/s);
    expect(match).toBeTruthy();
    const items = match![1].match(/'/g);
    expect(items!.length / 2).toBeGreaterThanOrEqual(10);
  });
});

// ── Cross-File Integration ───────────────────────────────────────

describe('Phase 14 Cross-File Integration', () => {
  test('Agreement_Send_Package has 11 files', () => {
    const pkgDir = path.join(ROOT, 'Agreement_Send_Package');
    const files = fs.readdirSync(pkgDir).filter(f => f.endsWith('.md'));
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  test('funding-ops has 10 source files', () => {
    const srcDir = path.join(ROOT, 'packages', 'funding-ops', 'src');
    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  test('valuation doc references sponsor note terms', () => {
    const val = fs.readFileSync(path.join(ROOT, 'Agreement_Send_Package', 'VALUATION_JUSTIFICATION.md'), 'utf-8');
    expect(val).toContain('Sponsor Note');
    expect(val).toContain('PLATFORM LICENSING');
  });

  test('estoppel references assignment without consent', () => {
    const est = fs.readFileSync(path.join(ROOT, 'Agreement_Send_Package', 'SPONSOR_NOTE_ESTOPPEL.md'), 'utf-8');
    expect(est).toContain('without the consent of the Issuer');
    expect(est).toContain('bona fide debt obligation');
  });

  test('credit committee brief references data room', () => {
    const cc = fs.readFileSync(path.join(ROOT, 'DATA_ROOM_v1', '00_EXEC_SUMMARY', 'CREDIT_COMMITTEE_POSITIONING.md'), 'utf-8');
    expect(cc).toContain('institutional data room');
    expect(cc).toContain('Automated borrowing base certificates');
  });
});
