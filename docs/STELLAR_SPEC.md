# OPTKAS Stellar Specification

> Owner: OPTKAS1-MAIN SPV
> Version: 1.0.0 | 2026-02-06

---

## Stellar Role in Architecture

Stellar serves as **Layer 4 (Evidence)** and **Layer 5 (Representation)** for:
- Regulated asset issuance (OPTKAS-USD)
- SEP-10 authentication (web-based identity verification)
- SEP-24 interactive deposit/withdrawal (fiat on/off ramp coordination)
- SEP-31 cross-border payments (institutional settlement)
- Document hash attestation (complementary to XRPL)

Stellar does **NOT** serve as:
- Legal ownership registry
- Custodian of assets
- Replacement for banking or custody infrastructure
- Primary settlement layer (XRPL is primary; Stellar handles cross-border and regulatory-compliant flows)

---

## Account Architecture

All accounts are defined in `config/platform-config.yaml`. Keys are stored in HSM/KMS.

| Account | Purpose | Thresholds | Authorization Required |
|---|---|---|---|
| `issuer` | Issues regulated assets (OPTKAS-USD) | low:1, med:2, high:3 | Yes — all holders must be authorized |
| `distribution` | Distributes assets to authorized holders | low:1, med:2, high:3 | N/A — holds issued supply |
| `anchor` | SEP protocol endpoint for deposit/withdrawal | low:1, med:2, high:3 | N/A |

### Account Setup Sequence

```
1. Create accounts (testnet faucet or friendbot for testnet; funded from treasury for mainnet)
2. Configure signers on each account:
   - treasury_signer: weight 1
   - compliance_signer: weight 1
   - trustee_signer: weight 1
3. Set thresholds:
   - Low: 1 (read/trust operations)
   - Medium: 2 (payments, authorization)
   - High: 3 (signer changes, account merge)
4. Set issuer flags:
   - AUTH_REQUIRED: true (all holders must be authorized)
   - AUTH_REVOCABLE: true (enables compliance actions)
   - AUTH_CLAWBACK_ENABLED: true (enables regulatory recovery)
5. Issue initial supply from issuer → distribution
6. Validate via dry-run
```

---

## Asset Specification

### OPTKAS-USD

| Property | Value |
|---|---|
| Asset code | `OPTKASUSD` (alphanumeric, 4-12 chars) |
| Issuer | `issuer` account |
| Type | Regulated asset — fiat-referenced settlement token |
| Authorization | Required — each holder must be explicitly approved |
| Clawback | Enabled — for regulatory compliance actions |
| Home domain | `optkas.com` |
| TOML | Published at `https://optkas.com/.well-known/stellar.toml` |

### stellar.toml Requirements

```toml
[DOCUMENTATION]
ORG_NAME = "OPTKAS1-MAIN SPV"
ORG_URL = "https://optkas.com"
ORG_DESCRIPTION = "Institutional bond funding platform"

[[CURRENCIES]]
code = "OPTKASUSD"
issuer = "<issuer_public_key>"
display_decimals = 2
name = "OPTKAS USD Settlement Token"
desc = "Regulated settlement token for OPTKAS bond funding operations"
conditions = "Subject to authorization and compliance requirements"
is_asset_anchored = true
anchor_asset_type = "fiat"
anchor_asset = "USD"
redemption_instructions = "Contact treasury@optkas.com for redemption"

[[PRINCIPALS]]
name = "OPTKAS1-MAIN SPV"
email = "jimmy@optkas.com"
```

---

## SEP Protocol Implementation

### SEP-10: Web Authentication

Purpose: Prove that a user controls a Stellar account before any deposit/withdrawal.

```
Client                          Anchor Server
  │                                  │
  │  1. GET /auth?account=G...       │
  │  ──────────────────────────▶     │
  │                                  │
  │  2. Challenge transaction        │
  │  ◀──────────────────────────     │
  │                                  │
  │  3. Sign challenge + return      │
  │  ──────────────────────────▶     │
  │                                  │
  │  4. JWT token                    │
  │  ◀──────────────────────────     │
```

**Script**: `stellar-sep10-auth.ts --account <stellar_address> --network testnet --dry-run`

### SEP-24: Interactive Deposit / Withdrawal

Purpose: Coordinate fiat deposit and withdrawal through regulated banking partner.

```
Lender                    Platform                    Bank
  │                          │                          │
  │  1. Request deposit      │                          │
  │  ─────────────────▶      │                          │
  │                          │                          │
  │  2. KYC verification     │                          │
  │  ◀─────────────────      │                          │
  │                          │                          │
  │  3. Wire instructions    │                          │
  │  ◀─────────────────      │                          │
  │                          │                          │
  │  4. Wire fiat            │         5. Confirm       │
  │  ─────────────────────────────────────────────▶     │
  │                          │  ◀───────────────────    │
  │                          │                          │
  │  6. OPTKAS-USD issued    │                          │
  │  ◀─────────────────      │                          │
```

**Script**: `stellar-sep24-deposit-withdraw.ts --action deposit --amount 1000000 --network testnet --dry-run`

### SEP-31: Cross-Border Payments

Purpose: Enable institutional cross-border settlement for international lenders.

| Step | Action | Layer |
|---|---|---|
| 1 | Sending anchor receives fiat from international lender | Layer 2 |
| 2 | Compliance checks (both sending and receiving) | Layer 3 |
| 3 | OPTKAS-USD transferred on Stellar | Layer 5 |
| 4 | Receiving anchor distributes fiat to SPV | Layer 2 |
| 5 | Settlement attested on Stellar and XRPL | Layer 4 |

---

## Authorization Flow

### Authorize New Holder

Every new holder of OPTKAS-USD must be authorized by the issuer:

```typescript
import * as StellarSdk from '@stellar/stellar-sdk';

// Authorization requires compliance signer approval
const authorizeTx = new StellarSdk.TransactionBuilder(issuerAccount, { fee, networkPassphrase })
  .addOperation(StellarSdk.Operation.setTrustLineFlags({
    trustor: holderPublicKey,
    asset: optkasusdAsset,
    flags: {
      authorized: true
    }
  }))
  .setTimeout(30)
  .build();

// Route to signers for multi-sig approval
```

### Revoke Authorization

For compliance actions (freeze):

```typescript
const revokeTx = new StellarSdk.TransactionBuilder(issuerAccount, { fee, networkPassphrase })
  .addOperation(StellarSdk.Operation.setTrustLineFlags({
    trustor: holderPublicKey,
    asset: optkasusdAsset,
    flags: {
      authorized: false
    }
  }))
  .setTimeout(30)
  .build();
```

### Clawback

For regulatory recovery (e.g., court order, sanctions compliance):

```typescript
const clawbackTx = new StellarSdk.TransactionBuilder(issuerAccount, { fee, networkPassphrase })
  .addOperation(StellarSdk.Operation.clawback({
    asset: optkasusdAsset,
    from: targetPublicKey,
    amount: clawbackAmount
  }))
  .setTimeout(30)
  .build();
```

---

## Attestation on Stellar

### Method

Hash attestations on Stellar use `ManageData` operations on the attestation account:

```typescript
const attestTx = new StellarSdk.TransactionBuilder(attestationAccount, { fee, networkPassphrase })
  .addOperation(StellarSdk.Operation.manageData({
    name: `attest:${documentType}:${timestamp}`,
    value: Buffer.from(sha256Hash, 'hex')
  }))
  .setTimeout(30)
  .build();
```

**Script**: `stellar-attest-hash.ts --hash <sha256> --type bond_indenture --network testnet --dry-run`

---

## Network Configuration

### Testnet (Default)

```yaml
url: https://horizon-testnet.stellar.org
passphrase: "Test SDF Network ; September 2015"
```

### Mainnet

```yaml
url: https://horizon.stellar.org
passphrase: "Public Global Stellar Network ; September 2015"
```

---

## SDK: @stellar/stellar-sdk

All Stellar operations use the `@stellar/stellar-sdk` npm package.

```typescript
import * as StellarSdk from '@stellar/stellar-sdk';

const server = new StellarSdk.Horizon.Server(config.networks.stellar[network].url);

// Transaction flow:
// 1. Load source account
// 2. Build transaction
// 3. Dry-run validation
// 4. Route to signers for multi-sig
// 5. Collect signatures
// 6. Submit to Horizon
```
