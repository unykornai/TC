# OPTKAS Bond Funding Lifecycle

> Owner: OPTKAS1-MAIN SPV
> Version: 1.0.0 | 2026-02-06

---

## Preamble

The OPTKAS bond exists as a legally issued off-chain instrument. This document describes the institutional workflow for **funding** that bond using a combination of traditional banking rails and distributed ledger infrastructure (XRPL + Stellar).

At no point does any ledger issue, create, or confer ownership of the bond. Ledgers provide **evidence, transparency, and settlement coordination**.

---

## Phase 1 — Pre-Funding Preparation

### 1.1 Legal Readiness

| Item | Status Required | Layer |
|---|---|---|
| Bond indenture executed | Complete | 1 — Legal |
| SPV formation documents filed | Complete | 1 — Legal |
| UCC-1 financing statements filed | Complete | 1 — Legal |
| Control agreement with custodian | Complete | 1 — Legal |
| Security agreement executed | Complete | 1 — Legal |
| Legal opinion issued | Complete | 1 — Legal |

### 1.2 Custody Readiness

| Item | Status Required | Layer |
|---|---|---|
| Qualified custodian appointed | Complete | 2 — Custody |
| Escrow account opened | Complete | 2 — Custody |
| Fiat settlement accounts configured | Complete | 2 — Custody |
| Insurance coverage confirmed | Complete | 2 — Custody |

### 1.3 Ledger Readiness

| Item | Status Required | Layer |
|---|---|---|
| XRPL issuer account funded | Complete | 4/5 — Ledger |
| Trustlines deployed per config | Complete | 5 — Ledger |
| Attestation account funded | Complete | 4 — Ledger |
| Multisig configured on all accounts | Complete | 5 — Ledger |
| Stellar issuer account funded | Complete | 4/5 — Ledger |
| Stellar compliance flags set | Complete | 5 — Ledger |

### 1.4 Attestation of Readiness

**Action**: Hash all legal and custody documents. Anchor hashes to XRPL and Stellar.

**Result**: Immutable, timestamped proof that all prerequisites existed before funding commenced.

**Script**: `xrpl-attest-hash.ts --documents ./data_room/ --network testnet`

---

## Phase 2 — Lender Onboarding

### 2.1 Lender Due Diligence Package

Provide lenders with:

1. **Bond indenture** (off-chain legal document)
2. **Data room access** (hashed and attested)
3. **Collateral summary** (with independent valuation)
4. **Control agreement** (proving SPV control)
5. **Ledger attestation records** (XRPL/Stellar tx hashes proving document integrity)
6. **Platform governance documentation** (multisig, signer roles, controls)

### 2.2 Lender-Facing Explanation

> "The OPTKAS bond is a legally issued debt instrument held in a regulated custody structure. To enhance transparency and settlement efficiency, we anchor document integrity proofs to public ledgers (XRPL and Stellar). These ledger entries do not create or transfer ownership — they provide immutable evidence that specific documents existed at specific times, and they enable conditional settlement flows that reduce counterparty risk."

### 2.3 KYC/AML

All lender onboarding is subject to KYC/AML verification through regulated service providers. The platform provides integration boundaries (stubs) for KYC providers but does not perform verification directly.

---

## Phase 3 — Funding Execution

### 3.1 Fund Flow

```
Lender                                    OPTKAS
  │                                         │
  │  1. Wire fiat to escrow account         │
  │  ──────────────────────────────────▶    │
  │                                         │
  │  2. Custodian confirms receipt          │
  │  ◀──────────────────────────────────    │
  │                                         │
  │  3. XRPL escrow created (evidence)     │
  │  ◀──────────────────────────────────    │
  │         tx hash as proof                │
  │                                         │
  │  4. Compliance checks pass             │
  │  ──────────────────────────────────▶    │
  │                                         │
  │  5. Multisig approves release          │
  │  ──────────────────────────────────▶    │
  │                                         │
  │  6. Custodian releases fiat to SPV     │
  │  ──────────────────────────────────▶    │
  │                                         │
  │  7. Bond claim receipt IOU issued      │
  │  ◀──────────────────────────────────    │
  │         (OPTKAS.BOND on XRPL)          │
  │                                         │
  │  8. Settlement attested on-chain       │
  │  ◀──────────────────────────────────    │
  │         immutable proof                 │
```

### 3.2 Escrow Mechanics

1. **Fiat escrow**: Lender wires USD to custodian's escrow account. This is a **regulated, off-chain** escrow.
2. **XRPL escrow (optional)**: An XRPL `EscrowCreate` transaction records the conditional hold on-chain. This is **evidence**, not custody.
3. **Release conditions**: Compliance clearance + document verification + multisig approval.
4. **Script**: `xrpl-create-escrow.ts --template bond_funding --amount 1000000 --network testnet --dry-run`

### 3.3 IOU Issuance

After settlement:
- A `OPTKAS.BOND` IOU is issued to the lender's XRPL account.
- This IOU is a **claim receipt** — it proves the lender's participation.
- It does **not** constitute ownership of the bond.
- Redemption is governed by the off-chain bond indenture.

**Script**: `xrpl-issue-iou.ts --token OPTKAS.BOND --amount 1000000 --recipient <lender_xrpl_address> --network testnet --dry-run`

---

## Phase 4 — Servicing

### 4.1 Interest Payments

1. SPV calculates interest per bond indenture (Layer 3 — automation).
2. SPV funds payment via regulated banking rails (Layer 2).
3. Payment confirmation attested on XRPL (Layer 4).
4. Lender receives fiat; attestation provides proof.

### 4.2 Reporting

- Monthly compliance reports generated via `generate-audit-report.ts`.
- Reports include: outstanding balance, payment history, collateral status, escrow state, attestation records.
- Reports are hashed and anchored for integrity.

---

## Phase 5 — Maturity / Redemption

1. Bond reaches maturity per indenture terms.
2. SPV funds redemption via custodian (Layer 2).
3. `OPTKAS.BOND` IOUs are burned (returned to issuer and trustline removed).
4. Final attestation anchored: redemption complete.
5. Audit report generated covering full lifecycle.

---

## Phase 6 — Exception Handling

### 6.1 Default

| Step | Action | Layer |
|---|---|---|
| 1 | Default declared per bond indenture | 1 — Legal |
| 2 | Emergency pause triggered on platform | 3 — Automation |
| 3 | IOU transfers frozen (global freeze on issuer) | 5 — XRPL |
| 4 | Escrow releases blocked (pause state enforced) | 5 — XRPL |
| 5 | Trustee assumes control per agreement | 1 — Legal |
| 6 | Independent collateral valuation obtained | 1 — Legal |
| 7 | Collateral liquidation per waterfall priority | 2 — Custody |
| 8 | Recovery distribution to lenders per seniority | 2 — Custody |
| 9 | IOUs burned, trustlines removed | 5 — XRPL |
| 10 | Final attestation: default lifecycle complete | 4 — Evidence |

**Platform behavior during default:**
- `PauseManager.enforceNotPaused()` blocks all new transaction preparation.
- `Issuer.prepareGlobalFreeze()` is available for emergency IOU freeze.
- Audit logging continues throughout — all default events are recorded.
- Trustee has sole authority to direct collateral liquidation (Layer 1).
- Platform provides read-only dashboard and reporting during wind-down.

### 6.2 Dispute

Disputes are resolved **off-chain** per the bond indenture's arbitration clause.

| Step | Action | Authority |
|---|---|---|
| 1 | Dispute formally raised by lender or counterparty | Off-chain — legal |
| 2 | Any signer triggers platform pause | Any signer (1-of-3) |
| 3 | Disputed operations frozen; non-disputed may continue if 3-of-3 approve | Governance |
| 4 | Legal counsel and trustee review dispute | Off-chain — legal |
| 5 | If resolved: resume approvals collected, platform unpaused | 2-of-3 signers |
| 6 | If arbitration required: platform remains paused, trustee manages assets | Trustee |
| 7 | Arbitration outcome enforced off-chain; platform updated accordingly | Legal → Platform |
| 8 | All dispute events attested on both ledgers | Attestation engine |

**Critical rule:** No platform operation can resolve a legal dispute. The platform provides evidence and enforces operational holds — resolution is always off-chain.

### 6.3 Regulatory Inquiry

- All audit events are retained for 7 years per config.
- `generate-audit-report.ts` produces regulator-readable reports.
- Attestation records on XRPL/Stellar provide independent verification.
- Platform dashboard provides real-time read-only view for authorized auditors.

---

## Auditor-Facing Explanation

> "The OPTKAS platform uses a layered architecture where legal ownership and custody are maintained off-chain through conventional instruments (bond indenture, custodian agreements, UCC filings). Distributed ledgers (XRPL and Stellar) are used exclusively for evidence anchoring and settlement coordination. All ledger operations require multi-signature authorization. Automation prepares and validates transactions but cannot execute them unilaterally. The system produces structured audit trails with 7-year retention, and all critical documents are hash-attested on public ledgers for independent verifiability."

---

## Regulator-Facing Explanation

> "OPTKAS operates a bond funding platform that uses regulated custodians and banking partners for all custody and fiat settlement. The platform uses public distributed ledgers for three purposes: (1) immutable evidence of document existence and timing, (2) conditional settlement coordination to reduce counterparty risk, and (3) transparent proof of compliance actions. The platform does not perform banking, custody, or money transmission directly — these functions are provided through regulated partners subject to applicable licensing. All operations are governed by multi-signature controls with role-based authorization."
