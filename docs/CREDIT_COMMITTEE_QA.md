# CREDIT COMMITTEE Q&A — ANTICIPATED OBJECTIONS & RESPONSES

**Track:** 1 (Bond / Collateral Facility)  
**Purpose:** Internal preparation for lender diligence calls  
**Classification:** INTERNAL — NOT for lender distribution  
**Date:** February 7, 2026

---

## How to Use This Document

When a lender's credit analyst or committee member raises a question, find the category below and use the institutional response. Every answer should:

1. **Lead with the collateral fact**
2. **Reference a verifiable document**
3. **End with a concrete next step**

Never volunteer sponsor economics. Never explain the platform unless asked. Never oversell.

---

## Category 1 — Holder Position & Custody

### Q1: "Can you confirm OPTKAS1 is the holder of record?"

**Response:**
"Yes. The STC position statement is on file and available in the data room (02_COLLATERAL_AND_CREDIT folder). It confirms the $10M TC Advantage MTN position held at Securities Transfer Corporation. We can walk you through the full custody trail on a call."

**Supporting docs:** COLLATERAL_VERIFICATION_MEMO.pdf, CUSTODY_CONFIRMATION.pdf

---

### Q2: "Who is Securities Transfer Corporation? Are they recognized?"

**Response:**
"STC is a SEC-registered transfer agent. They serve as the registrar and transfer agent for the TC Advantage Notes. They maintain the security holder records and process transfers. This is the standard transfer agent framework used for registered securities."

**Supporting docs:** CUSTODY_CONFIRMATION.pdf

---

### Q3: "When was holder position confirmed?"

**Response:**
"The STC position statement was issued January 23, 2026 and confirmed February 1, 2026. It is available for immediate review in the data room. The collateral position is independently verified through STC with a complete chain of custody from issuance through current holding."

---

## Category 2 — Collateral & Valuation

### Q4: "What is the collateral and how is it valued?"

**Response:**
"TC Advantage Medium-Term Notes held at STC. Valuation uses a replacement cost methodology with forward revenue multiples and EBITDA validation. The Preset B valuation framework is documented in the data room. We target advance rates of 50–65% against face value, resulting in an LTV of approximately 20–40%."

**Supporting docs:** VALUATION_SUPPORT.pdf, BORROWING_BASE_POLICY.pdf

---

### Q5: "Why is the LTV so conservative? What are you not telling us?"

**Response:**
"The conservative LTV is deliberate. We structured this as a borrowing-base facility, not a leveraged transaction. The advance rates reflect standard haircuts for medium-term notes held at a transfer agent. We would rather over-collateralize and build a repeatable relationship than stretch the structure for a larger initial draw."

**Supporting docs:** BORROWING_BASE_POLICY.pdf, SAMPLE_BORROWING_BASE_CERTIFICATE.pdf

---

### Q6: "How do you compute the borrowing base?"

**Response:**
"Borrowing base is computed using the haircut methodology documented in our Borrowing Base Policy. The system generates automated certificates on a defined cadence. Sample certificates are in the data room. We also have a reporting covenant schedule that defines monthly, quarterly, and annual deliverables."

**Supporting docs:** BORROWING_BASE_POLICY.pdf, SAMPLE_BORROWING_BASE_CERTIFICATE.pdf, REPORTING_COVENANT_SCHEDULE.pdf

---

### Q7: "Is this a single-asset facility? What's the concentration risk?"

**Response:**
"Yes, this is a single-issuer facility, which is standard for asset-based lending against a defined collateral pool. Concentration risk is mitigated by: (1) STC custody with control agreement, (2) conservative advance rates, (3) robust reporting and exception covenants, and (4) traditional UCC enforcement mechanics that do not depend on any platform or technology."

---

## Category 3 — Enforcement & Legal

### Q8: "How is the lender's security interest perfected?"

**Response:**
"Through UCC Article 8/9 perfection. We have drafted UCC-1 financing statement language and a security/control agreement template. The notes are held at STC, and the control agreement framework ensures the lender has a first-priority perfected security interest. This is standard securities-backed lending mechanics."

**Supporting docs:** UCC_LANGUAGE_DRAFT.pdf, SECURITY_AND_CONTROL_TEMPLATE.pdf

---

### Q9: "What if the borrower defaults? What's the enforcement path?"

**Response:**
"Standard UCC Article 9 enforcement. The lender exercises control over the notes through the STC control agreement, liquidates or transfers the notes, and applies proceeds to the outstanding balance. No blockchain, no smart contract, no platform dependency. Traditional enforcement is fully preserved."

**Supporting docs:** SECURITY_AND_CONTROL_TEMPLATE.pdf, UCC_LANGUAGE_DRAFT.pdf

---

### Q10: "Is there any subordination or other claims on the collateral?"

**Response:**
"The sponsor/operator agreements are separate from the borrowing base. A one-line acknowledgment is in the legal folder confirming that sponsor agreements are executed but do not subordinate or encumber the collateral pool. The lender's first-priority security interest is unimpaired."

**Supporting docs:** SPONSOR_ACKNOWLEDGMENT.pdf

---

## Category 4 — Blockchain / Technology

### Q11: "Why is there an XRPL attestation? Is this a crypto deal?"

**Response:**
"No. The XRPL attestation is a **delivery verification layer**, not a custody or settlement mechanism. Think of it as a tamper-evident seal on the document delivery. It proves that the documents you received are the exact documents we sent, at the exact time we sent them. All custody, settlement, and enforcement remain traditional. The blockchain adds trust but is not required for enforcement."

---

### Q12: "Does enforcement depend on the blockchain?"

**Response:**
"No. Enforcement is entirely through traditional UCC mechanics. The XRPL attestation is supplementary verification — it enhances transparency but creates no dependency. If the XRPL ceased to exist tomorrow, the custody arrangement at STC, the UCC perfection, and the enforcement path would be completely unaffected."

---

### Q13: "What is the smart contract reference in your materials?"

**Response:**
"Future state only. The current facility uses traditional legal agreements. Smart contracts are referenced in our technology roadmap but have no bearing on the current transaction structure. All current settlement is manual with traditional legal enforcement."

---

## Category 5 — Reporting & Covenants

### Q14: "What reporting do we receive as lender?"

**Response:**
"Monthly borrowing base certificate (auto-generated), monthly portfolio summary, quarterly compliance report, annual audited financials, and exception reporting for any covenant trigger. The full schedule is documented in our Reporting Covenant Schedule, which is in the data room."

**Supporting docs:** REPORTING_COVENANT_SCHEDULE.pdf, MONTHLY_REPORTING_PACK_OUTLINE.pdf

---

### Q15: "How is exception reporting handled?"

**Response:**
"Exception triggers, alert thresholds, and escalation paths are fully defined. The system monitors borrowing base compliance automatically and generates alerts when approaching covenant thresholds. Exception reports are delivered within 2 business days of a trigger event."

**Supporting docs:** EXCEPTION_REPORTING_DEFINITION.pdf

---

### Q16: "Is the borrowing base automated or manual?"

**Response:**
"Automated with manual override. The platform generates borrowing base certificates on schedule using real-time collateral data. Each certificate can be manually reviewed and signed before delivery. The automation overview is in the data room."

**Supporting docs:** BORROWING_BASE_AUTOMATION_OVERVIEW.pdf

---

## Category 6 — Sponsor & Platform

### Q17: "Who is the sponsor/operator?"

**Response (the one-sentence answer):**
"The platform sponsor is Unykorn 7777, Inc. — operator agreements are executed. Details are available in a separate track if relevant to your analysis."

**Then stop.** Do not volunteer:
- Sponsor note economics
- Platform licensing details
- Revenue model
- Fee schedules

If they ask for more, say: "We can share the sponsor package separately. For the senior secured facility, the sponsor agreements are confirmed executed and do not encumber the collateral."

---

### Q18: "Is the platform mission-critical to the collateral?"

**Response:**
"The platform provides operational infrastructure including automated reporting, borrowing base generation, and audit trail capabilities. However, the collateral itself — TC Advantage Notes at STC — exists independently of the platform. The platform enhances operational efficiency but creates no dependency for enforcement."

---

### Q19: "What happens if the platform goes down?"

**Response:**
"The collateral is held at STC. The UCC perfection is independent. The enforcement path is traditional. The platform provides reporting automation and operational efficiency — if it were unavailable, reporting would revert to manual processes. No collateral would be at risk."

---

## Category 7 — Deal Terms

### Q20: "What terms are you seeking?"

**Response:**
"Senior secured revolving credit facility, approximately $4M initial draw. Advance rates of 50–65% against verified face value. 24-month tenor with extension options. Monthly reporting covenant. Full details in our Terms Requested document."

**Supporting docs:** TERMS_REQUESTED.pdf, DRAFT_TERM_SHEET.pdf

---

### Q21: "Why a revolving facility instead of a term loan?"

**Response:**
"The revolving structure matches the operational profile. As additional collateral is verified and added, draw capacity increases within the borrowing base. This gives both parties flexibility and avoids re-documentation for subsequent draws."

---

### Q22: "What's the pricing expectation?"

**Response:**
"We are open to market pricing. Our priority is structure and speed over rate optimization. We expect pricing to reflect the conservative LTV, institutional documentation, and collateral quality. We would welcome your indication."

---

## Response Rules

1. **Never guess.** If you don't know, say "I'll confirm and get back to you within 24 hours."
2. **Never volunteer sponsor economics** unless specifically asked, then give the one-sentence answer.
3. **Never say 'blockchain-based facility'** — say "facility with enhanced verification."
4. **Never use the word 'crypto'** in any lender-facing communication.
5. **Always end with a next step:** "Shall we schedule a diligence call?" or "The data room link is [X]."
6. **Reference documents by their data room location**, not by internal file names.

---

*This Q&A covers Track 1 (Bond/Collateral) only. Track 2 (Sponsor) has a separate preparation document.*
