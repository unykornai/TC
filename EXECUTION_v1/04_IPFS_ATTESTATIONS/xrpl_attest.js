#!/usr/bin/env node

/**
 * XRPL ATTESTATION SCRIPT
 * 
 * Purpose: Anchor signed agreement IPFS CID to XRPL for immutable timestamping
 * 
 * Usage:
 *   node xrpl_attest.js <IPFS_CID> <DESCRIPTION>
 * 
 * Example:
 *   node xrpl_attest.js QmYHNYAaYK5hm51D7b84D6eKt6pKqvB4JxH2z... "Partner Agreement Signed"
 * 
 * Requirements:
 *   npm install xrpl
 * 
 * Environment Variables:
 *   XRPL_SEED - Account seed (s...) for rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV
 *   XRPL_NETWORK - Optional (defaults to wss://xrplcluster.com)
 */

const xrpl = require("xrpl");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Configuration
const ATTESTATION_ACCOUNT = "rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV";
const DEFAULT_NETWORK = "wss://xrplcluster.com";

// Parse arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node xrpl_attest.js <IPFS_CID> <DESCRIPTION>");
  console.error("Example: node xrpl_attest.js QmYHN... 'Partner Agreement Signed'");
  process.exit(1);
}

const ipfsCid = args[0];
const description = args[1];

// Validate environment
const xrplSeed = process.env.XRPL_SEED;
if (!xrplSeed) {
  console.error("ERROR: XRPL_SEED environment variable not set");
  console.error("Set it with: export XRPL_SEED='sXXXXXXXXXXXXXXXXXXXX'");
  process.exit(1);
}

const xrplNetwork = process.env.XRPL_NETWORK || DEFAULT_NETWORK;

/**
 * Compute SHA-256 hash of IPFS CID
 * This hash will be stored in XRPL memo
 */
function hashCid(cid) {
  return crypto.createHash("sha256").update(cid).digest("hex");
}

/**
 * Submit attestation transaction to XRPL
 */
async function attestToXRPL() {
  console.log("=== XRPL ATTESTATION SCRIPT ===\n");
  console.log("IPFS CID:", ipfsCid);
  console.log("Description:", description);
  console.log("Network:", xrplNetwork);
  console.log("Account:", ATTESTATION_ACCOUNT);
  console.log("");

  // Compute CID hash
  const cidHash = hashCid(ipfsCid);
  console.log("SHA-256 of CID:", cidHash);
  console.log("");

  // Connect to XRPL
  console.log("Connecting to XRPL...");
  const client = new xrpl.Client(xrplNetwork);
  await client.connect();
  console.log("✅ Connected\n");

  // Create wallet from seed
  const wallet = xrpl.Wallet.fromSeed(xrplSeed);
  if (wallet.classicAddress !== ATTESTATION_ACCOUNT) {
    console.error("ERROR: Wallet address mismatch");
    console.error("Expected:", ATTESTATION_ACCOUNT);
    console.error("Got:", wallet.classicAddress);
    console.error("Check XRPL_SEED environment variable");
    await client.disconnect();
    process.exit(1);
  }

  // Check account balance
  const accountInfo = await client.request({
    command: "account_info",
    account: ATTESTATION_ACCOUNT,
    ledger_index: "validated"
  });
  
  const balance = xrpl.dropsToXrp(accountInfo.result.account_data.Balance);
  console.log("Account Balance:", balance, "XRP");
  
  if (parseFloat(balance) < 1) {
    console.warn("⚠️  WARNING: Low XRP balance. Ensure at least 1 XRP for transaction fees.");
  }
  console.log("");

  // Prepare transaction
  console.log("Preparing attestation transaction...");
  
  const tx = {
    TransactionType: "Payment",
    Account: ATTESTATION_ACCOUNT,
    Destination: ATTESTATION_ACCOUNT, // Self-payment (1 drop)
    Amount: "1", // 1 drop (0.000001 XRP)
    Memos: [
      {
        Memo: {
          MemoType: Buffer.from("attestation").toString("hex"),
          MemoFormat: Buffer.from("text/plain").toString("hex"),
          MemoData: Buffer.from(JSON.stringify({
            ipfs_cid: ipfsCid,
            cid_hash: cidHash,
            description: description,
            timestamp: new Date().toISOString(),
            version: "1.0"
          })).toString("hex")
        }
      }
    ]
  };

  console.log("Transaction prepared:");
  console.log(JSON.stringify(tx, null, 2));
  console.log("");

  // Submit transaction
  console.log("Submitting transaction to XRPL...");
  try {
    const result = await client.submitAndWait(tx, { wallet });
    
    console.log("✅ TRANSACTION SUCCESSFUL\n");
    console.log("TX Hash:", result.result.hash);
    console.log("Ledger Index:", result.result.ledger_index);
    console.log("Explorer URL:", `https://livenet.xrpl.org/transactions/${result.result.hash}`);
    console.log("");

    // Record attestation
    const attestationRecord = {
      ipfs_cid: ipfsCid,
      description: description,
      cid_hash: cidHash,
      xrpl_tx_hash: result.result.hash,
      ledger_index: result.result.ledger_index,
      timestamp: new Date().toISOString(),
      explorer_url: `https://livenet.xrpl.org/transactions/${result.result.hash}`,
      account: ATTESTATION_ACCOUNT,
      network: xrplNetwork
    };

    // Write to XRPL_ATTESTATION_TXs.md
    const attestationFile = path.join(__dirname, "XRPL_ATTESTATION_TXs.md");
    const attestationEntry = `
## ${description}

- **Date:** ${new Date().toISOString().split('T')[0]}
- **IPFS CID:** ${ipfsCid}
- **SHA-256 of CID:** ${cidHash}
- **XRPL TX Hash:** ${result.result.hash}
- **Ledger Index:** ${result.result.ledger_index}
- **Explorer:** https://livenet.xrpl.org/transactions/${result.result.hash}
- **Status:** ✅ Confirmed

`;

    // Create file if doesn't exist
    if (!fs.existsSync(attestationFile)) {
      fs.writeFileSync(attestationFile, "# XRPL ATTESTATION TRANSACTIONS\n\n");
    }

    // Append entry
    fs.appendFileSync(attestationFile, attestationEntry);
    console.log("✅ Attestation recorded in XRPL_ATTESTATION_TXs.md\n");

    // Write JSON record
    const jsonFile = path.join(__dirname, `attestation_${Date.now()}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(attestationRecord, null, 2));
    console.log("✅ JSON record saved:", jsonFile);
    console.log("");

    console.log("=== ATTESTATION COMPLETE ===");
    console.log("");
    console.log("Next steps:");
    console.log("1. Verify transaction on explorer");
    console.log("2. Commit XRPL_ATTESTATION_TXs.md to git");
    console.log("3. Archive JSON record");

  } catch (error) {
    console.error("❌ TRANSACTION FAILED");
    console.error("Error:", error.message);
    
    if (error.data) {
      console.error("Details:", JSON.stringify(error.data, null, 2));
    }
    
    await client.disconnect();
    process.exit(1);
  }

  // Disconnect
  await client.disconnect();
  console.log("\n✅ Disconnected from XRPL");
}

// Execute
attestToXRPL().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
