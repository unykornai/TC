# How to Issue Partner Documents for Signing

**Last Updated:** February 6, 2026  
**Status:** Production Ready  
**Purpose:** Step-by-step guide for issuing partner agreement documents to be signed

---

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start (5 Minutes)](#quick-start-5-minutes)
- [Detailed Process](#detailed-process)
- [Using the Automation Script](#using-the-automation-script)
- [Manual Process](#manual-process)
- [Post-Issuance](#post-issuance)
- [Troubleshooting](#troubleshooting)

---

## Overview

This guide explains how to issue the Strategic Infrastructure & Execution Agreement documents to partners (Unykorn 7777, Inc. and OPTKAS1-MAIN SPV) for review and signature.

### What Gets Issued

The complete **PARTNER_ISSUANCE_v1** package including:

- ✅ Strategic Infrastructure & Execution Agreement
- ✅ Signature Page
- ✅ Exhibit A: Economic Participation
- ✅ Exhibit B: Smart Contract Settlement Spec
- ✅ All Disclosure Documents
- ✅ Signing Instructions
- ✅ Cryptographic Verification Tools

---

## Prerequisites

Before issuing documents, ensure:

- [ ] All agreement documents are finalized
- [ ] Legal review is complete
- [ ] Both parties are ready to receive documents
- [ ] You have access to party contact information
- [ ] (Optional) IPFS node is available for pinning

### Required Tools

**Option 1: Automated (Recommended)**
- PowerShell 5.0 or higher
- Git (for repository access)

**Option 2: Manual**
- Email client
- Access to GitHub repository
- (Optional) IPFS tools for verification

---

## Quick Start (5 Minutes)

### Automated Issuance

The fastest way to issue partner documents:

```powershell
# Navigate to repository
cd /path/to/TC

# Run the automated issuance script
.\issue-partner-documents.ps1 -All
```

This will:
1. ✅ Validate the package
2. ✅ Generate document hashes
3. ✅ Create email templates for both parties
4. ✅ Prepare IPFS-ready package
5. ✅ Generate issuance summary

**Result:** Find all generated files in `ISSUANCE_OUTPUT_[timestamp]/` folder.

### Send the Emails

1. Open the generated email files:
   - `EMAIL_TO_Unykorn_7777_Inc_[date].txt`
   - `EMAIL_TO_OPTKAS1-MAIN_SPV_[date].txt`

2. Copy content to your email client

3. Send to:
   - Unykorn 7777, Inc.: `kevan@xxxiii.io`
   - OPTKAS1-MAIN SPV: `jimmy@optkas.com`

**Done!** Partners will receive clear instructions on what to do next.

---

## Detailed Process

### Step 1: Prepare the Package

#### 1.1 Validate Package Integrity

Run validation to ensure all required files are present:

```powershell
.\issue-partner-documents.ps1 -ValidatePackage
```

Expected output:
```
✓ Found: PARTNER_ISSUANCE_v1/00_README/README.md
✓ Found: PARTNER_ISSUANCE_v1/01_AGREEMENT/STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md
✓ Found: PARTNER_ISSUANCE_v1/01_AGREEMENT/SIGNATURE_PAGE.md
...
✓ All required files present
```

#### 1.2 Generate Document Hashes

Generate SHA-256 hashes for cryptographic verification:

```powershell
.\issue-partner-documents.ps1 -GenerateHashes
```

This creates:
- `PARTNER_ISSUANCE_v1/03_CRYPTO_PROOFS/HASHES.txt` (human-readable)
- `PARTNER_ISSUANCE_v1/03_CRYPTO_PROOFS/manifest.json` (machine-readable)

### Step 2: Generate Issuance Materials

#### 2.1 Create Email Templates

Generate customized emails for each party:

```powershell
# For both parties
.\issue-partner-documents.ps1 -GenerateEmail -Recipient Both

# Or individually
.\issue-partner-documents.ps1 -GenerateEmail -Recipient Unykorn
.\issue-partner-documents.ps1 -GenerateEmail -Recipient OPTKAS
```

#### 2.2 Prepare IPFS Package (Optional but Recommended)

Create a clean package ready for IPFS pinning:

```powershell
.\issue-partner-documents.ps1 -CreateIPFSPackage
```

This creates an `IPFS_PACKAGE/` folder with:
- Complete document set
- Verification hashes
- Pinning instructions

### Step 3: Issue Documents to Partners

#### 3.1 Send Notification Emails

Use the generated email templates:

**Email Structure:**
- **Subject:** Partner Agreement Ready for Review and Signature
- **Content:** 
  - Quick action required (15-20 minutes)
  - Links to all documents
  - Economic options explanation
  - Clear execution process
  - Contact information

**Recipients:**
- **Unykorn 7777, Inc.**: kevan@xxxiii.io
- **OPTKAS1-MAIN SPV**: jimmy@optkas.com

#### 3.2 Alternative: Share GitHub Links

If parties have GitHub access, share direct links:

**Main Package:**
```
https://github.com/unykornai/TC/tree/main/PARTNER_ISSUANCE_v1
```

**Key Documents:**
```
Agreement: /PARTNER_ISSUANCE_v1/01_AGREEMENT/STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md
Signature: /PARTNER_ISSUANCE_v1/01_AGREEMENT/SIGNATURE_PAGE.md
Exhibit A:  /PARTNER_ISSUANCE_v1/01_AGREEMENT/EXHIBIT_A_ECONOMIC_PARTICIPATION.md
```

#### 3.3 IPFS Distribution (Optional)

If using IPFS for immutable distribution:

1. Pin the package:
   ```bash
   ipfs add -r -Q PARTNER_ISSUANCE_v1
   # Returns: Qm... or bafy...
   ```

2. Record the CID in:
   ```
   PARTNER_ISSUANCE_v1/03_CRYPTO_PROOFS/IPFS_CID.txt
   ```

3. Share CID with parties via email

4. Parties can retrieve with:
   ```bash
   ipfs get <CID>
   ```

### Step 4: Track Receipt and Progress

#### 4.1 Confirmation Checklist

Track the following confirmations:

- [ ] Unykorn received and acknowledged email
- [ ] OPTKAS received and acknowledged email
- [ ] Unykorn confirmed document access
- [ ] OPTKAS confirmed document access
- [ ] Both parties confirmed they can open/read documents
- [ ] Questions addressed

#### 4.2 Economic Option Coordination

**Critical:** Both parties must select the same option before signing.

Coordinate via email or call:
- **Option A:** 10% Net Cash Flow Participation (Recommended)
- **Option B:** 2% Success Fee + 4% Ongoing Participation

Record agreed option in your tracking system.

---

## Using the Automation Script

### Full Command Reference

#### Complete Issuance (Recommended)
```powershell
.\issue-partner-documents.ps1 -All
```

Runs all steps: validate, hash, email, IPFS prep, and summary.

#### Individual Steps

**Validate Only:**
```powershell
.\issue-partner-documents.ps1 -ValidatePackage
```

**Generate Hashes Only:**
```powershell
.\issue-partner-documents.ps1 -GenerateHashes
```

**Generate Emails Only:**
```powershell
.\issue-partner-documents.ps1 -GenerateEmail
```

**Prepare IPFS Package Only:**
```powershell
.\issue-partner-documents.ps1 -CreateIPFSPackage
```

#### Combined Steps
```powershell
.\issue-partner-documents.ps1 -ValidatePackage -GenerateHashes -GenerateEmail
```

### Output Structure

After running with `-All`, you'll find:

```
ISSUANCE_OUTPUT_[timestamp]/
├── EMAIL_TO_Unykorn_7777_Inc_[date].txt
├── EMAIL_TO_OPTKAS1-MAIN_SPV_[date].txt
├── IPFS_PACKAGE/
│   └── [Complete package copy]
├── IPFS_PINNING_INSTRUCTIONS.txt
└── ISSUANCE_SUMMARY.txt
```

---

## Manual Process

If you prefer not to use the automation script:

### Step 1: Verify Documents

Manually check that these files exist:

```
PARTNER_ISSUANCE_v1/
├── 00_README/
│   ├── README.md
│   └── ISSUANCE_CHECKLIST.md
├── 01_AGREEMENT/
│   ├── STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md
│   ├── SIGNATURE_PAGE.md
│   ├── EXHIBIT_A_ECONOMIC_PARTICIPATION.md
│   └── EXHIBIT_B_SMART_CONTRACT_SETTLEMENT_SPEC.md
├── 02_DISCLOSURES/
│   ├── ROLE_DISCLOSURE_NON_FIDUCIARY.md
│   ├── RISK_DISCLOSURE_TECH_AND_SETTLEMENT.md
│   └── CONFIDENTIALITY_NOTICE.md
└── 03_CRYPTO_PROOFS/
    └── SIGNING_INSTRUCTIONS.md
```

### Step 2: Create Manual Email

Use this template:

```
To: kevan@xxxiii.io, jimmy@optkas.com
Subject: Partner Agreement Ready for Review and Signature

Dear Partners,

The Strategic Infrastructure & Execution Agreement is ready for your review and signature.

DOCUMENTS TO REVIEW:
https://github.com/unykornai/TC/tree/main/PARTNER_ISSUANCE_v1

KEY ACTIONS NEEDED:
1. Review the agreement and exhibits
2. Both parties: agree on Option A or Option B
3. Complete signature page
4. Return signed copy

NEXT STEPS:
See PARTNER_ISSUANCE_v1/00_README/README.md for detailed instructions.

Questions: jimmy@optkas.com

Best regards,
[Your Name]
```

### Step 3: Manual Hash Generation (Optional)

Using PowerShell:
```powershell
Get-ChildItem -Path "PARTNER_ISSUANCE_v1" -Recurse -File | 
  ForEach-Object { 
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
    "$hash  $($_.Name)"
  } | Out-File "document_hashes.txt"
```

Using Bash/Linux:
```bash
find PARTNER_ISSUANCE_v1 -type f -exec shasum -a 256 {} \; > document_hashes.txt
```

---

## Post-Issuance

### What Happens Next

After you issue the documents:

1. **Parties Review** (1-3 business days)
   - Partners download/access documents
   - Legal review if needed
   - Questions raised and answered

2. **Economic Option Agreement** (1-2 business days)
   - Both parties discuss and agree on Option A or B
   - Agreement documented via email

3. **Signature Collection** (2-5 business days)
   - Both parties complete and sign signature page
   - Signed copies exchanged between parties
   - You collect both signed versions

4. **Post-Execution Processing** (1-2 business days)
   - Generate hashes of signed package
   - Pin signed package to IPFS
   - Record CID
   - Distribute final CID to all parties
   - Optional: Anchor to XRPL

### Tracking Template

Use this checklist to track progress:

```
ISSUANCE TRACKING
Date Issued: _____________

[ ] Day 0: Documents issued to both parties
[ ] Day 0: Unykorn confirmed receipt
[ ] Day 0: OPTKAS confirmed receipt
[ ] Day 1-2: Questions answered
[ ] Day 2-3: Economic option agreed
[ ] Day 3-5: Unykorn signature received
[ ] Day 3-5: OPTKAS signature received
[ ] Day 5-7: Signed package processed
[ ] Day 7: IPFS CID distributed
[ ] Complete: Move to lender outreach
```

---

## Troubleshooting

### Issue: Script Won't Run

**Problem:** PowerShell execution policy blocks script.

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try again:
```powershell
.\issue-partner-documents.ps1 -All
```

### Issue: Missing Files Error

**Problem:** Script reports missing required files.

**Solution:**
1. Ensure you're in the repository root directory
2. Check that PARTNER_ISSUANCE_v1 folder exists
3. Verify all agreement files are present
4. Re-clone repository if files are missing

### Issue: Email Not Reaching Partners

**Problem:** Partners didn't receive notification email.

**Solution:**
1. Check email addresses:
   - Unykorn: kevan@xxxiii.io
   - OPTKAS: jimmy@optkas.com
2. Check spam/junk folders
3. Resend with read receipt requested
4. Follow up with direct phone call
5. Use alternative: Share GitHub link directly

### Issue: Partners Can't Access GitHub

**Problem:** Partners report they can't see documents.

**Solution:**

**Option 1:** Make repository public (if appropriate)

**Option 2:** Email document attachments
1. Export markdown files to PDF
2. Attach to email
3. Include hashes for verification

**Option 3:** Use alternative hosting
1. Pin to IPFS (public access)
2. Share CID for retrieval
3. Or upload to secure file sharing service

### Issue: Hash Verification Failed

**Problem:** Generated hashes don't match.

**Solution:**
1. Ensure no files were modified after hash generation
2. Regenerate hashes:
   ```powershell
   .\issue-partner-documents.ps1 -GenerateHashes
   ```
3. Use same hash algorithm (SHA-256)
4. Check for hidden characters or encoding issues

### Issue: Parties Don't Know Which Option to Choose

**Problem:** Partners unsure about Option A vs Option B.

**Solution:**

Provide guidance:

**Recommend Option A if:**
- ✅ Want simpler structure
- ✅ No upfront capital required
- ✅ Long-term partnership focus
- ✅ Aligned incentives

**Recommend Option B if:**
- ✅ Want upfront success fee
- ✅ Lower ongoing participation acceptable
- ✅ Short-term liquidity needed

**Schedule a call** to discuss:
- Economic implications
- Cash flow modeling
- Strategic fit
- Answer questions

---

## Additional Resources

### Related Documentation

- **Main README**: [PARTNER_ISSUANCE_v1/00_README/README.md](PARTNER_ISSUANCE_v1/00_README/README.md)
- **Issuance Checklist**: [PARTNER_ISSUANCE_v1/00_README/ISSUANCE_CHECKLIST.md](PARTNER_ISSUANCE_v1/00_README/ISSUANCE_CHECKLIST.md)
- **Signing Instructions**: [PARTNER_ISSUANCE_v1/03_CRYPTO_PROOFS/SIGNING_INSTRUCTIONS.md](PARTNER_ISSUANCE_v1/03_CRYPTO_PROOFS/SIGNING_INSTRUCTIONS.md)

### Email Templates

- **Funding Automation**: [funding-automation.ps1](funding-automation.ps1)
- **Generated Templates**: Check `ISSUANCE_OUTPUT_*/` folders

### Technical References

- **IPFS Pinning**: https://docs.ipfs.io/
- **SHA-256 Hashing**: Standard cryptographic verification
- **XRPL Attestation**: Optional blockchain anchoring

---

## Support

### Primary Contact

**OPTKAS1 SPV Manager**  
Email: jimmy@optkas.com

### For Technical Issues

- Review this guide thoroughly
- Check troubleshooting section
- Verify all prerequisites met
- Contact SPV manager with specific error details

---

## Summary: 3-Step Quick Reference

### Step 1: Run Script
```powershell
.\issue-partner-documents.ps1 -All
```

### Step 2: Send Emails
Copy generated email content and send to:
- Unykorn: kevan@xxxiii.io
- OPTKAS: jimmy@optkas.com

### Step 3: Track Progress
- Confirm receipt
- Answer questions
- Coordinate option selection
- Collect signatures

**That's it!** The automation handles the rest.

---

*Last updated: February 6, 2026*  
*Version: 1.0*  
*Status: Production Ready*
