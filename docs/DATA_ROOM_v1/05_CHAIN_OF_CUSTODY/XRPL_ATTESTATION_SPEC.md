# XRPL ATTESTATION SPECIFICATION
## OPTKAS1 Evidence Layer Technical Documentation

**Version:** 1.0  
**Date:** February 2, 2026  
**Status:** Production Ready

---

## 1. Overview

### 1.1 Purpose

The XRPL attestation system provides an immutable, publicly verifiable evidence layer for the OPTKAS1 collateral management system. This specification defines how document hashes and collateral positions are anchored to the XRP Ledger.

### 1.2 Design Principles

| Principle | Implementation |
|:----------|:---------------|
| **Immutability** | XRPL transaction finality (4-5 seconds) |
| **Transparency** | Public ledger, anyone can verify |
| **Non-custody** | Evidence only, no assets on-chain |
| **Simplicity** | Memo-based attestations |

### 1.3 Scope

This system does **NOT**:
- Hold or transfer custody of securities
- Issue tokens representing the bonds
- Create smart contract escrows
- Replace legal documentation

This system **DOES**:
- Anchor document hashes for verification
- Create timestamped audit trail
- Enable third-party verification
- Provide cryptographic proof of state

---

## 2. Account Configuration

### 2.1 Primary Attestation Account

| Parameter | Value |
|:----------|:------|
| **Address** | rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV |
| **Network** | XRPL Mainnet |
| **Reserve** | 10 XRP minimum |
| **Purpose** | Attestation anchor only |

### 2.2 Account Settings

```javascript
{
  "Account": "rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV",
  "Flags": {
    "lsfDisableMaster": false,
    "lsfRequireDestTag": false,
    "lsfDefaultRipple": false
  }
}
```

### 2.3 Backup/Recovery

| Scenario | Procedure |
|:---------|:----------|
| Key compromise | Rotate to new account, publish migration notice |
| Lost access | Restore from encrypted backup |
| Account locked | XRP reserve maintains account |

---

## 3. Attestation Types

### 3.1 Position Attestation

**Trigger:** New position statement received from STC

```json
{
  "attestation_type": "POSITION",
  "data": {
    "source": "STC",
    "statement_date": "2026-02-01",
    "cusip": "87225HAB4",
    "face_value": "10000000.00",
    "document_hash": "sha256:abc123..."
  }
}
```

### 3.2 Valuation Attestation

**Trigger:** Borrowing base calculation update

```json
{
  "attestation_type": "VALUATION",
  "data": {
    "effective_date": "2026-02-01",
    "face_value": "10000000.00",
    "haircut_pct": "40.00",
    "collateral_value": "6000000.00",
    "document_hash": "sha256:def456..."
  }
}
```

### 3.3 Event Attestation

**Trigger:** Material events (draw, payment, transfer)

```json
{
  "attestation_type": "EVENT",
  "data": {
    "event_type": "FACILITY_DRAW|PAYMENT|TRANSFER|AMENDMENT",
    "event_date": "2026-02-01",
    "description": "Initial draw of $2,000,000",
    "document_hash": "sha256:ghi789..."
  }
}
```

### 3.4 Snapshot Attestation

**Trigger:** Periodic (daily/weekly) or on-demand

```json
{
  "attestation_type": "SNAPSHOT",
  "data": {
    "snapshot_id": 1,
    "timestamp": "2026-02-01T00:00:00Z",
    "collateral_value": "6000000.00",
    "outstanding_balance": "2000000.00",
    "coverage_ratio": "300.00",
    "document_hash": "sha256:jkl012..."
  }
}
```

---

## 4. Transaction Specification

### 4.1 Transaction Type

All attestations use the **Payment** transaction type with:
- Destination: Self (same as source)
- Amount: 1 drop (0.000001 XRP)
- Memo: Attestation payload

### 4.2 Memo Structure

```json
{
  "Memos": [
    {
      "Memo": {
        "MemoType": "746578742F6F70746B617331",  // "text/optkas1" in hex
        "MemoData": "<hex-encoded JSON payload>"
      }
    }
  ]
}
```

### 4.3 Payload Schema

```typescript
interface AttestationPayload {
  version: "1.0";
  type: "OPTKAS1_ATTESTATION";
  attestation_type: "POSITION" | "VALUATION" | "EVENT" | "SNAPSHOT";
  timestamp: string;  // ISO 8601
  data: {
    document_hash: string;  // sha256:<hex>
    [key: string]: any;     // Type-specific fields
  };
  signature?: string;  // Optional off-chain signature
}
```

### 4.4 Complete Transaction Example

```json
{
  "TransactionType": "Payment",
  "Account": "rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV",
  "Destination": "rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV",
  "Amount": "1",
  "Fee": "12",
  "Sequence": 12345,
  "Memos": [
    {
      "Memo": {
        "MemoType": "746578742F6F70746B617331",
        "MemoData": "7B227665..."
      }
    }
  ]
}
```

---

## 5. Hash Generation

### 5.1 Document Hashing

```python
import hashlib

def hash_document(file_path: str) -> str:
    """Generate SHA-256 hash of document."""
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    return f"sha256:{sha256.hexdigest()}"
```

### 5.2 JSON Canonicalization

For structured data attestations:

```python
import json
import hashlib

def hash_json(data: dict) -> str:
    """Generate deterministic hash of JSON object."""
    canonical = json.dumps(data, sort_keys=True, separators=(',', ':'))
    return f"sha256:{hashlib.sha256(canonical.encode()).hexdigest()}"
```

### 5.3 Snapshot Hash Example

```python
snapshot = {
    "timestamp": "2026-02-01T00:00:00Z",
    "facility_id": "OPTKAS1-MAIN",
    "collateral": {
        "cusip": "87225HAB4",
        "face_value": "10000000.00",
        "collateral_value": "6000000.00"
    },
    "facility": {
        "outstanding": "2000000.00",
        "available": "4000000.00"
    }
}

hash = hash_json(snapshot)
# Output: sha256:a1b2c3d4e5f6...
```

---

## 6. Verification Process

### 6.1 Query Attestations

```javascript
// Using xrpl.js
const client = new xrpl.Client("wss://s1.ripple.com");
await client.connect();

const response = await client.request({
  command: "account_tx",
  account: "rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV",
  ledger_index_min: -1,
  ledger_index_max: -1,
  limit: 100
});

const attestations = response.result.transactions
  .filter(tx => tx.tx.Memos)
  .map(tx => decodeAttestation(tx));
```

### 6.2 Decode Attestation

```javascript
function decodeAttestation(tx) {
  const memo = tx.tx.Memos[0].Memo;
  const memoData = Buffer.from(memo.MemoData, 'hex').toString('utf8');
  return {
    tx_hash: tx.tx.hash,
    ledger_index: tx.tx.ledger_index,
    timestamp: tx.tx.date,
    payload: JSON.parse(memoData)
  };
}
```

### 6.3 Verify Document

```python
def verify_document(file_path: str, expected_hash: str) -> bool:
    """Verify document matches attested hash."""
    actual_hash = hash_document(file_path)
    return actual_hash == expected_hash
```

### 6.4 Verification Report

```markdown
## XRPL Attestation Verification Report

**Document:** STC_Position_Statement_2026-02-01.pdf
**Expected Hash:** sha256:abc123...
**Actual Hash:** sha256:abc123...
**Match:** ✓ VERIFIED

**Attestation Details:**
- TX Hash: ABC123...
- Ledger Index: 12345678
- Timestamp: 2026-02-01T15:30:00Z
- Attestation Type: POSITION

**Verification Status:** VALID
```

---

## 7. API Reference

### 7.1 Create Attestation

```typescript
async function createAttestation(
  type: AttestationType,
  data: AttestationData,
  wallet: xrpl.Wallet
): Promise<string> {
  const payload = {
    version: "1.0",
    type: "OPTKAS1_ATTESTATION",
    attestation_type: type,
    timestamp: new Date().toISOString(),
    data: data
  };
  
  const tx = {
    TransactionType: "Payment",
    Account: wallet.classicAddress,
    Destination: wallet.classicAddress,
    Amount: "1",
    Memos: [{
      Memo: {
        MemoType: Buffer.from("text/optkas1").toString("hex"),
        MemoData: Buffer.from(JSON.stringify(payload)).toString("hex")
      }
    }]
  };
  
  const result = await client.submitAndWait(tx, { wallet });
  return result.result.hash;
}
```

### 7.2 Query Latest Attestation

```typescript
async function getLatestAttestation(
  type?: AttestationType
): Promise<Attestation | null> {
  const txs = await client.request({
    command: "account_tx",
    account: ATTESTATION_ADDRESS,
    limit: 50
  });
  
  const attestations = txs.result.transactions
    .filter(tx => tx.tx.Memos)
    .map(decodeAttestation)
    .filter(a => !type || a.attestation_type === type);
  
  return attestations[0] || null;
}
```

### 7.3 Verify Hash

```typescript
async function verifyHash(
  documentHash: string
): Promise<VerificationResult> {
  const attestations = await getAllAttestations();
  const match = attestations.find(a => 
    a.data.document_hash === documentHash
  );
  
  return {
    verified: !!match,
    attestation: match || null,
    timestamp: match?.timestamp,
    tx_hash: match?.tx_hash
  };
}
```

---

## 8. Operational Procedures

### 8.1 Daily Operations

| Task | Frequency | Automated |
|:-----|:----------|:----------|
| Position check | Daily | Yes |
| Snapshot attestation | Daily | Yes |
| Hash verification | On upload | Yes |
| Account balance check | Weekly | Yes |

### 8.2 Event-Driven Attestations

| Event | Attestation Required | Timing |
|:------|:--------------------|:-------|
| New position statement | POSITION | Same day |
| Draw request | EVENT | Before funding |
| Payment received | EVENT | Same day |
| Valuation update | VALUATION | Same day |

### 8.3 Error Handling

| Error | Response |
|:------|:---------|
| Transaction failed | Retry with increased fee |
| Network unavailable | Queue for later submission |
| Invalid payload | Log error, alert operator |
| Insufficient XRP | Alert, add funds |

---

## 9. Security Considerations

### 9.1 Key Management

| Key Type | Protection |
|:---------|:-----------|
| XRPL secret | Encrypted storage, HSM backup |
| API keys | Rotate quarterly |
| Signing keys | Multi-signature for high-value |

### 9.2 Access Control

- Attestation creation: System automated only
- Query access: Public (read-only)
- Key access: Authorized personnel only

### 9.3 Audit Requirements

- Monthly transaction log review
- Quarterly security audit
- Annual key rotation

---

## 10. Appendix

### 10.1 Hex Encoding Reference

| Value | Hex |
|:------|:----|
| "text/optkas1" | 746578742F6F70746B617331 |
| "application/json" | 6170706C69636174696F6E2F6A736F6E |

### 10.2 XRPL Resources

- Mainnet WebSocket: wss://s1.ripple.com
- Testnet WebSocket: wss://s.altnet.rippletest.net:51233
- Explorer: https://livenet.xrpl.org
- Documentation: https://xrpl.org/docs

### 10.3 Contact

For technical support: jimmy@optkas.com

---

*This specification is incorporated by reference into the OPTKAS1 System Architecture (Annex B).*
