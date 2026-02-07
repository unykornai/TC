/**
 * OPTKAS Cross-Chain DEX — Main Entry Point
 * 
 * Import and use the DEX in your application:
 * 
 * ```typescript
 * import { SwapAPI } from '@optkas/cross-chain-dex';
 * 
 * const api = new SwapAPI({ ... });
 * await api.init();
 * 
 * const result = await api.swapAssets('XRP', 'XLM', '100', userAccount);
 * console.log(`Got ${result.actualOutput} XLM`);
 * ```
 */

export { AMMPoolManager, PoolReserves, SwapQuote } from './amm';
export { CrossChainBridge, SwapRequest, SwapResult } from './bridge';
export { Pathfinder, SwapPath, SwapStep } from './pathfinder';
export { SwapAPI, SwapConfig, SwapResponse } from './swap-api';
