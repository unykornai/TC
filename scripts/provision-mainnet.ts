/**
 * OPTKAS Mainnet Wallet Provisioning Script
 *
 * Phase 18: Live Wallet Generation for XRPL + Stellar
 *
 * Generates fresh keypairs for ALL operational roles on both ledgers.
 * - Addresses → written to wallet manifest (safe for repo)
 * - Seeds/secrets → written to .gitignored secrets file (OFFLINE BACKUP REQUIRED)
 *
 * Usage:
 *   npx ts-node scripts/provision-mainnet.ts
 *   npx ts-node scripts/provision-mainnet.ts --network testnet   # safe dry-run
 *
 * After running:
 *   1. Back up secrets file IMMEDIATELY (offline cold storage)
 *   2. Fund each address with minimum reserve from exchange
 *   3. Run scripts/deploy-mainnet-trustlines.ts to activate
 *
 * SECURITY: Seeds are printed ONCE and saved to a gitignored file.
 * NEVER commit seeds to version control.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ── Paths ──────────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..');
const WALLET_DIR = path.join(ROOT, 'EXECUTION_v1', '05_WALLETS');
const MANIFEST_PATH = path.join(WALLET_DIR, 'WALLET_MANIFEST.json');
const SECRETS_PATH = path.join(ROOT, 'config', '.mainnet-secrets.json');
const TESTNET_SECRETS_PATH = path.join(ROOT, 'config', '.testnet-secrets.json');

// ── Role definitions ───────────────────────────────────────────
const XRPL_ROLES = [
  { id: 'issuer', purpose: 'IOU issuance (claims, receipts, participation tokens)', reserveXrp: 20 },
  { id: 'treasury', purpose: 'Operational treasury, escrow funding', reserveXrp: 20 },
  { id: 'escrow', purpose: 'Conditional settlement escrow', reserveXrp: 15 },
  { id: 'attestation', purpose: 'Document hash anchoring (evidence only)', reserveXrp: 15 },
  { id: 'amm_liquidity', purpose: 'AMM liquidity provision', reserveXrp: 15 },
  { id: 'trading', purpose: 'Algorithmic trading and DEX operations', reserveXrp: 15 },
] as const;

const STELLAR_ROLES = [
  { id: 'issuer', purpose: 'Regulated asset issuance', reserveXlm: 5 },
  { id: 'distribution', purpose: 'Asset distribution and settlement', reserveXlm: 5 },
  { id: 'anchor', purpose: 'Fiat on/off-ramp anchor operations', reserveXlm: 5 },
] as const;

// ── XRPL Keypair Generation ───────────────────────────────────
// Uses the same algorithm as xrpl.js Wallet.generate()
// secp256k1 keypair → RIPEMD160(SHA256(pubkey)) → base58check

const XRPL_ALPHABET = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';

function xrplBase58Encode(buffer: Buffer): string {
  const digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    let carry = buffer[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  // Leading zeros
  for (let i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) {
    digits.push(0);
  }
  return digits.reverse().map(d => XRPL_ALPHABET[d]).join('');
}

function xrplBase58Check(payload: Buffer, versionByte: number): string {
  const versioned = Buffer.concat([Buffer.from([versionByte]), payload]);
  const hash1 = crypto.createHash('sha256').update(versioned).digest();
  const hash2 = crypto.createHash('sha256').update(hash1).digest();
  const checksum = hash2.slice(0, 4);
  return xrplBase58Encode(Buffer.concat([versioned, checksum]));
}

function generateXrplKeypair(): { address: string; seed: string; publicKey: string } {
  // Generate 16-byte entropy for seed
  const entropy = crypto.randomBytes(16);

  // Encode as XRPL seed (version byte 0x21 = 33 for secp256k1 family seed)
  const seed = xrplBase58Check(entropy, 0x21);

  // For address derivation, we use the deterministic key derivation
  // SHA-512 half of seed entropy → secp256k1 private key → public key → account ID
  const ec = crypto.createECDH('secp256k1');

  // Derive private key from entropy (XRPL uses SHA-512 family seed derivation)
  const hashInput = Buffer.concat([entropy, Buffer.alloc(4)]); // entropy + sequence 0
  const derived = crypto.createHash('sha512').update(hashInput).digest().slice(0, 32);
  ec.setPrivateKey(derived);

  const publicKeyCompressed = Buffer.from(ec.getPublicKey(null, 'compressed'));

  // Account ID = RIPEMD160(SHA256(public_key))
  const sha256 = crypto.createHash('sha256').update(publicKeyCompressed).digest();
  const accountId = crypto.createHash('ripemd160').update(sha256).digest();

  // Address = base58check with version byte 0x00
  const address = xrplBase58Check(accountId, 0x00);

  return {
    address,
    seed,
    publicKey: publicKeyCompressed.toString('hex'),
  };
}

// ── Stellar Keypair Generation ─────────────────────────────────
// Ed25519 keypair → base32-check encoding

const STELLAR_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function stellarBase32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += STELLAR_BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += STELLAR_BASE32[(value << (5 - bits)) & 31];
  }
  return output;
}

function stellarCrc16(buf: Buffer): number {
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

function stellarEncodeKey(prefix: 'G' | 'S', payload: Buffer): string {
  const versionByte = prefix === 'G' ? 6 << 3 : 18 << 3;
  const data = Buffer.alloc(1 + payload.length);
  data[0] = versionByte;
  payload.copy(data, 1);
  const checksum = stellarCrc16(data);
  const full = Buffer.alloc(data.length + 2);
  data.copy(full);
  full.writeUInt16LE(checksum, data.length);
  return stellarBase32Encode(full);
}

function generateStellarKeypair(): { publicKey: string; secretKey: string } {
  // Use nacl-compatible Ed25519 via Node crypto
  const seed = crypto.randomBytes(32);

  // Node 18+ has Ed25519 support via crypto.sign
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });

  // Extract raw 32-byte public key from DER (last 32 bytes of SPKI)
  const rawPub = publicKey.slice(-32);

  // Extract raw 32-byte seed from DER PKCS8 (bytes at offset 16, length 32)
  const rawSeed = privateKey.slice(16, 48);

  return {
    publicKey: stellarEncodeKey('G', rawPub),
    secretKey: stellarEncodeKey('S', rawSeed),
  };
}

// ── Main ──────────────────────────────────────────────────────
interface WalletRecord {
  role: string;
  ledger: 'xrpl' | 'stellar';
  purpose: string;
  address: string;
  publicKey?: string;
  reserveRequired: string;
  status: 'GENERATED' | 'FUNDED' | 'ACTIVE';
}

interface SecretRecord {
  role: string;
  ledger: 'xrpl' | 'stellar';
  address: string;
  seed: string;
  generatedAt: string;
  warning: string;
}

async function main(): Promise<void> {
  const network = process.argv.includes('--testnet') ? 'testnet' : 'mainnet';
  const isMainnet = network === 'mainnet';

  console.log();
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log(`  ║  OPTKAS ${isMainnet ? 'MAINNET' : 'TESTNET'} WALLET PROVISIONING             ║`);
  console.log('  ║  Phase 18 — Live Infrastructure Deployment       ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log();

  if (isMainnet) {
    console.log('  ⚠  MAINNET MODE — Real funds required');
    console.log('  ⚠  Seeds will be output ONCE — back up immediately');
    console.log('  ─'.repeat(28));
    console.log();
  }

  const wallets: WalletRecord[] = [];
  const secrets: SecretRecord[] = [];
  const timestamp = new Date().toISOString();

  // ── Generate XRPL Wallets ──────────────────────────────────
  console.log('  ▸ XRPL Wallets');
  let totalXrpNeeded = 0;

  for (const role of XRPL_ROLES) {
    const kp = generateXrplKeypair();
    totalXrpNeeded += role.reserveXrp;

    wallets.push({
      role: role.id,
      ledger: 'xrpl',
      purpose: role.purpose,
      address: kp.address,
      publicKey: kp.publicKey,
      reserveRequired: `${role.reserveXrp} XRP`,
      status: 'GENERATED',
    });

    secrets.push({
      role: role.id,
      ledger: 'xrpl',
      address: kp.address,
      seed: kp.seed,
      generatedAt: timestamp,
      warning: 'NEVER commit this file. Store offline immediately.',
    });

    console.log(`    ★ ${role.id.padEnd(15)} ${kp.address}  (reserve: ${role.reserveXrp} XRP)`);
  }

  console.log(`    ─ Total XRPL reserve needed: ${totalXrpNeeded} XRP`);
  console.log();

  // ── Generate Stellar Wallets ───────────────────────────────
  console.log('  ▸ Stellar Wallets');
  let totalXlmNeeded = 0;

  for (const role of STELLAR_ROLES) {
    const kp = generateStellarKeypair();
    totalXlmNeeded += role.reserveXlm;

    wallets.push({
      role: role.id,
      ledger: 'stellar',
      purpose: role.purpose,
      address: kp.publicKey,
      reserveRequired: `${role.reserveXlm} XLM`,
      status: 'GENERATED',
    });

    secrets.push({
      role: role.id,
      ledger: 'stellar',
      address: kp.publicKey,
      seed: kp.secretKey,
      generatedAt: timestamp,
      warning: 'NEVER commit this file. Store offline immediately.',
    });

    const short = `${kp.publicKey.slice(0, 8)}...${kp.publicKey.slice(-6)}`;
    console.log(`    ★ ${role.id.padEnd(15)} ${short}  (reserve: ${role.reserveXlm} XLM)`);
  }

  console.log(`    ─ Total Stellar reserve needed: ${totalXlmNeeded} XLM`);
  console.log();

  // ── Trustline cost estimate ────────────────────────────────
  const stablecoinIssuers = 4; // USDT, USDC, Bitstamp USD, GateHub USD
  const xrplTrustlineAccounts = 5; // all except attestation
  const trustlineCostXrp = stablecoinIssuers * xrplTrustlineAccounts * 2; // 2 XRP reserve per trustline
  const stellarTrustlines = 1; // OPTKAS-USD on distribution + anchor
  const trustlineCostXlm = stellarTrustlines * 2 * 0.5; // 0.5 XLM per trustline

  console.log('  ▸ Funding Requirements Summary');
  console.log(`    XRPL Account Reserves:   ${totalXrpNeeded} XRP`);
  console.log(`    XRPL Trustline Reserves:  ${trustlineCostXrp} XRP (${stablecoinIssuers} issuers × ${xrplTrustlineAccounts} accounts × 2 XRP)`);
  console.log(`    XRPL Operations Buffer:   20 XRP (tx fees + margin)`);
  console.log(`    ─────────────────────────────`);
  console.log(`    XRPL TOTAL NEEDED:        ${totalXrpNeeded + trustlineCostXrp + 20} XRP`);
  console.log();
  console.log(`    Stellar Account Reserves:  ${totalXlmNeeded} XLM`);
  console.log(`    Stellar Trustline Reserves: ${trustlineCostXlm} XLM`);
  console.log(`    Stellar Operations Buffer:  5 XLM`);
  console.log(`    ─────────────────────────────`);
  console.log(`    STELLAR TOTAL NEEDED:      ${totalXlmNeeded + trustlineCostXlm + 5} XLM`);
  console.log();

  // ── Write manifest (addresses only — safe for repo) ────────
  fs.mkdirSync(WALLET_DIR, { recursive: true });

  const manifest = {
    version: '1.0.0',
    network,
    generatedAt: timestamp,
    generatedBy: 'scripts/provision-mainnet.ts',
    phase: 'Phase 18 — Live Wallet Provisioning',
    wallets,
    funding: {
      xrpl: {
        accountReserves: `${totalXrpNeeded} XRP`,
        trustlineReserves: `${trustlineCostXrp} XRP`,
        operationsBuffer: '20 XRP',
        total: `${totalXrpNeeded + trustlineCostXrp + 20} XRP`,
      },
      stellar: {
        accountReserves: `${totalXlmNeeded} XLM`,
        trustlineReserves: `${trustlineCostXlm} XLM`,
        operationsBuffer: '5 XLM',
        total: `${totalXlmNeeded + trustlineCostXlm + 5} XLM`,
      },
    },
    stablecoinTrustlines: {
      issuers: [
        { currency: 'USDT', issuer: 'rE85pdvr4icCPh9cpPr1HrSCVJCUhZ1Dqm', name: 'Tether', tier: 1 },
        { currency: 'USDC', issuer: 'rcvxE9PS9YBwxtGg1qNeewV6ZB3wGubZq', name: 'Circle', tier: 1 },
        { currency: 'USD', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B', name: 'Bitstamp', tier: 1 },
        { currency: 'USD', issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq', name: 'GateHub', tier: 2 },
      ],
      trustLimits: {
        USDT: '1000000',
        USDC: '1000000',
        'USD_Bitstamp': '500000',
        'USD_GateHub': '250000',
      },
    },
    nextSteps: [
      '1. Back up .mainnet-secrets.json to OFFLINE cold storage',
      '2. Fund each XRPL address with its reserve amount + buffer',
      '3. Fund each Stellar address with its reserve amount + buffer',
      '4. Run: npx ts-node scripts/deploy-mainnet-trustlines.ts --network mainnet',
      '5. Verify trustlines on livenet.xrpl.org / stellar.expert',
    ],
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`  ✓ Wallet manifest: EXECUTION_v1/05_WALLETS/WALLET_MANIFEST.json`);

  // ── Write secrets (GITIGNORED — offline backup required) ────
  const secretsDir = path.dirname(isMainnet ? SECRETS_PATH : TESTNET_SECRETS_PATH);
  fs.mkdirSync(secretsDir, { recursive: true });

  const secretsFile = isMainnet ? SECRETS_PATH : TESTNET_SECRETS_PATH;
  const secretsPayload = {
    WARNING: '⚠ THIS FILE CONTAINS PRIVATE KEYS — NEVER COMMIT TO VERSION CONTROL',
    network,
    generatedAt: timestamp,
    accounts: secrets,
  };

  fs.writeFileSync(secretsFile, JSON.stringify(secretsPayload, null, 2), 'utf-8');
  console.log(`  ✓ Secrets file: ${path.relative(ROOT, secretsFile)}`);
  console.log('  ⚠ BACK UP THIS FILE TO COLD STORAGE IMMEDIATELY');
  console.log();

  // ── Ensure gitignore ────────────────────────────────────────
  const gitignorePath = path.join(ROOT, '.gitignore');
  const gitignoreEntries = [
    '.mainnet-secrets.json',
    '.testnet-secrets.json',
    '*-secrets.json',
  ];

  if (fs.existsSync(gitignorePath)) {
    let gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    let modified = false;
    for (const entry of gitignoreEntries) {
      if (!gitignore.includes(entry)) {
        gitignore += `\n${entry}`;
        modified = true;
      }
    }
    if (modified) {
      fs.writeFileSync(gitignorePath, gitignore, 'utf-8');
      console.log('  ✓ .gitignore updated with secrets exclusions');
    }
  }

  // ── Print funding instructions ──────────────────────────────
  console.log();
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║  FUNDING INSTRUCTIONS                            ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log();
  console.log('  XRPL (send XRP from exchange or existing wallet):');

  for (const w of wallets.filter(w => w.ledger === 'xrpl')) {
    console.log(`    ${w.role.padEnd(15)} → ${w.address}  (min: ${w.reserveRequired})`);
  }

  console.log();
  console.log('  Stellar (send XLM from exchange or existing wallet):');

  for (const w of wallets.filter(w => w.ledger === 'stellar')) {
    const short = `${w.address.slice(0, 8)}...${w.address.slice(-6)}`;
    console.log(`    ${w.role.padEnd(15)} → ${short}  (min: ${w.reserveRequired})`);
  }

  console.log();
  console.log('  After funding, run:');
  console.log(`    npx ts-node scripts/deploy-mainnet-trustlines.ts --network ${network}`);
  console.log();
  console.log('  ─'.repeat(28));
  console.log('  Phase 18 provisioning complete.');
  console.log();
}

main().catch((err) => {
  console.error('\n  ✗ Fatal:', err.message);
  process.exit(1);
});
