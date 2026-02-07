/**
 * @optkas/governance — Multisig Governance Engine
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Institutional governance layer providing:
 * - Role-based authority model (treasury, compliance, trustee)
 * - Quorum validation and threshold enforcement
 * - Signer rotation with audit trail and notice periods
 * - Approval gates for all fund-moving and state-changing operations
 * - Emergency pause integration
 * - Config change governance (unanimous for critical paths)
 *
 * Every operation that moves value, changes state, or modifies configuration
 * MUST pass through this governance engine. No exceptions.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────

export type GovernanceAction =
  | 'issue_iou'
  | 'create_escrow'
  | 'release_escrow'
  | 'provision_amm'
  | 'withdraw_amm'
  | 'freeze_iou'
  | 'pause_issuance'
  | 'resume_issuance'
  | 'generate_audit'
  | 'approve_settlement'
  | 'bond_create'
  | 'bond_transition'
  | 'bond_default'
  | 'bond_cure'
  | 'tranche_activate'
  | 'series_create'
  | 'waterfall_distribute'
  | 'signer_rotate'
  | 'config_change'
  | 'bridge_configure'
  | 'agent_deploy'
  | 'compliance_override';

export type SignerRole = 'treasury' | 'compliance' | 'trustee';

export interface Signer {
  id: string;
  role: SignerRole;
  xrplAddress: string;
  stellarPublicKey?: string;
  weight: number;
  active: boolean;
  addedAt: string;
  addedBy: string;
  removedAt?: string;
  removedBy?: string;
}

export interface RoleAuthority {
  role: SignerRole;
  actions: GovernanceAction[];
}

export interface ApprovalRequest {
  id: string;
  action: GovernanceAction;
  description: string;
  requiredThreshold: number;
  approvals: ApprovalVote[];
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  payload: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
  resolvedAt?: string;
  expiresAt: string;
  hash: string;
}

export interface ApprovalVote {
  signerId: string;
  role: SignerRole;
  vote: 'approve' | 'reject';
  reason: string;
  timestamp: string;
  hash: string;
}

export interface SignerRotation {
  id: string;
  type: 'add' | 'remove' | 'replace';
  proposedSigner?: Omit<Signer, 'id' | 'addedAt' | 'active'>;
  removedSignerId?: string;
  noticePeriodDays: number;
  proposedAt: string;
  effectiveDate: string;
  status: 'proposed' | 'approved' | 'executed' | 'rejected';
  approvals: ApprovalVote[];
  requiredApprovals: number;
}

export interface GovernanceConfig {
  threshold: number;
  totalSigners: number;
  quorumForConfigChange: number;
  emergencyPauseRequires: number;
  emergencyResumeRequires: number;
  signerRotationNoticeDays: number;
  signerRotationApprovals: number;
  minimumSigners: number;
  approvalExpiryHours: number;
}

// ─── Default Role Authorities ────────────────────────────────────────

const DEFAULT_ROLE_AUTHORITIES: RoleAuthority[] = [
  {
    role: 'treasury',
    actions: [
      'issue_iou', 'create_escrow', 'provision_amm', 'withdraw_amm',
      'bond_create', 'bond_transition', 'series_create', 'tranche_activate',
      'waterfall_distribute', 'approve_settlement', 'agent_deploy',
      'bridge_configure',
    ],
  },
  {
    role: 'compliance',
    actions: [
      'freeze_iou', 'pause_issuance', 'resume_issuance', 'generate_audit',
      'bond_default', 'bond_cure', 'compliance_override',
    ],
  },
  {
    role: 'trustee',
    actions: [
      'release_escrow', 'approve_settlement', 'bond_transition',
      'waterfall_distribute', 'bond_default', 'bond_cure',
    ],
  },
];

// ─── Multisig Governor ───────────────────────────────────────────────

export class MultisigGovernor extends EventEmitter {
  private signers: Map<string, Signer> = new Map();
  private roleAuthorities: Map<SignerRole, Set<GovernanceAction>> = new Map();
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private rotations: Map<string, SignerRotation> = new Map();
  private config: GovernanceConfig;

  constructor(config?: Partial<GovernanceConfig>) {
    super();
    this.config = {
      threshold: 2,
      totalSigners: 3,
      quorumForConfigChange: 3,
      emergencyPauseRequires: 1,
      emergencyResumeRequires: 2,
      signerRotationNoticeDays: 30,
      signerRotationApprovals: 2,
      minimumSigners: 3,
      approvalExpiryHours: 72,
      ...config,
    };

    // Initialize role authorities
    for (const ra of DEFAULT_ROLE_AUTHORITIES) {
      this.roleAuthorities.set(ra.role, new Set(ra.actions));
    }
  }

  // ─── Signer Management ─────────────────────────────────────────

  /**
   * Register a signer. Used during initial setup or after rotation approval.
   */
  registerSigner(params: {
    role: SignerRole;
    xrplAddress: string;
    stellarPublicKey?: string;
    weight?: number;
    addedBy: string;
  }): Signer {
    const signer: Signer = {
      id: `SIGNER-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      role: params.role,
      xrplAddress: params.xrplAddress,
      stellarPublicKey: params.stellarPublicKey,
      weight: params.weight || 1,
      active: true,
      addedAt: new Date().toISOString(),
      addedBy: params.addedBy,
    };

    this.signers.set(signer.id, signer);
    this.emit('signer_registered', signer);
    return signer;
  }

  /**
   * Deactivate a signer (after rotation approval).
   */
  deactivateSigner(signerId: string, removedBy: string): void {
    const signer = this.signers.get(signerId);
    if (!signer) throw new Error(`Signer not found: ${signerId}`);
    if (!signer.active) throw new Error(`Signer already inactive: ${signerId}`);

    const activeCount = this.getActiveSigners().length;
    if (activeCount <= this.config.minimumSigners) {
      throw new Error(
        `Cannot deactivate: minimum ${this.config.minimumSigners} active signers required. ` +
        `Currently active: ${activeCount}`
      );
    }

    signer.active = false;
    signer.removedAt = new Date().toISOString();
    signer.removedBy = removedBy;
    this.emit('signer_deactivated', { signerId, removedBy });
  }

  getActiveSigners(): Signer[] {
    return Array.from(this.signers.values()).filter((s) => s.active);
  }

  getSignersByRole(role: SignerRole): Signer[] {
    return this.getActiveSigners().filter((s) => s.role === role);
  }

  getSigner(signerId: string): Signer | undefined {
    return this.signers.get(signerId);
  }

  // ─── Authority Checks ──────────────────────────────────────────

  /**
   * Check if a signer role has authority for an action.
   */
  hasAuthority(role: SignerRole, action: GovernanceAction): boolean {
    const actions = this.roleAuthorities.get(role);
    return actions ? actions.has(action) : false;
  }

  /**
   * Validate that a signer can initiate an action.
   * Throws if unauthorized.
   */
  enforceAuthority(signerId: string, action: GovernanceAction): void {
    const signer = this.signers.get(signerId);
    if (!signer) throw new Error(`Unknown signer: ${signerId}`);
    if (!signer.active) throw new Error(`Signer is inactive: ${signerId}`);
    if (!this.hasAuthority(signer.role, action)) {
      throw new Error(
        `Signer ${signerId} (role: ${signer.role}) lacks authority for: ${action}`
      );
    }
  }

  // ─── Approval Workflow ─────────────────────────────────────────

  /**
   * Create a new approval request.
   * The action must be authorized for the requesting signer's role.
   */
  createApprovalRequest(params: {
    action: GovernanceAction;
    description: string;
    payload: Record<string, unknown>;
    requestedBy: string;
    thresholdOverride?: number;
  }): ApprovalRequest {
    this.enforceAuthority(params.requestedBy, params.action);

    const threshold = params.thresholdOverride ||
      (params.action === 'config_change' ? this.config.quorumForConfigChange : this.config.threshold);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.config.approvalExpiryHours);

    const request: ApprovalRequest = {
      id: `APPR-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      action: params.action,
      description: params.description,
      requiredThreshold: threshold,
      approvals: [],
      status: 'pending',
      payload: params.payload,
      createdAt: new Date().toISOString(),
      createdBy: params.requestedBy,
      expiresAt: expiresAt.toISOString(),
      hash: '',
    };

    // Hash the request for integrity
    request.hash = crypto.createHash('sha256')
      .update(JSON.stringify({ ...request, hash: '' }))
      .digest('hex');

    this.approvalRequests.set(request.id, request);
    this.emit('approval_requested', request);
    return request;
  }

  /**
   * Submit a vote on an approval request.
   */
  vote(requestId: string, signerId: string, vote: 'approve' | 'reject', reason: string): ApprovalRequest {
    const request = this.approvalRequests.get(requestId);
    if (!request) throw new Error(`Approval request not found: ${requestId}`);
    if (request.status !== 'pending') throw new Error(`Request is not pending: ${request.status}`);

    // Check expiry
    if (new Date() > new Date(request.expiresAt)) {
      request.status = 'expired';
      this.emit('approval_expired', request);
      throw new Error(`Approval request expired at ${request.expiresAt}`);
    }

    const signer = this.signers.get(signerId);
    if (!signer) throw new Error(`Unknown signer: ${signerId}`);
    if (!signer.active) throw new Error(`Signer is inactive: ${signerId}`);

    // Prevent duplicate votes
    if (request.approvals.some((a) => a.signerId === signerId)) {
      throw new Error(`Signer ${signerId} has already voted on this request`);
    }

    const voteRecord: ApprovalVote = {
      signerId,
      role: signer.role,
      vote,
      reason,
      timestamp: new Date().toISOString(),
      hash: crypto.createHash('sha256')
        .update(JSON.stringify({ signerId, requestId, vote, reason, timestamp: new Date().toISOString() }))
        .digest('hex'),
    };

    request.approvals.push(voteRecord);

    // Check if threshold met
    const approveCount = request.approvals.filter((a) => a.vote === 'approve').length;
    const rejectCount = request.approvals.filter((a) => a.vote === 'reject').length;
    const activeSignerCount = this.getActiveSigners().length;

    if (approveCount >= request.requiredThreshold) {
      request.status = 'approved';
      request.resolvedAt = new Date().toISOString();
      this.emit('approval_granted', request);
    } else if (rejectCount > activeSignerCount - request.requiredThreshold) {
      // Impossible to reach threshold
      request.status = 'rejected';
      request.resolvedAt = new Date().toISOString();
      this.emit('approval_rejected', request);
    }

    return request;
  }

  /**
   * Check if an approval request has been approved.
   */
  isApproved(requestId: string): boolean {
    const request = this.approvalRequests.get(requestId);
    return request ? request.status === 'approved' : false;
  }

  /**
   * Enforce that an approval request is approved before proceeding.
   */
  enforceApproval(requestId: string, operationDescription: string): void {
    if (!this.isApproved(requestId)) {
      const request = this.approvalRequests.get(requestId);
      const status = request ? request.status : 'not_found';
      const approveCount = request ? request.approvals.filter((a) => a.vote === 'approve').length : 0;
      const threshold = request ? request.requiredThreshold : '?';
      throw new Error(
        `GOVERNANCE BLOCK — ${operationDescription}\n` +
        `Approval status: ${status} (${approveCount}/${threshold} approvals)`
      );
    }
  }

  getApprovalRequest(requestId: string): ApprovalRequest | undefined {
    return this.approvalRequests.get(requestId);
  }

  getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.approvalRequests.values()).filter((r) => r.status === 'pending');
  }

  // ─── Signer Rotation ───────────────────────────────────────────

  /**
   * Propose a signer rotation (add, remove, or replace).
   * Rotation requires its own approval workflow with notice period.
   */
  proposeRotation(params: {
    type: 'add' | 'remove' | 'replace';
    proposedSigner?: { role: SignerRole; xrplAddress: string; stellarPublicKey?: string; weight?: number; addedBy: string };
    removedSignerId?: string;
    proposedBy: string;
  }): SignerRotation {
    // Validate the proposer is an active signer
    const proposer = this.signers.get(params.proposedBy);
    if (!proposer || !proposer.active) {
      throw new Error(`Proposer must be an active signer: ${params.proposedBy}`);
    }

    if (params.type === 'remove' || params.type === 'replace') {
      if (!params.removedSignerId) throw new Error('removedSignerId required for remove/replace');
      const target = this.signers.get(params.removedSignerId);
      if (!target) throw new Error(`Target signer not found: ${params.removedSignerId}`);
    }

    if (params.type === 'add' || params.type === 'replace') {
      if (!params.proposedSigner) throw new Error('proposedSigner required for add/replace');
    }

    const effectiveDate = new Date();
    effectiveDate.setDate(effectiveDate.getDate() + this.config.signerRotationNoticeDays);

    const rotation: SignerRotation = {
      id: `ROT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      type: params.type,
      proposedSigner: params.proposedSigner
        ? { ...params.proposedSigner, weight: params.proposedSigner.weight ?? 1 }
        : undefined,
      removedSignerId: params.removedSignerId,
      noticePeriodDays: this.config.signerRotationNoticeDays,
      proposedAt: new Date().toISOString(),
      effectiveDate: effectiveDate.toISOString(),
      status: 'proposed',
      approvals: [],
      requiredApprovals: this.config.signerRotationApprovals,
    };

    this.rotations.set(rotation.id, rotation);
    this.emit('rotation_proposed', rotation);
    return rotation;
  }

  /**
   * Approve a signer rotation proposal.
   */
  approveRotation(rotationId: string, signerId: string, reason: string): SignerRotation {
    const rotation = this.rotations.get(rotationId);
    if (!rotation) throw new Error(`Rotation not found: ${rotationId}`);
    if (rotation.status !== 'proposed') throw new Error(`Rotation is not in proposed state: ${rotation.status}`);

    const signer = this.signers.get(signerId);
    if (!signer || !signer.active) throw new Error(`Signer must be active: ${signerId}`);

    if (rotation.approvals.some((a) => a.signerId === signerId)) {
      throw new Error(`Signer ${signerId} already approved this rotation`);
    }

    rotation.approvals.push({
      signerId,
      role: signer.role,
      vote: 'approve',
      reason,
      timestamp: new Date().toISOString(),
      hash: crypto.createHash('sha256')
        .update(JSON.stringify({ signerId, rotationId, reason }))
        .digest('hex'),
    });

    if (rotation.approvals.length >= rotation.requiredApprovals) {
      rotation.status = 'approved';
      this.emit('rotation_approved', rotation);
    }

    return rotation;
  }

  /**
   * Execute an approved rotation after notice period.
   */
  executeRotation(rotationId: string): void {
    const rotation = this.rotations.get(rotationId);
    if (!rotation) throw new Error(`Rotation not found: ${rotationId}`);
    if (rotation.status !== 'approved') throw new Error(`Rotation not approved: ${rotation.status}`);

    const now = new Date();
    const effective = new Date(rotation.effectiveDate);
    if (now < effective) {
      throw new Error(`Notice period not elapsed. Effective date: ${rotation.effectiveDate}`);
    }

    // Execute the rotation
    if (rotation.type === 'remove' || rotation.type === 'replace') {
      if (rotation.removedSignerId) {
        this.deactivateSigner(rotation.removedSignerId, 'governance-rotation');
      }
    }

    if ((rotation.type === 'add' || rotation.type === 'replace') && rotation.proposedSigner) {
      this.registerSigner(rotation.proposedSigner);
    }

    rotation.status = 'executed';
    this.emit('rotation_executed', rotation);
  }

  // ─── Threshold Queries ─────────────────────────────────────────

  getThresholdForAction(action: GovernanceAction): number {
    if (action === 'config_change') return this.config.quorumForConfigChange;
    if (action === 'pause_issuance') return this.config.emergencyPauseRequires;
    if (action === 'resume_issuance') return this.config.emergencyResumeRequires;
    return this.config.threshold;
  }

  getConfig(): Readonly<GovernanceConfig> {
    return { ...this.config };
  }
}

export default MultisigGovernor;
