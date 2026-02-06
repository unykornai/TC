#!/bin/bash
# Partner Document Issuance Script - Linux/macOS version
# Wrapper for issue-partner-documents.ps1

set -e

echo ""
echo "══════════════════════════════════════════════════════════"
echo " Partner Document Issuance Tool"
echo "══════════════════════════════════════════════════════════"
echo ""

# Check if PowerShell is available
if ! command -v pwsh &> /dev/null; then
    echo "ERROR: PowerShell (pwsh) is not installed."
    echo ""
    echo "To install PowerShell:"
    echo "  macOS:  brew install --cask powershell"
    echo "  Linux:  https://docs.microsoft.com/powershell/scripting/install/installing-powershell"
    echo ""
    exit 1
fi

# Check if script exists
if [ ! -f "issue-partner-documents.ps1" ]; then
    echo "ERROR: issue-partner-documents.ps1 not found"
    echo "Please run this script from the repository root directory."
    exit 1
fi

# Display menu
show_menu() {
    echo ""
    echo "Select an option:"
    echo ""
    echo "[1] Complete Issuance Process (Recommended)"
    echo "[2] Validate Package Only"
    echo "[3] Generate Hashes Only"
    echo "[4] Generate Email Templates Only"
    echo "[5] Create IPFS Package Only"
    echo "[6] Help"
    echo "[0] Exit"
    echo ""
}

# Main loop
while true; do
    show_menu
    read -p "Enter your choice (0-6): " choice
    
    case $choice in
        1)
            echo ""
            echo "Running complete issuance process..."
            echo ""
            pwsh -File "./issue-partner-documents.ps1" -All
            ;;
        2)
            echo ""
            echo "Validating package..."
            echo ""
            pwsh -File "./issue-partner-documents.ps1" -ValidatePackage
            ;;
        3)
            echo ""
            echo "Generating document hashes..."
            echo ""
            pwsh -File "./issue-partner-documents.ps1" -GenerateHashes
            ;;
        4)
            echo ""
            echo "Generating email templates..."
            echo ""
            pwsh -File "./issue-partner-documents.ps1" -GenerateEmail
            ;;
        5)
            echo ""
            echo "Creating IPFS package..."
            echo ""
            pwsh -File "./issue-partner-documents.ps1" -CreateIPFSPackage
            ;;
        6)
            echo ""
            echo "══════════════════════════════════════════════════════════"
            echo " HELP"
            echo "══════════════════════════════════════════════════════════"
            echo ""
            echo "This tool automates the issuance of partner agreement"
            echo "documents for signature."
            echo ""
            echo "Option 1: Complete Process (Recommended)"
            echo "  - Validates package"
            echo "  - Generates hashes"
            echo "  - Creates email templates"
            echo "  - Prepares IPFS package"
            echo "  - Generates summary"
            echo ""
            echo "Option 2: Validate Package"
            echo "  - Checks all required files are present"
            echo ""
            echo "Option 3: Generate Hashes"
            echo "  - Creates SHA-256 hashes for verification"
            echo ""
            echo "Option 4: Generate Emails"
            echo "  - Creates email templates for both parties"
            echo ""
            echo "Option 5: Create IPFS Package"
            echo "  - Prepares package for IPFS pinning"
            echo ""
            echo "For detailed documentation, see:"
            echo "  HOW_TO_ISSUE_PARTNER_DOCS.md"
            echo ""
            read -p "Press Enter to continue..."
            ;;
        0)
            echo ""
            echo "Thank you for using the Partner Document Issuance Tool."
            echo ""
            exit 0
            ;;
        *)
            echo "Invalid choice. Please try again."
            ;;
    esac
    
    if [ "$choice" != "6" ] && [ "$choice" != "0" ]; then
        echo ""
        echo "══════════════════════════════════════════════════════════"
        echo " Process Complete"
        echo "══════════════════════════════════════════════════════════"
        echo ""
        echo "Check the output folder for generated files."
        echo ""
        read -p "Run another task? (y/n): " again
        if [ "$again" != "y" ] && [ "$again" != "Y" ]; then
            echo ""
            echo "Thank you for using the Partner Document Issuance Tool."
            echo ""
            exit 0
        fi
    fi
done
