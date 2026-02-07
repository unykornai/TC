# OPTKAS Sovereign Cross-Chain DEX — Phase 19

## Mission
Provide **100% sovereign, trustless, decentralized** swap infrastructure for any asset pair across XRPL and Stellar, with zero reliance on external exchanges or services.

## Core Capabilities
- **XRP ↔ XLM** — Direct cross-chain swaps
- **XRP/XLM ↔ Stablecoins** — USDC, USDT on both chains
- **OPTKAS Token Swaps** — Trade internal tokens on both chains
- **Any-to-Any Routing** — Automatic pathfinding (e.g., XRP → USDC → XLM)
- **Liquidity Provisioning** — OPTKAS-controlled pools, no external LPs needed
- **Rate Oracle** — Fair pricing based on on-chain liquidity depth

---

## Architecture Components

### 1. Cross-Chain Bridge
**Purpose**: Trustless asset transfer between XRPL and Stellar  
**Mechanism**: Hash Time-Locked Contracts (HTLCs) + Escrow  
**Accounts**:
- XRPL Bridge: `xrpl_treasury` (already funded)
- Stellar Bridge: `stellar_anchor` (awaiting funding)

**Flow**:
1. User initiates swap (e.g., 100 XRP → XLM)
2. XRP locked in XRPL escrow with hashlock
3. Equivalent XLM locked in Stellar escrow with same hash
4. User reveals preimage → claims both sides atomically
5. If timeout: funds returned (trustless cancellation)

### 2. AMM Liquidity Pools
**XRPL Pools** (using native AMM):
- **XRP/USDC** — 10,000 XRP + 14,200 USDC
- **OPTKAS/USDC** — 50,000 OPTKAS + 10,000 USDC
- **XRP/OPTKAS** — 5,000 XRP + 25,000 OPTKAS

**Stellar Pools** (using liquidity pool protocol):
- **XLM/USDC** — 100,000 XLM + 16,000 USDC
- **OPTKAS/USDC** — 50,000 OPTKAS + 10,000 USDC

**Fees**: 0.3% per swap (standard AMM rate), 100% accrues to OPTKAS treasury

### 3. Pathfinding Engine
**Goal**: Find optimal swap route across chains with minimal slippage

**Algorithm**:
```
Input: (fromAsset, toAsset, amount)
Output: SwapPath[]

1. Check direct pool (XRP → XLM)
2. If no direct: check 1-hop (XRP → USDC → XLM)
3. If cross-chain: route via stablecoin bridge
4. Calculate total fees + slippage for each path
5. Return cheapest path
```

**Example Paths**:
- XRP → XLM: `XRP → [XRPL AMM] → USDC → [Bridge] → USDC → [Stellar Pool] → XLM`
- XRP → OPTKAS: `XRP → [XRPL AMM] → USDC → [XRPL AMM] → OPTKAS`
- XLM → OPTKAS: `XLM → [Stellar Pool] → USDC → [Bridge] → USDC → [XRPL AMM] → OPTKAS`

### 4. Swap Execution Engine
**API**:
```typescript
interface SwapRequest {
  from: { asset: string; ledger: 'xrpl' | 'stellar'; amount: string };
  to: { asset: string; ledger: 'xrpl' | 'stellar' };
  maxSlippage: number; // e.g., 0.5 = 0.5%
  userAccount: string;
}

interface SwapResult {
  success: boolean;
  txHashes: string[];
  amountOut: string;
  effectiveRate: number;
  fees: { amm: string; bridge: string };
  path: SwapStep[];
}
```

**Execution Flow**:
1. **Validate**: Check balance, compute expected output
2. **Lock**: Escrow user's input asset
3. **Route**: Execute swap path (AMM trades + bridge transfers)
4. **Settle**: Release output asset to user
5. **Confirm**: Return tx hashes + final amounts

### 5. Rate Oracle
**Method**: On-chain liquidity depth (no external APIs)

**Price Discovery**:
- **XRP/USDC rate**: Query XRPL AMM pool reserves
- **XLM/USDC rate**: Query Stellar liquidity pool reserves
- **Cross-rate calculation**: `XRP/XLM = (XRP/USDC) / (XLM/USDC)`

**Slippage Protection**:
- User sets `maxSlippage` (e.g., 0.5%)
- If actual rate deviates > maxSlippage: tx reverts
- Prevents front-running / sandwich attacks

---

## Liquidity Provisioning Strategy

### Initial Liquidity (Phase 19)
- **Capital Required**: ~$50,000 equivalent (25K XRP + 150K XLM + 20K USDC)
- **Source**: OPTKAS treasury reserves
- **Deployment**: After all wallets funded, before public launch

### Ongoing Management
- **Rebalancing**: Weekly (automated script monitors pool ratios)
- **Fee Collection**: Swept to treasury monthly
- **Pool Expansion**: Add new pairs as needed (e.g., BTC/USDC via Stellar anchors)

---

## Security Model

### Trustless Guarantees
1. **Atomic Swaps**: Either both sides succeed or both revert
2. **No Custody**: OPTKAS cannot steal locked funds
3. **Time Locks**: Auto-refund after 24h if swap incomplete
4. **Hash Preimage**: Only user knows secret for final settlement

### Attack Mitigations
- **Front-running**: Slippage limits + commit-reveal
- **Oracle Manipulation**: Use on-chain reserves (no external price feeds)
- **Liquidity Drain**: Rate limits + circuit breakers on large swaps
- **Bridge Exploit**: Multi-sig escrow (3-of-5 OPTKAS managers)

---

## Deployment Phases

### Phase 19.1: AMM Pool Setup ✅ (Current)
1. Deploy XRPL AMM pools
2. Deploy Stellar liquidity pools
3. Fund with initial liquidity
4. Test single-chain swaps (XRP ↔ USDC, XLM ↔ USDC)

### Phase 19.2: Bridge Activation
1. Deploy HTLC contracts
2. Configure hashlock timeouts
3. Test cross-chain swaps (XRP ↔ XLM)
4. Monitor for 48h on testnet

### Phase 19.3: API + UI
1. Unified swap API endpoint
2. Admin dashboard for pool management
3. Public swap widget for dApp integration
4. Rate monitoring + alerts

### Phase 19.4: Mainnet Launch
1. Transfer liquidity to mainnet
2. Enable public swaps
3. Announce to institutional partners
4. Continuous monitoring + optimization

---

## Example Use Cases

### Scenario 1: User Swaps XRP → XLM
**Input**: 100 XRP  
**Path**: XRP → USDC (XRPL AMM) → USDC (Bridge) → XLM (Stellar Pool)  
**Output**: ~93 XLM (after 0.9% total fees)  
**Time**: ~8 seconds (3 ledger closes)

### Scenario 2: User Swaps XLM → OPTKAS
**Input**: 500 XLM  
**Path**: XLM → USDC (Stellar Pool) → USDC (Bridge) → OPTKAS (XRPL AMM)  
**Output**: ~400 OPTKAS  
**Time**: ~10 seconds

### Scenario 3: OPTKAS Rebalances Pools
**Trigger**: XRP/USDC pool ratio drifts 5% from target  
**Action**: Treasury adds 1,000 XRP to pool  
**Result**: Ratio restored, LP rewards accrue to treasury

---

## Technical Implementation

### Key Files
- `packages/cross-chain-dex/src/bridge.ts` — HTLC + escrow logic
- `packages/cross-chain-dex/src/amm.ts` — AMM pool interactions
- `packages/cross-chain-dex/src/pathfinder.ts` — Optimal route discovery
- `packages/cross-chain-dex/src/swap-api.ts` — Unified swap interface
- `scripts/deploy-dex-liquidity.ts` — Initial pool provisioning
- `apps/dex-dashboard/` — Admin UI for pool management

### Dependencies
- **XRPL**: xrpl@3.1.0 (native AMM support)
- **Stellar**: stellar-sdk@11.3.0 (liquidity pools)
- **Crypto**: crypto-js (hashlock generation)
- **Rate Limiting**: redis (prevent abuse)

---

## Comparison: OPTKAS DEX vs External CEX

| Feature | OPTKAS DEX | Coinbase/Kraken |
|---------|-----------|----------------|
| **Custody** | Non-custodial | Custodial |
| **Uptime** | 24/7 (on-chain) | Subject to outages |
| **KYC** | None | Required |
| **Fees** | 0.3% (fixed) | 0.5-2% (variable) |
| **Settlement** | Instant | Hours |
| **Sovereignty** | 100% OPTKAS | 0% |
| **Asset Support** | Any XRPL/Stellar asset | Limited pairs |
| **Privacy** | Fully private | AML tracking |

---

## Next Steps (After Phase 19 Complete)
1. **Phase 20**: Multi-sig governance for pool parameter changes
2. **Phase 21**: Public LP participation (stake OPTKAS → earn fees)
3. **Phase 22**: Cross-chain NFT swaps (XRPL NFTs ↔ Stellar assets)
4. **Phase 23**: Fiat on/off ramps (OPTKAS → USD via partners)

---

**Status**: Phase 19.1 in progress — building AMM pools + swap engine  
**ETA**: 2-3 hours for full deployment  
**Post-Deployment**: User can swap XRP → XLM internally in ~10 seconds
