# OPTKAS Trust Boundaries

> Owner: OPTKAS1-MAIN SPV
> Version: 1.0.0 | 2026-02-06

---

## Overview

A trust boundary defines where one domain of authority ends and another begins. Every integration point, data handoff, and execution gate in the OPTKAS platform exists at a defined trust boundary. This document maps every boundary, states what crosses it, and defines the controls that govern each crossing.

---

## Boundary Map

```
┌─────────────────────────────────────────────────────────────┐
│                     EXTERNAL WORLD                          │
│   Lenders │ Regulators │ Rating Agencies │ Auditors         │
└──────┬──────────┬──────────┬───────────────┬────────────────┘
       │          │          │               │
       │ TB-1     │ TB-2     │ TB-3          │ TB-4
       │          │          │               │
┌──────▼──────────▼──────────▼───────────────▼────────────────┐
│              LAYER 1 — LEGAL & CONTROL PLANE                │
│   Bond Indenture │ SPV │ Control Agreements │ UCC Filings   │
└──────────────────────────┬──────────────────────────────────┘
                           │ TB-5
┌──────────────────────────▼──────────────────────────────────┐
│             LAYER 2 — CUSTODY & BANKING PLANE               │
│   Qualified Custodian │ Escrow Bank │ Fiat Rails            │
└──────────────────────────┬──────────────────────────────────┘
                           │ TB-6
┌──────────────────────────▼──────────────────────────────────┐
│          LAYER 3 — AUTOMATION & INTELLIGENCE PLANE          │
│   OPTKAS Platform │ Compliance Engine │ Audit System        │
└──────────┬───────────────┬──────────────────────────────────┘
           │ TB-7          │ TB-8
┌──────────▼───────┐  ┌───▼──────────────────────────────────┐
│  LAYER 4 — XRPL  │  │  LAYER 4 — STELLAR                  │
│  Evidence Plane   │  │  Evidence Plane                      │
└──────────┬───────┘  └───┬──────────────────────────────────┘
           │ TB-9          │ TB-10
┌──────────▼───────────────▼──────────────────────────────────┐
│              LAYER 5 — REPRESENTATION PLANE                 │
│   IOUs │ Regulated Assets │ Escrows │ AMMs │ Attestations   │
└─────────────────────────────────────────────────────────────┘
```

---

## Boundary Definitions

### TB-1: Lender ↔ Legal Plane

| Attribute | Value |
|---|---|
| What crosses | Investment commitment, KYC documentation, wire instructions |
| Direction | Bidirectional |
| Trust model | Legal contracts, signed agreements |
| Controls | KYC/AML verification, accredited investor verification, legal review |
| Authentication | Identity verification through regulated KYC provider |
| Data classification | PII — encrypted in transit and at rest |

### TB-2: Regulator ↔ Legal Plane

| Attribute | Value |
|---|---|
| What crosses | Regulatory filings, inquiry responses, audit reports |
| Direction | Bidirectional |
| Trust model | Regulatory authority |
| Controls | Legal counsel review before any disclosure |
| Authentication | Official channels only |
| Data classification | Confidential — need-to-know basis |

### TB-3: Rating Agency ↔ Legal Plane

| Attribute | Value |
|---|---|
| What crosses | Collateral data, financial statements, structural analysis |
| Direction | Primarily outbound |
| Trust model | NDA + engagement letter |
| Controls | Data room access controls, watermarked documents |
| Authentication | Credentialed access to data room |
| Data classification | Confidential |

### TB-4: Auditor ↔ Legal Plane

| Attribute | Value |
|---|---|
| What crosses | Full audit data, transaction records, governance logs |
| Direction | Primarily outbound |
| Trust model | Engagement letter, professional standards |
| Controls | Structured audit reports from `generate-audit-report.ts` |
| Authentication | Auditor-specific read-only access |
| Data classification | Confidential |

### TB-5: Legal Plane ↔ Custody Plane

| Attribute | Value |
|---|---|
| What crosses | Instructions to hold/release funds, escrow directives |
| Direction | Bidirectional |
| Trust model | Control agreement, custodian agreement |
| Controls | Multi-signature authorization required for all fund movements |
| Authentication | Authenticated instruction from authorized signers |
| Data classification | Restricted — fund movement instructions |

### TB-6: Custody Plane ↔ Automation Plane

| Attribute | Value |
|---|---|
| What crosses | Balance confirmations, settlement status, compliance flags |
| Direction | Bidirectional |
| Trust model | API integration with custodian; platform does NOT have direct fund access |
| Controls | Read-only queries from automation; fund instructions require signer approval |
| Authentication | API keys / OAuth with custodian systems |
| Data classification | Financial data — encrypted |
| Critical rule | **Automation NEVER moves funds directly. It prepares instructions for signer review.** |

### TB-7: Automation Plane ↔ XRPL Evidence Plane

| Attribute | Value |
|---|---|
| What crosses | Prepared transactions (unsigned), attestation hashes, query results |
| Direction | Bidirectional |
| Trust model | XRPL node (public or dedicated); transactions are cryptographically verified |
| Controls | All transactions prepared in dry-run first; multisig required for submission |
| Authentication | XRPL account signatures via HSM/KMS |
| Data classification | Public (on-ledger) — no PII on ledger |
| Critical rule | **No private keys in code. Keys resolved at runtime from HSM/KMS.** |

### TB-8: Automation Plane ↔ Stellar Evidence Plane

| Attribute | Value |
|---|---|
| What crosses | Prepared transactions, SEP protocol interactions, query results |
| Direction | Bidirectional |
| Trust model | Stellar Horizon API; transactions are cryptographically verified |
| Controls | Authorization flags on regulated assets; multisig required |
| Authentication | Stellar account signatures via HSM/KMS |
| Data classification | Public (on-ledger) — no PII on ledger |
| Critical rule | **Same key management rules as XRPL.** |

### TB-9: XRPL Evidence ↔ Representation Layer

| Attribute | Value |
|---|---|
| What crosses | IOU state, escrow conditions, AMM positions, attestation records |
| Direction | XRPL manages representation objects |
| Trust model | Cryptographic (XRPL consensus) |
| Controls | Trustline limits, escrow conditions, multisig |
| Critical rule | **Representations on XRPL are NOT legal ownership. They are evidence and settlement tools.** |

### TB-10: Stellar Evidence ↔ Representation Layer

| Attribute | Value |
|---|---|
| What crosses | Regulated asset balances, anchor deposit/withdrawal state |
| Direction | Stellar manages regulated representations |
| Trust model | Cryptographic (Stellar consensus) + authorization flags |
| Controls | Authorization required flag, clawback capability for compliance |
| Critical rule | **Same as TB-9. Representations are NOT legal ownership.** |

---

## Data That NEVER Crosses Boundaries

| Data Type | Reason |
|---|---|
| Private keys | Stored only in HSM/KMS; never transmitted |
| PII (names, SSNs, addresses) | Never written to any ledger; stored only in encrypted off-chain systems |
| Bond ownership records | Maintained off-chain in legal registry; ledger IOUs are claim receipts only |
| Custodian access credentials | Stored in vault; automation uses scoped API tokens only |

---

## Boundary Monitoring

Every boundary crossing generates:
1. A structured log event (Layer 3 audit system).
2. A hash attestation on the appropriate ledger (Layer 4).
3. An alert if the crossing violates expected parameters (Layer 3 compliance engine).

Monitoring is continuous. Alerts are routed to the appropriate signer based on boundary type.
