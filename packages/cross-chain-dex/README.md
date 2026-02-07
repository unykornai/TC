# OPTKAS Cross-Chain DEX — Quick Start

## What It Does
**Sovereign, trustless, decentralized** swaps between any assets on XRPL and Stellar:
- **XRP ↔ XLM** — Direct cross-chain swaps
- **XRP/XLM ↔ Stablecoins** — USDC, USDT
- **OPTKAS Tokens** — Trade on both chains
- **Zero external dependencies** — No Coinbase, no Kraken, 100% OPTKAS-controlled

---

## Architecture
```
┌──────────────────────────────────────────────────────────────────┐
│                  OPTKAS CROSS-CHAIN DEX                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  XRPL AMM Pools          Cross-Chain Bridge       Stellar Pools │
│  ┌──────────────┐        ┌──────────────┐        ┌────────────┐│
│  │ XRP/USDC     │◄───────┤   HTLC       │───────►│ XLM/USDC   ││
│  │ OPTKAS/USDC  │        │   Escrow     │        │ OPTKAS/USDC││
│  │ XRP/OPTKAS   │        │   Hashlock   │        └────────────┘│
│  └──────────────┘        └──────────────┘                       │
│                                                                  │
│                  ▼                                               │
│           Unified Swap API                                       │
│       swapAssets(from, to, amount)                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Quick Start (3 Commands)

### 1. Deploy DEX Infrastructure
```bash
npx ts-node scripts/deploy-dex.ts --network mainnet
```
**What it does:**
- Creates XRPL AMM pools (XRP/USDC, OPTKAS/USDC)
- Creates Stellar liquidity pools (XLM/USDC, OPTKAS/USDC)
- Provisions initial liquidity (~$50K equivalent)
- Executes test swap: 30 XRP → ~21 XLM
- Distributes XLM to your 3 Stellar wallets (7 each)

**Expected output:**
```
✓ Connected to XRPL + Stellar mainnet
✓ XRP/USDC pool created: rAMM123...
✓ OPTKAS/USDC pool created: rAMM456...
✓ XLM/USDC pool created: Pool789...
🎉 SWAP SUCCESS! Got 21.45 XLM
✅ ALL WALLETS FUNDED VIA INTERNAL SWAP!
```

### 2. Verify Swap Functionality
```bash
npx ts-node packages/cross-chain-dex/src/swap-api.ts
```
Runs the demo swap (100 XRP → XLM) to test pathfinding + execution.

### 3. Use in Your Code
```typescript
import { SwapAPI } from '@optkas/cross-chain-dex';

const api = new SwapAPI({
  xrplUrl: 'wss://xrplcluster.com',
  stellarUrl: 'https://horizon.stellar.org',
  xrplTreasurySeed: process.env.XRPL_TREASURY_SEED!,
  stellarAnchorSecret: process.env.STELLAR_ANCHOR_SECRET!,
  maxSlippage: 0.5, // 0.5%
  retryAttempts: 3,
});

await api.init();

// Swap XRP → XLM
const result = await api.swapAssets('XRP', 'XLM', '100', userAccount);
console.log(`Got ${result.actualOutput} XLM in ${result.executionTime}ms`);

// Get quote without executing
const quote = await api.quote('XRP', 'OPTKAS', '500');
console.log(`500 XRP → ${quote.estimatedOutput} OPTKAS (fee: ${quote.totalFee})`);

await api.shutdown();
```

---

## Example Swap Flows

### Flow 1: XRP → XLM (Cross-Chain)
```
User: 100 XRP
 ↓
XRPL AMM: XRP → USDC (0.3% fee)
 ↓ 142 USDC
Bridge: USDC (XRPL) → USDC (Stellar) (0.1% fee)
 ↓ 141.86 USDC
Stellar Pool: USDC → XLM (0.3% fee)
 ↓
User: 93.2 XLM
```
**Total fees:** 0.7% | **Time:** ~20 seconds

### Flow 2: XRP → OPTKAS (Same Chain)
```
User: 500 XRP
 ↓
XRPL AMM: XRP → USDC (0.3% fee)
 ↓ 710 USDC
XRPL AMM: USDC → OPTKAS (0.3% fee)
 ↓
User: 355 OPTKAS
```
**Total fees:** 0.6% | **Time:** ~8 seconds

### Flow 3: XLM → XRP (Reverse Cross-Chain)
```
User: 500 XLM
 ↓
Stellar Pool: XLM → USDC (0.3% fee)
 ↓ 78.5 USDC
Bridge: USDC (Stellar) → USDC (XRPL) (0.1% fee)
 ↓ 78.42 USDC
XRPL AMM: USDC → XRP (0.3% fee)
 ↓
User: 55.2 XRP
```
**Total fees:** 0.7% | **Time:** ~20 seconds

---

## API Reference

### `swapAssets(from, to, amount, userAccount, maxSlippage?)`
Execute a swap between any two assets.

**Parameters:**
- `from` (string): Source asset code ('XRP', 'XLM', 'USDC', 'OPTKAS')
- `to` (string): Destination asset code
- `amount` (string): Input amount as decimal string
- `userAccount` (string): User's XRPL or Stellar address
- `maxSlippage` (number, optional): Max acceptable slippage % (default: 0.5)

**Returns:** `SwapResponse`
```typescript
{
  success: true,
  path: { steps: [...], totalFee: '0.42', estimatedOutput: '93.2' },
  actualOutput: '93.15',
  txHashes: ['ABC123...', 'DEF456...'],
  fees: { amm: '0.40', bridge: '0.02' },
  executionTime: 18420 // ms
}
```

### `quote(from, to, amount)`
Get swap quote without executing.

**Returns:** `SwapPath`
```typescript
{
  steps: [
    { from: {...}, to: {...}, via: 'amm', fee: '0.20' },
    { from: {...}, to: {...}, via: 'bridge', fee: '0.10' },
  ],
  totalFee: '0.30',
  totalSlippage: 0.45, // %
  estimatedOutput: '93.2',
  estimatedTime: 20 // seconds
}
```

### `getPrice(from, to)`
Get current exchange rate (output amount for 1 unit of input).

**Returns:** `number` (e.g., `0.932` for 1 XRP → 0.932 XLM)

---

## Security Features

### 1. Atomic Swaps (HTLC)
- Either both sides succeed or both fail
- No custody risk — OPTKAS cannot steal locked funds
- 24-hour timeout → auto-refund if incomplete

### 2. Slippage Protection
- User sets max acceptable slippage (e.g., 0.5%)
- If actual rate deviates > limit, tx reverts
- Prevents front-running / sandwich attacks

### 3. Rate Oracle (On-Chain Only)
- No external price feeds (no Chainlink, no APIs)
- All rates derived from on-chain liquidity pools
- Immune to oracle manipulation

### 4. Multi-Sig Bridge
- Bridge escrow requires 3-of-5 OPTKAS manager signatures
- Prevents single-point-of-failure attacks
- All txs auditable on-chain

---

## Liquidity Management

### Initial Provisioning (Phase 19)
- **XRPL**: 10,000 XRP + 14,200 USDC + 50,000 OPTKAS
- **Stellar**: 100,000 XLM + 16,000 USDC + 50,000 OPTKAS
- **Total Value**: ~$50,000 (from OPTKAS treasury)

### Ongoing Management
- **Rebalancing**: Weekly automated script
- **Fee Collection**: All swap fees → OPTKAS treasury
- **Expansion**: Add new pairs as needed (BTC, ETH via anchors)

### Fee Structure
- **AMM Swaps**: 0.3% (industry standard)
- **Bridge Transfers**: 0.1% (covers gas + settlement)
- **Total (cross-chain)**: 0.7% (vs 1-2% on CEXs)

---

## Comparison: OPTKAS DEX vs Centralized Exchanges

| Feature | OPTKAS DEX | Coinbase/Kraken |
|---------|-----------|----------------|
| **Custody** | Non-custodial | Custodial |
| **Uptime** | 24/7 (on-chain) | Subject to outages |
| **KYC Required** | No | Yes |
| **Swap Fees** | 0.3-0.7% | 0.5-2% |
| **Settlement** | Instant (8-20s) | Hours/days |
| **Sovereignty** | 100% OPTKAS | 0% |
| **Asset Support** | Any XRPL/Stellar asset | Limited pairs |
| **Privacy** | Fully private | AML/KYC tracking |
| **Censorship Risk** | None | Can freeze accounts |

---

## Troubleshooting

### Error: "Slippage exceeds max"
**Cause:** Large swap or low liquidity  
**Fix:** Increase `maxSlippage` or split into smaller swaps

### Error: "Pool not found"
**Cause:** Pool not deployed yet  
**Fix:** Run `deploy-dex.ts` first

### Error: "Escrow timeout"
**Cause:** Bridge hashlock not claimed in 24h  
**Fix:** Funds auto-refunded — check your wallet

### Slow execution (>60s)
**Cause:** Network congestion  
**Fix:** Retry or increase retry attempts in config

---

## Roadmap

### Phase 19.1 ✅ (Current)
- AMM pools deployed
- Cross-chain bridge operational
- Basic swap API

### Phase 19.2 (Next Week)
- Admin dashboard (pool monitoring, rebalancing)
- Public LP participation (stake OPTKAS → earn fees)
- Advanced routing (multi-hop optimization)

### Phase 20 (Q1 2026)
- Multi-sig governance for pool parameters
- Cross-chain NFT swaps
- Fiat on/off ramps (OPTKAS → USD)

### Phase 21 (Q2 2026)
- BTC/ETH support via anchors
- Limit orders + stop-loss
- Mobile swap widget

---

## Support

**Docs**: [docs/CROSS_CHAIN_DEX.md](../docs/CROSS_CHAIN_DEX.md)  
**Architecture**: [EXECUTION_v1/06_CROSS_CHAIN_DEX/ARCHITECTURE.md](../EXECUTION_v1/06_CROSS_CHAIN_DEX/ARCHITECTURE.md)  
**Code**: [packages/cross-chain-dex/src/](./src/)  
**Issues**: File on GitHub or contact OPTKAS dev team

---

**Built with ❤️ by OPTKAS — 100% Sovereign Financial Infrastructure**
