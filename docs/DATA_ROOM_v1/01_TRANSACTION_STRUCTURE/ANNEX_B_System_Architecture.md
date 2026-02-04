# ANNEX B: SYSTEM ARCHITECTURE
## OPTKAS1 Collateral Management & Verification Infrastructure

**Reference:** OPTKAS1 Loan Commitment Package  
**Version:** 1.0  
**Date:** February 2, 2026

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OPTKAS1 SYSTEM ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌──────────────────────┐         ┌──────────────────────┐              │
│    │   LEGAL OWNERSHIP    │         │   PHYSICAL CUSTODY   │              │
│    │                      │         │                      │              │
│    │  OPTKAS1-MAIN SPV    │◄───────►│  Securities Transfer │              │
│    │  (Wyoming Series)    │         │  Corporation (STC)   │              │
│    │                      │         │                      │              │
│    │  • Title Holder      │         │  • DTC/DWAC FAST    │              │
│    │  • UCC Filing Owner  │         │  • Physical Vault    │              │
│    │  • Facility Borrower │         │  • Record Keeping    │              │
│    └──────────┬───────────┘         └──────────────────────┘              │
│               │                                                            │
│               │ Controls                                                   │
│               ▼                                                            │
│    ┌──────────────────────────────────────────────────────────┐           │
│    │                   PERFECTION LAYER                       │           │
│    │                                                          │           │
│    │   UCC-1 Financing Statement (Wyoming)                    │           │
│    │   STC Control Agreement (Lender as Secured Party)        │           │
│    │   Blocked Account (if cash proceeds)                     │           │
│    │                                                          │           │
│    └──────────────────────────────────────────────────────────┘           │
│                              │                                             │
│                              │ Attestation                                 │
│                              ▼                                             │
│    ┌──────────────────────────────────────────────────────────┐           │
│    │                EVIDENCE / AUDIT LAYER                    │           │
│    │                                                          │           │
│    │   XRP Ledger Attestations                                │           │
│    │   • SHA-256 document hashes                             │           │
│    │   • Periodic snapshots                                  │           │
│    │   • Immutable audit trail                               │           │
│    │                                                          │           │
│    │   IPFS Document Storage                                  │           │
│    │   • Permanent content addressing                        │           │
│    │   • Cross-referenced with XRPL                          │           │
│    │                                                          │           │
│    └──────────────────────────────────────────────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Details

### 2.1 Legal Entity Layer

| Component | Details |
|:----------|:--------|
| **SPV Name** | OPTKAS1-MAIN |
| **Entity Type** | Wyoming Series LLC |
| **Purpose** | Single-asset bankruptcy-remote vehicle |
| **Registered Agent** | Wyoming Registered Agents LLC |
| **Manager** | Per Operating Agreement |

**Key Documents:**
- Certificate of Formation (Wyoming Secretary of State)
- Operating Agreement (Bankruptcy Remote Provisions)
- Series Designation Certificate

### 2.2 Custody Layer

| Component | Details |
|:----------|:--------|
| **Transfer Agent** | Securities Transfer Corporation |
| **Location** | Plano, Texas |
| **Settlement** | DTC/DWAC FAST System |
| **Access** | Holder Portal + Direct Contact |

**Capabilities:**
- Position statements (on demand)
- Transfer execution (T+2)
- Control agreement compliance
- Third-party confirmations

### 2.3 Perfection Layer

| Document | Status | Effect |
|:---------|:-------|:-------|
| UCC-1 Financing Statement | To be filed | Creates security interest |
| STC Control Agreement | To be executed | Perfects via control |
| Blocked Account Agreement | If applicable | Cash perfection |

**Filing Sequence:**
1. Execute Facility Agreement
2. File UCC-1 (Wyoming + Debtor states)
3. Execute STC Control Agreement
4. Deliver Day-0 Snapshot

### 2.4 Evidence Layer

| System | Purpose | Status |
|:-------|:--------|:-------|
| **XRP Ledger** | Attestation hashes | Operational |
| **IPFS** | Document permanence | Configured |
| **Internal DB** | Position tracking | Operational |

---

## 3. Data Flow Specification

### 3.1 Document Hash Flow

```
Step 1: Document Creation/Update
        │
        ▼
Step 2: SHA-256 Hash Generation
        │
        ▼
Step 3: XRPL AccountSet Memo
        │
        ├──► Field: LOAN_COMMITMENT
        ├──► Field: COLLATERAL_VALUE
        ├──► Field: SNAPSHOT_HASH
        │
        ▼
Step 4: Transaction Validation (4-5 sec)
        │
        ▼
Step 5: Confirmation Storage
        │
        ├──► IPFS Pin
        └──► Internal Audit Log
```

### 3.2 Collateral Status Query

```
Lender Query: "What is current collateral status?"
        │
        ▼
Step 1: Retrieve latest XRPL attestation
        │
        ▼
Step 2: Verify hash against IPFS document
        │
        ▼
Step 3: Return verified position data
        │
        └──► Face Value
        └──► Collateral Value
        └──► Timestamp
        └──► Tx Hash
```

---

## 4. XRPL Integration

### 4.1 Attestation Account

| Parameter | Value |
|:----------|:------|
| **Address** | rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV |
| **Purpose** | Read-only evidence anchor |
| **Custody** | None (evidence only) |

### 4.2 Memo Field Schema

```json
{
  "type": "OPTKAS1_ATTESTATION",
  "version": "1.0",
  "timestamp": "<ISO8601>",
  "data": {
    "document_hash": "<sha256>",
    "collateral_value": "<USD amount>",
    "snapshot_id": "<sequential ID>",
    "attestation_type": "<POSITION|VALUATION|EVENT>"
  }
}
```

### 4.3 Verification Process

1. Query account history
2. Decode memo data
3. Match hash to source document
4. Confirm timestamp validity
5. Generate verification report

---

## 5. IPFS Configuration

### 5.1 Node Setup

| Parameter | Value |
|:----------|:------|
| **Gateway** | Local node or Pinata |
| **Pinning** | Enabled |
| **Retention** | Permanent |

### 5.2 Content Structure

```
/optkas1/
├── snapshots/
│   ├── day0.json
│   ├── snapshot_001.json
│   └── latest.json
├── documents/
│   ├── loan_package.pdf
│   ├── stc_statement.pdf
│   └── insurance_invoice.pdf
└── attestations/
    └── xrpl_tx_index.json
```

---

## 6. Security Model

### 6.1 Access Control

| Role | Access Level | Permissions |
|:-----|:-------------|:------------|
| **SPV Manager** | Full | All operations |
| **Lender** | Read + Verify | View positions, verify hashes |
| **Transfer Agent** | Operational | Execute transfers, provide statements |
| **Auditor** | Read | View all, modify none |

### 6.2 Key Management

| Key Type | Storage | Backup |
|:---------|:--------|:-------|
| XRPL Signing Key | Encrypted wallet | Hardware backup |
| IPFS Node Key | Server-side | Redundant nodes |
| Database Encryption | Cloud HSM | Key escrow |

### 6.3 Audit Trail

- All actions logged with timestamp
- Immutable once written
- XRPL provides external validation
- Monthly audit reports generated

---

## 7. Integration Points

### 7.1 External Systems

| System | Integration Type | Purpose |
|:-------|:-----------------|:--------|
| STC Portal | API/Manual | Position verification |
| XRPL | Direct RPC | Attestation anchoring |
| IPFS | Local/Pinata | Document storage |
| Lender Portal | Read API | Status dashboards |

### 7.2 Reporting Outputs

| Report | Frequency | Delivery |
|:-------|:----------|:---------|
| Borrowing Base Certificate | Monthly | Email + Portal |
| Position Statement | On demand | STC direct |
| Audit Summary | Quarterly | PDF |
| XRPL Attestation Log | Real-time | API |

---

## 8. Disaster Recovery

### 8.1 Backup Strategy

| Component | Backup Frequency | Recovery Time |
|:----------|:-----------------|:--------------|
| Documents | Continuous (IPFS) | Immediate |
| Attestations | Continuous (XRPL) | Immediate |
| Database | Daily | < 4 hours |
| Keys | Monthly verification | < 24 hours |

### 8.2 Redundancy

- IPFS: Multiple pinning services
- XRPL: Network-distributed (no single point of failure)
- Database: Multi-region cloud deployment

---

## 9. Compliance Mapping

| Requirement | Architecture Component |
|:------------|:-----------------------|
| Audit trail | XRPL + IPFS |
| Access control | Role-based permissions |
| Data integrity | SHA-256 hashing |
| Availability | Distributed systems |
| Confidentiality | Encryption at rest/transit |

---

*This Annex B is incorporated by reference into the OPTKAS1 Loan Commitment Package.*
