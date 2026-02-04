# EXHIBIT B

## SMART CONTRACT SETTLEMENT SPECIFICATION

**Attached to:** Strategic Infrastructure & Execution Agreement  
**Effective Date:** January 26, 2026  
**Parties:** Unykorn 7777, Inc. × OPTKAS1-MAIN SPV

---

## 1. PURPOSE

This specification governs the automated settlement mechanism implementing the economic terms of the Agreement. Smart contracts serve as **ministerial execution tools only** and do not modify the legal obligations defined in the Agreement.

---

## 2. NETWORK CONFIGURATION

### 2.1 Primary Network

| Parameter | Value |
|:----------|:------|
| **Network** | XRP Ledger (Mainnet) |
| **Chain ID** | N/A (native ledger) |
| **Consensus** | Federated Byzantine Agreement |
| **Finality** | ~4 seconds |

### 2.2 Alternative Network

| Parameter | Value |
|:----------|:------|
| **Network** | Ethereum (or EVM-compatible L2) |
| **Settlement Token** | USDT / USDC |
| **Finality** | ~12 seconds (L1) / ~2 seconds (L2) |

---

## 3. RECIPIENT ADDRESS

### 3.1 Primary Recipient (XRPL)

```
Address: rnAF6Ki5sbmPZ4dTNCVzH5iyb9ScdSqyNr
Network: XRP Ledger Mainnet
Explorer: https://livenet.xrpl.org/accounts/rnAF6Ki5sbmPZ4dTNCVzH5iyb9ScdSqyNr
```

### 3.2 Alternative Recipient (EVM)

```
Address: [To be furnished by Unykorn]
Network: [To be specified]
```

---

## 4. MULTISIG CONFIGURATION

### 4.1 Signing Threshold

| Parameter | Value |
|:----------|:------|
| **Required Signatures** | 2 of 3 |
| **Signing Method** | XRPL Multisign / EVM Multisig |

### 4.2 Authorized Signers

| Role | Entity | Status |
|:-----|:-------|:------:|
| **Signer A** | Unykorn 7777, Inc. | Active |
| **Signer B** | OPTKAS1-MAIN SPV Manager | Active |
| **Signer C** | Neutral Escrow / Co-Manager | Pending |

### 4.3 Signer Responsibilities

- **Any 2 signers** may authorize a distribution
- **All 3 signers** required for address changes
- **Emergency pause** requires 2-of-3

---

## 5. DISTRIBUTION LOGIC

### 5.1 Trigger Events

Distribution may be triggered upon:

1. **Facility Funding** — Initial close of credit facility
2. **Cash Receipt** — Interest, principal, or other payments received
3. **Manual Authorization** — SPV Manager initiates distribution

### 5.2 Distribution Function (Pseudocode)

```
function distributeParticipation(grossAmount):
    
    # Apply waterfall
    seniorDebtService = calculateSeniorDebt()
    operatingExpenses = getApprovedExpenses()
    reserves = calculateReserves()
    
    netDistributable = grossAmount - seniorDebtService - operatingExpenses - reserves
    
    if netDistributable <= 0:
        return  # No distribution this period
    
    # Calculate Unykorn share based on selected option
    if OPTION_A_SELECTED:
        unykornsShare = netDistributable * 0.10
    else if OPTION_B_SELECTED:
        unykornsShare = netDistributable * 0.04
    
    # Execute transfer
    transfer(UNYKORN_ADDRESS, unykornsShare)
    
    # Emit event for audit trail
    emit DistributionEvent(
        timestamp = now(),
        grossAmount = grossAmount,
        netDistributable = netDistributable,
        unykornsShare = unykornsShare,
        txHash = currentTx.hash
    )
```

### 5.3 Success Fee Logic (Option B Only)

```
function paySuccessFee(fundedAmount):
    
    require(OPTION_B_SELECTED)
    require(successFeePaid == false)
    
    successFee = fundedAmount * 0.02
    
    transfer(UNYKORN_ADDRESS, successFee)
    successFeePaid = true
    
    emit SuccessFeeEvent(
        timestamp = now(),
        fundedAmount = fundedAmount,
        successFee = successFee,
        txHash = currentTx.hash
    )
```

---

## 6. AUDIT TRAIL

### 6.1 On-Chain Logging

All smart contract executions shall record:

| Field | Description |
|:------|:------------|
| `timestamp` | ISO 8601 UTC timestamp |
| `ledger_index` | XRPL ledger sequence (or block number) |
| `tx_hash` | Transaction hash |
| `gross_amount` | Total distribution before deductions |
| `net_distributable` | Amount after waterfall deductions |
| `unykorn_share` | Amount paid to Unykorn |
| `signer_1` | First authorizing signer |
| `signer_2` | Second authorizing signer |

### 6.2 Off-Chain Records

SPV shall maintain:

- Distribution calculation worksheets
- Bank/wire confirmation receipts
- Reconciliation with on-chain records

---

## 7. FALLBACK PROCEDURES

### 7.1 Digital Rail Failure

If smart contract settlement is unavailable for any reason:

1. SPV Manager shall notify Unykorn within 24 hours
2. Payment shall be made via wire transfer within 5 business days
3. Wire instructions per Unykorn's written direction

### 7.2 Address Compromise

If recipient address is compromised:

1. Immediate pause of all distributions
2. Unykorn furnishes new address in writing
3. 2-of-3 multisig authorization to update
4. 5-day waiting period before resuming distributions

---

## 8. AMENDMENT PROCESS

Changes to this specification require:

| Change Type | Authorization Required | Notice Period |
|:------------|:----------------------|:--------------|
| Recipient address | 3-of-3 signers | 5 days |
| Participation percentage | Written amendment + 2-of-3 | 5 days |
| Network change | 2-of-3 signers | 10 days |
| Signer replacement | 2-of-3 remaining signers | 5 days |

---

## 9. VERIFICATION

### 9.1 Hash Verification

This document's SHA-256 hash shall be recorded upon execution:

```
Document: EXHIBIT_B_SMART_CONTRACT_SETTLEMENT_SPEC.md
SHA-256:  [To be computed at execution]
```

### 9.2 XRPL Attestation

Optionally, the hash may be anchored to XRPL:

```
Attestation Account: rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV
TX Hash: [To be recorded post-execution]
```

---

*This Exhibit is incorporated into and made part of the Strategic Infrastructure & Execution Agreement.*
