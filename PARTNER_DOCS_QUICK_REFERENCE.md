# Partner Document Issuance - Quick Reference Card

**Last Updated:** February 6, 2026

---

## 🚀 FASTEST WAY TO ISSUE DOCUMENTS

### Step 1: Run the Script
```powershell
.\issue-partner-documents.ps1 -All
```

### Step 2: Send the Emails
Look in the `ISSUANCE_OUTPUT_[timestamp]` folder and send:
- `EMAIL_TO_Unykorn_7777_Inc_[date].txt` → kevan@xxxiii.io
- `EMAIL_TO_OPTKAS1-MAIN_SPV_[date].txt` → jimmy@optkas.com

### Step 3: Done!
Partners will receive clear instructions on what to do next.

---

## 📋 WHAT THE SCRIPT DOES

- ✅ Validates all required files are present
- ✅ Generates SHA-256 hashes for verification
- ✅ Creates customized email templates for both parties
- ✅ Prepares IPFS-ready package for pinning
- ✅ Generates comprehensive issuance summary

---

## 🖥️ COMMANDS

### Complete Process (Recommended)
```powershell
.\issue-partner-documents.ps1 -All
```

### Individual Steps
```powershell
# Validate package
.\issue-partner-documents.ps1 -ValidatePackage

# Generate hashes
.\issue-partner-documents.ps1 -GenerateHashes

# Generate emails
.\issue-partner-documents.ps1 -GenerateEmail

# Prepare IPFS package
.\issue-partner-documents.ps1 -CreateIPFSPackage
```

### Windows Users
Double-click: `issue-partner-documents.bat`

---

## 📦 WHAT GETS ISSUED

**Complete PARTNER_ISSUANCE_v1 Package:**
- Strategic Infrastructure & Execution Agreement
- Signature Page
- Exhibit A: Economic Participation (Option A or B)
- Exhibit B: Smart Contract Settlement Spec
- All Disclosure Documents
- Signing Instructions
- Cryptographic Verification Tools (hashes)

---

## 👥 RECIPIENTS

**Unykorn 7777, Inc.**
- Email: kevan@xxxiii.io
- Role: Infrastructure Partner

**OPTKAS1-MAIN SPV**
- Email: jimmy@optkas.com
- Role: SPV Manager

---

## ⏱️ TYPICAL TIMELINE

| Day | Action |
|-----|--------|
| Day 0 | Issue documents via email |
| Day 0-1 | Partners confirm receipt |
| Day 1-2 | Partners review documents |
| Day 2-3 | Agree on Option A or B |
| Day 3-5 | Collect signatures |
| Day 5-7 | IPFS pinning and finalization |

---

## 🔑 KEY DECISIONS

**Economic Options** (Both parties must agree):

**Option A** (Recommended)
- 10% of Net Distributable Cash Flow
- No upfront fees
- Simpler structure

**Option B**
- 2% success fee at close
- 4% of Net Distributable Cash Flow ongoing

---

## 📂 OUTPUT FILES

After running `-All`, find in `ISSUANCE_OUTPUT_[timestamp]/`:

```
├── EMAIL_TO_Unykorn_7777_Inc_[date].txt
├── EMAIL_TO_OPTKAS1-MAIN_SPV_[date].txt
├── IPFS_PACKAGE/ (ready for pinning)
├── IPFS_PINNING_INSTRUCTIONS.txt
└── ISSUANCE_SUMMARY.txt
```

---

## 🆘 TROUBLESHOOTING

**Script won't run?**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Missing files error?**
- Ensure you're in repository root
- Check PARTNER_ISSUANCE_v1 folder exists

**Need detailed help?**
See: `HOW_TO_ISSUE_PARTNER_DOCS.md`

---

## 📞 SUPPORT

**Questions:** jimmy@optkas.com

---

## 🔗 LINKS

**GitHub Package:**
https://github.com/unykornai/TC/tree/main/PARTNER_ISSUANCE_v1

**Detailed Guide:**
[HOW_TO_ISSUE_PARTNER_DOCS.md](HOW_TO_ISSUE_PARTNER_DOCS.md)

**Main README:**
[README.md](README.md)

---

**Remember:** After issuing, track confirmations and coordinate on Option A/B selection before signatures!
