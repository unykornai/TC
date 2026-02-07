# 💰 OPTKAS Funding Instructions

**Step-by-step guide to fund your XRPL and Stellar wallets**

---

## ⚡ Quick Reference

| What | Amount | ~USD (at $1.42/XRP, $0.16/XLM) |
|------|--------|-------|
| XRPL total | 150 XRP | ~$213 |
| Stellar total | 21 XLM | ~$3.36 |
| **TOTAL** | | **≈ $216** |

> 💡 **QR CODES**: Open [FUNDING_QR_CODES.html](FUNDING_QR_CODES.html) in your browser for scannable QR codes for every address.
> Prices update live when you open the page.

---

## Step 1: Get XRP and XLM

### Option A: Buy from Exchange
- **Coinbase**, **Kraken**, **Uphold**, **Bitstamp** all support XRP and XLM
- Buy at least **160 XRP** and **25 XLM** (extra for safety margin)
- Wait for purchase to settle before withdrawing

### Option B: Transfer from Existing Wallet
- If you already hold XRP/XLM, transfer from your existing wallet
- Use the addresses from `WALLET_MANIFEST.json`

---

## Step 2: Fund XRPL Accounts

> ⚠ **IMPORTANT**: XRPL requires a **minimum 10 XRP** to activate any new account.
> Send at least the reserve amount listed below to each address.

### Funding Order (recommended)

Fund in this order — issuer first, then operational accounts:

1. **Issuer** — Send **25 XRP**
   - This is the most important account (issues all OPTKAS tokens)
   - Address: *(see WALLET_MANIFEST.json → xrpl → issuer)*

2. **Treasury** — Send **30 XRP**
   - Primary operational account
   - Address: *(see WALLET_MANIFEST.json → xrpl → treasury)*

3. **Escrow** — Send **25 XRP**
   - Settlement escrow operations
   - Address: *(see WALLET_MANIFEST.json → xrpl → escrow)*

4. **Attestation** — Send **20 XRP**
   - Document hash anchoring
   - Address: *(see WALLET_MANIFEST.json → xrpl → attestation)*

5. **AMM Liquidity** — Send **25 XRP**
   - DEX liquidity provision
   - Address: *(see WALLET_MANIFEST.json → xrpl → amm_liquidity)*

6. **Trading** — Send **25 XRP**
   - Algorithmic trading operations
   - Address: *(see WALLET_MANIFEST.json → xrpl → trading)*

### How to Send XRP

**From Coinbase:**
1. Go to Send/Receive → Send
2. Select XRP
3. Paste the destination address from WALLET_MANIFEST.json
4. Enter the amount
5. **No destination tag needed** (these are new self-owned accounts)
6. Confirm and send

**From Uphold:**
1. Select XRP card → Send
2. Paste address, enter amount
3. Confirm

**From XUMM/Xaman wallet:**
1. Tap Send → Enter address + amount
2. Sign and submit

### Verify Funding
After each send, check on: **https://livenet.xrpl.org/accounts/[ADDRESS]**

---

## Step 3: Fund Stellar Accounts

> ⚠ **IMPORTANT**: Stellar requires a **minimum 1 XLM** base reserve to create an account.

### Funding Order

1. **Issuer** — Send **7 XLM**
   - Address: *(see WALLET_MANIFEST.json → stellar → issuer)*

2. **Distribution** — Send **7 XLM**
   - Address: *(see WALLET_MANIFEST.json → stellar → distribution)*

3. **Anchor** — Send **7 XLM**
   - Address: *(see WALLET_MANIFEST.json → stellar → anchor)*

### How to Send XLM

**From Coinbase:**
1. Send/Receive → Send → Select XLM
2. Paste Stellar public key (starts with `G...`)
3. Enter amount
4. **No memo needed** for new self-owned accounts
5. Confirm

**From LOBSTR wallet:**
1. Send → Enter public key + amount → Confirm

### Verify Funding
After each send, check on: **https://stellar.expert/explorer/public/account/[PUBLIC_KEY]**

---

## Step 4: Deploy Trustlines

Once ALL accounts are funded:

```bash
# Dry run first (check everything without spending)
npx ts-node scripts/deploy-mainnet-trustlines.ts --network mainnet --dry-run

# If dry run looks good, deploy for real
npx ts-node scripts/deploy-mainnet-trustlines.ts --network mainnet
```

---

## Step 5: Verify Everything

### XRPL Verification Checklist
- [ ] All 6 accounts show as active on livenet.xrpl.org
- [ ] Issuer account has DefaultRipple flag set
- [ ] Treasury has 4 stablecoin trustlines (Bitstamp, GateHub, Tether, Circle)
- [ ] Escrow has 4 stablecoin trustlines
- [ ] AMM has 4 stablecoin trustlines
- [ ] Trading has 4 stablecoin trustlines
- [ ] Attestation has OPTKAS.ATTEST trustline

### Stellar Verification Checklist
- [ ] All 3 accounts show as active on stellar.expert
- [ ] Issuer has auth_required + auth_revocable + clawback_enabled flags
- [ ] Distribution has OPTKAS-USD trustline (authorized)
- [ ] Anchor has OPTKAS-USD trustline (authorized)

---

## 🚨 Troubleshooting

### "Account not found" on XRPL
- The account hasn't been funded yet, or the XRP hasn't arrived
- XRPL accounts don't exist until they receive their first 10 XRP
- Wait 3-5 seconds after sending and check again

### "Account not found" on Stellar
- Same as XRPL — Stellar accounts require minimum 1 XLM to create
- Exchange withdrawals may take a few minutes

### "Insufficient XRP for reserve"
- Account doesn't have enough XRP for the trustline reserve (2 XRP each)
- Send more XRP to that account

### "tecPATH_DRY" on trustline
- The issuer address may be incorrect — verify on xrpl.org
- The account may not be funded enough

---

## 📊 Cost Breakdown (Live Prices — Feb 7, 2026)

*At XRP ≈ $1.42 and XLM ≈ $0.16:*

| Item | Amount | ~USD |
|------|--------|------|
| XRPL Issuer | 25 XRP | ~$35.50 |
| XRPL Treasury | 30 XRP | ~$42.60 |
| XRPL Escrow | 25 XRP | ~$35.50 |
| XRPL Attestation | 20 XRP | ~$28.40 |
| XRPL AMM Liquidity | 25 XRP | ~$35.50 |
| XRPL Trading | 25 XRP | ~$35.50 |
| **XRPL Subtotal** | **150 XRP** | **~$213.00** |
| Stellar Issuer | 7 XLM | ~$1.12 |
| Stellar Distribution | 7 XLM | ~$1.12 |
| Stellar Anchor | 7 XLM | ~$1.12 |
| **Stellar Subtotal** | **21 XLM** | **~$3.36** |
| **GRAND TOTAL** | | **≈ $216.36** |

> These are one-time costs. The XRP/XLM used for reserves remains in your accounts
> and can be recovered if you ever delete trustlines or close accounts.
> 
> 📱 **For easy funding: Open [FUNDING_QR_CODES.html](FUNDING_QR_CODES.html) and scan with your exchange/wallet app.**

---

*Phase 18 — OPTKAS Sovereign Financial Platform*
