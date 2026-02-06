# UNY-X INTEGRATION FOR OPTKAS1

**Version:** 1.0.0  
**Date:** February 6, 2026  
**Repository:** [UnyKorn-x/uny-X](https://github.com/UnyKorn-x/uny-X)

---

## Overview

This integration connects the OPTKAS1 Funding System with the uny-X web3 automation framework, enabling:

- ✅ **IPFS Document Pinning** — Decentralized storage for Partner Issuance Package
- ✅ **XRPL Attestation** — On-chain verification of document hashes
- ✅ **Memory Graph** — Persistent audit trail with content-addressed nodes
- ✅ **Proposal Governance** — Structured approval workflow for executions
- ✅ **Smart Contract Settlement** — Automated distribution logic

---

## Directory Structure

```
web3_integration/
├── README.md                           # This file
├── SYSTEM_AUDIT_REPORT.md              # Full system audit
├── policies/
│   └── optkas1_governor.json           # Governor policy for OPTKAS1
├── core/
│   └── optkas1_bridge.py               # Main integration bridge
├── logs/
│   ├── ipfs.jsonl                      # IPFS operation logs
│   └── execution.jsonl                 # Execution logs
└── memory-graph.jsonl                  # Audit trail memory graph
```

---

## Quick Start

### 1. Initialize Integration

```powershell
cd C:\Users\Kevan\Documents\OPTKAS1-Funding-System\web3_integration\core
python optkas1_bridge.py init
```

### 2. Verify Partner Issuance Package

```powershell
python optkas1_bridge.py verify
```

### 3. Check System Status

```powershell
python optkas1_bridge.py status
```

### 4. Pin Partner Issuance to IPFS

```powershell
# Ensure IPFS daemon is running first
ipfs daemon &
python optkas1_bridge.py pin
```

### 5. Create Execution Proposal

```powershell
python optkas1_bridge.py proposal "Execute Strategic Infrastructure Agreement"
```

---

## Integration with uny-X Repository

### Cloning uny-X

```powershell
# Clone the uny-X repository
git clone https://github.com/UnyKorn-x/uny-X.git
cd uny-X

# Or add as submodule to OPTKAS1
cd C:\Users\Kevan\Documents\OPTKAS1-Funding-System
git submodule add https://github.com/UnyKorn-x/uny-X.git uny-x
```

### Using uny-X CLI

```powershell
cd uny-x

# Check status
python cli/ai.py status

# Scan project
python cli/ai.py scan ../PARTNER_ISSUANCE_v1

# Create proposal
python cli/ai.py propose "Pin Partner Issuance Package to IPFS"

# Approve proposal
python cli/ai.py approve --proposal proposals/<proposal_file>.json

# Run with approval
python cli/ai.py run --proposal proposals/<proposal_file>.json --approve
```

### Policy Configuration

Copy the OPTKAS1 governor policy to uny-X:

```powershell
copy ..\web3_integration\policies\optkas1_governor.json policies\optkas1_governor.json
```

Then use it:

```powershell
python cli/ai.py --policy policies/optkas1_governor.json status
```

---

## Key Components

### 1. Governor Policy (`optkas1_governor.json`)

The policy defines:
- **Allowed file extensions** — What files can be processed
- **Deny globs** — Paths to exclude
- **Secret patterns** — Regex for detecting secrets
- **Execution mode** — ASSISTED_EXECUTION (requires approval)
- **IPFS configuration** — RPC URL, gateway, allowed actions
- **XRPL configuration** — Network, explorer, attestation account
- **Multisig configuration** — Threshold, signers

### 2. Bridge Module (`optkas1_bridge.py`)

Functions available:

| Function | Description |
|:---------|:------------|
| `initialize_integration()` | Initialize the integration |
| `verify_partner_issuance_integrity()` | Verify package files and hashes |
| `load_multisig_config()` | Load multisig configuration |
| `ipfs_add(file_path)` | Add file to IPFS |
| `ipfs_add_directory(dir_path)` | Add directory to IPFS |
| `create_memory_node(type, data)` | Create audit trail node |
| `write_memory_node(node)` | Persist node to graph |
| `create_xrpl_attestation_memo(type, hash)` | Create XRPL memo |
| `create_partner_execution_proposal(task)` | Create execution proposal |
| `get_system_status()` | Get current system status |

### 3. Memory Graph

The memory graph (`memory-graph.jsonl`) stores:
- Document hashes
- IPFS CIDs
- Execution records
- Approval events
- Attestation references

Each node is content-addressed with SHA-256 for immutability.

---

## Workflow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        OPTKAS1 EXECUTION FLOW                         │
└──────────────────────────────────────────────────────────────────────┘

1. VERIFICATION
   ├── Run: python optkas1_bridge.py verify
   ├── Check: All 15 required files present
   └── Output: SHA-256 hashes for each file

2. PROPOSAL CREATION
   ├── Run: python optkas1_bridge.py proposal "Execute Agreement"
   ├── Check: Proposal JSON generated
   └── Output: Structured execution plan

3. IPFS PINNING
   ├── Run: python optkas1_bridge.py pin
   ├── Check: IPFS daemon running
   └── Output: Root CID for PARTNER_ISSUANCE_v1

4. MEMORY GRAPH UPDATE
   ├── Auto: Each operation creates a node
   ├── Check: memory-graph.jsonl
   └── Output: Content-addressed audit trail

5. XRPL ATTESTATION
   ├── Manual: Create transaction with memo
   ├── Target: rnAF6Ki5sbmPZ4dTNCVzH5iyb9ScdSqyNr
   └── Output: Transaction hash for explorer

6. EXECUTION COMPLETION
   ├── Store: Executed documents in EXECUTION_v1
   ├── Update: Memory graph with completion
   └── Archive: Full audit trail preserved
```

---

## XRPL Attestation Format

When creating an on-chain attestation, use this memo structure:

```json
{
  "type": "OPTKAS1_ATTESTATION",
  "version": "1.0",
  "document_type": "PARTNER_ISSUANCE_PACKAGE",
  "sha256": "<hash_of_package>",
  "ipfs_cid": "<ipfs_cid>",
  "timestamp": "2026-02-06T00:00:00Z"
}
```

Memo fields:
- **MemoType**: `746578742F6F70746B617331` (hex for "text/optkas1")
- **MemoData**: Hex-encoded JSON

---

## Security Considerations

1. **Never commit secrets** — Private keys, passwords, API keys
2. **Verify before signing** — Always run `verify` before execution
3. **Use 2-of-3 multisig** — Standard operations require 2 signers
4. **Use 3-of-3 for critical** — Address changes require all 3
5. **Pin before attestation** — Ensure IPFS CID before XRPL memo
6. **Log everything** — All operations are logged to JSONL

---

## Troubleshooting

### IPFS daemon not running

```powershell
# Start IPFS daemon
ipfs daemon
```

### Python module not found

```powershell
# Ensure you're in the correct directory
cd C:\Users\Kevan\Documents\OPTKAS1-Funding-System\web3_integration\core
```

### Policy file not found

```powershell
# Use full path
python cli/ai.py --policy "C:\Users\Kevan\Documents\OPTKAS1-Funding-System\web3_integration\policies\optkas1_governor.json" status
```

---

## Links

- **OPTKAS1 Funding Portal**: https://unykornai.github.io/TC/funding-portal.html
- **Partner Issuance Docs**: https://unykornai.github.io/TC/PARTNER_ISSUANCE_v1/
- **uny-X Repository**: https://github.com/UnyKorn-x/uny-X
- **XRPL Explorer**: https://livenet.xrpl.org

---

## Contact

- **SPV Manager**: jimmy@optkas.com
- **Partner**: Unykorn 7777, Inc.
- **Repository**: unykornai/TC

---

*Last Updated: February 6, 2026*
