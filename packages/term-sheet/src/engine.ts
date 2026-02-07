/**
 * OPTKAS — Term Sheet Analyzer
 *
 * When multiple term sheets arrive, this engine compares them side-by-side.
 * Blackstone's capital markets desk never accepts the first offer.
 * They score, rank, and negotiate from data — not gut feel.
 *
 * Scoring weights:
 *   Advance Rate (25%) → higher = better
 *   Pricing / Spread (25%) → lower = better
 *   Facility Size (15%) → higher = better
 *   Covenant Flexibility (15%) → fewer/lighter = better
 *   Diligence Speed (10%) → faster = better
 *   Reporting Burden (10%) → lighter = better
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════

export interface TermSheet {
  id: string;
  lenderName: string;
  receivedDate: string;
  expirationDate?: string;
  status: 'RECEIVED' | 'UNDER_REVIEW' | 'COUNTER_SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

  // Economics
  facilitySize: number;
  advanceRate: number;            // % of collateral value
  interestRate: number;            // annual % (base rate + spread)
  baseRate: string;                // e.g., "SOFR", "Prime"
  spread: number;                  // basis points over base
  floorRate?: number;              // minimum interest rate
  commitmentFee?: number;          // % on undrawn
  originationFee?: number;         // % upfront
  exitFee?: number;                // % at payoff
  minimumDraw?: number;

  // Structure
  tenor: number;                   // months
  amortization: 'INTEREST_ONLY' | 'AMORTIZING' | 'BULLET';
  revolving: boolean;
  extensionOption?: number;        // months

  // Covenants
  covenants: Covenant[];
  reportingRequirements: string[];

  // Diligence
  expectedClosingDays: number;
  conditionsPrecedent: string[];

  // Fees
  legalFeeCap?: number;
  annualAdminFee?: number;

  // Notes
  keyStrengths: string[];
  keyRisks: string[];
  negotiationNotes: string[];
}

export interface Covenant {
  name: string;
  type: 'FINANCIAL' | 'REPORTING' | 'NEGATIVE' | 'AFFIRMATIVE';
  threshold: string;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONGOING';
  remedy: string;
}

export interface TermSheetScore {
  termSheetId: string;
  lenderName: string;
  overallScore: number;
  rank: number;

  components: {
    advanceRate: { score: number; weight: number; weighted: number; detail: string; };
    pricing: { score: number; weight: number; weighted: number; detail: string; };
    facilitySize: { score: number; weight: number; weighted: number; detail: string; };
    covenantFlexibility: { score: number; weight: number; weighted: number; detail: string; };
    diligenceSpeed: { score: number; weight: number; weighted: number; detail: string; };
    reportingBurden: { score: number; weight: number; weighted: number; detail: string; };
  };

  effectiveAllInCost: number;   // annualized all-in cost %
  netProceeds: number;          // facility size × advance rate - fees
  recommendation: 'STRONG_ACCEPT' | 'ACCEPT' | 'NEGOTIATE' | 'PASS';
}

export interface ComparisonReport {
  generatedAt: string;
  reportId: string;
  termSheets: TermSheet[];
  scores: TermSheetScore[];
  bestOverall: string;
  bestEconomics: string;
  bestSpeed: string;
  bestFlexibility: string;
  negotiationStrategy: string[];
  hash: string;
}

// ═══════════════════════════════════════════════════════════════════
//  TERM SHEET ANALYZER ENGINE
// ═══════════════════════════════════════════════════════════════════

export class TermSheetAnalyzer extends EventEmitter {
  private termSheets: Map<string, TermSheet> = new Map();

  // Scoring weights
  private weights = {
    advanceRate: 0.25,
    pricing: 0.25,
    facilitySize: 0.15,
    covenantFlexibility: 0.15,
    diligenceSpeed: 0.10,
    reportingBurden: 0.10,
  };

  constructor() {
    super();
  }

  // ── Add Term Sheet ────────────────────────────────────────────

  addTermSheet(ts: Omit<TermSheet, 'id' | 'status'>): TermSheet {
    const termSheet: TermSheet = {
      ...ts,
      id: `TS-${String(this.termSheets.size + 1).padStart(3, '0')}`,
      status: 'RECEIVED',
    };
    this.termSheets.set(termSheet.id, termSheet);
    this.emit('termsheet:received', termSheet);
    return termSheet;
  }

  // ── Score Single Term Sheet ───────────────────────────────────

  scoreTermSheet(tsId: string): TermSheetScore | null {
    const ts = this.termSheets.get(tsId);
    if (!ts) return null;

    const allSheets = Array.from(this.termSheets.values());

    // Score each component (0-100)
    const advanceRateScore = this.scoreAdvanceRate(ts, allSheets);
    const pricingScore = this.scorePricing(ts, allSheets);
    const facilitySizeScore = this.scoreFacilitySize(ts, allSheets);
    const covenantScore = this.scoreCovenants(ts, allSheets);
    const speedScore = this.scoreSpeed(ts, allSheets);
    const reportingScore = this.scoreReporting(ts, allSheets);

    const components = {
      advanceRate: {
        score: advanceRateScore,
        weight: this.weights.advanceRate,
        weighted: advanceRateScore * this.weights.advanceRate,
        detail: `${ts.advanceRate}% advance rate`,
      },
      pricing: {
        score: pricingScore,
        weight: this.weights.pricing,
        weighted: pricingScore * this.weights.pricing,
        detail: `${ts.baseRate} + ${ts.spread}bp (${ts.interestRate}%)`,
      },
      facilitySize: {
        score: facilitySizeScore,
        weight: this.weights.facilitySize,
        weighted: facilitySizeScore * this.weights.facilitySize,
        detail: `$${(ts.facilitySize / 1e6).toFixed(1)}M facility`,
      },
      covenantFlexibility: {
        score: covenantScore,
        weight: this.weights.covenantFlexibility,
        weighted: covenantScore * this.weights.covenantFlexibility,
        detail: `${ts.covenants.length} covenants`,
      },
      diligenceSpeed: {
        score: speedScore,
        weight: this.weights.diligenceSpeed,
        weighted: speedScore * this.weights.diligenceSpeed,
        detail: `${ts.expectedClosingDays} days to close`,
      },
      reportingBurden: {
        score: reportingScore,
        weight: this.weights.reportingBurden,
        weighted: reportingScore * this.weights.reportingBurden,
        detail: `${ts.reportingRequirements.length} reporting items`,
      },
    };

    const overallScore = Object.values(components).reduce((sum, c) => sum + c.weighted, 0);

    // Effective all-in cost
    const originationCost = (ts.originationFee || 0) / (ts.tenor / 12); // annualized
    const effectiveAllInCost = ts.interestRate + originationCost + (ts.commitmentFee || 0) * 0.5;

    // Net proceeds
    const grossProceeds = ts.facilitySize;
    const upfrontFees = grossProceeds * ((ts.originationFee || 0) / 100);
    const netProceeds = grossProceeds - upfrontFees;

    // Recommendation
    let recommendation: TermSheetScore['recommendation'];
    if (overallScore >= 80) recommendation = 'STRONG_ACCEPT';
    else if (overallScore >= 65) recommendation = 'ACCEPT';
    else if (overallScore >= 45) recommendation = 'NEGOTIATE';
    else recommendation = 'PASS';

    return {
      termSheetId: ts.id,
      lenderName: ts.lenderName,
      overallScore: Math.round(overallScore * 100) / 100,
      rank: 0, // Set in comparison
      components,
      effectiveAllInCost: Math.round(effectiveAllInCost * 100) / 100,
      netProceeds,
      recommendation,
    };
  }

  // ── Compare All Term Sheets ───────────────────────────────────

  compareAll(): ComparisonReport {
    const allSheets = Array.from(this.termSheets.values());
    const scores: TermSheetScore[] = [];

    for (const ts of allSheets) {
      const score = this.scoreTermSheet(ts.id);
      if (score) scores.push(score);
    }

    // Rank
    scores.sort((a, b) => b.overallScore - a.overallScore);
    scores.forEach((s, i) => s.rank = i + 1);

    // Find bests
    const bestOverall = scores[0]?.lenderName || 'N/A';
    const bestEconomics = [...scores].sort((a, b) => a.effectiveAllInCost - b.effectiveAllInCost)[0]?.lenderName || 'N/A';
    const bestSpeed = [...scores].sort((a, b) => a.components.diligenceSpeed.score - b.components.diligenceSpeed.score).reverse()[0]?.lenderName || 'N/A';
    const bestFlexibility = [...scores].sort((a, b) => a.components.covenantFlexibility.score - b.components.covenantFlexibility.score).reverse()[0]?.lenderName || 'N/A';

    // Negotiation strategy
    const strategy = this.generateNegotiationStrategy(scores, allSheets);

    const report: ComparisonReport = {
      generatedAt: new Date().toISOString(),
      reportId: `TSC-${Date.now().toString(36).toUpperCase()}`,
      termSheets: allSheets,
      scores,
      bestOverall,
      bestEconomics,
      bestSpeed,
      bestFlexibility,
      negotiationStrategy: strategy,
      hash: '',
    };

    report.hash = crypto.createHash('sha256')
      .update(JSON.stringify({ ...report, hash: undefined }))
      .digest('hex');

    return report;
  }

  // ── Scoring Functions ─────────────────────────────────────────

  private scoreAdvanceRate(ts: TermSheet, all: TermSheet[]): number {
    // 65% = 100, 50% = 50, below 40% = 20
    if (ts.advanceRate >= 65) return 100;
    if (ts.advanceRate >= 60) return 85;
    if (ts.advanceRate >= 55) return 70;
    if (ts.advanceRate >= 50) return 55;
    if (ts.advanceRate >= 45) return 40;
    return 20;
  }

  private scorePricing(ts: TermSheet, all: TermSheet[]): number {
    // Lower spread = better. SOFR+200 = 100, SOFR+500 = 30
    if (ts.spread <= 200) return 100;
    if (ts.spread <= 250) return 90;
    if (ts.spread <= 300) return 75;
    if (ts.spread <= 350) return 60;
    if (ts.spread <= 400) return 45;
    if (ts.spread <= 500) return 30;
    return 15;
  }

  private scoreFacilitySize(ts: TermSheet, all: TermSheet[]): number {
    // Relative to ask ($5-6.5M target)
    const target = 6_000_000;
    const ratio = ts.facilitySize / target;
    if (ratio >= 1.0) return 100;
    if (ratio >= 0.85) return 80;
    if (ratio >= 0.70) return 60;
    if (ratio >= 0.50) return 40;
    return 20;
  }

  private scoreCovenants(ts: TermSheet, all: TermSheet[]): number {
    // Fewer covenants = better, lighter thresholds = better
    let score = 100;
    score -= ts.covenants.length * 8;           // Deduct per covenant
    score -= ts.conditionsPrecedent.length * 3;  // Deduct per CP
    const financialCovenants = ts.covenants.filter(c => c.type === 'FINANCIAL');
    score -= financialCovenants.length * 5;      // Extra deduction for financial covenants
    return Math.max(10, score);
  }

  private scoreSpeed(ts: TermSheet, all: TermSheet[]): number {
    // Faster closing = better. 15 days = 100, 60+ days = 20
    if (ts.expectedClosingDays <= 15) return 100;
    if (ts.expectedClosingDays <= 21) return 85;
    if (ts.expectedClosingDays <= 30) return 70;
    if (ts.expectedClosingDays <= 45) return 50;
    if (ts.expectedClosingDays <= 60) return 30;
    return 20;
  }

  private scoreReporting(ts: TermSheet, all: TermSheet[]): number {
    // Fewer reporting requirements = better (we automate anyway, but lighter is easier)
    const count = ts.reportingRequirements.length;
    if (count <= 3) return 100;
    if (count <= 5) return 80;
    if (count <= 7) return 60;
    if (count <= 10) return 40;
    return 20;
  }

  // ── Negotiation Strategy Generator ────────────────────────────

  private generateNegotiationStrategy(scores: TermSheetScore[], sheets: TermSheet[]): string[] {
    const strategy: string[] = [];

    if (scores.length === 0) {
      strategy.push('No term sheets to compare. Continue outreach.');
      return strategy;
    }

    if (scores.length === 1) {
      const s = scores[0];
      const ts = sheets.find(t => t.id === s.termSheetId)!;
      strategy.push(`Single offer from ${s.lenderName}. Limited negotiation leverage.`);
      if (s.recommendation === 'NEGOTIATE') {
        strategy.push(`Counter on: ${s.components.pricing.score < 60 ? 'spread (too high), ' : ''}${s.components.advanceRate.score < 70 ? 'advance rate, ' : ''}${s.components.covenantFlexibility.score < 60 ? 'covenant count' : ''}`);
      }
      strategy.push('Consider accepting to establish track record, then refinance with leverage.');
      return strategy;
    }

    // Multiple offers — leverage position
    const best = scores[0];
    const bestSheet = sheets.find(t => t.id === best.termSheetId)!;
    strategy.push(`Lead offer: ${best.lenderName} (score: ${best.overallScore}).`);

    if (scores.length >= 2) {
      strategy.push(`Competing offer: ${scores[1].lenderName} (score: ${scores[1].overallScore}).`);
      strategy.push('Use competing offer to tighten spread on lead. Do NOT reveal specific terms.');
      strategy.push(`Say: "We have received competitive interest and are evaluating multiple offers on economics."`);
    }

    if (scores.length >= 3) {
      strategy.push(`Strong position with ${scores.length} offers. Negotiate from strength.`);
      strategy.push('Consider requesting MFN clause if first-mover accepts quickly.');
    }

    // Specific negotiation points
    const weakest = Object.entries(best.components)
      .sort(([,a], [,b]) => a.score - b.score);
    const worstComponent = weakest[0];
    strategy.push(`Negotiate ${best.lenderName} on: ${worstComponent[0]} (weakest scoring area at ${worstComponent[1].score}/100).`);

    return strategy;
  }

  // ── Accessors ─────────────────────────────────────────────────

  getTermSheet(id: string): TermSheet | undefined { return this.termSheets.get(id); }
  getAllTermSheets(): TermSheet[] { return Array.from(this.termSheets.values()); }

  updateStatus(id: string, status: TermSheet['status']): void {
    const ts = this.termSheets.get(id);
    if (ts) {
      ts.status = status;
      this.emit('termsheet:status-changed', { ts, status });
    }
  }
}
