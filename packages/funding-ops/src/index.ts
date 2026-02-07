/**
 * @optkas/funding-ops — Public API
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 */

export {
  FundingPipeline,
  type FundingPipelineConfig,
  type FundingPipelineState,
  type FundingPhase,
  type FundingStatus,
  type TokenDefinition,
  type PhaseResult,
  type UnsignedTransactionRecord,
  type FundingError,
  type ActivationReport,
  type FundingReadinessReport,
  type ReadinessCheck,
} from './pipeline';

export {
  XRPLActivator,
  type XRPLActivationConfig,
  type AccountReadiness,
  type ActivationResult,
} from './xrpl-activator';

export {
  StellarActivator,
  type StellarActivationConfig,
  type StellarAccountReadiness,
  type StellarActivationResult,
} from './stellar-activator';

export {
  FundingReportGenerator,
  type FundingReport,
  type ReportSection,
} from './report-generator';

export {
  TransactionQueue,
  type QueuedTransaction,
  type TransactionSignature,
  type TxQueueConfig,
  type TxQueueSummary,
  type TxQueueAuditEntry,
  type TxStatus,
  type TxLedger,
} from './tx-queue';

export {
  AuditBridge,
  type AuditBridgeEvent,
  type AuditBridgeConfig,
  type AuditBridgeSummary,
  type AuditBridgeStats,
  type AuditSeverity,
  type AuditCategory,
  type AuditAnchorTarget,
} from './audit-bridge';

export {
  SettlementConnector,
  type ConnectedSettlement,
  type SettlementLegRecord,
  type SettlementConnectorEvent,
  type SettlementConnectorConfig,
  type SettlementConnectorSummary,
  type SettlementPhase,
  type SettlementConnectorModel,
} from './settlement-connector';

export {
  SponsorNote,
  type SponsorNoteConfig,
  type SponsorNoteState,
  type SponsorNoteSummary,
  type SponsorNoteEvent,
  type NoteStatus,
  type InterestMode,
  type SubordinationTier,
  type DefaultEventType,
  type AssignmentType,
  type NoteTerms,
  type AccrualRecord,
  type PaymentRecord,
  type AssignmentRecord,
  type DefaultEvent,
} from './sponsor-note';
