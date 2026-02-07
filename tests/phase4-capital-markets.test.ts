/**
 * Phase 4 Capital Markets & Institutional Infrastructure Tests
 *
 * Tests all 5 new packages and the bond factory extension:
 * - @optkas/governance (MultisigGovernor)
 * - @optkas/compliance (ComplianceEngine)
 * - @optkas/bond factory (BondFactory — Program/Series/Tranche/Waterfall/Allocation/Docs/Cashflow)
 * - @optkas/reporting (ReportingEngine)
 * - @optkas/bridge (BridgeManager)
 * - @optkas/agents (AgentEngine)
 *
 * All operations are in-memory — no XRPL/Stellar connection required.
 */

import { MultisigGovernor } from '@optkas/governance';
import { ComplianceEngine } from '@optkas/compliance';
import { BondFactory } from '@optkas/bond';
import { ReportingEngine } from '@optkas/reporting';
import { BridgeManager } from '@optkas/bridge';
import { AgentEngine } from '@optkas/agents';

// ═══════════════════════════════════════════════════════════════════
// @optkas/governance — MultisigGovernor
// ═══════════════════════════════════════════════════════════════════

describe('@optkas/governance — MultisigGovernor', () => {
  let gov: MultisigGovernor;
  let treasury: any;
  let compliance: any;
  let trustee: any;

  beforeEach(() => {
    gov = new MultisigGovernor({ threshold: 2, minimumSigners: 3 });
    treasury = gov.registerSigner({ role: 'treasury', xrplAddress: 'rTREASURY111111111111111111111', addedBy: 'system' });
    compliance = gov.registerSigner({ role: 'compliance', xrplAddress: 'rCOMPLIANCE1111111111111111111', addedBy: 'system' });
    trustee = gov.registerSigner({ role: 'trustee', xrplAddress: 'rTRUSTEE11111111111111111111111', addedBy: 'system' });
  });

  test('registers signers with correct roles', () => {
    expect(treasury.id).toMatch(/^SIGNER-/);
    expect(treasury.role).toBe('treasury');
    expect(treasury.active).toBe(true);
    expect(gov.getActiveSigners()).toHaveLength(3);
  });

  test('enforces role-based authority', () => {
    // treasury can issue IOUs
    expect(() => gov.enforceAuthority(treasury.id, 'issue_iou')).not.toThrow();
    // treasury cannot freeze IOUs (compliance only)
    expect(() => gov.enforceAuthority(treasury.id, 'freeze_iou')).toThrow('lacks authority');
    // compliance can freeze
    expect(() => gov.enforceAuthority(compliance.id, 'freeze_iou')).not.toThrow();
    // trustee can release escrow
    expect(() => gov.enforceAuthority(trustee.id, 'release_escrow')).not.toThrow();
  });

  test('creates approval request and reaches threshold', () => {
    const request = gov.createApprovalRequest({
      action: 'bond_create',
      description: 'Create Series A bond',
      payload: { name: 'Series A' },
      requestedBy: treasury.id,
    });

    expect(request.id).toMatch(/^APPR-/);
    expect(request.status).toBe('pending');
    expect(request.requiredThreshold).toBe(2);

    // First vote
    gov.vote(request.id, treasury.id, 'approve', 'Authorized');
    expect(gov.isApproved(request.id)).toBe(false);

    // Second vote — should reach threshold
    gov.vote(request.id, trustee.id, 'approve', 'Concur');
    expect(gov.isApproved(request.id)).toBe(true);

    // enforceApproval should pass
    expect(() => gov.enforceApproval(request.id, 'bond creation')).not.toThrow();
  });

  test('rejects duplicate votes', () => {
    const request = gov.createApprovalRequest({
      action: 'issue_iou',
      description: 'Issue bond IOUs',
      payload: {},
      requestedBy: treasury.id,
    });

    gov.vote(request.id, treasury.id, 'approve', 'First vote');
    expect(() => gov.vote(request.id, treasury.id, 'approve', 'Duplicate')).toThrow('already voted');
  });

  test('enforceApproval blocks unapproved operations', () => {
    const request = gov.createApprovalRequest({
      action: 'provision_amm',
      description: 'Provision AMM pool',
      payload: {},
      requestedBy: treasury.id,
    });

    expect(() => gov.enforceApproval(request.id, 'AMM provisioning')).toThrow('GOVERNANCE BLOCK');
  });

  test('proposes and approves signer rotation', () => {
    const rotation = gov.proposeRotation({
      type: 'add',
      proposedSigner: {
        role: 'treasury',
        xrplAddress: 'rNEWSIGNER1111111111111111111',
        weight: 1,
        addedBy: 'governance-rotation',
      },
      proposedBy: treasury.id,
    });

    expect(rotation.id).toMatch(/^ROT-/);
    expect(rotation.status).toBe('proposed');

    // Approve with 2 signers
    gov.approveRotation(rotation.id, treasury.id, 'Approved');
    gov.approveRotation(rotation.id, compliance.id, 'Concur');

    const updated = gov.proposeRotation; // just checking rotation state via the approvals
    const rot = (gov as any).rotations.get(rotation.id);
    expect(rot.status).toBe('approved');
  });

  test('prevents deactivation below minimum signers', () => {
    expect(() => gov.deactivateSigner(treasury.id, 'admin')).toThrow('minimum');
  });

  test('returns correct thresholds for special actions', () => {
    expect(gov.getThresholdForAction('config_change')).toBe(3); // quorumForConfigChange
    expect(gov.getThresholdForAction('pause_issuance')).toBe(1); // emergency
    expect(gov.getThresholdForAction('resume_issuance')).toBe(2);
    expect(gov.getThresholdForAction('bond_create')).toBe(2); // default
  });
});

// ═══════════════════════════════════════════════════════════════════
// @optkas/compliance — ComplianceEngine
// ═══════════════════════════════════════════════════════════════════

describe('@optkas/compliance — ComplianceEngine', () => {
  let engine: ComplianceEngine;

  beforeEach(() => {
    engine = new ComplianceEngine();
  });

  // ─── KYC/KYB ───────────────────────────────────────────────────

  test('registers and approves entity', () => {
    const entity = engine.registerEntity({
      entityType: 'corporation',
      legalName: 'Secure Capital Partners, LLC',
      jurisdiction: 'Delaware',
      provider: 'KYC-Provider-A',
      providerReferenceId: 'REF-001',
      accreditedInvestor: true,
      xrplAddress: 'rSECURE111111111111111111111111',
    });

    expect(entity.id).toMatch(/^KYC-/);
    expect(entity.status).toBe('pending');

    const approved = engine.approveEntity(entity.id, {
      sanctionsCleared: true,
      pepScreened: true,
      amlCleared: true,
    });

    expect(approved.status).toBe('approved');
    expect(approved.sanctionsCleared).toBe(true);
    expect(approved.amlCleared).toBe(true);
  });

  test('binds address and registers verifiable credentials', () => {
    const entity = engine.registerEntity({
      entityType: 'individual',
      legalName: 'John Doe',
      jurisdiction: 'New York',
      provider: 'KYC-Provider-B',
      providerReferenceId: 'REF-002',
      accreditedInvestor: true,
      didUri: 'did:key:z6Mktest123',
    });

    engine.bindAddress(entity.id, 'rJOHN1111111111111111111111111');
    const found = engine.getEntityByAddress('rJOHN1111111111111111111111111');
    expect(found?.legalName).toBe('John Doe');

    engine.registerVC(entity.id, 'sha256:abcdef1234567890');
    expect(engine.getEntity(entity.id)!.vcHashes).toContain('sha256:abcdef1234567890');
  });

  // ─── Transfer Restrictions ─────────────────────────────────────

  test('allows transfer between compliant entities', () => {
    const sender = engine.registerEntity({
      entityType: 'corporation',
      legalName: 'Sender Corp',
      jurisdiction: 'Delaware',
      provider: 'KYC-A',
      providerReferenceId: 'S-001',
      accreditedInvestor: true,
      xrplAddress: 'rSENDER11111111111111111111111',
    });
    engine.approveEntity(sender.id, { sanctionsCleared: true, pepScreened: true, amlCleared: true });

    const receiver = engine.registerEntity({
      entityType: 'corporation',
      legalName: 'Receiver Corp',
      jurisdiction: 'New York',
      provider: 'KYC-A',
      providerReferenceId: 'R-001',
      accreditedInvestor: true,
      xrplAddress: 'rRECEIVER111111111111111111111',
    });
    engine.approveEntity(receiver.id, { sanctionsCleared: true, pepScreened: true, amlCleared: true });

    const decision = engine.evaluateTransfer({
      fromAddress: 'rSENDER11111111111111111111111',
      toAddress: 'rRECEIVER111111111111111111111',
      asset: 'BOND-A',
      amount: '100000',
      fromEntityId: sender.id,
      toEntityId: receiver.id,
    });

    expect(decision.allowed).toBe(true);
  });

  test('blocks transfer to non-accredited for bond IOUs', () => {
    const sender = engine.registerEntity({
      entityType: 'corporation',
      legalName: 'Accredited Sender',
      jurisdiction: 'Delaware',
      provider: 'KYC-A',
      providerReferenceId: 'AS-001',
      accreditedInvestor: true,
    });
    engine.approveEntity(sender.id, { sanctionsCleared: true, pepScreened: true, amlCleared: true });

    const receiver = engine.registerEntity({
      entityType: 'individual',
      legalName: 'Non-Accredited Buyer',
      jurisdiction: 'California',
      provider: 'KYC-A',
      providerReferenceId: 'NR-001',
      accreditedInvestor: false, // Not accredited
    });
    engine.approveEntity(receiver.id, { sanctionsCleared: true, pepScreened: true, amlCleared: true });

    const decision = engine.evaluateTransfer({
      fromAddress: 'rSENDER222222222222222222222222',
      toAddress: 'rRECEIVER222222222222222222222222',
      asset: 'BOND-SENIOR', // Starts with BOND
      amount: '50000',
      fromEntityId: sender.id,
      toEntityId: receiver.id,
    });

    expect(decision.allowed).toBe(false);
    const accredRestriction = decision.restrictions.find((r) => r.restriction.type === 'accreditation');
    expect(accredRestriction?.passed).toBe(false);
  });

  test('blocks transfer when AML not cleared', () => {
    const sender = engine.registerEntity({
      entityType: 'corporation',
      legalName: 'Uncleared Corp',
      jurisdiction: 'Delaware',
      provider: 'KYC-A',
      providerReferenceId: 'UC-001',
      accreditedInvestor: true,
    });
    // Status approved but NOT amlCleared
    engine.approveEntity(sender.id, { sanctionsCleared: true, pepScreened: true, amlCleared: false });

    const receiver = engine.registerEntity({
      entityType: 'corporation',
      legalName: 'Clean Corp',
      jurisdiction: 'Delaware',
      provider: 'KYC-A',
      providerReferenceId: 'CC-001',
      accreditedInvestor: true,
    });
    engine.approveEntity(receiver.id, { sanctionsCleared: true, pepScreened: true, amlCleared: true });

    expect(() =>
      engine.enforceTransfer({
        fromAddress: 'rUNCLEARED111111111111111111111',
        toAddress: 'rCLEAN111111111111111111111111111',
        asset: 'USD',
        amount: '10000',
        fromEntityId: sender.id,
        toEntityId: receiver.id,
      })
    ).toThrow('TRANSFER BLOCKED');
  });

  // ─── Covenant Monitoring ───────────────────────────────────────

  test('registers covenant and detects compliant value', () => {
    const covenant = engine.registerCovenant({
      bondId: 'BOND-001',
      type: 'dscr',
      description: 'DSCR must stay above 1.25x',
      threshold: 1.25,
      direction: 'above',
      frequency: 'quarterly',
    });

    expect(covenant.id).toMatch(/^COV-/);
    expect(covenant.status).toBe('compliant');

    // Check with compliant value
    const result = engine.checkCovenant(covenant.id, 1.45);
    expect(result.status).toBe('compliant');
    expect(result.delta).toBeGreaterThan(0);
  });

  test('detects covenant breach and records cure', () => {
    const covenant = engine.registerCovenant({
      bondId: 'BOND-002',
      type: 'ltv',
      description: 'LTV must stay below 0.75',
      threshold: 0.75,
      direction: 'below',
      frequency: 'monthly',
    });

    // Breach — value is 0.85 (above threshold for 'below' direction)
    const result = engine.checkCovenant(covenant.id, 0.85);
    expect(result.status).toBe('breach');
    expect(engine.getBreachedCovenants()).toHaveLength(1);

    // Get breach ID
    const cov = engine.getCovenant(covenant.id)!;
    const breachId = cov.breachHistory[0].id;
    expect(breachId).toMatch(/^BRH-/);

    // Record cure
    engine.recordCure(covenant.id, breachId);
    expect(engine.getCovenant(covenant.id)!.status).toBe('compliant');
    expect(engine.getBreachedCovenants()).toHaveLength(0);
  });

  test('detects warning zone (within 5% buffer)', () => {
    const covenant = engine.registerCovenant({
      bondId: 'BOND-003',
      type: 'dscr',
      description: 'DSCR above 1.25',
      threshold: 1.25,
      direction: 'above',
      frequency: 'quarterly',
    });

    // Value is 1.30 — within 5% of 1.25 threshold (5% of 1.25 = 0.0625, 1.30 - 1.25 = 0.05 < 0.0625)
    const result = engine.checkCovenant(covenant.id, 1.30);
    expect(result.status).toBe('warning');
  });

  test('waives a breach', () => {
    const covenant = engine.registerCovenant({
      bondId: 'BOND-004',
      type: 'reserve',
      description: 'Minimum reserve balance',
      threshold: 500000,
      direction: 'above',
      frequency: 'daily',
    });

    engine.checkCovenant(covenant.id, 450000);
    const cov = engine.getCovenant(covenant.id)!;
    const breachId = cov.breachHistory[0].id;

    engine.waiveBreach(covenant.id, breachId, 'TRUSTEE-001');
    expect(engine.getCovenant(covenant.id)!.status).toBe('waived');
  });
});

// ═══════════════════════════════════════════════════════════════════
// @optkas/bond — BondFactory (Structured)
// ═══════════════════════════════════════════════════════════════════

describe('@optkas/bond — BondFactory', () => {
  let factory: BondFactory;

  beforeEach(() => {
    factory = new BondFactory();
  });

  // ─── Program Management ────────────────────────────────────────

  test('creates bond program with shelf limit', () => {
    const program = factory.createProgram({
      name: 'OPTKAS Infrastructure Bond Program',
      issuerEntity: 'OPTKAS1-MAIN SPV',
      assetClass: 'structured',
      jurisdiction: 'Delaware',
      governingLaw: 'Delaware',
      trusteeModel: 'indenture_trustee',
      shelfLimit: '500000000',
    });

    expect(program.id).toMatch(/^PGM-/);
    expect(program.status).toBe('active');
    expect(program.shelfLimit).toBe('500000000');
    expect(program.issuedToDate).toBe('0');
  });

  // ─── Series Management ─────────────────────────────────────────

  test('creates series with waterfall, allocation book, and document set', () => {
    const program = factory.createProgram({
      name: 'Test Program',
      issuerEntity: 'Test Issuer',
      assetClass: 'corporate',
      jurisdiction: 'New York',
      governingLaw: 'New York',
      trusteeModel: 'independent',
      shelfLimit: '100000000',
    });

    const series = factory.createSeries({
      programId: program.id,
      name: 'Series A',
      issuanceDate: '2025-01-01',
      maturityDate: '2028-01-01',
      couponType: 'fixed',
      paymentFrequency: 'quarterly',
      baseCouponRate: 0.065,
      totalPrincipal: '50000000',
      currency: 'USD',
      collateralType: 'real_estate',
      collateralDescription: 'Commercial RE portfolio',
      collateralValue: '65000000',
      coverageRatio: 1.3,
      custodian: 'Delaware Trust Co.',
      reportingCadence: 'quarterly',
    });

    expect(series.id).toMatch(/^SER-/);
    expect(series.status).toBe('draft');
    expect(series.waterfallId).toMatch(/^WF-/);
    expect(series.allocationBookId).toMatch(/^ALB-/);
    expect(series.documentSetId).toMatch(/^DOC-/);

    // Waterfall has 6 accounts
    const waterfall = factory.getWaterfall(series.waterfallId);
    expect(waterfall!.accounts).toHaveLength(6);
    expect(waterfall!.accounts[0].type).toBe('trustee_fee');

    // Allocation book initialized
    const book = factory.getAllocationBook(series.allocationBookId);
    expect(book!.subscribers).toHaveLength(0);
    expect(book!.allocationMethod).toBe('pro_rata');

    // Document set has required categories
    const docSet = factory.getDocumentSet(series.documentSetId);
    expect(docSet!.requiredCategories).toContain('indenture');
    expect(docSet!.requiredCategories).toContain('prospectus');
    expect(docSet!.completeness).toBe(0);

    // Program updated
    const updatedProg = factory.getProgram(program.id)!;
    expect(updatedProg.series).toContain(series.id);
    expect(updatedProg.issuedToDate).toBe('50000000.00');
  });

  test('rejects series exceeding shelf limit', () => {
    const program = factory.createProgram({
      name: 'Small Program',
      issuerEntity: 'Test',
      assetClass: 'corporate',
      jurisdiction: 'Delaware',
      governingLaw: 'Delaware',
      trusteeModel: 'independent',
      shelfLimit: '10000000',
    });

    expect(() =>
      factory.createSeries({
        programId: program.id,
        name: 'Oversized Series',
        issuanceDate: '2025-01-01',
        maturityDate: '2026-01-01',
        couponType: 'fixed',
        paymentFrequency: 'annual',
        baseCouponRate: 0.05,
        totalPrincipal: '20000000', // Exceeds 10M shelf
        currency: 'USD',
        collateralType: 'mixed',
        collateralDescription: 'Mixed',
        collateralValue: '25000000',
        coverageRatio: 1.25,
        custodian: 'Custodian',
        reportingCadence: 'quarterly',
      })
    ).toThrow('shelf limit');
  });

  test('validates series status transitions', () => {
    const program = factory.createProgram({
      name: 'Transition Test',
      issuerEntity: 'Test',
      assetClass: 'corporate',
      jurisdiction: 'Delaware',
      governingLaw: 'Delaware',
      trusteeModel: 'independent',
      shelfLimit: '100000000',
    });

    const series = factory.createSeries({
      programId: program.id,
      name: 'Test Series',
      issuanceDate: '2025-01-01',
      maturityDate: '2028-01-01',
      couponType: 'fixed',
      paymentFrequency: 'quarterly',
      baseCouponRate: 0.05,
      totalPrincipal: '10000000',
      currency: 'USD',
      collateralType: 'mixed',
      collateralDescription: 'Mixed',
      collateralValue: '12500000',
      coverageRatio: 1.25,
      custodian: 'Custodian',
      reportingCadence: 'quarterly',
    });

    factory.transitionSeries(series.id, 'authorized');
    expect(factory.getSeries(series.id)!.status).toBe('authorized');

    // Can't skip to active
    expect(() => factory.transitionSeries(series.id, 'active')).toThrow('Invalid series transition');
  });

  // ─── Tranche Management ────────────────────────────────────────

  test('creates tranches with priority hierarchy', () => {
    const program = factory.createProgram({
      name: 'Tranche Program',
      issuerEntity: 'Test',
      assetClass: 'structured',
      jurisdiction: 'Delaware',
      governingLaw: 'Delaware',
      trusteeModel: 'indenture_trustee',
      shelfLimit: '100000000',
    });

    const series = factory.createSeries({
      programId: program.id,
      name: 'Multi-Tranche Series',
      issuanceDate: '2025-01-01',
      maturityDate: '2028-01-01',
      couponType: 'fixed',
      paymentFrequency: 'quarterly',
      baseCouponRate: 0.065,
      totalPrincipal: '50000000',
      currency: 'USD',
      collateralType: 'real_estate',
      collateralDescription: 'Commercial',
      collateralValue: '65000000',
      coverageRatio: 1.3,
      custodian: 'Custodian',
      reportingCadence: 'quarterly',
    });

    const senior = factory.createTranche({
      seriesId: series.id,
      name: 'Class A (Senior)',
      priority: 'senior',
      waterfallOrder: 1,
      principal: '30000000',
      couponRate: 0.05,
      minimumDenomination: '100000',
      iouCurrency: 'BONDA',
    });

    const mezz = factory.createTranche({
      seriesId: series.id,
      name: 'Class B (Mezzanine)',
      priority: 'mezzanine',
      waterfallOrder: 2,
      principal: '15000000',
      couponRate: 0.08,
      minimumDenomination: '250000',
      iouCurrency: 'BONDB',
    });

    const equity = factory.createTranche({
      seriesId: series.id,
      name: 'Class C (Equity)',
      priority: 'equity',
      waterfallOrder: 3,
      principal: '5000000',
      couponRate: 0.12,
      minimumDenomination: '500000',
      iouCurrency: 'BONDC',
    });

    expect(senior.id).toMatch(/^TRN-/);
    expect(senior.priority).toBe('senior');
    expect(mezz.priority).toBe('mezzanine');
    expect(equity.priority).toBe('equity');

    const tranches = factory.getTranchesBySeries(series.id);
    expect(tranches).toHaveLength(3);
  });

  test('rejects tranche principal exceeding series total', () => {
    const program = factory.createProgram({
      name: 'Overflow Program',
      issuerEntity: 'Test',
      assetClass: 'corporate',
      jurisdiction: 'Delaware',
      governingLaw: 'Delaware',
      trusteeModel: 'independent',
      shelfLimit: '100000000',
    });

    const series = factory.createSeries({
      programId: program.id,
      name: 'Small Series',
      issuanceDate: '2025-01-01',
      maturityDate: '2026-01-01',
      couponType: 'fixed',
      paymentFrequency: 'annual',
      baseCouponRate: 0.05,
      totalPrincipal: '10000000',
      currency: 'USD',
      collateralType: 'mixed',
      collateralDescription: 'Mixed',
      collateralValue: '12500000',
      coverageRatio: 1.25,
      custodian: 'Custodian',
      reportingCadence: 'quarterly',
    });

    factory.createTranche({
      seriesId: series.id,
      name: 'First Tranche',
      priority: 'senior',
      waterfallOrder: 1,
      principal: '8000000',
      couponRate: 0.05,
      minimumDenomination: '100000',
      iouCurrency: 'FT',
    });

    expect(() =>
      factory.createTranche({
        seriesId: series.id,
        name: 'Overflow Tranche',
        priority: 'mezzanine',
        waterfallOrder: 2,
        principal: '5000000', // 8M + 5M > 10M
        couponRate: 0.08,
        minimumDenomination: '100000',
        iouCurrency: 'OT',
      })
    ).toThrow('exceed series total');
  });

  // ─── Waterfall Engine ──────────────────────────────────────────

  test('executes waterfall distribution in priority order', () => {
    const program = factory.createProgram({
      name: 'Waterfall Program',
      issuerEntity: 'Test',
      assetClass: 'structured',
      jurisdiction: 'Delaware',
      governingLaw: 'Delaware',
      trusteeModel: 'indenture_trustee',
      shelfLimit: '100000000',
    });

    const series = factory.createSeries({
      programId: program.id,
      name: 'Waterfall Series',
      issuanceDate: '2025-01-01',
      maturityDate: '2028-01-01',
      couponType: 'fixed',
      paymentFrequency: 'quarterly',
      baseCouponRate: 0.065,
      totalPrincipal: '10000000',
      currency: 'USD',
      collateralType: 'mixed',
      collateralDescription: 'Mixed',
      collateralValue: '13000000',
      coverageRatio: 1.3,
      custodian: 'Custodian',
      reportingCadence: 'quarterly',
    });

    const distribution = factory.executeDistribution(series.waterfallId, '1000000');

    expect(distribution.id).toMatch(/^DIST-/);
    expect(distribution.totalAvailable).toBe('1000000');
    expect(distribution.allocations.length).toBeGreaterThan(0);
    // First account gets funded first
    expect(distribution.allocations[0].accountType).toBe('trustee_fee');
    expect(distribution.hash).toBeTruthy();
  });

  // ─── Allocation Book ───────────────────────────────────────────

  test('subscribes investors and allocates pro-rata', () => {
    const program = factory.createProgram({
      name: 'Allocation Program',
      issuerEntity: 'Test',
      assetClass: 'structured',
      jurisdiction: 'Delaware',
      governingLaw: 'Delaware',
      trusteeModel: 'indenture_trustee',
      shelfLimit: '100000000',
    });

    const series = factory.createSeries({
      programId: program.id,
      name: 'Allocation Series',
      issuanceDate: '2025-01-01',
      maturityDate: '2028-01-01',
      couponType: 'fixed',
      paymentFrequency: 'quarterly',
      baseCouponRate: 0.065,
      totalPrincipal: '10000000',
      currency: 'USD',
      collateralType: 'mixed',
      collateralDescription: 'Mixed',
      collateralValue: '13000000',
      coverageRatio: 1.3,
      custodian: 'Custodian',
      reportingCadence: 'quarterly',
    });

    const tranche = factory.createTranche({
      seriesId: series.id,
      name: 'Senior',
      priority: 'senior',
      waterfallOrder: 1,
      principal: '10000000',
      couponRate: 0.05,
      minimumDenomination: '100000',
      iouCurrency: 'SNRA',
    });

    // Subscribe 2 investors — oversubscribed (12M vs 10M)
    factory.subscribe(series.allocationBookId, {
      entityId: 'KYC-001',
      legalName: 'Investor A',
      xrplAddress: 'rINVA1111111111111111111111111',
      trancheId: tranche.id,
      amount: '7000000',
    });

    factory.subscribe(series.allocationBookId, {
      entityId: 'KYC-002',
      legalName: 'Investor B',
      xrplAddress: 'rINVB1111111111111111111111111',
      trancheId: tranche.id,
      amount: '5000000',
    });

    const book = factory.getAllocationBook(series.allocationBookId)!;
    expect(book.oversubscriptionRatio).toBeCloseTo(1.2);

    // Allocate pro-rata
    const allocated = factory.allocate(series.allocationBookId);
    expect(allocated).toHaveLength(2);
    // 7M/12M * 10M ≈ 5,833,333
    expect(parseFloat(allocated[0].allocatedAmount)).toBeCloseTo(5833333.33, 0);
    // 5M/12M * 10M ≈ 4,166,667
    expect(parseFloat(allocated[1].allocatedAmount)).toBeCloseTo(4166666.67, 0);
  });

  test('rejects subscription below minimum denomination', () => {
    const program = factory.createProgram({
      name: 'Min Test',
      issuerEntity: 'Test',
      assetClass: 'corporate',
      jurisdiction: 'Delaware',
      governingLaw: 'Delaware',
      trusteeModel: 'independent',
      shelfLimit: '100000000',
    });

    const series = factory.createSeries({
      programId: program.id,
      name: 'Min Series',
      issuanceDate: '2025-01-01',
      maturityDate: '2026-01-01',
      couponType: 'fixed',
      paymentFrequency: 'annual',
      baseCouponRate: 0.05,
      totalPrincipal: '10000000',
      currency: 'USD',
      collateralType: 'mixed',
      collateralDescription: 'Mixed',
      collateralValue: '12500000',
      coverageRatio: 1.25,
      custodian: 'Custodian',
      reportingCadence: 'quarterly',
    });

    const tranche = factory.createTranche({
      seriesId: series.id,
      name: 'Senior',
      priority: 'senior',
      waterfallOrder: 1,
      principal: '10000000',
      couponRate: 0.05,
      minimumDenomination: '250000',
      iouCurrency: 'SNRB',
    });

    expect(() =>
      factory.subscribe(series.allocationBookId, {
        entityId: 'KYC-003',
        legalName: 'Small Investor',
        xrplAddress: 'rSMALL111111111111111111111111',
        trancheId: tranche.id,
        amount: '100000', // Below 250K minimum
      })
    ).toThrow('minimum denomination');
  });

  // ─── Document Set Manager ──────────────────────────────────────

  test('uploads documents and tracks completeness', () => {
    const program = factory.createProgram({
      name: 'Doc Program',
      issuerEntity: 'Test',
      assetClass: 'corporate',
      jurisdiction: 'Delaware',
      governingLaw: 'Delaware',
      trusteeModel: 'independent',
      shelfLimit: '100000000',
    });

    const series = factory.createSeries({
      programId: program.id,
      name: 'Doc Series',
      issuanceDate: '2025-01-01',
      maturityDate: '2026-01-01',
      couponType: 'fixed',
      paymentFrequency: 'annual',
      baseCouponRate: 0.05,
      totalPrincipal: '10000000',
      currency: 'USD',
      collateralType: 'mixed',
      collateralDescription: 'Mixed',
      collateralValue: '12500000',
      coverageRatio: 1.25,
      custodian: 'Custodian',
      reportingCadence: 'quarterly',
    });

    const doc = factory.uploadDocument(series.documentSetId, {
      category: 'indenture',
      name: 'Trust Indenture v1.0',
      contentHash: 'sha256:abc123',
      ipfsCid: 'QmABC123',
      uploadedBy: 'legal@optkas.com',
    });

    expect(doc.id).toMatch(/^DOC-/);
    expect(doc.version).toBe(1);

    // Attest the document
    factory.attestDocument(series.documentSetId, doc.id, 'TX_HASH_001');

    // Record signatures
    factory.recordSignatures(series.documentSetId, doc.id, ['SIGNER-001', 'SIGNER-002']);

    const docSet = factory.getDocumentSet(series.documentSetId)!;
    expect(docSet.completeness).toBeGreaterThan(0);

    // Check completeness
    const { complete, missing } = factory.isDocumentSetComplete(series.documentSetId);
    expect(complete).toBe(false);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing).not.toContain('indenture');
  });

  // ─── Cashflow Scheduler ────────────────────────────────────────

  test('generates cashflow schedule for series with tranches', () => {
    const program = factory.createProgram({
      name: 'Cashflow Program',
      issuerEntity: 'Test',
      assetClass: 'structured',
      jurisdiction: 'Delaware',
      governingLaw: 'Delaware',
      trusteeModel: 'indenture_trustee',
      shelfLimit: '100000000',
    });

    const series = factory.createSeries({
      programId: program.id,
      name: 'Cashflow Series',
      issuanceDate: '2025-01-01',
      maturityDate: '2028-01-01',
      couponType: 'fixed',
      paymentFrequency: 'quarterly',
      baseCouponRate: 0.065,
      totalPrincipal: '50000000',
      currency: 'USD',
      collateralType: 'real_estate',
      collateralDescription: 'Commercial',
      collateralValue: '65000000',
      coverageRatio: 1.3,
      custodian: 'Custodian',
      reportingCadence: 'quarterly',
    });

    factory.createTranche({
      seriesId: series.id,
      name: 'Senior',
      priority: 'senior',
      waterfallOrder: 1,
      principal: '30000000',
      couponRate: 0.05,
      minimumDenomination: '100000',
      iouCurrency: 'SNRC',
    });

    factory.createTranche({
      seriesId: series.id,
      name: 'Mezzanine',
      priority: 'mezzanine',
      waterfallOrder: 2,
      principal: '20000000',
      couponRate: 0.08,
      minimumDenomination: '250000',
      iouCurrency: 'MZZC',
    });

    const schedule = factory.generateCashflowSchedule(series.id);

    // 3 years quarterly = ~11-12 coupon periods × 2 tranches + 2 principal payments at maturity
    expect(schedule.length).toBeGreaterThan(20);

    const coupons = schedule.filter((cf) => cf.type === 'coupon');
    const principals = schedule.filter((cf) => cf.type === 'principal');
    expect(coupons.length).toBeGreaterThan(0);
    expect(principals).toHaveLength(2); // One per tranche

    // Senior tranche quarterly coupon = 30M * 0.05 / 4 = 375,000
    const seniorCoupon = coupons.find((cf) => cf.amount === '375000.00');
    expect(seniorCoupon).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// @optkas/reporting — ReportingEngine
// ═══════════════════════════════════════════════════════════════════

describe('@optkas/reporting — ReportingEngine', () => {
  let engine: ReportingEngine;

  beforeEach(() => {
    engine = new ReportingEngine();
  });

  test('generates investor statement with aggregations', () => {
    const report = engine.generateInvestorStatement({
      investorId: 'INV-001',
      investorName: 'Secure Capital Partners',
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      positions: [
        {
          bondId: 'BOND-001',
          bondName: 'OPTKAS Series A Senior',
          tranchePriority: 'senior',
          principalAmount: '500000',
          iouBalance: '510000',
          couponRate: 0.05,
          maturityDate: '2028-01-01',
          status: 'active',
        },
      ],
      couponPayments: [
        {
          bondId: 'BOND-001',
          couponId: 'CPN-001',
          paymentDate: '2025-03-01',
          amount: '6250',
          currency: 'USD',
          status: 'paid',
        },
      ],
    });

    expect(report.reportId).toMatch(/^RPT-/);
    expect(report.type).toBe('investor_statement');
    expect(report.data.totalInvested).toBe('500000.00');
    expect(report.data.totalCouponsReceived).toBe('6250.00');
    expect(report.data.currentNAV).toBe('510000.00');
    expect(report.data.unrealizedGainLoss).toBe('10000.00');
    expect(report.hash).toBeTruthy();
  });

  test('generates trustee report with alerts', () => {
    const report = engine.generateTrusteeReport({
      seriesId: 'SER-001',
      seriesName: 'OPTKAS Series A',
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      collateral: {
        type: 'real_estate',
        currentValue: '60000000',
        coverageRatio: 0.92, // Under 1.0 — should trigger alert
        lastAppraisal: '2025-02-15',
        custodian: 'Delaware Trust Co.',
      },
      covenants: [
        {
          covenantId: 'COV-001',
          type: 'dscr',
          description: 'DSCR above 1.25',
          threshold: 1.25,
          currentValue: 1.10, // Breach
          status: 'breach',
          lastChecked: '2025-03-01',
        },
      ],
      waterfallBalances: [{ name: 'Senior Debt Service', balance: '1000000' }],
      waterfallShortfalls: [{ account: 'Reserve', shortfall: '50000' }],
      totalDistributed: '2000000',
      outstandingPrincipal: '48000000',
      nextPaymentDate: '2025-06-01',
      nextPaymentAmount: '780000',
      documentCompleteness: 0.75, // Incomplete
    });

    expect(report.type).toBe('trustee_report');
    expect(report.data.alerts.length).toBeGreaterThanOrEqual(3); // covenant breach + shortfall + incomplete docs + undercovered collateral
    expect(report.data.alerts.some((a: string) => a.includes('COVENANT BREACH'))).toBe(true);
    expect(report.data.alerts.some((a: string) => a.includes('WATERFALL SHORTFALL'))).toBe(true);
    expect(report.data.alerts.some((a: string) => a.includes('COLLATERAL UNDERCOVERED'))).toBe(true);
  });

  test('generates payment reconciliation and detects variance', () => {
    const report = engine.generateReconciliation({
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      expectedPayments: [
        { id: 'EXP-1', date: '2025-03-01', amount: '100000', currency: 'USD', counterparty: 'Inv A', reference: 'REF-1', source: 'ledger' },
        { id: 'EXP-2', date: '2025-03-15', amount: '50000', currency: 'USD', counterparty: 'Inv B', reference: 'REF-2', source: 'ledger' },
      ],
      actualPayments: [
        { id: 'ACT-1', date: '2025-03-01', amount: '100000', currency: 'USD', counterparty: 'Inv A', reference: 'BANK-1', source: 'bank' },
        // Missing second payment
      ],
    });

    expect(report.data.status).toBe('variance_detected');
    expect(report.data.matched).toHaveLength(1);
    expect(report.data.unmatched.length).toBeGreaterThan(0);
    expect(report.data.variance).toBe('-50000.00');
  });

  test('generates NAV snapshot with change tracking', () => {
    // First snapshot
    const snap1 = engine.generateNAVSnapshot({
      portfolioId: 'PORT-001',
      positions: [
        {
          assetId: 'BOND-001',
          assetName: 'OPTKAS Series A',
          quantity: '500000',
          unitPrice: '1.00',
          marketValue: '500000',
          costBasis: '500000',
          unrealizedGainLoss: '0',
          weight: 1.0,
        },
      ],
      totalLiabilities: '0',
      valuationMethod: 'mark_to_model',
    });

    expect(snap1.data.netAssetValue).toBe('500000.00');
    expect(snap1.data.changeFromPrevious).toBe('500000.00'); // First snap, prev was 0

    // Second snapshot with appreciation
    const snap2 = engine.generateNAVSnapshot({
      portfolioId: 'PORT-001',
      positions: [
        {
          assetId: 'BOND-001',
          assetName: 'OPTKAS Series A',
          quantity: '500000',
          unitPrice: '1.02',
          marketValue: '510000',
          costBasis: '500000',
          unrealizedGainLoss: '10000',
          weight: 1.0,
        },
      ],
      totalLiabilities: '0',
      valuationMethod: 'mark_to_model',
    });

    expect(snap2.data.netAssetValue).toBe('510000.00');
    expect(snap2.data.changeFromPrevious).toBe('10000.00');
    expect(snap2.data.changePercent).toBeCloseTo(2.0, 1);
  });

  test('generates lifecycle status report', () => {
    const report = engine.generateLifecycleReport({
      items: [
        { bondId: 'B-1', name: 'Draft Bond', status: 'draft', principal: '10000000', couponRate: 0.05, maturityDate: '2028-01-01', outstandingBalance: '0' },
        { bondId: 'B-2', name: 'Active Bond', status: 'active', principal: '20000000', couponRate: 0.065, maturityDate: '2027-06-01', outstandingBalance: '19000000' },
        { bondId: 'B-3', name: 'Matured Bond', status: 'matured', principal: '5000000', couponRate: 0.04, maturityDate: '2024-12-31', outstandingBalance: '0' },
        { bondId: 'B-4', name: 'Defaulted Bond', status: 'defaulted', principal: '3000000', couponRate: 0.08, maturityDate: '2026-01-01', outstandingBalance: '2800000' },
      ],
    });

    expect(report.data.pipeline.count).toBe(1);
    expect(report.data.active.count).toBe(1);
    expect(report.data.matured.count).toBe(1);
    expect(report.data.defaulted.count).toBe(1);
    expect(report.data.totalOutstanding).toBe('19000000.00');
  });

  test('parses CSV payments', () => {
    const csv = `date,amount,currency,counterparty,reference
2025-03-01,100000,USD,Investor A,REF-001
2025-03-15,50000,USD,Investor B,REF-002`;

    const entries = engine.parseCSVPayments(csv);
    expect(entries).toHaveLength(2);
    expect(entries[0].amount).toBe('100000');
    expect(entries[1].counterparty).toBe('Investor B');
    expect(entries[0].source).toBe('csv_import');
  });
});

// ═══════════════════════════════════════════════════════════════════
// @optkas/bridge — BridgeManager
// ═══════════════════════════════════════════════════════════════════

describe('@optkas/bridge — BridgeManager', () => {
  let bridge: BridgeManager;
  let bridgeConfig: any;

  beforeEach(() => {
    bridge = new BridgeManager();
    bridgeConfig = bridge.configureBridge({
      name: 'OPTKAS Mainnet ↔ Sidechain',
      lockingChainUrl: 'wss://xrplcluster.com',
      lockingChainType: 'mainnet',
      lockingDoorAddress: 'rLOCKDOOR111111111111111111111',
      issuingChainUrl: 'wss://sidechain.optkas.com',
      issuingChainType: 'sidechain',
      issuingDoorAddress: 'rISSUEDOOR11111111111111111111',
      currency: 'XRP',
      signatureReward: '100000',
      minAccountCreateAmount: '10000000',
      signerQuorum: 3,
      signerEntries: [
        { address: 'rS1', weight: 1 },
        { address: 'rS2', weight: 1 },
        { address: 'rS3', weight: 1 },
      ],
    });
  });

  test('configures bridge with door accounts', () => {
    expect(bridgeConfig.id).toMatch(/^BRG-/);
    expect(bridgeConfig.status).toBe('configured');
    expect(bridgeConfig.lockingChain.doorAccountAddress).toBe('rLOCKDOOR111111111111111111111');
    expect(bridgeConfig.lockingChain.doorAccountSettings.requireMultisig).toBe(true);
  });

  test('registers witnesses and generates server config', () => {
    const w1 = bridge.registerWitness(bridgeConfig.id, 'locking', {
      publicKey: 'ED00001111111111111111111111111111111111111111111111111111111111',
      endpoint: 'https://witness1.optkas.com',
      weight: 1,
    });

    const w2 = bridge.registerWitness(bridgeConfig.id, 'issuing', {
      publicKey: 'ED00002222222222222222222222222222222222222222222222222222222222',
      endpoint: 'https://witness2.optkas.com',
      weight: 1,
    });

    expect(w1.id).toMatch(/^WIT-/);
    expect(w1.active).toBe(true);

    // Generate witness server config
    const config = bridge.generateWitnessServerConfig(bridgeConfig.id, w1.id, {
      keyPath: '/opt/witness/keys/witness1.pem',
      logPath: '/var/log/witness1',
      metricsPort: 9090,
      healthCheckPort: 8080,
    });

    expect(config.lockingChainUrl).toBe('wss://xrplcluster.com');
    expect(config.issuingChainUrl).toBe('wss://sidechain.optkas.com');
    expect(config.attestationQuorum).toBeGreaterThan(0);
  });

  test('activates bridge with minimum witnesses', () => {
    // Should fail — no witnesses
    expect(() => bridge.activateBridge(bridgeConfig.id)).toThrow('Insufficient witnesses');

    // Add witnesses
    bridge.registerWitness(bridgeConfig.id, 'locking', {
      publicKey: 'ED_LOCK',
      endpoint: 'https://w1.lock.optkas.com',
      weight: 1,
    });

    bridge.registerWitness(bridgeConfig.id, 'issuing', {
      publicKey: 'ED_ISSUE',
      endpoint: 'https://w1.issue.optkas.com',
      weight: 1,
    });

    bridge.activateBridge(bridgeConfig.id);
    expect(bridge.getBridge(bridgeConfig.id)!.status).toBe('active');
  });

  test('records commit → attestation → claim lifecycle', () => {
    // Setup witnesses
    const lockWit = bridge.registerWitness(bridgeConfig.id, 'locking', {
      publicKey: 'ED_LK1',
      endpoint: 'https://w1.lock',
      weight: 1,
    });

    bridge.registerWitness(bridgeConfig.id, 'issuing', {
      publicKey: 'ED_IS1',
      endpoint: 'https://w1.issue',
      weight: 1,
    });

    // Commit
    const claim = bridge.recordCommit(bridgeConfig.id, {
      direction: 'locking_to_issuing',
      sourceAddress: 'rSOURCE111111111111111111111111',
      destinationAddress: 'rDEST111111111111111111111111111',
      amount: '1000000',
      commitTxHash: 'COMMIT_TX_HASH_001',
    });

    expect(claim.id).toMatch(/^CLM-/);
    expect(claim.status).toBe('committed');
    expect(claim.claimId).toBe(1);

    // Attest — with only 1 witness of weight 1, quorum should be 1
    bridge.recordAttestation(claim.id, {
      witnessId: lockWit.id,
      signature: 'SIG_001',
      attestedAt: new Date().toISOString(),
      claimId: claim.claimId,
    });

    const attested = bridge.getClaim(claim.id)!;
    expect(attested.status).toBe('attested');

    // Complete claim
    const completed = bridge.completeClaim(claim.id, 'CLAIM_TX_HASH_001');
    expect(completed.status).toBe('claimed');
    expect(completed.claimTxHash).toBe('CLAIM_TX_HASH_001');
    expect(completed.completedAt).toBeTruthy();
  });

  test('pauses bridge', () => {
    bridge.registerWitness(bridgeConfig.id, 'locking', { publicKey: 'K1', endpoint: 'e1', weight: 1 });
    bridge.registerWitness(bridgeConfig.id, 'issuing', { publicKey: 'K2', endpoint: 'e2', weight: 1 });
    bridge.activateBridge(bridgeConfig.id);

    bridge.pauseBridge(bridgeConfig.id, 'Security incident');
    expect(bridge.getBridge(bridgeConfig.id)!.status).toBe('paused');
  });

  test('deactivates witness', () => {
    const w1 = bridge.registerWitness(bridgeConfig.id, 'locking', {
      publicKey: 'ED_DEACT',
      endpoint: 'https://w-deact.optkas.com',
      weight: 1,
    });

    bridge.deactivateWitness(bridgeConfig.id, 'locking', w1.id);
    const b = bridge.getBridge(bridgeConfig.id)!;
    const wit = b.lockingChain.witnesses.find((w: any) => w.id === w1.id);
    expect(wit!.active).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// @optkas/agents — AgentEngine
// ═══════════════════════════════════════════════════════════════════

describe('@optkas/agents — AgentEngine', () => {
  let engine: AgentEngine;

  beforeEach(() => {
    engine = new AgentEngine();
  });

  test('defines strategy in dry_run mode', () => {
    const strategy = engine.defineStrategy({
      name: 'OPTKAS Market Maker',
      type: 'market_making',
      description: 'Provide liquidity on BOND/USD pair',
      parameters: { spreadBps: 50, orderSize: '1000', layers: 3, layerSpacingBps: 25 },
      riskLimits: { maxPositionUsd: 100000, maxSingleOrderUsd: 10000, maxDailyVolumeUsd: 500000, maxOpenOrders: 20 },
      targetPairs: [{ base: { currency: 'BOND' }, quote: { currency: 'USD' } }],
      schedule: { type: 'continuous' },
      createdBy: 'system',
    });

    expect(strategy.id).toMatch(/^STR-/);
    expect(strategy.mode).toBe('dry_run');
    expect(strategy.status).toBe('draft');
    expect(strategy.type).toBe('market_making');
  });

  test('requires approval before live mode', () => {
    const strategy = engine.defineStrategy({
      name: 'Test Strategy',
      type: 'twap',
      description: 'Test',
      parameters: { totalAmount: '100000', sliceCount: 10 },
      riskLimits: {},
      targetPairs: [{ base: { currency: 'XRP' }, quote: { currency: 'USD' } }],
      schedule: { type: 'one_shot' },
      createdBy: 'system',
    });

    // Cannot switch to live without approval
    expect(() => engine.setMode(strategy.id, 'live')).toThrow('approved before switching to live');

    // Approve first
    engine.approveStrategy(strategy.id, 'TREASURY-001');
    expect(engine.getStrategy(strategy.id)!.status).toBe('approved');

    // Now can go live
    expect(() => engine.setMode(strategy.id, 'live')).not.toThrow();
    expect(engine.getStrategy(strategy.id)!.mode).toBe('live');
  });

  test('runs backtest simulation', () => {
    const strategy = engine.defineStrategy({
      name: 'Spread Capture',
      type: 'spread_capture',
      description: 'Capture bid-ask spreads',
      parameters: { orderSize: '500' },
      riskLimits: { maxPositionUsd: 50000 },
      targetPairs: [{ base: { currency: 'BOND' }, quote: { currency: 'USD' } }],
      schedule: { type: 'continuous' },
      createdBy: 'system',
    });

    // Generate synthetic price data
    const priceData = [];
    const basePrice = 1.0;
    for (let i = 0; i < 30; i++) {
      const mid = basePrice + (Math.random() - 0.5) * 0.1;
      const spread = 0.005;
      priceData.push({
        timestamp: new Date(2025, 0, i + 1).toISOString(),
        pair: 'BOND/USD',
        bid: (mid - spread).toFixed(8),
        ask: (mid + spread).toFixed(8),
        mid: mid.toFixed(8),
        volume: '100000',
      });
    }

    const result = engine.runSimulation({
      strategyId: strategy.id,
      startDate: '2025-01-01',
      endDate: '2025-01-30',
      initialCapital: '100000',
      priceData,
      slippageModel: 'fixed',
      slippageBps: 5,
      feesBps: 3,
    });

    expect(result.id).toMatch(/^SIM-/);
    expect(result.tradesExecuted).toBeGreaterThan(0);
    expect(typeof result.sharpeRatio).toBe('number');
    expect(typeof result.winRate).toBe('number');
    expect(result.pnlCurve.length).toBeGreaterThan(0);
    expect(result.hash).toBeTruthy();
  });

  test('generates LP provisioning plan', () => {
    const plan = engine.generateLPPlan({
      poolId: 'AMM-BOND-USD',
      strategy: 'concentrated',
      asset1: { currency: 'BOND', issuer: 'rISSUER', amount: '100000' },
      asset2: { currency: 'USD', amount: '100000' },
      priceRange: { min: '0.90', max: '1.10' },
      expectedFeeApy: 12.5,
      ilEstimate: 2.3,
    });

    expect(plan.id).toMatch(/^LP-/);
    expect(plan.strategy).toBe('concentrated');
    expect(plan.priceRange!.min).toBe('0.90');
    expect(plan.expectedFeeApy).toBe(12.5);
    expect(plan.status).toBe('planned');
  });

  test('creates execution plan with time-weighted slices', () => {
    const strategy = engine.defineStrategy({
      name: 'TWAP Execution',
      type: 'twap',
      description: 'Time-weighted execution',
      parameters: { totalAmount: '500000', durationMinutes: 60, sliceCount: 10 },
      riskLimits: {},
      targetPairs: [{ base: { currency: 'BOND' }, quote: { currency: 'USD' } }],
      schedule: { type: 'one_shot' },
      createdBy: 'system',
    });

    const plan = engine.createExecutionPlan({
      strategyId: strategy.id,
      totalAmount: '500000',
      pair: { base: { currency: 'BOND' }, quote: { currency: 'USD' } },
      side: 'buy',
      durationMinutes: 60,
      sliceCount: 10,
      priceLimit: '1.05',
    });

    expect(plan.id).toMatch(/^EXEC-/);
    expect(plan.slices).toHaveLength(10);
    expect(plan.slices[0].amount).toBe('50000.00000000');
    expect(plan.slices[0].status).toBe('pending');
    expect(plan.status).toBe('planned');

    // Execute first slice
    engine.executeSlice(plan.id, 1, '1.02', '50000');
    const updatedSlice = engine.getExecutionPlan(plan.id)!.slices[0];
    expect(updatedSlice.status).toBe('executed');
    expect(updatedSlice.executedPrice).toBe('1.02');
  });
});
