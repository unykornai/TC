/**
 * OPTKAS Testnet Provisioning Script
 *
 * Provisions all XRPL and Stellar testnet accounts via faucets,
 * then writes the funded addresses back to platform-config.yaml.
 *
 * Usage:  npx ts-node scripts/provision-testnet.ts
 *
 * Idempotent: If addresses already exist in config, they are skipped.
 * No private keys are written to config — only public addresses.
 * Secret material is printed to stdout ONCE for secure offline storage.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import * as https from 'https';
import * as http from 'http';

// ── Paths ──────────────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'platform-config.yaml');
const SECRETS_PATH = path.join(__dirname, '..', 'config', '.testnet-secrets.json');

// ── XRPL account roles to provision ───────────────────────────
const XRPL_ROLES = ['issuer', 'treasury', 'escrow', 'attestation', 'amm_liquidity', 'trading'] as const;

// ── Stellar account roles to provision ────────────────────────
const STELLAR_ROLES = ['issuer', 'distribution', 'anchor'] as const;

// ── Types ──────────────────────────────────────────────────────
interface XrplFaucetResponse {
  account: {
    xAddress: string;
    classicAddress: string;
    secret: string;
  };
  amount: number;
  balance: number;
}

interface StellarKeypair {
  publicKey: string;
  secret: string;
}

// ── HTTP helpers ───────────────────────────────────────────────
function postJSON(url: string, body: Record<string, unknown> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;
    const payload = JSON.stringify(body);
    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;
    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'GET',
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

// ── XRPL Faucet ───────────────────────────────────────────────
async function provisionXrplAccount(faucetUrl: string): Promise<{ address: string; secret: string }> {
  const res: XrplFaucetResponse = await postJSON(faucetUrl);
  if (!res?.account?.classicAddress) {
    throw new Error(`XRPL faucet returned unexpected payload: ${JSON.stringify(res).slice(0, 200)}`);
  }
  return { address: res.account.classicAddress, secret: res.account.secret };
}

// ── Stellar Keypair + Friendbot ───────────────────────────────
function generateStellarKeypair(): StellarKeypair {
  // Generate a random 32-byte seed for ed25519 keypair
  // We use the Stellar SDK if available, otherwise degrade to raw generation
  // For testnet provisioning we call friendbot with a generated public key
  const crypto = require('crypto');
  const nacl = require('tweetnacl');
  const seed = crypto.randomBytes(32);
  const keypair = nacl.sign.keyPair.fromSeed(seed);
  const publicKey = encodeStellarKey('G', keypair.publicKey);
  const secret = encodeStellarKey('S', seed);
  return { publicKey, secret };
}

function encodeStellarKey(prefix: string, payload: Uint8Array): string {
  // Stellar uses base32 (RFC 4648) with a version byte + CRC16
  const versionByte = prefix === 'G' ? 6 << 3 : 18 << 3; // accountId = 6, seed = 18
  const data = Buffer.alloc(1 + payload.length);
  data[0] = versionByte;
  Buffer.from(payload).copy(data, 1);
  const checksum = crc16xmodem(data);
  const full = Buffer.alloc(data.length + 2);
  data.copy(full);
  full.writeUInt16LE(checksum, data.length);
  return base32Encode(full);
}

function crc16xmodem(buf: Buffer): number {
  let crc = 0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i] << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc;
}

function base32Encode(buf: Buffer): string {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

async function fundStellarTestnet(publicKey: string, friendbotUrl: string): Promise<void> {
  const url = `${friendbotUrl}?addr=${publicKey}`;
  const res = await getJSON(url);
  if (res?.status && res.status >= 400) {
    throw new Error(`Stellar friendbot error: ${JSON.stringify(res).slice(0, 200)}`);
  }
}

// ── Main ──────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('\n  ★ OPTKAS Testnet Provisioning');
  console.log('  ' + '─'.repeat(40));

  // Load config
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const doc = yaml.parseDocument(raw); // preserve comments
  const config = doc.toJSON();

  const xrplFaucet = config.networks?.xrpl?.testnet?.faucet;
  const stellarFriendbot = config.networks?.stellar?.testnet?.friendbot;

  if (!xrplFaucet) throw new Error('Missing networks.xrpl.testnet.faucet in config');
  if (!stellarFriendbot) throw new Error('Missing networks.stellar.testnet.friendbot in config');

  const secrets: Record<string, { address: string; secret: string; ledger: string; role: string }> = {};
  let provisioned = 0;
  let skipped = 0;

  // ── XRPL Accounts ────────────────────────────────────────
  console.log('\n  ▸ XRPL Testnet Accounts');
  for (const role of XRPL_ROLES) {
    const existing = config.xrpl_accounts?.[role]?.address;
    if (existing && existing !== null) {
      console.log(`    ✓ ${role}: ${existing} (existing — skipped)`);
      skipped++;
      continue;
    }
    try {
      const { address, secret } = await provisionXrplAccount(xrplFaucet);
      // Update the YAML document in-place
      doc.setIn(['xrpl_accounts', role, 'address'], address);
      secrets[`xrpl_${role}`] = { address, secret, ledger: 'xrpl', role };
      console.log(`    ★ ${role}: ${address} (funded)`);
      provisioned++;
      // Rate limit — faucet throttles
      await sleep(1500);
    } catch (err: any) {
      console.error(`    ✗ ${role}: FAILED — ${err.message}`);
    }
  }

  // ── Stellar Accounts ─────────────────────────────────────
  console.log('\n  ▸ Stellar Testnet Accounts');
  for (const role of STELLAR_ROLES) {
    const existing = config.stellar_accounts?.[role]?.public_key;
    if (existing && existing !== null) {
      console.log(`    ✓ ${role}: ${existing} (existing — skipped)`);
      skipped++;
      continue;
    }
    try {
      const kp = generateStellarKeypair();
      await fundStellarTestnet(kp.publicKey, stellarFriendbot);
      doc.setIn(['stellar_accounts', role, 'public_key'], kp.publicKey);
      secrets[`stellar_${role}`] = { address: kp.publicKey, secret: kp.secret, ledger: 'stellar', role };
      console.log(`    ★ ${role}: ${kp.publicKey.slice(0, 12)}...${kp.publicKey.slice(-6)} (funded)`);
      provisioned++;
      await sleep(1000);
    } catch (err: any) {
      console.error(`    ✗ ${role}: FAILED — ${err.message}`);
    }
  }

  // ── Write updated config ─────────────────────────────────
  if (provisioned > 0) {
    fs.writeFileSync(CONFIG_PATH, doc.toString(), 'utf-8');
    console.log(`\n  ✓ Config updated: ${CONFIG_PATH}`);

    // Write secrets to gitignored file
    fs.writeFileSync(SECRETS_PATH, JSON.stringify(secrets, null, 2), 'utf-8');
    console.log(`  ✓ Secrets written: ${SECRETS_PATH}`);
    console.log('  ⚠ BACK UP secrets file immediately. It is gitignored.');
  }

  console.log(`\n  Summary: ${provisioned} provisioned, ${skipped} skipped`);
  console.log('  ' + '─'.repeat(40) + '\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error('\n  ✗ Fatal:', err.message);
  process.exit(1);
});
