# OPTKAS XRPL Specification

> Owner: OPTKAS1-MAIN SPV
> Version: 1.0.0 | 2026-02-06

---

## XRPL Role in Architecture

XRPL serves as **Layer 4 (Evidence)** and **Layer 5 (Representation)** for:
- IOU issuance and management (claim receipts)
- Conditional escrow (settlement coordination)
- Document hash attestation (immutable evidence)
- DEX / AMM (optional secondary liquidity)
- Algorithmic trading (optional, within risk limits)

XRPL does **NOT** serve as:
- Legal ownership registry
- Custodian of assets
- Source of truth for collateral positions
- Replacement for banking or custody infrastructure

---

## Account Architecture

All accounts are defined in `config/platform-config.yaml`. Keys are stored in HSM/KMS — never in code.

| Account | Purpose | Multi-Sig | DefaultRipple |
|---|---|---|---|
| `issuer` | Issues IOUs (OPTKAS.BOND, OPTKAS.ESCROW, OPTKAS.ATTEST) | 2-of-3 | true |
| `treasury` | Holds issued IOUs, manages distributions | 2-of-3 | false |
| `escrow` | Creates and manages EscrowCreate/Finish/Cancel | 2-of-3 | false |
| `attestation` | Writes hash attestations via Payment memos | 2-of-3 | false |
| `amm_liquidity` | Provisions AMM pools (when enabled) | 2-of-3 | false |
| `trading` | Executes algorithmic trades (when enabled) | 2-of-3 | false |

### Account Setup Sequence

```
1. Fund accounts from testnet faucet (testnet) or treasury (mainnet)
2. Configure SignerListSet on each account:
   - SignerQuorum: 2
   - SignerEntries: [treasury_signer, compliance_signer, trustee_signer]
3. Set AccountSet flags:
   - Issuer: asfDefaultRipple = true
   - All others: asfDefaultRipple = false
4. Deploy trustlines from treasury/escrow/attestation → issuer for each token
5. Validate via dry-run before any mainnet deployment
```

**Script**: `init-platform.ts --network testnet --dry-run`

---

## Token Specifications

### OPTKAS.BOND

| Property | Value |
|---|---|
| Currency code | `BOND` (3-char standard) or hex-encoded for longer codes |
| Issuer | `issuer` account |
| Type | Claim receipt — represents lender's bond participation |
| Transferable | Configurable per trustline (default: restricted) |
| Supply | Corresponds 1:1 with funded bond amounts |
| Decimal precision | 6 |

### OPTKAS.ESCROW

| Property | Value |
|---|---|
| Currency code | `ESCROW` |
| Issuer | `issuer` account |
| Type | Settlement token — used in escrow flows |
| Transferable | Restricted to platform accounts |
| Supply | Matches active escrow positions |

### OPTKAS.ATTEST

| Property | Value |
|---|---|
| Currency code | `ATTEST` |
| Issuer | `issuer` account |
| Type | Evidence token — zero-value, carries hash in memo |
| Transferable | No |
| Supply | One per attestation event |

---

## Trustline Management

### Deployment

```typescript
// Trustline from recipient → issuer
const trustlinePayload = {
  TransactionType: 'TrustSet',
  Account: recipientAddress,
  LimitAmount: {
    currency: 'BOND',
    issuer: issuerAddress,
    value: '50000000'  // $50M limit
  },
  Flags: 0
};
```

**Script**: `xrpl-deploy-trustlines.ts --token BOND --accounts treasury,escrow --network testnet --dry-run`

### Trustline Rules

1. All trustlines are deployed via script with `--dry-run` validation first.
2. Trustline limits are set per `platform-config.yaml` token configuration.
3. Trustline modifications require 2-of-3 multisig.
4. Trustline removal only permitted during bond redemption/lifecycle completion.

---

## Escrow Operations

### EscrowCreate

```typescript
const escrowPayload = {
  TransactionType: 'EscrowCreate',
  Account: escrowAccountAddress,
  Amount: xrpToDrops(amount),  // Or IOU amount for escrow evidence
  Destination: treasuryAddress,
  FinishAfter: isoTimeToRippleTime(releaseDate),
  CancelAfter: isoTimeToRippleTime(cancelDate),
  Condition: cryptoConditionHex,  // PREIMAGE-SHA-256
  Memos: [{
    Memo: {
      MemoType: hexEncode('escrow/bond-funding'),
      MemoData: hexEncode(JSON.stringify({
        bondId: 'OPTKAS-BOND-001',
        amount: 1000000,
        currency: 'USD',
        lender: 'LENDER-ID'
      }))
    }
  }]
};
```

**Script**: `xrpl-create-escrow.ts --template bond_funding --amount 1000000 --network testnet --dry-run`

### EscrowFinish

Requires:
1. Crypto-condition fulfillment (compliance verification passed).
2. Multisig approval (2-of-3).
3. Time condition met (FinishAfter elapsed).

### EscrowCancel

- Only after CancelAfter time elapsed.
- Requires multisig approval.
- Cancellation event attested on chain.

---

## Attestation Protocol

### Method

Hash attestations use `Payment` transactions with zero-value IOUs carrying `Memo` fields.

```typescript
const attestPayload = {
  TransactionType: 'Payment',
  Account: attestationAccount,
  Destination: attestationAccount,  // Self-payment
  Amount: {
    currency: 'ATTEST',
    issuer: issuerAddress,
    value: '0.000001'  // Minimal value
  },
  Memos: [{
    Memo: {
      MemoType: hexEncode('attestation/document-hash'),
      MemoData: hexEncode(JSON.stringify({
        sha256: documentHash,
        documentType: 'bond_indenture',
        timestamp: new Date().toISOString(),
        attestedBy: 'OPTKAS-PLATFORM'
      }))
    }
  }]
};
```

**Script**: `xrpl-attest-hash.ts --hash <sha256> --type bond_indenture --network testnet --dry-run`

### Attestation Types

| Type | When | What is Hashed |
|---|---|---|
| `document-hash` | Document creation/update | SHA-256 of document content |
| `collateral-snapshot` | Daily/periodic | SHA-256 of collateral valuation report |
| `governance-action` | Every governance event | SHA-256 of governance event record |
| `reconciliation` | Daily reconciliation | SHA-256 of reconciliation report |
| `audit-report` | Report generation | SHA-256 of complete audit report |
| `incident` | Security/compliance incident | SHA-256 of incident report |

---

## DEX / AMM Operations

### AMM Provisioning

**Status**: Disabled by default in `platform-config.yaml`.

When enabled:

```typescript
const ammCreatePayload = {
  TransactionType: 'AMMCreate',
  Account: ammLiquidityAccount,
  Amount: { currency: 'BOND', issuer: issuerAddress, value: initialBondAmount },
  Amount2: xrpToDrops(initialXrpAmount),
  TradingFee: 500  // 0.5% (in basis points * 10)
};
```

**Script**: `xrpl-provision-amm.ts --pair BOND/XRP --amount 100000 --network testnet --dry-run`

### AMM Rules

1. AMM is OPTIONAL and disabled by default.
2. Provisioning requires 2-of-3 multisig.
3. Max slippage: 50 bps (configurable).
4. AMM exists for secondary liquidity only — primary settlement is off-chain.

---

## Network Configuration

### Testnet (Default)

```yaml
url: wss://s.altnet.rippletest.net:51233
explorer: https://testnet.xrpl.org
```

### Mainnet

```yaml
url: wss://xrplcluster.com
explorer: https://livenet.xrpl.org
```

### Network Selection

- Default: testnet (safe mode).
- Mainnet deployment requires 3-of-3 multisig approval.
- `--network mainnet` flag required explicitly — never auto-detected.
- All scripts default to `--dry-run` mode.

---

## SDK: xrpl.js

All XRPL operations use the `xrpl` npm package (xrpl.js).

```typescript
import { Client, Wallet, xrpToDrops } from 'xrpl';

const client = new Client(config.networks.xrpl[network].url);
await client.connect();

// All transaction submission goes through multisig flow:
// 1. Prepare unsigned transaction
// 2. Validate via dry-run (submit with fail_hard in testnet)
// 3. Route to signers for approval
// 4. Collect signatures
// 5. Submit multi-signed transaction
```
