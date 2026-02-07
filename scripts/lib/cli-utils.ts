/**
 * OPTKAS Shared CLI Utilities
 *
 * Common configuration loading, flag parsing, and output formatting
 * used by all CLI scripts.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { Command } from 'commander';

// ─── Types ───────────────────────────────────────────────────────────

export interface PlatformConfig {
  platform: { name: string; version: string; owner: string };
  entities: Record<string, any>;
  governance: any;
  networks: {
    xrpl: Record<string, { url: string; explorer: string }>;
    stellar: Record<string, { url: string; passphrase: string }>;
  };
  xrpl_accounts: Record<string, any>;
  stellar_accounts: Record<string, any>;
  tokens: Record<string, any>;
  escrow_templates: Record<string, any>;
  amm: any;
  trading: any;
  compliance: any;
  audit: any;
}

export type NetworkType = 'testnet' | 'mainnet';

// ─── Config Loading ──────────────────────────────────────────────────

export function loadConfig(configPath: string): PlatformConfig {
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Configuration file not found: ${resolved}`);
  }
  const content = fs.readFileSync(resolved, 'utf-8');
  return YAML.parse(content) as PlatformConfig;
}

// ─── Shared CLI Setup ────────────────────────────────────────────────

export function createBaseCommand(name: string, description: string): Command {
  return new Command(name)
    .description(description)
    .option('--dry-run', 'Simulate without executing (recommended)', true)
    .option('--network <network>', 'Target network: testnet | mainnet', 'testnet')
    .option('--config <path>', 'Path to platform-config.yaml', 'config/platform-config.yaml')
    .option('--verbose', 'Enable verbose output', false)
    .option('--json', 'Output as JSON', false);
}

// ─── Output Formatting ──────────────────────────────────────────────

export function printHeader(title: string): void {
  console.log('');
  console.log('═'.repeat(60));
  console.log(`  OPTKAS — ${title}`);
  console.log('═'.repeat(60));
  console.log('');
}

export function printSuccess(message: string): void {
  console.log(`✓ ${message}`);
}

export function printWarning(message: string): void {
  console.log(`⚠ ${message}`);
}

export function printError(message: string): void {
  console.error(`✗ ${message}`);
}

export function printInfo(message: string): void {
  console.log(`  ${message}`);
}

export function printDryRun(): void {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   DRY RUN — No transactions sent     ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
}

export function printNetworkWarning(network: NetworkType): void {
  if (network === 'mainnet') {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════╗');
    console.log('  ║  ⚠  MAINNET — Real funds at risk             ║');
    console.log('  ║     Ensure multisig approval obtained        ║');
    console.log('  ╚══════════════════════════════════════════════╝');
    console.log('');
  }
}

export function validateNetwork(network: string): NetworkType {
  if (network !== 'testnet' && network !== 'mainnet') {
    throw new Error(`Invalid network: ${network}. Must be 'testnet' or 'mainnet'.`);
  }
  return network;
}
