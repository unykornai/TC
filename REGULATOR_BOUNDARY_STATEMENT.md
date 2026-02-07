# OPTKAS Platform — Regulator Boundary Statement

> Classification: PUBLIC — Prepared for Regulatory Review
> Date: 2026-02-07
> Entity: OPTKAS1-MAIN SPV
> Operator: Unykorn 7777, Inc.
> Platform: OPTKAS Sovereign Financial Platform v1.0.0

---

## Purpose of This Document

This document defines what the OPTKAS platform **does** and **does not do**, for the benefit of any regulatory authority reviewing the system. It provides explicit boundary statements regarding custody, money transmission, securities issuance, and the role of distributed ledger technology within the platform.

---

## 1. Platform Function

The OPTKAS platform is **administrative infrastructure** for managing the lifecycle of a legally issued secured bond. It performs four functions:

1. **Transaction preparation** — Assembles unsigned ledger transactions for human review and multisig approval
2. **Evidence recording** — Records cryptographic attestations of off-chain legal events (signatures, valuations, custodian confirmations)
3. **Compliance enforcement** — Applies configurable rules (freeze, pause, signer requirements) to enforce compliance controls
4. **Reconciliation** — Compares on-chain evidence against off-chain custodian records to detect discrepancies

**The platform does not execute transactions autonomously.** Every transaction requires approval from a minimum of 2 of 3 designated signers (Treasury Officer, Compliance Officer, Independent Trustee).

---

## 2. What the Platform Is NOT

### 2.1 NOT a Custodian

The platform **does not hold, control, or have access to any funds** — fiat or digital.

- All fiat funds are held by a qualified, regulated custodian under an executed control agreement
- All digital asset accounts are controlled by multisig wallets requiring human signer approval
- The platform has no private keys, no signing authority, and no ability to move any asset
- Per the TRUST_BOUNDARIES specification: *"Automation NEVER moves funds directly"*

### 2.2 NOT a Money Transmitter

The platform **does not transmit money or monetary value**.

- It prepares unsigned transaction proposals that must be approved and signed by human operators
- Settlement occurs through regulated banking channels (wire transfers to custodian escrow)
- On-chain activity represents **evidence** of off-chain events, not transfer of value
- The platform has no access to bank accounts, payment rails, or custodian withdrawal authority

### 2.3 NOT a Securities Issuer

The platform **does not issue, offer, or sell securities**.

- The bond is issued by OPTKAS1-MAIN SPV pursuant to a bond indenture executed under applicable law
- Digital tokens (IOUs on XRPL, regulated assets on Stellar) represent **claim receipts** — evidence that a participation interest exists per the off-chain legal record
- Token types are explicitly categorized as:
  - `claim_receipt` — evidence of bond participation (not the bond itself)
  - `settlement_token` — evidence of escrow activity (not custody of funds)
  - `evidence_token` — attestation anchor (not a financial instrument)
  - `regulated_asset` — Stellar-native asset with full auth/clawback controls (subject to SEP compliance)
- Per the RWA_HANDLING specification: *"Tokens do NOT create the asset. Tokens do NOT confer ownership. Ownership is maintained in the off-chain Master Register."*

### 2.4 NOT an Exchange or Trading Platform

- The DEX/AMM module is **disabled by default** and requires explicit governance approval to enable
- When enabled, it would operate on XRPL's native AMM and DEX — regulated by XRPL's protocol rules
- All AMM operations require multisig approval and enforce maximum slippage controls
- The platform is not a matching engine, order book, or broker-dealer facility

### 2.5 NOT an Autonomous Smart Contract System

- The platform prepares transactions; it does not execute them
- There is no autonomous logic that moves assets, makes lending decisions, or changes terms
- All material decisions require human-in-the-loop approval via multisig
- The emergency pause mechanism allows any single signer to halt all platform activity immediately

---

## 3. Ledger Usage — Evidence, Not Authority

The platform uses two distributed ledgers:

### 3.1 XRP Ledger (XRPL)

| Function | Usage | What It Is NOT |
|---|---|---|
| IOU issuance | Records claim receipt for bond participation | Not a security or ownership instrument |
| Escrow | Records conditional hold as evidence of funding intent | Not custody of funds |
| Memo attestation | Anchors hash of signed legal document | Not the legal document itself |
| Freeze | Per-trustline or global freeze for compliance enforcement | Not revocation of legal rights |

### 3.2 Stellar Network

| Function | Usage | What It Is NOT |
|---|---|---|
| Regulated asset | Token with auth-required + clawback for KYC-gated participation | Not a security |
| SEP-10 | Web authentication proving account control | Not identity verification |
| SEP-24 | Anchor-mediated deposit/withdrawal through regulated bank | Not money transmission by the platform |
| SEP-31 | Cross-border payment coordination through licensed anchor | Not direct cross-border remittance |

### 3.3 Hierarchy of Authority

Per the platform's 5-layer architecture:

| Layer | Role | Authority |
|---|---|---|
| 1. Legal | Bond indenture, control agreement, UCC filings | **PRIMARY — governs all** |
| 2. Custody | Qualified custodian, HSM key storage | Fiduciary, regulated |
| 3. Automation | This platform | Proposes only; cannot execute |
| 4. Evidence | Ledger records, memos, attestations | Informational; not authoritative |
| 5. Representation | IOUs, tokens, regulated assets | Claims only; not ownership |

**In any conflict between layers, the higher-numbered layer defers to the lower-numbered layer.** Legal (Layer 1) is always authoritative. Ledger records (Layer 4) and tokens (Layer 5) are evidence only.

---

## 4. Reliance on Licensed Partners

The platform relies on the following regulated/licensed entities for all material functions:

| Function | Entity Type | Requirement |
|---|---|---|
| Custody of funds | Qualified custodian | Registered, regulated, bonded |
| Banking / wire transfers | Licensed bank | Subject to banking regulations |
| KYC/AML verification | Licensed KYC provider | Integration stubs prepared |
| Legal opinion | Licensed attorney | Required before first issuance |
| Trustee oversight | Independent trustee | Fiduciary duty, signer authority |
| Cross-border settlement | Licensed Stellar anchor | SEP-24/31 compliant |
| Audit / attestation | Licensed auditor | Required for external validation |

**The platform does not substitute for any licensed function.** It coordinates workflows between licensed entities.

---

## 5. Compliance Controls

| Control | Description |
|---|---|
| Multi-signature | 2-of-3 approval required for all transactions |
| Emergency pause | Any 1 signer can halt; 2-of-3 required to resume |
| Freeze capability | Per-trustline and global freeze on XRPL; auth revocation on Stellar |
| Clawback | Enabled on Stellar for regulatory recovery; XRPL uses freeze+burn-back |
| Audit trail | Full event logging with 7-year retention and cryptographic hashing |
| Reconciliation | Cross-ledger + off-chain custodian record comparison |
| Signer rotation | 30-day notice, 2-of-3 approval, documented procedure |
| KYC/AML stubs | Ready for licensed provider integration |

---

## 6. Contact for Regulatory Inquiries

All regulatory inquiries regarding the OPTKAS platform should be directed to:

- **Entity**: OPTKAS1-MAIN SPV
- **Operator**: Unykorn 7777, Inc.
- **Compliance Contact**: [To be designated]
- **Legal Counsel**: [To be designated]

---

Prepared by: Phase 2 Validation — Regulatory Boundary Analysis
Date: 2026-02-07
