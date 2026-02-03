# PRE-EXECUTION IPFS PINNING INSTRUCTIONS

**Purpose:** Pin unsigned PARTNER_ISSUANCE_v1 package before signature  
**Timing:** Execute NOW (before signing)  
**Owner:** Either party can execute

---

## 🎯 WHY PIN BEFORE SIGNING

Pinning the **unsigned template** to IPFS creates:

1. **Immutable reference point** — Proves what was reviewed pre-signature
2. **Audit trail** — Shows no post-review modifications
3. **Verification baseline** — Third parties can confirm template integrity

This is **separate** from pinning the signed package (done after execution).

---

## 📋 PRE-FLIGHT CHECKLIST

- [ ] IPFS daemon running (`ipfs daemon`) OR pinning service ready
- [ ] Located in workspace root directory
- [ ] PARTNER_ISSUANCE_v1 folder intact (15 files across 5 subfolders)

---

## ⚡ EXECUTION (One Command)

### PowerShell

```powershell
# Navigate to workspace root
cd C:\Users\Kevan\Documents\OPTKAS1-Funding-System

# Pin entire PARTNER_ISSUANCE_v1 folder
ipfs add -r PARTNER_ISSUANCE_v1

# Returns CID (example):
# added QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXX PARTNER_ISSUANCE_v1
```

### Bash

```bash
# Navigate to workspace root
cd ~/OPTKAS1-Funding-System

# Pin entire PARTNER_ISSUANCE_v1 folder
ipfs add -r PARTNER_ISSUANCE_v1

# Returns CID
```

---

## 📝 RECORD CID

**Copy the CID from terminal output** (starts with `Qm...`)

**Example output:**
```
added QmPZ9gcCEpqKTo6aq61g2nXGUhM1PLBMMYSFp3RKgRv1eN PARTNER_ISSUANCE_v1/00_README/ISSUANCE_CHECKLIST.md
added QmQXYZ... PARTNER_ISSUANCE_v1/00_README/README.md
...
added QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXX PARTNER_ISSUANCE_v1 <-- THIS IS THE FOLDER CID
```

**The folder CID is the LAST line.**

---

## 💾 STORE CID

**Create file:**

```powershell
# Record in IPFS_ATTESTATIONS folder
echo "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" | Out-File -FilePath "EXECUTION_v1\04_IPFS_ATTESTATIONS\PARTNER_ISSUANCE_v1_CID.txt" -Encoding UTF8
```

**Bash:**

```bash
echo "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" > EXECUTION_v1/04_IPFS_ATTESTATIONS/PARTNER_ISSUANCE_v1_CID.txt
```

---

## ✅ VERIFICATION

**Test retrieval:**

```bash
ipfs get <CID>
```

Should download entire PARTNER_ISSUANCE_v1 folder.

**Compare hashes:**

```powershell
# Compute hash of downloaded folder
Get-ChildItem -Path "<downloaded-folder>" -Recurse -File | ForEach-Object {
    (Get-FileHash $_.FullName -Algorithm SHA256).Hash + "  " + $_.Name
}

# Compare to PARTNER_ISSUANCE_v1/03_CRYPTO_PROOFS/HASHES.txt
```

Hashes must match exactly.

---

## 📊 COMPLETION CHECKLIST

- [ ] IPFS pin successful
- [ ] CID recorded in `EXECUTION_v1/04_IPFS_ATTESTATIONS/PARTNER_ISSUANCE_v1_CID.txt`
- [ ] Verification test passed (can retrieve from IPFS)
- [ ] CID shared with counterparty (optional)

---

## ⚠️ IMPORTANT NOTES

**This pin is for the UNSIGNED template.**

After signing:
- A **separate** signed package will be created
- That signed package will be pinned with a **different CID**
- Both CIDs will be preserved (unsigned + signed)

**Do not delete or overwrite this CID.**

---

## 🔄 WHAT HAPPENS NEXT

1. ✅ Unsigned package pinned (you are here)
2. ⏳ Review and sign agreement
3. ⏳ Create signed package in `EXECUTION_v1/02_SIGNED_AGREEMENTS/`
4. ⏳ Pin signed package (generates new CID)
5. ⏳ XRPL attestation (optional)

---

**Status:** READY TO EXECUTE  
**Estimated Time:** 2-5 minutes  
**Prerequisites:** IPFS daemon running
