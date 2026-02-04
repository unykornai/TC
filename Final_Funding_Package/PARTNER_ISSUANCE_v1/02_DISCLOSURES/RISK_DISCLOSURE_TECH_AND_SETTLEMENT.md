# RISK DISCLOSURE — TECHNOLOGY AND SETTLEMENT

**Document Type:** Risk Disclosure  
**Attached to:** Strategic Infrastructure & Execution Agreement  
**Effective Date:** January 26, 2026

---

## IMPORTANT: READ BEFORE SIGNING

This disclosure describes the technological and settlement risks associated with the smart contract settlement mechanism and blockchain-based infrastructure contemplated by the Agreement.

---

## 1. BLOCKCHAIN TECHNOLOGY RISKS

### 1.1 Network Risks

The Agreement contemplates settlement via blockchain networks (XRPL and/or EVM-compatible networks). These networks are subject to:

| Risk | Description |
|:-----|:------------|
| **Network Congestion** | High transaction volume may delay settlement |
| **Network Outages** | Technical failures may temporarily prevent settlement |
| **Protocol Changes** | Network upgrades may affect settlement mechanics |
| **Validator Failures** | Consensus mechanism disruptions may occur |

### 1.2 Smart Contract Risks

| Risk | Description |
|:-----|:------------|
| **Code Bugs** | Smart contracts may contain undiscovered errors |
| **Security Vulnerabilities** | Exploits may result in loss of funds |
| **Immutability** | Deployed contracts may be difficult to modify |
| **Gas/Fee Volatility** | Transaction costs may vary significantly |

### 1.3 Mitigation Measures

The Parties have implemented the following mitigations:

- ✓ Wire transfer fallback (5 business days)
- ✓ Multisig authorization (2-of-3)
- ✓ USD denomination (stablecoin at par)
- ✓ Emergency pause capability

---

## 2. DIGITAL ASSET RISKS

### 2.1 Stablecoin Risks

If settlement occurs via stablecoin (USDT, USDC, or similar):

| Risk | Description |
|:-----|:------------|
| **De-Peg Risk** | Stablecoin may trade below $1.00 USD |
| **Issuer Risk** | Stablecoin issuer may become insolvent |
| **Regulatory Risk** | Stablecoins may face regulatory restrictions |
| **Redemption Risk** | Conversion to fiat may be delayed |

### 2.2 Mitigation

- Payment obligation is **denominated in USD**
- Stablecoin settlement is at **par value at time of transfer**
- USD obligation survives any stablecoin failure
- Wire fallback ensures fiat settlement capability

---

## 3. CUSTODY AND KEY MANAGEMENT RISKS

### 3.1 Private Key Risks

| Risk | Description |
|:-----|:------------|
| **Key Loss** | Loss of private keys may result in permanent loss of access |
| **Key Theft** | Compromised keys may result in unauthorized transfers |
| **Key Management** | Improper storage may expose keys to risk |

### 3.2 Multisig Configuration

The 2-of-3 multisig structure provides:

- ✓ No single point of failure
- ✓ Key compromise requires 2 separate breaches
- ✓ Recovery possible with 2 remaining signers

### 3.3 Address Compromise Protocol

If a recipient address is compromised:

1. Immediate pause of distributions
2. Written notice with new address
3. 3-of-3 authorization for address change
4. 5-day waiting period

---

## 4. SETTLEMENT TIMING RISKS

### 4.1 Blockchain Finality

| Network | Typical Finality |
|:--------|:-----------------|
| XRPL | ~4 seconds |
| Ethereum L1 | ~12 seconds |
| EVM L2s | ~2 seconds |

### 4.2 Fallback Timing

If digital settlement fails, wire transfer settlement occurs within **5 business days**. This delay is a known risk accepted by the Parties.

---

## 5. REGULATORY RISKS

### 5.1 Evolving Regulation

The regulatory landscape for blockchain technology and digital assets is evolving. Future regulations may:

- Restrict certain settlement methods
- Impose reporting requirements
- Require licensing for certain activities
- Affect tax treatment of transactions

### 5.2 Jurisdictional Considerations

The Agreement is governed by Wyoming law. Other jurisdictions may have different rules affecting:

- Recognition of smart contract execution
- Treatment of digital asset payments
- Tax obligations

---

## 6. OPERATIONAL RISKS

### 6.1 Human Error

| Risk | Mitigation |
|:-----|:-----------|
| Incorrect address entry | Multisig review before execution |
| Incorrect amount calculation | Distribution statement verification |
| Missed payment trigger | Reporting and notification requirements |

### 6.2 Coordination Risks

Multisig execution requires coordination between multiple signers. Delays may occur if:

- Signers are unavailable
- Communication is disrupted
- Signing tools are inaccessible

---

## 7. NO GUARANTEES

**Neither Party guarantees:**

- Uninterrupted availability of any settlement rail
- Perfect security of any blockchain network
- Stability of any stablecoin
- Timeliness of any fallback mechanism

The Parties have negotiated risk allocation through the Agreement's terms, including the wire fallback provision.

---

## 8. ACKNOWLEDGMENT

By signing the Agreement, each Party acknowledges that:

1. It has read and understood this risk disclosure
2. It understands the risks associated with blockchain settlement
3. It accepts the fallback mechanisms as adequate protection
4. It has had the opportunity to consult technical and legal advisors
5. It is entering into the Agreement with full knowledge of these risks

---

*This disclosure is part of the Partner Issuance Package and is incorporated by reference into the Agreement.*
