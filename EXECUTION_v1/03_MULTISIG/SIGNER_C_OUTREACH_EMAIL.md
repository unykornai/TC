# SIGNER C OUTREACH EMAIL (DEAL COUNSEL)

**To:** [Counsel Name / Counsel Email]  
**Subject:** Limited-Scope Request: Independent Signer for 2-of-3 Multisig Governance (Non-Custodial)  
**Priority:** Normal  
**Attachments:** Optional — SIGNER_C_SELECTION_GUIDE.md

---

## EMAIL BODY (PROFESSIONAL/EXEC TONE)

Hi [Counsel Name],

I'm reaching out with a narrow, clearly defined request for the OPTKAS1-MAIN SPV transaction.

We have an execution-ready RWA infrastructure and documentation package supporting a secured notes collateral program. To finalize governance for settlement authorization, we are implementing a **2-of-3 multisig** where two signatures are required for any settlement action.

We are designating the third signer ("Signer C") as **independent deal counsel**, acting in a **non-custodial, governance-only capacity**. This is intended to meet lender and audit expectations for independence and controls.

**Scope (Signer C):**

* Participate as the neutral third signer in a **2-of-3** authorization model
* Sign only when execution conditions are met (as defined in the workflow)
* Provide an **attestation of address control** and role acknowledgment
* No custody of client funds or collateral, no discretionary investment authority

**Not requested / explicitly excluded:**

* No custody, no asset management, no broker/dealer activity
* No obligation to monitor day-to-day operations
* No responsibility for commercial underwriting of the facility

If you're open to this, I can share:

* The Signer C selection guide (neutrality criteria + lender expectations)
* The signer attestation workflow (one page)
* The multisig configuration file for your review (role-defined)

If you prefer, we can structure this as a limited-scope engagement letter covering:

* role definition,
* standard liability limitations,
* and a clear signing protocol.

Are you available for a 15-minute call this week to confirm fit and logistics?

Thank you,  
[Your Name]  
Unykorn 7777, Inc.

---

## EMAIL BODY (ALTERNATIVE: MORE LEGAL/FORMAL TONE)

Dear [Counsel Name],

I am writing to request your consideration of a limited-scope engagement for OPTKAS1-MAIN SPV in connection with its secured notes collateral program.

**Background**

OPTKAS1-MAIN SPV has developed comprehensive transaction infrastructure, including institutional data room materials, cryptographic verification protocols, and settlement authorization workflows. As a final governance measure, we are implementing a 2-of-3 multisignature authorization model for all settlement transactions.

**Requested Role: Independent Signer C**

We respectfully request that you serve as the independent third signer ("Signer C") in a non-custodial governance capacity. This designation is intended to satisfy lender governance standards and audit requirements for independent oversight.

**Scope of Engagement**

Your role would be limited to:

1. **Multisig Authorization**: Participate as one of three signers in a 2-of-3 threshold authorization model
2. **Conditional Approval**: Authorize settlement transactions only when execution conditions (as defined in the settlement protocol) are satisfied
3. **Address Attestation**: Provide a formal attestation of wallet address control and acknowledgment of governance role

**Expressly Excluded**

The engagement would expressly exclude:

* Custody or control of client funds, collateral, or digital assets
* Investment discretion or asset management responsibilities
* Broker-dealer, registered representative, or fiduciary investment activities
* Ongoing monitoring or reporting obligations beyond multisig authorization
* Responsibility for commercial underwriting, credit analysis, or facility terms

**Documentation Available for Review**

If you are open to this engagement, we can provide:

1. Signer C Selection Guide (governance criteria and lender expectations)
2. Signer Attestation Workflow (one-page process document)
3. Multisig Configuration Specification (technical parameters and role definitions)
4. Draft Engagement Letter (limited-scope, liability limitations, indemnification)

**Next Steps**

Would you be available for a brief call this week to discuss the scope, answer any questions, and confirm logistics? The engagement setup requires approximately 15 minutes once your wallet address is provided.

Thank you for your consideration.

Sincerely,  
[Your Name]  
[Your Title]  
Unykorn 7777, Inc.

---

## ONE-PAGE SUMMARY (PASTE IF REQUESTED)

### **Signer C Role Summary (Non-Custodial Governance)**

**Purpose:** Provide independent governance assurance for settlement authorization

**Mechanism:** 2-of-3 multisig — any settlement requires 2 of 3 signatures

**Signer C:** Independent deal counsel to OPTKAS1-MAIN SPV

**Why Counsel:** Best audit defensibility, lender-standard neutrality, avoids conflicts

**No Custody:** Signer C does not hold collateral, receive funds, or control assets

**Outputs:** 
- Attestation of wallet address control
- Signature protocol acknowledgment
- Address control proof (cryptographic)

**Time Required:** Setup is ~15 minutes once address is provided

**Legal Framework:**
- Non-custodial governance only
- No investment discretion
- No ongoing monitoring obligations
- Limited-scope engagement with standard liability protections

**Lender/Audit Perception:**
- Gold standard for multisig neutrality
- Satisfies credit committee governance expectations
- Clean independence documentation

---

## ATTACHMENTS TO INCLUDE

**When sending email, attach or link to:**

1. **SIGNER_C_SELECTION_GUIDE.md** (this explains why counsel is preferred)
   - GitHub: https://github.com/unykornai/TC/blob/main/EXECUTION_v1/03_MULTISIG/SIGNER_C_SELECTION_GUIDE.md

2. **SIGNER_ATTESTATIONS.md** (this shows what they'll need to complete)
   - GitHub: https://github.com/unykornai/TC/blob/main/EXECUTION_v1/03_MULTISIG/SIGNER_ATTESTATIONS.md

3. **MULTISIG_CONFIG_LIVE.json** (this shows the technical configuration)
   - GitHub: https://github.com/unykornai/TC/blob/main/EXECUTION_v1/03_MULTISIG/MULTISIG_CONFIG_LIVE.json

**Optional:** Export documents as PDFs if counsel prefers not to access GitHub directly.

---

## POST-"YES" CHECKLIST

Once counsel agrees:

- [ ] Collect wallet address (XRPL and/or EVM)
- [ ] Send SIGNER_ATTESTATIONS.md for completion
- [ ] Request signature proof (they sign message with private key)
- [ ] Verify signature proves address control
- [ ] Update MULTISIG_CONFIG_LIVE.json with their address
- [ ] Have counsel review and approve updated config
- [ ] Pin config to IPFS
- [ ] Run `node xrpl_attest.js <CID> "Multisig Config v1.0 - Live"`
- [ ] Record TX hash in XRPL_ATTESTATION_TXs.md
- [ ] Confirm governance layer complete
- [ ] Update todo list: Signer C designation ✅ COMPLETE

---

## EXPECTED QUESTIONS & ANSWERS

**Q: What if there's a dispute between Unykorn and OPTKAS1?**  
A: Signer C would evaluate the settlement request against the documented protocol. If unclear, Signer C can decline to sign until parties clarify.

**Q: What's my liability exposure?**  
A: Limited-scope engagement with standard indemnification. No custody, no discretion, no fiduciary duty beyond following the documented protocol. Covered by professional liability insurance.

**Q: How often will I need to sign?**  
A: Depends on settlement frequency. Likely monthly for interest payments, quarterly for distributions, occasionally for facility draws. Each requires ~2 minutes to review and authorize.

**Q: What if I lose access to my wallet?**  
A: Multisig config can be amended with unanimous 3-of-3 approval to rotate to a new address. Recovery process is documented.

**Q: What's the fee structure?**  
A: [To be negotiated — typical structures: flat monthly retainer, per-signature fee, or one-time setup fee + ongoing hourly as-incurred]

---

## TONE SELECTION GUIDE

**Use Professional/Exec Tone when:**
- Counsel already knows you
- Speed is priority
- Relationship is established
- Less formal firm culture

**Use Legal/Formal Tone when:**
- First contact with counsel
- Large/conservative firm
- Counsel unfamiliar with crypto/RWA
- Want to emphasize seriousness and professionalism

**Both versions include same substantive content, just different framing.**

---

## CUSTOMIZATION INSTRUCTIONS

**Before sending:**

1. Replace `[Counsel Name]` with actual name
2. Replace `[Your Name]` and `[Your Title]` with your information
3. Choose Professional/Exec OR Legal/Formal version (delete the other)
4. Decide whether to attach PDFs or link to GitHub
5. Add specific fee structure if known
6. Optional: Add one sentence about OPTKAS1-MAIN SPV background if counsel is unfamiliar

**After sending:**

- Set reminder for 2-3 business days if no response
- Prepare to schedule 15-minute call within 48 hours of "yes"
- Have SIGNER_ATTESTATIONS.md ready to send immediately

---

**Document Status:** READY TO SEND  
**Last Updated:** February 2, 2026  
**Owner:** Unykorn 7777, Inc.
