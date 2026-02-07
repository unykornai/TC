/**
 * OPTKAS — Deal Pipeline Tracker
 *
 * CRM-grade lender funnel tracking for the funding lifecycle.
 * Tracks every lender through the pipeline: outreach → response → diligence → term sheet → close.
 *
 * This is what placement agents use internally.
 * Citadel's capital-raising desk tracks every counterparty interaction to the minute.
 * We do the same — automated.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════

export type PipelineStage =
  | 'IDENTIFIED'
  | 'PACKAGE_SENT'
  | 'DATA_ROOM_OPENED'
  | 'RESPONSE_RECEIVED'
  | 'DILIGENCE_CALL_SCHEDULED'
  | 'DILIGENCE_IN_PROGRESS'
  | 'TERM_SHEET_RECEIVED'
  | 'TERM_SHEET_NEGOTIATION'
  | 'LOI_SIGNED'
  | 'DOCUMENTATION'
  | 'CLOSING'
  | 'FUNDED'
  | 'DECLINED'
  | 'STALLED';

export type LenderTier = '1A' | '1B' | '2A' | '2B' | '3';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface InteractionLog {
  id: string;
  timestamp: string;
  type: 'EMAIL_SENT' | 'EMAIL_RECEIVED' | 'CALL' | 'MEETING' | 'DATA_ROOM_ACCESS' |
        'DOCUMENT_REQUEST' | 'TERM_SHEET' | 'LOI' | 'NOTE' | 'STATUS_CHANGE';
  summary: string;
  contact?: string;
  attachments?: string[];
  nextAction?: string;
  nextActionDeadline?: string;
}

export interface LenderDeal {
  id: string;
  lenderName: string;
  slug: string;
  tier: LenderTier;
  focus: string;
  stage: PipelineStage;
  priority: Priority;
  assignedTo: string;

  // Tracking
  dateIdentified: string;
  dateFirstContact?: string;
  dateDataRoomOpened?: string;
  dateLastInteraction?: string;
  dateTermSheetReceived?: string;
  dateExpectedResponse?: string;
  daysInCurrentStage: number;

  // Deal terms (when available)
  proposedAdvanceRate?: number;
  proposedFacilitySize?: number;
  proposedPricing?: string;
  proposedCovenants?: string[];

  // Interaction history
  interactions: InteractionLog[];
  totalInteractions: number;

  // Diligence tracking
  diligenceQuestions: Array<{ question: string; answered: boolean; answeredDate?: string; }>;
  documentsRequested: Array<{ doc: string; provided: boolean; providedDate?: string; }>;

  // Health
  healthScore: number; // 0-100
  riskFlags: string[];
  nextAction: string;
  nextActionDeadline: string;
}

export interface PipelineMetrics {
  totalDeals: number;
  activeDeals: number;
  declinedDeals: number;
  stalledDeals: number;
  conversionRate: number;
  avgDaysToResponse: number;
  avgDaysToTermSheet: number;
  pipelineValue: number;

  byStage: Record<PipelineStage, number>;
  byTier: Record<LenderTier, number>;

  velocity: {
    dealsMovedForward7d: number;
    dealsStalled7d: number;
    responseRate: number;
    termSheetRate: number;
  };
}

export interface PipelineReport {
  generatedAt: string;
  reportId: string;
  metrics: PipelineMetrics;
  deals: LenderDeal[];
  actionItems: ActionItem[];
  hash: string;
}

export interface ActionItem {
  priority: Priority;
  lenderName: string;
  action: string;
  deadline: string;
  owner: string;
}

// ═══════════════════════════════════════════════════════════════════
//  DEAL PIPELINE ENGINE
// ═══════════════════════════════════════════════════════════════════

export class DealPipelineEngine extends EventEmitter {
  private deals: Map<string, LenderDeal> = new Map();

  constructor() {
    super();
  }

  // ── Seed Wave 1 targets ───────────────────────────────────────

  seedWave1(): void {
    const wave1: Array<{ name: string; slug: string; tier: LenderTier; focus: string; }> = [
      { name: 'Ares Management', slug: 'ares-management', tier: '1A', focus: 'Alternative Credit / ABF' },
      { name: 'Apollo', slug: 'apollo', tier: '1A', focus: 'Asset-Backed Finance' },
      { name: 'KKR', slug: 'kkr', tier: '1A', focus: 'Asset-Based Finance' },
      { name: 'HPS Partners', slug: 'hps-partners', tier: '1A', focus: 'Asset-Based Financing' },
      { name: 'Fortress Investment Group', slug: 'fortress', tier: '1A', focus: 'Asset-Based Credit' },
      { name: 'Stonebriar Commercial Finance', slug: 'stonebriar', tier: '1A', focus: 'Structured Lending' },
      { name: 'Benefit Street Partners', slug: 'benefit-street', tier: '1A', focus: 'Structured Credit / ABL' },
      { name: 'Oaktree Capital', slug: 'oaktree', tier: '1A', focus: 'Structured Credit' },
      { name: 'Cerberus Capital', slug: 'cerberus', tier: '1A', focus: 'Asset-Based Credit' },
      { name: 'BlueMountain / Assured IM', slug: 'bluemountain-assured', tier: '1A', focus: 'Structured Credit' },
      { name: 'Credit Suisse Legacy Desks', slug: 'credit-suisse-legacy', tier: '1B', focus: 'MT760 / Structured Credit' },
      { name: 'Deutsche Bank SBLC Desks', slug: 'deutsche-sblc', tier: '1B', focus: 'SBLC Warehousing / Note Monetization' },
      { name: 'Standard Chartered Trade Finance', slug: 'standard-chartered', tier: '1B', focus: 'Trade Finance' },
      { name: 'Barclays-Adjacent Credit', slug: 'barclays-credit', tier: '1B', focus: 'Structured Credit / MT760' },
    ];

    for (const target of wave1) {
      const deal: LenderDeal = {
        id: `DEAL-${String(this.deals.size + 1).padStart(3, '0')}`,
        lenderName: target.name,
        slug: target.slug,
        tier: target.tier,
        focus: target.focus,
        stage: 'IDENTIFIED',
        priority: target.tier === '1A' ? 'CRITICAL' : 'HIGH',
        assignedTo: 'OPTKAS1-MAIN SPV',
        dateIdentified: new Date().toISOString(),
        daysInCurrentStage: 0,
        interactions: [],
        totalInteractions: 0,
        diligenceQuestions: [],
        documentsRequested: [],
        healthScore: 100,
        riskFlags: [],
        nextAction: 'Send outreach package',
        nextActionDeadline: '2026-02-10T09:00:00Z',
      };
      this.deals.set(deal.id, deal);
      this.emit('deal:created', deal);
    }
  }

  // ── Stage Progression ─────────────────────────────────────────

  advanceStage(dealId: string, newStage: PipelineStage, note?: string): LenderDeal | null {
    const deal = this.deals.get(dealId);
    if (!deal) return null;

    const previousStage = deal.stage;
    deal.stage = newStage;
    deal.daysInCurrentStage = 0;
    deal.dateLastInteraction = new Date().toISOString();

    // Auto-set dates based on stage
    if (newStage === 'PACKAGE_SENT' && !deal.dateFirstContact) {
      deal.dateFirstContact = new Date().toISOString();
    }
    if (newStage === 'DATA_ROOM_OPENED' && !deal.dateDataRoomOpened) {
      deal.dateDataRoomOpened = new Date().toISOString();
    }
    if (newStage === 'TERM_SHEET_RECEIVED' && !deal.dateTermSheetReceived) {
      deal.dateTermSheetReceived = new Date().toISOString();
    }

    // Log the stage change
    deal.interactions.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'STATUS_CHANGE',
      summary: `Stage changed: ${previousStage} → ${newStage}${note ? ` | ${note}` : ''}`,
    });
    deal.totalInteractions++;

    // Update next actions based on stage
    deal.nextAction = this.getNextAction(newStage);
    deal.nextActionDeadline = this.getNextDeadline(newStage);

    this.emit('deal:stage-changed', { deal, previousStage, newStage });
    return deal;
  }

  // ── Log Interaction ───────────────────────────────────────────

  logInteraction(dealId: string, interaction: Omit<InteractionLog, 'id' | 'timestamp'>): LenderDeal | null {
    const deal = this.deals.get(dealId);
    if (!deal) return null;

    const log: InteractionLog = {
      ...interaction,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    deal.interactions.push(log);
    deal.totalInteractions++;
    deal.dateLastInteraction = log.timestamp;

    if (interaction.nextAction) {
      deal.nextAction = interaction.nextAction;
    }
    if (interaction.nextActionDeadline) {
      deal.nextActionDeadline = interaction.nextActionDeadline;
    }

    this.emit('deal:interaction', { deal, interaction: log });
    return deal;
  }

  // ── Track Diligence Question ──────────────────────────────────

  addDiligenceQuestion(dealId: string, question: string): void {
    const deal = this.deals.get(dealId);
    if (!deal) return;
    deal.diligenceQuestions.push({ question, answered: false });
    deal.healthScore = this.computeHealthScore(deal);
    this.emit('deal:diligence-question', { deal, question });
  }

  answerDiligenceQuestion(dealId: string, questionIndex: number): void {
    const deal = this.deals.get(dealId);
    if (!deal || !deal.diligenceQuestions[questionIndex]) return;
    deal.diligenceQuestions[questionIndex].answered = true;
    deal.diligenceQuestions[questionIndex].answeredDate = new Date().toISOString();
    deal.healthScore = this.computeHealthScore(deal);
    this.emit('deal:diligence-answered', { deal, questionIndex });
  }

  // ── Track Document Requests ───────────────────────────────────

  addDocumentRequest(dealId: string, doc: string): void {
    const deal = this.deals.get(dealId);
    if (!deal) return;
    deal.documentsRequested.push({ doc, provided: false });
    deal.healthScore = this.computeHealthScore(deal);
  }

  markDocumentProvided(dealId: string, docIndex: number): void {
    const deal = this.deals.get(dealId);
    if (!deal || !deal.documentsRequested[docIndex]) return;
    deal.documentsRequested[docIndex].provided = true;
    deal.documentsRequested[docIndex].providedDate = new Date().toISOString();
    deal.healthScore = this.computeHealthScore(deal);
  }

  // ── Record Term Sheet Details ─────────────────────────────────

  recordTermSheet(dealId: string, terms: {
    advanceRate: number;
    facilitySize: number;
    pricing: string;
    covenants: string[];
  }): LenderDeal | null {
    const deal = this.deals.get(dealId);
    if (!deal) return null;

    deal.proposedAdvanceRate = terms.advanceRate;
    deal.proposedFacilitySize = terms.facilitySize;
    deal.proposedPricing = terms.pricing;
    deal.proposedCovenants = terms.covenants;

    this.advanceStage(dealId, 'TERM_SHEET_RECEIVED', `${terms.advanceRate}% advance / $${(terms.facilitySize / 1e6).toFixed(1)}M`);
    return deal;
  }

  // ── Health Score Computation ──────────────────────────────────

  private computeHealthScore(deal: LenderDeal): number {
    let score = 100;

    // Deduct for unanswered questions (10 per question)
    const unanswered = deal.diligenceQuestions.filter(q => !q.answered).length;
    score -= unanswered * 10;

    // Deduct for outstanding document requests (8 per doc)
    const outstandingDocs = deal.documentsRequested.filter(d => !d.provided).length;
    score -= outstandingDocs * 8;

    // Deduct for stale deals (days without interaction)
    if (deal.dateLastInteraction) {
      const daysSince = (Date.now() - new Date(deal.dateLastInteraction).getTime()) / 86_400_000;
      if (daysSince > 5) score -= 15;
      if (daysSince > 10) score -= 25;
      if (daysSince > 20) score -= 35;
    }

    // Deduct for declined or stalled
    if (deal.stage === 'DECLINED') score = 0;
    if (deal.stage === 'STALLED') score = Math.min(score, 25);

    // Risk flags
    deal.riskFlags = [];
    if (unanswered > 0) deal.riskFlags.push(`${unanswered} unanswered diligence question(s)`);
    if (outstandingDocs > 0) deal.riskFlags.push(`${outstandingDocs} outstanding document request(s)`);
    if (deal.daysInCurrentStage > 7) deal.riskFlags.push('Stagnant — no movement in 7+ days');

    return Math.max(0, Math.min(100, score));
  }

  // ── Pipeline Metrics ──────────────────────────────────────────

  getMetrics(): PipelineMetrics {
    const allDeals = Array.from(this.deals.values());
    const active = allDeals.filter(d => d.stage !== 'DECLINED' && d.stage !== 'FUNDED');
    const declined = allDeals.filter(d => d.stage === 'DECLINED');
    const stalled = allDeals.filter(d => d.stage === 'STALLED');
    const funded = allDeals.filter(d => d.stage === 'FUNDED');

    const byStage: Record<string, number> = {};
    const byTier: Record<string, number> = {};

    for (const deal of allDeals) {
      byStage[deal.stage] = (byStage[deal.stage] || 0) + 1;
      byTier[deal.tier] = (byTier[deal.tier] || 0) + 1;
    }

    // Conversion rate: deals that reached TERM_SHEET or beyond / total
    const advanced = allDeals.filter(d => [
      'TERM_SHEET_RECEIVED', 'TERM_SHEET_NEGOTIATION', 'LOI_SIGNED',
      'DOCUMENTATION', 'CLOSING', 'FUNDED',
    ].includes(d.stage));

    // Average days to response
    const withResponse = allDeals.filter(d => d.dateFirstContact && d.dateLastInteraction && d.stage !== 'IDENTIFIED');
    const avgDaysToResponse = withResponse.length > 0
      ? withResponse.reduce((sum, d) => {
          const first = new Date(d.dateFirstContact!).getTime();
          const last = new Date(d.dateLastInteraction!).getTime();
          return sum + (last - first) / 86_400_000;
        }, 0) / withResponse.length
      : 0;

    // Pipeline value (sum of proposed facility sizes)
    const pipelineValue = allDeals.reduce((sum, d) => sum + (d.proposedFacilitySize || 0), 0);

    return {
      totalDeals: allDeals.length,
      activeDeals: active.length,
      declinedDeals: declined.length,
      stalledDeals: stalled.length,
      conversionRate: allDeals.length > 0 ? (advanced.length / allDeals.length) * 100 : 0,
      avgDaysToResponse,
      avgDaysToTermSheet: 0, // Computed when data available
      pipelineValue,
      byStage: byStage as any,
      byTier: byTier as any,
      velocity: {
        dealsMovedForward7d: 0,
        dealsStalled7d: stalled.length,
        responseRate: 0,
        termSheetRate: 0,
      },
    };
  }

  // ── Generate Action Items ─────────────────────────────────────

  getActionItems(): ActionItem[] {
    const items: ActionItem[] = [];
    const now = new Date();

    for (const deal of this.deals.values()) {
      if (deal.stage === 'DECLINED' || deal.stage === 'FUNDED') continue;

      // Overdue actions
      if (deal.nextActionDeadline && new Date(deal.nextActionDeadline) < now) {
        items.push({
          priority: 'CRITICAL',
          lenderName: deal.lenderName,
          action: `OVERDUE: ${deal.nextAction}`,
          deadline: deal.nextActionDeadline,
          owner: deal.assignedTo,
        });
      }

      // Unanswered diligence
      const unanswered = deal.diligenceQuestions.filter(q => !q.answered);
      if (unanswered.length > 0) {
        items.push({
          priority: 'HIGH',
          lenderName: deal.lenderName,
          action: `Answer ${unanswered.length} diligence question(s)`,
          deadline: new Date(now.getTime() + 86_400_000).toISOString(),
          owner: deal.assignedTo,
        });
      }

      // Outstanding docs
      const outstandingDocs = deal.documentsRequested.filter(d => !d.provided);
      if (outstandingDocs.length > 0) {
        items.push({
          priority: 'HIGH',
          lenderName: deal.lenderName,
          action: `Provide ${outstandingDocs.length} requested document(s)`,
          deadline: new Date(now.getTime() + 86_400_000).toISOString(),
          owner: deal.assignedTo,
        });
      }

      // Next action reminders
      if (deal.nextAction && deal.stage !== 'STALLED') {
        items.push({
          priority: deal.priority,
          lenderName: deal.lenderName,
          action: deal.nextAction,
          deadline: deal.nextActionDeadline,
          owner: deal.assignedTo,
        });
      }
    }

    // Sort by priority
    const priorityOrder: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return items;
  }

  // ── Generate Full Report ──────────────────────────────────────

  generateReport(): PipelineReport {
    const report: PipelineReport = {
      generatedAt: new Date().toISOString(),
      reportId: `PIPE-${Date.now().toString(36).toUpperCase()}`,
      metrics: this.getMetrics(),
      deals: Array.from(this.deals.values()),
      actionItems: this.getActionItems(),
      hash: '',
    };

    report.hash = crypto.createHash('sha256')
      .update(JSON.stringify({ ...report, hash: undefined }))
      .digest('hex');

    return report;
  }

  // ── Accessors ─────────────────────────────────────────────────

  getDeal(dealId: string): LenderDeal | undefined {
    return this.deals.get(dealId);
  }

  getAllDeals(): LenderDeal[] {
    return Array.from(this.deals.values());
  }

  getDealsByStage(stage: PipelineStage): LenderDeal[] {
    return Array.from(this.deals.values()).filter(d => d.stage === stage);
  }

  getDealsByTier(tier: LenderTier): LenderDeal[] {
    return Array.from(this.deals.values()).filter(d => d.tier === tier);
  }

  // ── Helper: Next action by stage ──────────────────────────────

  private getNextAction(stage: PipelineStage): string {
    const actions: Record<PipelineStage, string> = {
      'IDENTIFIED': 'Send outreach package',
      'PACKAGE_SENT': 'Confirm receipt / follow up in 48h',
      'DATA_ROOM_OPENED': 'Monitor access patterns, prepare for questions',
      'RESPONSE_RECEIVED': 'Schedule diligence call within 48h',
      'DILIGENCE_CALL_SCHEDULED': 'Prepare for call, review CREDIT_COMMITTEE_QA.md',
      'DILIGENCE_IN_PROGRESS': 'Answer all questions within 24h',
      'TERM_SHEET_RECEIVED': 'Review terms, compare with other offers',
      'TERM_SHEET_NEGOTIATION': 'Counter-proposal or accept within 72h',
      'LOI_SIGNED': 'Engage counsel for documentation',
      'DOCUMENTATION': 'Review and execute facility documents',
      'CLOSING': 'Wire instructions and first draw request',
      'FUNDED': 'Monthly reporting begins',
      'DECLINED': 'Archive and note reason',
      'STALLED': 'Re-engage or deprioritize',
    };
    return actions[stage] || 'Review status';
  }

  private getNextDeadline(stage: PipelineStage): string {
    const daysFromNow: Record<PipelineStage, number> = {
      'IDENTIFIED': 3,
      'PACKAGE_SENT': 2,
      'DATA_ROOM_OPENED': 3,
      'RESPONSE_RECEIVED': 2,
      'DILIGENCE_CALL_SCHEDULED': 5,
      'DILIGENCE_IN_PROGRESS': 1,
      'TERM_SHEET_RECEIVED': 3,
      'TERM_SHEET_NEGOTIATION': 3,
      'LOI_SIGNED': 5,
      'DOCUMENTATION': 10,
      'CLOSING': 5,
      'FUNDED': 30,
      'DECLINED': 0,
      'STALLED': 7,
    };
    const d = new Date();
    d.setDate(d.getDate() + (daysFromNow[stage] || 7));
    return d.toISOString();
  }
}
