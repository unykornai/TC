# LENDER INFORMATION PACKET

**Portal:** https://legalreview.unykorn.org  
**Date:** December 29, 2025  
**Asset Class:** Digital Assets (USDT on XRPL)  
**Total Verified Amount:** 74,000,000 USDT

---

## EXECUTIVE SUMMARY

This packet provides comprehensive documentation for lenders conducting due diligence on digital asset reserves held on the XRP Ledger (XRPL) blockchain. All information is independently verifiable through public blockchain explorers and decentralized storage systems.

**Key Highlights:**
- ✅ $74M USDT verified on XRPL mainnet
- ✅ 100% blockchain-verifiable reserves
- ✅ Cryptographically secured transactions
- ✅ Immutable public ledger records
- ✅ Multi-source verification available
- ✅ Complete audit trail with timestamps

---

## SECTION 1: ASSET OVERVIEW

### Primary Reserve Details

**Asset Type:** USDT (Tether USD)  
**Blockchain:** XRP Ledger (XRPL) Mainnet  
**Total Amount:** 74,000,000 USDT  
**Custody Wallet:** rpP12ND2K7ZRzXZBEUnQM2i18tMGytXnW1  
**Status:** Active, Verified, Accessible

### Wallet Information

**Primary Reserve Wallet**
```
Address: rpP12ND2K7ZRzXZBEUnQM2i18tMGytXnW1
Type: XRPL Mainnet Address
Balance: 74,000,000+ USDT
Status: Active ✅
Verification: https://livenet.xrpl.org/accounts/rpP12ND2K7ZRzXZBEUnQM2i18tMGytXnW1
```

**Funding Source Wallet**
```
Address: rE85pdvr4icCPh9cpPr1HrSCVJCUhZ1Dqm
Type: XRPL Mainnet Address
Role: Source of reserve allocations
Status: Active ✅
Verification: https://livenet.xrpl.org/accounts/rE85pdvr4icCPh9cpPr1HrSCVJCUhZ1Dqm
```

### Asset Breakdown

| Description | Amount (USDT) | Transaction Hash | Date |
|-------------|---------------|------------------|------|
| Reserve Batch 1 | 37,000,000 | 9E880D088D0AE... | Nov 12, 2025 |
| Reserve Batch 2 | 37,000,000 | 79E50BB447B6A... | Nov 12, 2025 |
| **Total** | **74,000,000** | - | - |

---

## SECTION 2: TRANSACTION VERIFICATION

### Transaction #1: Reserve Allocation - Batch 1

**Core Details:**
```
Transaction Hash: 9E880D088D0AE6064558B679B00CC24E0067DE68A854BAB0C52D77E9979FA94E
CTID: C5F86FF200070000
Amount: 37,000,000 USDT
Ledger Index: 100,167,666
Timestamp: 2025-11-12T21:19:11Z (UTC)
From: rE85pdvr4icCPh9cpPr1HrSCVJCUhZ1Dqm
To: rpP12ND2K7ZRzXZBEUnQM2i18tMGytXnW1
Memo: "Reserve allocation - Batch 1"
Status: Validated ✅
Result: tesSUCCESS
```

**Verification Links:**
- XRPL: https://livenet.xrpl.org/transactions/9E880D088D0AE6064558B679B00CC24E0067DE68A854BAB0C52D77E9979FA94E
- XRPScan: https://xrpscan.com/tx/9E880D088D0AE6064558B679B00CC24E0067DE68A854BAB0C52D77E9979FA94E

### Transaction #2: Reserve Allocation - Batch 2

**Core Details:**
```
Transaction Hash: 79E50BB447B6A5982D3A811CC67BCF9EA39BB91F7D49D92C267C5E3D2C2148DF
CTID: C5F86FF200080000
Amount: 37,000,000 USDT
Ledger Index: 100,167,666
Timestamp: 2025-11-12T21:19:11Z (UTC)
From: rE85pdvr4icCPh9cpPr1HrSCVJCUhZ1Dqm
To: rpP12ND2K7ZRzXZBEUnQM2i18tMGytXnW1
Memo: "Reserve allocation - Batch 2"
Status: Validated ✅
Result: tesSUCCESS
```

**Verification Links:**
- XRPL: https://livenet.xrpl.org/transactions/79E50BB447B6A5982D3A811CC67BCF9EA39BB91F7D49D92C267C5E3D2C2148DF
- XRPScan: https://xrpscan.com/tx/79E50BB447B6A5982D3A811CC67BCF9EA39BB91F7D49D92C267C5E3D2C2148DF

---

## SECTION 3: VERIFICATION METHODOLOGY

### Independent Verification Process

Lenders can independently verify all claims without relying on third-party attestations:

**Step 1: Blockchain Verification**
1. Visit XRPL Explorer: https://livenet.xrpl.org
2. Search for wallet: rpP12ND2K7ZRzXZBEUnQM2i18tMGytXnW1
3. Verify current balance and transaction history
4. Confirm transaction hashes match this packet

**Step 2: Cross-Reference Verification**
1. Use secondary explorer: https://xrpscan.com
2. Search same wallet address
3. Compare data with XRPL Explorer
4. Ensure complete consistency

**Step 3: API Verification**
```bash
# Query XRPL API directly
curl https://livenet.xrpl.org:51234 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "method": "account_info",
    "params": [{
      "account": "rpP12ND2K7ZRzXZBEUnQM2i18tMGytXnW1",
      "ledger_index": "validated"
    }]
  }'
```

### Verification Checklist for Lenders

- [ ] Verify wallet exists and is active on XRPL mainnet
- [ ] Confirm current balance matches stated amount
- [ ] Validate transaction hashes on blockchain
- [ ] Check CTIDs decode to correct ledger/transaction indices
- [ ] Cross-reference with multiple explorers
- [ ] Review transaction timestamps and memos
- [ ] Verify transactions are irreversible (validated status)
- [ ] Confirm no subsequent outgoing transactions
- [ ] Check legal documentation on IPFS
- [ ] Validate attorney attestation

---

## SECTION 4: LEGAL DOCUMENTATION

### Available Legal Documents (IPFS)

All legal documentation is stored on IPFS (InterPlanetary File System) for permanent, tamper-proof preservation:

1. **Attorney Attestation Letter**
   - CID: QmRczTQ1GbLvGALt9TxghaXA1rTxQbc4t8z9q8bVniTqoX
   - Content: Legal verification scope and findings
   - Gateway: https://gateway.pinata.cloud/ipfs/QmRczTQ1GbLvGALt9TxghaXA1rTxQbc4t8z9q8bVniTqoX

2. **Proof of Funds Manifest**
   - CID: Qmc7MraZfuEumhVgv2bX5d1efCBt4BsnpsuHJeZNBmpA7W
   - Content: Complete evidence bundle with checksums
   - Gateway: https://gateway.pinata.cloud/ipfs/Qmc7MraZfuEumhVgv2bX5d1efCBt4BsnpsuHJeZNBmpA7W

3. **Blockchain Verification Guide**
   - CID: QmeZpFAzVK9QPzQRcYX9ZJJ6AJExcAmudGDcpwbuo44p3B
   - Content: Step-by-step verification instructions
   - Gateway: https://gateway.pinata.cloud/ipfs/QmeZpFAzVK9QPzQRcYX9ZJJ6AJExcAmudGDcpwbuo44p3B

---

## SECTION 5: RISK ASSESSMENT

### Security Strengths

**Blockchain Immutability**
- All transactions permanently recorded on XRPL
- Cannot be altered, deleted, or reversed
- Byzantine Fault Tolerant consensus
- 80%+ validator agreement required

**Transparency**
- Public blockchain = public audit trail
- Anyone can verify at any time
- No trust required in third parties
- Cryptographic proof of ownership

**Decentralization**
- No single point of failure
- Distributed across global XRPL validators
- No custodial intermediary risk
- Direct blockchain custody

### Risk Considerations

**Market Risk**
- USDT is a stablecoin pegged to USD
- Subject to issuer (Tether) solvency
- Market price may vary slightly from $1.00
- Liquidity dependent on XRPL DEX

**Operational Risk**
- Private key security is paramount
- Loss of keys = loss of access
- No password recovery mechanism
- Multi-signature recommended for large amounts

**Regulatory Risk**
- Digital asset regulations evolving
- USDT regulatory status varies by jurisdiction
- Compliance requirements may change
- Legal framework still developing

**Technology Risk**
- Smart contract risk: N/A (native XRPL payments)
- Network risk: XRPL has 99.99%+ uptime
- Oracle risk: N/A (no external data feeds)
- Upgrade risk: XRPL governance via Amendment process

---

## SECTION 6: DUE DILIGENCE CHECKLIST

### For Lender Use

**Asset Verification** ✅
- [ ] Blockchain balance confirmed
- [ ] Transaction history reviewed
- [ ] Wallet ownership established
- [ ] No liens or encumbrances found

**Legal Verification** ✅
- [ ] Attorney attestation reviewed
- [ ] Corporate documents examined
- [ ] Proof manifest validated
- [ ] IPFS documents accessible

**Technical Verification** ✅
- [ ] XRPL mainnet confirmed (not testnet)
- [ ] Transactions irreversible (validated)
- [ ] CTIDs properly formatted
- [ ] Explorer data consistent

**Risk Assessment** ⚠️
- [ ] Market risk understood and acceptable
- [ ] Operational controls reviewed
- [ ] Regulatory compliance confirmed
- [ ] Technology risks evaluated

**Documentation Review** ✅
- [ ] All required documents received
- [ ] Documentation complete and accurate
- [ ] Verification portal functional
- [ ] Contact information available

---

## SECTION 7: COLLATERAL INFORMATION

### Asset Characteristics

**Liquidity:** High
- USDT is among the most liquid stablecoins
- Trading volume exceeds $50B daily across all chains
- XRPL DEX provides instant liquidity
- Can be bridged to other chains if needed

**Volatility:** Low
- Stablecoin pegged to US Dollar
- Typical price range: $0.99 - $1.01
- Low correlation to crypto market
- Backed by Tether reserves

**Accessibility:** Immediate
- Blockchain transfers settle in 3-5 seconds
- Available 24/7/365
- No banking hours or holidays
- Global accessibility

**Custody:** Self-Custodial
- Direct ownership via private keys
- No custodial intermediary
- No counterparty risk (except USDT issuer)
- Full control over assets

### Loan-to-Value (LTV) Recommendations

Based on asset characteristics, suggested LTV ratios:

| Use Case | Recommended LTV | Rationale |
|----------|----------------|-----------|
| Short-term credit | 80-90% | Low volatility, high liquidity |
| Medium-term loan | 70-80% | Buffer for minor fluctuations |
| Long-term financing | 60-70% | Additional safety margin |
| Institutional lending | 50-60% | Conservative approach |

---

## SECTION 8: CONTACT & SUPPORT

### Verification Portal
**URL:** https://legalreview.unykorn.org

**Features:**
- Live blockchain verification tool
- Multi-gateway IPFS document access
- Real-time balance checking
- Complete transaction history
- Automated verification checks

### Documentation Access

All documents available via:
- Portal "Documents" tab
- Direct IPFS gateways (4 redundant)
- Blockchain explorers (transaction memos)

### Support Channels

For lender inquiries:
- Use portal's automated verification first
- Review comprehensive documentation
- Check IPFS documents for detailed info
- Contact via portal if additional information needed

---

## SECTION 9: APPENDICES

### Appendix A: XRPL Basics

**What is XRPL?**
- Enterprise-grade blockchain for payments
- 3-5 second settlement times
- $0.0001 transaction fees
- Carbon-neutral consensus
- 10+ years operational history

**Key Features:**
- Decentralized Exchange (DEX) built-in
- Native multi-currency support
- Payment channels for instant settlements
- Escrow functionality
- Advanced key management

### Appendix B: USDT on XRPL

**USDT Details:**
- Issuer: Tether (issuer on XRPL)
- Backing: 1:1 USD reserves (claimed)
- Market Cap: $140B+ across all chains
- Transparency: Regular attestations
- Usage: Most traded stablecoin globally

### Appendix C: Verification Tools

**XRPL Explorers:**
- https://livenet.xrpl.org (Official)
- https://xrpscan.com (Community)
- https://bithomp.com/explorer (Third-party)

**IPFS Gateways:**
- https://gateway.pinata.cloud
- https://ipfs.io
- https://cloudflare-ipfs.com
- https://dweb.link

**API Endpoints:**
- https://livenet.xrpl.org:51234 (WebSocket)
- https://xrplcluster.com (RPC)
- https://xrpl.ws (Community nodes)

### Appendix D: Glossary

**XRPL:** XRP Ledger - blockchain platform  
**USDT:** Tether USD - US Dollar stablecoin  
**CTID:** Concise Transaction ID - compact transaction reference  
**Ledger:** Validated block of transactions on XRPL  
**IPFS:** InterPlanetary File System - decentralized storage  
**CID:** Content Identifier - IPFS file address

---

## CERTIFICATION

This Lender Information Packet contains accurate and complete information as of December 29, 2025. All blockchain data is independently verifiable through public explorers. All IPFS documents are permanently stored with content-addressed identifiers ensuring integrity.

**Prepared By:** Unykorn Legal Team  
**Date:** December 29, 2025  
**Portal:** https://legalreview.unykorn.org  
**Status:** Production & Active

---

**IMPORTANT NOTICE:** This packet is for informational purposes only and does not constitute a loan agreement, security offering, or investment advice. Lenders should conduct independent due diligence and consult legal counsel before extending credit. All digital assets carry risk including loss of value and loss of access.

---

**Document Version:** 1.0.0  
**Last Updated:** December 29, 2025  
**IPFS CID:** [To be generated after upload]
