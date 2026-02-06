"""
OPTKAS1 Bridge Module for uny-X Integration

This module bridges the OPTKAS1 Funding System with the uny-X web3 automation framework,
enabling:
- IPFS document pinning and verification
- XRPL attestation integration
- Memory graph persistence for audit trails
- Partner issuance workflow automation
- Smart contract settlement coordination

Author: Unykorn 7777, Inc.
Version: 1.0.0
Date: February 6, 2026
"""

import json
import hashlib
import datetime
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict


# ============================================================================
# Configuration
# ============================================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_ROOM_PATH = PROJECT_ROOT / "DATA_ROOM_v1"
PARTNER_ISSUANCE_PATH = PROJECT_ROOT / "PARTNER_ISSUANCE_v1"
EXECUTION_PATH = PROJECT_ROOT / "EXECUTION_v1"
LOGS_PATH = PROJECT_ROOT / "web3_integration" / "logs"
MEMORY_GRAPH_PATH = PROJECT_ROOT / "web3_integration" / "memory-graph.jsonl"

XRPL_PAYMENT_ADDRESS = "rnAF6Ki5sbmPZ4dTNCVzH5iyb9ScdSqyNr"
XRPL_EXPLORER = "https://livenet.xrpl.org"


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class PartnerIssuanceConfig:
    """Configuration for partner issuance package."""
    agreement_date: str = "2026-01-26"
    spv_entity: str = "OPTKAS1-MAIN SPV"
    partner_entity: str = "Unykorn 7777, Inc."
    contact: str = "jimmy@optkas.com"
    multisig_threshold: int = 2
    total_signers: int = 3
    option_selected: Optional[str] = None  # "A" or "B"


@dataclass
class SettlementConfig:
    """Smart contract settlement configuration."""
    primary_network: str = "XRPL"
    payment_address: str = XRPL_PAYMENT_ADDRESS
    fallback_method: str = "Wire/ACH"
    fallback_deadline: str = "5 business days"
    option_a_participation: float = 0.10
    option_b_participation: float = 0.04
    option_b_success_fee: float = 0.02


@dataclass
class MemoryNode:
    """Memory graph node for audit trail."""
    node_type: str
    timestamp: str
    cid: Optional[str]
    data: Dict[str, Any]
    edges: List[Dict[str, str]]


# ============================================================================
# Utility Functions
# ============================================================================

def canonical_json(obj: Any) -> str:
    """Generate canonical JSON for hashing."""
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_hash(content: str) -> str:
    """Compute SHA-256 hash of content."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def sha256_file(file_path: Path) -> str:
    """Compute SHA-256 hash of a file."""
    with open(file_path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def now_iso() -> str:
    """Get current UTC timestamp in ISO format."""
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def ensure_logs_dir():
    """Ensure logs directory exists."""
    LOGS_PATH.mkdir(parents=True, exist_ok=True)


def append_jsonl(path: Path, record: Dict[str, Any]) -> None:
    """Append a record to a JSONL file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


# ============================================================================
# IPFS Integration
# ============================================================================

def ipfs_add(file_path: Path, pin: bool = True) -> Optional[str]:
    """
    Add a file to IPFS and return the CID.
    
    Args:
        file_path: Path to the file to add
        pin: Whether to pin the content (default: True)
        
    Returns:
        CID string if successful, None otherwise
    """
    try:
        # Check if IPFS is available
        version_check = subprocess.run(
            ["ipfs", "version"], 
            capture_output=True, 
            text=True, 
            check=True
        )
        
        cmd = ["ipfs", "add", "-q"]
        if pin:
            cmd.append("--pin=true")
        cmd.append(str(file_path))
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        cid = result.stdout.strip()
        
        # Log the operation
        ensure_logs_dir()
        append_jsonl(LOGS_PATH / "ipfs.jsonl", {
            "ts": now_iso(),
            "event": "ipfs_add",
            "file": str(file_path),
            "cid": cid,
            "pinned": pin
        })
        
        return cid
    except FileNotFoundError:
        append_jsonl(LOGS_PATH / "ipfs.jsonl", {
            "ts": now_iso(),
            "event": "ipfs_add_error",
            "file": str(file_path),
            "error": "IPFS not found - install from https://dist.ipfs.tech/"
        })
        return None
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.strip() if e.stderr else "IPFS command failed"
        append_jsonl(LOGS_PATH / "ipfs.jsonl", {
            "ts": now_iso(),
            "event": "ipfs_add_error",
            "file": str(file_path),
            "error": error_msg
        })
        return None
    except Exception as e:
        append_jsonl(LOGS_PATH / "ipfs.jsonl", {
            "ts": now_iso(),
            "event": "ipfs_add_error",
            "file": str(file_path),
            "error": str(e)
        })
        return None


def ipfs_add_directory(dir_path: Path, recursive: bool = True) -> Optional[str]:
    """
    Add a directory to IPFS and return the root CID.
    
    Args:
        dir_path: Path to the directory
        recursive: Whether to add recursively (default: True)
        
    Returns:
        Root CID string if successful, None otherwise
    """
    try:
        # Check if IPFS is available
        version_check = subprocess.run(
            ["ipfs", "version"], 
            capture_output=True, 
            text=True, 
            check=True
        )
        
        cmd = ["ipfs", "add", "-r", "-q", "--pin=true"]
        cmd.append(str(dir_path))
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        lines = result.stdout.strip().split("\n")
        root_cid = lines[-1] if lines else None
        
        ensure_logs_dir()
        append_jsonl(LOGS_PATH / "ipfs.jsonl", {
            "ts": now_iso(),
            "event": "ipfs_add_directory",
            "directory": str(dir_path),
            "root_cid": root_cid,
            "file_count": len(lines)
        })
        
        return root_cid
    except FileNotFoundError:
        append_jsonl(LOGS_PATH / "ipfs.jsonl", {
            "ts": now_iso(),
            "event": "ipfs_add_directory_error",
            "directory": str(dir_path),
            "error": "IPFS not found - install from https://dist.ipfs.tech/"
        })
        return None
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.strip() if e.stderr else "IPFS daemon not running - run 'ipfs daemon'"
        append_jsonl(LOGS_PATH / "ipfs.jsonl", {
            "ts": now_iso(),
            "event": "ipfs_add_directory_error",
            "directory": str(dir_path),
            "error": error_msg
        })
        return None
    except Exception as e:
        append_jsonl(LOGS_PATH / "ipfs.jsonl", {
            "ts": now_iso(),
            "event": "ipfs_add_directory_error",
            "directory": str(dir_path),
            "error": str(e)
        })
        return None


def ipfs_cat(cid: str) -> Optional[bytes]:
    """Retrieve content from IPFS by CID."""
    try:
        result = subprocess.run(
            ["ipfs", "cat", cid],
            capture_output=True,
            check=True
        )
        return result.stdout
    except Exception:
        return None


# ============================================================================
# Memory Graph
# ============================================================================

def create_memory_node(
    node_type: str,
    data: Dict[str, Any],
    edges: Optional[List[Dict[str, str]]] = None,
    cid: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a memory node for the audit graph.
    
    Args:
        node_type: Type of node (e.g., "document", "attestation", "approval")
        data: Node data payload
        edges: List of edge relationships
        cid: Optional IPFS CID
        
    Returns:
        Memory node dictionary
    """
    return {
        "type": node_type,
        "timestamp": now_iso(),
        "cid": cid,
        "data": data,
        "edges": edges or []
    }


def write_memory_node(node: Dict[str, Any]) -> str:
    """
    Write a memory node to the graph and return its ID.
    
    Args:
        node: Memory node dictionary
        
    Returns:
        Node ID (sha256 hash)
    """
    node_json = canonical_json(node)
    node_id = "sha256:" + sha256_hash(node_json)
    node["id"] = node_id
    
    append_jsonl(MEMORY_GRAPH_PATH, node)
    
    return node_id


# ============================================================================
# Partner Issuance Functions
# ============================================================================

def verify_partner_issuance_integrity() -> Dict[str, Any]:
    """
    Verify the integrity of the Partner Issuance package.
    
    Returns:
        Verification result with status and details
    """
    results = {
        "verified": True,
        "timestamp": now_iso(),
        "files": [],
        "errors": []
    }
    
    # Required files
    required_files = [
        "01_AGREEMENT/STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md",
        "01_AGREEMENT/EXHIBIT_A_ECONOMIC_PARTICIPATION.md",
        "01_AGREEMENT/EXHIBIT_B_SMART_CONTRACT_SETTLEMENT_SPEC.md",
        "01_AGREEMENT/SIGNATURE_PAGE.md",
        "02_DISCLOSURES/ROLE_DISCLOSURE_NON_FIDUCIARY.md",
        "02_DISCLOSURES/RISK_DISCLOSURE_TECH_AND_SETTLEMENT.md",
        "02_DISCLOSURES/CONFIDENTIALITY_NOTICE.md",
        "03_CRYPTO_PROOFS/HASHES.txt",
        "03_CRYPTO_PROOFS/MULTISIG_CONFIG.json",
        "03_CRYPTO_PROOFS/manifest.json",
    ]
    
    for rel_path in required_files:
        full_path = PARTNER_ISSUANCE_PATH / rel_path
        if full_path.exists():
            file_hash = sha256_file(full_path)
            results["files"].append({
                "path": rel_path,
                "exists": True,
                "sha256": file_hash
            })
        else:
            results["verified"] = False
            results["errors"].append(f"Missing: {rel_path}")
            results["files"].append({
                "path": rel_path,
                "exists": False,
                "sha256": None
            })
    
    return results


def load_multisig_config() -> Optional[Dict[str, Any]]:
    """Load the multisig configuration from PARTNER_ISSUANCE_v1."""
    config_path = PARTNER_ISSUANCE_PATH / "03_CRYPTO_PROOFS" / "MULTISIG_CONFIG.json"
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def load_settlement_spec() -> Optional[str]:
    """Load the smart contract settlement specification."""
    spec_path = PARTNER_ISSUANCE_PATH / "01_AGREEMENT" / "EXHIBIT_B_SMART_CONTRACT_SETTLEMENT_SPEC.md"
    try:
        with open(spec_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return None


# ============================================================================
# XRPL Integration
# ============================================================================

def create_xrpl_attestation_memo(
    document_type: str,
    document_hash: str,
    ipfs_cid: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create an XRPL attestation memo structure.
    
    Args:
        document_type: Type of document being attested
        document_hash: SHA-256 hash of the document
        ipfs_cid: Optional IPFS CID
        
    Returns:
        Memo structure for XRPL transaction
    """
    memo_data = {
        "type": "OPTKAS1_ATTESTATION",
        "version": "1.0",
        "document_type": document_type,
        "sha256": document_hash,
        "timestamp": now_iso()
    }
    
    if ipfs_cid:
        memo_data["ipfs_cid"] = ipfs_cid
    
    return {
        "Memos": [{
            "Memo": {
                "MemoType": "746578742F6F70746B617331",  # "text/optkas1" in hex
                "MemoData": canonical_json(memo_data).encode().hex()
            }
        }]
    }


def generate_xrpl_explorer_url(tx_hash: str) -> str:
    """Generate XRPL explorer URL for a transaction."""
    return f"{XRPL_EXPLORER}/transactions/{tx_hash}"


# ============================================================================
# Proposal System Integration
# ============================================================================

def create_partner_execution_proposal(
    task: str,
    option: str = "B"
) -> Dict[str, Any]:
    """
    Create a structured proposal for partner agreement execution.
    
    Args:
        task: Task description
        option: Economic option (A or B)
        
    Returns:
        Proposal dictionary compatible with uny-X
    """
    if option.upper() not in ["A", "B"]:
        raise ValueError("Option must be 'A' or 'B'")
    
    context = {
        "project": "OPTKAS1-Funding-System",
        "package": "PARTNER_ISSUANCE_v1",
        "economic_option": option.upper(),
        "spv": "OPTKAS1-MAIN SPV",
        "partner": "Unykorn 7777, Inc."
    }
    
    return {
        "proposal_id": sha256_hash(f"{task}{now_iso()}")[:16],
        "created_utc": now_iso(),
        "task": task,
        "cwd": str(PROJECT_ROOT),
        "intent": task,
        "context": context,
        "assumptions": [
            "Partner Issuance Package is complete and verified",
            "Both parties have reviewed all documents",
            "Multisig configuration is pending activation",
            f"Economic Option {option.upper()} has been selected"
        ],
        "steps": [
            "Verify Partner Issuance Package integrity",
            "Collect signatures from authorized representatives",
            "Pin executed agreement to IPFS",
            "Create XRPL attestation",
            "Update memory graph with execution record"
        ],
        "commands": [
            f"python -c \"from optkas1_bridge import verify_partner_issuance_integrity; print(verify_partner_issuance_integrity())\"",
            f"ipfs add -r {PARTNER_ISSUANCE_PATH}"
        ],
        "manual_commands": [
            "Collect physical or DocuSign signatures",
            "Configure multisig wallet addresses"
        ],
        "files": [
            "PARTNER_ISSUANCE_v1/01_AGREEMENT/SIGNATURE_PAGE.md",
            "PARTNER_ISSUANCE_v1/03_CRYPTO_PROOFS/MULTISIG_CONFIG.json"
        ],
        "risk_notes": [
            "Ensure all parties have legal authority to sign",
            "Verify multisig addresses before funding",
            "Confirm IPFS pinning is complete before proceeding"
        ],
        "rollback": [
            "Void unsigned agreement copies",
            "Re-issue corrected package if errors found"
        ],
        "questions": [
            "Are all required signatures collected?",
            "Is the multisig configuration finalized?",
            "Has legal counsel reviewed the package?"
        ]
    }


# ============================================================================
# Main Integration Functions
# ============================================================================

def initialize_integration() -> Dict[str, Any]:
    """
    Initialize the uny-X integration for OPTKAS1.
    
    Returns:
        Initialization status and configuration
    """
    result = {
        "status": "initialized",
        "timestamp": now_iso(),
        "paths": {
            "project_root": str(PROJECT_ROOT),
            "data_room": str(DATA_ROOM_PATH),
            "partner_issuance": str(PARTNER_ISSUANCE_PATH),
            "execution": str(EXECUTION_PATH),
            "logs": str(LOGS_PATH),
            "memory_graph": str(MEMORY_GRAPH_PATH)
        },
        "verification": None,
        "multisig_config": None
    }
    
    # Ensure directories exist
    LOGS_PATH.mkdir(parents=True, exist_ok=True)
    MEMORY_GRAPH_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    # Verify partner issuance
    result["verification"] = verify_partner_issuance_integrity()
    
    # Load multisig config
    result["multisig_config"] = load_multisig_config()
    
    # Create initialization node in memory graph
    node = create_memory_node(
        node_type="initialization",
        data={
            "event": "optkas1_integration_init",
            "verification_status": result["verification"]["verified"]
        }
    )
    node_id = write_memory_node(node)
    result["memory_node_id"] = node_id
    
    return result


def pin_partner_issuance_to_ipfs() -> Dict[str, Any]:
    """
    Pin the entire Partner Issuance package to IPFS.
    
    Returns:
        Pinning result with CID
    """
    result = {
        "status": "pending",
        "timestamp": now_iso(),
        "cid": None,
        "error": None
    }
    
    cid = ipfs_add_directory(PARTNER_ISSUANCE_PATH)
    
    if cid:
        result["status"] = "success"
        result["cid"] = cid
        result["gateway_url"] = f"http://127.0.0.1:8080/ipfs/{cid}"
        result["public_gateway_url"] = f"https://ipfs.io/ipfs/{cid}"
        
        # Add to memory graph
        node = create_memory_node(
            node_type="ipfs_pinning",
            data={
                "package": "PARTNER_ISSUANCE_v1",
                "root_cid": cid
            },
            cid=cid
        )
        result["memory_node_id"] = write_memory_node(node)
    else:
        result["status"] = "error"
        result["error"] = "IPFS pinning failed - ensure IPFS is installed and daemon is running"
        result["help"] = "See IPFS_INSTALLATION.md for setup instructions"
    
    return result


def get_system_status() -> Dict[str, Any]:
    """
    Get the current status of the OPTKAS1 integration.
    
    Returns:
        System status dictionary
    """
    return {
        "timestamp": now_iso(),
        "project": "OPTKAS1-Funding-System",
        "data_room_status": "FROZEN",
        "partner_issuance_status": "EXECUTION_READY",
        "paths": {
            "data_room_exists": DATA_ROOM_PATH.exists(),
            "partner_issuance_exists": PARTNER_ISSUANCE_PATH.exists(),
            "execution_exists": EXECUTION_PATH.exists(),
            "memory_graph_exists": MEMORY_GRAPH_PATH.exists()
        },
        "xrpl": {
            "payment_address": XRPL_PAYMENT_ADDRESS,
            "explorer": XRPL_EXPLORER
        },
        "integration_version": "1.0.0"
    }


# ============================================================================
# CLI Entry Point
# ============================================================================

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python optkas1_bridge.py <command>")
        print("Commands:")
        print("  init     - Initialize integration")
        print("  status   - Check system status")
        print("  verify   - Verify Partner Issuance Package")
        print("  pin      - Pin to IPFS (requires daemon)")
        print("  proposal - Create execution proposal")
        print("  files    - List files in Partner Issuance Package")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "init":
        result = initialize_integration()
        print(json.dumps(result, indent=2))
    
    elif command == "status":
        result = get_system_status()
        print(json.dumps(result, indent=2))
    
    elif command == "verify":
        result = verify_partner_issuance_integrity()
        print(json.dumps(result, indent=2))
    
    elif command == "pin":
        result = pin_partner_issuance_to_ipfs()
        print(json.dumps(result, indent=2))
    
    elif command == "proposal":
        task = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "Execute Partner Agreement"
        result = create_partner_execution_proposal(task)
        print(json.dumps(result, indent=2))
    
    elif command == "files":
        # List all files that would be pinned to IPFS
        result = {
            "timestamp": now_iso(),
            "partner_issuance_files": [],
            "total_size_bytes": 0
        }
        
        if PARTNER_ISSUANCE_PATH.exists():
            for file_path in PARTNER_ISSUANCE_PATH.rglob("*"):
                if file_path.is_file():
                    size = file_path.stat().st_size
                    result["partner_issuance_files"].append({
                        "path": str(file_path.relative_to(PARTNER_ISSUANCE_PATH)),
                        "size_bytes": size,
                        "sha256": sha256_file(file_path)
                    })
                    result["total_size_bytes"] += size
            
            result["file_count"] = len(result["partner_issuance_files"])
            result["total_size_mb"] = round(result["total_size_bytes"] / 1024 / 1024, 2)
        
        print(json.dumps(result, indent=2))
    
    else:
        print(f"Unknown command: {command}")
        print("Available commands:")
        print("  init     - Initialize integration")
        print("  status   - Check system status")
        print("  verify   - Verify Partner Issuance Package")
        print("  pin      - Pin to IPFS (requires daemon)")
        print("  proposal - Create execution proposal")
        print("  files    - List files in Partner Issuance Package")
        sys.exit(1)
