/**
 * OPTKAS QR Code Generator — Phase 18
 *
 * Generates static PNG QR codes for all 9 wallet addresses.
 * Also generates a printable HTML binder with all QR codes + funding checklist.
 *
 * Usage:
 *   npx ts-node scripts/generate-wallet-qr-codes.ts
 *
 * Outputs:
 *   EXECUTION_v1/05_WALLETS/qr/
 *     XRPL_ISSUER_QR.png
 *     XRPL_TREASURY_QR.png
 *     ...etc
 *     STELLAR_ISSUER_QR.png
 *     ...etc
 *     SHA256_QR_HASHES.txt
 *   EXECUTION_v1/05_WALLETS/FUNDING_QR_BINDER.html  (printable single page)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import QRCode from 'qrcode';

const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'EXECUTION_v1', '05_WALLETS', 'WALLET_MANIFEST.json');
const QR_DIR = path.join(ROOT, 'EXECUTION_v1', '05_WALLETS', 'qr');
const BINDER_PATH = path.join(ROOT, 'EXECUTION_v1', '05_WALLETS', 'FUNDING_QR_BINDER.html');
const HASH_PATH = path.join(QR_DIR, 'SHA256_QR_HASHES.txt');

// Live prices (updated Feb 7, 2026)
const XRP_PRICE = 1.42;
const XLM_PRICE = 0.16;

interface WalletEntry {
  role: string;
  ledger: 'xrpl' | 'stellar';
  purpose: string;
  address: string;
  reserveRequired: string;
}

// Recommended send amounts (reserve + trustlines + buffer)
const SEND_AMOUNTS: Record<string, number> = {
  'xrpl_issuer': 25,
  'xrpl_treasury': 30,
  'xrpl_escrow': 25,
  'xrpl_attestation': 20,
  'xrpl_amm_liquidity': 25,
  'xrpl_trading': 25,
  'stellar_issuer': 7,
  'stellar_distribution': 7,
  'stellar_anchor': 7,
};

async function main(): Promise<void> {
  console.log();
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║  OPTKAS QR CODE GENERATOR — Phase 18            ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log();

  // Load manifest
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found: ${MANIFEST_PATH}\nRun provision-mainnet.ts first.`);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const wallets: WalletEntry[] = manifest.wallets;

  // Create output dir
  fs.mkdirSync(QR_DIR, { recursive: true });

  const hashes: string[] = [];
  const qrFiles: Array<{ wallet: WalletEntry; filename: string; b64: string; sendAmount: number; usdCost: string }> = [];

  // Generate QR PNGs
  console.log('  ▸ Generating QR code PNGs...');

  for (const w of wallets) {
    const filename = `${w.ledger.toUpperCase()}_${w.role.toUpperCase()}_QR.png`;
    const filepath = path.join(QR_DIR, filename);
    const key = `${w.ledger}_${w.role}`;
    const sendAmount = SEND_AMOUNTS[key] || 10;
    const price = w.ledger === 'xrpl' ? XRP_PRICE : XLM_PRICE;
    const unit = w.ledger === 'xrpl' ? 'XRP' : 'XLM';
    const usdCost = (sendAmount * price).toFixed(2);

    // Generate PNG buffer
    const buffer = await QRCode.toBuffer(w.address, {
      type: 'png',
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'H', // High — survives 30% damage
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    fs.writeFileSync(filepath, buffer);

    // SHA-256 hash of the PNG
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    hashes.push(`${hash}  ${filename}`);

    // Base64 for embedding in HTML binder
    const b64 = buffer.toString('base64');
    qrFiles.push({ wallet: w, filename, b64, sendAmount, usdCost });

    console.log(`    ✓ ${filename.padEnd(35)} ${w.address.slice(0, 16)}... (send ${sendAmount} ${unit} ≈ $${usdCost})`);
  }

  // Write hash file
  const hashContent = `# SHA-256 Hashes for OPTKAS Wallet QR Codes\n# Generated: ${new Date().toISOString()}\n# Verify: shasum -a 256 -c SHA256_QR_HASHES.txt\n\n${hashes.join('\n')}\n`;
  fs.writeFileSync(HASH_PATH, hashContent, 'utf-8');
  console.log(`    ✓ SHA256_QR_HASHES.txt`);
  console.log();

  // Generate printable HTML binder
  console.log('  ▸ Generating printable QR binder...');
  const binderHtml = generateBinder(qrFiles);
  fs.writeFileSync(BINDER_PATH, binderHtml, 'utf-8');
  console.log(`    ✓ FUNDING_QR_BINDER.html`);
  console.log();

  // Copy to backup locations
  const desktop = process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'OneDrive', 'Desktop', 'OPTKAS_WALLET_BACKUP_2026-02-07') : null;
  const docs = process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'OneDrive', 'Documents', 'OPTKAS_WALLET_BACKUP_2026-02-07') : null;

  for (const backupDir of [desktop, docs]) {
    if (backupDir && fs.existsSync(backupDir)) {
      const qrBackup = path.join(backupDir, 'qr');
      fs.mkdirSync(qrBackup, { recursive: true });
      for (const qf of qrFiles) {
        fs.copyFileSync(path.join(QR_DIR, qf.filename), path.join(qrBackup, qf.filename));
      }
      fs.copyFileSync(HASH_PATH, path.join(qrBackup, 'SHA256_QR_HASHES.txt'));
      fs.copyFileSync(BINDER_PATH, path.join(backupDir, 'FUNDING_QR_BINDER.html'));
      console.log(`  ✓ Backed up to: ${backupDir}`);
    }
  }

  // Summary
  console.log();
  console.log('  ═══ SUMMARY ═══');
  console.log(`  QR PNGs:    ${qrFiles.length} files in EXECUTION_v1/05_WALLETS/qr/`);
  console.log(`  Binder:     EXECUTION_v1/05_WALLETS/FUNDING_QR_BINDER.html`);
  console.log(`  Hashes:     EXECUTION_v1/05_WALLETS/qr/SHA256_QR_HASHES.txt`);
  console.log();
  console.log('  To print: Open FUNDING_QR_BINDER.html → File → Print → Save as PDF');
  console.log('  To verify: shasum -a 256 -c EXECUTION_v1/05_WALLETS/qr/SHA256_QR_HASHES.txt');
  console.log();
}

function generateBinder(
  qrFiles: Array<{ wallet: WalletEntry; filename: string; b64: string; sendAmount: number; usdCost: string }>
): string {
  const xrplCards = qrFiles.filter(q => q.wallet.ledger === 'xrpl');
  const stellarCards = qrFiles.filter(q => q.wallet.ledger === 'stellar');

  const totalXrp = xrplCards.reduce((s, q) => s + q.sendAmount, 0);
  const totalXlm = stellarCards.reduce((s, q) => s + q.sendAmount, 0);
  const totalUsd = (totalXrp * XRP_PRICE + totalXlm * XLM_PRICE).toFixed(2);

  function renderCard(q: typeof qrFiles[0], index: number): string {
    const unit = q.wallet.ledger === 'xrpl' ? 'XRP' : 'XLM';
    const ledgerColor = q.wallet.ledger === 'xrpl' ? '#0066ff' : '#00aa44';
    return `
    <div class="card">
      <div class="card-header">
        <span class="num">${index}</span>
        <span class="role">${q.wallet.role.replace('_', ' ').toUpperCase()}</span>
        <span class="badge" style="background:${ledgerColor}">${q.wallet.ledger.toUpperCase()}</span>
      </div>
      <div class="card-purpose">${q.wallet.purpose}</div>
      <div class="card-body">
        <img src="data:image/png;base64,${q.b64}" width="200" height="200" alt="QR">
        <div class="card-info">
          <div class="addr">${q.wallet.address}</div>
          <div class="send">Send: <strong>${q.sendAmount} ${unit}</strong> ≈ $${q.usdCost}</div>
          <div class="check">☐ Funded &nbsp; ☐ Verified on explorer</div>
        </div>
      </div>
    </div>`;
  }

  let cardIndex = 1;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OPTKAS Funding QR Binder — Phase 18</title>
<style>
  @page { size: letter; margin: 0.5in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 20px; }
  .title-page { text-align: center; padding: 60px 0 40px; page-break-after: always; }
  .title-page h1 { font-size: 32px; margin-bottom: 8px; }
  .title-page .sub { color: #666; font-size: 16px; margin-bottom: 30px; }
  .summary-box { display: inline-block; text-align: left; background: #f5f5f5; border: 2px solid #ddd; border-radius: 8px; padding: 20px 30px; }
  .summary-box h3 { margin-bottom: 10px; }
  .summary-box table { border-collapse: collapse; }
  .summary-box td { padding: 4px 12px; }
  .summary-box .total { font-weight: 700; border-top: 2px solid #999; }
  .warn { background: #fff3cd; border: 1px solid #e6c200; border-radius: 6px; padding: 12px; margin-top: 20px; font-size: 13px; color: #664d00; display: inline-block; max-width: 500px; }
  .section-title { font-size: 22px; color: #0066ff; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #0066ff; }
  .section-title.stellar { color: #00aa44; border-color: #00aa44; }
  .card { border: 2px solid #ccc; border-radius: 10px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
  .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
  .card-header .num { background: #333; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
  .card-header .role { font-size: 18px; font-weight: 700; }
  .badge { color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
  .card-purpose { font-size: 12px; color: #888; margin-bottom: 12px; margin-left: 38px; }
  .card-body { display: flex; gap: 20px; align-items: flex-start; }
  .card-body img { border: 3px solid #000; border-radius: 4px; flex-shrink: 0; }
  .card-info { flex: 1; }
  .addr { font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; background: #f0f0f0; padding: 8px 10px; border-radius: 4px; word-break: break-all; margin-bottom: 10px; border: 1px solid #ddd; }
  .send { font-size: 16px; margin-bottom: 8px; }
  .send strong { color: #cc6600; }
  .check { font-size: 14px; color: #666; margin-top: 8px; }
  .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; page-break-before: avoid; }
  @media print {
    .card { border: 2px solid #000; }
    .addr { background: #f8f8f8; border: 1px solid #aaa; }
  }
</style>
</head>
<body>

<div class="title-page">
  <h1>🏛️ OPTKAS Wallet Funding Binder</h1>
  <div class="sub">Phase 18 — Live Infrastructure • ${new Date().toISOString().split('T')[0]}</div>

  <div class="summary-box">
    <h3>💰 Funding Summary</h3>
    <table>
      <tr><td>XRPL (6 accounts)</td><td><strong>${totalXrp} XRP</strong></td><td>≈ $${(totalXrp * XRP_PRICE).toFixed(2)}</td></tr>
      <tr><td>Stellar (3 accounts)</td><td><strong>${totalXlm} XLM</strong></td><td>≈ $${(totalXlm * XLM_PRICE).toFixed(2)}</td></tr>
      <tr class="total"><td>TOTAL</td><td></td><td><strong>≈ $${totalUsd}</strong></td></tr>
    </table>
    <div style="margin-top:10px;font-size:12px;color:#888">Prices: XRP=$${XRP_PRICE} / XLM=$${XLM_PRICE} (Feb 7, 2026)</div>
  </div>

  <div class="warn">
    ⚠ <strong>INSTRUCTIONS:</strong> Scan each QR with your exchange/wallet app (XUMM, Coinbase, LOBSTR, etc.).<br>
    Fund in order — Issuer first. No destination tags needed. Check off each as funded.
  </div>
</div>

<h2 class="section-title">⚡ XRPL Wallets</h2>
${xrplCards.map(q => renderCard(q, cardIndex++)).join('\n')}

<h2 class="section-title stellar">⭐ Stellar Wallets</h2>
${stellarCards.map(q => renderCard(q, cardIndex++)).join('\n')}

<div style="margin-top:30px;page-break-inside:avoid">
  <h2 class="section-title" style="color:#333;border-color:#333">✅ Funding Checklist</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr style="background:#f0f0f0;font-weight:700"><td style="padding:8px;border:1px solid #ccc">Order</td><td style="padding:8px;border:1px solid #ccc">Account</td><td style="padding:8px;border:1px solid #ccc">Amount</td><td style="padding:8px;border:1px solid #ccc">USD</td><td style="padding:8px;border:1px solid #ccc">Sent ✓</td><td style="padding:8px;border:1px solid #ccc">Verified ✓</td></tr>
    ${qrFiles.map((q, i) => {
      const unit = q.wallet.ledger === 'xrpl' ? 'XRP' : 'XLM';
      return `<tr><td style="padding:6px 8px;border:1px solid #ccc">${i + 1}</td><td style="padding:6px 8px;border:1px solid #ccc">${q.wallet.ledger.toUpperCase()} ${q.wallet.role}</td><td style="padding:6px 8px;border:1px solid #ccc">${q.sendAmount} ${unit}</td><td style="padding:6px 8px;border:1px solid #ccc">$${q.usdCost}</td><td style="padding:6px 8px;border:1px solid #ccc;text-align:center">☐</td><td style="padding:6px 8px;border:1px solid #ccc;text-align:center">☐</td></tr>`;
    }).join('\n    ')}
    <tr style="font-weight:700;background:#f0f0f0"><td style="padding:8px;border:1px solid #ccc" colspan="3">TOTAL</td><td style="padding:8px;border:1px solid #ccc">$${totalUsd}</td><td style="padding:8px;border:1px solid #ccc" colspan="2"></td></tr>
  </table>
</div>

<div class="footer">
  OPTKAS Sovereign Financial Platform • Phase 18 • Wallet Funding Binder<br>
  After all funded → run: npx ts-node scripts/deploy-mainnet-trustlines.ts --network mainnet
</div>

</body>
</html>`;
}

main().catch((err) => {
  console.error('\n  ✗ Fatal:', err.message);
  process.exit(1);
});
