# Partner Document Issuance Script
# Automates the process of issuing partner agreement documents for signature

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("Unykorn", "OPTKAS", "Both")]
    [string]$Recipient = "Both",
    
    [Parameter(Mandatory=$false)]
    [switch]$GenerateHashes,
    
    [Parameter(Mandatory=$false)]
    [switch]$ValidatePackage,
    
    [Parameter(Mandatory=$false)]
    [switch]$GenerateEmail,
    
    [Parameter(Mandatory=$false)]
    [switch]$CreateIPFSPackage,
    
    [Parameter(Mandatory=$false)]
    [switch]$All
)

# Configuration
$PartnerPackagePath = "PARTNER_ISSUANCE_v1"
$AgreementSendPath = "Agreement_Send_Package"
$OutputPath = "ISSUANCE_OUTPUT_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Party Information
$Parties = @{
    Unykorn = @{
        Name = "Unykorn 7777, Inc."
        Email = "contact@unykorn7777.com"
        Role = "Infrastructure Partner"
    }
    OPTKAS = @{
        Name = "OPTKAS1-MAIN SPV"
        Email = "jimmy@optkas.com"
        Role = "SPV Manager"
    }
}

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
    Header = "Magenta"
}

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor $Colors.Header
    Write-Host " $Text" -ForegroundColor $Colors.Header
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor $Colors.Header
    Write-Host ""
}

function Write-Step {
    param([string]$Text)
    Write-Host "➤ $Text" -ForegroundColor $Colors.Info
}

function Write-Success {
    param([string]$Text)
    Write-Host "✓ $Text" -ForegroundColor $Colors.Success
}

function Write-Warning {
    param([string]$Text)
    Write-Host "⚠ $Text" -ForegroundColor $Colors.Warning
}

function Write-Error {
    param([string]$Text)
    Write-Host "✗ $Text" -ForegroundColor $Colors.Error
}

function Test-PackageIntegrity {
    Write-Header "VALIDATING PACKAGE INTEGRITY"
    
    $requiredFiles = @(
        "$PartnerPackagePath/00_README/README.md",
        "$PartnerPackagePath/00_README/ISSUANCE_CHECKLIST.md",
        "$PartnerPackagePath/01_AGREEMENT/STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md",
        "$PartnerPackagePath/01_AGREEMENT/SIGNATURE_PAGE.md",
        "$PartnerPackagePath/01_AGREEMENT/EXHIBIT_A_ECONOMIC_PARTICIPATION.md",
        "$PartnerPackagePath/01_AGREEMENT/EXHIBIT_B_SMART_CONTRACT_SETTLEMENT_SPEC.md",
        "$PartnerPackagePath/02_DISCLOSURES/ROLE_DISCLOSURE_NON_FIDUCIARY.md",
        "$PartnerPackagePath/02_DISCLOSURES/RISK_DISCLOSURE_TECH_AND_SETTLEMENT.md",
        "$PartnerPackagePath/02_DISCLOSURES/CONFIDENTIALITY_NOTICE.md",
        "$PartnerPackagePath/03_CRYPTO_PROOFS/SIGNING_INSTRUCTIONS.md"
    )
    
    $allValid = $true
    
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-Success "Found: $file"
        } else {
            Write-Error "Missing: $file"
            $allValid = $false
        }
    }
    
    Write-Host ""
    
    if ($allValid) {
        Write-Success "All required files present ✓"
        return $true
    } else {
        Write-Error "Package validation failed. Missing required files."
        return $false
    }
}

function New-DocumentHashes {
    Write-Header "GENERATING DOCUMENT HASHES"
    
    $hashOutputPath = "$PartnerPackagePath/03_CRYPTO_PROOFS/HASHES.txt"
    $manifestPath = "$PartnerPackagePath/03_CRYPTO_PROOFS/manifest.json"
    
    Write-Step "Computing SHA-256 hashes for all documents..."
    
    $hashes = @()
    $manifest = @{
        version = "1.0"
        generated = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        package = "PARTNER_ISSUANCE_v1"
        files = @()
    }
    
    Get-ChildItem -Path $PartnerPackagePath -Recurse -File | 
        Where-Object { $_.Name -ne "HASHES.txt" -and $_.Name -ne "manifest.json" } |
        ForEach-Object {
            $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
            $relativePath = $_.FullName.Replace("$PWD\", "").Replace("$PWD/", "")
            $hashes += "$hash  $relativePath"
            
            $manifest.files += @{
                path = $relativePath
                hash = $hash
                size = $_.Length
            }
            
            Write-Host "  $hash  $($_.Name)" -ForegroundColor Gray
        }
    
    # Save hashes
    $hashes | Out-File -FilePath $hashOutputPath -Encoding UTF8
    Write-Success "Hashes saved to: $hashOutputPath"
    
    # Save manifest
    $manifest | ConvertTo-Json -Depth 10 | Out-File -FilePath $manifestPath -Encoding UTF8
    Write-Success "Manifest saved to: $manifestPath"
    
    Write-Host ""
    Write-Success "Total files hashed: $($manifest.files.Count)"
}

function New-IssuanceEmail {
    param(
        [string]$RecipientType
    )
    
    Write-Header "GENERATING ISSUANCE EMAIL"
    
    $party = $Parties[$RecipientType]
    
    $emailTemplate = @"
Subject: Partner Agreement Ready for Review and Signature

Dear $($party.Name),

The Strategic Infrastructure & Execution Agreement between Unykorn 7777, Inc. and OPTKAS1-MAIN SPV is ready for your review and signature.

═══════════════════════════════════════════════════════════
QUICK ACTION REQUIRED (15-20 minutes)
═══════════════════════════════════════════════════════════

1. ☐ Review the agreement documents (links below)
2. ☐ Select Option A or Option B in Exhibit A
3. ☐ Complete and sign the signature page
4. ☐ Return executed copy to counterparty

═══════════════════════════════════════════════════════════
DOCUMENT ACCESS
═══════════════════════════════════════════════════════════

📦 Complete Partner Package:
   https://github.com/unykornai/TC/tree/main/PARTNER_ISSUANCE_v1

📄 Key Documents:
   • Agreement: PARTNER_ISSUANCE_v1/01_AGREEMENT/STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md
   • Signature Page: PARTNER_ISSUANCE_v1/01_AGREEMENT/SIGNATURE_PAGE.md
   • Exhibit A (Economic Terms): PARTNER_ISSUANCE_v1/01_AGREEMENT/EXHIBIT_A_ECONOMIC_PARTICIPATION.md
   • Exhibit B (Technical Specs): PARTNER_ISSUANCE_v1/01_AGREEMENT/EXHIBIT_B_SMART_CONTRACT_SETTLEMENT_SPEC.md

📋 Instructions:
   PARTNER_ISSUANCE_v1/00_README/README.md
   PARTNER_ISSUANCE_v1/00_README/ISSUANCE_CHECKLIST.md
   PARTNER_ISSUANCE_v1/03_CRYPTO_PROOFS/SIGNING_INSTRUCTIONS.md

═══════════════════════════════════════════════════════════
ECONOMIC OPTIONS (Choose One)
═══════════════════════════════════════════════════════════

Option A: Net Cash Flow Participation (RECOMMENDED)
• 10% of Net Distributable Cash Flow
• No upfront fees
• Simple structure

Option B: Hybrid Model
• 2% success fee (at facility close)
• 4% of Net Distributable Cash Flow (ongoing)

Both parties must select the same option before signing.

═══════════════════════════════════════════════════════════
EXECUTION PROCESS
═══════════════════════════════════════════════════════════

1. Choose your preferred option (A or B)
2. Complete the signature page with:
   - Your name and title
   - Date
   - Initial your selected option
3. Sign the document (digital or ink signature)
4. Email signed copy to counterparty
5. Technical team will handle IPFS pinning and hash recording

═══════════════════════════════════════════════════════════
VERIFICATION
═══════════════════════════════════════════════════════════

All documents include SHA-256 hashes for verification.
See: PARTNER_ISSUANCE_v1/03_CRYPTO_PROOFS/HASHES.txt

After both parties sign:
• Package will be pinned to IPFS
• CID will be recorded
• Optional: Hash anchored to XRPL

═══════════════════════════════════════════════════════════
TIMELINE
═══════════════════════════════════════════════════════════

Target execution date: Within 5 business days
Next step after signing: Lender outreach and facility funding

═══════════════════════════════════════════════════════════
QUESTIONS?
═══════════════════════════════════════════════════════════

Contact: jimmy@optkas.com

Please confirm receipt and your preferred execution timeline.

Best regards,
OPTKAS1 Partnership Team

---
This communication is confidential and intended solely for the named recipient.
"@

    $emailFileName = "$OutputPath/EMAIL_TO_$($party.Name.Replace(' ', '_').Replace('.', '').Replace(',', ''))_$(Get-Date -Format 'yyyyMMdd').txt"
    
    # Create output directory if it doesn't exist
    if (-not (Test-Path $OutputPath)) {
        New-Item -ItemType Directory -Path $OutputPath | Out-Null
    }
    
    $emailTemplate | Out-File -FilePath $emailFileName -Encoding UTF8
    Write-Success "Email generated: $emailFileName"
    
    return $emailFileName
}

function New-IPFSReadyPackage {
    Write-Header "CREATING IPFS-READY PACKAGE"
    
    Write-Step "Creating clean package for IPFS pinning..."
    
    $ipfsPackagePath = "$OutputPath/IPFS_PACKAGE"
    
    # Copy the entire partner package
    Copy-Item -Path $PartnerPackagePath -Destination $ipfsPackagePath -Recurse -Force
    
    Write-Success "Package copied to: $ipfsPackagePath"
    
    # Generate final instructions
    $ipfsInstructions = @"
# IPFS Package Ready for Pinning

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## To Pin This Package to IPFS:

### Using IPFS CLI:
``````bash
ipfs add -r -Q IPFS_PACKAGE
``````

This will return a CID (Content Identifier) like: Qm... or bafy...

### Using Pinata:
1. Zip the IPFS_PACKAGE folder
2. Upload to https://pinata.cloud
3. Record the returned CID

### Using web3.storage:
1. Visit https://web3.storage
2. Upload the IPFS_PACKAGE folder
3. Record the returned CID

## After Pinning:

1. Record the CID in: PARTNER_ISSUANCE_v1/03_CRYPTO_PROOFS/IPFS_CID.txt
2. Share the CID with all parties
3. Parties can retrieve with: ipfs get <CID>

## Verification:

All file hashes are recorded in:
IPFS_PACKAGE/03_CRYPTO_PROOFS/HASHES.txt

Parties should verify downloaded files match these hashes.

---
Package prepared by OPTKAS1 Partnership Team
"@

    $ipfsInstructions | Out-File -FilePath "$OutputPath/IPFS_PINNING_INSTRUCTIONS.txt" -Encoding UTF8
    Write-Success "Instructions saved: $OutputPath/IPFS_PINNING_INSTRUCTIONS.txt"
}

function New-IssuanceSummary {
    Write-Header "ISSUANCE SUMMARY"
    
    $summary = @"
═══════════════════════════════════════════════════════════
PARTNER DOCUMENT ISSUANCE SUMMARY
═══════════════════════════════════════════════════════════

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Package: PARTNER_ISSUANCE_v1
Status: READY FOR DISTRIBUTION

═══════════════════════════════════════════════════════════
PARTIES
═══════════════════════════════════════════════════════════

Party 1: Unykorn 7777, Inc. (Infrastructure Partner)
Contact: $($Parties.Unykorn.Email)

Party 2: OPTKAS1-MAIN SPV (SPV Manager)
Contact: $($Parties.OPTKAS.Email)

═══════════════════════════════════════════════════════════
DOCUMENTS ISSUED
═══════════════════════════════════════════════════════════

✓ Strategic Infrastructure & Execution Agreement
✓ Signature Page
✓ Exhibit A: Economic Participation
✓ Exhibit B: Smart Contract Settlement Specification
✓ Role Disclosure (Non-Fiduciary)
✓ Risk Disclosure (Technology & Settlement)
✓ Confidentiality Notice
✓ Signing Instructions
✓ Issuance Checklist

═══════════════════════════════════════════════════════════
NEXT STEPS
═══════════════════════════════════════════════════════════

For Each Party:

1. [ ] Receive and acknowledge email notification
2. [ ] Review all agreement documents
3. [ ] Review disclosure documents
4. [ ] Select Option A or Option B (must agree)
5. [ ] Complete signature page
6. [ ] Return executed copy to counterparty

For Technical Team:

7. [ ] Collect signed documents from both parties
8. [ ] Generate hashes of signed package
9. [ ] Pin signed package to IPFS
10. [ ] Record CID
11. [ ] Distribute CID to all parties
12. [ ] (Optional) Anchor to XRPL

═══════════════════════════════════════════════════════════
DISTRIBUTION CHECKLIST
═══════════════════════════════════════════════════════════

[ ] Email sent to Unykorn 7777, Inc.
[ ] Email sent to OPTKAS1-MAIN SPV
[ ] Package hashes generated
[ ] Package validated
[ ] GitHub repository updated
[ ] Parties confirmed receipt

═══════════════════════════════════════════════════════════
OUTPUT FILES
═══════════════════════════════════════════════════════════

Generated in: $OutputPath/

• Email templates for each party
• IPFS-ready package
• Pinning instructions
• This summary document

═══════════════════════════════════════════════════════════
TIMELINE
═══════════════════════════════════════════════════════════

Target Execution: Within 5 business days
Post-Execution: IPFS pinning within 1 business day
Next Phase: Lender outreach and facility funding

═══════════════════════════════════════════════════════════
SUPPORT
═══════════════════════════════════════════════════════════

Questions or assistance needed:
Contact: jimmy@optkas.com

═══════════════════════════════════════════════════════════
"@

    $summaryPath = "$OutputPath/ISSUANCE_SUMMARY.txt"
    $summary | Out-File -FilePath $summaryPath -Encoding UTF8
    
    Write-Host $summary
    Write-Success "Summary saved to: $summaryPath"
}

# ═══════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════

Write-Header "PARTNER DOCUMENT ISSUANCE TOOL"

Write-Host "This tool automates the process of issuing partner agreement" -ForegroundColor White
Write-Host "documents for signature between Unykorn 7777, Inc. and OPTKAS1-MAIN SPV." -ForegroundColor White
Write-Host ""

# Create output directory
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath | Out-Null
    Write-Success "Created output directory: $OutputPath"
}

# Execute based on flags
if ($All -or $ValidatePackage) {
    if (-not (Test-PackageIntegrity)) {
        Write-Error "Package validation failed. Please fix missing files before proceeding."
        exit 1
    }
}

if ($All -or $GenerateHashes) {
    New-DocumentHashes
}

if ($All -or $GenerateEmail) {
    switch ($Recipient) {
        "Unykorn" {
            New-IssuanceEmail -RecipientType "Unykorn"
        }
        "OPTKAS" {
            New-IssuanceEmail -RecipientType "OPTKAS"
        }
        "Both" {
            New-IssuanceEmail -RecipientType "Unykorn"
            New-IssuanceEmail -RecipientType "OPTKAS"
        }
    }
}

if ($All -or $CreateIPFSPackage) {
    New-IPFSReadyPackage
}

if ($All) {
    New-IssuanceSummary
}

# Display help if no flags provided
if (-not ($ValidatePackage -or $GenerateHashes -or $GenerateEmail -or $CreateIPFSPackage -or $All)) {
    Write-Host ""
    Write-Host "USAGE:" -ForegroundColor $Colors.Header
    Write-Host ""
    Write-Host "  .\issue-partner-documents.ps1 [-All]" -ForegroundColor White
    Write-Host "  .\issue-partner-documents.ps1 [-ValidatePackage] [-GenerateHashes] [-GenerateEmail] [-CreateIPFSPackage]" -ForegroundColor White
    Write-Host ""
    Write-Host "OPTIONS:" -ForegroundColor $Colors.Header
    Write-Host ""
    Write-Host "  -All                 Run all steps (recommended)" -ForegroundColor Cyan
    Write-Host "  -ValidatePackage     Verify all required files are present" -ForegroundColor Cyan
    Write-Host "  -GenerateHashes      Generate SHA-256 hashes for all documents" -ForegroundColor Cyan
    Write-Host "  -GenerateEmail       Create email templates for parties" -ForegroundColor Cyan
    Write-Host "  -CreateIPFSPackage   Prepare package for IPFS pinning" -ForegroundColor Cyan
    Write-Host "  -Recipient           Specify recipient: Unykorn, OPTKAS, or Both (default: Both)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor $Colors.Header
    Write-Host ""
    Write-Host "  # Complete issuance process" -ForegroundColor Gray
    Write-Host "  .\issue-partner-documents.ps1 -All" -ForegroundColor Green
    Write-Host ""
    Write-Host "  # Just generate emails" -ForegroundColor Gray
    Write-Host "  .\issue-partner-documents.ps1 -GenerateEmail" -ForegroundColor Green
    Write-Host ""
    Write-Host "  # Validate and generate hashes" -ForegroundColor Gray
    Write-Host "  .\issue-partner-documents.ps1 -ValidatePackage -GenerateHashes" -ForegroundColor Green
    Write-Host ""
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor $Colors.Header
Write-Host " Issuance process complete!" -ForegroundColor $Colors.Success
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor $Colors.Header
Write-Host ""
