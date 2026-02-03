# SIGNED AGREEMENTS

**Purpose:** Storage for executed agreements (post-signature)  
**Status:** ⏳ AWAITING EXECUTION

---

## 📁 FOLDER STRUCTURE

```
02_SIGNED_AGREEMENTS/
├── PARTNER_AGREEMENT_SIGNED/         # Unykorn + OPTKAS1 (first to execute)
├── FACILITY_AGREEMENT_SIGNED/        # Lender + OPTKAS1 (at closing)
├── SECURITY_AGREEMENT_SIGNED/        # Lender + OPTKAS1 (at closing)
└── CONTROL_AGREEMENT_SIGNED/         # Lender + OPTKAS1 + STC (at closing)
```

---

## ⚠️ CRITICAL RULES

### Before Uploading Signed Documents

1. ✅ **Verify all parties have signed**
2. ✅ **Generate SHA-256 hash of signed document**
3. ✅ **Create HASHES_SIGNED.txt in each subfolder**
4. ✅ **Pin complete signed package to IPFS**
5. ✅ **Record IPFS CID in IPFS_CID.txt**

### Naming Convention

- Use `_SIGNED` suffix for all executed documents
- Example: `STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT_SIGNED.pdf`
- Include date in filename if executing multiple versions

---

## 📊 EXECUTION SEQUENCE

### 1. PARTNER_AGREEMENT_SIGNED (First)
**Parties:** Unykorn 7777, Inc. + OPTKAS1-MAIN SPV  
**Timeline:** Week 1 (Feb 2-9, 2026)

**Contents:**
- STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT_SIGNED.pdf
- SIGNATURE_PAGE_SIGNED.pdf
- HASHES_SIGNED.txt
- IPFS_CID.txt

---

### 2. FACILITY_AGREEMENT_SIGNED (At Lender Close)
**Parties:** OPTKAS1-MAIN SPV + [Lender Name]  
**Timeline:** Week 8-10 (estimated)

**Contents:**
- FACILITY_AGREEMENT_SIGNED.pdf
- HASHES_SIGNED.txt
- IPFS_CID.txt (optional)

---

### 3. SECURITY_AGREEMENT_SIGNED (At Lender Close)
**Parties:** OPTKAS1-MAIN SPV + [Lender Name]  
**Timeline:** Week 8-10 (estimated)

**Contents:**
- SECURITY_AGREEMENT_SIGNED.pdf
- SCHEDULE_I_PLEDGED_SECURITIES.pdf
- HASHES_SIGNED.txt

---

### 4. CONTROL_AGREEMENT_SIGNED (At Lender Close)
**Parties:** OPTKAS1-MAIN SPV + [Lender Name] + Securities Transfer Corp  
**Timeline:** Week 8-10 (estimated)

**Contents:**
- CONTROL_AGREEMENT_SIGNED.pdf
- STC_ACKNOWLEDGMENT.pdf
- HASHES_SIGNED.txt

---

## 🔐 VERIFICATION WORKFLOW

For each signed agreement:

1. **Generate hash:**
   ```powershell
   Get-FileHash -Path "AGREEMENT_SIGNED.pdf" -Algorithm SHA256
   ```

2. **Record in HASHES_SIGNED.txt:**
   ```
   <hash>  AGREEMENT_SIGNED.pdf
   <date>  <timestamp>
   ```

3. **Pin to IPFS:**
   ```bash
   ipfs add -r FOLDER_NAME_SIGNED/
   # Returns: QmXXXXXXX...
   ```

4. **Record CID:**
   ```
   echo "QmXXXXXXX..." > IPFS_CID.txt
   ```

---

**Last Updated:** February 2, 2026
