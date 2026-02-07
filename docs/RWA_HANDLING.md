# OPTKAS Real World Asset Handling

> Owner: OPTKAS1-MAIN SPV
> Version: 1.0.0 | 2026-02-06

---

## The Four Independence Rules

These rules govern every aspect of how the OPTKAS platform handles real world assets. They are non-negotiable and are enforced at every layer.

### Rule 1: Asset ≠ Token

The real world asset (bond, collateral, property, receivable) exists independently of any token, IOU, or on-chain representation.

- The bond exists because of a signed indenture, not because of an XRPL IOU.
- Destroying every IOU does not affect the bond's legal existence.
- The IOU is a **claim receipt** — a digital representation that evidences participation.

### Rule 2: Token ≠ Ownership

Holding an OPTKAS.BOND IOU on XRPL does not constitute legal ownership of the bond.

- Legal ownership is determined by the off-chain bond registry and indenture.
- The IOU holder has a claim receipt that references their participation.
- Transfer of an IOU may or may not transfer claim rights — this is governed by the legal documents, not the ledger.

### Rule 3: Ownership ≠ Custody

The legal owner of a bond position and the custodian of the underlying collateral are independent.

- OPTKAS1-MAIN SPV is the issuer.
- The qualified custodian holds collateral per the control agreement.
- The trustee represents lender interests.
- No single entity has both ownership authority and custody control.

### Rule 4: Custody ≠ Ledger Representation

The custodian's records are authoritative. Ledger representations are evidence.

- If the custodian says they hold $10M in escrow and the XRPL says $9.9M, the custodian's records govern.
- Discrepancies trigger reconciliation alerts, not automatic correction.
- Ledger data is used for transparency, audit, and settlement coordination — never as the single source of truth for asset positions.

---

## Asset Lifecycle

### 1. Asset Origination

```
Real World                    Platform                      Ledger
    │                            │                            │
    │  Bond indenture signed     │                            │
    │  ─────────────────────▶    │                            │
    │                            │  Hash indenture             │
    │                            │  ───────────────────────▶   │
    │                            │  Attestation tx on XRPL    │
    │                            │  ◀───────────────────────   │
    │  Collateral deposited      │                            │
    │  ─────────────────────▶    │                            │
    │                            │  Hash deposit confirmation │
    │                            │  ───────────────────────▶   │
    │                            │  Attestation tx on XRPL    │
    │                            │  ◀───────────────────────   │
```

### 2. Tokenization (Representation)

```
Platform                      XRPL                        Stellar
    │                            │                            │
    │  Deploy trustline           │                            │
    │  ─────────────────────▶    │                            │
    │                            │                            │
    │  Issue IOU (claim receipt)  │                            │
    │  ─────────────────────▶    │                            │
    │                            │                            │
    │  Issue regulated asset      │                            │
    │  ──────────────────────────────────────────────────▶    │
    │                            │                            │
```

**Critical**: Tokenization does NOT create the asset. The asset already exists off-chain. Tokenization creates a **reference** to it.

### 3. Active Management

During the bond's life:

| Action | Where | Evidence |
|---|---|---|
| Interest calculation | Platform (Layer 3) | Audit log |
| Interest payment | Banking rails (Layer 2) | Attestation on XRPL |
| Collateral monitoring | Custodian + Platform | Periodic attestation |
| Compliance reporting | Platform (Layer 3) | Audit report + hash |
| IOU transfer (if permitted) | XRPL (Layer 5) | XRPL transaction |
| Regulated asset transfer | Stellar (Layer 5) | Stellar transaction |

### 4. Redemption / Unwinding

```
Bond Maturity
    │
    ▼
Platform calculates final amounts per indenture
    │
    ▼
Custodian releases collateral per control agreement
    │
    ▼
SPV pays redemption via banking rails
    │
    ▼
IOUs burned (returned to issuer, trustlines can be removed)
    │
    ▼
Regulated assets on Stellar revoked/burned
    │
    ▼
Final attestation: lifecycle complete
    │
    ▼
Audit report generated for full lifecycle
```

---

## Collateral Handling

### Eligible Collateral

| Type | Valuation Method | Haircut | Custodian Requirements |
|---|---|---|---|
| U.S. Treasury securities | Market value (daily) | 2-5% | Qualified custodian with Fed access |
| Investment-grade corporate bonds | Market value (daily) | 5-15% | Qualified custodian |
| Cash / Money market | Par value | 0% | FDIC-insured institution |
| Real property | Independent appraisal (quarterly) | 25-40% | Title company + trustee |
| Receivables | Discounted cash flow (monthly) | 10-20% | Servicer + trustee |

### Collateral Controls

1. **Over-collateralization**: Minimum 125% coverage ratio required.
2. **Independent valuation**: No self-assessment permitted.
3. **Continuous monitoring**: LTV checked daily for liquid collateral, monthly for illiquid.
4. **Margin calls**: Triggered at 80% LTV. Treasury + Trustee notified.
5. **Forced liquidation**: Initiated at 90% LTV per waterfall in bond indenture.

### Collateral on Ledger

Collateral details are **NOT** stored on any ledger. Only:
- Hash of collateral valuation report → attested on XRPL.
- Coverage ratio snapshot → included in attestation memo.
- Margin call events → logged and attested.
- Liquidation events → logged and attested.

---

## Reconciliation

### Daily Reconciliation

| Check | Source A | Source B | Tolerance | Action on Breach |
|---|---|---|---|---|
| Total IOUs outstanding | XRPL ledger query | Platform database | 0 (exact match) | Compliance alert |
| Escrow balances | XRPL escrow query | Custodian records | 0.01% | Compliance alert |
| Regulated asset supply | Stellar query | Platform database | 0 (exact match) | Compliance alert |
| Collateral coverage | Custodian report | Platform calculation | 1% | Treasury + Trustee review |

### Reconciliation Script

`reconcile-ledgers.ts --config config/platform-config.yaml --network testnet`

Output: structured reconciliation report with pass/fail for each check, discrepancy details, and recommended actions.

---

## Language Guidelines for External Communication

When describing RWA handling to any external party:

**DO say**:
- "Ledger representations provide evidence and transparency for off-chain assets."
- "IOUs serve as claim receipts that reference legal instruments."
- "The bond exists as a legally issued instrument; ledger entries facilitate settlement."
- "Custody is maintained through qualified, regulated custodians."

**DO NOT say**:
- "We put assets on the blockchain."
- "The token IS the asset."
- "Smart contracts hold the collateral."
- "Decentralized custody" or "trustless escrow" (in institutional context).
