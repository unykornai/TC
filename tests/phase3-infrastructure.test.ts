/**
 * Phase 3 Infrastructure Tests — Bond, RWA, Portfolio, Settlement Engines
 *
 * These tests validate the core business logic of new packages
 * WITHOUT requiring an XRPL connection (all operations are dry-run / mocked).
 */

import { BondEngine } from '@optkas/bond';
import { RWATokenFactory } from '@optkas/rwa';
import { PortfolioManager } from '@optkas/portfolio';
import { SettlementEngine } from '@optkas/settlement';

// ─── Mock XRPLClient ──────────────────────────────────────────────────

const mockClient = {
  prepareTransaction: jest.fn().mockResolvedValue({
    unsigned: {},
    network: 'testnet',
    dryRun: true,
    metadata: {
      description: 'mock tx',
      requiredSigners: 2,
      estimatedFee: '12',
      timestamp: new Date().toISOString(),
    },
  }),
  getAccountInfo: jest.fn().mockResolvedValue({
    result: { account_data: { Balance: '100000000' } },
  }),
  request: jest.fn().mockResolvedValue({ result: {} }),
} as any;

// ─── Bond Engine Tests ───────────────────────────────────────────────

describe('@optkas/bond — BondEngine', () => {
  let engine: BondEngine;

  beforeEach(() => {
    engine = new BondEngine(mockClient);
  });

  test('creates bond with full metadata and coupon schedule', () => {
    const bond = engine.createBond({
      name: 'OPTKAS Series A',
      description: 'Senior Secured Note',
      faceValue: '100000000',
      currency: 'USD',
      couponRate: 0.065,
      couponFrequency: 'quarterly',
      issueDate: '2025-01-01',
      maturityDate: '2028-01-01',
      minimumDenomination: '100000',
      collateralType: 'real_estate',
      collateralDescription: 'Commercial RE portfolio',
      collateralValue: '130000000',
      coverageRatio: 1.30,
      custodian: 'Delaware Trust Co.',
      indentureHash: 'abc123def456',
      jurisdiction: 'Delaware',
      trustee: 'Delaware Trust Co.',
      issuerAddress: 'rISSUER111111111111111111111111',
      iouCurrency: 'BOND',
      escrowAccount: 'rESCROW111111111111111111111111',
      distributionAccount: 'rDIST11111111111111111111111111',
      couponAccount: 'rCOUPON1111111111111111111111111',
      settlementAccount: 'rSETTLE111111111111111111111111',
      createdBy: 'system',
    });

    expect(bond.id).toMatch(/^BOND-/);
    expect(bond.status).toBe('draft');
    expect(bond.terms.faceValue).toBe('100000000');
    expect(bond.terms.couponRate).toBe(0.065);
    expect(bond.couponSchedule.length).toBe(11); // ~3 years quarterly
    expect(bond.couponSchedule[0].status).toBe('scheduled');
  });

  test('generates zero coupons for zero_coupon bonds', () => {
    const bond = engine.createBond({
      name: 'Zero Coupon',
      description: 'Discount bond',
      faceValue: '50000000',
      currency: 'USD',
      couponRate: 0,
      couponFrequency: 'zero_coupon',
      issueDate: '2025-01-01',
      maturityDate: '2030-01-01',
      minimumDenomination: '100000',
      collateralType: 'receivables',
      collateralDescription: 'AR pool',
      collateralValue: '60000000',
      coverageRatio: 1.20,
      custodian: 'US Bank',
      indentureHash: 'zzz000',
      jurisdiction: 'New York',
      trustee: 'US Bank',
      issuerAddress: 'rISSUER222222222222222222222222',
      iouCurrency: 'ZCBOND',
      escrowAccount: 'rESCROW222222222222222222222222',
      distributionAccount: 'rDIST22222222222222222222222222',
      couponAccount: 'rCOUPON222222222222222222222222',
      settlementAccount: 'rSETTLE222222222222222222222222',
      createdBy: 'system',
    });

    expect(bond.couponSchedule.length).toBe(0);
  });

  test('onboards participant with KYC gate', () => {
    const bond = engine.createBond({
      name: 'Test Bond',
      description: 'Test',
      faceValue: '1000000',
      currency: 'USD',
      couponRate: 0.05,
      couponFrequency: 'semi_annual',
      issueDate: '2025-01-01',
      maturityDate: '2027-01-01',
      minimumDenomination: '100000',
      collateralType: 'mixed',
      collateralDescription: 'Mixed',
      collateralValue: '1250000',
      coverageRatio: 1.25,
      custodian: 'Custodian',
      indentureHash: 'hash123',
      jurisdiction: 'Delaware',
      trustee: 'Trustee',
      issuerAddress: 'rISSUER333333333333333333333333',
      iouCurrency: 'TBOND',
      escrowAccount: 'rESCROW333333333333333333333333',
      distributionAccount: 'rDIST33333333333333333333333333',
      couponAccount: 'rCOUPON333333333333333333333333',
      settlementAccount: 'rSETTLE333333333333333333333333',
      createdBy: 'system',
    });

    const participant = engine.onboardParticipant(bond.id, {
      name: 'Secure Capital Partners',
      xrplAddress: 'rBUYER111111111111111111111111',
      participationAmount: '500000',
      accreditedInvestor: true,
    });

    expect(participant.kycStatus).toBe('pending');
    expect(participant.trustlineDeployed).toBe(false);

    engine.approveKyc(bond.id, participant.id, 'KYC-Provider-A');
    const updatedBond = engine.getBond(bond.id)!;
    const p = updatedBond.participants[0];
    expect(p.kycStatus).toBe('approved');
  });

  test('rejects under-minimum denomination', () => {
    const bond = engine.createBond({
      name: 'Min Test',
      description: 'Test',
      faceValue: '1000000',
      currency: 'USD',
      couponRate: 0.05,
      couponFrequency: 'annual',
      issueDate: '2025-01-01',
      maturityDate: '2026-01-01',
      minimumDenomination: '100000',
      collateralType: 'mixed',
      collateralDescription: 'Mixed',
      collateralValue: '1250000',
      coverageRatio: 1.25,
      custodian: 'Custodian',
      indentureHash: 'hash',
      jurisdiction: 'Delaware',
      trustee: 'Trustee',
      issuerAddress: 'rISSUER444444444444444444444444',
      iouCurrency: 'MBOND',
      escrowAccount: 'rESCROW444444444444444444444444',
      distributionAccount: 'rDIST44444444444444444444444444',
      couponAccount: 'rCOUPON444444444444444444444444',
      settlementAccount: 'rSETTLE444444444444444444444444',
      createdBy: 'system',
    });

    expect(() =>
      engine.onboardParticipant(bond.id, {
        name: 'Small Investor',
        xrplAddress: 'rSMALL111111111111111111111111',
        participationAmount: '50000',
        accreditedInvestor: false,
      })
    ).toThrow('Minimum denomination');
  });

  test('validates status transitions', () => {
    const bond = engine.createBond({
      name: 'Transition Test',
      description: 'Test',
      faceValue: '1000000',
      currency: 'USD',
      couponRate: 0.05,
      couponFrequency: 'annual',
      issueDate: '2025-01-01',
      maturityDate: '2026-01-01',
      minimumDenomination: '100000',
      collateralType: 'mixed',
      collateralDescription: 'Mixed',
      collateralValue: '1250000',
      coverageRatio: 1.25,
      custodian: 'Custodian',
      indentureHash: 'hash',
      jurisdiction: 'Delaware',
      trustee: 'Trustee',
      issuerAddress: 'rISSUER555555555555555555555555',
      iouCurrency: 'XBOND',
      escrowAccount: 'rESCROW555555555555555555555555',
      distributionAccount: 'rDIST55555555555555555555555555',
      couponAccount: 'rCOUPON555555555555555555555555',
      settlementAccount: 'rSETTLE555555555555555555555555',
      createdBy: 'system',
    });

    // draft → approved OK
    engine.transitionStatus(bond.id, 'approved', 'Board approved');
    expect(engine.getBond(bond.id)!.status).toBe('approved');

    // approved → matured INVALID
    expect(() =>
      engine.transitionStatus(bond.id, 'matured', 'skip')
    ).toThrow('Invalid transition');
  });
});

// ─── RWA Token Factory Tests ─────────────────────────────────────────

describe('@optkas/rwa — RWATokenFactory', () => {
  let factory: RWATokenFactory;

  beforeEach(() => {
    factory = new RWATokenFactory(mockClient);
  });

  test('registers asset with initial valuation', () => {
    const asset = factory.registerAsset({
      name: 'Manhattan Tower A',
      description: 'Class A office',
      assetClass: 'real_estate',
      currency: 'MHTN',
      issuerAddress: 'rISSUER666666666666666666666666',
      totalSupply: '10000',
      transferRestriction: 'accredited_only',
      custodian: 'BNY Mellon',
      legalEntity: 'OPTKAS1-MAIN SPV',
      contractHash: 'contracthash123',
      jurisdiction: 'New York',
      initialValuation: '50000000',
      valuationCurrency: 'USD',
      createdBy: 'system',
    });

    expect(asset.id).toMatch(/^RWA-REAL_ESTATE-/);
    expect(asset.lifecycle).toBe('draft');
    expect(asset.valuations.length).toBe(1);
    expect(asset.currentValuation).toBe('50000000');
  });

  test('enforces compliance gates before minting', async () => {
    const asset = factory.registerAsset({
      name: 'Receivable Pool',
      description: 'AR',
      assetClass: 'receivables',
      currency: 'RECV',
      issuerAddress: 'rISSUER777777777777777777777777',
      totalSupply: '1000000',
      transferRestriction: 'accredited_only',
      custodian: 'Custodian',
      legalEntity: 'SPV',
      contractHash: 'hash',
      jurisdiction: 'Delaware',
      initialValuation: '1000000',
      valuationCurrency: 'USD',
      createdBy: 'system',
    });

    factory.transitionLifecycle(asset.id, 'approved', 'approved');
    factory.transitionLifecycle(asset.id, 'issuing', 'ready');

    const holder = factory.registerHolder(asset.id, {
      address: 'rHOLDER111111111111111111111111',
    });

    // Add required KYC gate
    factory.addComplianceGate(asset.id, holder.id, {
      name: 'KYC',
      type: 'kyc',
      required: true,
      status: 'pending',
      metadata: {},
    });

    // Should fail — gate not passed
    await expect(
      factory.mintTokens(asset.id, holder.id, '1000')
    ).rejects.toThrow('compliance gates');

    // Approve gate
    const gate = factory.getAsset(asset.id)!.holders[0].complianceGates[0];
    factory.approveComplianceGate(asset.id, holder.id, gate.id);

    // Now should succeed
    const result = await factory.mintTokens(asset.id, holder.id, '1000');
    expect(result.trustlineTx).toBeDefined();
    expect(result.mintTx).toBeDefined();
  });

  test('tracks circulating supply and enforces cap', async () => {
    const asset = factory.registerAsset({
      name: 'Capped Token',
      description: 'Test',
      assetClass: 'commodities',
      currency: 'GOLD',
      issuerAddress: 'rISSUER888888888888888888888888',
      totalSupply: '100',
      transferRestriction: 'unrestricted',
      custodian: 'C',
      legalEntity: 'E',
      contractHash: 'h',
      jurisdiction: 'J',
      initialValuation: '10000',
      valuationCurrency: 'USD',
      createdBy: 'system',
    });

    factory.transitionLifecycle(asset.id, 'approved', 'ok');
    factory.transitionLifecycle(asset.id, 'issuing', 'ok');

    const holder = factory.registerHolder(asset.id, { address: 'rH0LD3R' });

    // Mint 100 — should succeed
    const result = await factory.mintTokens(asset.id, holder.id, '100');
    expect(result).toBeDefined();

    // Mint 1 more — should fail (cap)
    const holder2 = factory.registerHolder(asset.id, { address: 'rH0LD3R2' });
    await expect(
      factory.mintTokens(asset.id, holder2.id, '1')
    ).rejects.toThrow('Exceeds supply cap');
  });

  test('validates lifecycle transitions', () => {
    const asset = factory.registerAsset({
      name: 'LC Test',
      description: 'Test',
      assetClass: 'private_equity',
      currency: 'PEQU',
      issuerAddress: 'rISSUER999999999999999999999999',
      totalSupply: '1000',
      transferRestriction: 'unrestricted',
      custodian: 'C',
      legalEntity: 'E',
      contractHash: 'h',
      jurisdiction: 'J',
      initialValuation: '1000000',
      valuationCurrency: 'USD',
      createdBy: 'system',
    });

    factory.transitionLifecycle(asset.id, 'approved', 'ok');
    expect(factory.getAsset(asset.id)!.lifecycle).toBe('approved');

    expect(() =>
      factory.transitionLifecycle(asset.id, 'matured', 'skip')
    ).toThrow('Invalid');
  });
});

// ─── Portfolio Manager Tests ─────────────────────────────────────────

describe('@optkas/portfolio — PortfolioManager', () => {
  let portfolio: PortfolioManager;

  beforeEach(() => {
    portfolio = new PortfolioManager(mockClient, {
      baseCurrency: 'USD',
      concentrationLimits: {
        bond: 0.40,
        rwa_token: 0.30,
        stablecoin: 0.50,
        xrp: 0.20,
        amm_lp: 0.15,
        dex_order: 0.10,
        escrow: 0.20,
      },
      maxSingleExposure: 0.25,
      rebalanceThreshold: 0.05,
      valuationSources: {},
    });
  });

  test('adds positions and calculates NAV', () => {
    portfolio.addPosition({
      type: 'bond',
      instrument: 'BOND-001',
      account: 'rACCOUNT1',
      quantity: '1000000',
      costBasis: '1',
      currentPrice: '1.02',
      currency: 'USD',
    });

    portfolio.addPosition({
      type: 'stablecoin',
      instrument: 'USD.Bitstamp',
      account: 'rACCOUNT1',
      quantity: '500000',
      costBasis: '1',
      currentPrice: '1',
      currency: 'USD',
    });

    const { nav, breakdown } = portfolio.calculateNAV();
    expect(parseFloat(nav)).toBe(1520000); // 1M × 1.02 + 500K × 1
    expect(parseFloat(breakdown.bond)).toBe(1020000);
    expect(parseFloat(breakdown.stablecoin)).toBe(500000);
  });

  test('calculates P&L with realized and unrealized', () => {
    const pos = portfolio.addPosition({
      type: 'bond',
      instrument: 'BOND-002',
      account: 'rACCOUNT2',
      quantity: '10000',
      costBasis: '100',
      currentPrice: '105',
      currency: 'USD',
    });

    const pnl = portfolio.calculatePnL();
    expect(parseFloat(pnl.totalUnrealized)).toBe(50000); // 10000 × (105 - 100)
    expect(parseFloat(pnl.totalRealized)).toBe(0);

    // Close half at 110
    portfolio.closePosition(pos.id, '110', '5000');
    const pnl2 = portfolio.calculatePnL();
    expect(parseFloat(pnl2.totalRealized)).toBe(50000); // 5000 × (110 - 100)
  });

  test('detects concentration breaches', () => {
    portfolio.addPosition({
      type: 'bond',
      instrument: 'SINGLE-BOND',
      account: 'rACCOUNT3',
      quantity: '1000',
      costBasis: '1',
      currentPrice: '1',
      currency: 'USD',
    });

    const exposure = portfolio.calculateExposure();
    const risk = exposure.concentrationRisk.find((c) => c.instrument === 'SINGLE-BOND');
    expect(risk).toBeDefined();
    expect(risk!.percentage).toBe(100); // 100% in one instrument
    expect(risk!.breached).toBe(true); // Exceeds 25% max
  });

  test('takes portfolio snapshots', () => {
    portfolio.addPosition({
      type: 'xrp',
      instrument: 'XRP',
      account: 'rACCOUNT4',
      quantity: '100000',
      costBasis: '0.50',
      currentPrice: '0.60',
      currency: 'XRP',
    });

    const snap = portfolio.takeSnapshot();
    expect(snap.totalNav).toBe('60000.00');
    expect(snap.positions.length).toBe(1);
    expect(snap.pnlSummary.totalUnrealized).toBe('10000.00');
  });
});

// ─── Settlement Engine Tests ─────────────────────────────────────────

describe('@optkas/settlement — SettlementEngine', () => {
  let engine: SettlementEngine;

  beforeEach(() => {
    engine = new SettlementEngine(mockClient);
  });

  test('creates DvP instruction with delivery and payment legs', () => {
    const instruction = engine.createDvPInstruction({
      buyer: 'rBUYER222222222222222222222222',
      seller: 'rSELLER22222222222222222222222',
      assetCurrency: 'BOND',
      assetIssuer: 'rISSUER222222222222222222222222',
      assetAmount: '500000',
      paymentCurrency: 'USD',
      paymentIssuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
      paymentAmount: '500000',
      model: 'rtgs',
    });

    expect(instruction.id).toMatch(/^SETT-/);
    expect(instruction.legs.length).toBe(2);
    expect(instruction.legs[0].direction).toBe('delivery');
    expect(instruction.legs[1].direction).toBe('payment');
    expect(instruction.status).toBe('pending');
  });

  test('executes RTGS settlement', async () => {
    const instruction = engine.createDvPInstruction({
      buyer: 'rBUYER333333333333333333333333',
      seller: 'rSELLER33333333333333333333333',
      assetCurrency: 'BOND',
      assetIssuer: 'rISSUER333333333333333333333333',
      assetAmount: '100000',
      paymentCurrency: 'USD',
      paymentIssuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
      paymentAmount: '100000',
      model: 'rtgs',
    });

    const txns = await engine.executeRTGS(instruction.id);
    expect(txns.length).toBe(2);
    expect(instruction.status).toBe('settling');
  });

  test('marks legs as executed and settles', () => {
    const instruction = engine.createDvPInstruction({
      buyer: 'rBUYER444444444444444444444444',
      seller: 'rSELLER44444444444444444444444',
      assetCurrency: 'BOND',
      assetIssuer: 'rISSUER444444444444444444444444',
      assetAmount: '50000',
      paymentCurrency: 'XRP',
      paymentAmount: '50000000000', // drops
      model: 'rtgs',
    });

    engine.markLegExecuted(instruction.id, instruction.legs[0].id, 'HASH_DELIVERY');
    expect(instruction.status).toBe('pending'); // Not all legs done

    engine.markLegExecuted(instruction.id, instruction.legs[1].id, 'HASH_PAYMENT');
    expect(instruction.status).toBe('settled'); // All done
  });

  test('calculates bilateral netting', () => {
    // A owes B 100 BOND, B owes A 60 BOND
    const i1 = engine.createDvPInstruction({
      buyer: 'rB',
      seller: 'rA',
      assetCurrency: 'BOND',
      assetIssuer: 'rISSUER',
      assetAmount: '100',
      paymentCurrency: 'USD',
      paymentIssuer: 'rGATEWAY',
      paymentAmount: '100',
      model: 'deferred_net',
    });

    const i2 = engine.createDvPInstruction({
      buyer: 'rA',
      seller: 'rB',
      assetCurrency: 'BOND',
      assetIssuer: 'rISSUER',
      assetAmount: '60',
      paymentCurrency: 'USD',
      paymentIssuer: 'rGATEWAY',
      paymentAmount: '60',
      model: 'deferred_net',
    });

    const result = engine.calculateNetting([i1.id, i2.id]);
    expect(result.originalObligations).toBe(4); // 2 instructions × 2 legs
    expect(result.nettedObligations).toBeGreaterThan(0);
    expect(result.netPositions.length).toBeGreaterThan(0);
  });

  test('pipeline summary counts correctly', () => {
    engine.createDvPInstruction({
      buyer: 'rB1', seller: 'rS1',
      assetCurrency: 'BOND', assetIssuer: 'rI', assetAmount: '100',
      paymentCurrency: 'USD', paymentAmount: '100', model: 'rtgs',
    });

    const i2 = engine.createDvPInstruction({
      buyer: 'rB2', seller: 'rS2',
      assetCurrency: 'BOND', assetIssuer: 'rI', assetAmount: '200',
      paymentCurrency: 'USD', paymentAmount: '200', model: 'rtgs',
    });

    engine.failInstruction(i2.id, 'timeout');

    const summary = engine.getPipelineSummary();
    expect(summary.total).toBe(2);
    expect(summary.pending).toBe(1);
    expect(summary.failed).toBe(1);
  });
});
