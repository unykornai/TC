# OPTKAS Audit Specification

> Owner: OPTKAS1-MAIN SPV
> Version: 1.0.0 | 2026-02-06

---

## Audit Architecture

The OPTKAS audit system provides a continuous, immutable record of all platform operations. Every significant action is logged as a structured event, hash-attested on public ledgers, and retained for 7 years. The system is designed to satisfy the requirements of:

- **Big Four audit firms** — structured, complete, independently verifiable
- **Regulators** — comprehensive, searchable, jurisdiction-aware
- **Credit committees** — risk-focused, reconciled, transparent
- **Trustees** — governance-focused, signer-action complete

---

## Event Collection

### Sources

| Source | Events Generated | Collection Method |
|---|---|---|
| XRPL transactions | IOU issuance, escrow operations, attestations, DEX/AMM, trading | Transaction monitoring via xrpl.js subscription |
| Stellar transactions | Asset issuance, authorization changes, SEP protocol events, attestations | Horizon event stream |
| Platform automation | Compliance checks, configuration changes, reconciliation results | Direct logging from Layer 3 |
| Governance actions | Signer approvals, pauses, resumes, rotations | Governance module logging |
| External integrations | KYC results, custodian confirmations, banking status | Integration callback logging |

### Event Schema

```typescript
interface AuditEvent {
  id: string;                  // UUID v4
  type: AuditEventType;        // Enum of 15 required types
  timestamp: string;           // ISO 8601 UTC
  sequenceNumber: number;      // Monotonically increasing
  actor: {
    role: string;              // treasury | compliance | trustee | automation | system
    identifier: string;        // Signer address or service identifier
  };
  operation: {
    description: string;       // Human-readable
    layer: number;             // 1-5 per architecture
    component: string;         // Package/module that generated event
  };
  details: Record<string, unknown>;  // Event-specific payload
  ledgerEvidence: {
    xrpl?: {
      txHash: string;
      ledgerIndex: number;
      network: 'testnet' | 'mainnet';
    };
    stellar?: {
      txHash: string;
      ledgerSequence: number;
      network: 'testnet' | 'mainnet';
    };
  };
  attestation: {
    sha256: string;            // Hash of event data (excluding this field)
    anchoredOn: ('xrpl' | 'stellar')[];
  };
  compliance: {
    gatesChecked: string[];    // Which compliance gates were evaluated
    result: 'pass' | 'fail' | 'not_applicable';
  };
}

type AuditEventType =
  | 'iou_issued'
  | 'iou_transferred'
  | 'iou_burned'
  | 'escrow_created'
  | 'escrow_released'
  | 'escrow_cancelled'
  | 'attestation_anchored'
  | 'compliance_check_passed'
  | 'compliance_check_failed'
  | 'signer_approved'
  | 'multisig_executed'
  | 'config_changed'
  | 'emergency_pause'
  | 'emergency_resume'
  | 'audit_report_generated';
```

---

## Storage

### Primary Store

- Encrypted database (AES-256-GCM at rest).
- Append-only — events cannot be modified or deleted.
- Indexed by: type, timestamp, actor, ledger tx hash.

### Immutable Evidence

Every event's SHA-256 hash is anchored on:
1. **XRPL**: Via attestation account Payment with memo.
2. **Stellar**: Via attestation account ManageData operation.

This means: even if the primary database is compromised, the event hashes on public ledgers prove what was recorded and when.

### Retention

- **Duration**: 7 years from event timestamp.
- **Archive**: After 1 year, events move to cold storage (still accessible, higher latency).
- **Deletion**: Only after 7-year retention period and with compliance officer approval.

---

## Report Generation

### Script

`generate-audit-report.ts --type <report_type> --from <date> --to <date> --network testnet --config config/platform-config.yaml`

### Report Types

| Type | Contents | Primary Audience |
|---|---|---|
| `full` | All events in date range | External auditor |
| `transaction` | IOU, escrow, transfer events | Regulator |
| `compliance` | Compliance checks, sanctions, KYC events | Compliance officer |
| `governance` | Signer actions, pauses, rotations, config changes | Trustee |
| `risk` | Collateral, LTV, trading, reconciliation events | Credit committee |
| `sanctions` | Sanctions screening results | Compliance / FinCEN |
| `regulatory` | Complete regulatory package | Regulator on request |
| `annual` | Full year comprehensive | Board + external auditor |

### Report Format

```typescript
interface AuditReport {
  metadata: {
    reportId: string;
    type: string;
    generatedAt: string;
    generatedBy: string;
    dateRange: { from: string; to: string };
    network: 'testnet' | 'mainnet';
    eventCount: number;
    sha256: string;  // Hash of entire report
  };
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    compliancePassRate: number;
    governanceActions: number;
    attestationsAnchored: number;
  };
  events: AuditEvent[];
  reconciliation: {
    xrplIousOutstanding: string;
    stellarAssetsOutstanding: string;
    escrowsActive: number;
    discrepancies: any[];
  };
  attestation: {
    reportHash: string;
    xrplTxHash: string;  // Attestation of report itself
    stellarTxHash: string;
  };
}
```

---

## Reconciliation Audit

### Daily Automated Reconciliation

| Check | Description | Tolerance |
|---|---|---|
| IOU supply vs. funded amounts | Total OPTKAS.BOND IOUs must match total funded bond amounts | Exact (0) |
| Escrow state vs. custodian records | Active XRPL escrows must match custodian escrow confirmations | 0.01% |
| Stellar asset supply vs. platform records | OPTKAS-USD supply must match platform issuance log | Exact (0) |
| Attestation completeness | Every fund-moving event must have an attestation | 100% coverage |
| Signer action log vs. ledger multisig records | Every multisig execution must have matching signer approvals in log | Exact match |

### Reconciliation Report

Generated by `reconcile-ledgers.ts` and included in audit reports.

```typescript
interface ReconciliationReport {
  timestamp: string;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    expected: string;
    actual: string;
    discrepancy?: string;
    action?: string;
  }[];
  overallStatus: 'pass' | 'fail';
  sha256: string;
}
```

---

## Auditor Access

### Read-Only Access

External auditors receive:
1. API key with `audit_readonly` role.
2. IP-restricted access to audit query endpoints.
3. Ability to run `generate-audit-report.ts` (generates but cannot modify).
4. Direct access to XRPL/Stellar explorers to independently verify attestation hashes.

### Verification Workflow

```
Auditor receives report
    │
    ▼
Auditor checks report SHA-256 against XRPL/Stellar attestation
    │
    ▼
Auditor spot-checks individual events against ledger transactions
    │
    ▼
Auditor reconciles ledger state with report summary
    │
    ▼
Auditor issues opinion
```

The platform is designed so that an auditor can independently verify every claim without relying on the platform's own reporting.
