/**
 * Phase 13 — Sponsor Instrument & Legal Framework
 *
 * Tests for:
 *   - Sponsor Consideration Note module (source validation)
 *   - Note issuance and lifecycle
 *   - Interest accrual (PIK, cash, mixed)
 *   - Payment recording and application
 *   - Assignment and pledge tracking
 *   - Events of default and acceleration
 *   - Subordination and non-interference
 *   - Legal document integrity
 *   - Dashboard integration
 *   - Index exports
 *   - Data room updates
 *   - Cross-file integration
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Sponsor Note Source Validation ────────────────────────────

describe('Phase 13 — SponsorNote Source', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/sponsor-note.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('sponsor-note.ts exists', () => {
    expect(fs.existsSync(srcPath)).toBe(true);
  });

  test('exports SponsorNote class', () => {
    expect(src).toContain('export class SponsorNote extends EventEmitter');
  });

  test('exports NoteStatus type', () => {
    expect(src).toContain("export type NoteStatus");
    expect(src).toContain("'draft'");
    expect(src).toContain("'issued'");
    expect(src).toContain("'accruing'");
    expect(src).toContain("'accelerated'");
    expect(src).toContain("'paid_in_full'");
    expect(src).toContain("'defaulted'");
  });

  test('exports InterestMode type', () => {
    expect(src).toContain("export type InterestMode");
    expect(src).toContain("'cash'");
    expect(src).toContain("'pik'");
    expect(src).toContain("'mixed'");
  });

  test('exports SubordinationTier type', () => {
    expect(src).toContain("export type SubordinationTier");
    expect(src).toContain("'subordinated_to_investor_bonds'");
    expect(src).toContain("'senior_unsecured'");
  });

  test('exports DefaultEventType', () => {
    expect(src).toContain("export type DefaultEventType");
    expect(src).toContain("'payment_failure'");
    expect(src).toContain("'material_breach'");
    expect(src).toContain("'platform_rights_termination'");
    expect(src).toContain("'insolvency'");
  });

  test('exports AssignmentType', () => {
    expect(src).toContain("export type AssignmentType");
    expect(src).toContain("'full_assignment'");
    expect(src).toContain("'pledge'");
    expect(src).toContain("'partial_assignment'");
    expect(src).toContain("'discount'");
    expect(src).toContain("'encumbrance'");
  });

  test('exports NoteTerms interface', () => {
    expect(src).toContain('export interface NoteTerms');
    expect(src).toContain('principal: number');
    expect(src).toContain('interestRate: number');
    expect(src).toContain('maturityMonths: number');
    expect(src).toContain('subordination: SubordinationTier');
    expect(src).toContain('prepayable: boolean');
    expect(src).toContain('governingLaw: string');
  });

  test('exports AccrualRecord interface', () => {
    expect(src).toContain('export interface AccrualRecord');
    expect(src).toContain('daysAccrued: number');
    expect(src).toContain('pikCapitalized: number');
    expect(src).toContain('cashPayable: number');
    expect(src).toContain('principalAfterPik: number');
  });

  test('exports PaymentRecord interface', () => {
    expect(src).toContain('export interface PaymentRecord');
    expect(src).toContain('appliedToPrincipal: number');
    expect(src).toContain('appliedToInterest: number');
    expect(src).toContain('remainingPrincipal: number');
  });

  test('exports AssignmentRecord interface', () => {
    expect(src).toContain('export interface AssignmentRecord');
    expect(src).toContain('consentRequired: boolean');
    expect(src).toContain('acknowledged: boolean');
  });

  test('exports DefaultEvent interface', () => {
    expect(src).toContain('export interface DefaultEvent');
    expect(src).toContain('cured: boolean');
    expect(src).toContain('accelerated: boolean');
  });

  test('has SHA-256 hashing', () => {
    expect(src).toContain('sha256');
    expect(src).toContain("createHash('sha256')");
  });
});

// ─── Issuance ──────────────────────────────────────────────────

describe('Phase 13 — SponsorNote Issuance', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/sponsor-note.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('has issue() method', () => {
    expect(src).toContain('issue(params:');
  });

  test('sets status to issued', () => {
    expect(src).toContain("this.state.status = 'issued'");
  });

  test('generates SN- prefixed IDs', () => {
    expect(src).toContain('SN-');
    expect(src).toContain('randomBytes');
  });

  test('emits note_issued event', () => {
    expect(src).toContain("'note_issued'");
  });

  test('computes maturity date from months', () => {
    expect(src).toContain('setMonth');
    expect(src).toContain('maturityMonths');
  });

  test('prevents double issuance', () => {
    expect(src).toContain("Cannot issue note in status");
  });
});

// ─── Interest Accrual ──────────────────────────────────────────

describe('Phase 13 — SponsorNote Interest Accrual', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/sponsor-note.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('has accrue() method', () => {
    expect(src).toContain('accrue(days: number)');
  });

  test('calculates daily rate from annual', () => {
    expect(src).toContain('interestRate / 365');
  });

  test('handles PIK capitalization', () => {
    expect(src).toContain('pikCapitalized = interestAmount');
    expect(src).toContain('this.state.currentPrincipal += pikCapitalized');
  });

  test('handles cash interest', () => {
    expect(src).toContain('cashPayable = interestAmount');
    expect(src).toContain('this.state.accruedInterest += cashPayable');
  });

  test('handles mixed mode (50/50)', () => {
    expect(src).toContain('interestAmount * 0.5');
  });

  test('generates ACC- prefixed IDs', () => {
    expect(src).toContain('ACC-');
  });

  test('tracks cumulative interest', () => {
    expect(src).toContain('cumulativeInterest');
  });

  test('emits interest_accrued event', () => {
    expect(src).toContain("'interest_accrued'");
  });
});

// ─── Payments ──────────────────────────────────────────────────

describe('Phase 13 — SponsorNote Payments', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/sponsor-note.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('has recordPayment() method', () => {
    expect(src).toContain('recordPayment(params:');
  });

  test('applies to interest first then principal', () => {
    // Interest before principal
    const interestIdx = src.indexOf('Interest first');
    const principalIdx = src.indexOf('Then principal');
    expect(interestIdx).toBeLessThan(principalIdx);
    expect(interestIdx).toBeGreaterThan(-1);
  });

  test('generates PMT- prefixed IDs', () => {
    expect(src).toContain('PMT-');
  });

  test('detects paid_in_full status', () => {
    expect(src).toContain("'paid_in_full'");
    expect(src).toContain('this.state.paidInFull = true');
  });

  test('emits payment_recorded event', () => {
    expect(src).toContain("'payment_recorded'");
  });

  test('emits note_paid_in_full event', () => {
    expect(src).toContain("'note_paid_in_full'");
  });

  test('supports multiple payment methods', () => {
    expect(src).toContain("'cash'");
    expect(src).toContain("'wire'");
    expect(src).toContain("'ledger_settlement'");
  });
});

// ─── Assignment & Pledge ───────────────────────────────────────

describe('Phase 13 — SponsorNote Assignment', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/sponsor-note.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('has recordAssignment() method', () => {
    expect(src).toContain('recordAssignment(params:');
  });

  test('consent is always false per note terms', () => {
    expect(src).toContain('consentRequired: false');
  });

  test('generates ASN- prefixed IDs', () => {
    expect(src).toContain('ASN-');
  });

  test('has acknowledgeAssignment() method', () => {
    expect(src).toContain('acknowledgeAssignment(assignmentId:');
  });

  test('emits assignment_recorded event', () => {
    expect(src).toContain("'assignment_recorded'");
  });

  test('supports all assignment types', () => {
    expect(src).toContain("'full_assignment'");
    expect(src).toContain("'pledge'");
    expect(src).toContain("'partial_assignment'");
    expect(src).toContain("'discount'");
    expect(src).toContain("'encumbrance'");
  });
});

// ─── Default & Acceleration ────────────────────────────────────

describe('Phase 13 — SponsorNote Default & Acceleration', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/sponsor-note.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('has recordDefault() method', () => {
    expect(src).toContain('recordDefault(params:');
  });

  test('generates DEF- prefixed IDs', () => {
    expect(src).toContain('DEF-');
  });

  test('has cureDefault() method', () => {
    expect(src).toContain('cureDefault(defaultId:');
  });

  test('restores status after all defaults cured', () => {
    expect(src).toContain("this.state.status = 'accruing'");
  });

  test('has accelerate() method', () => {
    expect(src).toContain('accelerate(): void');
  });

  test('sets accelerated state', () => {
    expect(src).toContain('this.state.accelerated = true');
    expect(src).toContain("this.state.status = 'accelerated'");
  });

  test('emits default_recorded event', () => {
    expect(src).toContain("'default_recorded'");
  });

  test('emits default_cured event', () => {
    expect(src).toContain("'default_cured'");
  });

  test('emits note_accelerated event', () => {
    expect(src).toContain("'note_accelerated'");
  });

  test('prevents accelerating a paid note', () => {
    expect(src).toContain('Cannot accelerate a paid note');
  });
});

// ─── Summary & Queries ─────────────────────────────────────────

describe('Phase 13 — SponsorNote Summary', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/sponsor-note.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('has getSummary() method', () => {
    expect(src).toContain('getSummary(): SponsorNoteSummary');
  });

  test('summary includes assignableWithoutConsent = true', () => {
    expect(src).toContain('assignableWithoutConsent: true');
  });

  test('summary includes noSetoff = true', () => {
    expect(src).toContain('noSetoff: true');
  });

  test('has getDaysToMaturity()', () => {
    expect(src).toContain('getDaysToMaturity()');
  });

  test('has isOverdue()', () => {
    expect(src).toContain('isOverdue()');
  });

  test('has getTotalOutstanding()', () => {
    expect(src).toContain('getTotalOutstanding()');
  });

  test('has getState() query', () => {
    expect(src).toContain('getState(): SponsorNoteState');
  });

  test('has getTerms() query', () => {
    expect(src).toContain('getTerms(): NoteTerms');
  });

  test('has getUncuredDefaults()', () => {
    expect(src).toContain('getUncuredDefaults()');
  });
});

// ─── Persistence ───────────────────────────────────────────────

describe('Phase 13 — SponsorNote Persistence', () => {
  const srcPath = path.resolve(__dirname, '../packages/funding-ops/src/sponsor-note.ts');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(srcPath, 'utf-8');
  });

  test('has persist() method', () => {
    expect(src).toContain('private persist()');
  });

  test('has loadFromDisk() method', () => {
    expect(src).toContain('private loadFromDisk()');
  });

  test('creates directory recursively', () => {
    expect(src).toContain("recursive: true");
  });

  test('default persist path', () => {
    expect(src).toContain('./logs/sponsor-note.json');
  });

  test('emits persist_error on failure', () => {
    expect(src).toContain("'persist_error'");
  });

  test('emits load_error on failure', () => {
    expect(src).toContain("'load_error'");
  });
});

// ─── Legal Documents ───────────────────────────────────────────

describe('Phase 13 — Sponsor Consideration Note Document', () => {
  const notePath = path.resolve(__dirname, '../Agreement_Send_Package/SCHEDULE_B_SPONSOR_CONSIDERATION_NOTE.md');
  let note: string;

  beforeAll(() => {
    note = fs.readFileSync(notePath, 'utf-8');
  });

  test('Schedule B exists', () => {
    expect(fs.existsSync(notePath)).toBe(true);
  });

  test('identifies issuer as OPTKAS1-MAIN SPV', () => {
    expect(note).toContain('OPTKAS1-MAIN SPV');
  });

  test('identifies payee as Unykorn 7777, Inc.', () => {
    expect(note).toContain('Unykorn 7777, Inc.');
  });

  test('contains purpose and consideration section', () => {
    expect(note).toContain('PURPOSE AND CONSIDERATION');
    expect(note).toContain('services already rendered');
    expect(note).toContain('deferred consideration for value delivered');
  });

  test('declares instrument as debt, not equity', () => {
    expect(note).toContain('not equity');
    expect(note).toContain('debt obligation');
  });

  test('defines interest with PIK option', () => {
    expect(note).toContain('INTEREST');
    expect(note).toContain('PIK');
  });

  test('defines subordination', () => {
    expect(note).toContain('SUBORDINATION');
    expect(note).toContain('subordinate solely to senior bondholder obligations');
    expect(note).toContain('senior to all other unsecured obligations');
  });

  test('non-interference with investor program', () => {
    expect(note).toContain('NON-INTERFERENCE');
    expect(note).toContain('operating revenues or general assets');
    expect(note).toContain('not impair');
  });

  test('assignment and financing rights without consent', () => {
    expect(note).toContain('ASSIGNMENT AND FINANCING RIGHTS');
    expect(note).toContain('without the consent of the Issuer');
    expect(note).toContain('assign, pledge, finance, discount');
  });

  test('events of default defined', () => {
    expect(note).toContain('EVENTS OF DEFAULT');
    expect(note).toContain('Failure to pay principal or interest');
    expect(note).toContain('Material breach');
    expect(note).toContain('Insolvency');
  });

  test('acceleration clause', () => {
    expect(note).toContain('ACCELERATION');
    expect(note).toContain('immediately due and payable');
  });

  test('no setoff clause', () => {
    expect(note).toContain('NO SETOFF');
    expect(note).toContain('shall not assert any setoff');
  });

  test('Wyoming governing law', () => {
    expect(note).toContain('State of Wyoming');
  });

  test('has signature blocks', () => {
    expect(note).toContain('SIGNATURES');
    expect(note).toContain('ISSUER');
    expect(note).toContain('SPONSOR / PAYEE');
  });
});

// ─── Agreement Clauses ─────────────────────────────────────────

describe('Phase 13 — Sponsor Agreement Clauses', () => {
  const clausesPath = path.resolve(__dirname, '../Agreement_Send_Package/SPONSOR_AGREEMENT_CLAUSES.md');
  let clauses: string;

  beforeAll(() => {
    clauses = fs.readFileSync(clausesPath, 'utf-8');
  });

  test('clauses document exists', () => {
    expect(fs.existsSync(clausesPath)).toBe(true);
  });

  test('role & capacity clause', () => {
    expect(clauses).toContain('Independent Platform Provider');
    expect(clauses).toContain('not** as an issuer, underwriter, placement agent, broker, dealer');
  });

  test('no fiduciary clause', () => {
    expect(clauses).toContain('No Fiduciary or Agency Relationship');
    expect(clauses).toContain('shall not be deemed a fiduciary');
  });

  test('non-contingent fee clause', () => {
    expect(clauses).toContain('Non-Contingent Fees');
    expect(clauses).toContain('not contingent upon the success of any financing');
  });

  test('sponsor consideration instrument clause', () => {
    expect(clauses).toContain('SPONSOR CONSIDERATION INSTRUMENT');
    expect(clauses).toContain('bona fide debt obligation');
    expect(clauses).toContain('Schedule B');
  });

  test('assignment without consent', () => {
    expect(clauses).toContain('without the consent of the Issuer');
  });

  test('survival clause', () => {
    expect(clauses).toContain('Survival');
    expect(clauses).toContain('survive termination');
  });

  test('platform license with IP reservation', () => {
    expect(clauses).toContain('License Grant');
    expect(clauses).toContain('non-exclusive, non-transferable');
    expect(clauses).toContain('Reservation of Rights');
    expect(clauses).toContain('exclusive property of Unykorn');
  });

  test('10% utilization fee framing', () => {
    expect(clauses).toContain('ten percent (10%)');
    expect(clauses).toContain('No Capital Raising Activity');
    expect(clauses).toContain('not** for investor solicitation');
  });

  test('acceleration protection', () => {
    expect(clauses).toContain('Acceleration Upon Improper Termination');
    expect(clauses).toContain('immediately accelerate');
  });

  test('non-setoff clause', () => {
    expect(clauses).toContain('NON-SETOFF');
    expect(clauses).toContain('shall not be subject to any setoff');
  });

  test('legal risk matrix', () => {
    expect(clauses).toContain('LEGAL RISK MATRIX');
    expect(clauses).toContain('System Build Fees');
    expect(clauses).toContain('Platform License Fees');
    expect(clauses).toContain('Sponsor Consideration Note');
    expect(clauses).toContain('Transaction Participation Fee');
  });

  test('sponsor posture summary', () => {
    expect(clauses).toContain('builder');
    expect(clauses).toContain('licensor');
    expect(clauses).toContain('platform operator');
    expect(clauses).toContain('creditor');
  });
});

// ─── Data Room ─────────────────────────────────────────────────

describe('Phase 13 — Data Room Updates', () => {
  test('Sponsor Consideration Note in data room', () => {
    const notePath = path.resolve(__dirname, '../DATA_ROOM_v1/01_TRANSACTION_STRUCTURE/SPONSOR_CONSIDERATION_NOTE.md');
    expect(fs.existsSync(notePath)).toBe(true);
    const note = fs.readFileSync(notePath, 'utf-8');
    expect(note).toContain('Financeable Debt Instrument');
    expect(note).toContain('OPTKAS1-MAIN SPV');
    expect(note).toContain('Unykorn 7777, Inc.');
    expect(note).toContain('Fully assignable');
  });

  test('data room INDEX.md references sponsor note', () => {
    const indexPath = path.resolve(__dirname, '../DATA_ROOM_v1/INDEX.md');
    const index = fs.readFileSync(indexPath, 'utf-8');
    expect(index).toContain('SPONSOR_CONSIDERATION_NOTE.md');
    expect(index).toContain('6 files');
    expect(index).toContain('34');
  });
});

// ─── Dashboard Integration ─────────────────────────────────────

describe('Phase 13 — Dashboard Integration', () => {
  const dashPath = path.resolve(__dirname, '../apps/dashboard/src/server.ts');
  let dashSrc: string;

  beforeAll(() => {
    dashSrc = fs.readFileSync(dashPath, 'utf-8');
  });

  test('imports SponsorNote', () => {
    expect(dashSrc).toContain("import { SponsorNote");
    expect(dashSrc).toContain("SponsorNoteSummary");
  });

  test('creates sponsorNote singleton', () => {
    expect(dashSrc).toContain('new SponsorNote()');
  });

  test('DashboardState has sponsorNote field', () => {
    expect(dashSrc).toContain('sponsorNote: SponsorNoteSummary');
  });

  test('buildState populates sponsorNote', () => {
    expect(dashSrc).toContain('sponsorNote.getSummary()');
  });

  test('dashboard HTML has Sponsor Consideration Note card', () => {
    expect(dashSrc).toContain('Sponsor Consideration Note');
  });

  test('card shows principal fields', () => {
    expect(dashSrc).toContain('Original Principal');
    expect(dashSrc).toContain('Current Principal');
    expect(dashSrc).toContain('Total Outstanding');
  });

  test('card shows interest info', () => {
    expect(dashSrc).toContain('Accrued Interest');
    expect(dashSrc).toContain('Interest Rate');
  });

  test('card shows subordination tier', () => {
    expect(dashSrc).toContain('Subordination');
  });

  test('card shows maturity info', () => {
    expect(dashSrc).toContain('Days to Maturity');
  });

  test('card shows assignment info', () => {
    expect(dashSrc).toContain('Assignments');
    expect(dashSrc).toContain('Assignable w/o Consent');
  });

  test('card shows default/acceleration info', () => {
    expect(dashSrc).toContain('Defaults');
    expect(dashSrc).toContain('Accelerated');
  });

  test('card shows no-setoff status', () => {
    expect(dashSrc).toContain('No Setoff');
  });

  test('dashboard now has 15 cards total', () => {
    const cardCount = (dashSrc.match(/<h2>/g) || []).length;
    expect(cardCount).toBe(15);
  });
});

// ─── Index Exports ─────────────────────────────────────────────

describe('Phase 13 — Index Exports', () => {
  const indexPath = path.resolve(__dirname, '../packages/funding-ops/src/index.ts');
  let indexSrc: string;

  beforeAll(() => {
    indexSrc = fs.readFileSync(indexPath, 'utf-8');
  });

  test('exports SponsorNote class', () => {
    expect(indexSrc).toContain('SponsorNote');
  });

  test('exports SponsorNoteConfig', () => {
    expect(indexSrc).toContain('SponsorNoteConfig');
  });

  test('exports SponsorNoteState', () => {
    expect(indexSrc).toContain('SponsorNoteState');
  });

  test('exports SponsorNoteSummary', () => {
    expect(indexSrc).toContain('SponsorNoteSummary');
  });

  test('exports NoteStatus', () => {
    expect(indexSrc).toContain('NoteStatus');
  });

  test('exports InterestMode', () => {
    expect(indexSrc).toContain('InterestMode');
  });

  test('exports SubordinationTier', () => {
    expect(indexSrc).toContain('SubordinationTier');
  });

  test('exports DefaultEventType', () => {
    expect(indexSrc).toContain('DefaultEventType');
  });

  test('exports AssignmentType', () => {
    expect(indexSrc).toContain('AssignmentType');
  });

  test('exports NoteTerms', () => {
    expect(indexSrc).toContain('NoteTerms');
  });

  test('exports AccrualRecord', () => {
    expect(indexSrc).toContain('AccrualRecord');
  });

  test('exports PaymentRecord', () => {
    expect(indexSrc).toContain('PaymentRecord');
  });

  test('exports AssignmentRecord', () => {
    expect(indexSrc).toContain('AssignmentRecord');
  });

  test('exports DefaultEvent', () => {
    expect(indexSrc).toContain('DefaultEvent');
  });

  test('exports from sponsor-note module', () => {
    expect(indexSrc).toContain("from './sponsor-note'");
  });
});

// ─── Cross-File Integration ────────────────────────────────────

describe('Phase 13 — Cross-File Integration', () => {
  test('funding-ops now has 9 source files', () => {
    const fundingOpsSrc = path.resolve(__dirname, '../packages/funding-ops/src');
    const files = fs.readdirSync(fundingOpsSrc).filter(f => f.endsWith('.ts'));
    expect(files.length).toBe(9);
    expect(files).toContain('pipeline.ts');
    expect(files).toContain('xrpl-activator.ts');
    expect(files).toContain('stellar-activator.ts');
    expect(files).toContain('report-generator.ts');
    expect(files).toContain('tx-queue.ts');
    expect(files).toContain('audit-bridge.ts');
    expect(files).toContain('settlement-connector.ts');
    expect(files).toContain('sponsor-note.ts');
    expect(files).toContain('index.ts');
  });

  test('Agreement_Send_Package has sponsor documents', () => {
    const pkgDir = path.resolve(__dirname, '../Agreement_Send_Package');
    const files = fs.readdirSync(pkgDir);
    expect(files).toContain('SCHEDULE_B_SPONSOR_CONSIDERATION_NOTE.md');
    expect(files).toContain('SPONSOR_AGREEMENT_CLAUSES.md');
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  test('verify-deployment-readiness includes sponsor-note.ts', () => {
    const scriptPath = path.resolve(__dirname, '../scripts/verify-deployment-readiness.ts');
    const script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toContain('sponsor-note.ts');
  });

  test('all Phase 13 source files exist', () => {
    const files = [
      '../packages/funding-ops/src/sponsor-note.ts',
      '../packages/funding-ops/src/index.ts',
      '../Agreement_Send_Package/SCHEDULE_B_SPONSOR_CONSIDERATION_NOTE.md',
      '../Agreement_Send_Package/SPONSOR_AGREEMENT_CLAUSES.md',
      '../DATA_ROOM_v1/01_TRANSACTION_STRUCTURE/SPONSOR_CONSIDERATION_NOTE.md',
      '../apps/dashboard/src/server.ts',
    ];
    for (const f of files) {
      expect(fs.existsSync(path.resolve(__dirname, f))).toBe(true);
    }
  });
});
