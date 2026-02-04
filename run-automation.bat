@echo off
REM OPTKAS1 Funding Automation Launcher
REM Windows batch script to run the PowerShell automation

echo ========================================
echo  OPTKAS1 Funding System Automation
echo ========================================
echo.

set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%funding-automation.ps1"

if not exist "%PS_SCRIPT%" (
    echo ERROR: funding-automation.ps1 not found in %SCRIPT_DIR%
    echo Please ensure the script is in the same directory as this batch file.
    pause
    exit /b 1
)

echo Available options:
echo [1] Run all automation tasks
echo [2] Check portal accessibility
echo [3] Generate reports only
echo [4] Generate email templates only
echo [5] Show help
echo.

set /p choice="Select option (1-5): "

if "%choice%"=="1" goto all
if "%choice%"=="2" goto portal
if "%choice%"=="3" goto reports
if "%choice%"=="4" goto emails
if "%choice%"=="5" goto help

echo Invalid option selected.
goto end

:all
echo Running all automation tasks...
powershell.exe -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -All
goto end

:portal
echo Checking portal accessibility...
powershell.exe -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -CheckPortal
goto end

:reports
echo Generating funding reports...
powershell.exe -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -GenerateReports
goto end

:emails
echo Generating email templates...
powershell.exe -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -SendEmails
goto end

:help
echo.
echo OPTKAS1 Funding Automation Help
echo ================================
echo.
echo This script automates the final steps of the OPTKAS1 funding process:
echo.
echo • Portal accessibility verification
echo • Email template generation for all parties
echo • Funding readiness reports
echo • Automated notifications via GitHub Actions
echo.
echo Prerequisites:
echo • PowerShell 5.1 or higher
echo • Internet connection for portal checks
echo.
echo Usage:
echo Run this batch file and select your desired automation task.
echo.
echo For manual PowerShell execution:
echo powershell.exe -ExecutionPolicy Bypass -File funding-automation.ps1 [options]
echo.
pause
goto end

:end
echo.
echo Automation complete. Press any key to exit...
pause >nul