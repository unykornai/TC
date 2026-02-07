/**
 * @optkas/audit — Platform Pause Manager
 *
 * Implements the emergency pause state machine documented in GOVERNANCE.md.
 * Any signer can trigger pause. Resume requires threshold approval.
 *
 * This module is imported by all operational packages to check pause state
 * before preparing any fund-moving transaction.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────

export interface PauseState {
  paused: boolean;
  pausedAt: string | null;
  pausedBy: string | null;
  reason: string | null;
  resumeApprovals: string[];
  resumeThreshold: number;
  history: PauseEvent[];
}

export interface PauseEvent {
  action: 'pause' | 'resume' | 'resume_approval';
  actor: string;
  timestamp: string;
  reason: string;
  hash: string;
}

// ─── Pause Manager ───────────────────────────────────────────────────

export class PauseManager {
  private state: PauseState;
  private stateFilePath: string;

  constructor(options: {
    stateFilePath?: string;
    resumeThreshold?: number;
  } = {}) {
    this.stateFilePath = options.stateFilePath || path.join(process.cwd(), 'logs', 'pause-state.json');
    this.state = this.loadState(options.resumeThreshold || 2);
  }

  private loadState(defaultThreshold: number): PauseState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const raw = fs.readFileSync(this.stateFilePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // Fall through to default
    }

    return {
      paused: false,
      pausedAt: null,
      pausedBy: null,
      reason: null,
      resumeApprovals: [],
      resumeThreshold: defaultThreshold,
      history: [],
    };
  }

  private saveState(): void {
    const dir = path.dirname(this.stateFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2));
  }

  private hashEvent(event: Omit<PauseEvent, 'hash'>): string {
    return crypto.createHash('sha256').update(JSON.stringify(event)).digest('hex');
  }

  // ─── State Queries ──────────────────────────────────────────────

  get isPaused(): boolean {
    return this.state.paused;
  }

  get currentState(): Readonly<PauseState> {
    return { ...this.state };
  }

  /**
   * Enforce that the platform is NOT paused.
   * Call this at the top of every fund-moving operation.
   * Throws if paused — prevents any transaction preparation.
   */
  enforceNotPaused(operationDescription: string): void {
    if (this.state.paused) {
      throw new Error(
        `PLATFORM PAUSED — Cannot execute: ${operationDescription}\n` +
        `Paused by: ${this.state.pausedBy}\n` +
        `Reason: ${this.state.reason}\n` +
        `Paused at: ${this.state.pausedAt}\n` +
        `Resume requires ${this.state.resumeThreshold} signer approvals. ` +
        `Current approvals: ${this.state.resumeApprovals.length}`
      );
    }
  }

  // ─── State Transitions ─────────────────────────────────────────

  /**
   * Trigger emergency pause. Any single signer can pause.
   */
  pause(signerRole: string, reason: string): PauseEvent {
    if (this.state.paused) {
      throw new Error('Platform is already paused.');
    }

    const event: Omit<PauseEvent, 'hash'> = {
      action: 'pause',
      actor: signerRole,
      timestamp: new Date().toISOString(),
      reason,
    };

    const fullEvent: PauseEvent = {
      ...event,
      hash: this.hashEvent(event),
    };

    this.state.paused = true;
    this.state.pausedAt = fullEvent.timestamp;
    this.state.pausedBy = signerRole;
    this.state.reason = reason;
    this.state.resumeApprovals = [];
    this.state.history.push(fullEvent);

    this.saveState();
    return fullEvent;
  }

  /**
   * Submit a resume approval from a signer.
   * Once threshold approvals are collected, platform is automatically resumed.
   */
  submitResumeApproval(signerRole: string, reason: string): PauseEvent {
    if (!this.state.paused) {
      throw new Error('Platform is not paused.');
    }

    if (this.state.resumeApprovals.includes(signerRole)) {
      throw new Error(`Signer ${signerRole} has already approved resume.`);
    }

    const approvalEvent: Omit<PauseEvent, 'hash'> = {
      action: 'resume_approval',
      actor: signerRole,
      timestamp: new Date().toISOString(),
      reason,
    };

    const fullApproval: PauseEvent = {
      ...approvalEvent,
      hash: this.hashEvent(approvalEvent),
    };

    this.state.resumeApprovals.push(signerRole);
    this.state.history.push(fullApproval);

    // Check if threshold met
    if (this.state.resumeApprovals.length >= this.state.resumeThreshold) {
      const resumeEvent: Omit<PauseEvent, 'hash'> = {
        action: 'resume',
        actor: 'system',
        timestamp: new Date().toISOString(),
        reason: `Resume threshold met (${this.state.resumeApprovals.length}/${this.state.resumeThreshold}). Approvals: ${this.state.resumeApprovals.join(', ')}`,
      };

      const fullResume: PauseEvent = {
        ...resumeEvent,
        hash: this.hashEvent(resumeEvent),
      };

      this.state.paused = false;
      this.state.pausedAt = null;
      this.state.pausedBy = null;
      this.state.reason = null;
      this.state.resumeApprovals = [];
      this.state.history.push(fullResume);
    }

    this.saveState();
    return fullApproval;
  }
}

export default PauseManager;
