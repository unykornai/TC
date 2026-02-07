/**
 * deploy-reserve-vault.ts — Activate the Unykorn Reserve Vault on mainnet
 *
 * This script:
 * 1. Initializes the Reserve Vault with all OPTKAS platform assets
 * 2. Deposits existing SOVBND positions from treasury + escrow
 * 3. Strips yield from bond positions (Principal + Yield strips)
 * 4. Mints Reserve Attestation NFTs proving reserve levels on-chain
 * 5. Runs NFT-gated allocation simulation
 * 6. Compounds first yield cycle
 * 7. Mints final attestation with complete vault state
 *
 * On-chain operations: Attestation NFTs minted on XRPL mainnet
 */

import * as xrpl from 'xrpl';
import * as rippleKP from 'ripple-keypairs';
import { decodeSeed } from 'ripple-address-codec';
import * as StellarSdk from '@stellar/stellar-sdk';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Import vault engine
import { ReserveVault, createDefaultVaultConfig, type ReserveAttestation } from '../packages/reserve-vault/src/vault';

// ═══════════════════════════════════════════════════════════════════════
//  XRPL KEY DERIVATION (proven pattern from deploy-elite-platform.ts)
// ═══════════════════════════════════════════════════════════════════════

const XRPL_ALPHABET = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';

function deriveKeys(seed: string) {
  const decoded = decodeSeed(seed);
  const entropy = Buffer.from(decoded.bytes);
  const hashInput = Buffer.concat([entropy, Buffer.alloc(4)]);
  const privKeyBuf = crypto.createHash('sha512').update(hashInput).digest().slice(0, 32);
  const ec = crypto.createECDH('secp256k1');
  ec.setPrivateKey(privKeyBuf);
  const pubKeyBuf = Buffer.from(ec.getPublicKey(null, 'compressed'));
  return {
    privateKey: privKeyBuf.toString('hex'),
    publicKey: pubKeyBuf.toString('hex'),
  };
}

function signXrplTx(tx: any, pubKey: string, privKey: string): string {
  tx.SigningPubKey = pubKey;
  const encoded = xrpl.encode(tx as any);
  const sig = rippleKP.sign(
    Buffer.concat([Buffer.from('53545800', 'hex'), Buffer.from(encoded, 'hex')]).toString('hex'),
    privKey
  );
  tx.TxnSignature = sig;
  return xrpl.encode(tx as any);
}

// ═══════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const XRPL_ISSUER = 'rpraqLjKmDB9a43F9fURWA2bVaywkyJua3';
const STELLAR_ISSUER = 'GBJIMHMBGTPN5RS42OGBUY5NC2ATZLPT3B3EWV32SM2GQLS46TRJWG4I';

const SECRETS_PATH = path.join(__dirname, '..', 'config', '.mainnet-secrets.json');

// ═══════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
  ╔═══════════════════════════════════════════════════════════════════════════╗
  ║                                                                           ║
  ║    ██╗   ██╗███╗   ██╗██╗   ██╗██╗  ██╗ ██████╗ ██████╗ ███╗   ██╗      ║
  ║    ██║   ██║████╗  ██║╚██╗ ██╔╝██║ ██╔╝██╔═══██╗██╔══██╗████╗  ██║      ║
  ║    ██║   ██║██╔██╗ ██║ ╚████╔╝ █████╔╝ ██║   ██║██████╔╝██╔██╗ ██║      ║
  ║    ██║   ██║██║╚██╗██║  ╚██╔╝  ██╔═██╗ ██║   ██║██╔══██╗██║╚██╗██║      ║
  ║    ╚██████╔╝██║ ╚████║   ██║   ██║  ██╗╚██████╔╝██║  ██║██║ ╚████║      ║
  ║     ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝      ║
  ║                                                                           ║
  ║    ██████╗ ███████╗███████╗███████╗██████╗ ██╗   ██╗███████╗              ║
  ║    ██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝              ║
  ║    ██████╔╝█████╗  ███████╗█████╗  ██████╔╝██║   ██║█████╗                ║
  ║    ██╔══██╗██╔══╝  ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝                ║
  ║    ██║  ██║███████╗███████║███████╗██║  ██║ ╚████╔╝ ███████╗              ║
  ║    ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝              ║
  ║                                                                           ║
  ║    ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗                              ║
  ║    ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝                              ║
  ║    ██║   ██║███████║██║   ██║██║     ██║                                  ║
  ║    ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║                                  ║
  ║     ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║                                  ║
  ║      ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝                                  ║
  ║                                                                           ║
  ║    THE MISSING PIECE — Closing the Circle of Life                         ║
  ║    Reserve Attestation · Yield Stripping · NFT-Gated Allocation           ║
  ╚═══════════════════════════════════════════════════════════════════════════╝
  `);

  // ── Load wallets ──────────────────────────────────────────────────

  const secrets = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf8'));
  const xrplAccounts = secrets.accounts.filter((a: any) => a.ledger === 'xrpl');
  const stellarAccounts = secrets.accounts.filter((a: any) => a.ledger === 'stellar');
  const wallets: Record<string, { address: string; seed: string; keys: any }> = {};

  for (const w of xrplAccounts) {
    wallets[w.role] = {
      address: w.address,
      seed: w.seed,
      keys: deriveKeys(w.seed),
    };
  }

  console.log('  ✅ Wallets loaded\n');

  // ── Connect to XRPL ──────────────────────────────────────────────

  const client = new xrpl.Client('wss://xrplcluster.com');
  await client.connect();
  console.log('  ✓ Connected to XRPL mainnet\n');

  // ════════════════════════════════════════════════════════════════════
  //  STEP 1: INITIALIZE RESERVE VAULT
  // ════════════════════════════════════════════════════════════════════

  console.log('  ══════════════════════════════════════════════════════════════');
  console.log('  ║  STEP 1: INITIALIZE UNYKORN RESERVE VAULT                 ║');
  console.log('  ══════════════════════════════════════════════════════════════\n');

  const config = createDefaultVaultConfig();
  const vault = new ReserveVault(config);

  // Wire audit events
  vault.on('audit', (event: any) => {
    console.log(`    📋 [AUDIT] ${event.type}: ${JSON.stringify(event.details).slice(0, 100)}`);
  });

  console.log(`    Vault ID:          ${config.id}`);
  console.log(`    Name:              ${config.name}`);
  console.log(`    Entity:            ${config.entity}`);
  console.log(`    Accepted Assets:   ${config.acceptedAssets.map(a => a.code).join(', ')}`);
  console.log(`    Reserve Target:    ${(config.parameters.reserveRatioTarget * 100).toFixed(0)}%`);
  console.log(`    Compounding:       ${config.parameters.compoundingFrequency}`);
  console.log(`    Lock Period:       ${config.parameters.withdrawalLockDays} days`);
  console.log(`    Governance:        ${config.governance.quorum}-of-${config.governance.signers.length} multisig`);
  console.log(`    Allocation Tiers:  ${config.allocation.tiers.map(t => t.name).join(' → ')}`);
  console.log();

  // ════════════════════════════════════════════════════════════════════
  //  STEP 2: QUERY ON-CHAIN BALANCES & DEPOSIT INTO VAULT
  // ════════════════════════════════════════════════════════════════════

  console.log('  ══════════════════════════════════════════════════════════════');
  console.log('  ║  STEP 2: DEPOSIT ON-CHAIN ASSETS INTO VAULT               ║');
  console.log('  ══════════════════════════════════════════════════════════════\n');

  // Query treasury balances
  const treasuryLines = await client.request({
    command: 'account_lines',
    account: wallets.treasury.address,
    peer: XRPL_ISSUER,
  });

  const escrowLines = await client.request({
    command: 'account_lines',
    account: wallets.escrow.address,
    peer: XRPL_ISSUER,
  });

  // Reference prices (USD equivalent per unit)
  const PRICES: Record<string, string> = {
    SOVBND: '100',       // $100 per bond unit (face value)
    OPTKAS: '0.14',      // ~$0.14 per token (based on pool ratio)
    IMPERIA: '2050',     // $2,050/oz gold backing
    GEMVLT: '100',       // $100 per token
    TERRAVL: '52',       // $52 per token (land-backed)
    PETRO: '0.004',      // $0.004 per token (energy micro-unit)
  };

  const HEX_TO_CODE: Record<string, string> = {
    '534F56424E440000000000000000000000000000': 'SOVBND',
    '4F50544B41530000000000000000000000000000': 'OPTKAS',
    '494D504552494100000000000000000000000000': 'IMPERIA',
    '47454D564C540000000000000000000000000000': 'GEMVLT',
    '5445525241564C00000000000000000000000000': 'TERRAVL',
    '504554524F000000000000000000000000000000': 'PETRO',
  };

  // Deposit treasury positions
  console.log('  Treasury positions:');
  for (const line of (treasuryLines.result as any).lines) {
    const code = HEX_TO_CODE[line.currency];
    if (code && parseFloat(line.balance) > 0) {
      const price = PRICES[code] || '1';
      console.log(`    ${code.padEnd(10)} ${parseFloat(line.balance).toFixed(2).padStart(12)} units @ $${price}`);
      vault.deposit({
        depositor: wallets.treasury.address,
        asset: code,
        amount: line.balance,
        currentPrice: price,
      });
    }
  }

  // Deposit escrow positions
  console.log('\n  Escrow positions:');
  for (const line of (escrowLines.result as any).lines) {
    const code = HEX_TO_CODE[line.currency];
    if (code && parseFloat(line.balance) > 0) {
      const price = PRICES[code] || '1';
      console.log(`    ${code.padEnd(10)} ${parseFloat(line.balance).toFixed(2).padStart(12)} units @ $${price}`);
      vault.deposit({
        depositor: wallets.escrow.address,
        asset: code,
        amount: line.balance,
        currentPrice: price,
      });
    }
  }

  const state1 = vault.getState();
  console.log(`\n  ── Vault State After Deposits ──`);
  console.log(`    Total NAV:     $${parseFloat(state1.totalNAV).toLocaleString()}`);
  console.log(`    Total Shares:  ${parseFloat(state1.totalShares).toLocaleString()} PRR`);
  console.log(`    Share Price:   $${state1.sharePrice}`);
  console.log(`    Deposits:      ${state1.deposits.length}`);
  console.log();

  // ════════════════════════════════════════════════════════════════════
  //  STEP 3: YIELD STRIPPING — Decompose SOVBND into Strips
  // ════════════════════════════════════════════════════════════════════

  console.log('  ══════════════════════════════════════════════════════════════');
  console.log('  ║  STEP 3: YIELD STRIPPING — Decompose Bond Positions       ║');
  console.log('  ══════════════════════════════════════════════════════════════\n');

  // Find SOVBND deposits and strip them
  const sovbndDeposits = state1.deposits.filter(d => d.asset === 'SOVBND');
  console.log(`  Found ${sovbndDeposits.length} SOVBND deposit(s) to strip:\n`);

  for (const dep of sovbndDeposits) {
    try {
      const { principalStrip, yieldStrip } = vault.stripYield(dep.id);
      console.log(`    📊 Deposit ${dep.id.slice(0, 12)}... (${dep.amount} SOVBND)`);
      console.log(`       ├─ Principal Strip: ${principalStrip.id.slice(0, 12)}...`);
      console.log(`       │  Value: $${principalStrip.currentValue}  |  Transferable: ${principalStrip.transferable}`);
      console.log(`       │  Maturity: ${principalStrip.maturityDate}`);
      console.log(`       └─ Yield Strip: ${yieldStrip.id.slice(0, 12)}...`);
      console.log(`          Value: $${yieldStrip.currentValue}  |  Transferable: ${yieldStrip.transferable}`);
      console.log(`          Coupon: ${(yieldStrip.couponRate * 100).toFixed(1)}%  |  Next: ${yieldStrip.nextCouponDate}`);
      console.log();
    } catch (err: any) {
      console.log(`    ⚠️  Skip ${dep.id.slice(0, 12)}: ${err.message}`);
    }
  }

  const coupons = vault.getCouponSchedule();
  console.log(`  Coupon schedule generated: ${coupons.length} payments over 5 years`);
  if (coupons.length > 0) {
    console.log(`    First coupon: ${coupons[0].scheduledDate} — $${coupons[0].amount}`);
    console.log(`    Last coupon:  ${coupons[coupons.length - 1].scheduledDate} — $${coupons[coupons.length - 1].amount}`);
  }
  console.log();

  // ════════════════════════════════════════════════════════════════════
  //  STEP 4: REGISTER NFT CREDENTIALS & SIMULATE ALLOCATION
  // ════════════════════════════════════════════════════════════════════

  console.log('  ══════════════════════════════════════════════════════════════');
  console.log('  ║  STEP 4: NFT-GATED BOND ALLOCATION                        ║');
  console.log('  ══════════════════════════════════════════════════════════════\n');

  // Register the NFTs we minted in Phase 21
  // Query issuer's NFTs on-chain
  let nftTokenIds: string[] = [];
  try {
    const nfts = await client.request({
      command: 'account_nfts',
      account: wallets.issuer.address,
    } as any);
    nftTokenIds = ((nfts.result as any).account_nfts || []).map((n: any) => n.NFTokenID);
    console.log(`  Found ${nftTokenIds.length} NFTs on issuer account\n`);
  } catch {
    console.log('  Could not query NFTs, using placeholders\n');
  }

  // Register NFTs with vault (map taxon from on-chain data)
  if (nftTokenIds.length > 0) {
    // Register first 3 as Founder (taxon 1), next 2 as Institutional (taxon 2), last as Genesis (taxon 3)
    const taxonMap = [1, 1, 1, 2, 2, 3];
    const holderMap = [
      wallets.treasury.address,  // Founder 1
      wallets.issuer.address,    // Founder 2
      wallets.escrow.address,    // Founder 3
      wallets.trading.address,   // Institutional 1
      wallets.amm_liquidity.address, // Institutional 2
      wallets.attestation.address,   // Genesis 1
    ];

    for (let i = 0; i < Math.min(nftTokenIds.length, 6); i++) {
      vault.registerNftCredential(holderMap[i], nftTokenIds[i], taxonMap[i]);
      const tierName = taxonMap[i] === 1 ? 'Founder' : taxonMap[i] === 2 ? 'Institutional' : 'Genesis';
      console.log(`    🎟️  Registered NFT ${nftTokenIds[i].slice(0, 16)}... → ${tierName} (${holderMap[i].slice(0, 8)}...)`);
    }
    console.log();

    // Simulate subscriptions
    console.log('  ── Subscription Simulation ──\n');

    // Founder subscriber (treasury) — can allocate
    try {
      const founderSub = vault.subscribe({
        subscriberAddress: wallets.treasury.address,
        nftTokenId: nftTokenIds[0],
        requestedAmount: '1000',
      });
      console.log(`    ✅ Founder subscription: ${founderSub.id.slice(0, 12)}... — 1,000 SOVBND`);
    } catch (err: any) {
      console.log(`    ⚠️  Founder sub: ${err.message}`);
    }

    // Institutional subscriber (trading) — can subscribe
    if (nftTokenIds.length >= 4) {
      try {
        const instSub = vault.subscribe({
          subscriberAddress: wallets.trading.address,
          nftTokenId: nftTokenIds[3],
          requestedAmount: '500',
        });
        console.log(`    ✅ Institutional subscription: ${instSub.id.slice(0, 12)}... — 500 SOVBND`);
      } catch (err: any) {
        console.log(`    ⚠️  Institutional sub: ${err.message}`);
      }
    }

    // Genesis subscriber (attestation) — observe only, should fail
    if (nftTokenIds.length >= 6) {
      try {
        vault.subscribe({
          subscriberAddress: wallets.attestation.address,
          nftTokenId: nftTokenIds[5],
          requestedAmount: '100',
        });
        console.log(`    ❌ Genesis subscription should have been rejected`);
      } catch (err: any) {
        console.log(`    🔒 Genesis correctly rejected: "${err.message}"`);
      }
    }

    // Run allocation
    console.log('\n  ── Running Allocation ──\n');
    const allocated = vault.allocateSubscriptions();
    for (const sub of allocated) {
      console.log(`    📄 Allocated: ${sub.nftTier} — ${sub.allocatedAmount} SOVBND → ${sub.subscriberAddress.slice(0, 8)}...`);
    }
    console.log();
  }

  // ════════════════════════════════════════════════════════════════════
  //  STEP 5: COMPOUND YIELD
  // ════════════════════════════════════════════════════════════════════

  console.log('  ══════════════════════════════════════════════════════════════');
  console.log('  ║  STEP 5: COMPOUND YIELD CYCLE                             ║');
  console.log('  ══════════════════════════════════════════════════════════════\n');

  const yieldResult = vault.compoundYield();
  console.log(`    Yield accrued:    $${yieldResult.yielded}`);
  console.log(`    New vault NAV:    $${parseFloat(yieldResult.newNAV).toLocaleString()}`);
  console.log(`    Share price:      $${vault.getState().sharePrice}`);
  console.log();

  // ════════════════════════════════════════════════════════════════════
  //  STEP 6: MINT RESERVE ATTESTATION NFT ON XRPL MAINNET
  // ════════════════════════════════════════════════════════════════════

  console.log('  ══════════════════════════════════════════════════════════════');
  console.log('  ║  STEP 6: MINT RESERVE ATTESTATION NFT (ON-CHAIN)          ║');
  console.log('  ══════════════════════════════════════════════════════════════\n');

  // Generate attestation
  const attestation = vault.generateAttestation();
  console.log(`    Attestation ID:     ${attestation.id}`);
  console.log(`    Snapshot Hash:      ${attestation.hash.slice(0, 32)}...`);
  console.log(`    NAV at snapshot:    $${parseFloat(attestation.snapshot.totalNAV).toLocaleString()}`);
  console.log(`    Reserve Ratio:      ${attestation.snapshot.reserveRatio === 999 ? '∞ (no liabilities)' : attestation.snapshot.reserveRatio.toFixed(2)}`);
  console.log(`    Share Price:        $${attestation.snapshot.sharePrice}`);
  console.log(`    Asset Breakdown:`);
  for (const ab of attestation.snapshot.assetBreakdown) {
    console.log(`      ${ab.asset.padEnd(10)} ${parseFloat(ab.amount).toFixed(2).padStart(12)} units   $${parseFloat(ab.value).toLocaleString()}`);
  }
  console.log();

  // Mint on XRPL
  const nftMintTx = vault.prepareAttestationNftMint(attestation, wallets.issuer.address);

  try {
    const issuerInfo = await client.request({
      command: 'account_info',
      account: wallets.issuer.address,
      ledger_index: 'validated',
    });
    const seq = issuerInfo.result.account_data.Sequence;
    const ledger = (await client.request({ command: 'ledger_current' })).result as any;
    const lls = ledger.ledger_current_index + 25;
    const feeResp = await client.request({ command: 'fee' });
    const baseFee = (feeResp.result as any).drops?.open_ledger_fee || '12';

    const fullTx: Record<string, any> = {
      ...nftMintTx,
      Sequence: seq,
      LastLedgerSequence: lls,
      Fee: baseFee,
    };

    const txBlob = signXrplTx(fullTx, wallets.issuer.keys.publicKey, wallets.issuer.keys.privateKey);
    const result = await client.request({ command: 'submit', tx_blob: txBlob });
    const engineResult = (result.result as any).engine_result;

    if (engineResult === 'tesSUCCESS') {
      const txHash = (result.result as any).tx_json?.hash || 'pending';
      console.log(`    ✅ Reserve Attestation NFT minted on XRPL mainnet`);
      console.log(`       TX: ${txHash}`);
      attestation.xrplTxHash = txHash;
    } else {
      console.log(`    ❌ NFT mint: ${engineResult} — ${(result.result as any).engine_result_message}`);
    }
  } catch (err: any) {
    console.log(`    ❌ NFT mint error: ${err.message?.slice(0, 80)}`);
  }

  // Also attest on Stellar
  console.log();
  try {
    const stellarServer = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
    const STELLAR_PASSPHRASE = 'Public Global Stellar Network ; September 2015';
    const issuerAcct = stellarAccounts.find((a: any) => a.role === 'issuer');

    if (issuerAcct) {
      const issuerKP = StellarSdk.Keypair.fromSecret(issuerAcct.seed);
      const acct = await stellarServer.loadAccount(issuerKP.publicKey());

      // Stellar attestation via manage_data
      const attestTx = new StellarSdk.TransactionBuilder(acct, {
        fee: '100',
        networkPassphrase: STELLAR_PASSPHRASE,
      })
        .addOperation(StellarSdk.Operation.manageData({
          name: `URV-${attestation.epoch}-NAV`,
          value: attestation.snapshot.totalNAV,
        }))
        .addOperation(StellarSdk.Operation.manageData({
          name: `URV-${attestation.epoch}-HASH`,
          value: attestation.hash.slice(0, 64),
        }))
        .addOperation(StellarSdk.Operation.manageData({
          name: `URV-${attestation.epoch}-RATIO`,
          value: attestation.snapshot.reserveRatio.toString(),
        }))
        .setTimeout(60)
        .build();

      attestTx.sign(issuerKP);
      const stellarResult = await stellarServer.submitTransaction(attestTx);
      attestation.stellarTxHash = (stellarResult as any).hash;
      console.log(`    ✅ Reserve Attestation written to Stellar mainnet`);
      console.log(`       TX: ${attestation.stellarTxHash}`);
    }
  } catch (err: any) {
    console.log(`    ⚠️  Stellar attestation: ${err.message?.slice(0, 80)}`);
  }

  // ════════════════════════════════════════════════════════════════════
  //  FINAL: VAULT SUMMARY
  // ════════════════════════════════════════════════════════════════════

  console.log('\n  ══════════════════════════════════════════════════════════════');
  console.log('  ║  UNYKORN RESERVE VAULT — ACTIVE                            ║');
  console.log('  ══════════════════════════════════════════════════════════════\n');

  const summary = vault.getVaultSummary();
  console.log(`    Vault:             ${summary.name}`);
  console.log(`    Status:            ${summary.status}`);
  console.log(`    Total NAV:         $${parseFloat(summary.totalNAV as string).toLocaleString()}`);
  console.log(`    Total PRR Shares:  ${parseFloat(summary.totalShares as string).toLocaleString()}`);
  console.log(`    Share Price:       $${summary.sharePrice}`);
  console.log(`    Yield Accrued:     $${summary.yieldAccrued}`);
  console.log(`    Active Deposits:   ${summary.totalDeposits}`);
  console.log(`    Yield Strips:      ${summary.activeStrips}`);
  console.log(`    Subscriptions:     ${summary.subscriptions}`);
  console.log(`    Attestations:      ${summary.attestations}`);
  console.log(`    Accepted Assets:   ${(summary.acceptedAssets as string[]).join(', ')}`);
  console.log(`    Allocation Tiers:`);
  for (const tier of summary.allocationTiers as any[]) {
    console.log(`      ${tier.name.padEnd(15)} Priority: ${tier.priority}  Rights: ${tier.rights.join(', ')}`);
  }

  console.log(`\n    ── Circle of Life ──`);
  console.log(`    Assets → Reserve Vault → Attestation NFTs → Bond Backing`);
  console.log(`    Bond Yield → Compounding → NAV Growth → More Attestations`);
  console.log(`    NFTs → Gated Access → Controlled Allocation → Settlement`);
  console.log(`    Settlement → New Deposits → Vault Growth → 🔄 REPEAT`);

  await client.disconnect();

  // ── Write report ────────────────────────────────────────────────

  const report = {
    deployment: 'Unykorn Reserve Vault — Phase 22',
    timestamp: new Date().toISOString(),
    vault: summary,
    attestation: {
      id: attestation.id,
      hash: attestation.hash,
      xrplTx: attestation.xrplTxHash,
      stellarTx: attestation.stellarTxHash,
    },
    yieldStrips: vault.getCouponSchedule().length,
    circleOfLife: 'ACTIVE',
  };

  fs.writeFileSync(
    path.join(__dirname, '..', 'RESERVE_VAULT_REPORT.json'),
    JSON.stringify(report, null, 2)
  );
  console.log('\n  📄 Report saved: RESERVE_VAULT_REPORT.json');
  console.log('  🏦 Unykorn Reserve Vault is LIVE.\n');
}

main().catch(err => {
  console.error('  FATAL:', err.message);
  process.exit(1);
});
