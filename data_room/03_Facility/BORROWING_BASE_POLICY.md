# BORROWING BASE POLICY
## OPTKAS1-MAIN SPV — Credit Facility Collateral Valuation

**Effective Date:** February 2, 2026  
**Contact:** jimmy@optkas.com

---

## 1. Purpose

This policy establishes the methodology for calculating the Borrowing Base, determining eligibility criteria, and applying haircuts to collateral pledged under the OPTKAS1 credit facility.

---

## 2. Eligible Collateral

### 2.1 Primary Collateral

| Instrument | Eligibility | Notes |
|:-----------|:------------|:------|
| TC Advantage 5% Secured MTN | ✅ Eligible | CUSIP 87225HAB4 |
| Investment-grade corporate bonds | ✅ Eligible | Subject to approval |
| Cash equivalents | ✅ Eligible | US Treasury, money market |

### 2.2 Ineligible Collateral

- Equity securities
- Unrated or below-investment-grade debt
- Illiquid or restricted securities
- Securities subject to prior liens

---

## 3. Valuation Methodology

### 3.1 Primary Valuation

**TC Advantage Notes** are valued at **Face Amount** (par value) as evidenced by:
- STC Position Statement
- Physical certificate serial number
- Subscription Agreement confirmation

### 3.2 Haircut Schedule

| Factor | Adjustment | Rationale |
|:-------|:-----------|:----------|
| **Base Haircut** | 50% | Private placement, limited secondary market |
| **Maturity Adjustment** | −5% | >4 years remaining reduces rollover risk |
| **Insurance Adjustment** | −5% | C.J. Coleman coverage reduces loss severity |
| **Total Haircut** | **40%** | Conservative, lender-friendly |

### 3.3 Advance Rate

| Scenario | Advance Rate | Coverage Ratio |
|:---------|:-------------|:---------------|
| Conservative | 20% | 500% |
| Standard | 30% | 333% |
| Aggressive | 40% | 250% |

---

## 4. Borrowing Base Calculation

### 4.1 Formula

```
Borrowing Base = Eligible Collateral × (1 - Haircut) × Advance Rate

Example (Single $10M Bond):
  Eligible Collateral:  $10,000,000
  Haircut (40%):       -$4,000,000
  Collateral Value:     $6,000,000
  Advance Rate (40%):   $2,400,000  ← Maximum Availability
```

### 4.2 Coverage Ratio

```
Coverage Ratio = Collateral Value ÷ Outstanding Advances

Minimum Required: 200%
Target:           250%+
Current:          250% (at max utilization)
```

---

## 5. Borrowing Base Certificate

### 5.1 Delivery Schedule

| Report | Frequency | Due Date |
|:-------|:----------|:---------|
| Borrowing Base Certificate | Monthly | 5th business day |
| Exception Report | As needed | Within 2 business days |
| Annual Reconciliation | Yearly | Within 30 days of fiscal year-end |

### 5.2 Required Contents

Each BBC shall include:
1. Schedule of Eligible Collateral
2. Valuation per security (Face, Market if available)
3. Haircut calculations
4. Advance calculations
5. Coverage ratio
6. Outstanding advances
7. Available capacity
8. Officer certification

---

## 6. Concentration Limits

| Limit Type | Maximum | Current |
|:-----------|:--------|:--------|
| Single Issuer | 100% | 100% (TC Advantage) |
| Single CUSIP | 100% | 100% (87225HAB4) |
| Unrated Securities | 0% | 0% |

*Note: Concentration limits may be waived for single-asset SPV structures by lender agreement.*

---

## 7. Collateral Monitoring

### 7.1 Ongoing Verification

| Method | Frequency | Responsible Party |
|:-------|:----------|:------------------|
| STC Position Confirmation | Quarterly | Borrower |
| XRPL Attestation | Weekly | Borrower |
| Lender Audit Right | Annual | Lender |

### 7.2 Trigger Events

The following require immediate notification:
- Collateral value decline >10%
- Rating downgrade (if rated)
- Issuer credit event
- Breach of coverage ratio
- Any lien or encumbrance

---

## 8. Enforcement

### 8.1 Default Remedies

Upon default, Lender may:
1. Accelerate all obligations
2. Exercise UCC foreclosure rights
3. Direct STC to transfer collateral
4. Liquidate collateral and apply proceeds

### 8.2 Waterfall

```
1. Accrued interest and fees
2. Outstanding principal
3. Enforcement costs
4. Residual to Borrower
```

---

## 9. Amendments

This policy may be amended only by written agreement between Borrower and Lender.

---

**Prepared by:** OPTKAS1 Management  
**Contact:** jimmy@optkas.com

---

*Confidential — For Institutional Use Only*
