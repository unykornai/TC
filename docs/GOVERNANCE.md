# OPTKAS Governance Framework

> Owner: OPTKAS1-MAIN SPV
> Version: 1.0.0 | 2026-02-06

---

## Governance Principles

1. **No unilateral action**: Every fund-moving operation requires multi-signature approval.
2. **Role separation**: Treasury, Compliance, and Trustee roles are held by independent parties.
3. **Automation prepares, humans approve**: Layer 3 (automation) constructs and validates transactions. Only authorized signers execute.
4. **Transparency by default**: All governance actions are logged and hash-attested on public ledgers.
5. **Fail-safe**: Any signer can trigger emergency pause. Resumption requires threshold approval.

---

## Multi-Signature Architecture

### Signer Roles

| Role | Responsibility | Held By |
|---|---|---|
| Treasury | Authorize fund movements, escrow releases, IOU issuance | OPTKAS1-MAIN SPV CFO/Treasurer |
| Compliance | Approve compliance-dependent operations, verify KYC/AML gates | Independent Compliance Officer |
| Trustee | Protect lender interests, authorize collateral actions | Independent Trustee (e.g., Wilmington Trust) |

### Thresholds

| Operation | Required Signers | Threshold |
|---|---|---|
| IOU issuance | Treasury + Compliance | 2 of 3 |
| Escrow creation | Treasury + Compliance | 2 of 3 |
| Escrow release | Treasury + Trustee | 2 of 3 |
| Trustline setup | Treasury + Compliance | 2 of 3 |
| AMM provisioning | Treasury + Compliance | 2 of 3 |
| Emergency pause | Any single signer | 1 of 3 |
| Resume from pause | Treasury + Compliance + Trustee | 3 of 3 |
| Signer rotation | 2 of 3 current signers | 2 of 3 |
| Platform upgrade | Treasury + Compliance + Trustee | 3 of 3 |

### XRPL Multi-Sig Configuration

All XRPL accounts (issuer, treasury, escrow, attestation) are configured with:

```
SignerListSet:
  SignerQuorum: 2
  SignerEntries:
    - Account: <treasury_signer>  | SignerWeight: 1
    - Account: <compliance_signer> | SignerWeight: 1
    - Account: <trustee_signer>   | SignerWeight: 1
```

### Stellar Multi-Sig Configuration

Stellar accounts use equivalent threshold settings:

```
SetOptions:
  lowThreshold: 1      # Read operations
  medThreshold: 2      # Trust operations
  highThreshold: 3     # Administrative (signer changes)
  Signers:
    - key: <treasury_stellar_key>   | weight: 1
    - key: <compliance_stellar_key> | weight: 1
    - key: <trustee_stellar_key>    | weight: 1
```

---

## Emergency Pause Protocol

### Trigger Conditions

Any signer may trigger an emergency pause for:
- Suspected unauthorized access
- Regulatory order or inquiry
- Collateral value breach below threshold
- Operational anomaly detected by audit system
- Signer compromise (suspected or confirmed)

### Pause Effects

When pause is triggered:

| System | Effect |
|---|---|
| XRPL IOU issuance | Blocked — automation will not prepare transactions |
| XRPL escrow release | Blocked — condition checking suspended |
| Stellar transfers | Blocked — authorization revoked on regulated assets |
| AMM operations | Halted — no new provisions or trades |
| Trading engine | Stopped — all orders cancelled |
| Audit logging | **Continues** — all events during pause are logged |
| Attestation | **Continues** — pause/resume events are anchored |

### Resume Protocol

1. Root cause identified and documented.
2. All 3 signers review incident report.
3. Unanimous approval (3 of 3) required to resume.
4. Resume event attested on both ledgers.
5. Post-incident report filed and hashed.

---

## Signer Rotation

### Process

1. Rotation proposed by any current signer.
2. Outgoing signer confirmed, incoming signer vetted (KYC/AML + conflict check).
3. 2 of 3 current signers approve rotation.
4. XRPL `SignerListSet` updated with new signer.
5. Stellar `SetOptions` updated with new signer.
6. Old signer keys revoked.
7. Rotation event attested on both ledgers.

### Key Management

- All signer keys stored in HSM or institutional KMS (never in code, never in config).
- `platform-config.yaml` stores **account addresses** only. Keys are resolved at runtime via HSM/KMS.
- Key ceremony required for initial setup and rotation.
- At least 2 signers must be present (physically or via verified video) for key ceremonies.

---

## Governance Audit Trail

Every governance action produces an audit event:

```typescript
interface GovernanceEvent {
  type: 'multisig_approval' | 'pause' | 'resume' | 'signer_rotation' | 'config_change';
  timestamp: string;    // ISO 8601
  actor: string;        // Signer role
  action: string;       // Human-readable description
  quorum: number;       // Required threshold
  approvals: string[];  // Roles that approved
  xrplTxHash?: string;  // If action resulted in XRPL transaction
  stellarTxHash?: string; // If action resulted in Stellar transaction
  documentHash?: string;  // SHA-256 of related document
}
```

All governance events are:
1. Logged to the platform audit system.
2. Hash-anchored on XRPL via `xrpl-attest-hash.ts`.
3. Retained for 7 years per compliance configuration.

---

## Decision Authority Matrix

| Decision | Authority | Governance Layer |
|---|---|---|
| Bond issuance terms | OPTKAS1-MAIN SPV Board + Legal Counsel | Off-chain / Legal |
| Collateral valuation | Independent Appraiser + Trustee review | Off-chain / Legal |
| Lender onboarding | Compliance Officer + KYC provider | Off-chain / Compliance |
| Platform configuration | Treasury + Compliance (2 of 3) | On-chain / Config |
| Network selection (testnet/mainnet) | Treasury + Compliance + Trustee (3 of 3) | On-chain / Config |
| Fee structure | OPTKAS1-MAIN SPV Board | Off-chain / Legal |
| Implementation changes | Unykorn 7777, Inc. (proposes) + OPTKAS (approves) | Off-chain / Technical |
| Audit scope | OPTKAS1-MAIN SPV + External Auditor | Off-chain / Compliance |
