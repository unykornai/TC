# ISSUANCE CHECKLIST

**Partner Issuance Package v1.0**  
**Last Updated:** February 2, 2026

---

## Pre-Execution (Issuer Side)

| Step | Action | Status |
|:----:|--------|:------:|
| 1 | Generate all agreement documents | ☐ |
| 2 | Generate all disclosure documents | ☐ |
| 3 | Generate HASHES.txt (SHA-256 for all files) | ☐ |
| 4 | Generate manifest.json | ☐ |
| 5 | Internal legal review complete | ☐ |
| 6 | Package folder structure verified | ☐ |

---

## Distribution

| Step | Action | Status |
|:----:|--------|:------:|
| 7 | Pin package to IPFS | ☐ |
| 8 | Record IPFS CID | ☐ |
| 9 | Send CID + HASHES.txt to counterparty | ☐ |
| 10 | Counterparty confirms hash match | ☐ |

---

## Counterparty Review

| Step | Action | Status |
|:----:|--------|:------:|
| 11 | Download/pin package from IPFS | ☐ |
| 12 | Verify all file hashes match HASHES.txt | ☐ |
| 13 | Review STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md | ☐ |
| 14 | Review EXHIBIT_A (Economic Participation) | ☐ |
| 15 | Review EXHIBIT_B (Smart Contract Spec) | ☐ |
| 16 | Review all disclosures | ☐ |
| 17 | Confirm understanding of risks | ☐ |

---

## Execution

| Step | Action | Status |
|:----:|--------|:------:|
| 18 | Select Option A or Option B in Exhibit A | ☐ |
| 19 | Initial selected option (both parties) | ☐ |
| 20 | Complete SIGNATURE_PAGE.md | ☐ |
| 21 | Return signed copy to counterparty | ☐ |
| 22 | Counterparty countersigns | ☐ |
| 23 | Generate hash of signed package | ☐ |

---

## Post-Execution

| Step | Action | Status |
|:----:|--------|:------:|
| 24 | Create SIGNED_PACKET_v1 folder | ☐ |
| 25 | Pin signed packet to IPFS | ☐ |
| 26 | Record new CID for signed version | ☐ |
| 27 | Anchor CID + hash to XRPL (optional) | ☐ |
| 28 | Notify all signers of final CID | ☐ |
| 29 | Store in permanent records | ☐ |

---

## Verification Commands

### Generate Hashes (PowerShell)
```powershell
Get-ChildItem -Path "PARTNER_ISSUANCE_v1" -Recurse -File | 
  ForEach-Object { 
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
    "$hash  $($_.Name)"
  }
```

### Verify Against HASHES.txt
```powershell
# Compare computed hashes to recorded hashes
$recorded = Get-Content "03_CRYPTO_PROOFS\HASHES.txt"
# Manual comparison or scripted diff
```

### Pin to IPFS
```powershell
ipfs add -r -Q "PARTNER_ISSUANCE_v1"
# Returns: <CID>
```

---

## Signer Confirmation Template

```
I, [NAME], representing [PARTY], hereby confirm:

1. I have downloaded/pinned the package with CID: [CID]
2. I have verified all file hashes match HASHES.txt
3. I have reviewed all agreement documents and disclosures
4. I understand the economic terms and risks described
5. I am authorized to execute on behalf of [PARTY]

Signature: _________________________
Date: _____________________________
```

---

## Notes

- All dates are in ISO 8601 format (YYYY-MM-DD)
- All hashes are SHA-256, uppercase hex
- IPFS CIDs are CIDv1 format preferred
- Keep original unsigned and signed versions separate

---

*Checklist maintained by SPV Manager*
