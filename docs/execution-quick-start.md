---
layout: default
title: Quick Start Execution
---

# Quick Start: Partner Agreement Execution

**For:** Busy executives who need to execute fast  
**Time Required:** 15 minutes (excluding review)

---

## 🎯 THREE-STEP EXECUTION

### STEP 1: Choose Economic Option (2 minutes)

**Call Jimmy. Agree on ONE:**

- **Option A:** 10% of net cash flow (recommended)
- **Option B:** 2% upfront + 4% ongoing

Both parties must choose the same.

---

### STEP 2: Sign (5 minutes)

**Open:** `PARTNER_ISSUANCE_v1/01_AGREEMENT/SIGNATURE_PAGE.md`

**Fill in:**
- Your name
- Title
- Date
- Check the box for your chosen option
- Initial

**Export to PDF and sign** (DocuSign, wet signature, etc.)

**Send signed PDF to counterparty.**

---

### STEP 3: Store & Pin (8 minutes)

**Create folder:**
```
EXECUTION_v1/02_SIGNED_AGREEMENTS/PARTNER_AGREEMENT_SIGNED/
```

**Copy these files:**
1. All documents from `PARTNER_ISSUANCE_v1/01_AGREEMENT/`
2. Your signed `SIGNATURE_PAGE_SIGNED.pdf`

**Generate hash:**
```powershell
cd EXECUTION_v1/02_SIGNED_AGREEMENTS/PARTNER_AGREEMENT_SIGNED
Get-ChildItem -File | ForEach-Object {
    (Get-FileHash $_.FullName -Algorithm SHA256).Hash + "  " + $_.Name
} | Out-File "HASHES_SIGNED.txt"
```

**Pin to IPFS:**
```bash
ipfs add -r EXECUTION_v1/02_SIGNED_AGREEMENTS/PARTNER_AGREEMENT_SIGNED
# Copy the returned CID (starts with Qm...)
echo "<CID>" > EXECUTION_v1/02_SIGNED_AGREEMENTS/PARTNER_AGREEMENT_SIGNED/IPFS_CID.txt
```

---

## ✅ DONE

You've now:
- ✅ Executed the partner agreement
- ✅ Created cryptographic proof
- ✅ Archived with immutable hash

**Next:** Designate Multisig Signer C

---

**For full details:** See [Partner Agreement Execution Instructions](partner-execution.md)

[← Back to Home](index.md)
