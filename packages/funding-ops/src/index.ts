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

export {
  BorrowingBase,
  type BorrowingBaseConfig,
  type BorrowingBaseSummary,
  type BorrowingBaseEvent,
  type BorrowingBaseCertificate,
  type CollateralPosition,
  type CollateralType,
  type CovenantCheck,
  type CovenantStatus,
  type BorrowingBaseException,
  type ExceptionSeverity,
  type CertificateStatus,
} from './borrowing-base';

export {
  FundingWaveAttestation,
  FUNDING_WAVE_DOCUMENTS,
  LENDER_DATA_ROOM_STRUCTURE,
  MEMO_SCHEMA_ID,
  DATA_ROOM_STRUCTURE_VERSION,
  type FundingWaveConfig,
  type FundingWaveSummary,
  type FundingWaveEvent,
  type FundingWaveMemoSchema,
  type FundingWaveReceipt,
  type WaveDocument,
  type WaveAttestation,
  type WaveStatus,
  type WaveVerificationResult,
  type DocumentVerification,
  type VerificationResult,
  type DocumentCategory,
  type DataRoomManifest,
  type DataRoomFolder,
  type DataRoomFile,
  type LenderEmail,
} from './funding-wave-attestation';
