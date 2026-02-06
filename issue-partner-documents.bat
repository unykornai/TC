@echo off
REM Partner Document Issuance Batch Script
REM Windows wrapper for issue-partner-documents.ps1

echo.
echo ========================================================
echo  Partner Document Issuance Tool
echo ========================================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: PowerShell not found. Please install PowerShell.
    pause
    exit /b 1
)

REM Check if script exists
if not exist "issue-partner-documents.ps1" (
    echo ERROR: issue-partner-documents.ps1 not found
    echo Please run this batch file from the repository root directory.
    pause
    exit /b 1
)

REM Display menu
:menu
echo.
echo Select an option:
echo.
echo [1] Complete Issuance Process (Recommended)
echo [2] Validate Package Only
echo [3] Generate Hashes Only
echo [4] Generate Email Templates Only
echo [5] Create IPFS Package Only
echo [6] Help
echo [0] Exit
echo.
set /p choice="Enter your choice (0-6): "

if "%choice%"=="1" goto all
if "%choice%"=="2" goto validate
if "%choice%"=="3" goto hashes
if "%choice%"=="4" goto email
if "%choice%"=="5" goto ipfs
if "%choice%"=="6" goto help
if "%choice%"=="0" goto end
echo Invalid choice. Please try again.
goto menu

:all
echo.
echo Running complete issuance process...
echo.
powershell -ExecutionPolicy Bypass -File ".\issue-partner-documents.ps1" -All
goto done

:validate
echo.
echo Validating package...
echo.
powershell -ExecutionPolicy Bypass -File ".\issue-partner-documents.ps1" -ValidatePackage
goto done

:hashes
echo.
echo Generating document hashes...
echo.
powershell -ExecutionPolicy Bypass -File ".\issue-partner-documents.ps1" -GenerateHashes
goto done

:email
echo.
echo Generating email templates...
echo.
powershell -ExecutionPolicy Bypass -File ".\issue-partner-documents.ps1" -GenerateEmail
goto done

:ipfs
echo.
echo Creating IPFS package...
echo.
powershell -ExecutionPolicy Bypass -File ".\issue-partner-documents.ps1" -CreateIPFSPackage
goto done

:help
echo.
echo ========================================================
echo  HELP
echo ========================================================
echo.
echo This tool automates the issuance of partner agreement
echo documents for signature.
echo.
echo Option 1: Complete Process (Recommended)
echo   - Validates package
echo   - Generates hashes
echo   - Creates email templates
echo   - Prepares IPFS package
echo   - Generates summary
echo.
echo Option 2: Validate Package
echo   - Checks all required files are present
echo.
echo Option 3: Generate Hashes
echo   - Creates SHA-256 hashes for verification
echo.
echo Option 4: Generate Emails
echo   - Creates email templates for both parties
echo.
echo Option 5: Create IPFS Package
echo   - Prepares package for IPFS pinning
echo.
echo For detailed documentation, see:
echo   HOW_TO_ISSUE_PARTNER_DOCS.md
echo.
pause
goto menu

:done
echo.
echo ========================================================
echo  Process Complete
echo ========================================================
echo.
echo Check the output folder for generated files.
echo.
set /p again="Run another task? (Y/N): "
if /i "%again%"=="Y" goto menu
if /i "%again%"=="y" goto menu

:end
echo.
echo Thank you for using the Partner Document Issuance Tool.
echo.
pause
