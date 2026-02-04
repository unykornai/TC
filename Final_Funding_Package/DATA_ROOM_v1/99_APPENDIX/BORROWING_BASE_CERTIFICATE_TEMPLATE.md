# BORROWING BASE CERTIFICATE TEMPLATE
## Monthly Collateral Report

---

**BORROWING BASE CERTIFICATE**

**To:** [LENDER NAME] (the "Lender")

**From:** OPTKAS1-MAIN SPV (the "Borrower")

**Date:** [DATE]

**Reference:** Facility Agreement dated [FACILITY_DATE] (the "Facility Agreement")

---

## 1. Certification

The undersigned, a duly authorized representative of the Borrower, hereby certifies to the Lender as follows:

### 1.1 Authority

I am authorized to execute and deliver this Borrowing Base Certificate on behalf of the Borrower.

### 1.2 Accuracy

The information set forth in this Certificate is true, complete, and accurate as of the Calculation Date stated below.

### 1.3 No Default

Except as disclosed in Section 5 below, no Default or Event of Default has occurred and is continuing, or would result from any borrowing requested in connection with this Certificate.

### 1.4 Representations

All representations and warranties contained in the Facility Agreement and other Loan Documents are true and correct in all material respects as of the date hereof.

---

## 2. Borrowing Base Calculation

### 2.1 Calculation Date

This Borrowing Base Certificate is calculated as of: **[CALCULATION_DATE]**

### 2.2 Eligible Collateral

| Asset Description | CUSIP | Face Value | Haircut % | Collateral Value |
|:------------------|:------|:-----------|:----------|:-----------------|
| TC Advantage 5% MTN | 87225HAB4 | $10,000,000.00 | 40.00% | $6,000,000.00 |
| | | | | |
| **Total** | | **$10,000,000.00** | | **$6,000,000.00** |

### 2.3 Borrowing Base Summary

| Line | Description | Amount |
|:-----|:------------|:-------|
| A | Total Eligible Collateral Value | $6,000,000.00 |
| B | Less: Reserves (if any) | $0.00 |
| C | **Borrowing Base** (A - B) | **$6,000,000.00** |

---

## 3. Availability Calculation

| Line | Description | Amount |
|:-----|:------------|:-------|
| D | Borrowing Base (from Line C) | $6,000,000.00 |
| E | Less: Outstanding Advances | $[OUTSTANDING_ADVANCES] |
| F | Less: Outstanding LC Exposure | $[LC_EXPOSURE] |
| G | **Total Outstandings** (E + F) | **$[TOTAL_OUTSTANDINGS]** |
| H | **Excess Availability** (D - G) | **$[EXCESS_AVAILABILITY]** |

---

## 4. Coverage Ratio

| Metric | Value | Minimum Required | Status |
|:-------|:------|:-----------------|:-------|
| Borrowing Base | $6,000,000.00 | — | — |
| Total Outstandings | $[TOTAL_OUTSTANDINGS] | — | — |
| **Coverage Ratio** | **[RATIO]%** | **250.00%** | **☐ Compliant / ☐ Non-Compliant** |

**Coverage Ratio Calculation:**
```
Coverage Ratio = (Borrowing Base ÷ Total Outstandings) × 100
Coverage Ratio = ($6,000,000.00 ÷ $[TOTAL_OUTSTANDINGS]) × 100
Coverage Ratio = [RATIO]%
```

---

## 5. Exceptions and Disclosures

☐ No exceptions or disclosures.

☐ The following exceptions or disclosures are noted:

_______________________________________________________________

_______________________________________________________________

_______________________________________________________________

---

## 6. Supporting Documentation

The following supporting documents are attached or have been provided:

| Document | Date | Status |
|:---------|:-----|:-------|
| STC Position Statement | [DATE] | ☐ Attached / ☐ Previously Provided |
| Asset Valuation Report | [DATE] | ☐ Attached / ☐ Previously Provided |
| XRPL Attestation Reference | [TX_HASH] | ☐ Verified |

---

## 7. Requested Advances (if applicable)

☐ No advance is being requested at this time.

☐ The Borrower requests an Advance in the amount of: $_______________

| Check | Condition |
|:------|:----------|
| ☐ | Requested Advance does not exceed Excess Availability |
| ☐ | No Default or Event of Default exists or would result |
| ☐ | All conditions precedent have been satisfied |

---

## 8. Contact Information

For questions regarding this Certificate:

**Borrower Contact:**
- Name: _____________________________
- Email: jimmy@optkas.com
- Phone: _____________________________

---

## 9. Certification and Signature

The undersigned certifies that:

1. I have reviewed this Borrowing Base Certificate and the supporting documentation;

2. Based on my knowledge, this Certificate does not contain any untrue statement of a material fact or omit to state a material fact necessary to make the statements made not misleading;

3. The Borrower is in compliance with all covenants and conditions under the Facility Agreement, except as disclosed herein;

4. The collateral information is based on the most recent position statement from Securities Transfer Corporation.

**OPTKAS1-MAIN SPV**

By: _______________________________________

Name: _____________________________________

Title: Manager

Date: _____________________________________

---

## CALCULATION WORKSHEET (For Internal Use)

### Haircut Calculation Detail

```
Face Value:                      $10,000,000.00
Base Haircut (Private Placement):      50.00%
Maturity Adjustment (4+ years):        -5.00%
Insurance Adjustment:                  -5.00%
─────────────────────────────────────────────
Applied Haircut:                       40.00%

Haircut Amount:  $10,000,000.00 × 40.00% = $4,000,000.00
Collateral Value: $10,000,000.00 - $4,000,000.00 = $6,000,000.00
```

### Month-over-Month Comparison

| Metric | Prior Month | Current Month | Change |
|:-------|:------------|:--------------|:-------|
| Face Value | $10,000,000.00 | $10,000,000.00 | $0.00 |
| Collateral Value | $6,000,000.00 | $6,000,000.00 | $0.00 |
| Outstandings | $[PRIOR] | $[CURRENT] | $[CHANGE] |
| Coverage Ratio | [PRIOR]% | [CURRENT]% | [CHANGE]% |

---

*This Borrowing Base Certificate is delivered pursuant to Section [X] of the Facility Agreement. Capitalized terms used but not defined herein have the meanings given in the Facility Agreement.*

---

**[END OF BORROWING BASE CERTIFICATE]**
