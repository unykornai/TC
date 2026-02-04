# AUDIT RUNBOOK
## OPTKAS1 Collateral & System Verification Procedures

**Version:** 1.0  
**Date:** February 2, 2026  
**Owner:** OPTKAS1-MAIN SPV  
**Contact:** jimmy@optkas.com

---

## 1. Purpose

This runbook provides step-by-step procedures for verifying the integrity of the OPTKAS1 collateral management system. It is designed for use by:

- Internal compliance personnel
- External auditors
- Lender due diligence teams
- Regulatory examiners

---

## 2. Audit Types

| Audit Type | Frequency | Duration | Scope |
|:-----------|:----------|:---------|:------|
| Daily Verification | Daily | 15 min | Position confirmation |
| Monthly BBC | Monthly | 2 hours | Full borrowing base |
| Quarterly Review | Quarterly | 1 day | System + documents |
| Annual Audit | Annually | 3-5 days | Comprehensive |

---

## 3. Daily Verification Procedure

### 3.1 Position Confirmation

**Objective:** Verify collateral position matches records

**Duration:** 15 minutes

**Procedure:**

- [ ] **Step 1:** Access STC holder portal
- [ ] **Step 2:** Download current position statement
- [ ] **Step 3:** Verify quantity matches internal records
- [ ] **Step 4:** Verify CUSIP (87225HAB4) is correct
- [ ] **Step 5:** Log verification in daily log

**Expected Output:**
```
Date: YYYY-MM-DD
Position Verified: Yes/No
Face Value: $10,000,000
CUSIP: 87225HAB4
Verified By: [Name]
```

### 3.2 XRPL Attestation Check

**Objective:** Confirm latest attestation is current

**Procedure:**

- [ ] **Step 1:** Query XRPL account (rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV)
- [ ] **Step 2:** Retrieve most recent transaction
- [ ] **Step 3:** Decode memo data
- [ ] **Step 4:** Verify timestamp is within 24 hours
- [ ] **Step 5:** Log result

**Query Command:**
```bash
# Using XRPL CLI or explorer
xrpl account_tx rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV --limit 1
```

---

## 4. Monthly Borrowing Base Audit

### 4.1 Pre-Audit Checklist

- [ ] Current STC position statement (dated within 30 days)
- [ ] Latest Borrowing Base Certificate
- [ ] Previous month's BBC for comparison
- [ ] Access to XRPL explorer
- [ ] Calculator / spreadsheet

### 4.2 Collateral Verification

| Step | Action | Verification |
|:-----|:-------|:-------------|
| 1 | Obtain STC statement | Date ≤ 30 days |
| 2 | Confirm holder name | Matches SPV |
| 3 | Confirm CUSIP | 87225HAB4 |
| 4 | Confirm face value | $10,000,000 |
| 5 | Note any restrictions | Should be none |

### 4.3 Valuation Calculation

```
Eligible Face Value:          $10,000,000
Applicable Haircut (40%):    -$ 4,000,000
                             ─────────────
Collateral Value:             $ 6,000,000

Outstanding Loan Balance:     $ [CURRENT]
                             ─────────────
Excess/(Deficiency):          $ [CALCULATE]

Coverage Ratio:               [COLLATERAL / OUTSTANDING] × 100%
Minimum Required:             250%
Status:                       [COMPLIANT/DEFICIENT]
```

### 4.4 Document Hash Verification

- [ ] **Step 1:** Download STC statement PDF
- [ ] **Step 2:** Generate SHA-256 hash
  ```bash
  certutil -hashfile STC_Statement.pdf SHA256
  ```
- [ ] **Step 3:** Query XRPL for matching attestation
- [ ] **Step 4:** Confirm hash matches
- [ ] **Step 5:** Document verification result

### 4.5 Monthly Report

```markdown
## Monthly Borrowing Base Audit Report

**Audit Date:** YYYY-MM-DD
**Auditor:** [Name]

### Collateral Summary
| Item | Value | Status |
|:-----|:------|:-------|
| Face Value | $10,000,000 | ✓ Verified |
| Collateral Value | $6,000,000 | ✓ Calculated |
| Outstanding Balance | $[X] | ✓ Confirmed |
| Coverage Ratio | [X]% | ✓ Compliant |

### Hash Verification
| Document | Hash Match | Attestation TX |
|:---------|:-----------|:---------------|
| STC Statement | ✓ | [TX Hash] |
| BBC Certificate | ✓ | [TX Hash] |

### Issues Identified
[None / List any discrepancies]

### Certification
I certify that this audit was performed in accordance with the OPTKAS1 
Audit Runbook and the above findings are accurate.

Signature: _________________________
Date: _____________________________
```

---

## 5. Quarterly System Review

### 5.1 Scope

| Area | Items Reviewed |
|:-----|:---------------|
| Legal | Entity status, UCC filings, agreements |
| Custody | STC relationship, control agreement |
| Technology | XRPL attestations, IPFS storage |
| Compliance | Covenant calculations, reporting |

### 5.2 Legal Entity Check

- [ ] Verify Wyoming LLC is in good standing
  - Secretary of State online portal
- [ ] Confirm registered agent is current
- [ ] Review any amendments to operating agreement
- [ ] Verify UCC-1 filing is active (if applicable)

### 5.3 Custody Verification

- [ ] Request direct confirmation from STC
- [ ] Verify control agreement is in place
- [ ] Confirm no transfer restrictions
- [ ] Test holder portal access

**STC Contact Verification Letter:**
```
To: Securities Transfer Corporation
From: [Auditor Name]
Date: [Date]

Please confirm the following:
1. Current holder of CUSIP 87225HAB4
2. Number of units held
3. Face value
4. Any liens, pledges, or restrictions
5. Control agreement status

Authorization: [Attach signed authorization from SPV]
```

### 5.4 Technology Audit

**XRPL Review:**
- [ ] Total attestations created
- [ ] Any gaps in attestation schedule
- [ ] Hash verification success rate
- [ ] Account balance adequate

**IPFS Review:**
- [ ] All documents pinned
- [ ] Content addressable hashes valid
- [ ] Backup pinning service active
- [ ] Storage quota sufficient

### 5.5 Covenant Compliance

| Covenant | Required | Actual | Status |
|:---------|:---------|:-------|:-------|
| Coverage Ratio | ≥250% | [X]% | ✓/✗ |
| Monthly Reporting | By 5th | [Date] | ✓/✗ |
| Insurance Current | Active | [Status] | ✓/✗ |
| No Additional Liens | None | [Status] | ✓/✗ |

---

## 6. Annual Comprehensive Audit

### 6.1 Audit Program

**Day 1: Planning & Entity Review**
- [ ] Review audit scope with management
- [ ] Obtain all legal documents
- [ ] Verify entity existence and standing
- [ ] Review organizational structure

**Day 2: Asset Verification**
- [ ] Direct confirmation from STC
- [ ] Physical certificate inspection (if applicable)
- [ ] Chain of custody documentation
- [ ] Insurance verification

**Day 3: Transaction Testing**
- [ ] Sample XRPL attestations (10% or 30, whichever greater)
- [ ] Verify hash matches for each
- [ ] Test BBC calculations for 3 months
- [ ] Review all material events

**Day 4: Controls Assessment**
- [ ] Access controls review
- [ ] Segregation of duties
- [ ] Key management procedures
- [ ] Disaster recovery testing

**Day 5: Reporting**
- [ ] Draft findings
- [ ] Management response
- [ ] Final report issuance

### 6.2 Annual Audit Report Template

```markdown
# OPTKAS1 Annual Audit Report

**Audit Period:** [Start Date] to [End Date]
**Audit Firm:** [If external]
**Report Date:** [Date]

## Executive Summary
[Overall opinion and key findings]

## Scope
- Entity governance and legal standing
- Asset verification and custody
- Collateral valuation and borrowing base
- Technology controls and attestations
- Covenant compliance

## Findings

### 1. Entity and Legal
[Findings and observations]

### 2. Asset Verification
[Confirmation of collateral existence]

### 3. Valuation and BBC
[Testing results]

### 4. Technology Controls
[XRPL, IPFS, access controls]

### 5. Covenant Compliance
[Full-year compliance summary]

## Recommendations
[Numbered list of recommendations]

## Management Response
[Management's response to findings]

## Opinion
[Clean / Qualified / Adverse]

Signed: _________________________
Date: __________________________
```

---

## 7. Issue Resolution

### 7.1 Discrepancy Categories

| Category | Severity | Response Time |
|:---------|:---------|:--------------|
| Position mismatch | Critical | Immediate |
| Valuation error | High | 24 hours |
| Attestation gap | Medium | 48 hours |
| Documentation missing | Low | 5 business days |

### 7.2 Escalation Matrix

| Severity | First Contact | Escalation | Resolution Authority |
|:---------|:--------------|:-----------|:---------------------|
| Critical | SPV Manager | Lender | Both parties |
| High | SPV Manager | — | SPV Manager |
| Medium | Operations | SPV Manager | Operations |
| Low | Operations | — | Operations |

### 7.3 Issue Documentation

```markdown
## Issue Report

**ID:** OPTKAS1-ISSUE-[NNNN]
**Date Identified:** [Date]
**Identified By:** [Name]
**Severity:** [Critical/High/Medium/Low]

### Description
[Detailed description of the issue]

### Impact
[Business and compliance impact]

### Root Cause
[Analysis of why it occurred]

### Resolution
[Steps taken to resolve]

### Preventive Action
[Changes to prevent recurrence]

### Sign-Off
Resolved By: _________________ Date: _________
Verified By: _________________ Date: _________
```

---

## 8. Appendices

### 8.1 Key Contacts

| Role | Name | Email | Phone |
|:-----|:-----|:------|:------|
| SPV Manager | — | jimmy@optkas.com | — |
| Transfer Agent | STC | — | — |
| Insurance | C.J. Coleman | — | — |
| Legal Counsel | — | — | — |

### 8.2 System Access

| System | URL | Access Level |
|:-------|:----|:-------------|
| STC Portal | [URL] | Holder login |
| XRPL Explorer | xrpl.org | Public |
| IPFS Gateway | [Gateway] | Read-only |

### 8.3 Document Locations

| Document | Location |
|:---------|:---------|
| Operating Agreement | data_room/01_Entity/ |
| STC Statements | data_room/02_Asset/ |
| BBC Templates | data_room/03_Facility/ |
| Insurance Policy | data_room/02_Asset/ |

---

*This Runbook is maintained by OPTKAS1-MAIN SPV and updated as procedures change.*
