# OPTKAS Compliance Controls

> Owner: OPTKAS1-MAIN SPV
> Version: 1.0.0 | 2026-02-06

---

## Compliance Architecture

The OPTKAS platform does not perform banking, custody, money transmission, or KYC/AML directly. All regulated functions are performed through regulated partners. The platform provides:

1. **Integration boundaries** (stubs) for regulated service providers.
2. **Compliance gates** that block operations until external verification passes.
3. **Audit trails** with immutable attestation on public ledgers.
4. **Reporting tools** that generate regulator-readable output.

---

## KYC/AML Gates

### Gate Points

| Operation | Gate | Required Before |
|---|---|---|
| Lender onboarding | KYC/AML verification complete | Any funding commitment |
| IOU issuance | Compliance clearance | Issuing OPTKAS.BOND |
| Escrow release | Sanctions re-screening | Releasing escrowed funds |
| Stellar authorization | KYC + jurisdiction check | Authorizing OPTKAS-USD holder |
| Cross-border settlement | SEP-31 compliance | International wire execution |

### Integration Stubs

```typescript
interface KYCProvider {
  verifyIdentity(lenderId: string): Promise<KYCResult>;
  screenSanctions(entityName: string): Promise<SanctionsResult>;
  checkJurisdiction(country: string): Promise<JurisdictionResult>;
}

interface KYCResult {
  status: 'approved' | 'pending' | 'rejected';
  verificationId: string;
  timestamp: string;
  provider: string;
  expiresAt: string;
}

// Platform enforces the gate — provider performs the verification
```

### Compliance Flag Tracking

Every participant has a compliance status:

| Flag | Meaning | Effect |
|---|---|---|
| `kyc_verified` | Identity verified by KYC provider | Can proceed with funding |
| `sanctions_clear` | Not on any sanctions list | Can receive IOUs/assets |
| `jurisdiction_approved` | Operating in approved jurisdiction | Can participate |
| `accredited_investor` | Verified accredited (if applicable) | Can access specific offerings |
| `compliance_hold` | Issue flagged by compliance | All operations blocked |

---

## Sanctions Compliance

### Screening Points

1. **Onboarding**: Full sanctions screening before any participation.
2. **Each transaction**: Re-screening before IOU issuance, escrow release, or asset authorization.
3. **Periodic**: Monthly re-screening of all active participants.

### Sanctions Lists Checked

- OFAC SDN List
- OFAC Consolidated Sanctions List
- EU Sanctions List
- UN Security Council Sanctions
- UK HMT Sanctions
- Additional lists per legal counsel recommendation

### Positive Match Protocol

1. Operation immediately blocked.
2. Compliance signer notified.
3. Legal counsel engaged.
4. SAR filed if required.
5. If false positive confirmed: operation released with documentation.
6. If true positive: participant frozen; regulatory reporting initiated.
7. All actions logged and attested.

---

## Regulatory Reporting

### Report Types

| Report | Audience | Trigger | Script |
|---|---|---|---|
| Transaction summary | Regulators | On request | `generate-audit-report.ts --type transaction` |
| Compliance status | Internal | Weekly | `generate-audit-report.ts --type compliance` |
| Sanctions screening log | Compliance officer | Monthly | `generate-audit-report.ts --type sanctions` |
| SAR (Suspicious Activity) | FinCEN | As needed | Manual — legal counsel prepares |
| Annual compliance review | Board + auditor | Annual | `generate-audit-report.ts --type annual` |

### Report Contents

Each compliance report includes:
- Participant list with compliance flag status
- Transactions processed with compliance gate results
- Sanctions screening results (summary, not PII)
- Exceptions and holds with resolution status
- XRPL/Stellar attestation hashes for independent verification

---

## Jurisdiction Controls

### Approved Jurisdictions

Maintained in `platform-config.yaml`:

```yaml
compliance:
  approved_jurisdictions:
    - US
    - GB
    - CH
    - SG
    - JP
    - EU  # EU member states
```

### Restricted Jurisdictions

Operations are blocked for participants in:
- OFAC-sanctioned countries
- FATF blacklisted jurisdictions
- Countries with no bilateral legal assistance treaty

### Jurisdiction Check Flow

```
Participant requests access
    │
    ▼
Platform checks jurisdiction against approved list
    │
    ├── Approved → Continue to KYC
    │
    ├── Restricted → Block + notify compliance
    │
    └── Unknown → Hold + manual review by compliance officer
```

---

## Token/IOU Compliance

### XRPL IOUs

- IOUs are claim receipts, not securities (per legal opinion).
- Transfer restrictions enforced by:
  - Trustline requirements (holder must create trustline to issuer)
  - Platform-level approval before trustline setup
  - No transferability by default (configurable)
- If regulators classify IOUs as securities: platform can freeze transfers + implement Reg D/S controls.

### Stellar Regulated Assets

- AUTH_REQUIRED: All holders must be authorized by issuer.
- AUTH_REVOCABLE: Issuer can freeze accounts.
- AUTH_CLAWBACK: Issuer can reclaim assets (court order, sanctions).
- This is the most compliance-friendly asset framework available on any public ledger.

---

## Audit Trail Requirements

### Event Retention

- **Duration**: 7 years (configurable in platform-config.yaml)
- **Format**: Structured JSON with schema validation
- **Storage**: Encrypted database + hash attestation on XRPL/Stellar

### Required Events (15 types per config)

1. `iou_issued`
2. `iou_transferred`
3. `iou_burned`
4. `escrow_created`
5. `escrow_released`
6. `escrow_cancelled`
7. `attestation_anchored`
8. `compliance_check_passed`
9. `compliance_check_failed`
10. `signer_approved`
11. `multisig_executed`
12. `config_changed`
13. `emergency_pause`
14. `emergency_resume`
15. `audit_report_generated`

### Event Schema

```typescript
interface AuditEvent {
  id: string;            // UUID
  type: string;          // One of 15 types above
  timestamp: string;     // ISO 8601
  actor: string;         // Role or system identifier
  details: Record<string, unknown>;  // Event-specific data
  xrplTxHash?: string;  // If XRPL transaction involved
  stellarTxHash?: string; // If Stellar transaction involved
  attestationHash?: string; // SHA-256 of event data
  complianceFlags?: string[]; // Compliance gates that were checked
}
```
