# WEB3 INTEGRATION INDEX

**OPTKAS1 Funding System ↔ uny-X Integration**  
**Version:** 1.0.0  
**Date:** February 6, 2026

---

## Quick Reference

| Resource | Location |
|:---------|:---------|
| **Integration Guide** | [README.md](README.md) |
| **System Audit** | [SYSTEM_AUDIT_REPORT.md](SYSTEM_AUDIT_REPORT.md) |
| **Governor Policy** | [policies/optkas1_governor.json](policies/optkas1_governor.json) |
| **Bridge Module** | [core/optkas1_bridge.py](core/optkas1_bridge.py) |
| **Manifest** | [manifest.json](manifest.json) |
| **Memory Graph** | [memory-graph.jsonl](memory-graph.jsonl) |

---

## External Links

| Resource | URL |
|:---------|:----|
| **uny-X Repository** | https://github.com/UnyKorn-x/uny-X |
| **OPTKAS1 Repository** | https://github.com/unykornai/TC |
| **Funding Portal** | https://unykornai.github.io/TC/funding-portal.html |
| **XRPL Explorer** | https://livenet.xrpl.org |
| **Payment Address** | https://livenet.xrpl.org/accounts/rnAF6Ki5sbmPZ4dTNCVzH5iyb9ScdSqyNr |

---

## File Inventory

### Configuration Files

| File | Purpose | Status |
|:-----|:--------|:------:|
| `manifest.json` | Integration manifest | ✅ |
| `policies/optkas1_governor.json` | Governor policy | ✅ |

### Core Modules

| File | Purpose | Status |
|:-----|:--------|:------:|
| `core/optkas1_bridge.py` | Main integration bridge | ✅ |

### Documentation

| File | Purpose | Status |
|:-----|:--------|:------:|
| `README.md` | Integration guide | ✅ |
| `SYSTEM_AUDIT_REPORT.md` | Full system audit | ✅ |
| `INDEX.md` | This file | ✅ |

### Data Files

| File | Purpose | Status |
|:-----|:--------|:------:|
| `memory-graph.jsonl` | Audit trail graph | ✅ |
| `logs/ipfs.jsonl` | IPFS operation logs | Pending |
| `logs/execution.jsonl` | Execution logs | Pending |

---

## Commands

### Initialization

```powershell
python core/optkas1_bridge.py init
```

### Verification

```powershell
python core/optkas1_bridge.py verify
```

### Status Check

```powershell
python core/optkas1_bridge.py status
```

### IPFS Pinning

```powershell
python core/optkas1_bridge.py pin
```

### Create Proposal

```powershell
python core/optkas1_bridge.py proposal "Your task description"
```

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OPTKAS1-FUNDING-SYSTEM                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ DATA_ROOM_v1  │  │PARTNER_ISSUE. │  │ EXECUTION_v1  │   │
│  │   (FROZEN)    │  │   (READY)     │  │ (IN PROGRESS) │   │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘   │
│          │                  │                  │           │
│          └──────────────────┼──────────────────┘           │
│                             │                              │
│                    ┌────────▼────────┐                     │
│                    │ web3_integration│                     │
│                    │                 │                     │
│                    │ ┌─────────────┐ │                     │
│                    │ │ Bridge .py  │ │                     │
│                    │ └──────┬──────┘ │                     │
│                    │        │        │                     │
│                    │ ┌──────▼──────┐ │                     │
│                    │ │  Governor   │ │                     │
│                    │ │   Policy    │ │                     │
│                    │ └──────┬──────┘ │                     │
│                    │        │        │                     │
│                    │ ┌──────▼──────┐ │                     │
│                    │ │ Memory Graph│ │                     │
│                    │ └─────────────┘ │                     │
│                    └────────┬────────┘                     │
│                             │                              │
└─────────────────────────────┼──────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      UNY-X (Web3 Layer)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    IPFS     │  │    XRPL     │  │  Proposals  │         │
│  │  Pinning    │  │ Attestation │  │  & Approvals│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Verification Hashes

To verify this integration package:

```powershell
# From web3_integration directory
Get-ChildItem -Recurse -File | ForEach-Object {
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
    "$hash  $($_.Name)"
}
```

---

## Next Steps

1. **Clone uny-X** — `git clone https://github.com/UnyKorn-x/uny-X.git`
2. **Start IPFS daemon** — `ipfs daemon`
3. **Initialize integration** — `python core/optkas1_bridge.py init`
4. **Pin Partner Issuance** — `python core/optkas1_bridge.py pin`
5. **Create XRPL attestation** — Manual or via uny-X proposal

---

*Last Updated: February 6, 2026*
