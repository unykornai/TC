# IPFS INSTALLATION GUIDE

**For OPTKAS1 Funding System Integration**

---

## Windows Installation

### Option 1: Download Binary

1. Visit https://dist.ipfs.tech/kubo/v0.24.0/
2. Download `kubo_v0.24.0_windows-amd64.zip`
3. Extract to `C:\ipfs\`
4. Add `C:\ipfs\` to your PATH environment variable
5. Open new PowerShell and run: `ipfs init`

### Option 2: Using Chocolatey

```powershell
# Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install IPFS
choco install ipfs
```

### Option 3: Using winget

```powershell
winget install ipfs
```

---

## Initialize IPFS

After installation:

```powershell
# Initialize IPFS (creates ~/.ipfs directory)
ipfs init

# Start the daemon
ipfs daemon
```

Keep the daemon running in a separate terminal window.

---

## Test Installation

```powershell
# Check version
ipfs version

# Add a test file
echo "Hello OPTKAS1" | ipfs add

# Should return a CID like: QmXXXXXXXXXXXXXXXX
```

---

## Integration Commands

Once IPFS is running:

```powershell
cd C:\Users\Kevan\Documents\OPTKAS1-Funding-System\web3_integration\core

# Test IPFS connection
python optkas1_bridge.py status

# Pin Partner Issuance Package
python optkas1_bridge.py pin
```

---

## Troubleshooting

### Daemon not starting

```powershell
# Check if IPFS is already running
ipfs swarm peers

# Kill existing daemon
taskkill /f /im ipfs.exe

# Restart daemon
ipfs daemon
```

### Port conflicts

```powershell
# Use different ports
ipfs config Addresses.API /ip4/127.0.0.1/tcp/5002
ipfs config Addresses.Gateway /ip4/127.0.0.1/tcp/8081
```

---

*Part of OPTKAS1 web3 integration*