# OPTKAS Sovereign Financial Platform — Architecture

> Owner: OPTKAS1-MAIN SPV
> Implementation Partner: Unykorn 7777, Inc.
> Version: 1.0.0 | 2026-02-06

---

## 1. System Purpose

This platform enables OPTKAS to fund its legally issued bond, manage capital flows, coordinate settlement across XRPL and Stellar, and operate treasury functions — all under OPTKAS's sole governance and control.

The system is **not** a crypto product. It is a **capital markets operating environment** that uses distributed ledgers for evidence, representation, settlement acceleration, and liquidity coordination.

---

## 2. Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 5 — Representation & Liquidity Plane                │
│  IOUs · Trustlines · Escrows · AMMs · DEX Orders            │
│  Ledgers: XRPL, Stellar                                     │
├─────────────────────────────────────────────────────────────┤
│  LAYER 4 — Ledger Evidence Plane                            │
│  Hash Anchoring · Issuance Attestations · Settlement        │
│  Receipts · Timestamped Proofs · Public Verifiability       │
│  Ledgers: XRPL (memos), Stellar (manage-data)               │
├─────────────────────────────────────────────────────────────┤
│  LAYER 3 — Automation & Intelligence Plane                  │
│  Document Generation · Compliance Pre-checks · Borrowing    │
│  Base Math · Waterfall Calcs · Risk Modeling · Algo Logic   │
│  Runtime: TypeScript/Node.js, Python                         │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2 — Custody & Banking Plane (Regulated)              │
│  Bank Escrow · Securities Custody · Fiat Settlement ·       │
│  FX Providers · Insurance Wrappers                           │
│  Partners: Qualified Custodians, Regulated Banks             │
├─────────────────────────────────────────────────────────────┤
│  LAYER 1 — Legal & Control Plane (Primary)                  │
│  SPV · Bond Indenture · UCC Filings · Control Agreements ·  │
│  Custodian Agreements · Transfer Agent · Jurisdictional Law  │
│  Authority: OPTKAS1-MAIN SPV                                 │
└─────────────────────────────────────────────────────────────┘
```

### Layer Interactions

- **Layer 1 is primary.** All authority, ownership, and legal enforceability originate here. No ledger activity overrides Layer 1.
- **Layer 2 is regulated.** Custody, fiat movement, and banking functions operate through licensed institutions.
- **Layer 3 is assistive.** Automation prepares, validates, and stages actions. It never executes final settlement.
- **Layer 4 is evidentiary.** Ledgers anchor immutable proof. They do not create or transfer legal ownership.
- **Layer 5 is representational.** Tokens and IOUs represent claims, receipts, or coordination instruments — not legal title.

---

## 3. Component Map

```
config/
  platform-config.yaml          ← Single source of truth

packages/
  xrpl-core/                    ← XRPL client, connection, transaction building
  stellar-core/                 ← Stellar client, connection, transaction building
  issuance/                     ← IOU creation, trustline management, freeze/clawback
  escrow/                       ← XRPL escrow create/finish/cancel, conditions
  attestation/                  ← Hash anchoring on both ledgers
  dex-amm/                      ← DEX order placement, AMM provisioning
  trading/                      ← Algorithmic execution, risk controls
  audit/                        ← Structured audit event logging and reporting

scripts/
  init-platform.ts              ← Validates config, creates directory structure
  validate-config.ts            ← Schema validation for platform-config.yaml
  xrpl-deploy-trustlines.ts     ← Configure trustlines per config
  xrpl-issue-iou.ts             ← Issue IOUs with preflight checks
  xrpl-create-escrow.ts         ← Create conditional escrows
  xrpl-attest-hash.ts           ← Anchor document hashes
  xrpl-provision-amm.ts         ← AMM liquidity operations
  xrpl-execute-algo.ts          ← Algorithmic trading (dry-run default)
  stellar-issue-asset.ts        ← Issue Stellar assets
  stellar-sep10-auth.ts         ← SEP-10 authentication flow
  stellar-sep24-deposit-withdraw.ts  ← Fiat on/off-ramp stubs
  stellar-attest-hash.ts        ← Hash anchoring on Stellar
  reconcile-ledgers.ts          ← Cross-ledger reconciliation
  generate-audit-report.ts      ← Produce audit reports

apps/
  dashboard/                    ← Read-only institutional monitoring UI
  docs-site/                    ← GitHub Pages documentation
```

---

## 4. Ledger Responsibilities

### XRPL

| Function | Mechanism | Layer |
|---|---|---|
| IOU issuance | TrustSet + Payment | 5 |
| Escrow | EscrowCreate/Finish/Cancel | 5 |
| Evidence anchoring | Payment with Memos | 4 |
| DEX trading | OfferCreate/Cancel | 5 |
| AMM liquidity | AMMCreate/Deposit/Withdraw | 5 |
| Multi-sig governance | SignerListSet | 5 |

### Stellar

| Function | Mechanism | Layer |
|---|---|---|
| Regulated asset issuance | ChangeTrust + Payment | 5 |
| Compliance flags | SetOptions (auth_required) | 5 |
| Evidence anchoring | ManageData | 4 |
| Cross-border settlement | PathPayment | 5 |
| Fiat on/off-ramp | SEP-24 Anchor | 2/5 |
| Authentication | SEP-10 | 3 |

### What Ledgers Do NOT Do

- Create legal ownership
- Replace custody
- Substitute for UCC filings
- Override contract law
- Act as a bank or custodian
- Store private keys
- Execute without human authorization

---

## 5. Data Flow

```
                    ┌──────────────┐
                    │ OPTKAS       │
                    │ Governance   │
                    │ (multisig)   │
                    └──────┬───────┘
                           │ authorize
                           ▼
┌──────────┐     ┌─────────────────┐     ┌──────────┐
│ Legal    │────▶│ Automation      │────▶│ XRPL     │
│ Documents│     │ Layer 3         │     │ Layer 4/5│
└──────────┘     │ (prepare/stage) │     └──────────┘
                 └────────┬────────┘            │
                          │                     │ evidence
                          ▼                     ▼
                 ┌─────────────────┐     ┌──────────┐
                 │ Custody/Banking │     │ Stellar  │
                 │ Layer 2         │     │ Layer 4/5│
                 │ (regulated)     │     └──────────┘
                 └─────────────────┘
```

---

## 6. Independence Guarantees

| Concern | Guarantee |
|---|---|
| Key ownership | OPTKAS holds all private keys. Unykorn holds none post-delivery. |
| Configuration | platform-config.yaml owned and versioned by OPTKAS. |
| Code | Open-source packages with no proprietary Unykorn dependencies. |
| Infrastructure | Runs on OPTKAS-controlled infrastructure. No Unykorn servers. |
| Governance | Multisig signers are OPTKAS-appointed roles. |
| Branding | No Unykorn branding in runtime UI or client-facing materials. |

---

## 7. Technology Stack

| Component | Technology |
|---|---|
| XRPL interactions | xrpl.js (TypeScript) |
| Stellar interactions | stellar-sdk (TypeScript) |
| CLI scripts | TypeScript / ts-node |
| Configuration | YAML (platform-config.yaml) |
| Audit logging | Structured JSONL |
| Dashboard | Static HTML/JS (read-only) |
| Documentation site | GitHub Pages |
| Key management | HSM/KMS (external — never in code) |
